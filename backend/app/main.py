from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_analysis import router as ai_analysis_router
from app.api.calls import router as calls_router
from app.api.intelligence import router as intelligence_router
from app.api.prospects import router as prospects_router
from app.api.purposes import router as purposes_router

load_dotenv()

app = FastAPI(
    title="DeepThought Cold-Call Companion API",
    version="0.1.0",
    description="API for prospect-centered cold-call sessions and evidence-based AI review.",
)

# Add the deployed Vercel origin here before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(prospects_router, prefix="/prospects", tags=["prospects"])
app.include_router(calls_router, prefix="/calls", tags=["calls"])
app.include_router(purposes_router, prefix="/purposes", tags=["purposes"])
app.include_router(ai_analysis_router)
app.include_router(intelligence_router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "deepthought-cold-call-companion-api"}
