
import os
import json
from supabase_client import supabase
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from groq import Groq
from pydantic import BaseModel, Field


router = APIRouter(prefix="/ai", tags=["AI Analysis"])


@router.get("/prospect-history/{prospect_id}")
def analyze_prospect_history(prospect_id: str):
    """Summarize saved prospect profile, calls, transcripts where available, and stage results without requiring a new transcript."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend.")
    context = get_prospect_context(prospect_id)
    try:
        parsed = json.loads(context)
        if not parsed.get("calls"):
            return {
                "prospect_id": prospect_id,
                "call_count": 0,
                "summary": "No saved calls were found for this prospect yet. Add a call or upload a recording to begin building call history.",
                "key_points": [],
                "recommended_next_steps": [],
            }
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You summarize saved prospect history for a salesperson. Use only the supplied records. Do not invent facts or claim that a call transcript exists when only metadata or stage notes exist. Distinguish confirmed facts from gaps. Return valid JSON with summary (string), key_points (array of strings), and recommended_next_steps (array of strings)."},
                {"role": "user", "content": "Analyze this prospect's saved profile, call history, and stage results. Summarize the relationship so far and what the caller should do next.\n\nSAVED CONTEXT:\n" + context},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("The model returned an empty response.")
        result = json.loads(content)
        return {
            "prospect_id": prospect_id,
            "call_count": len(parsed.get("calls", [])),
            "summary": str(result.get("summary") or "No summary was returned."),
            "key_points": result.get("key_points") if isinstance(result.get("key_points"), list) else [],
            "recommended_next_steps": result.get("recommended_next_steps") if isinstance(result.get("recommended_next_steps"), list) else [],
        }
    except HTTPException:
        raise
    except Exception as error:
        print("PROSPECT HISTORY ANALYSIS ERROR:", repr(error))
        raise HTTPException(status_code=502, detail=f"Prospect history analysis failed: {str(error)}") from error


class AnalyzeCallRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=100000)
    current_stage: int = Field(ge=1, le=8)


class AnalyzeCallResponse(BaseModel):
    stage_number: int
    suggested_outcome: str
    prospect_words: str
    caller_notes: str
    evidence: list[str]
    missing_information: list[str]
    uncertainty: str


def get_prospect_context(prospect_id: str) -> str:
    """
    Retrieve a prospect's saved profile, call history,
    and stage results for evidence-based AI analysis.
    """
    try:
        # Fetch the prospect's saved information.
        prospect_result = (
            supabase.table("prospects")
            .select("*")
            .eq("id", prospect_id)
            .limit(1)
            .execute()
        )

        if not prospect_result.data:
            raise HTTPException(
                status_code=404,
                detail="Prospect not found.",
            )

        prospect = prospect_result.data[0]

        # Fetch all calls associated with this prospect.
        calls_result = (
            supabase.table("calls")
            .select("*")
            .eq("prospect_id", prospect_id)
            .order("created_at", desc=True)
            .execute()
        )

        calls = calls_result.data or []
        history = []

        # Fetch saved stage results for each call.
        for call in calls:
            stages_result = (
                supabase.table("stage_results")
                .select(
                    "stage_number, stage_name, status, "
                    "extracted_content, evidence"
                )
                .eq("call_id", call["id"])
                .order("stage_number")
                .execute()
            )

            # Include the saved transcript where one exists, so history analysis
            # can use conversation content rather than relying only on call metadata.
            transcript_data = None
            try:
                transcript_result = (
                    supabase.table("call_transcripts")
                    .select("transcript, source_type, source_filename, updated_at")
                    .eq("call_id", call["id"])
                    .limit(1)
                    .execute()
                )
                if transcript_result.data:
                    transcript_data = transcript_result.data[0]
            except Exception as transcript_error:
                # Older deployments may not have applied the transcript migration.
                print("READ SAVED TRANSCRIPT WARNING:", repr(transcript_error))

            history.append({
                "call": call,
                "transcript": transcript_data,
                "stages": stages_result.data or [],
            })

        # JSON makes the historical context easy for the AI to read.
        return json.dumps(
            {
                "prospect": prospect,
                "call_count": len(calls),
                "calls": history,
            },
            ensure_ascii=False,
            default=str,
        )

    except HTTPException:
        raise
    except Exception as error:
        print("GET PROSPECT CONTEXT ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve prospect call history.",
        ) from error


@router.post("/analyze-call", response_model=AnalyzeCallResponse)
def analyze_call(request: AnalyzeCallRequest):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend.",
        )

    stage_names = {
        1: "Opening",
        2: "Purpose",
        3: "Permission",
        4: "Their business",
        5: "Their need in their words",
        6: "Objection",
        7: "Next step",
        8: "Close",
    }

    stage_name = stage_names[request.current_stage]
    client = Groq(api_key=api_key)

    instructions = """
