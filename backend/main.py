from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import shutil

from fastapi.staticfiles import StaticFiles
from agents import create_financial_agent
import pandas as pd

app = FastAPI(
    title="Financial Agent API",
    description="API for the Multi-Agent Financial Reconciliation System",
    version="1.0.0"
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("static", exist_ok=True)

# Mount the static directory to serve generated charts
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS so the Next.js frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Next.js default and alternative ports
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
        
    file_path = os.path.join("uploads", file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "success", "message": f"Successfully loaded {file.filename} for analysis."}

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
