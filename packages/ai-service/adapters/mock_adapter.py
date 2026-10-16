"""
Deterministic Mock Adapters for testing and development without large weights.
Generates genuine playable WAV audio and structured tool calls.
"""
import io
import wave
import math
import struct
import base64
import time
import re
from typing import Dict, Any, List, Optional
from .base import BaseASRAdapter, BaseLLMAdapter, BaseTTSAdapter

class MockASRAdapter(BaseASRAdapter):
    @property
    def name(self) -> str:
        return "mock-asr"

    @property
    def is_ready(self) -> bool:
        return True

    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
        t0 = time.perf_counter()
        # Parse audio length if wav or raw pcm
        audio_len = len(audio_bytes)
        duration_sec = audio_len / (16000 * 2) if audio_len > 44 else 0.5

        # If audio is very short or silence, return empty
        if audio_len < 1000:
            return {
                "text": "",
                "language": language,
                "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
                "confidence": 0.0,
                "is_final": True
            }

        # Simulated transcription based on input sample or default prompt
        text_samples = {
            "en": "I am looking to buy a 3 BHK apartment in Whitefield under 1.5 crore.",
            "hi": "Mujhe Whitefield me 3 BHK flat khareedna hai, budget lagbhag 1.5 crore hai.",
            "bn": "Ami Whitefield-e ekta 3 BHK flat kinte chai, budget pray 1.5 crore."
        }
        recognized = text_samples.get(language, text_samples["en"])

        return {
            "text": recognized,
            "language": language,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
            "confidence": 0.96,
            "is_final": True
        }

