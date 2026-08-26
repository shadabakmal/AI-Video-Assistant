import logging
try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_mistralai import ChatMistralAI
from app.config import VECTOR_DB_DIR, MISTRAL_API_KEY

logger = logging.getLogger("uvicorn")

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        logger.info(f"Loading HuggingFace Embeddings model '{EMBEDDING_MODEL}'...")
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"}
        )
    return _embeddings

def index_transcript_segments(meeting_id: str, segments: list) -> bool:
    try:
        docs = []
        for i, seg in enumerate(segments):
            text = seg.get("text", "").strip()
            if not text:
                continue
            start = seg.get("start", 0.0)
            end = seg.get("end", 0.0)
            metadata = {
                "meeting_id": meeting_id,
                "chunk_index": i,
                "start": start,
                "end": end,
                "timestamp_label": f"[{int(start // 60):02d}:{int(start % 60):02d}]"
            }
            docs.append(Document(page_content=text, metadata=metadata))

        if not docs:
            return False

        collection_name = f"meeting_{meeting_id.replace('-', '_')}"
        embeddings = get_embeddings()
        
        Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            collection_name=collection_name,
            persist_directory=str(VECTOR_DB_DIR)
        )
        logger.info(f"Vector store indexed for meeting {meeting_id} ({len(docs)} segments)")
        return True
    except Exception as e:
        logger.error(f"Failed to index transcript in vector store: {e}")
        return False

def query_meeting_rag(meeting_id: str, question: str) -> str:
    try:
        collection_name = f"meeting_{meeting_id.replace('-', '_')}"
        embeddings = get_embeddings()
        
        vector_store = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            persist_directory=str(VECTOR_DB_DIR)
        )
        
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        docs = retriever.invoke(question)
        
        context_parts = []
        for d in docs:
            ts = d.metadata.get("timestamp_label", "")
            context_parts.append(f"{ts} {d.page_content}")
        context_str = "\n".join(context_parts)

        if not MISTRAL_API_KEY:
            return f"Retrieved Context ({len(docs)} snippets):\n{context_str}"

        llm = ChatMistralAI(
            model="mistral-small-latest",
            mistral_api_key=MISTRAL_API_KEY,
            temperature=0.3
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert meeting assistant. Answer the user's question 
based ONLY on the meeting transcript context provided below.

If the answer is not found in the context, say: 
"I could not find this information in the meeting transcript."

Context with timestamps:
{context}"""),
            ("human", "{question}")
        ])

        chain = prompt | llm | StrOutputParser()
        return chain.invoke({"context": context_str, "question": question})

    except Exception as e:
        logger.error(f"RAG Query error: {e}")
        return f"Could not process question due to error: {e}"
