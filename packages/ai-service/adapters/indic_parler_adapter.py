"""
Real candidate adapter for ai4bharat/indic-parler-tts.
Synthesizes Hindi, English, and Bengali natural voice.
"""
import time
import os
import io
import base64
from typing import Dict, Any
from .base import BaseTTSAdapter

class IndicParlerTTSAdapter(BaseTTSAdapter):
    def __init__(self, model_id: str = "ai4bharat/indic-parler-tts"):
        self.model_id = model_id
        self._is_ready = False
        self._model = None
        self._tokenizer = None
        self._device = "cpu"
        self._init_error = None
        self._try_initialize()

    @property
    def name(self) -> str:
        return f"indic-parler-tts ({self.model_id})"

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
            "model_id": self.model_id
        }

    def _try_initialize(self):
        try:
            import torch
            self._device = "cuda" if torch.cuda.is_available() else "cpu"

            local_path = os.environ.get("INDIC_PARLER_PATH")
            if not local_path or not os.path.exists(local_path):
                self._init_error = (
                    f"Model weights for {self.model_id} not found locally. "
                    "Set INDIC_PARLER_PATH or download weights to enable real IndicParler TTS."
                )
                self._is_ready = False
                return

            from transformers import AutoTokenizer
            # ParlerTTSForConditionalGeneration
            from parler_tts import ParlerTTSForConditionalGeneration
            self._model = ParlerTTSForConditionalGeneration.from_pretrained(local_path).to(self._device)
            self._tokenizer = AutoTokenizer.from_pretrained(local_path)
            self._is_ready = True
        except ImportError as e:
            self._init_error = f"Dependencies missing: {e}. Install torch, transformers, parler-tts."
            self._is_ready = False
        except Exception as e:
            self._init_error = f"Failed to initialize IndicParlerTTS: {str(e)}"
            self._is_ready = False

    async def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: str = "female",
        pitch: Optional[str] = None,
        rate: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self._is_ready:
            raise RuntimeError(
                f"IndicParlerTTSAdapter is not ready: {self._init_error}. "
                "Switch AI_MODE=mock or download model weights."
            )

        t0 = time.perf_counter()
        import torch
        import soundfile as sf

        # Synthesize using Parler prompt
        prompt = "A clear and professional female voice with high audio fidelity."
        input_ids = self._tokenizer(prompt, return_tensors="pt").input_ids.to(self._device)
        prompt_input_ids = self._tokenizer(text, return_tensors="pt").input_ids.to(self._device)

        generation = self._model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
        audio_arr = generation.cpu().numpy().squeeze()

        buf = io.BytesIO()
        sf.write(buf, audio_arr, self._model.config.sampling_rate, format='WAV')
        raw_wav = buf.getvalue()
        b64_audio = base64.b64encode(raw_wav).decode('ascii')
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "audio_base64": b64_audio,
            "sample_rate": self._model.config.sampling_rate,
            "duration_ms": elapsed_ms,
            "format": "wav"
        }
