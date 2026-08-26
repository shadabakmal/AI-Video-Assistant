import os
import re
import uuid
import logging
import subprocess
from pathlib import Path
import yt_dlp
import imageio_ffmpeg
from app.config import STORAGE_DIR

logger = logging.getLogger("uvicorn")

def get_ffmpeg_binary() -> str:
    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as e:
        logger.warning(f"Could not get imageio_ffmpeg binary: {e}")
        return "ffmpeg"

def convert_to_wav(input_path: str, output_path: str) -> str:
    cmd = [
        get_ffmpeg_binary(), "-y", "-i", input_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path

def extract_youtube_id(url: str) -> str:
    pattern = r"(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})"
    match = re.search(pattern, url)
    return match.group(1) if match else None

def download_youtube_audio(url: str, meeting_id: str) -> dict:
    raw_template = str(STORAGE_DIR / f"{meeting_id}_raw_%(id)s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': raw_template,
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }

    youtube_id = extract_youtube_id(url)

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        
        # If playlist entries returned despite noplaylist, select first entry
        if 'entries' in info and len(info['entries']) > 0:
            info = info['entries'][0]

        title = info.get('title', 'Untitled Video')
        duration = float(info.get('duration', 0.0))
        video_id = info.get('id', youtube_id or 'vid')
        
    # Locate downloaded raw audio file
    raw_matching = list(STORAGE_DIR.glob(f"{meeting_id}_raw_*"))
    if not raw_matching:
        raise RuntimeError("Failed to locate downloaded audio file.")
        
    raw_file = str(raw_matching[0])
    wav_file = str(STORAGE_DIR / f"{meeting_id}_{video_id}.wav")

    # Convert raw audio to 16kHz mono WAV using static imageio-ffmpeg
    ffmpeg_exe = get_ffmpeg_binary()
    cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_file,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        wav_file
    ]
    
    logger.info(f"Converting raw audio '{raw_file}' to WAV using FFmpeg...")
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Clean up temporary raw file
    if os.path.exists(raw_file):
        try:
            os.remove(raw_file)
        except Exception:
            pass

    return {
        "title": title,
        "duration": duration,
        "audio_path": wav_file,
        "youtube_id": video_id or youtube_id
    }
