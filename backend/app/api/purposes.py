
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase_client import supabase

router = APIRouter()


class PurposeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    is_default: bool = False


class PurposeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    is_default: bool = False


@router.get("")
def list_purposes():
    try:
        result = (
            supabase.table("call_purposes")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return {
            "items": result.data or [],
            "database_connected": True,
        }
    except Exception as error:
        print("SUPABASE PURPOSE LIST ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to load call purposes.",
        ) from error


@router.post("", status_code=201)
def create_purpose(payload: PurposeCreate):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Purpose name cannot be empty.",
        )

    data = payload.model_dump()
    data["name"] = name

    if data["description"] is not None:
        data["description"] = data["description"].strip() or None

    try:
        result = (
            supabase.table("call_purposes")
            .insert(data)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Purpose was not returned after creation.",
            )

        return {
            "message": "Call purpose created successfully.",
            "purpose": result.data[0],
        }
    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE PURPOSE CREATE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to create call purpose.",
        ) from error


@router.put("/{purpose_id}")
def update_purpose(purpose_id: str, payload: PurposeUpdate):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Purpose name cannot be empty.",
        )

    data = payload.model_dump()
    data["name"] = name

    if data["description"] is not None:
        data["description"] = data["description"].strip() or None

    try:
        result = (
            supabase.table("call_purposes")
            .update(data)
            .eq("id", purpose_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Call purpose not found.",
            )

        return {
            "message": "Call purpose updated successfully.",
            "purpose": result.data[0],
        }
    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE PURPOSE UPDATE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to update call purpose.",
        ) from error


@router.delete("/{purpose_id}")
def delete_purpose(purpose_id: str):
    try:
        result = (
            supabase.table("call_purposes")
            .delete()
            .eq("id", purpose_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Call purpose not found or could not be deleted.",
            )

        return {"message": "Call purpose deleted successfully."}
    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE PURPOSE DELETE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to delete call purpose.",
        ) from error

