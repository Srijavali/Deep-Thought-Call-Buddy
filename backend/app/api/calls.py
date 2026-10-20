
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from app.schemas.common import CreateCallInput, StageResultInput, CloseCallInput
from supabase_client import supabase

router = APIRouter()

STAGE_NAMES = {
    1: "Opening",
    2: "Purpose",
    3: "Permission",
    4: "Their business",
    5: "Their need in their words",
    6: "Objection",
    7: "Next step",
    8: "Close",
}


@router.get("")
def list_calls(prospect_id: str | None = None):
    try:
        query = supabase.table("calls").select("*")

        if prospect_id:
            query = query.eq("prospect_id", prospect_id)

        result = query.order("created_at", desc=True).execute()

        return {
            "items": result.data or [],
            "prospect_id": prospect_id,
            "database_connected": True,
        }
    except Exception as error:
        print("SUPABASE CALL LIST ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to load calls.",
        ) from error


@router.post("", status_code=201)
def start_call(payload: CreateCallInput):
    try:
        prospect_result = (
            supabase.table("prospects")
            .select("id")
            .eq("id", payload.prospect_id)
            .execute()
        )

        if not prospect_result.data:
            raise HTTPException(
                status_code=404,
                detail="Prospect not found.",
            )

        purpose_snapshot = payload.purpose_snapshot

        if payload.purpose_id:
            purpose_result = (
                supabase.table("call_purposes")
                .select("id, name, description")
                .eq("id", payload.purpose_id)
                .execute()
            )

            if not purpose_result.data:
                raise HTTPException(
                    status_code=404,
                    detail="Call purpose not found.",
                )

            purpose = purpose_result.data[0]

            # Save the purpose as it existed when the call started.
            purpose_snapshot = (
                f"Name: {purpose['name']}\n"
                f"Description: {purpose.get('description') or ''}"
            )

        if not purpose_snapshot or not purpose_snapshot.strip():
            raise HTTPException(
                status_code=422,
                detail="Provide a saved purpose or a one-time purpose snapshot.",
            )

        # A continuation must belong to the same prospect. Stage results are
        # copied to the new call below; the source call is never modified.
        source_stages = []
        if payload.continued_from_call_id:
            source_call_result = (
                supabase.table("calls")
                .select("id, prospect_id")
                .eq("id", payload.continued_from_call_id)
                .execute()
            )
            if not source_call_result.data:
                raise HTTPException(status_code=404, detail="Previous call not found.")
            if source_call_result.data[0]["prospect_id"] != payload.prospect_id:
                raise HTTPException(
                    status_code=422,
                    detail="The previous call must belong to the selected prospect.",
                )
            stage_result = (
                supabase.table("stage_results")
                .select("*")
                .eq("call_id", payload.continued_from_call_id)
                .order("stage_number")
                .execute()
            )
            source_stages = stage_result.data or []

        data = {
            "prospect_id": payload.prospect_id,
            "purpose_id": payload.purpose_id,
            "purpose_snapshot": purpose_snapshot.strip(),
            "call_status": "in_progress",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "raw_notes": None,
            "transcript": None,
            "summary": None,
            "continued_from_call_id": payload.continued_from_call_id,
        }

        result = supabase.table("calls").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Call was not returned after creation.",
            )

        created_call = result.data[0]

        # Copy saved stage responses into the new call. Keep the original
        # call_id and all source rows untouched. Stage IDs/timestamps are new.
        copied_count = 0
        if source_stages:
            copied_rows = []
            for stage in source_stages:
                copied = {
                    key: value
                    for key, value in stage.items()
                    if key not in ("id", "created_at", "updated_at")
                }
                copied["call_id"] = created_call["id"]
                copied["updated_at"] = datetime.now(timezone.utc).isoformat()
                copied_rows.append(copied)
            copied_result = supabase.table("stage_results").insert(copied_rows).execute()
            copied_count = len(copied_result.data or [])

        return {
            "message": "Call started successfully.",
            "call": created_call,
            "continued_from_call_id": payload.continued_from_call_id,
            "copied_stage_count": copied_count,
        }

    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE CALL CREATE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to start call.",
        ) from error


