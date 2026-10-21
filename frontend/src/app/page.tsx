
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  API_URL,
} from "@/lib/api";
import ProspectsPage from "@/components/prospects/ProspectsPage";
import CallWorkspace from "@/components/calls/CallWorkspace";
import FollowUpReminderBar from "@/components/calls/FollowUpReminderBar";
import type {
  CallInputMethod,
  CallRecord,
  Prospect,
  ProspectForm,
  Purpose,
  PurposeForm,
  StartCallForm,
} from "@/types";



const emptyStartCallForm: StartCallForm = {
  prospect_id: "",
  purpose_id: "",
  one_time_purpose: "",
  input_method: "manual_notes",
};



const emptyPurposeForm: PurposeForm = {
  name: "",
  description: "",
  is_default: false,
};

const emptyForm: ProspectForm = {
  full_name: "",
  company_name: "",
  role: "",
  email: "",
  phone: "",
  notes: "",
};



export default function Home() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("Prospects");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [returnToStartCall, setReturnToStartCall] = useState(false);
  const [form, setForm] = useState<ProspectForm>(emptyForm);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [purposesLoading, setPurposesLoading] = useState(false);
  const [purposeFormOpen, setPurposeFormOpen] = useState(false);
  const [editingPurposeId, setEditingPurposeId] = useState<string | null>(null);
  const [purposeForm, setPurposeForm] = useState<PurposeForm>(emptyPurposeForm);
  
  const [startCallOpen, setStartCallOpen] = useState(false);
  const [startCallForm, setStartCallForm] =
    useState<StartCallForm>(emptyStartCallForm);
  const [startingCall, setStartingCall] = useState(false);
  const [startCallAudioFile, setStartCallAudioFile] = useState<File | null>(null);
  const [startCallRecording, setStartCallRecording] = useState(false);
  const [startCallRecordingStarting, setStartCallRecordingStarting] = useState(false);
  const [startCallRecordingConsent, setStartCallRecordingConsent] = useState(false);
  const [startCallRecordingSeconds, setStartCallRecordingSeconds] = useState(0);
  const startCallAudioInputRef = useRef<HTMLInputElement | null>(null);
  const startCallMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const startCallMediaStreamRef = useRef<MediaStream | null>(null);
  const startCallRecordingChunksRef = useRef<Blob[]>([]);
  const startCallSpeechRecognitionRef = useRef<any>(null);
  const startCallRecordingActiveRef = useRef(false);
  const startCallFinalTranscriptRef = useRef("");
  const startCallSuggestionTimerRef = useRef<number | null>(null);
  const startCallSuggestionRequestRef = useRef(0);
  const [startCallLiveTranscript, setStartCallLiveTranscript] = useState("");
  const [startCallSpeaker, setStartCallSpeaker] = useState<"CALLER" | "PROSPECT">("CALLER");
  const startCallLastSuggestionTranscriptRef = useRef("");
  const [startCallInterimTranscript, setStartCallInterimTranscript] = useState("");
  const [startCallLiveSuggestion, setStartCallLiveSuggestion] = useState<{ suggestion: string; reason: string } | null>(null);
  const [startCallSuggestionLoading, setStartCallSuggestionLoading] = useState(false);
  const [startCallLiveStatus, setStartCallLiveStatus] = useState("Start recording to get live coaching.");
  const [startCallLiveError, setStartCallLiveError] = useState("");

  function stopStartCallSpeechRecognition() {
    if (startCallSuggestionTimerRef.current !== null) {
      window.clearTimeout(startCallSuggestionTimerRef.current);
      startCallSuggestionTimerRef.current = null;
    }
    startCallRecordingActiveRef.current = false;
    const recognition = startCallSpeechRecognitionRef.current;
    startCallSpeechRecognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* already stopped */ }
    }
    setStartCallInterimTranscript("");
  }

  async function requestStartCallLiveSuggestion(transcript: string) {
    const selectedProspect = prospects.find((item) => item.id === startCallForm.prospect_id);
    const selectedPurpose = purposes.find((item) => item.id === startCallForm.purpose_id);
    const purposeText = selectedPurpose?.description?.trim() || selectedPurpose?.name || startCallForm.one_time_purpose.trim();
    if (!transcript.trim() || !purposeText) return;
    if (transcript.trim() === startCallLastSuggestionTranscriptRef.current) return;
    startCallLastSuggestionTranscriptRef.current = transcript.trim();
    const requestId = ++startCallSuggestionRequestRef.current;
    setStartCallSuggestionLoading(true);
    setStartCallLiveStatus("Updating suggestion from the conversation so far…");
    setStartCallLiveError("");
    try {
      let prospectContext = selectedProspect
        ? `Prospect name: ${selectedProspect.full_name || "Not provided"}. Company: ${selectedProspect.company_name || "Not provided"}. Notes: ${selectedProspect.notes || "Not provided"}.`
        : "Prospect context not available.";
      if (selectedProspect?.id) {
        try {
          const historyResponse = await fetch(`${API_URL}/prospects/${encodeURIComponent(selectedProspect.id)}/intelligence`, { headers: { Accept: "application/json" }, credentials: "include" });
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            const rawContext = historyData?.context ?? historyData;
            prospectContext += "\nSaved prospect intelligence: " + (typeof rawContext === "string" ? rawContext : JSON.stringify(rawContext)).slice(0, 7000);
          }
        } catch { /* basic prospect details are still useful */ }
      }
      const response = await fetch(`${API_URL}/ai/live-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ transcript: transcript.trim().slice(-20000), purpose: purposeText, current_stage: 1, prospect_context: prospectContext.slice(0, 10000) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `Live suggestion failed (${response.status}).`);
      if (requestId !== startCallSuggestionRequestRef.current) return;
      setStartCallLiveSuggestion({ suggestion: typeof data?.suggestion === "string" ? data.suggestion : "", reason: typeof data?.reason === "string" ? data.reason : "" });
      setStartCallLiveStatus("Suggestion updated from the latest speech.");
    } catch (err) {
      if (requestId === startCallSuggestionRequestRef.current) { startCallLastSuggestionTranscriptRef.current = ""; setStartCallLiveError(err instanceof Error ? err.message : "Unable to get a live suggestion."); setStartCallLiveStatus("Suggestion request failed. Keep speaking; the coach will retry when new speech arrives."); }
    } finally {
      if (requestId === startCallSuggestionRequestRef.current) setStartCallSuggestionLoading(false);
    }
  }

  function startStartCallSpeechRecognition() {
    const speechWindow = window as any;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setStartCallLiveStatus("Live speech-to-text is not supported in this browser. Try the latest Chrome or Edge.");
      return;
    }
    startCallFinalTranscriptRef.current = "";
    startCallLastSuggestionTranscriptRef.current = "";
    setStartCallSpeaker("CALLER");
    setStartCallLiveTranscript("");
    setStartCallLiveSuggestion(null);
    setStartCallLiveError("");
    const recognition = new Recognition();
    startCallSpeechRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onstart = () => setStartCallLiveStatus("Listening for speech…");
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const phrase = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal && phrase.trim()) startCallFinalTranscriptRef.current += `${startCallSpeaker}: ${phrase.trim()}\n`;
        else interim += phrase;
      }
      const fullTranscript = startCallFinalTranscriptRef.current.trim();
      setStartCallLiveTranscript(fullTranscript);
      setStartCallInterimTranscript(interim.trim());
      if (fullTranscript.length > 8 && fullTranscript !== startCallLastSuggestionTranscriptRef.current) {
        if (startCallSuggestionTimerRef.current !== null) window.clearTimeout(startCallSuggestionTimerRef.current);
        startCallSuggestionTimerRef.current = window.setTimeout(() => {
          startCallSuggestionTimerRef.current = null;
          if (startCallRecordingActiveRef.current) void requestStartCallLiveSuggestion(fullTranscript);
        }, 1800);
      }
    };
    recognition.onerror = (event: any) => {
      setStartCallLiveStatus(`Speech recognition issue: ${event.error || "unknown error"}.`);
      if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(event.error)) stopStartCallSpeechRecognition();
    };
    recognition.onend = () => {
      if (startCallRecordingActiveRef.current && startCallSpeechRecognitionRef.current === recognition) {
        window.setTimeout(() => {
          if (startCallRecordingActiveRef.current && startCallSpeechRecognitionRef.current === recognition) {
            try { recognition.start(); } catch { /* browser may still be restarting */ }
          }
        }, 400);
      }
    };
    try { recognition.start(); } catch { setStartCallLiveStatus("Could not start speech recognition. Please try again."); }
  }

  useEffect(() => {
    if (!startCallOpen) stopStartCallSpeechRecognition();
    return () => stopStartCallSpeechRecognition();
  }, [startCallOpen]);
  useEffect(() => {
    if (!startCallRecording) return;
    const interval = window.setInterval(() => setStartCallRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [startCallRecording]);
  useEffect(() => {
    if (!startCallRecording) return;
    const interval = window.setInterval(() => {
      const transcript = startCallFinalTranscriptRef.current.trim();
      if (transcript.length > 8 && transcript !== startCallLastSuggestionTranscriptRef.current && !startCallSuggestionLoading) {
        void requestStartCallLiveSuggestion(transcript);
      }
    }, 7000);
    return () => window.clearInterval(interval);
  }, [startCallRecording, startCallSuggestionLoading, startCallForm, prospects, purposes]);
  const [startCallError, setStartCallError] = useState("");
  const [previousCallsError, setPreviousCallsError] = useState("");
  const [previousCallsRefreshKey, setPreviousCallsRefreshKey] = useState(0);

  const [previousCallsForProspect, setPreviousCallsForProspect] =
    useState<CallRecord[]>([]);
  const [selectedPreviousCallId, setSelectedPreviousCallId] =
    useState("");
  const [callStartChoice, setCallStartChoice] =
    useState<"fresh" | "continue">("fresh");
  const [checkingPreviousCalls, setCheckingPreviousCalls] = useState(false);

  
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState("");
  const [callSearch, setCallSearch] = useState("");
  const [callStatusFilter, setCallStatusFilter] = useState("all");
  const [activeCall, setActiveCall] = useState<{
    id: string;
    prospect_id: string;
    input_method: CallInputMethod;
    call_status: "in_progress" | "completed" | "abandoned";
    purpose: string;
  } | null>(null);


  const loadProspects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/prospects?search=${encodeURIComponent(search.trim())}`
      );

      if (!response.ok) {
        throw new Error("Unable to load prospects. Please try again.");
      }

      const data = await response.json();
      setProspects(data.items ?? []);
    } catch {
      setError(
        "Could not connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadProspects();
  }, [loadProspects]);

  
