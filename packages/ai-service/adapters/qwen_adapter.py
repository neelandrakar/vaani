"""
Real candidate adapter for Qwen/Qwen3-8B.
Implements non-thinking mode and OpenAI-compatible / HuggingFace Transformers inference.
"""
import time
import os
import json
from typing import Dict, Any, List, Optional
from .base import BaseLLMAdapter

class QwenLLMAdapter(BaseLLMAdapter):
    def __init__(self, model_id: str = "Qwen/Qwen3-8B"):
        self.model_id = model_id
        self._is_ready = False
        self._model = None
        self._tokenizer = None
        self._device = "cpu"
        self._init_error = None
        self._try_initialize()

    @property
    def name(self) -> str:
        return f"qwen-adapter ({self.model_id})"

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
            "mode": "non-thinking",
            "model_id": self.model_id
        }

    def _try_initialize(self):
        try:
            import torch
            if torch.cuda.is_available():
                self._device = "cuda"
            else:
                self._device = "cpu"

            # Check if transformers is available
            from transformers import AutoModelForCausalLM, AutoTokenizer
            # Do not auto-download large 16GB weights unless explicitly instructed
            local_weights = os.environ.get("QWEN_MODEL_PATH")
            if not local_weights or not os.path.exists(local_weights):
                self._init_error = (
                    f"Weights for {self.model_id} not found locally. Set QWEN_MODEL_PATH or run "
                    f"`python -m huggingface_hub download {self.model_id}` on a machine with at least 16GB VRAM."
                )
                self._is_ready = False
                return

            self._tokenizer = AutoTokenizer.from_pretrained(local_weights)
            self._model = AutoModelForCausalLM.from_pretrained(
                local_weights,
                torch_dtype="auto" if self._device == "cuda" else torch.float32,
                device_map="auto" if self._device == "cuda" else None
            )
            self._is_ready = True
        except ImportError as e:
            self._init_error = f"Dependencies missing: {e}. Install torch and transformers."
            self._is_ready = False
        except Exception as e:
            self._init_error = f"Failed to initialize Qwen model: {str(e)}"
            self._is_ready = False

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self._is_ready:
            raise RuntimeError(
                f"QwenLLMAdapter is not ready: {self._init_error}. "
                "Switch AI_MODE=mock or provide local model weights with appropriate hardware."
            )

        t0 = time.perf_counter()
        # Real inference with Transformers when weights exist
        text = self._tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            # Ensure non-thinking mode for direct tool/response generation
            tools=tools if tools else None
        )
        model_inputs = self._tokenizer([text], return_tensors="pt").to(self._device)
        generated_ids = self._model.generate(
            **model_inputs,
            max_new_tokens=512,
            temperature=0.2,
            do_sample=False
        )
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        response_text = self._tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "content": response_text,
            "tool_calls": None, # parsed if structured output present
            "finish_reason": "stop",
            "usage": {"total_tokens": len(generated_ids[0])},
            "latency_ms": elapsed_ms
        }
