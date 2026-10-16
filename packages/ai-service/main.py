"""
Vaani AI Service - FastAPI application providing ASR, LLM, and TTS inference.
Supports explicitly configured Real and Mock modes with replaceable model adapters.
"""
import os
import time
import base64
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from adapters.mock_adapter import MockASRAdapter, MockLLMAdapter, MockTTSAdapter
from adapters.qwen_adapter import QwenLLMAdapter
from adapters.indic_conformer_adapter import IndicConformerASRAdapter
from adapters.indic_parler_adapter import IndicParlerTTSAdapter

# Configuration
AI_MODE = os.environ.get("AI_MODE", "mock").lower()
PORT = int(os.environ.get("PORT", 8000))

app = FastAPI(
    title="Vaani AI Inference Service",
    version="1.0.0",
    description="Voice Agent AI pipeline: ASR (IndicConformer), LLM (Qwen3), TTS (IndicParler)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Adapters
if AI_MODE == "real":
    asr_adapter = IndicConformerASRAdapter()
    llm_adapter = QwenLLMAdapter()
    tts_adapter = IndicParlerTTSAdapter()
else:
    asr_adapter = MockASRAdapter()
    llm_adapter = MockLLMAdapter()
    tts_adapter = MockTTSAdapter()

# Request/Response Schemas
class TranscribeRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio data (WAV or PCM)")
    language: str = Field(default="en", description="Target language code: en, hi, bn")

class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration_ms: float
    confidence: float
    is_final: bool

class GenerateRequest(BaseModel):
    messages: List[Dict[str, Any]]
    tools: Optional[List[Dict[str, Any]]] = None
    context: Optional[Dict[str, Any]] = None

class GenerateResponse(BaseModel):
    content: Optional[str]
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: str
    usage: Dict[str, int]
    latency_ms: float

class SynthesizeRequest(BaseModel):
    text: str
    language: str = Field(default="en", description="Target language code: en, hi, bn")
    voice: str = Field(default="female", description="female or male")
    pitch: Optional[str] = Field(default=None, description="e.g. -6Hz, +0Hz")
    rate: Optional[str] = Field(default=None, description="e.g. +2%, -5%")

class SynthesizeResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    duration_ms: float
    audio_duration_sec: Optional[float] = None
    format: str

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "vaani-ai-service",
        "mode": AI_MODE,
        "timestamp": time.time()
    }

@app.get("/ready")
async def readiness_check():
    gpu_available = False
    device_name = "CPU"
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            device_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    asr_details = getattr(asr_adapter, "status_details", {"name": asr_adapter.name, "ready": asr_adapter.is_ready})
    llm_details = getattr(llm_adapter, "status_details", {"name": llm_adapter.name, "ready": llm_adapter.is_ready})
    tts_details = getattr(tts_adapter, "status_details", {"name": tts_adapter.name, "ready": tts_adapter.is_ready})

    all_ready = asr_adapter.is_ready and llm_adapter.is_ready and tts_adapter.is_ready

    return {
        "status": "ready" if all_ready else "degraded",
        "ai_mode": AI_MODE,
        "gpu_available": gpu_available,
        "device_name": device_name,
        "adapters": {
            "asr": asr_details,
            "llm": llm_details,
            "tts": tts_details
        }
    }

@app.post("/asr/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(req: TranscribeRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 audio: {e}")

    try:
        res = await asr_adapter.transcribe(audio_bytes, language=req.language)
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/llm/generate", response_model=GenerateResponse)
async def generate_response(req: GenerateRequest):
    try:
        res = await llm_adapter.generate_response(
            messages=req.messages,
            tools=req.tools,
            context=req.context
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/tts/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(req: SynthesizeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text cannot be empty")
    try:
        res = await tts_adapter.synthesize(
            text=req.text,
            language=req.language,
            voice=req.voice,
            pitch=req.pitch,
            rate=req.rate
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
