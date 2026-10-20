import json
import os
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from groq import Groq

from supabase_client import supabase
from app.api.ai_analysis import get_prospect_context

router = APIRouter(tags=["Prospect Intelligence"])


class TaskCreateInput(BaseModel):
    prospect_id: str
    source_call_id: str | None = None
    task_type: str = "follow_up"
    title: str = Field(min_length=1, max_length=180)
    details: str = ""
    due_at: datetime | None = None
    timezone: str = "Asia/Kolkata"
    source_excerpt: str = ""
    ai_confidence: float = Field(default=0.5, ge=0, le=1)
    needs_confirmation: bool = False


class TaskUpdateInput(BaseModel):
    status: Literal["pending", "completed", "dismissed", "rescheduled"] | None = None
    due_at: datetime | None = None
    title: str | None = Field(default=None, max_length=180)
    details: str | None = None
    needs_confirmation: bool | None = None


def _ensure_prospect(prospect_id: str):
    result = supabase.table("prospects").select("*").eq("id", prospect_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Prospect not found.")
    return result.data[0]


@router.get("/prospects/{prospect_id}/intelligence")
def get_prospect_intelligence(prospect_id: str):
    """Automatically return call history, stage evidence, saved intelligence and follow-up tasks."""
    try:
        prospect = _ensure_prospect(prospect_id)
        calls_result = (
            supabase.table("calls").select("*").eq("prospect_id", prospect_id)
            .order("created_at", desc=True).execute()
        )
        calls = calls_result.data or []
        enriched = []
        for call in calls:
            stages = (
                supabase.table("stage_results").select("stage_number, stage_name, status, extracted_content, evidence")
                .eq("call_id", call["id"]).order("stage_number").execute()
            ).data or []
            enriched.append({"call": call, "stages": stages})
        profile = None
        try:
            profile_result = supabase.table("prospect_intelligence").select("*").eq("prospect_id", prospect_id).limit(1).execute()
            profile = (profile_result.data or [None])[0]
        except Exception as error:
            print("PROSPECT INTELLIGENCE CACHE NOT AVAILABLE (apply migration):", repr(error))
        tasks = []
        try:
            tasks_result = (
                supabase.table("follow_up_tasks").select("*").eq("prospect_id", prospect_id)
                .in_("status", ["pending", "rescheduled"]).order("due_at").execute()
            )
            tasks = tasks_result.data or []
        except Exception as error:
            print("FOLLOW-UP TASKS NOT AVAILABLE (apply migration):", repr(error))
        return {
            "prospect": prospect,
            "call_count": len(calls),
            "calls": enriched,
            "profile": profile,
            "tasks": tasks,
            "context": get_prospect_context(prospect_id),
        }
    except HTTPException:
        raise
    except Exception as error:
        print("PROSPECT INTELLIGENCE ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to load prospect intelligence.") from error


@router.post("/prospects/{prospect_id}/intelligence/refresh")
def refresh_prospect_intelligence(prospect_id: str):
    """Summarize the full relationship history and persist an evidence-based qualification profile."""
    _ensure_prospect(prospect_id)
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")
    history = get_prospect_context(prospect_id)
    prompt = """
You are DeepThought's post-call relationship analyst. Analyze the supplied history across all available calls and stages.
Return JSON with: relationship_summary (string), recommendation (one of prioritize, nurture, revisit_later, deprioritize, disqualified, insufficient_evidence), rationale (string), confidence (low/medium/high), positive_signals (array), concerns (array), explicit_rejection (boolean), do_not_contact (boolean), open_commitments (array), evidence (array of objects with call_reference, quote_or_fact, interpretation), last_known_interests (array), unresolved_questions (array).
Be evidence-based. Separate historical facts from inference. Do not treat a request to call later as rejection. If a prospect explicitly asks not to be contacted, flag it clearly. Never invent missing data.
"""
    try:
        client = Groq(api_key=api_key)
        result = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": f"PROSPECT ID: {prospect_id}\nHISTORY:\n{history}"}],
            response_format={"type": "json_object"}, temperature=0.1,
        )
        content = result.choices[0].message.content
        if not content:
            raise ValueError("Empty model response")
        profile = json.loads(content)
        row = {
            "prospect_id": prospect_id,
            "relationship_summary": profile.get("relationship_summary", ""),
            "recommendation": profile.get("recommendation", "insufficient_evidence"),
            "rationale": profile.get("rationale", ""),
            "confidence": profile.get("confidence", "low"),
            "positive_signals": profile.get("positive_signals", []),
            "concerns": profile.get("concerns", []),
            "explicit_rejection": bool(profile.get("explicit_rejection", False)),
            "do_not_contact": bool(profile.get("do_not_contact", False)),
            "open_commitments": profile.get("open_commitments", []),
            "evidence": profile.get("evidence", []),
            "last_known_interests": profile.get("last_known_interests", []),
            "unresolved_questions": profile.get("unresolved_questions", []),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            existing = supabase.table("prospect_intelligence").select("prospect_id").eq("prospect_id", prospect_id).execute()
            if existing.data:
                saved = supabase.table("prospect_intelligence").update(row).eq("prospect_id", prospect_id).execute()
            else:
                saved = supabase.table("prospect_intelligence").insert(row).execute()
            if saved.data:
                row = saved.data[0]
        except Exception as error:
            print("PROSPECT INTELLIGENCE SAVE ERROR (apply migration):", repr(error))
            raise HTTPException(status_code=500, detail="Intelligence was generated but could not be saved. Apply the SQL migration and retry.") from error
        return {"profile": row}
    except HTTPException:
        raise
    except Exception as error:
        print("PROSPECT INTELLIGENCE REFRESH ERROR:", repr(error))
        raise HTTPException(status_code=502, detail="Unable to refresh prospect intelligence.") from error


@router.get("/follow-up-tasks")
def list_follow_up_tasks(prospect_id: str | None = None, status: str = Query(default="pending")):
    try:
        query = supabase.table("follow_up_tasks").select("*")
        if prospect_id:
            query = query.eq("prospect_id", prospect_id)
        if status != "all":
            query = query.eq("status", status)
        result = query.order("due_at", desc=False).execute()
        items = result.data or []
        prospect_ids = list({item.get("prospect_id") for item in items if item.get("prospect_id")})
        names = {}
        if prospect_ids:
            prospects_result = supabase.table("prospects").select("id, full_name, company_name").in_("id", prospect_ids).execute()
            names = {p["id"]: {"prospect_name": p.get("full_name") or "Unknown prospect", "company_name": p.get("company_name") or ""} for p in (prospects_result.data or [])}
        for item in items:
            item.update(names.get(item.get("prospect_id"), {"prospect_name": "Unknown prospect", "company_name": ""}))
        return {"items": items}
    except Exception as error:
        print("FOLLOW-UP TASK LIST ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to load follow-up reminders. Apply the SQL migration if the table is missing.") from error


@router.post("/follow-up-tasks", status_code=201)
def create_follow_up_task(payload: TaskCreateInput):
    try:
        _ensure_prospect(payload.prospect_id)
        row = payload.model_dump()
        row["due_at"] = payload.due_at.astimezone(timezone.utc).isoformat() if payload.due_at and payload.due_at.tzinfo else None
        row["status"] = "pending"
        row["created_at"] = datetime.now(timezone.utc).isoformat()
        row["updated_at"] = row["created_at"]
        if row["due_at"] is None:
            row["needs_confirmation"] = True
        result = supabase.table("follow_up_tasks").insert(row).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Reminder was not returned after creation.")
        return {"task": result.data[0]}
    except HTTPException:
        raise
    except Exception as error:
        print("FOLLOW-UP TASK CREATE ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to create follow-up reminder.") from error


@router.patch("/follow-up-tasks/{task_id}")
def update_follow_up_task(task_id: str, payload: TaskUpdateInput):
    try:
        patch = payload.model_dump(exclude_unset=True)
        if "due_at" in patch:
            due = payload.due_at
            patch["due_at"] = due.astimezone(timezone.utc).isoformat() if due and due.tzinfo else None
            if patch["due_at"] is None:
                patch["needs_confirmation"] = True
        patch["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = supabase.table("follow_up_tasks").update(patch).eq("id", task_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Reminder not found.")
        return {"task": result.data[0]}
    except HTTPException:
        raise
    except Exception as error:
        print("FOLLOW-UP TASK UPDATE ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to update follow-up reminder.") from error
