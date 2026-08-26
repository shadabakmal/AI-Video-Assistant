# 🎬 AI Video Assistant — Full-Stack MongoDB Platform

An end-to-end meeting intelligence platform built with **FastAPI**, **MongoDB**, **OpenAI Whisper**, **LangChain**, **ChromaDB**, and **React (Vite)**.

---

## 🌟 Key Features

- **MongoDB Document Persistence**: Complete meeting history, timestamped transcript segments `[{start, end, text}]`, summaries, action items, and Q&A chat saved natively in MongoDB collections.
- **Interactive Video & Transcript Synchronization**: Synchronized YouTube video player paired with timestamped transcript lines. Clicking any timestamp `[mm:ss]` seeks the video to that exact second.
- **Interactive Action Item Checklist**: Check off action items in real-time with automatic MongoDB document state updates.
- **Context-Aware Meeting RAG Chat**: Chat with your meeting transcripts using ChromaDB vector search and Mistral AI, with source timestamp citations.
- **Multi-Language Support**: OpenAI Whisper for English transcription & Sarvam AI for Hinglish / Hindi speech translation.
- **Meeting Export Suite**: One-click download of meeting reports in JSON or formatted TXT format.

---

## 🏗️ Architecture Stack

### Backend (`/backend`)
- **Framework**: FastAPI + Uvicorn
- **Database**: MongoDB (via `motor` async driver)
- **Speech-to-Text**: Local OpenAI Whisper (`small` model) & Sarvam AI (`saaras:v2.5`)
- **LLM & RAG Engine**: LangChain + Mistral AI (`mistral-small-latest`) + ChromaDB (`all-MiniLM-L6-v2`)

### Frontend (`/frontend`)
- **Framework**: React 18 + Vite SPA
- **Styling**: Cyberpunk dark design system (`Syne` & `JetBrains Mono` fonts, glowing neon accents, glassmorphic cards)
- **Icons**: Lucide React

---

## 🚀 Getting Started

### 1. Environment Configuration

Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=ai_video_assistant

MISTRAL_API_KEY=your_mistral_api_key_here
SARVAM_API_KEY=your_sarvam_api_key_here  # Optional
WHISPER_MODEL=small
```

### 2. Start the Backend API (FastAPI)

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start the Frontend Application (React)

```bash
cd frontend
npm run dev
```
- Open browser at: [http://localhost:3000](http://localhost:3000)

---

## 🛰️ REST API Endpoints (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/meetings/process` | Initiate background video processing task |
| `GET` | `/meetings/status/{id}` | Real-time progress status polling |
| `GET` | `/meetings/` | List all saved meetings from MongoDB |
| `GET` | `/meetings/{id}` | Get full meeting document details |
| `PATCH` | `/meetings/{id}/action-items/{item_id}` | Toggle action item completion state |
| `DELETE` | `/meetings/{id}` | Delete meeting document from MongoDB |
| `GET` | `/meetings/{id}/export?format=txt\|json` | Download meeting report |
| `POST` | `/chat/ask` | Send question to RAG chat engine |
| `GET` | `/chat/history/{id}` | Fetch meeting chat history |
