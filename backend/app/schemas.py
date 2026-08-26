from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProcessVideoRequest(BaseModel):
    source_url: str = Field(..., description="YouTube URL or local file name")
    source_type: str = Field("youtube", description="youtube or file")
    language: str = Field("english", description="english or hinglish")

class TranscriptSegmentSchema(BaseModel):
    start: float
    end: float
    text: str

class ActionItemSchema(BaseModel):
    id: str
    task: str
    assignee: Optional[str] = "Unassigned"
    completed: bool = False

class SummarySchema(BaseModel):
    executive_summary: str
    key_decisions: List[str] = []
    open_questions: List[str] = []
    action_items: List[ActionItemSchema] = []

class ProcessStatusResponse(BaseModel):
    meeting_id: str
    status: str  # pending, downloading, transcribing, analyzing, indexing, completed, failed
    progress_percentage: int
    step_message: str
    error_message: Optional[str] = None

class MeetingResponse(BaseModel):
    meeting_id: str
    title: str
    source_type: str
    source_url: str
    youtube_video_id: Optional[str] = None
    media_file_path: Optional[str] = None
    duration: float = 0.0
    status: str
    created_at: str
    segments: List[TranscriptSegmentSchema] = []
    summary: Optional[str] = ""
    action_items: List[ActionItemSchema] = []
    key_decisions: List[str] = []
    open_questions: List[str] = []

class AskQuestionRequest(BaseModel):
    meeting_id: str
    question: str

class ChatMessageSchema(BaseModel):
    id: str
    meeting_id: str
    sender: str
    text: str
    created_at: str

class ToggleActionItemRequest(BaseModel):
    completed: bool
