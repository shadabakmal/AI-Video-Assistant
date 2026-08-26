import os
import logging
import requests
import whisper
from pydub import AudioSegment

try:
    from app.config import WHISPER_MODEL, SARVAM_API_KEY
except ImportError:
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

logger = logging.getLogger("uvicorn")
_whisper_model = None

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Loading local Whisper model: '{WHISPER_MODEL}'...")
        _whisper_model = whisper.load_model(WHISPER_MODEL)
        logger.info("Whisper model loaded successfully.")
    return _whisper_model

def transcribe_whisper(audio_path: str) -> dict:
    model = get_whisper_model()
    result = model.transcribe(audio_path, task="transcribe")
    
    raw_segments = result.get("segments", [])
    formatted_segments = []
    
    for seg in raw_segments:
        formatted_segments.append({
            "start": round(seg.get("start", 0.0), 2),
            "end": round(seg.get("end", 0.0), 2),
            "text": seg.get("text", "").strip()
        })
        
    full_text = result.get("text", "").strip()
    return {
        "full_text": full_text,
        "segments": formatted_segments
    }

def _send_to_sarvam(piece_path: str) -> str:
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not configured.")
        
    headers = {"api-subscription-key": SARVAM_API_KEY}
    with open(piece_path, "rb") as f:
        files = {"file": (os.path.basename(piece_path), f, "audio/wav")}
        data = {"model": "saaras:v2.5", "with_diarization": "false"}
        res = requests.post(SARVAM_STT_URL, headers=headers, files=files, data=data, timeout=120)
        
    if not res.ok:
        raise RuntimeError(f"Sarvam API error: {res.status_code} - {res.text}")
    return res.json().get("transcript", "")

def transcribe_sarvam(audio_path: str) -> dict:
    audio = AudioSegment.from_file(audio_path)
    piece_ms = 25 * 1000
    
    full_text = ""
    segments = []
    
    for i, start_ms in enumerate(range(0, len(audio), piece_ms)):
        end_ms = min(start_ms + piece_ms, len(audio))
        piece = audio[start_ms:end_ms]
        piece_path = f"{audio_path}_sv_{i}.wav"
        piece.export(piece_path, format="wav")
        
        try:
            txt = _send_to_sarvam(piece_path)
            full_text += txt + " "
            segments.append({
                "start": round(start_ms / 1000.0, 2),
                "end": round(end_ms / 1000.0, 2),
                "text": txt
            })
        finally:
            if os.path.exists(piece_path):
                os.remove(piece_path)
                
    return {
        "full_text": full_text.strip(),
        "segments": segments
    }

def transcribe_audio(audio_path: str, language: str = "english") -> dict:
    if language.lower() == "hinglish" and SARVAM_API_KEY:
        logger.info("Transcribing using Sarvam AI STT...")
        return transcribe_sarvam(audio_path)
    
    logger.info("Transcribing using local Whisper...")
    return transcribe_whisper(audio_path)