You are an assistant helping a salesperson document a cold-call conversation.

Analyze only what the transcript supports.
Never invent prospect statements, commitments, or facts.
If information is missing or unclear, say so.
Keep the tone professional, neutral, and respectful.

Return valid JSON with these fields:
- stage_number: integer
- suggested_outcome: one of
  "complete", "incomplete", "needs_clarification", "not_assessable"
- prospect_words: exact relevant words from the transcript, or an empty string
- caller_notes: concise factual summary
- evidence: array of supporting transcript excerpts
- missing_information: array of relevant missing details
- uncertainty: short explanation of uncertainty, or an empty string
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": instructions,
                },
                {
                    "role": "user",
                    "content": (
                        f"Analyze stage {request.current_stage}: {stage_name}.\n\n"
                        "Use the transcript below as evidence. "
                        "Do not assume that every stage was discussed.\n\n"
                        f"TRANSCRIPT:\n{request.transcript}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError("The model returned an empty response.")

        result = json.loads(content)

        # Validate the model's result before returning it.
        validated = AnalyzeCallResponse.model_validate(result)

        # Always associate the result with the requested stage.
        validated.stage_number = request.current_stage

        return validated

    except HTTPException:
        raise
    except Exception as e:
        print("AI ANALYSIS ERROR:", repr(e))
        raise HTTPException(
            status_code=502,
            detail=f"AI analysis failed: {str(e)}"
        )

# The eight stage definitions are kept server-side so full-call analysis
# always returns the same structure expected by the Call Workspace.
FULL_CALL_STAGES = [
    {"stage_number": 1, "name": "Opening", "outcomes": ["intended_person_confirmed", "gatekeeper_or_identity_clarification", "busy_or_callback", "wrong_person_or_outdated_contact", "connection_problem_or_disconnection", "other_or_unclear"]},
    {"stage_number": 2, "name": "Purpose", "outcomes": ["purpose_understood", "purpose_question", "purpose_rejected", "purpose_not_discussed", "other_or_unclear"]},
    {"stage_number": 3, "name": "Permission", "outcomes": ["permission_yes", "permission_later", "permission_no", "permission_not_asked", "other_or_unclear"]},
    {"stage_number": 4, "name": "Their business", "outcomes": ["business_context_shared", "business_details_partial", "business_not_discussed", "other_or_unclear"]},
    {"stage_number": 5, "name": "Their need in their words", "outcomes": ["need_explicit", "need_possible", "no_need_stated", "other_or_unclear"]},
    {"stage_number": 6, "name": "Objection", "outcomes": ["objection_resolved", "objection_unresolved", "no_objection", "other_or_unclear"]},
    {"stage_number": 7, "name": "Next step", "outcomes": ["meeting_agreed", "follow_up_agreed", "information_requested", "no_next_step", "other_or_unclear"]},
    {"stage_number": 8, "name": "Close", "outcomes": ["positive_close", "callback_close", "declined_close", "ending_unclear"]},
]


class FullCallAnalysisRequest(BaseModel):
    call_id: str = Field(min_length=1, max_length=100)
    prospect_id: str = Field(min_length=1, max_length=100)
    transcript: str = Field(min_length=1, max_length=100000)
    source_type: str = Field(default="manual_notes", pattern="^(audio_upload|manual_notes|live_recording)$")
    source_filename: str | None = None


def _verify_call_and_prospect(call_id: str, prospect_id: str) -> None:
    """Ensure the call exists and belongs to the selected prospect."""
    try:
        result = (
            supabase.table("calls")
            .select("id, prospect_id")
            .eq("id", call_id)
            .eq("prospect_id", prospect_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Call was not found for this prospect.")
    except HTTPException:
        raise
    except Exception as error:
        print("VERIFY CALL ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to verify the call and prospect.") from error


def _save_transcript(request: FullCallAnalysisRequest) -> None:
    """Persist the transcript so later summary requests can retrieve it."""
    try:
        supabase.table("call_transcripts").upsert({
            "call_id": request.call_id,
            "prospect_id": request.prospect_id,
            "transcript": request.transcript,
            "source_type": request.source_type,
            "source_filename": request.source_filename,
            "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        }, on_conflict="call_id").execute()
    except Exception as error:
        print("SAVE TRANSCRIPT ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to save the transcript. Confirm the call_transcripts table migration has been run.",
        ) from error


def _run_full_call_analysis(request: FullCallAnalysisRequest) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend.")

    _verify_call_and_prospect(request.call_id, request.prospect_id)
    # Save first so the transcript remains available even if AI analysis fails.
    _save_transcript(request)
    context = get_prospect_context(request.prospect_id)
    client = Groq(api_key=api_key)

    system_prompt = """
You are an evidence-grounded cold-call analysis assistant. Analyse the entire current call and the supplied prospect history.
Use the current transcript as the primary evidence for this call. History is context only; never claim the current call said something that appears only in history.
Never invent quotes, commitments, dates, or facts. If there is no useful historical information, explicitly state in the overall_summary that there is insufficient historical information about this prospect, while still summarising the current transcript.
For each of the eight stages return exactly one object. status must be one of complete, incomplete, needs_clarification, not_assessable. Use complete only when there is clear evidence that the stage's meaningful objective was achieved. Use incomplete when it was not achieved or not reached, needs_clarification when evidence conflicts or is ambiguous, and not_assessable only when the transcript cannot reasonably support a judgment.
Choose outcome_key only from the allowed outcomes supplied for that stage. If nothing fits, choose other_or_unclear when available. Never mark a stage complete merely because the call continued.
prospect_words should contain a short exact quote from the transcript or an empty string. caller_notes should be factual and concise. evidence, missing_information are arrays of strings. uncertainty should be an empty string if there is no material uncertainty.
Return valid JSON with keys overall_summary, history_assessment, stages. stages must contain all eight stages in order. Each stage object must have stage_number, status, outcome_key, prospect_words, caller_notes, evidence, missing_information, uncertainty.
"""
    user_content = (
        "ALLOWED STAGES AND OUTCOMES:\n" + json.dumps(FULL_CALL_STAGES, ensure_ascii=False) +
        "\n\nSAVED PROSPECT PROFILE AND CALL HISTORY (may be empty or incomplete):\n" + context +
        "\n\nCURRENT CALL TRANSCRIPT:\n" + request.transcript
    )
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("The model returned an empty response.")
        result = json.loads(content)
        stages = result.get("stages")
        if not isinstance(stages, list) or len(stages) != 8:
            raise ValueError("The model did not return all eight stages.")
        valid_statuses = {"complete", "incomplete", "needs_clarification", "not_assessable"}
        allowed_by_stage = {item["stage_number"]: set(item["outcomes"]) for item in FULL_CALL_STAGES}
        normalized = []
        for expected_number, stage in enumerate(sorted(stages, key=lambda x: int(x.get("stage_number", 0))), start=1):
            if int(stage.get("stage_number", 0)) != expected_number:
                raise ValueError("The model returned duplicate or missing stage numbers.")
            status = stage.get("status")
            if status not in valid_statuses:
                status = "needs_clarification"
            outcome = stage.get("outcome_key")
            if outcome not in allowed_by_stage[expected_number]:
                outcome = "other_or_unclear" if "other_or_unclear" in allowed_by_stage[expected_number] else allowed_by_stage[expected_number].copy().pop()
            normalized.append({
                "stage_number": expected_number,
                "status": status,
                "outcome_key": outcome,
                "prospect_words": str(stage.get("prospect_words") or ""),
                "caller_notes": str(stage.get("caller_notes") or ""),
                "evidence": stage.get("evidence") if isinstance(stage.get("evidence"), list) else [],
                "missing_information": stage.get("missing_information") if isinstance(stage.get("missing_information"), list) else [],
                "uncertainty": str(stage.get("uncertainty") or ""),
            })
        return {
            "call_id": request.call_id,
            "prospect_id": request.prospect_id,
            "transcript": request.transcript,
            "overall_summary": str(result.get("overall_summary") or ""),
            "history_assessment": str(result.get("history_assessment") or ""),
            "stages": normalized,
        }
    except HTTPException:
        raise
    except Exception as error:
        print("FULL CALL ANALYSIS ERROR:", repr(error))
        raise HTTPException(status_code=502, detail=f"Full-call AI analysis failed: {str(error)}") from error


@router.post("/analyze-full-call")
def analyze_full_call(request: FullCallAnalysisRequest):
    """Save a supplied transcript and analyse all eight stages using prospect history."""
    return _run_full_call_analysis(request)


@router.post("/upload-audio")
def upload_audio_for_analysis(
    call_id: str = Form(...),
    prospect_id: str = Form(...),
    file: UploadFile = File(...),
    source_type: str = Form("audio_upload"),
):
    """Transcribe an uploaded recording with Groq, persist it, and analyse all stages."""
    allowed_types = {
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4",
        "audio/x-m4a", "audio/m4a", "audio/webm", "audio/ogg", "video/webm",
        "application/octet-stream",
    }
    filename = file.filename or "recording"
    if source_type not in {"audio_upload", "live_recording"}:
        raise HTTPException(status_code=422, detail="source_type must be audio_upload or live_recording.")
    extension = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if file.content_type not in allowed_types and extension not in {"mp3", "wav", "m4a", "webm", "ogg", "mp4", "mpeg"}:
        raise HTTPException(status_code=415, detail="Unsupported audio format. Upload MP3, WAV, M4A, MP4, OGG, or WebM.")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend.")
    try:
        _verify_call_and_prospect(call_id, prospect_id)
        raw_audio = file.file.read()
        if not raw_audio:
            raise HTTPException(status_code=400, detail="The uploaded audio file is empty.")
        if len(raw_audio) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB. Please compress or split the recording.")
        client = Groq(api_key=api_key)
        transcription = client.audio.transcriptions.create(
            file=(filename, raw_audio, file.content_type or "application/octet-stream"),
            model="whisper-large-v3-turbo",
            response_format="text",
        )
        transcript = transcription if isinstance(transcription, str) else getattr(transcription, "text", "")
        if not transcript or not transcript.strip():
            raise HTTPException(status_code=422, detail="No speech could be transcribed from this recording.")
        request = FullCallAnalysisRequest(
            call_id=call_id,
            prospect_id=prospect_id,
            transcript=transcript.strip(),
            source_type=source_type,
            source_filename=filename,
        )
        return _run_full_call_analysis(request)
    except HTTPException:
        raise
    except Exception as error:
        print("AUDIO TRANSCRIPTION ERROR:", repr(error))
        raise HTTPException(status_code=502, detail=f"Audio transcription failed: {str(error)}") from error


class LiveSuggestionRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=20000)
    purpose: str = Field(min_length=1, max_length=2000)
    current_stage: int = Field(ge=1, le=8)
    prospect_context: str = Field(default="", max_length=10000)


@router.post("/live-suggestion")
def live_suggestion(request: LiveSuggestionRequest):
    """Return one concise, evidence-based suggestion for the caller."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend.",
        )

    stage_names = {
        1: "Opening",
        2: "Purpose",
        3: "Permission",
        4: "Their business",
        5: "Their need in their words",
        6: "Objection",
        7: "Next step",
        8: "Close",
    }

    client = Groq(api_key=api_key)

    instructions = """
You are a discreet live cold-call assistant.
The caller must first clearly communicate the stated call purpose.
Do not suggest discovery questions before the purpose has been communicated.
Use only the supplied transcript; never invent prospect statements.
Give at most one short, natural suggestion the caller can say next.
Do not encourage pressure, deception, or ignoring a prospect's refusal.
If the prospect explicitly refuses or asks not to be contacted, advise
the caller to respect that request and stop the sales pitch.
If there is not enough context, say to listen and let the prospect speak.
Return valid JSON with:
suggestion: one short sentence
reason: one short sentence grounded in the transcript
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": instructions},
                {
                    "role": "user",
                    "content": (
                        f"CALL PURPOSE:\n{request.purpose}\n\n"
                        f"CURRENT STAGE: {stage_names[request.current_stage]}\n\n"
                        f"PROSPECT HISTORY:\n{request.prospect_context}\n\n"
                        f"TRANSCRIPT SO FAR:\n{request.transcript}\n\n"
                        "Suggest the caller's next natural sentence."
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("The model returned an empty response.")

        result = json.loads(content)
        return {
            "suggestion": str(result.get("suggestion") or ""),
            "reason": str(result.get("reason") or ""),
        }
    except Exception as error:
        print("LIVE SUGGESTION ERROR:", repr(error))
        raise HTTPException(
            status_code=502,
            detail="Unable to generate a live suggestion.",
        ) from error
