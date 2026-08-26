import logging
from typing import List, Dict
from openai import OpenAI
from app.config import GROK_API_KEY, GROK_BASE_URL, GROK_MODEL

logger = logging.getLogger("uvicorn")

def get_grok_client():
    if not GROK_API_KEY:
        logger.warning("GROK_API_KEY is not set. Grok LLM operations will use fallback logic.")
        return None
    try:
        client = OpenAI(
            api_key=GROK_API_KEY,
            base_url=GROK_BASE_URL,
        )
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Grok client: {e}")
        return None

def summarize_transcript_with_grok(transcript: str) -> str:
    client = get_grok_client()
    if not client:
        # Fallback summary generator
        sentences = [s.strip() for s in transcript.split(".") if s.strip()]
        return "Executive Summary:\n" + "\n".join(f"- {s}" for s in sentences[:6]) if sentences else "No transcript available to summarize."

    system_prompt = (
        "You are an expert AI Video & Meeting Summarizer powered by Grok. "
        "Summarize the provided transcript into a clear, professional executive summary with bullet points, "
        "highlighting key discussions, decisions, and outcomes."
    )
    
    # Truncate transcript to prevent payload overflow
    truncated_transcript = transcript[:15000]

    try:
        response = client.chat.completions.create(
            model=GROK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript:\n{truncated_transcript}"}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error calling Grok Summarization API: {e}")
        sentences = [s.strip() for s in transcript.split(".") if s.strip()]
        return "Executive Summary:\n" + "\n".join(f"- {s}" for s in sentences[:6]) if sentences else "Summary generation failed."


def ask_grok_rag(transcript_context: str, chat_history: List[Dict[str, str]], user_question: str) -> str:
    client = get_grok_client()
    
    if not client:
        return f"Based on the transcript: '{transcript_context[:200]}...', here is a simulated answer for: '{user_question}'."

    system_prompt = (
        "You are an intelligent Q&A Assistant powered by Grok. "
        "Answer the user's question accurately based strictly on the meeting/video transcript context provided below. "
        "If the answer is not found in the context, clearly state that the information was not found in the transcript.\n\n"
        f"--- TRANSCRIPT CONTEXT ---\n{transcript_context[:12000]}\n--------------------------"
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Include relevant recent chat history
    for msg in chat_history[-6:]:
        role = "assistant" if msg.get("role") in ["assistant", "ai"] else "user"
        messages.append({"role": role, "content": msg.get("content", msg.get("text", ""))})
    
    messages.append({"role": "user", "content": user_question})

    try:
        response = client.chat.completions.create(
            model=GROK_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=800
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error calling Grok Q&A API: {e}")
        return f"I encountered an issue processing your query with Grok ({str(e)}). Please try again."
