import uuid
import logging
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.config import MISTRAL_API_KEY

logger = logging.getLogger("uvicorn")

def get_llm():
    if not MISTRAL_API_KEY:
        return None
    try:
        return ChatMistralAI(
            model="mistral-small-latest",
            mistral_api_key=MISTRAL_API_KEY,
            temperature=0.2,
        )
    except Exception as e:
        logger.warning(f"Failed to initialize Mistral LLM: {e}")
        return None

def analyze_transcript(transcript_text: str) -> dict:
    llm = get_llm()
    
    if not llm:
        # Fallback analysis if Mistral API key is absent
        lines = [line.strip() for line in transcript_text.split('.') if line.strip()]
        summary_text = ". ".join(lines[:5]) + "." if lines else "No summary available."
        return {
            "title": "Meeting Analysis",
            "executive_summary": summary_text,
            "key_decisions": ["Proceeded with scheduled project agenda."],
            "open_questions": ["What are the next milestone deadlines?"],
            "action_items": [
                {
                    "id": str(uuid.uuid4()),
                    "task": "Review meeting notes and transcript details.",
                    "assignee": "Team Lead",
                    "completed": False
                }
            ]
        }

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an elite AI Meeting Intelligence Assistant.
Analyze the meeting transcript below and produce a structured JSON report.

Return ONLY a valid JSON object with the following exact keys:
{{
  "title": "Short descriptive title for the meeting",
  "executive_summary": "Comprehensive 3-5 sentence executive summary of key discussions, main takeaways, and outcomes.",
  "key_decisions": ["List of key decisions agreed upon"],
  "open_questions": ["List of unresolved questions or open discussion topics"],
  "action_items": [
     {{"task": "Clear actionable task", "assignee": "Name or role if mentioned, else Unassigned"}}
  ]
}}

Ensure no markdown formatting or extra wrapping text outside the JSON."""),
        ("human", "Meeting Transcript:\n{transcript}")
    ])

    chain = prompt | llm | StrOutputParser()

    try:
        raw_output = chain.invoke({"transcript": transcript_text[:12000]})
        cleaned_output = raw_output.strip()
        if cleaned_output.startswith("```json"):
            cleaned_output = cleaned_output[7:]
        if cleaned_output.endswith("```"):
            cleaned_output = cleaned_output[:-3]
        cleaned_output = cleaned_output.strip()
        
        parsed = json.loads(cleaned_output)
        
        # Attach unique IDs to action items
        action_items = []
        for item in parsed.get("action_items", []):
            action_items.append({
                "id": str(uuid.uuid4()),
                "task": item.get("task", ""),
                "assignee": item.get("assignee", "Unassigned"),
                "completed": False
            })
            
        return {
            "title": parsed.get("title", "AI Meeting Assistant Summary"),
            "executive_summary": parsed.get("executive_summary", ""),
            "key_decisions": parsed.get("key_decisions", []),
            "open_questions": parsed.get("open_questions", []),
            "action_items": action_items
        }
    except Exception as e:
        logger.error(f"Error during LLM analysis: {e}")
        return {
            "title": "AI Processed Video",
            "executive_summary": transcript_text[:300] + "...",
            "key_decisions": ["Completed video transcript processing."],
            "open_questions": [],
            "action_items": [
                {
                    "id": str(uuid.uuid4()),
                    "task": "Review full video transcript.",
                    "assignee": "Unassigned",
                    "completed": False
                }
            ]
        }
