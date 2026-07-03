from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import shutil

from agents import create_financial_agent
from rag_pipeline import parse_file_to_documents, ingest_documents

app = FastAPI(
    title="Financial Agent API",
    description="API for the Multi-Agent Financial Reconciliation System",
    version="1.0.0"
)

# Configure CORS so the Next.js frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheckResponse(BaseModel):
    status: str
    version: str

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Basic health check endpoint to verify the API is running."""
    return HealthCheckResponse(status="healthy", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Welcome to the Financial Agent API. Visit /docs for the swagger UI."}

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Endpoint to upload Excel files, parse them, and store them in the Vector DB."""
    if not file.filename.endswith(('.xls', '.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Only Excel (.xls, .xlsx) and CSV files are supported.")
        
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        docs = parse_file_to_documents(temp_path)
        ingest_documents(docs)
        return {"status": "success", "message": f"Successfully ingested {file.filename} into the vector database."}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Endpoint to chat with the Financial Agent."""
    try:
        agent_executor = create_financial_agent()
        response = agent_executor.invoke({"input": request.message})
        return ChatResponse(reply=response["output"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