class MockTTSAdapter(BaseTTSAdapter):
    @property
    def name(self) -> str:
        return "mock-tts"

    @property
    def is_ready(self) -> bool:
        return True

    async def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: str = "female",
        pitch: Optional[str] = None,
        rate: Optional[str] = None
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        voice_map = {
            "en": "en-IN-NeerjaNeural" if voice == "female" else "en-IN-PrabhatNeural",
            "hi": "hi-IN-SwaraNeural" if voice == "female" else "hi-IN-MadhurNeural",
            "bn": "bn-IN-TanishaaNeural" if voice == "female" else "bn-IN-BashkarNeural",
        }
        chosen_voice = voice_map.get(language, voice_map["en"])

        used_pitch = pitch if pitch is not None else ("-6Hz" if voice == "female" else "-2Hz")
        used_rate = rate if rate is not None else "+2%"

        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, chosen_voice, pitch=used_pitch, rate=used_rate)
            audio_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]

            b64_audio = base64.b64encode(audio_bytes).decode('ascii')
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            duration_sec = max(1.0, len(text.split()) * 0.4)

            return {
                "audio_base64": b64_audio,
                "sample_rate": 24000,
                "duration_ms": elapsed_ms,
                "audio_duration_sec": round(duration_sec, 2),
                "format": "mp3"
            }
        except Exception as e:
            # Fallback in case of network issue
            sample_rate = 16000
            words = len(text.split())
            duration_sec = max(0.8, min(words * 0.35, 6.0))
            num_samples = int(sample_rate * duration_sec)
            buf = io.BytesIO()
            with wave.open(buf, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                frames = bytearray(num_samples * 2)
                wf.writeframes(frames)
            raw_wav = buf.getvalue()
            return {
                "audio_base64": base64.b64encode(raw_wav).decode('ascii'),
                "sample_rate": sample_rate,
                "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
                "audio_duration_sec": round(duration_sec, 2),
                "format": "wav"
            }


class MockLLMAdapter(BaseLLMAdapter):
    @property
    def name(self) -> str:
        return "mock-llm-qwen3"

    @property
    def is_ready(self) -> bool:
        return True

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        context = context or {}
        reqs = context.get("requirements", {})

        # Find latest user message
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_msg = m.get("content", "").strip()
                break

        msg_lower = user_msg.lower()
        tool_calls = []
        content = None

        # 1. Check for Stop / Do Not Call
        if any(w in msg_lower for w in ["stop calling", "don't call", "do not call", "remove my number", "unsubscribe", "stop"]):
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_dnc",
                "name": "finish_conversation",
                "arguments": {
                    "outcome": "DO_NOT_CALL",
                    "reason": "Customer explicitly requested not to be contacted."
                }
            })
            content = "I have noted your request and updated our records immediately. You will not receive any further calls from Hoichoi. Have a wonderful day!"

        # 2. Check for human escalation
        elif any(w in msg_lower for w in ["speak to human", "real person", "agent please", "talk to manager", "executive", "person"]):
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_escalate",
                "name": "request_human_assistance",
                "arguments": {
                    "reason": "Customer requested to speak with a human executive.",
                    "priority": "HIGH"
                }
            })
            content = "Certainly. I am immediately connecting you with our customer support specialist who will assist you right away."

        # 3. Check for Identity / AI question
        elif any(w in msg_lower for w in ["are you ai", "are you human", "who are you", "are you a robot", "what is your name"]):
            content = "I am Vaani, an AI calling assistant representing Hoichoi. I am here to help you discover our best streaming plans and answer your questions."

        # 4. Check for Callback Scheduling
        elif any(w in msg_lower for w in ["call me", "call back", "schedule callback", "call tomorrow", "call later", "appointment", "book callback", "yes please call", "callback", "call at"]) or any(c in user_msg for c in ["কল করুন", "ফোন করুন", "কল করবেন", "কখন ফোন"]):
            time_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)', msg_lower)
            callback_time = "tomorrow at 11:00 AM" if not time_match else f"tomorrow at {time_match.group(1).upper()}"
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_callback",
                "name": "create_callback",
                "arguments": {
                    "requested_time_text": callback_time,
                    "reason": "Follow-up on Hoichoi subscription plans and onboarding"
                }
            })
            if "bn" in msg_lower or any(c in user_msg for c in ["কল", "ফোন", "করবেন"]):
                content = f"নিশ্চয়ই, আমি আপনার জন্য আগামীকাল একটি কল রেজিস্টার করে নিয়েছি। আমাদের বিশেষজ্ঞ আপনাকে নির্দিষ্ট সময়ে কল করবেন।"
            else:
                content = f"I would be glad to schedule that. I have registered a callback for {callback_time} IST. Our specialist will call you then."

        # 5. Check for Plans & Pricing (Hoichoi / General)
        elif any(w in msg_lower for w in ["plan", "pricing", "price", "cost", "how much", "annual", "monthly", "rate", "899", "199", "discount", "offer"]) or any(c in user_msg for c in ["দাম", "প্ল্যান", "খরচ", "টাকা", "কত টাকা", "कितना", "दाम"]):
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_info",
                "name": "get_business_information",
                "arguments": {
                    "query": "pricing"
                }
            })
            if "bn" in msg_lower or any(c in user_msg for c in ["দাম", "প্ল্যান", "টাকা", "কত"]):
                content = "হইচই অ্যানুয়াল প্ল্যান বছরে মাত্র ৮৯৯ টাকা এবং মান্থলি প্ল্যান ১৯৯ টাকা। আপনি কি পুরো বছরের প্ল্যান দেখতে চান?"
            elif any(c in user_msg for c in ["कितना", "दाम", "प्लान"]):
                content = "होईचोई का वार्षिक प्लान मात्र ₹899 में 2 स्क्रीन्स के लिए उपलब्ध है। क्या आप वार्षिक प्लान की जानकारी चाहेंगे?"
            else:
                content = "Our Hoichoi Annual Plan is ₹899 per year for 2 screens in Full HD, or ₹199 per month. Which plan best fits your viewing preference?"

        # 6. Check for Content / Series / Movies
        elif any(w in msg_lower for w in ["feluda", "byomkesh", "eken", "karagar", "movies", "shows", "series", "originals", "mandaar", "indubala", "content"]) or any(c in user_msg for c in ["ব্যোমকেশ", "ফেলুদা", "একেন", "কারাগার", "সিরিজ", "সিনেমা", "নাটক", "শো"]):
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_content",
                "name": "get_business_information",
                "arguments": {
                    "query": "content"
                }
            })
            if "bn" in msg_lower or any(c in user_msg for c in ["সিরিজ", "সিনেমা", "নাটক", "ব্যোমকেশ", "ফেলুদা", "একেন"]):
                content = "হইচই-এ ব্যোমকেশ, একেন বাবু এবং কারাগার সহ ১৫০টিরও বেশি অরিজিনাল শো রয়েছে। আপনি কি মূলত থ্রিলার সিরিজ দেখতে পছন্দ করেন?"
            else:
                content = "We have exclusive original series like Byomkesh, Feluda, and Karagar, plus over 600 movies. Do you enjoy thrillers or family dramas more?"

        # 7. Check for Purchase / Subscription Intent (or Real Estate fallback if tested)
        elif any(w in msg_lower for w in ["subscribe", "renew", "interested", "buy", "rent", "bhk", "whitefield"]) or any(c in user_msg for c in ["সাবস্ক্রাইব", "কিনতে", "সাবস্ক্রিপশন"]):
            if any(w in msg_lower for w in ["buy", "rent", "bhk", "whitefield"]):
                # Retain backwards compatibility for ERP test suite
                trans_type = "RENT" if "rent" in msg_lower else "BUY"
                bhk = 3 if "3 bhk" in msg_lower or "3bhk" in msg_lower else 2
                loc = "Whitefield"
                tool_calls.append({
                    "id": f"call_{int(time.time()*1000)}_req",
                    "name": "update_lead_requirements",
                    "arguments": {
                        "transaction_type": trans_type,
                        "property_type": "Apartment",
                        "location": loc,
                        "bedrooms": bhk,
                        "budget_max": 15000000,
                        "timeline": "1-3 months"
                    }
                })
                tool_calls.append({
                    "id": f"call_{int(time.time()*1000)}_search",
                    "name": "search_approved_properties",
                    "arguments": {
                        "location": loc,
                        "transaction_type": trans_type,
                        "bedrooms": bhk
                    }
                })
                content = f"Thank you! I have recorded your preferences and retrieved verified matching properties."
            else:
                tool_calls.append({
                    "id": f"call_{int(time.time()*1000)}_req",
                    "name": "update_lead_requirements",
                    "arguments": {
                        "transaction_type": "BUY",
                        "property_type": "Annual VIP Plan",
                        "timeline": "Immediate"
                    }
                })
                content = "That sounds great! Would you like me to send an instant activation link to your phone, or arrange a quick callback with our specialist?"

        # 8. Check for general business / FAQ query
        elif any(w in msg_lower for w in ["device", "tv", "offline", "download", "cancellation", "cancel", "refund", "rera", "amenities"]):
            tool_calls.append({
                "id": f"call_{int(time.time()*1000)}_info",
                "name": "get_business_information",
                "arguments": {
                    "query": "general"
                }
            })
            content = "Let me retrieve that verified information from our official records for you."

        # 9. Natural conversational flow: one short, clear question at a time
        else:
            if not reqs.get("propertyType") and not reqs.get("transactionType"):
                if "bn" in msg_lower or any(c in user_msg for c in ["হ্যাঁ", "বলুন"]):
                    content = "ধন্যবাদ! আপনি কি মূলত স্মার্ট টিভিতে হইচই দেখতে চান, না মোবাইলে?"
                elif any(c in user_msg for c in ["हाँ", "बताइए"]):
                    content = "धन्यवाद! क्या आप मुख्य रूप से स्मार्ट टीवी पर देखना पसंद करते हैं या मोबाइल पर?"
                else:
                    content = "Do you prefer streaming primarily on your Smart TV or on mobile devices?"
            else:
                content = "We have customized options available for your viewing preferences. Would you like me to schedule a callback with our specialist tomorrow?"

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "content": content,
            "tool_calls": tool_calls if tool_calls else None,
            "finish_reason": "tool_calls" if tool_calls else "stop",
            "usage": {
                "prompt_tokens": len(str(messages)) // 4,
                "completion_tokens": len(str(content or "")) // 4,
                "total_tokens": (len(str(messages)) + len(str(content or ""))) // 4
            },
            "latency_ms": elapsed_ms
        }
