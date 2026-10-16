"""
Real candidate adapter for ai4bharat/indic-conformer-600m-multilingual ASR.
Supports Hindi (hi), English (en), and Bengali (bn).
"""
import time
import os
from typing import Dict, Any
from .base import BaseASRAdapter

class IndicConformerASRAdapter(BaseASRAdapter):
    def __init__(self, model_id: str = "ai4bharat/indic-conformer-600m-multilingual"):
        self.model_id = model_id
        self._is_ready = False
        self._model = None
        self._processor = None
        self._device = "cpu"
        self._init_error = None
        self._supported_languages = ["en", "hi", "bn"]
        self._try_initialize()

    @property
    def name(self) -> str:
        return f"indic-conformer ({self.model_id})"

    @property
    def is_ready(self) -> bool:
        return self._is_ready

    @property
    def status_details(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "ready": self._is_ready,
            "device": self._device,
            "error": self._init_error,
            "supported_languages": self._supported_languages,
            "model_id": self.model_id
        }

    def _try_initialize(self):
        try:
            import torch
            self._device = "cuda" if torch.cuda.is_available() else "cpu"

            local_path = os.environ.get("INDIC_CONFORMER_PATH")
            if not local_path or not os.path.exists(local_path):
                self._init_error = (
                    f"Model weights for {self.model_id} not found locally. "
                    "Set INDIC_CONFORMER_PATH or download weights from HuggingFace to enable real ASR."
                )
                self._is_ready = False
                return

            # In real environment with weights downloaded:
            from transformers import AutoModelForCTC, AutoProcessor
            self._processor = AutoProcessor.from_pretrained(local_path)
            self._model = AutoModelForCTC.from_pretrained(local_path).to(self._device)
            self._is_ready = True
        except ImportError as e:
            self._init_error = f"Dependencies missing: {e}. Install torch, torchaudio, transformers."
            self._is_ready = False
        except Exception as e:
            self._init_error = f"Failed to initialize IndicConformer: {str(e)}"
            self._is_ready = False

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
        if not self._is_ready:
            raise RuntimeError(
                f"IndicConformerASRAdapter is not ready: {self._init_error}. "
                "Switch AI_MODE=mock or download model weights with valid audio environment."
            )

        t0 = time.perf_counter()
        import torch
        import io
        import soundfile as sf

        audio_file = io.BytesIO(audio_bytes)
        speech, sample_rate = sf.read(audio_file)
        if sample_rate != 16000:
            import torchaudio.transforms as T
            resampler = T.Resample(sample_rate, 16000)
            speech = resampler(torch.tensor(speech, dtype=torch.float32)).numpy()

        input_values = self._processor(speech, sampling_rate=16000, return_tensors="pt").input_values.to(self._device)
        with torch.no_grad():
            logits = self._model(input_values).logits

        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = self._processor.batch_decode(predicted_ids)[0]
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "text": transcription,
            "language": language,
            "duration_ms": elapsed_ms,
            "confidence": 0.92,
            "is_final": True
        }