async function createProspect(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(`${API_URL}/prospects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || null,
        role: form.role.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to create prospect. Please try again."
      );
    }

    const createdProspect =
      data?.prospect ?? data?.item ?? data;

    if (returnToStartCall) {
      if (!createdProspect?.id) {
        throw new Error(
          "Prospect was created, but the API did not return its ID. Please refresh the prospect list before starting the call."
        );
      }

      setProspects((current) => [
        createdProspect,
        ...current.filter(
          (prospect) => prospect.id !== createdProspect.id
        ),
      ]);

      setStartCallForm((current) => ({
        ...current,
        prospect_id: createdProspect.id,
      }));

      setReturnToStartCall(false);
      setForm(emptyForm);
      setShowForm(false);
      setStartCallOpen(true);
      setSuccess("Prospect created. Complete the call details below.");
    } else {
      setForm(emptyForm);
      setShowForm(false);
      setSearch("");
      setSuccess("Prospect created successfully!");
      await loadProspects();
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong while creating the prospect."
    );
  } finally {
    setSaving(false);
  }
}


  const loadPurposes = useCallback(async () => {
  setPurposesLoading(true);
  setError("");

  try {
    const response = await fetch(`${API_URL}/purposes`);

    if (!response.ok) {
      throw new Error("Unable to load call purposes.");
    }

    const data = await response.json();
    setPurposes(data.items ?? []);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to load call purposes."
    );
  } finally {
    setPurposesLoading(false);
  }
}, []);


const loadCalls = useCallback(async () => {
  setCallsLoading(true);
  setCallsError("");

  try {
    const response = await fetch(`${API_URL}/calls`);

    if (!response.ok) {
      throw new Error("Unable to load call history.");
    }

    const data = await response.json();

    // Support either a plain list or an { items: [...] } response.
    const records = Array.isArray(data) ? data : data.items ?? [];
    setCalls(records);
  } catch (err) {
    setCallsError(
      err instanceof Error
        ? err.message
        : "Unable to load call history."
    );
  } finally {
    setCallsLoading(false);
  }
}, []);

useEffect(() => {
  if (!startCallOpen || !startCallForm.prospect_id) {
    setPreviousCallsForProspect([]);
    setSelectedPreviousCallId("");
    setCallStartChoice("fresh");
    setPreviousCallsError("");
    setCheckingPreviousCalls(false);
    return;
  }

  let cancelled = false;

  async function fetchPreviousCalls() {
    setCheckingPreviousCalls(true);
    setPreviousCallsError("");
    setPreviousCallsForProspect([]);
    setSelectedPreviousCallId("");
    setCallStartChoice("fresh");

    try {
      const response = await fetch(
        `${API_URL}/calls?prospect_id=${encodeURIComponent(
          startCallForm.prospect_id
        )}`
      );

      if (!response.ok) {
        throw new Error("Unable to check previous calls.");
      }

      const data = await response.json();
      const records: CallRecord[] = Array.isArray(data)
        ? data
        : data.items ?? [];

      if (cancelled) return;

      const previousCalls = records
        .filter((call) => call.id)
        .sort(
          (a, b) =>
            new Date(b.started_at ?? b.created_at ?? 0).getTime() -
            new Date(a.started_at ?? a.created_at ?? 0).getTime()
        );

      setPreviousCallsForProspect(previousCalls);

      if (previousCalls.length > 0) {
        setSelectedPreviousCallId(previousCalls[0].id);
      }
    } catch (err) {
      if (!cancelled) {
        setPreviousCallsError(
          err instanceof Error
            ? err.message
            : "Unable to check previous calls."
        );
      }
    } finally {
      if (!cancelled) {
        setCheckingPreviousCalls(false);
      }
    }
  }

  void fetchPreviousCalls();

  return () => {
    cancelled = true;
  };
}, [startCallOpen, startCallForm.prospect_id, previousCallsRefreshKey]);


async function startNewCall(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setStartingCall(true);
  setStartCallError("");
  setError("");

  try {
    const selectedProspect = prospects.find(
      (prospect) => prospect.id === startCallForm.prospect_id
    );

    if (!selectedProspect) {
      throw new Error("Please select an existing prospect.");
    }

    if (startCallForm.input_method === "audio_upload" && !startCallAudioFile) {
      throw new Error("Please choose an audio file before creating the call.");
    }
    if (startCallForm.input_method === "browser_recording" && !startCallAudioFile) {
      throw new Error("Please record and stop the audio before creating the call.");
    }

    if (callStartChoice === "continue" && !selectedPreviousCallId) {
      throw new Error("Please select a previous call to continue.");
    }

    if (previousCallsError) {
      throw new Error("Please retry checking previous calls before creating a call.");
    }

    const selectedPurpose = purposes.find(
      (purpose) => purpose.id === startCallForm.purpose_id
    );

    if (!selectedPurpose && !startCallForm.one_time_purpose.trim()) {
      throw new Error("Select a saved purpose or enter a one-time purpose.");
    }

    const purposeSnapshot = selectedPurpose
      ? undefined
      : startCallForm.one_time_purpose.trim();

    const response = await fetch(`${API_URL}/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prospect_id: selectedProspect.id,
        purpose_id: selectedPurpose?.id ?? null,
        purpose_snapshot: purposeSnapshot ?? null,
        input_method: startCallForm.input_method,
        continued_from_call_id:
          callStartChoice === "continue"
            ? selectedPreviousCallId
            : null,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail || "Unable to start the call.");
    }

    const createdCall = data?.call;

    if (!createdCall?.id) {
      throw new Error("The backend did not return the new call ID.");
    }

    setStartCallOpen(false);
    setStartCallForm(emptyStartCallForm);
    setPreviousCallsForProspect([]);
    setSelectedPreviousCallId("");
    setCallStartChoice("fresh");
    setPreviousCallsError("");
    setActiveCall({
      id: createdCall.id,
      prospect_id: selectedProspect.id,
      input_method: startCallForm.input_method,
      call_status: "in_progress",
      // Keep the exact purpose available to the live-call AI suggestions.
      purpose: selectedPurpose
        ? [selectedPurpose.name, selectedPurpose.description]
            .filter((value) => typeof value === "string" && value.trim())
            .join(" — ")
        : startCallForm.one_time_purpose.trim(),
    });
    setSuccess("");
    setActiveNav("Active Call");
  } catch (err) {
    setStartCallError(
      err instanceof Error ? err.message : "Unable to start the call."
    );
  } finally {
    setStartingCall(false);
  }
}



