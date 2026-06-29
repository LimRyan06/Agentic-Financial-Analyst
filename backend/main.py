from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