@router.get("/{call_id}/stages")
def get_call_stages(call_id: str):
    """Return saved stage responses for one specific call."""
    try:
        call_result = (
            supabase.table("calls")
            .select("id, prospect_id, call_status, purpose_snapshot, started_at, ended_at, continued_from_call_id")
            .eq("id", call_id)
            .execute()
        )
        if not call_result.data:
            raise HTTPException(status_code=404, detail="Call not found.")

        stage_result = (
            supabase.table("stage_results")
            .select("*")
            .eq("call_id", call_id)
            .order("stage_number")
            .execute()
        )
        return {"call": call_result.data[0], "stages": stage_result.data or []}
    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE STAGE HISTORY ERROR:", repr(error))
        raise HTTPException(status_code=500, detail="Unable to load saved stage responses.") from error


@router.post("/{call_id}/stages")
def save_stage(call_id: str, payload: StageResultInput):
    try:
        call_result = (
            supabase.table("calls")
            .select("id, call_status")
            .eq("id", call_id)
            .execute()
        )

        if not call_result.data:
            raise HTTPException(status_code=404, detail="Call not found.")

        # Keep every schema field without requiring new database columns.
        extracted_content = {
            "outcome_key": payload.outcome_key,
            "prospect_words": payload.prospect_words,
            "caller_notes": payload.caller_notes,
            "extracted_information": payload.extracted_information,
            "missing_information": payload.missing_information,
            "uncertainty": payload.uncertainty,
            "ai_analysis": payload.ai_analysis,
            "caller_corrected": payload.caller_corrected,
        }

        confidence = None
        if payload.ai_analysis:
            candidate = payload.ai_analysis.get("confidence")
            if isinstance(candidate, (int, float)) and not isinstance(candidate, bool):
                if 0 <= candidate <= 1:
                    confidence = candidate

        data = {
            "call_id": call_id,
            "stage_number": payload.stage_number,
            "stage_name": STAGE_NAMES[payload.stage_number],
            "status": payload.status,
            "extracted_content": extracted_content,
            "evidence": payload.evidence,
            "confidence": confidence,
            "caller_correction": (
                payload.caller_notes if payload.caller_corrected else None
            ),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Update the stage if it already exists; otherwise insert it.
        existing = (
            supabase.table("stage_results")
            .select("id")
            .eq("call_id", call_id)
            .eq("stage_number", payload.stage_number)
            .execute()
        )

        if existing.data:
            result = (
                supabase.table("stage_results")
                .update(data)
                .eq("call_id", call_id)
                .eq("stage_number", payload.stage_number)
                .execute()
            )
        else:
            result = supabase.table("stage_results").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Stage result was not returned after saving.",
            )

        return {
            "message": "Stage result saved successfully.",
            "stage": result.data[0],
        }

    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE STAGE SAVE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to save stage result.",
        ) from error


@router.post("/{call_id}/close")
def close_call(call_id: str, payload: CloseCallInput):
    try:
        existing = (
            supabase.table("calls")
            .select("id, call_status")
            .eq("id", call_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Call not found.")

        if existing.data[0]["call_status"] in ("completed", "abandoned"):
            raise HTTPException(
                status_code=409,
                detail="This call is already closed.",
            )

        # The existing calls table has no dedicated final_outcome or
        # call_ending columns, so preserve these fields in the summary.
        final_details = {
            "final_outcome": payload.final_outcome,
            "call_ending": payload.call_ending,
            "summary": payload.summary,
            "prospect_words": payload.prospect_words,
        }

        import json

        saved_summary = json.dumps(final_details, ensure_ascii=False)

        result = (
            supabase.table("calls")
            .update({
                "call_status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "summary": saved_summary,
            })
            .eq("id", call_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Call was not returned after closing.",
            )

        return {
            "message": "Call closed successfully.",
            "call": result.data[0],
        }

    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE CALL CLOSE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to close call.",
        ) from error