async function saveStage(result: {
  stage_number: number;
  status:
    | "complete"
    | "incomplete"
    | "needs_clarification"
    | "not_assessable";
  outcome_key: string | null;
  prospect_words: string;
  caller_notes: string;
}) {
  if (!activeCall) throw new Error("No active call was found.");

  const response = await fetch(`${API_URL}/calls/${activeCall.id}/stages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stage_number: result.stage_number,
      status: result.status,
      outcome_key: result.outcome_key,
      prospect_words: result.prospect_words.trim() || null,
      caller_notes: result.caller_notes.trim() || null,
      extracted_information: {},
      evidence: [],
      missing_information: [],
      uncertainty: null,
      ai_analysis: null,
      caller_corrected: false,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || `Unable to save Stage ${result.stage_number}.`);
  }
}

async function endActiveCall() {
  if (!activeCall) throw new Error("No active call was found.");

  const response = await fetch(`${API_URL}/calls/${activeCall.id}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      final_outcome: "unclear_other",
      call_ending: "ending_unclear",
      summary: "Call ended before a final outcome was reviewed.",
      prospect_words: null,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || "Unable to close the call.");
  }

  setActiveCall(null);
  await loadCalls();
  setActiveNav("Call History");
}

useEffect(() => {
  if (activeNav === "Purpose Library") {
    void loadPurposes();
  }
}, [activeNav, loadPurposes]);

useEffect(() => {
  if (startCallOpen) {
    void loadPurposes();
  }
}, [startCallOpen, loadPurposes]);

useEffect(() => {
  if (activeNav === "Call History") {
    void loadCalls();
  }
}, [activeNav, loadCalls]);

