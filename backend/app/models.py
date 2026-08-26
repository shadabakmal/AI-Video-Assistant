from pydantic import BaseModel, Field, EmailStr, ConfigDict
from pydantic_core import core_schema
from bson import ObjectId
from typing import Optional, List, Literal
from datetime import datetime

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(lambda x: str(x)),
        )

    @classmethod
    def validate(cls, value):
        if not ObjectId.is_valid(value):
            raise ValueError("Invalid ObjectId")
        return str(value)

# ----------------- User Models ----------------- #
class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: EmailStr
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str

# ----------------- Media Content Models ----------------- #
class MediaContentModel(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    type: Literal["URL", "Audio", "Video"]
    source_url: str
    transcript: Optional[str] = ""
    summary: Optional[str] = ""
    title: Optional[str] = "Untitled Media Processing"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})

class MediaProcessRequest(BaseModel):
    mediaUrl: str
    mediaType: Literal["URL", "Audio", "Video"]
    language: Optional[str] = "english"

# ----------------- Message / Conversation Models ----------------- #
class MessageModel(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    media_content_id: str
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})

class ChatRequest(BaseModel):
    media_content_id: str
    question: str
