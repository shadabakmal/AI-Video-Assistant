import os
import re
import logging

logger = logging.getLogger("uvicorn")

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'storage')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def extract_youtube_video_id(url: str) -> str:
    """Extract the YouTube video ID from any YouTube URL format."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract YouTube video ID from URL: {url}")


def fetch_youtube_transcript(video_id: str) -> str:
    """
    Fetch YouTube transcript. Supports both:
    - youtube-transcript-api v1.x (instance-based: YouTubeTranscriptApi().fetch())
    - youtube-transcript-api v0.x (class-based: YouTubeTranscriptApi.get_transcript())
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    # Try v1.x API first (instance method)
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        # v1.x returns a Transcript object; iterate over snippets
        parts = []
        for snippet in transcript:
            text = getattr(snippet, 'text', None) or snippet.get('text', '') if isinstance(snippet, dict) else str(snippet)
            if hasattr(snippet, 'text'):
                text = snippet.text
            elif isinstance(snippet, dict):
                text = snippet.get('text', '')
            else:
                text = str(snippet)
            parts.append(text)
        return " ".join(parts)
    except (TypeError, AttributeError):
        pass

    # Try v0.x API (class method)
    try:
        entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        return " ".join([entry.get("text", "") for entry in entries])
    except Exception:
        pass

    # Try v0.x without language filter
    try:
        entries = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([entry.get("text", "") for entry in entries])
    except Exception as e:
        raise RuntimeError(f"Failed to fetch YouTube transcript: {e}")


def download_youtube_audio(url: str) -> str:
    """
    Fetch the official YouTube transcript using youtube-transcript-api.
    Returns a path to a text file containing the transcript.
    No audio download needed — avoids YouTube bot detection entirely.
    """
    video_id = extract_youtube_video_id(url)
    logger.info(f"Fetching YouTube transcript for video ID: {video_id}")

    full_text = fetch_youtube_transcript(video_id)

    if not full_text or not full_text.strip():
        raise RuntimeError("Transcript was empty. The video may not have captions enabled.")

    # Save transcript text to a file
    transcript_path = os.path.join(DOWNLOAD_DIR, f"{video_id}_transcript.txt")
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(full_text)

    logger.info(f"YouTube transcript saved: {transcript_path} ({len(full_text)} chars)")
    return transcript_path


def convert_to_wav(input_path: str) -> str:
    """Convert any audio/video file to WAV format using pydub."""
    try:
        from pydub import AudioSegment
        output_path = os.path.splitext(input_path)[0] + "_converted.wav"
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(output_path, format="wav")
        return output_path
    except Exception as e:
        logger.error(f"Error converting to WAV: {e}")
        raise


def chunk_audio(wav_path: str, chunk_minutes: int = 10) -> list:
    """Split a WAV file into chunks. Returns as-is for text transcript files."""
    if wav_path.endswith(".txt"):
        return [wav_path]

    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_wav(wav_path)
        chunk_ms = chunk_minutes * 60 * 1000
        chunks = []
        for i, start in enumerate(range(0, len(audio), chunk_ms)):
            chunk = audio[start: start + chunk_ms]
            chunk_path = f"{wav_path}_chunk_{i}.wav"
            chunk.export(chunk_path, format="wav")
            chunks.append(chunk_path)
        return chunks
    except Exception as e:
        logger.error(f"Error chunking audio: {e}")
        raise


def process_input(source: str) -> list:
    if source.startswith("http://") or source.startswith("https://"):
        logger.info("Detected YouTube URL. Fetching transcript via API...")
        transcript_path = download_youtube_audio(source)
        return [transcript_path]
    else:
        logger.info("Detected local file. Converting to WAV...")
        wav_path = convert_to_wav(source)
        return chunk_audio(wav_path)
