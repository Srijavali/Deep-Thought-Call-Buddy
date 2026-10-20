
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase_client import supabase

router = APIRouter()


class ProspectCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    company_name: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=40)
    notes: str | None = None


@router.get("")
def list_prospects(search: str | None = None):
    try:
        query = supabase.table("prospects").select("*")

        if search and search.strip():
            term = search.strip()
            query = query.or_(
                f"full_name.ilike.%{term}%,company_name.ilike.%{term}%"
            )

        result = query.order("created_at", desc=True).execute()

        return {
            "items": result.data or [],
            "database_connected": True,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Unable to load prospects from the database.",
        ) from error


@router.post("", status_code=201)
def create_prospect(payload: ProspectCreate):
    full_name = payload.full_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=422,
            detail="Prospect name cannot be empty.",
        )

    # Map the form's "role" field to the database's "job_title" column.
    data = payload.model_dump(exclude_none=True)
    data["full_name"] = full_name

    if "role" in data:
        data["job_title"] = data.pop("role")

    try:
        result = supabase.table("prospects").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="The prospect was not returned after creation.",
            )

        return {
            "message": "Prospect created successfully",
            "prospect": result.data[0],
        }

    except HTTPException:
        raise
    except Exception as error:
        print("SUPABASE ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail="Unable to create prospect in the database.",
        ) from error