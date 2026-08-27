import os
import sys
import uuid
import logging
import httpx
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
for p in [str(ROOT_DIR), str(BASE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.config import STORAGE_DIR
from app.database import get_db_manager
from app.models import MediaContentModel
from app.services.transcriber_service import transcribe_audio
from app.services.grok_service import summarize_transcript_with_grok

try:
    from utils.audio_processor import download_youtube_audio, convert_to_wav, chunk_audio
except ImportError:
    try:
        from backend.utils.audio_processor import download_youtube_audio, convert_to_wav, chunk_audio
    except ImportError:
        from app.utils.audio_processor import download_youtube_audio, convert_to_wav, chunk_audio

logger = logging.getLogger("uvicorn")

async def download_file_from_url(url: str, destination_dir: str) -> str:
    """Download a file from a public URL (e.g., Supabase Storage) to local storage."""
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(url.split("?")[0])[1] or ".mp4"
    local_path = os.path.join(destination_dir, f"{file_id}{ext}")

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(response.content)
            
    return local_path

async def process_media_content(
    user_id: str,
    media_url: str,
    media_type: str,
    language: str = "english",
    local_path: str | None = None,
) -> dict:
    """Full processing pipeline: fetch/download media, extract transcript, summarize with Grok, save to DB."""
    logger.info(f"Processing media for user {user_id}: {media_type} from {media_url}")
    
    local_audio_path = None
    if local_path:
        local_audio_path = convert_to_wav(local_path)
    elif "youtube.com" in media_url or "youtu.be" in media_url:
        logger.info("Downloading YouTube audio...")
        local_audio_path = download_youtube_audio(media_url)
    else:
        logger.info("Downloading media file from storage URL...")
        downloaded_path = await download_file_from_url(media_url, str(STORAGE_DIR))
        logger.info("Converting downloaded media to WAV...")
        local_audio_path = convert_to_wav(downloaded_path)

    # 1. Transcribe media using Whisper / Sarvam
    logger.info("Transcribing audio...")
    transcription_result = transcribe_audio(local_audio_path, language=language)
    transcript_text = transcription_result.get("full_text", "")

    # 2. Summarize transcript using Grok LLM
    logger.info("Generating summary with Grok API...")
    summary_text = summarize_transcript_with_grok(transcript_text)

    title = f"{media_type} Analysis ({datetime.utcnow().strftime('%Y-%m-%d %H:%M')})"
    if transcript_text:
        title = transcript_text[:40].strip() + "..."

    # 3. Store results in MongoDB / Fallback store
    media_doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": media_type,
        "source_url": media_url,
        "title": title,
        "transcript": transcript_text,
        "summary": summary_text,
        "created_at": datetime.utcnow().isoformat()
    }

    mgr = get_db_manager()
    try:
        if mgr.is_mongo_connected and mgr.db is not None:
            await mgr.db.media_contents.insert_one(media_doc)
        else:
            await mgr.json_fallback.insert_media_content(media_doc)
    except Exception as e:
        logger.error(f"Error persisting media content to DB: {e}")
        await mgr.json_fallback.insert_media_content(media_doc)

    return media_doc
