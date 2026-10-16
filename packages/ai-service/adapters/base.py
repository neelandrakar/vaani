"""
Base abstract classes for AI model adapters.
Allows LLM, ASR, and TTS implementations to be swapped independently.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseASRAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name/Identifier of the ASR adapter."""
        pass

    @property
    @abstractmethod
    def is_ready(self) -> bool:
        """Returns True if the model and weights are loaded and ready."""
        pass

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe raw audio bytes (PCM or WAV) to text.
        Returns:
            {
                "text": str,
                "language": str,
                "duration_ms": float,
                "confidence": float,
                "is_final": bool
            }
        """
        pass

class BaseLLMAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name/Identifier of the LLM adapter."""
        pass

    @property
    @abstractmethod
    def is_ready(self) -> bool:
        """Returns True if the LLM model/endpoint is ready."""
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate conversational turn or propose tool calls.
        Returns:
            {
                "content": Optional[str],
                "tool_calls": Optional[List[Dict[str, Any]]],
                "finish_reason": str,
                "usage": Dict[str, int],
                "latency_ms": float
            }
        """
        pass

class BaseTTSAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name/Identifier of the TTS adapter."""
        pass

    @property
    @abstractmethod
    def is_ready(self) -> bool:
        """Returns True if the TTS model/weights are loaded and ready."""
        pass

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: str = "female",
        pitch: Optional[str] = None,
        rate: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesize text into playable WAV audio.
        Returns:
            {
                "audio_base64": str,
                "sample_rate": int,
                "duration_ms": float,
                "format": str
            }
        """
        pass