async function savePurpose(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSaving(true);
  setError("");
  setSuccess("");

  const isEditing = editingPurposeId !== null;
  const url = isEditing
    ? `${API_URL}/purposes/${editingPurposeId}`
    : `${API_URL}/purposes`;

  try {
    const response = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: purposeForm.name.trim(),
        description: purposeForm.description.trim() || null,
        is_default: purposeForm.is_default,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Unable to save the call purpose.");
    }

    setPurposeForm(emptyPurposeForm);
    setPurposeFormOpen(false);
    setEditingPurposeId(null);
    setSuccess(isEditing ? "Purpose updated successfully." : "Purpose created successfully.");
    await loadPurposes();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to save the purpose.");
  } finally {
    setSaving(false);
  }
}

function startEditingPurpose(purpose: Purpose) {
  setEditingPurposeId(purpose.id);
  setPurposeForm({
    name: purpose.name,
    description: purpose.description ?? "",
    is_default: purpose.is_default,
  });
  setPurposeFormOpen(true);
}

async function deletePurpose(purpose: Purpose) {
  const confirmed = window.confirm(
    `Delete "${purpose.name}" from the Purpose Library?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  try {
    const response = await fetch(`${API_URL}/purposes/${purpose.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Unable to delete the purpose.");
    }

    setSuccess("Purpose deleted successfully.");
    await loadPurposes();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to delete the purpose.");
  }
}

  const workspaceMode =
    activeCall?.input_method === "browser_recording"
      ? "guided_live"
      : activeCall?.input_method === "audio_upload"
        ? "audio_upload"
        : "manual_notes";

  const stats = useMemo(
    () => [
      {
        label: "Total prospects",
        value: prospects.length,
        icon: "◉",
      },
      {
        label: "Follow-ups",
        value: "—",
        icon: "↻",
      },
      {
        label: "Meetings agreed",
        value: "—",
        icon: "✓",
      },
    ],
    [prospects.length]
  );

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#202124]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-6 md:flex md:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#243b70] text-lg font-bold text-white">
              D
            </div>
            <div>
              <h1 className="font-semibold">DeepThought</h1>
              <p className="text-xs text-gray-500">Cold Call Companion</p>
            </div>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Workspace
          </p>

          <nav className="space-y-2">
            {[
              { name: "Prospects", icon: "◉" },
              { name: "Call History", icon: "↻" },
              { name: "Purpose Library", icon: "▤" },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveNav(item.name)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${
                  activeNav === item.name
                    ? "bg-[#edf1fb] font-semibold text-[#243b70]"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl bg-[#f5f6fa] p-4">
            <p className="text-sm font-semibold">Call smarter.</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Keep prospect conversations, insights, and follow-ups organized.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 md:px-10">
            <div>
              <p className="text-xs text-gray-500">
                Workspace / {activeNav}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{activeNav}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ecf7] text-sm font-semibold text-[#243b70]">
                S
              </div>
              <span className="hidden text-sm font-medium sm:inline">
                My workspace
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-5 md:p-10">
    <FollowUpReminderBar />  
{activeNav === "Active Call" && activeCall ? (
  <CallWorkspace
    callId={activeCall.id}
    prospectId={activeCall.prospect_id}
    callMode={workspaceMode}
    initialAudioFile={startCallAudioFile}
    onInitialAudioFileConsumed={() => setStartCallAudioFile(null)}
    callStatus={activeCall.call_status}
    purpose={activeCall.purpose}
    onSaveStage={saveStage}
    onEndCall={endActiveCall}
  />
) : activeNav === "Purpose Library" ? (
  <div>
    {/* Page heading */}
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="mb-2 text-sm font-medium text-[#526a9d]">
          WORKSPACE / SETTINGS
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Purpose Library
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
          Create and manage the introductions you use during cold calls.
          Save reusable purposes or keep a one-time purpose for a specific call.
        </p>
      </div>

      <button
        onClick={() => {
          setError("");
          setSuccess("");
          setEditingPurposeId(null);
          setPurposeForm(emptyPurposeForm);
          setPurposeFormOpen(true);
        }}
        className="rounded-lg bg-[#243b70] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#192c58]"
      >
        + Create purpose
      </button>
    </div>

    {/* Status messages */}
    {error && (
      <div
        role="alert"
        className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
        <button
          onClick={() => void loadPurposes()}
          className="ml-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    )}

    {success && (
      <div
        role="status"
        className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
      >
        {success}
      </div>
    )}

    {/* Summary */}
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Saved purposes</p>
        <p className="mt-3 text-3xl font-bold">{purposes.length}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Default purposes</p>
        <p className="mt-3 text-3xl font-bold">
          {purposes.filter((purpose) => purpose.is_default).length}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Library status</p>
        <p className="mt-3 text-lg font-semibold text-[#243b70]">
          {purposesLoading ? "Loading..." : "Connected"}
        </p>
      </div>
    </div>

    {/* Purpose cards */}
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Your saved purposes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage the purpose statements available for your calls.
        </p>
      </div>
    </div>

    {purposesLoading ? (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center text-sm text-gray-500">
        Loading your purpose library...
      </div>
    ) : purposes.length === 0 ? (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf1fb] text-2xl">
          ✦
        </div>
        <h3 className="text-lg font-semibold">
          Your library is empty
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Create your first purpose to keep your cold-call introduction
          ready whenever you need it.
        </p>
        <button
          onClick={() => {
            setError("");
            setSuccess("");
            setEditingPurposeId(null);
            setPurposeForm(emptyPurposeForm);
            setPurposeFormOpen(true);
          }}
          className="mt-6 rounded-lg bg-[#243b70] px-5 py-3 text-sm font-semibold text-white hover:bg-[#192c58]"
        >
          Create your first purpose
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {purposes.map((purpose) => (
          <article
            key={purpose.id}
            className="rounded-xl border border-gray-200 bg-white p-6 transition hover:border-[#b8c5e5] hover:shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf1fb] text-xl text-[#243b70]">
                  ✦
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">
                    {purpose.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Reusable call purpose
                  </p>
                </div>
              </div>

              {purpose.is_default && (
                <span className="shrink-0 rounded-full bg-[#e8ecf7] px-3 py-1 text-xs font-semibold text-[#243b70]">
                  Default
                </span>
              )}
            </div>

            <p className="min-h-12 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {purpose.description || "No description added yet."}
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs text-gray-400">
                {purpose.created_at
                  ? `Created ${new Date(
                      purpose.created_at
                    ).toLocaleDateString()}`
                  : "Saved purpose"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    startEditingPurpose(purpose);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  onClick={() => void deletePurpose(purpose)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    )}

    {/* Create/edit purpose dialog */}
    {purposeFormOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setPurposeFormOpen(false);
            setEditingPurposeId(null);
            setPurposeForm(emptyPurposeForm);
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="purpose-form-title"
          className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="purpose-form-title" className="text-xl font-bold">
                {editingPurposeId ? "Edit purpose" : "Create a purpose"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Give this purpose a clear name and describe why you are
                contacting the prospect.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setPurposeFormOpen(false);
                setEditingPurposeId(null);
                setPurposeForm(emptyPurposeForm);
              }}
              aria-label="Close form"
              className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <form onSubmit={savePurpose} className="space-y-5">
            <div>
              <label
                htmlFor="purpose-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Purpose name <span className="text-red-500">*</span>
              </label>
              <input
                id="purpose-name"
                required
                maxLength={100}
                value={purposeForm.name}
                onChange={(event) =>
                  setPurposeForm({
                    ...purposeForm,
                    name: event.target.value,
                  })
                }
                placeholder="e.g. Initial Discovery Call"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10"
              />
            </div>

            <div>
              <label
                htmlFor="purpose-description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Purpose description
              </label>
              <textarea
                id="purpose-description"
                rows={5}
                maxLength={2000}
                value={purposeForm.description}
                onChange={(event) =>
                  setPurposeForm({
                    ...purposeForm,
                    description: event.target.value,
                  })
                }
                placeholder="Explain your business and why you are reaching out..."
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {purposeForm.description.length}/2000
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={purposeForm.is_default}
                onChange={(event) =>
                  setPurposeForm({
                    ...purposeForm,
                    is_default: event.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 accent-[#243b70]"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Set as default purpose
                </span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">
                  Mark this as the purpose you prefer to use by default.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setPurposeFormOpen(false);
                  setEditingPurposeId(null);
                  setPurposeForm(emptyPurposeForm);
                }}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !purposeForm.name.trim()}
                className="rounded-lg bg-[#243b70] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingPurposeId
                    ? "Save changes"
                    : "Create purpose"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  
  </div>
) : activeNav === "Call History" ? (
  <div>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="mb-2 text-sm font-medium text-[#526a9d]">
          WORKSPACE / ACTIVITY
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Call History
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Review previous conversations and their saved outcomes.
        </p>
      </div>

      <button
        onClick={() => void loadCalls()}
        disabled={callsLoading}
        className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
      >
        {callsLoading ? "Refreshing..." : "↻ Refresh"}
      </button>
    </div>

    {callsError && (
      <div
        role="alert"
        className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {callsError}
        <button
          onClick={() => void loadCalls()}
          className="ml-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    )}

    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Total calls</p>
        <p className="mt-3 text-3xl font-bold">{calls.length}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">In progress</p>
        <p className="mt-3 text-3xl font-bold">
          {calls.filter((call) => call.call_status === "in_progress").length}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Completed</p>
        <p className="mt-3 text-3xl font-bold">
          {calls.filter((call) => call.call_status === "completed").length}
        </p>
      </div>
    </div>

    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">All calls</h2>
          <p className="mt-1 text-xs text-gray-500">
            Saved call records from your database
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <input
            aria-label="Search call history"
            value={callSearch}
            onChange={(event) => setCallSearch(event.target.value)}
            placeholder="Search prospect or purpose..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] sm:w-64"
          />

          <select
            aria-label="Filter calls by status"
            value={callStatusFilter}
            onChange={(event) => setCallStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#526a9d]"
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {callsLoading ? (
        <div className="px-5 py-16 text-center text-sm text-gray-500">
          Loading call history...
        </div>
      ) : (
        (() => {
          const normalizedSearch = callSearch.trim().toLowerCase();

          const filteredCalls = calls
            .filter((call) => {
              const prospect = prospects.find(
                (item) => item.id === call.prospect_id
              );

              const searchableText = [
                prospect?.full_name ?? "",
                prospect?.company_name ?? "",
                call.purpose_snapshot ?? "",
              ]
                .join(" ")
                .toLowerCase();

              const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(normalizedSearch);

              const matchesStatus =
                callStatusFilter === "all" ||
                call.call_status === callStatusFilter;

              return matchesSearch && matchesStatus;
            })
            .sort(
              (a, b) =>
                new Date(b.started_at ?? b.created_at ?? 0).getTime() -
                new Date(a.started_at ?? a.created_at ?? 0).getTime()
            );

          if (filteredCalls.length === 0) {
            return (
              <div className="px-5 py-16 text-center">
                <div className="mb-3 text-3xl">↻</div>
                <h3 className="font-semibold">No calls found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {calls.length === 0
                    ? "Your saved calls will appear here when you start making calls."
                    : "Try changing your search or status filter."}
                </p>
              </div>
            );
          }

          const groupedCalls = new Map<string, { prospect: Prospect | undefined; calls: CallRecord[] }>();
          for (const call of filteredCalls) {
            const prospect = prospects.find((item) => item.id === call.prospect_id);
            const key = call.prospect_id || "unknown";
            const group = groupedCalls.get(key) ?? { prospect, calls: [] };
            group.calls.push(call);
            groupedCalls.set(key, group);
          }

          return (
            <div className="space-y-4 p-4">
              {Array.from(groupedCalls.entries()).map(([prospectId, group]) => (
                <details key={prospectId} open className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{group.prospect?.full_name ?? "Unknown prospect"}</p>
                      <p className="mt-1 text-sm text-gray-500">{group.prospect?.company_name ?? "Company not recorded"} · {group.calls.length} call{group.calls.length === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-sm text-gray-500">View calls⌄</span>
                  </summary>
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {group.calls.map((call) => {
                      const chronologicalCalls = calls
                        .filter((item) => item.prospect_id === call.prospect_id)
                        .sort(
                          (a, b) =>
                            new Date(a.started_at ?? a.created_at ?? 0).getTime() -
                            new Date(b.started_at ?? b.created_at ?? 0).getTime()
                        );

                      const callNumber =
                        chronologicalCalls.findIndex((item) => item.id === call.id) + 1;

                      const continuedFromCallId = (
                        call as CallRecord & { continued_from_call_id?: string | null }
                      ).continued_from_call_id;

                      const sourceCall = continuedFromCallId
                        ? calls.find((item) => item.id === continuedFromCallId)
                        : undefined;

                      const sourceCallNumber = sourceCall
                        ? calls
                            .filter((item) => item.prospect_id === sourceCall.prospect_id)
                            .sort(
                              (a, b) =>
                                new Date(a.started_at ?? a.created_at ?? 0).getTime() -
                                new Date(b.started_at ?? b.created_at ?? 0).getTime()
                            )
                            .findIndex((item) => item.id === sourceCall.id) + 1
                        : null;

                      return (
                        <button
                          key={call.id}
                          type="button"
                          onClick={() => {
                            setActiveCall({
                              id: call.id,
                              prospect_id: call.prospect_id,
                              input_method: "manual_notes",
                              call_status:
                                call.call_status === "completed"
                                  ? "completed"
                                  : call.call_status === "abandoned"
                                    ? "abandoned"
                                    : "in_progress",
                              // Historical calls use their saved purpose snapshot when available.
                              purpose: call.purpose_snapshot ?? "",
                            });
                            setSuccess("");
                            setError("");
                            setActiveNav("Active Call");
                          }}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf1fb] text-sm font-semibold text-[#243b70]">
                              {callNumber}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                Call {callNumber}
                                {sourceCallNumber !== null &&
                                  ` · Continuation of Call ${sourceCallNumber}`}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {(call.started_at ?? call.created_at)
                                  ? new Date(call.started_at ?? call.created_at!).toLocaleString()
                                  : "Date unavailable"}
                                {" · "}
                                {call.purpose_snapshot || "Purpose not recorded"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              call.call_status === "completed"
                                ? "bg-green-50 text-green-700"
                                : call.call_status === "in_progress"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {call.call_status.replaceAll("_", " ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          );
        })()
      )}

      <div className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
        {calls.length} saved call{calls.length === 1 ? "" : "s"}
      </div>
    </div>
  </div>
) : (
  
            <ProspectsPage
              prospects={prospects}
              search={search}
              setSearch={setSearch}
              loading={loading}
              error={error}
              success={success}
              onNewProspect={() => {
                setError("");
                setSuccess("");
                setShowForm(true);
              }}
              onStartCall={() => {
                setStartCallError("");
                setPreviousCallsError("");
                setStartCallForm({
                  prospect_id: prospects[0]?.id ?? "",
                  purpose_id: "",
                  one_time_purpose: "",
                  input_method: "manual_notes",
                });
                setStartCallOpen(true);
              }}
              onRetry={() => void loadProspects()}
            />

            )}
          </div>
        </section>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prospect-form-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2
                  id="prospect-form-title"
                  className="text-xl font-bold"
                >
                  Add a prospect
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the details you know. Only the name is required.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={createProspect} className="space-y-4">
              {(
                [
                  ["full_name", "Full name *", "e.g. Ananya Sharma"],
                  ["company_name", "Company", "e.g. BrightPath Technologies"],
                  ["role", "Job title", "e.g. Founder"],
                  ["email", "Email", "e.g. ananya@example.com"],
                  ["phone", "Phone", "e.g. 9876543210"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label
                    htmlFor={field}
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    {label}
                  </label>
                  <input
                    id={field}
                    type={field === "email" ? "email" : "text"}
                    required={field === "full_name"}
                    maxLength={field === "full_name" ? 160 : undefined}
                    value={form[field]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10"
                  />
                </div>
              ))}

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Any useful context about this prospect..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.full_name.trim()}
                  className="rounded-lg bg-[#243b70] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create prospect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
{startCallOpen && (
  <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
    <div className="mx-auto my-4 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Start New Call
        </h2>

        <button
          type="button"
          onClick={() => { startCallRecordingActiveRef.current = false; stopStartCallSpeechRecognition(); if (startCallMediaRecorderRef.current?.state === "recording") startCallMediaRecorderRef.current.stop(); startCallMediaStreamRef.current?.getTracks().forEach((track) => track.stop()); setStartCallRecording(false); setStartCallOpen(false); }}
          className="text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      <p className="mb-5 text-sm text-gray-600">
        Select a prospect and the purpose for this call. Each call will be
        saved as a separate record in the prospect's history.
      </p>

      <form onSubmit={startNewCall} className="space-y-5">
        {startCallError && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {startCallError}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Prospect *
          </label>

          <select
            required
            value={startCallForm.prospect_id}
            onChange={(e) =>
              setStartCallForm({
                ...startCallForm,
                prospect_id: e.target.value,
              })
            }
            className="w-full rounded-md border border-gray-300 p-2 text-gray-900"
          >
            <option value="">Select a prospect</option>

            {prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.full_name}
                {prospect.company_name
                  ? ` — ${prospect.company_name}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        {checkingPreviousCalls && (
          <p className="text-sm text-gray-500">
            Checking previous calls...
          </p>
        )}

        {previousCallsError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <p>{previousCallsError}</p>
            <button
              type="button"
              onClick={() =>
                setPreviousCallsRefreshKey((current) => current + 1)
              }
              className="mt-2 font-medium underline"
            >
              Retry checking previous calls
            </button>
          </div>
        )}

        {!checkingPreviousCalls &&
  previousCallsForProspect.length > 0 && (
    <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">
        Previous call found
      </legend>

      <p className="text-sm text-gray-600">
        This prospect has {previousCallsForProspect.length} previous
        call{previousCallsForProspect.length === 1 ? "" : "s"}.
        Would you like to continue the previous conversation or start fresh?
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
        <input
          type="radio"
          name="call_start_choice"
          checked={callStartChoice === "continue"}
          onChange={() => setCallStartChoice("continue")}
          className="mt-1"
        />

        <span>
          <span className="block text-sm font-medium text-gray-800">
            Continue a previous call
          </span>
          <span className="mt-1 block text-xs text-gray-500">
            Copy the saved stage responses into a new call. The original
            call remains unchanged.
          </span>

          <select
            aria-label="Choose previous call to continue"
            value={selectedPreviousCallId}
            onChange={(event) =>
              setSelectedPreviousCallId(event.target.value)
            }
            onClick={() => setCallStartChoice("continue")}
            className="mt-3 w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
          >
            {previousCallsForProspect.map((call) => (
              <option key={call.id} value={call.id}>
                {(call.started_at ?? call.created_at)
                  ? new Date(
                      call.started_at ?? call.created_at!
                    ).toLocaleString()
                  : "Date unavailable"}
                {" · "}
                {call.call_status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
        <input
          type="radio"
          name="call_start_choice"
          checked={callStartChoice === "fresh"}
          onChange={() => setCallStartChoice("fresh")}
          className="mt-1"
        />

        <span>
          <span className="block text-sm font-medium text-gray-800">
            Start fresh
          </span>
          <span className="mt-1 block text-xs text-gray-500">
            Start a new call with all eight stages empty.
          </span>
        </span>
      </label>
    </fieldset>
  )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Saved purpose
          </label>

          <select
            value={startCallForm.purpose_id}
            onChange={(e) =>
              setStartCallForm({
                ...startCallForm,
                purpose_id: e.target.value,
                one_time_purpose: "",
              })
            }
            className="w-full rounded-md border border-gray-300 p-2 text-gray-900"
          >
            <option value="">Use a one-time purpose instead</option>

            {purposes.map((purpose) => (
              <option key={purpose.id} value={purpose.id}>
                {purpose.name}
              </option>
            ))}
          </select>
        </div>

        {!startCallForm.purpose_id && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              One-time purpose *
            </label>

            <textarea
              required
              rows={3}
              value={startCallForm.one_time_purpose}
              onChange={(e) =>
                setStartCallForm({
                  ...startCallForm,
                  one_time_purpose: e.target.value,
                })
              }
              placeholder="Why are you calling this prospect?"
              className="w-full rounded-md border border-gray-300 p-2 text-gray-900"
            />
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">
            Input method
          </legend>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="input_method"
                value="manual_notes"
                checked={startCallForm.input_method === "manual_notes"}
                onChange={() =>
                  setStartCallForm({
                    ...startCallForm,
                    input_method: "manual_notes",
                  })
                }
              />
              Manual notes
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="input_method"
                value="audio_upload"
                checked={startCallForm.input_method === "audio_upload"}
                onChange={() =>
                  setStartCallForm({
                    ...startCallForm,
                    input_method: "audio_upload",
                  })
                }
              />
              Audio upload
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="input_method"
                value="browser_recording"
                checked={startCallForm.input_method === "browser_recording"}
                onChange={() =>
                  setStartCallForm({
                    ...startCallForm,
                    input_method: "browser_recording",
                  })
                }
              />
              Browser recording
            </label>
          </div>

          <div className="mt-3 space-y-3">
            {startCallForm.input_method === "manual_notes" && (
              <p className="rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                Enter a transcript or notes in the call workspace, then request AI analysis.
              </p>
            )}

            {startCallForm.input_method === "audio_upload" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-700" aria-hidden="true">♫</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Upload an existing call recording</p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">Choose an MP3, WAV, M4A, MP4, OGG, or WebM file (maximum 25 MB). The recording will be ready to transcribe and analyse in the call workspace.</p>
                  </div>
                </div>
                <input
                  ref={startCallAudioInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,.mpeg,audio/*,video/webm"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) return;
                    const allowed = /\.(mp3|wav|m4a|mp4|ogg|webm|mpeg)$/i.test(file.name) || file.type.startsWith("audio/") || file.type === "video/webm";
                    if (!allowed) {
                      setStartCallError("Unsupported audio format. Please choose MP3, WAV, M4A, MP4, OGG, or WebM.");
                      event.target.value = "";
                      return;
                    }
                    if (file.size > 25 * 1024 * 1024) {
                      setStartCallError("The audio file must be 25 MB or smaller.");
                      event.target.value = "";
                      return;
                    }
                    setStartCallError("");
                    setStartCallAudioFile(file);
                  }}
                  className="block w-full rounded-md border border-blue-200 bg-white p-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-800"
                />
                {startCallAudioFile && startCallForm.input_method === "audio_upload" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-100 bg-white p-2.5 text-xs">
                    <span className="break-all text-gray-700">Selected: <strong>{startCallAudioFile.name}</strong> · {(startCallAudioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <button type="button" onClick={() => { setStartCallAudioFile(null); if (startCallAudioInputRef.current) startCallAudioInputRef.current.value = ""; }} className="font-semibold text-red-700 underline">Remove</button>
                  </div>
                )}
              </div>
            )}

            {startCallForm.input_method === "browser_recording" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-700" aria-hidden="true">🎙️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Record using your microphone</p>
                    <p className="mt-1 text-xs leading-5 text-gray-600">Allow microphone access, record the conversation, then stop and review it. Audio is not uploaded until you create the call and submit it for analysis. This does not automatically capture a separate phone call.</p>
                  </div>
                </div>
                <label className="flex items-start gap-2 rounded-md border border-blue-100 bg-white p-2.5 text-xs leading-5 text-gray-700">
                  <input type="checkbox" className="mt-1" checked={startCallRecordingConsent} disabled={startCallRecording || startCallRecordingStarting} onChange={(e) => setStartCallRecordingConsent(e.target.checked)} />
                  <span>I have informed the people being recorded and obtained any required consent.</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {!startCallRecording ? (
                    <button type="button" disabled={!startCallRecordingConsent || startCallRecordingStarting || Boolean(startCallAudioFile)} onClick={async () => {
                      try {
                        setStartCallRecordingStarting(true);
                        setStartCallError("");
                        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Microphone recording is not supported in this browser. Try a recent Chrome or Edge browser over HTTPS or localhost.");
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        startCallMediaStreamRef.current = stream;
                        const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
                        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
                        startCallRecordingChunksRef.current = [];
                        recorder.ondataavailable = (event) => { if (event.data.size > 0) startCallRecordingChunksRef.current.push(event.data); };
                        recorder.onstop = () => {
                          const blob = new Blob(startCallRecordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                          if (blob.size > 25 * 1024 * 1024) {
                            setStartCallError("This recording exceeds 25 MB. Please make a shorter recording or upload a compressed file.");
                            setStartCallAudioFile(null);
                          } else if (blob.size > 0) {
                            const ext = (recorder.mimeType || "").includes("mp4") ? "mp4" : (recorder.mimeType || "").includes("ogg") ? "ogg" : "webm";
                            setStartCallAudioFile(new File([blob], `browser-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`, { type: blob.type }));
                          } else setStartCallError("No audio was captured. Please try recording again.");
                          stream.getTracks().forEach((track) => track.stop());
                          startCallMediaStreamRef.current = null;
                          setStartCallRecording(false);
                          startCallRecordingActiveRef.current = false;
                          stopStartCallSpeechRecognition();
                        };
                        startCallMediaRecorderRef.current = recorder;
                        recorder.start(1000);
                        setStartCallRecording(true);
                        startCallRecordingActiveRef.current = true;
                        setStartCallRecordingSeconds(0);
                        startStartCallSpeechRecognition();
                      } catch (err) {
                        setStartCallError(err instanceof Error ? err.message : "Unable to access the microphone.");
                        startCallMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
                        startCallMediaStreamRef.current = null;
                        setStartCallRecording(false);
                      } finally { setStartCallRecordingStarting(false); }
                    }} className="rounded-md bg-[#243b70] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{startCallRecordingStarting ? "Requesting microphone…" : "🎙 Start recording"}</button>
                  ) : (
                    <button type="button" onClick={() => startCallMediaRecorderRef.current?.state !== "inactive" && startCallMediaRecorderRef.current?.stop()} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white">■ Stop recording</button>
                  )}
                  {startCallRecording && <span className="text-sm font-semibold tabular-nums text-red-700">● REC {Math.floor(startCallRecordingSeconds / 60).toString().padStart(2, "0")}:{(startCallRecordingSeconds % 60).toString().padStart(2, "0")}</span>}
                </div>
                <div className="rounded-lg border border-indigo-200 bg-white shadow-sm" aria-live="polite">
                  <div className="flex items-center justify-between gap-2 rounded-t-lg border-b border-indigo-100 bg-indigo-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-lg">✦</span>
                      <p className="text-sm font-bold text-indigo-950">Live Call Coach</p>
                    </div>
                    <span className={`text-xs font-semibold ${startCallRecording ? "text-red-700" : "text-gray-500"}`}>{startCallRecording ? "LIVE" : "READY"}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-xs text-gray-500">{startCallLiveStatus}</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600">Label the speaker</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setStartCallSpeaker("CALLER")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${startCallSpeaker === "CALLER" ? "bg-indigo-700 text-white" : "border border-gray-300 bg-white text-gray-700"}`}>You · Caller</button>
                        <button type="button" onClick={() => setStartCallSpeaker("PROSPECT")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${startCallSpeaker === "PROSPECT" ? "bg-emerald-700 text-white" : "border border-gray-300 bg-white text-gray-700"}`}>Prospect</button>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-4 text-gray-500">Choose who is speaking before they talk. Browser speech recognition cannot reliably identify speakers automatically.</p>
                    </div>
                    {(startCallLiveTranscript || startCallInterimTranscript) ? (
                      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-white p-1" aria-live="polite">
                        <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Live conversation</p>
                        {startCallLiveTranscript.split("\n").filter(Boolean).map((line, index) => {
                          const isCaller = line.startsWith("CALLER:");
                          const text = line.replace(/^(CALLER|PROSPECT):\s*/, "");
                          return <div key={`${index}-${line.slice(0, 20)}`} className={`rounded-lg p-2 text-sm leading-5 ${isCaller ? "ml-4 bg-indigo-50 text-indigo-950" : "mr-4 bg-emerald-50 text-emerald-950"}`}><p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{isCaller ? "You · Caller" : "Prospect"}</p>{text}</div>;
                        })}
                        {startCallInterimTranscript && <div className={`rounded-lg p-2 text-sm italic leading-5 ${startCallSpeaker === "CALLER" ? "ml-4 bg-indigo-50/70 text-indigo-900" : "mr-4 bg-emerald-50/70 text-emerald-900"}`}><p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{startCallSpeaker === "CALLER" ? "You · Caller (speaking)" : "Prospect (speaking)"}</p>{startCallInterimTranscript}</div>}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Your next-sentence suggestion will appear here after you begin speaking.</p>
                    )}
                    {startCallSuggestionLoading && <p className="text-sm font-medium text-indigo-700">Thinking of a helpful next response…</p>}
                    {startCallLiveSuggestion && (
                      <div className="rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">Try saying</p>
                        <p className="text-base font-semibold leading-6 text-gray-900">{startCallLiveSuggestion.suggestion || "Keep listening and continue the conversation naturally."}</p>
                        {startCallLiveSuggestion.reason && <p className="mt-2 text-xs leading-5 text-gray-600"><strong>Why:</strong> {startCallLiveSuggestion.reason}</p>}
                      </div>
                    )}
                    {startCallLiveError && <p className="rounded-md bg-red-50 p-2 text-xs leading-5 text-red-700">{startCallLiveError}</p>}
                    {!startCallForm.purpose_id && !startCallForm.one_time_purpose.trim() && <p className="text-xs text-amber-700">Choose a saved purpose or enter a one-time purpose to enable suggestions.</p>}
                  </div>
                </div>
                {startCallAudioFile && startCallForm.input_method === "browser_recording" && (
                  <div className="space-y-2 rounded-md border border-blue-100 bg-white p-3">
                    <p className="break-all text-xs text-gray-700"><strong>Recording ready:</strong> {startCallAudioFile.name} · {(startCallAudioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    <audio controls src={URL.createObjectURL(startCallAudioFile)} className="w-full" />
                    <button type="button" onClick={() => setStartCallAudioFile(null)} className="text-xs font-semibold text-red-700 underline">Discard and record again</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { startCallRecordingActiveRef.current = false; stopStartCallSpeechRecognition(); if (startCallMediaRecorderRef.current?.state === "recording") startCallMediaRecorderRef.current.stop(); startCallMediaStreamRef.current?.getTracks().forEach((track) => track.stop()); setStartCallRecording(false); setStartCallOpen(false); }}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              startingCall ||
              startCallRecording ||
              startCallRecordingStarting ||
              !prospects.length ||
              checkingPreviousCalls ||
              Boolean(previousCallsError)
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startingCall ? "Creating..." : "Create Call"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </main>
  );
}
