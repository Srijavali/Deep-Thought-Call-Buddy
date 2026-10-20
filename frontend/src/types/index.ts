
export type Prospect = {
  id: string;
  full_name: string;
  company_name: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type ProspectForm = {
  full_name: string;
  company_name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

export type Purpose = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at?: string;
};

export type PurposeForm = {
  name: string;
  description: string;
  is_default: boolean;
};

export type CallInputMethod =
  | "manual_notes"
  | "audio_upload"
  | "browser_recording";

export type StartCallForm = {
  prospect_id: string;
  purpose_id: string;
  one_time_purpose: string;
  input_method: CallInputMethod;
};

export type CallRecord = {
  id: string;
  prospect_id: string;
  purpose_snapshot: string | null;
  call_status: string;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  created_at?: string;
};
