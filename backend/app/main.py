from fastapi import FastAPI

app = FastAPI(
    title="CivicPulse API",
    description="Smart Civic Complaint & Issue Management System",
    version="1.0.0",
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CivicPulse API"
    }