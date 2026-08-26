import os
import re
import logging
import requests

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
    Fetch YouTube transcript using RapidAPI to bypass Render IP blocks.
    Requires RAPIDAPI_KEY to be set in environment variables.
    """
    api_key = os.environ.get("RAPIDAPI_KEY")
    if not api_key:
        raise RuntimeError("RAPIDAPI_KEY environment variable is missing. Please add it to your Render dashboard.")

    # Using the "Youtube Transcript" API (youtube-transcript3.p.rapidapi.com)
    url = "https://youtube-transcript3.p.rapidapi.com/api/transcript-with-url"
    
    # This specific API expects the full YouTube URL in the query parameters
    querystring = {
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "flat_text": "true",
        "lang": "en"
    }
    
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com"
    }
    
    try:
        response = requests.get(url, headers=headers, params=querystring)
        response.raise_for_status() 
        
        data = response.json()
        
        # Parse the JSON depending on the API's flat_text response structure
        if isinstance(data, dict):
            # Check common keys where the transcript string might be stored
            for key in ["transcript", "text", "body", "data"]:
                if key in data and isinstance(data[key], str):
                    return data[key]
            
            # Fallback if it returns a list of segments anyway
            if "segments" in data:
                return " ".join([entry.get("text", "") for entry in data["segments"]])
                
        elif isinstance(data, list):
            return " ".join([entry.get("text", "") for entry in data])
            
        elif isinstance(data, str):
            return data
            
        raise ValueError(f"Unexpected API response format: {data}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"RapidAPI request failed: {e}")
        raise RuntimeError(f"Failed to fetch YouTube transcript via API: {e}")


def download_youtube_audio(url: str) -> str:
    """
    Fetch the official YouTube transcript using RapidAPI.
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