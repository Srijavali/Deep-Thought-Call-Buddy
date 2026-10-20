from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

StageStatus = Literal["complete", "incomplete", "needs_clarification", "not_assessable"]
CallStatus = Literal["in_progress", "closed"]

class StageResultInput(BaseModel):
    stage_number: int = Field(ge=1, le=8)
    status: StageStatus = "incomplete"
    outcome_key: str | None = None
    prospect_words: str | None = None
    caller_notes: str | None = None
    extracted_information: dict = Field(default_factory=dict)
    evidence: list[dict] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    uncertainty: str | None = None
    ai_analysis: dict | None = None
    caller_corrected: bool = False

class CloseCallInput(BaseModel):
    final_outcome: str = "unclear_other"
    call_ending: str = "ending_unclear"
    summary: str | None = None
    prospect_words: str | None = None

class CreateCallInput(BaseModel):
    prospect_id: str
    purpose_id: str | None = None
    purpose_snapshot: str | None = None
    input_method: Literal["manual_notes", "audio_upload", "browser_recording"] = "manual_notes"
    continued_from_call_id: str | None = None
