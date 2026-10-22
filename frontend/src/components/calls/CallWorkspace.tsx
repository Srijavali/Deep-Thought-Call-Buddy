
// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { API_URL } from "@/lib/api";

// type SpeechRecognitionAlternativeLike = {
//   transcript: string;
// };

// type SpeechRecognitionResultLike = {
//   isFinal: boolean;
//   [index: number]: SpeechRecognitionAlternativeLike;
// };

// type SpeechRecognitionEventLike = {
//   resultIndex: number;
//   results: ArrayLike<SpeechRecognitionResultLike>;
// };

// type SpeechRecognitionLike = {
//   continuous: boolean;
//   interimResults: boolean;
//   lang: string;
//   onresult: ((event: SpeechRecognitionEventLike) => void) | null;
//   onerror: ((event: { error: string }) => void) | null;
//   onend: (() => void) | null;
//   start: () => void;
//   stop: () => void;
//   abort: () => void;
// };

// type SpeechRecognitionWindow = Window & {
//   SpeechRecognition?: new () => SpeechRecognitionLike;
//   webkitSpeechRecognition?: new () => SpeechRecognitionLike;
// };

// type StageStatus =
//   | "complete"
//   | "incomplete"
//   | "needs_clarification"
//   | "not_assessable";

// type Draft = {
//   stage_number: number;
//   status: StageStatus;
//   outcome_key: string | null;
//   prospect_words: string;
//   caller_notes: string;
// };

// type CallMode = "guided_live" | "audio_upload" | "manual_notes";

// type CallStatus = "in_progress" | "completed" | "abandoned";

// type FullStageAnalysis = {
//   stage_number: number;
//   status: StageStatus;
//   outcome_key: string;
//   prospect_words: string;
//   caller_notes: string;
//   evidence: string[];
//   missing_information: string[];
//   uncertainty: string;
// };

// type FullCallAnalysis = {
//   call_id: string;
//   prospect_id: string;
//   transcript: string;
//   overall_summary: string;
//   history_assessment: string;
//   stages: FullStageAnalysis[];
// };

// type AIAnalysis = {
//   stage_number: number;
//   suggested_outcome: StageStatus;
//   prospect_words: string;
//   caller_notes: string;
//   evidence: string[];
//   missing_information: string[];
//   uncertainty: string;
// };

// type SavedStage = {
//   stage_number: number;
//   status?: StageStatus;
//   outcome_key?: string | null;
//   prospect_words?: string | null;
//   caller_notes?: string | null;
//   extracted_content?: Record<string, unknown> | null;
//   extracted_information?: Record<string, unknown> | null;
// };

// type Props = {
//   callId: string;
//   prospectId: string;
//   callMode: CallMode;
//   initialAudioFile?: File | null;
//   onInitialAudioFileConsumed?: () => void;
//   callStatus: CallStatus;
//   purpose?: string;
//   onSaveStage: (result: Draft) => Promise<void>;
//   onEndCall: () => Promise<void>;
// };

// const STAGES = [
//   {
//     title: "Opening",
//     prompt: "How did the opening of the call go?",
//     options: [
//       ["intended_person_confirmed", "Reached the intended person", "The person's identity was confirmed."],
//       ["gatekeeper_or_identity_clarification", "Gatekeeper or identity clarification", "Someone else answered or identity needs clarification."],
//       ["busy_or_callback", "Busy or asked for a callback", "They were unavailable or requested another time."],
//       ["wrong_person_or_outdated_contact", "Wrong person or outdated contact", "The contact is incorrect or no longer relevant."],
//       ["connection_problem_or_disconnection", "Connection problem or disconnection", "A technical issue prevented the conversation."],
//       ["other_or_unclear", "Other / unclear", "The outcome does not fit another option or is uncertain."],
//     ],
//   },
//   {
//     title: "Purpose",
//     prompt: "How did the prospect respond to your purpose?",
//     options: [
//       ["purpose_understood", "Understood the purpose", "They understood why you were reaching out."],
//       ["purpose_question", "Asked for clarification", "They asked what the call was about."],
//       ["purpose_rejected", "Did not see relevance", "They did not see why the conversation was relevant."],
//       ["purpose_not_discussed", "Purpose not discussed", "The conversation did not reach this point."],
//       ["other_or_unclear", "Other / unclear", "The response is uncertain or different."],
//     ],
//   },
//   {
//     title: "Permission",
//     prompt: "Did the prospect give permission to continue?",
//     options: [
//       ["permission_yes", "Agreed to continue", "They were willing to continue the conversation."],
//       ["permission_later", "Asked to speak later", "They suggested a different time."],
//       ["permission_no", "Declined to continue", "They did not want to continue."],
//       ["permission_not_asked", "Permission not established", "Permission was not clearly asked or answered."],
//       ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
//     ],
//   },
//   {
//     title: "Their business",
//     prompt: "What did you learn about their business?",
//     options: [
//       ["business_context_shared", "Shared business context", "They described their business, role, or situation."],
//       ["business_details_partial", "Some details shared", "Only limited business context was shared."],
//       ["business_not_discussed", "Not discussed", "The call did not reach this point."],
//       ["other_or_unclear", "Other / unclear", "The information is uncertain or different."],
//     ],
//   },
//   {
//     title: "Their need in their words",
//     prompt: "What did the prospect say about their needs?",
//     options: [
//       ["need_explicit", "Clearly described a need", "They explicitly described a problem, goal, or need."],
//       ["need_possible", "Possible need, not confirmed", "A potential need came up but was not confirmed."],
//       ["no_need_stated", "No need stated", "They did not describe a need."],
//       ["other_or_unclear", "Other / unclear", "The need is uncertain or different."],
//     ],
//   },
//   {
//     title: "Objection",
//     prompt: "What happened when concerns or objections came up?",
//     options: [
//       ["objection_resolved", "Concern addressed", "The concern appeared resolved."],
//       ["objection_unresolved", "Concern remains", "The concern was not resolved."],
//       ["no_objection", "No objection raised", "No clear objection came up."],
//       ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
//     ],
//   },
//   {
//     title: "Next step",
//     prompt: "Was a next step agreed?",
//     options: [
//       ["meeting_agreed", "Meeting agreed", "A meeting or demo was agreed."],
//       ["follow_up_agreed", "Follow-up agreed", "A follow-up time or action was agreed."],
//       ["information_requested", "Information requested", "They asked for information to be sent."],
//       ["no_next_step", "No next step agreed", "No concrete next step was agreed."],
//       ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
//     ],
//   },
//   {
//     title: "Close",
//     prompt: "How did the conversation end?",
//     options: [
//       ["positive_close", "Positive close", "The conversation ended constructively."],
//       ["callback_close", "Closed with callback plan", "The conversation ended with a callback plan."],
//       ["declined_close", "Prospect declined", "The prospect declined further engagement."],
//       ["ending_unclear", "Ending unclear", "The final outcome is uncertain."],
//     ],
//   },
// ] as const;

// function isStageStatus(value: unknown): value is StageStatus {
//   return (
//     value === "complete" ||
//     value === "incomplete" ||
//     value === "needs_clarification" ||
//     value === "not_assessable"
//   );
// }

// function getText(
//   primary: unknown,
//   fallback: unknown
// ): string {
//   if (typeof primary === "string") return primary;
//   if (typeof fallback === "string") return fallback;
//   return "";
// }

// function getObject(value: unknown): Record<string, unknown> {
//   if (value && typeof value === "object" && !Array.isArray(value)) {
//     return value as Record<string, unknown>;
//   }
//   return {};
// }

// export default function CallWorkspace({
//   callId,
//   prospectId,
//   callMode,
//   initialAudioFile = null,
//   onInitialAudioFileConsumed,
//   callStatus,
//   purpose = "",
//   onSaveStage,
//   onEndCall,
// }: Props) {
//   const [expanded, setExpanded] = useState<number | null>(1);
//   const [drafts, setDrafts] = useState<Record<number, Draft>>({});
//   const [saving, setSaving] = useState<number | null>(null);
//   const [ending, setEnding] = useState(false);
//   const [loadingStages, setLoadingStages] = useState(true);
//   const [error, setError] = useState("");
//   const [notice, setNotice] = useState("");
//   const [transcript, setTranscript] = useState("");
//   const [analyzing, setAnalyzing] = useState(false);
//   const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
//   const [audioFile, setAudioFile] = useState<File | null>(null);

//   useEffect(() => {
//     if (initialAudioFile) {
//       if (callMode === "guided_live") {
//         setRecordingFile(initialAudioFile);
//         setRecordingUrl((previousUrl) => {
//           if (previousUrl) URL.revokeObjectURL(previousUrl);
//           return URL.createObjectURL(initialAudioFile);
//         });
//       } else {
//         setAudioFile(initialAudioFile);
//       }
//       onInitialAudioFileConsumed?.();
//     }
//   }, [initialAudioFile, callMode, onInitialAudioFileConsumed]);
//   const [recordingConsent, setRecordingConsent] = useState(false);
//   const [recordingStarting, setRecordingStarting] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingSeconds, setRecordingSeconds] = useState(0);
//   const [recordingFile, setRecordingFile] = useState<File | null>(null);
//   const [recordingUrl, setRecordingUrl] = useState("");
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const mediaStreamRef = useRef<MediaStream | null>(null);
//   const recordingChunksRef = useRef<Blob[]>([]);
//   const audioFileInputRef = useRef<HTMLInputElement | null>(null);
//   const [fullAnalysis, setFullAnalysis] = useState<FullCallAnalysis | null>(null);
//   const [fullAnalyzing, setFullAnalyzing] = useState(false);
//   const [savingAll, setSavingAll] = useState(false);
//   const [historyAnalyzing, setHistoryAnalyzing] = useState(false);
//   const [historySummary, setHistorySummary] = useState<{ summary: string; call_count: number; key_points: string[]; recommended_next_steps: string[] } | null>(null);
//   const [loadingLiveSuggestion, setLoadingLiveSuggestion] = useState(false);
//   const [liveSuggestion, setLiveSuggestion] = useState<{ suggestion: string; reason: string } | null>(null);
//   const [liveTranscriptPreview, setLiveTranscriptPreview] = useState("");
//   const [liveTranscriptionStatus, setLiveTranscriptionStatus] = useState("Not started");

//   const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
//   const finalTranscriptRef = useRef("");
//   const latestTranscriptRef = useRef("");
//   const suggestionTimerRef = useRef<number | null>(null);
//   const recognitionRestartTimerRef = useRef<number | null>(null);
//   const suggestionRequestRef = useRef(0);
//   const manuallyStoppedRecognitionRef = useRef(false);

//   const isReadOnly = false;

//   useEffect(() => {
//     let cancelled = false;

//     async function loadStages() {
//       setLoadingStages(true);
//       setError("");
//       setNotice("");
//       setDrafts({});

//       try {
//         const response = await fetch(
//           `${API_URL}/calls/${encodeURIComponent(callId)}/stages`,
//           {
//             method: "GET",
//             headers: {
//               Accept: "application/json",
//             },
//             credentials: "include",
//           }
//         );

//         if (!response.ok) {
//           const message = await response.text();
//           throw new Error(
//             message || `Unable to load saved stages (${response.status}).`
//           );
//         }

//         const data = await response.json();
//         const items: SavedStage[] = Array.isArray(data.stages)
//             ? data.stages
//             : Array.isArray(data.items)
//                 ? data.items
//                 : [];

//         const loaded: Record<number, Draft> = {};

//         for (const item of items) {
//           const stageNumber = Number(item.stage_number);

//           if (
//             !Number.isInteger(stageNumber) ||
//             stageNumber < 1 ||
//             stageNumber > 8
//           ) {
//             continue;
//           }

//           const extractedContent = getObject(item.extracted_content);
//           const extractedInformation = getObject(
//             item.extracted_information
//           );

//           const savedStatus = isStageStatus(item.status)
//             ? item.status
//             : "incomplete";

//           loaded[stageNumber] = {
//             stage_number: stageNumber,
//             status: savedStatus,
//             outcome_key:
//                 typeof item.outcome_key === "string"
//                     ? item.outcome_key
//                     : typeof extractedContent.outcome_key === "string"
//                     ? extractedContent.outcome_key
//                     : null,
//             prospect_words: getText(
//               item.prospect_words,
//               extractedInformation.prospect_words ??
//                 extractedContent.prospect_words
//             ),
//             caller_notes: getText(
//               item.caller_notes,
//               extractedInformation.caller_notes ??
//                 extractedContent.caller_notes
//             ),
//           };
//         }

//         if (!cancelled) {
//           setDrafts(loaded);
//         }
//       } catch (err) {
//         if (!cancelled) {
//           setError(
//             err instanceof Error
//               ? err.message
//               : "Unable to load saved stage responses."
//           );
//         }
//       } finally {
//         if (!cancelled) {
//           setLoadingStages(false);
//         }
//       }
//     }

//     void loadStages();

//     return () => {
//       cancelled = true;
//     };
//   }, [callId]);

//   const completed = useMemo(
//     () =>
//       Object.values(drafts).filter(
//         (draft) => draft.status === "complete"
//       ).length,
//     [drafts]
//   );

//   function update(n: number, patch: Partial<Draft>) {
//     if (isReadOnly || loadingStages) return;

//     setDrafts((old) => {
//       const current: Draft = old[n] ?? {
//         stage_number: n,
//         status: "incomplete",
//         outcome_key: null,
//         prospect_words: "",
//         caller_notes: "",
//       };

//       return {
//         ...old,
//         [n]: {
//           ...current,
//           ...patch,
//           stage_number: n,
//           ...(patch.outcome_key !== undefined
//             ? { status: "incomplete" as const }
//             : {}),
//         },
//       };
//     });

//     setNotice("");
//     setError("");
//   }

//   async function save(n: number, markComplete: boolean) {
//     if (isReadOnly || loadingStages) return;

//     const current = drafts[n];

//     if (!current?.outcome_key) {
//       setError(`Choose an outcome for Stage ${n} before saving.`);
//       setNotice("");
//       setExpanded(n);
//       return;
//     }

//     const payload: Draft = {
//       ...current,
//       stage_number: n,
//       status: markComplete ? "complete" : "incomplete",
//     };

//     setSaving(n);
//     setError("");
//     setNotice("");

//     try {
//       await onSaveStage(payload);

//       setDrafts((old) => ({
//         ...old,
//         [n]: payload,
//       }));

//       setNotice(
//         markComplete
//           ? `Stage ${n} marked complete.`
//           : `Stage ${n} progress saved.`
//       );

//       if (markComplete && n < 8) {
//         setExpanded(n + 1);
//       }
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err.message
//           : `Unable to save Stage ${n}.`
//       );
//     } finally {
//       setSaving(null);
//     }
//   }

//   function applyFullAnalysis(result: FullCallAnalysis) {
//     const nextDrafts: Record<number, Draft> = {};
//     for (const stage of result.stages) {
//       nextDrafts[stage.stage_number] = {
//         stage_number: stage.stage_number,
//         status: stage.status,
//         outcome_key: stage.outcome_key,
//         prospect_words: stage.prospect_words,
//         caller_notes: stage.caller_notes,
//       };
//     }
//     // Keep results as editable local drafts; caller explicitly saves them below.
//     setDrafts((current) => ({ ...current, ...nextDrafts }));
//     setTranscript(result.transcript);
//     setFullAnalysis(result);
//     setAiAnalysis(null);
//     setExpanded(1);
//   }

//   const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
//   const ACCEPTED_AUDIO_EXTENSIONS = new Set([
//     "mp3", "wav", "m4a", "mp4", "ogg", "webm", "mpeg",
//   ]);
//   const ACCEPTED_AUDIO_TYPES = new Set([
//     "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4",
//     "audio/x-m4a", "audio/m4a", "audio/webm", "audio/ogg", "video/webm",
//     "application/octet-stream",
//   ]);

//   function validateAudioFile(file: File): string | null {
//     const extension = file.name.includes(".")
//       ? file.name.split(".").pop()?.toLowerCase() ?? ""
//       : "";
//     if (!ACCEPTED_AUDIO_EXTENSIONS.has(extension) &&
//         !ACCEPTED_AUDIO_TYPES.has(file.type.split(";")[0].toLowerCase())) {
//       return "Unsupported file type. Choose MP3, WAV, M4A, MP4, OGG, or WebM.";
//     }
//     if (file.size > MAX_AUDIO_BYTES) {
//       return "This file exceeds the 25 MB limit. Compress or split the recording and try again.";
//     }
//     if (file.size === 0) {
//       return "The selected file is empty. Choose another recording.";
//     }
//     return null;
//   }

//   function clearLiveTimers() {
//     if (suggestionTimerRef.current !== null) {
//       window.clearTimeout(suggestionTimerRef.current);
//       suggestionTimerRef.current = null;
//     }
//     if (recognitionRestartTimerRef.current !== null) {
//       window.clearTimeout(recognitionRestartTimerRef.current);
//       recognitionRestartTimerRef.current = null;
//     }
//   }

//   function stopLiveSpeechRecognition() {
//     manuallyStoppedRecognitionRef.current = true;
//     clearLiveTimers();

//     const recognition = speechRecognitionRef.current;
//     speechRecognitionRef.current = null;

//     if (recognition) {
//       recognition.onresult = null;
//       recognition.onerror = null;
//       recognition.onend = null;
//       try {
//         recognition.stop();
//       } catch {
//         // Recognition may already have stopped.
//       }
//     }

//     setLiveTranscriptPreview("");
//   }

//   function scheduleLiveSuggestion(fullTranscript: string) {
//     if (callMode !== "guided_live" || !fullTranscript.trim() || !purpose.trim()) {
//       return;
//     }

//     if (suggestionTimerRef.current !== null) {
//       window.clearTimeout(suggestionTimerRef.current);
//     }

//     // Debounce speech so the API is not called for every short phrase.
//     suggestionTimerRef.current = window.setTimeout(() => {
//       suggestionTimerRef.current = null;
//       if (mediaRecorderRef.current?.state !== "recording") return;
//       void getLiveSuggestion(fullTranscript);
//     }, 1800);
//   }

//   function startLiveSpeechRecognition() {
//     const speechWindow = window as SpeechRecognitionWindow;
//     const Recognition =
//       speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

//     if (!Recognition) {
//       setLiveTranscriptionStatus(
//         "Live transcription is not supported in this browser. You can still record and submit the audio for transcription."
//       );
//       return;
//     }

//     manuallyStoppedRecognitionRef.current = false;

//     const createRecognition = (): SpeechRecognitionLike => {
//       const recognition = new Recognition();
//       recognition.continuous = true;
//       recognition.interimResults = true;
//       recognition.lang = "en-IN";

//       recognition.onresult = (event) => {
//         let newFinalText = "";
//         let interimText = "";

//         // Only consume newly changed results. Previously finalized results
//         // are already stored in finalTranscriptRef across recognition restarts.
//         for (let i = event.resultIndex; i < event.results.length; i += 1) {
//           const result = event.results[i];
//           const phrase = result[0]?.transcript?.trim();
//           if (!phrase) continue;
//           if (result.isFinal) newFinalText += `${phrase} `;
//           else interimText += `${phrase} `;
//         }

//         if (newFinalText.trim()) {
//           finalTranscriptRef.current = [
//             finalTranscriptRef.current.trim(),
//             newFinalText.trim(),
//           ].filter(Boolean).join(" ").slice(-20000);
//         }

//         const combined = [
//           finalTranscriptRef.current.trim(),
//           interimText.trim(),
//         ].filter(Boolean).join(" ").slice(-20000);

//         latestTranscriptRef.current = combined;
//         setTranscript(combined);
//         setLiveTranscriptPreview(interimText.trim());
//         setLiveTranscriptionStatus("Listening for speech...");

//         if (newFinalText.trim()) {
//           scheduleLiveSuggestion(finalTranscriptRef.current);
//         }
//       };

//       recognition.onerror = (event) => {
//         // A temporary no-speech event is common during pauses. The onend
//         // handler below restarts recognition while the audio recorder runs.
//         if (event.error === "no-speech" || event.error === "aborted") return;

//         setLiveTranscriptionStatus(`Transcription issue: ${event.error}`);

//         // Do not restart endlessly when permission or the speech service fails.
//         if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported", "network"].includes(event.error)) {
//           manuallyStoppedRecognitionRef.current = true;
//           if (recognitionRestartTimerRef.current !== null) {
//             window.clearTimeout(recognitionRestartTimerRef.current);
//             recognitionRestartTimerRef.current = null;
//           }
//         }
//       };

//       recognition.onend = () => {
//         if (
//           manuallyStoppedRecognitionRef.current ||
//           mediaRecorderRef.current?.state !== "recording"
//         ) {
//           return;
//         }

//         setLiveTranscriptionStatus("Reconnecting speech recognition...");
//         recognitionRestartTimerRef.current = window.setTimeout(() => {
//           recognitionRestartTimerRef.current = null;
//           if (
//             manuallyStoppedRecognitionRef.current ||
//             mediaRecorderRef.current?.state !== "recording"
//           ) return;

//           try {
//             const nextRecognition = createRecognition();
//             speechRecognitionRef.current = nextRecognition;
//             nextRecognition.start();
//           } catch {
//             setLiveTranscriptionStatus(
//               "Could not restart live transcription. Recording continues; submit the audio to transcribe it later."
//             );
//           }
//         }, 300);
//       };

//       return recognition;
//     };

//     finalTranscriptRef.current = "";
//     latestTranscriptRef.current = "";
//     setLiveTranscriptPreview("");
//     setLiveTranscriptionStatus("Starting live transcription...");

//     try {
//       const recognition = createRecognition();
//       speechRecognitionRef.current = recognition;
//       recognition.start();
//     } catch {
//       setLiveTranscriptionStatus(
//         "Unable to start live transcription. Recording continues; submit the audio to transcribe it later."
//       );
//     }
//   }

//   function releaseMicrophone() {
//     mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
//     mediaStreamRef.current = null;
//   }

//   function discardRecording() {
//     stopLiveSpeechRecognition();
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//       mediaRecorderRef.current.onstop = null;
//       try {
//         mediaRecorderRef.current.stop();
//       } catch {
//         // The recorder may already have stopped.
//       }
//     }
//     mediaRecorderRef.current = null;
//     releaseMicrophone();
//     recordingChunksRef.current = [];
//     setIsRecording(false);
//     setRecordingStarting(false);
//     setRecordingSeconds(0);
//     setRecordingFile(null);
//     setRecordingConsent(false);
//     setError("");
//     setNotice("");
//     setRecordingUrl((currentUrl) => {
//       if (currentUrl) URL.revokeObjectURL(currentUrl);
//       return "";
//     });
//   }

//   async function startRecording() {
//     setError("");
//     setNotice("");
//     if (!recordingConsent) {
//       setError("Please confirm that you have consent to record before starting.");
//       return;
//     }
//     if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
//       setError("This browser does not support microphone recording. Try a current version of Chrome, Edge, or Firefox.");
//       return;
//     }

//     setRecordingStarting(true);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaStreamRef.current = stream;

//       const supportedTypes = [
//         "audio/webm;codecs=opus",
//         "audio/webm",
//         "audio/ogg;codecs=opus",
//         "audio/ogg",
//         "audio/mp4",
//       ];
//       const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
//       const recorder = mimeType
//         ? new MediaRecorder(stream, { mimeType })
//         : new MediaRecorder(stream);
//       recordingChunksRef.current = [];
//       recorder.ondataavailable = (event: BlobEvent) => {
//         if (event.data.size > 0) recordingChunksRef.current.push(event.data);
//       };
//       recorder.onerror = () => {
//         stopLiveSpeechRecognition();
//         setError("The browser encountered an error while recording. Please try again.");
//         releaseMicrophone();
//         setIsRecording(false);
//         setRecordingStarting(false);
//       };
//       recorder.onstop = () => {
//         releaseMicrophone();
//         const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
//         const blob = new Blob(recordingChunksRef.current, { type: actualMimeType });
//         recordingChunksRef.current = [];
//         if (!blob.size) {
//           setError("The recording was empty. Please record again.");
//           setIsRecording(false);
//           setRecordingStarting(false);
//           return;
//         }
//         const extension = actualMimeType.includes("ogg")
//           ? "ogg"
//           : actualMimeType.includes("mp4")
//             ? "mp4"
//             : "webm";
//         const file = new File([blob], `browser-recording-${Date.now()}.${extension}`, {
//           type: actualMimeType,
//         });
//         const validationError = validateAudioFile(file);
//         if (validationError) {
//           setError(validationError);
//           setRecordingFile(null);
//         } else {
//           setRecordingFile(file);
//           setRecordingUrl((currentUrl) => {
//             if (currentUrl) URL.revokeObjectURL(currentUrl);
//             return URL.createObjectURL(blob);
//           });
//           setNotice("Recording ready. Play it back and submit it when you are ready.");
//         }
//         setIsRecording(false);
//         setRecordingStarting(false);
//       };

//       mediaRecorderRef.current = recorder;
//       recorder.start();
//       setRecordingSeconds(0);
//       setIsRecording(true);
//       setRecordingStarting(false);
//       setLiveSuggestion(null);
//       setTranscript("");
//       finalTranscriptRef.current = "";
//       latestTranscriptRef.current = "";
//       setNotice("Recording started. Live transcription is starting.");
//       startLiveSpeechRecognition();
//     } catch (err) {
//       releaseMicrophone();
//       setRecordingStarting(false);
//       const name = err instanceof DOMException ? err.name : "";
//       if (name === "NotAllowedError" || name === "SecurityError") {
//         setError("Microphone access was denied. Allow microphone access in your browser settings and try again.");
//       } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
//         setError("No microphone was found. Connect or enable a microphone and try again.");
//       } else {
//         setError(err instanceof Error ? err.message : "Unable to start microphone recording.");
//       }
//     }
//   }

//   function stopRecording() {
//     stopLiveSpeechRecognition();
//     const recorder = mediaRecorderRef.current;
//     if (recorder && recorder.state !== "inactive") {
//       recorder.stop();
//     } else {
//       releaseMicrophone();
//       setIsRecording(false);
//       setRecordingStarting(false);
//     }
//   }

//   useEffect(() => {
//     if (!isRecording) return;
//     const timer = window.setInterval(() => {
//       setRecordingSeconds((seconds) => seconds + 1);
//     }, 1000);
//     return () => window.clearInterval(timer);
//   }, [isRecording]);

//   useEffect(() => {
//     return () => {
//       clearLiveTimers();
//       manuallyStoppedRecognitionRef.current = true;
//       const recognition = speechRecognitionRef.current;
//       speechRecognitionRef.current = null;
//       if (recognition) {
//         recognition.onresult = null;
//         recognition.onerror = null;
//         recognition.onend = null;
//         try { recognition.abort(); } catch { /* Already stopped. */ }
//       }
//       const recorder = mediaRecorderRef.current;
//       if (recorder && recorder.state !== "inactive") {
//         try {
//           recorder.stop();
//         } catch {
//           // Ignore shutdown errors during unmount.
//         }
//       }
//       mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
//       if (recordingUrl) URL.revokeObjectURL(recordingUrl);
//     };
//   }, [recordingUrl]);

//   async function analyzeProspectHistory() {
//     setHistoryAnalyzing(true);
//     setError("");
//     setNotice("");
//     try {
//       const response = await fetch(`${API_URL}/ai/prospect-history/${encodeURIComponent(prospectId)}`, {
//         method: "GET",
//         headers: { Accept: "application/json" },
//         credentials: "include",
//       });
//       const data = await response.json().catch(() => null);
//       if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `Prospect history analysis failed (${response.status}).`);
//       setHistorySummary(data);
//       setNotice("Prospect history analysed using saved database records.");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Unable to analyse saved prospect history.");
//     } finally {
//       setHistoryAnalyzing(false);
//     }
//   }

//   async function persistAnalyzedStages(result: FullCallAnalysis) {
//     // Persist all eight AI-generated stage drafts immediately. Their status remains
//     // evidence-based; callers can edit each stage and save corrections afterward.
//     for (const stage of result.stages) {
//       await onSaveStage({
//         stage_number: stage.stage_number,
//         status: stage.status,
//         outcome_key: stage.outcome_key || null,
//         prospect_words: stage.prospect_words || "",
//         caller_notes: stage.caller_notes || "",
//       });
//     }
//   }

//   async function analyzeEntireCall() {
//     if (!transcript.trim()) {
//       setError("Add or paste the call transcript first.");
//       return;
//     }
//     setFullAnalyzing(true);
//     setError("");
//     setNotice("");
//     try {
//       const response = await fetch(`${API_URL}/ai/analyze-full-call`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Accept: "application/json" },
//         credentials: "include",
//         body: JSON.stringify({
//           call_id: callId,
//           prospect_id: prospectId,
//           transcript: transcript.trim(),
//           source_type: callMode === "audio_upload" ? "audio_upload" : callMode === "guided_live" ? "live_recording" : "manual_notes",
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Full-call analysis failed (${response.status}).`);
//       applyFullAnalysis(data as FullCallAnalysis);
//       setNotice("AI analysed all eight stages. Review and edit the drafts, then save the stages you want to keep.");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Unable to analyse the entire call.");
//     } finally {
//       setFullAnalyzing(false);
//     }
//   }

//   async function uploadAndAnalyzeAudio(fileToUpload: File | null = audioFile) {
//     if (!fileToUpload) {
//       setError("Choose an audio file first.");
//       return;
//     }
//     const validationError = validateAudioFile(fileToUpload);
//     if (validationError) {
//       setError(validationError);
//       return;
//     }
//     if (fullAnalyzing || loadingStages) return;

//     setFullAnalyzing(true);
//     setError("");
//     setNotice("Uploading audio. Transcription and AI analysis may take a little while...");
//     try {
//       const form = new FormData();
//       form.append("call_id", callId);
//       form.append("prospect_id", prospectId);
//       form.append("file", fileToUpload, fileToUpload.name);
//       form.append("source_type", callMode === "guided_live" ? "live_recording" : "audio_upload");
//       const response = await fetch(`${API_URL}/ai/upload-audio`, {
//         method: "POST",
//         credentials: "include",
//         body: form,
//       });
//       const data = await response.json().catch(() => null);
//       if (!response.ok) {
//         throw new Error(
//           typeof data?.detail === "string"
//             ? data.detail
//             : `Audio upload failed (${response.status}). The server returned an invalid response.`
//         );
//       }
//       if (!data || typeof data.transcript !== "string" || !Array.isArray(data.stages) || data.stages.length !== 8) {
//         throw new Error("The server response was incomplete. Expected a transcript and analysis for all eight stages.");
//       }
//       const result = data as FullCallAnalysis;
//       applyFullAnalysis(result);
//       setNotice("Audio transcribed and analysed. Saving all eight stage results to the database...");
//       await persistAnalyzedStages(result);
//       setAudioFile(null);
//       if (audioFileInputRef.current) audioFileInputRef.current.value = "";
//       setNotice("Audio transcribed, all eight stages analysed, and stage results saved. You can edit any stage and save your corrections.");
//       if (callMode === "guided_live") {
//         setRecordingFile(null);
//         setRecordingUrl((currentUrl) => {
//           if (currentUrl) URL.revokeObjectURL(currentUrl);
//           return "";
//         });
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Unable to upload and analyse the audio.");
//       setNotice("");
//     } finally {
//       setFullAnalyzing(false);
//     }
//   }

//   async function saveAllAnalyzedStages() {
//     if (!fullAnalysis) return;
//     setSavingAll(true);
//     setError("");
//     setNotice("");
//     try {
//       // Save each AI-created draft using the existing page-level persistence handler.
//       for (const stage of fullAnalysis.stages) {
//         const draft = drafts[stage.stage_number];
//         if (!draft?.outcome_key) continue;
//         await onSaveStage({ ...draft, status: draft.status });
//       }
//       setNotice("All analysed stage drafts were saved. You can continue editing individual stages and save changes at any time.");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Some stage results could not be saved. Check the saved stages and retry.");
//     } finally {
//       setSavingAll(false);
//     }
//   }

//   async function analyzeTranscript() {
//     const stageNumber = expanded ?? 1;

//     if (!transcript.trim()) {
//       setError("Paste a call transcript before running AI analysis.");
//       setNotice("");
//       return;
//     }

//     setAnalyzing(true);
//     setError("");
//     setNotice("");
//     setAiAnalysis(null);

//     try {
//       const response = await fetch(`${API_URL}/ai/analyze-call`, {
//         method: "POST",
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify({
//           transcript: transcript.trim(),
//           current_stage: stageNumber,
//         }),
//       });

//       if (!response.ok) {
//         let message = `AI analysis failed (${response.status}).`;
//         try {
//           const data = await response.json();
//           if (typeof data.detail === "string") message = data.detail;
//         } catch {
//           // Keep the fallback error message if the response isn't JSON.
//         }
//         throw new Error(message);
//       }

//       const result = (await response.json()) as AIAnalysis;
//       setAiAnalysis(result);
//       setNotice(`AI analysis is ready for Stage ${stageNumber}. Review it before applying anything.`);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Unable to analyze this transcript.");
//     } finally {
//       setAnalyzing(false);
//     }
//   }

//   function applyAIAnalysis() {
//     if (!aiAnalysis) return;

//     update(aiAnalysis.stage_number, {
//       prospect_words: aiAnalysis.prospect_words,
//       caller_notes: aiAnalysis.caller_notes,
//     });
//     setNotice(`AI-suggested words and notes copied into Stage ${aiAnalysis.stage_number}. Review and save them when ready.`);
//     setError("");
//     setExpanded(aiAnalysis.stage_number);
//   }

//   async function getLiveSuggestion(transcriptOverride?: string) {
//     const currentTranscript = transcriptOverride ?? transcript;

//     if (!currentTranscript.trim()) {
//       setError("Add the conversation transcript before requesting live guidance.");
//       setNotice("");
//       return;
//     }
//     if (!purpose.trim()) {
//       setError("The call purpose is missing. Make sure the parent page passes the purpose prop.");
//       setNotice("");
//       return;
//     }

//     const requestId = ++suggestionRequestRef.current;
//     setLoadingLiveSuggestion(true);
//     setError("");
//     setNotice("");

//     try {
//       let prospectContext = "";
//       const historyResponse = await fetch(
//         `${API_URL}/prospects/${encodeURIComponent(prospectId)}/intelligence`,
//         {
//           method: "GET",
//           headers: { Accept: "application/json" },
//           credentials: "include",
//         }
//       );

//       if (historyResponse.ok) {
//         const historyData = await historyResponse.json();
//         const rawContext = historyData?.context ?? historyData;
//         prospectContext = (
//           typeof rawContext === "string" ? rawContext : JSON.stringify(rawContext)
//         ).slice(0, 10000);
//       }

//       const response = await fetch(`${API_URL}/ai/live-suggestion`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Accept: "application/json" },
//         credentials: "include",
//         body: JSON.stringify({
//           transcript: currentTranscript.trim().slice(-20000),
//           purpose: purpose.trim(),
//           current_stage: expanded ?? 1,
//           prospect_context: prospectContext,
//         }),
//       });

//       const data = await response.json().catch(() => null);
//       if (!response.ok) {
//         throw new Error(
//           typeof data?.detail === "string"
//             ? data.detail
//             : `Live suggestion failed (${response.status}).`
//         );
//       }

//       // Ignore older responses if a newer transcript has already triggered a request.
//       if (requestId !== suggestionRequestRef.current) return;

//       setLiveSuggestion({
//         suggestion: typeof data?.suggestion === "string" ? data.suggestion : "",
//         reason: typeof data?.reason === "string" ? data.reason : "",
//       });
//     } catch (err) {
//       if (requestId === suggestionRequestRef.current) {
//         setError(err instanceof Error ? err.message : "Unable to get a live suggestion.");
//       }
//     } finally {
//       if (requestId === suggestionRequestRef.current) {
//         setLoadingLiveSuggestion(false);
//       }
//     }
//   }

//   async function endCall() {
//     if (isReadOnly || loadingStages) return;

//     const confirmed = window.confirm(
//       "End this call? Unfinished stages will remain incomplete."
//     );

//     if (!confirmed) return;

//     setEnding(true);
//     setError("");
//     setNotice("");

//     try {
//       await onEndCall();
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Unable to end the call."
//       );
//     } finally {
//       setEnding(false);
//     }
//   }

//   return (
//     <div className="mx-auto max-w-5xl space-y-5">
//       <header className="rounded-2xl border border-gray-200 bg-white p-6">
//         <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-wider text-[#526a9d]">
//               CALL WORKSPACE
//             </p>

//             <h1 className="mt-2 text-2xl font-bold text-gray-900">
//               Call stages
//             </h1>

//             <p className="mt-2 text-sm text-gray-500">
//               Record what happened at each stage. Save your progress and
//               return whenever needed.
//             </p>

//             <p className="mt-1 text-xs text-gray-400">
//               Call ID: {callId}
//             </p>
//           </div>

//           <div className="min-w-36 rounded-xl bg-[#f3f5fb] p-4">
//             <p className="text-sm text-gray-600">Progress</p>

//             <p className="mt-1 text-2xl font-bold text-[#243b70]">
//               {completed}/8
//             </p>

//             <div
//               className="mt-2 h-2 overflow-hidden rounded-full bg-white"
//               aria-label={`${completed} of 8 stages completed`}
//             >
//               <div
//                 className="h-full rounded-full bg-[#243b70] transition-all"
//                 style={{ width: `${(completed / 8) * 100}%` }}
//               />
//             </div>
//           </div>
//         </div>

//         {callStatus !== "in_progress" && (
//             <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
//                 This call has ended. You can still edit its saved stage responses
//                 and notes. Save your changes to update this call's record.
//             </p>
//             )}

//         {callMode === "guided_live" ? (
//           <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
//             Browser recording captures sound from your selected microphone. It does not automatically capture both sides of a separate phone call. Obtain consent from everyone required by applicable law before recording.
//           </p>
//         ) : (
//           <p className="mt-4 text-xs text-gray-500">
//             {callMode === "audio_upload"
//               ? "Audio review mode: record the outcomes after reviewing the conversation."
//               : "Manual notes mode: record the outcomes in each stage. Live next-step guidance is hidden."}
//           </p>
//         )}
//       </header>

//       {error && (
//         <div
//           role="alert"
//           className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
//         >
//           {error}
//         </div>
//       )}

//       {notice && (
//         <div
//           role="status"
//           className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
//         >
//           {notice}
//         </div>
//       )}

//       {loadingStages && (
//         <div
//           role="status"
//           className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600"
//         >
//           Loading saved stage responses...
//         </div>
//       )}

//       <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-wider text-[#526a9d]">AI TRANSCRIPT REVIEW</p>
//           <h2 className="mt-2 text-lg font-bold text-gray-900">Analyze a call transcript</h2>
//           <p className="mt-1 text-sm text-gray-600">
//             Analyze the prospect’s saved call history without pasting anything, or analyze a specific call from its transcript or recording. Audio analysis fills and saves all eight editable stages automatically.
//           </p>
//         </div>

//         <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
//           <div>
//             <h3 className="font-semibold text-gray-900">Prospect history summary</h3>
//             <p className="mt-1 text-sm text-gray-600">Pulls the saved prospect profile, previous calls, and stored stage results from the database. No transcript paste is required.</p>
//           </div>
//           <button type="button" onClick={() => void analyzeProspectHistory()} disabled={historyAnalyzing || fullAnalyzing || loadingStages} className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50">
//             {historyAnalyzing ? "Analysing saved prospect history..." : "Analyse saved prospect history"}
//           </button>
//           {historySummary && (
//             <div className="space-y-3 rounded-lg border border-indigo-100 bg-white p-4" aria-live="polite">
//               <p className="text-xs text-gray-500">Based on {historySummary.call_count} saved call(s)</p>
//               <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{historySummary.summary}</p>
//               {historySummary.key_points.length > 0 && <div><h4 className="text-sm font-semibold text-gray-900">Key points</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">{historySummary.key_points.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
//               {historySummary.recommended_next_steps.length > 0 && <div><h4 className="text-sm font-semibold text-gray-900">Recommended next steps</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">{historySummary.recommended_next_steps.map((step, index) => <li key={index}>{step}</li>)}</ul></div>}
//             </div>
//           )}
//         </div>

//         {callMode === "audio_upload" && (
//           <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
//             <div>
//               <h3 className="font-semibold text-gray-900">Upload a recorded call</h3>
//               <p className="mt-1 text-sm text-gray-600">
//                 Upload an existing recording to transcribe it and analyse all eight stages. Accepted formats: MP3, WAV, M4A, MP4, OGG, or WebM. Maximum file size: 25 MB.
//               </p>
//             </div>
//             <input
//               ref={audioFileInputRef}
//               type="file"
//               accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,.mpeg,audio/*,video/webm"
//               onChange={(event) => {
//                 const selected = event.target.files?.[0] ?? null;
//                 setError("");
//                 setNotice("");
//                 if (selected) {
//                   const validationError = validateAudioFile(selected);
//                   if (validationError) {
//                     setAudioFile(null);
//                     event.target.value = "";
//                     setError(validationError);
//                     return;
//                   }
//                 }
//                 setAudioFile(selected);
//               }}
//               disabled={fullAnalyzing || loadingStages}
//               className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-gray-700"
//             />
//             {audioFile && (
//               <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
//                 <p className="break-all text-xs text-gray-600">
//                   Selected: <strong>{audioFile.name}</strong> ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
//                 </p>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setAudioFile(null);
//                     if (audioFileInputRef.current) audioFileInputRef.current.value = "";
//                   }}
//                   disabled={fullAnalyzing || loadingStages}
//                   className="text-xs font-semibold text-red-700 underline disabled:opacity-50"
//                 >
//                   Remove file
//                 </button>
//               </div>
//             )}
//             <button
//               type="button"
//               onClick={() => void uploadAndAnalyzeAudio(audioFile)}
//               disabled={!audioFile || fullAnalyzing || loadingStages}
//               className="rounded-lg border border-[#243b70] px-4 py-2.5 text-sm font-semibold text-[#243b70] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {fullAnalyzing ? "Transcribing and analysing..." : "Upload, transcribe and analyse all stages"}
//             </button>
//           </div>
//         )}

//         {callMode === "guided_live" && (
//           <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
//             <div>
//               <h3 className="font-semibold text-gray-900">Record with your browser microphone</h3>
//               <p className="mt-1 text-sm leading-6 text-gray-600">
//                 This records audio from the microphone you choose in your browser. It does not automatically capture both sides of a phone call happening on another device. Get the consent required from everyone being recorded before you begin. Audio is not uploaded until you explicitly submit it below.
//               </p>
//             </div>

//             <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-3 text-sm text-gray-700">
//               <input
//                 type="checkbox"
//                 checked={recordingConsent}
//                 onChange={(event) => setRecordingConsent(event.target.checked)}
//                 disabled={isRecording || recordingStarting || fullAnalyzing}
//                 className="mt-1 accent-[#243b70]"
//               />
//               <span>I confirm I have informed the people being recorded and have obtained any consent required to record this conversation.</span>
//             </label>

//             <div className="flex flex-wrap gap-2">
//               {!isRecording ? (
//                 <button
//                   type="button"
//                   onClick={() => void startRecording()}
//                   disabled={!recordingConsent || recordingStarting || fullAnalyzing || loadingStages}
//                   className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
//                 >
//                   {recordingStarting ? "Requesting microphone..." : recordingFile ? "Record again" : "Start recording"}
//                 </button>
//               ) : (
//                 <button
//                   type="button"
//                   onClick={stopRecording}
//                   className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
//                 >
//                   Stop recording
//                 </button>
//               )}
//               {isRecording && (
//                 <span role="status" className="self-center text-sm font-medium text-red-700">
//                   <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
//                   Recording · {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}
//                 </span>
//               )}
//             </div>

//             {recordingFile && (
//               <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3">
//                 <p className="break-all text-sm text-gray-700">
//                   Recording ready: <strong>{recordingFile.name}</strong> ({(recordingFile.size / (1024 * 1024)).toFixed(2)} MB)
//                 </p>
//                 {recordingUrl && (
//                   <audio controls preload="metadata" src={recordingUrl} className="w-full">
//                     Your browser does not support audio playback.
//                   </audio>
//                 )}
//                 <div className="flex flex-wrap gap-2">
//                   <button
//                     type="button"
//                     onClick={() => void uploadAndAnalyzeAudio(recordingFile)}
//                     disabled={fullAnalyzing || loadingStages || isRecording}
//                     className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
//                   >
//                     {fullAnalyzing ? "Transcribing and analysing..." : "Submit recording for transcription and analysis"}
//                   </button>
//                   <button
//                     type="button"
//                     onClick={discardRecording}
//                     disabled={fullAnalyzing || isRecording}
//                     className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
//                   >
//                     Discard recording
//                   </button>
//                 </div>
//               </div>
//             )}
//             <p className="text-xs text-gray-500">
//               Recording remains in this browser until you submit it. The server accepts files up to 25 MB; longer recordings may need to be split or compressed.
//             </p>
//           </div>
//         )}

//         <div>
//           <label htmlFor="call-transcript" className="mb-2 block text-sm font-medium text-gray-700">
//             Call transcript
//           </label>
//           <textarea
//             id="call-transcript"
//             rows={6}
//             value={transcript}
//             onChange={(event) => {
//               setTranscript(event.target.value);
//               latestTranscriptRef.current = event.target.value;
//               finalTranscriptRef.current = event.target.value;
//             }}
//             placeholder="Paste the conversation transcript here..."
//             disabled={analyzing || loadingStages}
//             className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:bg-gray-50"
//           />
//           <p className="mt-1 text-xs text-gray-500">
//             Target stage: Stage {expanded ?? 1} — {STAGES[(expanded ?? 1) - 1].title}. Open another stage before analyzing to change the target.
//           </p>
//         </div>

//         {callMode === "guided_live" && (
//           <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
//             <div>
//               <h3 className="font-semibold text-gray-900">Live next-step guidance</h3>
//               <p className="mt-1 text-sm text-gray-600">
//                 During browser recording, speech is transcribed when supported and the assistant refreshes suggestions after you pause. You can also request guidance manually from the transcript. Browser speech recognition availability and accuracy vary.
//               </p>
//               {isRecording && (
//                 <div className="rounded-lg border border-blue-200 bg-white p-3">
//                   <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
//                     Live transcription status
//                   </p>
//                   <p className="mt-1 text-sm text-gray-800">{liveTranscriptionStatus}</p>
//                   {liveTranscriptPreview && (
//                     <p className="mt-2 text-sm italic text-gray-600">
//                       Hearing: {liveTranscriptPreview}
//                     </p>
//                   )}
//                 </div>
//               )}
//             </div>
//             <button
//               type="button"
//               onClick={() => void getLiveSuggestion(latestTranscriptRef.current || transcript)}
//               disabled={loadingLiveSuggestion || loadingStages || !transcript.trim()}
//               className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {loadingLiveSuggestion ? "Getting suggestion..." : "Suggest what to say next"}
//             </button>
//             {liveSuggestion && (
//               <div aria-live="polite" className="space-y-2 rounded-lg border border-blue-200 bg-white p-4">
//                 <h4 className="font-semibold text-gray-900">Suggested next sentence</h4>
//                 <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{liveSuggestion.suggestion || "No suggestion was returned. Add more transcript context and try again."}</p>
//                 {liveSuggestion.reason && <p className="text-sm text-gray-600"><strong>Why:</strong> {liveSuggestion.reason}</p>}
//                 <p className="border-t border-gray-100 pt-2 text-xs text-gray-500">This suggestion does not change outcomes, save notes, or mark any stage complete.</p>
//               </div>
//             )}
//           </div>
//         )}

//         <button
//           type="button"
//           onClick={() => void analyzeTranscript()}
//           disabled={analyzing || loadingStages || !transcript.trim()}
//           className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
//         >
//           {analyzing ? "Analyzing transcript..." : "Analyze transcript with AI"}
//         </button>

//         <div className="flex flex-wrap gap-2">
//           <button
//             type="button"
//             onClick={() => void analyzeEntireCall()}
//             disabled={fullAnalyzing || analyzing || loadingStages || !transcript.trim()}
//             className="rounded-lg border border-[#243b70] px-4 py-2.5 text-sm font-semibold text-[#243b70] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
//           >
//             {fullAnalyzing ? "Analysing all stages..." : "Analyse entire call + prospect history"}
//           </button>
//         </div>

//         {fullAnalysis && (
//           <div className="space-y-3 rounded-xl border border-green-200 bg-green-50/50 p-4">
//             <div>
//               <h3 className="font-semibold text-gray-900">Full-call analysis ready for review</h3>
//               {fullAnalysis.overall_summary && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{fullAnalysis.overall_summary}</p>}
//               {fullAnalysis.history_assessment && <p className="mt-2 text-sm text-gray-700"><strong>Prospect history:</strong> {fullAnalysis.history_assessment}</p>}
//               <p className="mt-2 text-xs text-gray-600">AI results have been placed into editable stage drafts. Review the eight stages below and save when ready.</p>
//             </div>
//             <button
//               type="button"
//               onClick={() => void saveAllAnalyzedStages()}
//               disabled={savingAll || fullAnalyzing || loadingStages}
//               className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
//             >
//               {savingAll ? "Saving all stages..." : "Save all analysed stages"}
//             </button>
//           </div>
//         )}

//         {aiAnalysis && (
//           <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4" aria-live="polite">
//             <div className="flex flex-wrap items-center justify-between gap-2">
//               <h3 className="font-semibold text-gray-900">AI suggestions · Stage {aiAnalysis.stage_number}</h3>
//               <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-900">
//                 Assessment: {aiAnalysis.suggested_outcome.replaceAll("_", " ")}
//               </span>
//             </div>

//             <div>
//               <p className="text-sm font-semibold text-gray-800">Prospect&apos;s words</p>
//               <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{aiAnalysis.prospect_words || "No exact prospect quotation identified."}</p>
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-gray-800">Caller notes</p>
//               <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{aiAnalysis.caller_notes || "No notes suggested."}</p>
//             </div>

//             {aiAnalysis.evidence.length > 0 && (
//               <div>
//                 <p className="text-sm font-semibold text-gray-800">Evidence from transcript</p>
//                 <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
//                   {aiAnalysis.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
//                 </ul>
//               </div>
//             )}
//             {aiAnalysis.missing_information.length > 0 && (
//               <div>
//                 <p className="text-sm font-semibold text-gray-800">Missing information</p>
//                 <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
//                   {aiAnalysis.missing_information.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
//                 </ul>
//               </div>
//             )}
//             {aiAnalysis.uncertainty && (
//               <div>
//                 <p className="text-sm font-semibold text-gray-800">Uncertainty</p>
//                 <p className="mt-1 text-sm text-gray-700">{aiAnalysis.uncertainty}</p>
//               </div>
//             )}

//             <div className="flex flex-col gap-2 border-t border-blue-200 pt-3 sm:flex-row">
//               <button
//                 type="button"
//                 onClick={applyAIAnalysis}
//                 className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58]"
//               >
//                 Apply suggested words and notes
//               </button>
//               <p className="self-center text-xs text-gray-600">
//                 This does not select an outcome, mark the stage complete, or save it. Review and save manually.
//               </p>
//             </div>
//           </div>
//         )}
//       </section>

//       <div className="space-y-3">
//         {STAGES.map((stage, index) => {
//           const n = index + 1;
//           const draft = drafts[n];
//           const isOpen = expanded === n;
//           const isComplete = draft?.status === "complete";

//           return (
//             <section
//               key={stage.title}
//               className={`overflow-hidden rounded-xl border bg-white ${
//                 isComplete ? "border-green-200" : "border-gray-200"
//               }`}
//             >
//               <button
//                 type="button"
//                 aria-expanded={isOpen}
//                 onClick={() => setExpanded(isOpen ? null : n)}
//                 className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 sm:p-5"
//               >
//                 <span
//                   className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
//                     isComplete
//                       ? "bg-green-100 text-green-700"
//                       : "bg-[#edf1fb] text-[#243b70]"
//                   }`}
//                 >
//                   {isComplete ? "✓" : n}
//                 </span>

//                 <span className="min-w-0 flex-1">
//                   <span className="block font-semibold text-gray-900">
//                     Stage {n} — {stage.title}
//                   </span>

//                   <span className="mt-1 block text-xs text-gray-500">
//                     {isComplete
//                       ? "Completed"
//                       : draft?.outcome_key
//                         ? "Outcome selected · Not completed"
//                         : "Not completed"}
//                   </span>
//                 </span>

//                 <span
//                   aria-hidden="true"
//                   className="text-xl text-gray-400"
//                 >
//                   {isOpen ? "−" : "+"}
//                 </span>
//               </button>

//               {isOpen && (
//                 <div className="space-y-5 border-t border-gray-100 p-4 sm:p-5">
//                   <p className="text-sm text-gray-600">
//                     {stage.prompt}
//                   </p>

//                   <div className="space-y-2">
//                     {stage.options.map(([key, label, explanation]) => (
//                       <label
//                         key={key}
//                         className={`flex items-start gap-3 rounded-lg border p-3 transition ${
//                           isReadOnly || loadingStages
//                             ? "cursor-default"
//                             : "cursor-pointer"
//                         } ${
//                           draft?.outcome_key === key
//                             ? "border-[#526a9d] bg-[#f5f7fc]"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                       >
//                         <input
//                           type="radio"
//                           name={`stage-${n}`}
//                           checked={draft?.outcome_key === key}
//                           disabled={isReadOnly || loadingStages}
//                           onChange={() =>
//                             update(n, { outcome_key: key })
//                           }
//                           className="mt-1 accent-[#243b70]"
//                         />

//                         <span className="flex-1">
//                           <span className="block text-sm font-medium text-gray-800">
//                             {label}
//                           </span>

//                           <span className="mt-1 block text-xs leading-5 text-gray-500">
//                             {explanation}
//                           </span>
//                         </span>
//                       </label>
//                     ))}
//                   </div>

//                   <div>
//                     <label
//                       htmlFor={`words-${n}`}
//                       className="mb-2 block text-sm font-medium text-gray-700"
//                     >
//                       Prospect&apos;s exact words{" "}
//                       <span className="font-normal text-gray-400">
//                         (optional)
//                       </span>
//                     </label>

//                     <textarea
//                       id={`words-${n}`}
//                       rows={3}
//                       value={draft?.prospect_words ?? ""}
//                       disabled={isReadOnly || loadingStages}
//                       onChange={(event) =>
//                         update(n, {
//                           prospect_words: event.target.value,
//                         })
//                       }
//                       placeholder="Write what the prospect actually said..."
//                       className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600"
//                     />
//                   </div>

//                   <div>
//                     <label
//                       htmlFor={`notes-${n}`}
//                       className="mb-2 block text-sm font-medium text-gray-700"
//                     >
//                       Your notes{" "}
//                       <span className="font-normal text-gray-400">
//                         (optional)
//                       </span>
//                     </label>

//                     <textarea
//                       id={`notes-${n}`}
//                       rows={2}
//                       value={draft?.caller_notes ?? ""}
//                       disabled={isReadOnly || loadingStages}
//                       onChange={(event) =>
//                         update(n, {
//                           caller_notes: event.target.value,
//                         })
//                       }
//                       placeholder="Add context or a reminder..."
//                       className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600"
//                     />
//                   </div>

//                   {!isReadOnly && (
//                     <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
//                       <button
//                         type="button"
//                         onClick={() => void save(n, false)}
//                         disabled={saving === n || loadingStages}
//                         className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
//                       >
//                         {saving === n ? "Saving..." : "Save progress"}
//                       </button>

//                       <button
//                         type="button"
//                         onClick={() => void save(n, true)}
//                         disabled={saving === n || loadingStages}
//                         className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:opacity-50"
//                       >
//                         {saving === n
//                           ? "Saving..."
//                           : isComplete
//                             ? "Save changes"
//                             : "✓ Mark complete"}
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </section>
//           );
//         })}
//       </div>

//       {callStatus === "in_progress" && (
//         <footer className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
//           <p className="text-sm text-gray-500">
//             Ending the call does not mark unfinished stages complete.
//           </p>

//           <button
//             type="button"
//             onClick={() => void endCall()}
//             disabled={ending || loadingStages}
//             className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
//           >
//             {ending ? "Ending call..." : "End call"}
//           </button>
//         </footer>
//       )}
//     </div>
//   );
// }




"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type StageStatus =
  | "complete"
  | "incomplete"
  | "needs_clarification"
  | "not_assessable";

type Draft = {
  stage_number: number;
  status: StageStatus;
  outcome_key: string | null;
  prospect_words: string;
  caller_notes: string;
};

type CallMode = "guided_live" | "audio_upload" | "manual_notes";

type CallStatus = "in_progress" | "completed" | "abandoned";

type FullStageAnalysis = {
  stage_number: number;
  status: StageStatus;
  outcome_key: string;
  prospect_words: string;
  caller_notes: string;
  evidence: string[];
  missing_information: string[];
  uncertainty: string;
};

type FullCallAnalysis = {
  call_id: string;
  prospect_id: string;
  transcript: string;
  overall_summary: string;
  history_assessment: string;
  stages: FullStageAnalysis[];
  follow_up_tasks?: Array<{
    id?: string;
    title: string;
    details?: string;
    due_at?: string | null;
    timezone?: string;
    needs_confirmation?: boolean;
    source_excerpt?: string;
  }>;
};

type AIAnalysis = {
  stage_number: number;
  suggested_outcome: StageStatus;
  prospect_words: string;
  caller_notes: string;
  evidence: string[];
  missing_information: string[];
  uncertainty: string;
};

type SavedStage = {
  stage_number: number;
  status?: StageStatus;
  outcome_key?: string | null;
  prospect_words?: string | null;
  caller_notes?: string | null;
  extracted_content?: Record<string, unknown> | null;
  extracted_information?: Record<string, unknown> | null;
};

type Props = {
  callId: string;
  prospectId: string;
  callMode: CallMode;
  initialAudioFile?: File | null;
  onInitialAudioFileConsumed?: () => void;
  callStatus: CallStatus;
  purpose?: string;
  onSaveStage: (result: Draft) => Promise<void>;
  onEndCall: () => Promise<void>;
};

const STAGES = [
  {
    title: "Opening",
    prompt: "How did the opening of the call go?",
    options: [
      ["intended_person_confirmed", "Reached the intended person", "The person's identity was confirmed."],
      ["gatekeeper_or_identity_clarification", "Gatekeeper or identity clarification", "Someone else answered or identity needs clarification."],
      ["busy_or_callback", "Busy or asked for a callback", "They were unavailable or requested another time."],
      ["wrong_person_or_outdated_contact", "Wrong person or outdated contact", "The contact is incorrect or no longer relevant."],
      ["connection_problem_or_disconnection", "Connection problem or disconnection", "A technical issue prevented the conversation."],
      ["other_or_unclear", "Other / unclear", "The outcome does not fit another option or is uncertain."],
    ],
  },
  {
    title: "Purpose",
    prompt: "How did the prospect respond to your purpose?",
    options: [
      ["purpose_understood", "Understood the purpose", "They understood why you were reaching out."],
      ["purpose_question", "Asked for clarification", "They asked what the call was about."],
      ["purpose_rejected", "Did not see relevance", "They did not see why the conversation was relevant."],
      ["purpose_not_discussed", "Purpose not discussed", "The conversation did not reach this point."],
      ["other_or_unclear", "Other / unclear", "The response is uncertain or different."],
    ],
  },
  {
    title: "Permission",
    prompt: "Did the prospect give permission to continue?",
    options: [
      ["permission_yes", "Agreed to continue", "They were willing to continue the conversation."],
      ["permission_later", "Asked to speak later", "They suggested a different time."],
      ["permission_no", "Declined to continue", "They did not want to continue."],
      ["permission_not_asked", "Permission not established", "Permission was not clearly asked or answered."],
      ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
    ],
  },
  {
    title: "Their business",
    prompt: "What did you learn about their business?",
    options: [
      ["business_context_shared", "Shared business context", "They described their business, role, or situation."],
      ["business_details_partial", "Some details shared", "Only limited business context was shared."],
      ["business_not_discussed", "Not discussed", "The call did not reach this point."],
      ["other_or_unclear", "Other / unclear", "The information is uncertain or different."],
    ],
  },
  {
    title: "Their need in their words",
    prompt: "What did the prospect say about their needs?",
    options: [
      ["need_explicit", "Clearly described a need", "They explicitly described a problem, goal, or need."],
      ["need_possible", "Possible need, not confirmed", "A potential need came up but was not confirmed."],
      ["no_need_stated", "No need stated", "They did not describe a need."],
      ["other_or_unclear", "Other / unclear", "The need is uncertain or different."],
    ],
  },
  {
    title: "Objection",
    prompt: "What happened when concerns or objections came up?",
    options: [
      ["objection_resolved", "Concern addressed", "The concern appeared resolved."],
      ["objection_unresolved", "Concern remains", "The concern was not resolved."],
      ["no_objection", "No objection raised", "No clear objection came up."],
      ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
    ],
  },
  {
    title: "Next step",
    prompt: "Was a next step agreed?",
    options: [
      ["meeting_agreed", "Meeting agreed", "A meeting or demo was agreed."],
      ["follow_up_agreed", "Follow-up agreed", "A follow-up time or action was agreed."],
      ["information_requested", "Information requested", "They asked for information to be sent."],
      ["no_next_step", "No next step agreed", "No concrete next step was agreed."],
      ["other_or_unclear", "Other / unclear", "The outcome is uncertain or different."],
    ],
  },
  {
    title: "Close",
    prompt: "How did the conversation end?",
    options: [
      ["positive_close", "Positive close", "The conversation ended constructively."],
      ["callback_close", "Closed with callback plan", "The conversation ended with a callback plan."],
      ["declined_close", "Prospect declined", "The prospect declined further engagement."],
      ["ending_unclear", "Ending unclear", "The final outcome is uncertain."],
    ],
  },
] as const;

function isStageStatus(value: unknown): value is StageStatus {
  return (
    value === "complete" ||
    value === "incomplete" ||
    value === "needs_clarification" ||
    value === "not_assessable"
  );
}

function getText(
  primary: unknown,
  fallback: unknown
): string {
  if (typeof primary === "string") return primary;
  if (typeof fallback === "string") return fallback;
  return "";
}

function getObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export default function CallWorkspace({
  callId,
  prospectId,
  callMode,
  initialAudioFile = null,
  onInitialAudioFileConsumed,
  callStatus,
  purpose = "",
  onSaveStage,
  onEndCall,
}: Props) {
  const [expanded, setExpanded] = useState<number | null>(1);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const [loadingStages, setLoadingStages] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialAudioFile) {
      if (callMode === "guided_live") {
        setRecordingFile(initialAudioFile);
        setRecordingUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return URL.createObjectURL(initialAudioFile);
        });
      } else {
        setAudioFile(initialAudioFile);
      }
      onInitialAudioFileConsumed?.();
    }
  }, [initialAudioFile, callMode, onInitialAudioFileConsumed]);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<FullCallAnalysis | null>(null);
  const [fullAnalyzing, setFullAnalyzing] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [historyAnalyzing, setHistoryAnalyzing] = useState(false);
  const [historySummary, setHistorySummary] = useState<{ summary: string; call_count: number; key_points: string[]; recommended_next_steps: string[] } | null>(null);
  const [loadingLiveSuggestion, setLoadingLiveSuggestion] = useState(false);
  const [liveSuggestion, setLiveSuggestion] = useState<{ suggestion: string; reason: string } | null>(null);
  const [liveTranscriptPreview, setLiveTranscriptPreview] = useState("");
  const [liveTranscriptionStatus, setLiveTranscriptionStatus] = useState("Not started");

  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const latestTranscriptRef = useRef("");
  const suggestionTimerRef = useRef<number | null>(null);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const suggestionRequestRef = useRef(0);
  const manuallyStoppedRecognitionRef = useRef(false);

  const isReadOnly = false;

  useEffect(() => {
    let cancelled = false;

    async function loadStages() {
      setLoadingStages(true);
      setError("");
      setNotice("");
      setDrafts({});

      try {
        const response = await fetch(
          `${API_URL}/calls/${encodeURIComponent(callId)}/stages`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || `Unable to load saved stages (${response.status}).`
          );
        }

        const data = await response.json();
        const items: SavedStage[] = Array.isArray(data.stages)
            ? data.stages
            : Array.isArray(data.items)
                ? data.items
                : [];

        const loaded: Record<number, Draft> = {};

        for (const item of items) {
          const stageNumber = Number(item.stage_number);

          if (
            !Number.isInteger(stageNumber) ||
            stageNumber < 1 ||
            stageNumber > 8
          ) {
            continue;
          }

          const extractedContent = getObject(item.extracted_content);
          const extractedInformation = getObject(
            item.extracted_information
          );

          const savedStatus = isStageStatus(item.status)
            ? item.status
            : "incomplete";

          loaded[stageNumber] = {
            stage_number: stageNumber,
            status: savedStatus,
            outcome_key:
                typeof item.outcome_key === "string"
                    ? item.outcome_key
                    : typeof extractedContent.outcome_key === "string"
                    ? extractedContent.outcome_key
                    : null,
            prospect_words: getText(
              item.prospect_words,
              extractedInformation.prospect_words ??
                extractedContent.prospect_words
            ),
            caller_notes: getText(
              item.caller_notes,
              extractedInformation.caller_notes ??
                extractedContent.caller_notes
            ),
          };
        }

        if (!cancelled) {
          setDrafts(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load saved stage responses."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStages(false);
        }
      }
    }

    void loadStages();

    return () => {
      cancelled = true;
    };
  }, [callId]);

  const completed = useMemo(
    () =>
      Object.values(drafts).filter(
        (draft) => draft.status === "complete"
      ).length,
    [drafts]
  );

  function update(n: number, patch: Partial<Draft>) {
    if (isReadOnly || loadingStages) return;

    setDrafts((old) => {
      const current: Draft = old[n] ?? {
        stage_number: n,
        status: "incomplete",
        outcome_key: null,
        prospect_words: "",
        caller_notes: "",
      };

      return {
        ...old,
        [n]: {
          ...current,
          ...patch,
          stage_number: n,
          ...(patch.outcome_key !== undefined
            ? { status: "incomplete" as const }
            : {}),
        },
      };
    });

    setNotice("");
    setError("");
  }

  async function save(n: number, markComplete: boolean) {
    if (isReadOnly || loadingStages) return;

    const current = drafts[n];

    if (!current?.outcome_key) {
      setError(`Choose an outcome for Stage ${n} before saving.`);
      setNotice("");
      setExpanded(n);
      return;
    }

    const payload: Draft = {
      ...current,
      stage_number: n,
      status: markComplete ? "complete" : "incomplete",
    };

    setSaving(n);
    setError("");
    setNotice("");

    try {
      await onSaveStage(payload);

      setDrafts((old) => ({
        ...old,
        [n]: payload,
      }));

      setNotice(
        markComplete
          ? `Stage ${n} marked complete.`
          : `Stage ${n} progress saved.`
      );

      if (markComplete && n < 8) {
        setExpanded(n + 1);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to save Stage ${n}.`
      );
    } finally {
      setSaving(null);
    }
  }

  function applyFullAnalysis(result: FullCallAnalysis) {
    const nextDrafts: Record<number, Draft> = {};
    for (const stage of result.stages) {
      nextDrafts[stage.stage_number] = {
        stage_number: stage.stage_number,
        status: stage.status,
        outcome_key: stage.outcome_key,
        prospect_words: stage.prospect_words,
        caller_notes: stage.caller_notes,
      };
    }
    // Keep results as editable local drafts; caller explicitly saves them below.
    setDrafts((current) => ({ ...current, ...nextDrafts }));
    setTranscript(result.transcript);
    setFullAnalysis(result);
    setAiAnalysis(null);
    setExpanded(1);
  }

  const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
  const ACCEPTED_AUDIO_EXTENSIONS = new Set([
    "mp3", "wav", "m4a", "mp4", "ogg", "webm", "mpeg",
  ]);
  const ACCEPTED_AUDIO_TYPES = new Set([
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4",
    "audio/x-m4a", "audio/m4a", "audio/webm", "audio/ogg", "video/webm",
    "application/octet-stream",
  ]);

  function validateAudioFile(file: File): string | null {
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() ?? ""
      : "";
    if (!ACCEPTED_AUDIO_EXTENSIONS.has(extension) &&
        !ACCEPTED_AUDIO_TYPES.has(file.type.split(";")[0].toLowerCase())) {
      return "Unsupported file type. Choose MP3, WAV, M4A, MP4, OGG, or WebM.";
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return "This file exceeds the 25 MB limit. Compress or split the recording and try again.";
    }
    if (file.size === 0) {
      return "The selected file is empty. Choose another recording.";
    }
    return null;
  }

  function clearLiveTimers() {
    if (suggestionTimerRef.current !== null) {
      window.clearTimeout(suggestionTimerRef.current);
      suggestionTimerRef.current = null;
    }
    if (recognitionRestartTimerRef.current !== null) {
      window.clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
  }

  function stopLiveSpeechRecognition() {
    manuallyStoppedRecognitionRef.current = true;
    clearLiveTimers();

    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;

    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Recognition may already have stopped.
      }
    }

    setLiveTranscriptPreview("");
  }

  function scheduleLiveSuggestion(fullTranscript: string) {
    if (callMode !== "guided_live" || !fullTranscript.trim() || !purpose.trim()) {
      return;
    }

    if (suggestionTimerRef.current !== null) {
      window.clearTimeout(suggestionTimerRef.current);
    }

    // Debounce speech so the API is not called for every short phrase.
    suggestionTimerRef.current = window.setTimeout(() => {
      suggestionTimerRef.current = null;
      if (mediaRecorderRef.current?.state !== "recording") return;
      void getLiveSuggestion(fullTranscript);
    }, 1800);
  }

  function startLiveSpeechRecognition() {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setLiveTranscriptionStatus(
        "Live transcription is not supported in this browser. You can still record and submit the audio for transcription."
      );
      return;
    }

    manuallyStoppedRecognitionRef.current = false;

    const createRecognition = (): SpeechRecognitionLike => {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onresult = (event) => {
        let newFinalText = "";
        let interimText = "";

        // Only consume newly changed results. Previously finalized results
        // are already stored in finalTranscriptRef across recognition restarts.
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const phrase = result[0]?.transcript?.trim();
          if (!phrase) continue;
          if (result.isFinal) newFinalText += `${phrase} `;
          else interimText += `${phrase} `;
        }

        if (newFinalText.trim()) {
          finalTranscriptRef.current = [
            finalTranscriptRef.current.trim(),
            newFinalText.trim(),
          ].filter(Boolean).join(" ").slice(-20000);
        }

        const combined = [
          finalTranscriptRef.current.trim(),
          interimText.trim(),
        ].filter(Boolean).join(" ").slice(-20000);

        latestTranscriptRef.current = combined;
        setTranscript(combined);
        setLiveTranscriptPreview(interimText.trim());
        setLiveTranscriptionStatus("Listening for speech...");

        if (newFinalText.trim()) {
          scheduleLiveSuggestion(finalTranscriptRef.current);
        }
      };

      recognition.onerror = (event) => {
        // A temporary no-speech event is common during pauses. The onend
        // handler below restarts recognition while the audio recorder runs.
        if (event.error === "no-speech" || event.error === "aborted") return;

        setLiveTranscriptionStatus(`Transcription issue: ${event.error}`);

        // Do not restart endlessly when permission or the speech service fails.
        if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported", "network"].includes(event.error)) {
          manuallyStoppedRecognitionRef.current = true;
          if (recognitionRestartTimerRef.current !== null) {
            window.clearTimeout(recognitionRestartTimerRef.current);
            recognitionRestartTimerRef.current = null;
          }
        }
      };

      recognition.onend = () => {
        if (
          manuallyStoppedRecognitionRef.current ||
          mediaRecorderRef.current?.state !== "recording"
        ) {
          return;
        }

        setLiveTranscriptionStatus("Reconnecting speech recognition...");
        recognitionRestartTimerRef.current = window.setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          if (
            manuallyStoppedRecognitionRef.current ||
            mediaRecorderRef.current?.state !== "recording"
          ) return;

          try {
            const nextRecognition = createRecognition();
            speechRecognitionRef.current = nextRecognition;
            nextRecognition.start();
          } catch {
            setLiveTranscriptionStatus(
              "Could not restart live transcription. Recording continues; submit the audio to transcribe it later."
            );
          }
        }, 300);
      };

      return recognition;
    };

    finalTranscriptRef.current = "";
    latestTranscriptRef.current = "";
    setLiveTranscriptPreview("");
    setLiveTranscriptionStatus("Starting live transcription...");

    try {
      const recognition = createRecognition();
      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setLiveTranscriptionStatus(
        "Unable to start live transcription. Recording continues; submit the audio to transcribe it later."
      );
    }
  }

  function releaseMicrophone() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function discardRecording() {
    stopLiveSpeechRecognition();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // The recorder may already have stopped.
      }
    }
    mediaRecorderRef.current = null;
    releaseMicrophone();
    recordingChunksRef.current = [];
    setIsRecording(false);
    setRecordingStarting(false);
    setRecordingSeconds(0);
    setRecordingFile(null);
    setRecordingConsent(false);
    setError("");
    setNotice("");
    setRecordingUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
  }

  async function startRecording() {
    setError("");
    setNotice("");
    if (!recordingConsent) {
      setError("Please confirm that you have consent to record before starting.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support microphone recording. Try a current version of Chrome, Edge, or Firefox.");
      return;
    }

    setRecordingStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopLiveSpeechRecognition();
        setError("The browser encountered an error while recording. Please try again.");
        releaseMicrophone();
        setIsRecording(false);
        setRecordingStarting(false);
      };
      recorder.onstop = () => {
        releaseMicrophone();
        const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type: actualMimeType });
        recordingChunksRef.current = [];
        if (!blob.size) {
          setError("The recording was empty. Please record again.");
          setIsRecording(false);
          setRecordingStarting(false);
          return;
        }
        const extension = actualMimeType.includes("ogg")
          ? "ogg"
          : actualMimeType.includes("mp4")
            ? "mp4"
            : "webm";
        const file = new File([blob], `browser-recording-${Date.now()}.${extension}`, {
          type: actualMimeType,
        });
        const validationError = validateAudioFile(file);
        if (validationError) {
          setError(validationError);
          setRecordingFile(null);
        } else {
          setRecordingFile(file);
          setRecordingUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return URL.createObjectURL(blob);
          });
          setNotice("Recording stopped. Automatically uploading for transcription and full-call analysis...");
          // Stop -> upload -> transcribe -> analyse all eight stages and extract
          // follow-up tasks in the same backend analysis pass.
          void uploadAndAnalyzeAudio(file);
        }
        setIsRecording(false);
        setRecordingStarting(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);
      setRecordingStarting(false);
      setLiveSuggestion(null);
      setTranscript("");
      finalTranscriptRef.current = "";
      latestTranscriptRef.current = "";
      setNotice("Recording started. Live transcription is starting.");
      startLiveSpeechRecognition();
    } catch (err) {
      releaseMicrophone();
      setRecordingStarting(false);
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone access was denied. Allow microphone access in your browser settings and try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone was found. Connect or enable a microphone and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to start microphone recording.");
      }
    }
  }

  function stopRecording() {
    stopLiveSpeechRecognition();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseMicrophone();
      setIsRecording(false);
      setRecordingStarting(false);
    }
  }

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      clearLiveTimers();
      manuallyStoppedRecognitionRef.current = true;
      const recognition = speechRecognitionRef.current;
      speechRecognitionRef.current = null;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.abort(); } catch { /* Already stopped. */ }
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Ignore shutdown errors during unmount.
        }
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [recordingUrl]);

  async function analyzeProspectHistory() {
    setHistoryAnalyzing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/ai/prospect-history/${encodeURIComponent(prospectId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `Prospect history analysis failed (${response.status}).`);
      setHistorySummary(data);
      setNotice("Prospect history analysed using saved database records.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyse saved prospect history.");
    } finally {
      setHistoryAnalyzing(false);
    }
  }

  async function persistAnalyzedStages(result: FullCallAnalysis) {
    // Persist all eight AI-generated stage drafts immediately. Their status remains
    // evidence-based; callers can edit each stage and save corrections afterward.
    for (const stage of result.stages) {
      await onSaveStage({
        stage_number: stage.stage_number,
        status: stage.status,
        outcome_key: stage.outcome_key || null,
        prospect_words: stage.prospect_words || "",
        caller_notes: stage.caller_notes || "",
      });
    }
  }

  async function analyzeEntireCall() {
    if (!transcript.trim()) {
      setError("Add or paste the call transcript first.");
      return;
    }
    setFullAnalyzing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/ai/analyze-full-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          call_id: callId,
          prospect_id: prospectId,
          transcript: transcript.trim(),
          source_type: callMode === "audio_upload" ? "audio_upload" : callMode === "guided_live" ? "live_recording" : "manual_notes",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Full-call analysis failed (${response.status}).`);
      const result = data as FullCallAnalysis;
      applyFullAnalysis(result);
      setNotice("AI analysed all eight stages. Saving stage results...");
      await persistAnalyzedStages(result);
      window.dispatchEvent(new CustomEvent("deepthought:follow-up-tasks-updated"));
      setNotice(
        `AI analysed and saved all eight stages${result.follow_up_tasks?.length ? ` and created ${result.follow_up_tasks.length} follow-up task(s)` : ""}. Review the stages and reminders.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyse the entire call.");
    } finally {
      setFullAnalyzing(false);
    }
  }

  async function uploadAndAnalyzeAudio(fileToUpload: File | null = audioFile) {
    if (!fileToUpload) {
      setError("Choose an audio file first.");
      return;
    }
    const validationError = validateAudioFile(fileToUpload);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (fullAnalyzing || loadingStages) return;

    setFullAnalyzing(true);
    setError("");
    setNotice("Uploading audio. Transcription and AI analysis may take a little while...");
    try {
      const form = new FormData();
      form.append("call_id", callId);
      form.append("prospect_id", prospectId);
      form.append("file", fileToUpload, fileToUpload.name);
      form.append("source_type", callMode === "guided_live" ? "live_recording" : "audio_upload");
      form.append("timezone_name", Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
      const response = await fetch(`${API_URL}/ai/upload-audio`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : `Audio upload failed (${response.status}). The server returned an invalid response.`
        );
      }
      if (!data || typeof data.transcript !== "string" || !Array.isArray(data.stages) || data.stages.length !== 8) {
        throw new Error("The server response was incomplete. Expected a transcript and analysis for all eight stages.");
      }
      const result = data as FullCallAnalysis;
      applyFullAnalysis(result);
      setNotice("Audio transcribed and analysed. Saving all eight stage results to the database...");
      await persistAnalyzedStages(result);
      // The backend persists follow-up tasks during this same full-call analysis.
      // Notify the reminder bar only after analysis and stage persistence succeed.
      window.dispatchEvent(new CustomEvent("deepthought:follow-up-tasks-updated"));
      setAudioFile(null);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
      setNotice(
        `Audio transcribed, all eight stages analysed, and stage results saved${result.follow_up_tasks?.length ? `; ${result.follow_up_tasks.length} follow-up task(s) created` : ""}. You can edit any stage and save your corrections.`
      );
      if (callMode === "guided_live") {
        setRecordingFile(null);
        setRecordingUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return "";
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload and analyse the audio.");
      setNotice("");
    } finally {
      setFullAnalyzing(false);
    }
  }

  async function saveAllAnalyzedStages() {
    if (!fullAnalysis) return;
    setSavingAll(true);
    setError("");
    setNotice("");
    try {
      // Save each AI-created draft using the existing page-level persistence handler.
      for (const stage of fullAnalysis.stages) {
        const draft = drafts[stage.stage_number];
        if (!draft?.outcome_key) continue;
        await onSaveStage({ ...draft, status: draft.status });
      }
      setNotice("All analysed stage drafts were saved. You can continue editing individual stages and save changes at any time.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Some stage results could not be saved. Check the saved stages and retry.");
    } finally {
      setSavingAll(false);
    }
  }

  async function analyzeTranscript() {
    const stageNumber = expanded ?? 1;

    if (!transcript.trim()) {
      setError("Paste a call transcript before running AI analysis.");
      setNotice("");
      return;
    }

    setAnalyzing(true);
    setError("");
    setNotice("");
    setAiAnalysis(null);

    try {
      const response = await fetch(`${API_URL}/ai/analyze-call`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          transcript: transcript.trim(),
          current_stage: stageNumber,
        }),
      });

      if (!response.ok) {
        let message = `AI analysis failed (${response.status}).`;
        try {
          const data = await response.json();
          if (typeof data.detail === "string") message = data.detail;
        } catch {
          // Keep the fallback error message if the response isn't JSON.
        }
        throw new Error(message);
      }

      const result = (await response.json()) as AIAnalysis;
      setAiAnalysis(result);
      setNotice(`AI analysis is ready for Stage ${stageNumber}. Review it before applying anything.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze this transcript.");
    } finally {
      setAnalyzing(false);
    }
  }

  function applyAIAnalysis() {
    if (!aiAnalysis) return;

    update(aiAnalysis.stage_number, {
      prospect_words: aiAnalysis.prospect_words,
      caller_notes: aiAnalysis.caller_notes,
    });
    setNotice(`AI-suggested words and notes copied into Stage ${aiAnalysis.stage_number}. Review and save them when ready.`);
    setError("");
    setExpanded(aiAnalysis.stage_number);
  }

  async function getLiveSuggestion(transcriptOverride?: string) {
    const currentTranscript = transcriptOverride ?? transcript;

    if (!currentTranscript.trim()) {
      setError("Add the conversation transcript before requesting live guidance.");
      setNotice("");
      return;
    }
    if (!purpose.trim()) {
      setError("The call purpose is missing. Make sure the parent page passes the purpose prop.");
      setNotice("");
      return;
    }

    const requestId = ++suggestionRequestRef.current;
    setLoadingLiveSuggestion(true);
    setError("");
    setNotice("");

    try {
      let prospectContext = "";
      const historyResponse = await fetch(
        `${API_URL}/prospects/${encodeURIComponent(prospectId)}/intelligence`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const rawContext = historyData?.context ?? historyData;
        prospectContext = (
          typeof rawContext === "string" ? rawContext : JSON.stringify(rawContext)
        ).slice(0, 10000);
      }

      const response = await fetch(`${API_URL}/ai/live-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transcript: currentTranscript.trim().slice(-20000),
          purpose: purpose.trim(),
          current_stage: expanded ?? 1,
          prospect_context: prospectContext,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : `Live suggestion failed (${response.status}).`
        );
      }

      // Ignore older responses if a newer transcript has already triggered a request.
      if (requestId !== suggestionRequestRef.current) return;

      setLiveSuggestion({
        suggestion: typeof data?.suggestion === "string" ? data.suggestion : "",
        reason: typeof data?.reason === "string" ? data.reason : "",
      });
    } catch (err) {
      if (requestId === suggestionRequestRef.current) {
        setError(err instanceof Error ? err.message : "Unable to get a live suggestion.");
      }
    } finally {
      if (requestId === suggestionRequestRef.current) {
        setLoadingLiveSuggestion(false);
      }
    }
  }

  async function endCall() {
    if (isReadOnly || loadingStages) return;

    const confirmed = window.confirm(
      "End this call? Unfinished stages will remain incomplete."
    );

    if (!confirmed) return;

    setEnding(true);
    setError("");
    setNotice("");

    try {
      await onEndCall();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to end the call."
      );
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#526a9d]">
              CALL WORKSPACE
            </p>

            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Call stages
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Record what happened at each stage. Save your progress and
              return whenever needed.
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Call ID: {callId}
            </p>
          </div>

          <div className="min-w-36 rounded-xl bg-[#f3f5fb] p-4">
            <p className="text-sm text-gray-600">Progress</p>

            <p className="mt-1 text-2xl font-bold text-[#243b70]">
              {completed}/8
            </p>

            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white"
              aria-label={`${completed} of 8 stages completed`}
            >
              <div
                className="h-full rounded-full bg-[#243b70] transition-all"
                style={{ width: `${(completed / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {callStatus !== "in_progress" && (
            <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                This call has ended. You can still edit its saved stage responses
                and notes. Save your changes to update this call's record.
            </p>
            )}

        {callMode === "guided_live" ? (
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Browser recording captures sound from your selected microphone. It does not automatically capture both sides of a separate phone call. Obtain consent from everyone required by applicable law before recording.
          </p>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            {callMode === "audio_upload"
              ? "Audio review mode: record the outcomes after reviewing the conversation."
              : "Manual notes mode: record the outcomes in each stage. Live next-step guidance is hidden."}
          </p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      {loadingStages && (
        <div
          role="status"
          className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600"
        >
          Loading saved stage responses...
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#526a9d]">AI TRANSCRIPT REVIEW</p>
          <h2 className="mt-2 text-lg font-bold text-gray-900">Analyze a call transcript</h2>
          <p className="mt-1 text-sm text-gray-600">
            Analyze the prospect’s saved call history without pasting anything, or analyze a specific call from its transcript or recording. Audio analysis fills and saves all eight editable stages automatically.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div>
            <h3 className="font-semibold text-gray-900">Prospect history summary</h3>
            <p className="mt-1 text-sm text-gray-600">Pulls the saved prospect profile, previous calls, and stored stage results from the database. No transcript paste is required.</p>
          </div>
          <button type="button" onClick={() => void analyzeProspectHistory()} disabled={historyAnalyzing || fullAnalyzing || loadingStages} className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50">
            {historyAnalyzing ? "Analysing saved prospect history..." : "Analyse saved prospect history"}
          </button>
          {historySummary && (
            <div className="space-y-3 rounded-lg border border-indigo-100 bg-white p-4" aria-live="polite">
              <p className="text-xs text-gray-500">Based on {historySummary.call_count} saved call(s)</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{historySummary.summary}</p>
              {historySummary.key_points.length > 0 && <div><h4 className="text-sm font-semibold text-gray-900">Key points</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">{historySummary.key_points.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
              {historySummary.recommended_next_steps.length > 0 && <div><h4 className="text-sm font-semibold text-gray-900">Recommended next steps</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">{historySummary.recommended_next_steps.map((step, index) => <li key={index}>{step}</li>)}</ul></div>}
            </div>
          )}
        </div>

        {callMode === "audio_upload" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">Upload a recorded call</h3>
              <p className="mt-1 text-sm text-gray-600">
                Upload an existing recording to transcribe it and analyse all eight stages. Accepted formats: MP3, WAV, M4A, MP4, OGG, or WebM. Maximum file size: 25 MB.
              </p>
            </div>
            <input
              ref={audioFileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,.mpeg,audio/*,video/webm"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setError("");
                setNotice("");
                if (selected) {
                  const validationError = validateAudioFile(selected);
                  if (validationError) {
                    setAudioFile(null);
                    event.target.value = "";
                    setError(validationError);
                    return;
                  }
                }
                setAudioFile(selected);
              }}
              disabled={fullAnalyzing || loadingStages}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium file:text-gray-700"
            />
            {audioFile && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                <p className="break-all text-xs text-gray-600">
                  Selected: <strong>{audioFile.name}</strong> ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAudioFile(null);
                    if (audioFileInputRef.current) audioFileInputRef.current.value = "";
                  }}
                  disabled={fullAnalyzing || loadingStages}
                  className="text-xs font-semibold text-red-700 underline disabled:opacity-50"
                >
                  Remove file
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => void uploadAndAnalyzeAudio(audioFile)}
              disabled={!audioFile || fullAnalyzing || loadingStages}
              className="rounded-lg border border-[#243b70] px-4 py-2.5 text-sm font-semibold text-[#243b70] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fullAnalyzing ? "Transcribing and analysing..." : "Upload, transcribe and analyse all stages"}
            </button>
          </div>
        )}

        {callMode === "guided_live" && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div>
              <h3 className="font-semibold text-gray-900">Record with your browser microphone</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                This records audio from the microphone you choose in your browser. It does not automatically capture both sides of a phone call happening on another device. Get the consent required from everyone being recorded before you begin. Audio is not uploaded until you explicitly submit it below.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={recordingConsent}
                onChange={(event) => setRecordingConsent(event.target.checked)}
                disabled={isRecording || recordingStarting || fullAnalyzing}
                className="mt-1 accent-[#243b70]"
              />
              <span>I confirm I have informed the people being recorded and have obtained any consent required to record this conversation.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={!recordingConsent || recordingStarting || fullAnalyzing || loadingStages}
                  className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {recordingStarting ? "Requesting microphone..." : recordingFile ? "Record again" : "Start recording"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Stop recording
                </button>
              )}
              {isRecording && (
                <span role="status" className="self-center text-sm font-medium text-red-700">
                  <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  Recording · {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {recordingFile && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3">
                <p className="break-all text-sm text-gray-700">
                  Recording ready: <strong>{recordingFile.name}</strong> ({(recordingFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
                {recordingUrl && (
                  <audio controls preload="metadata" src={recordingUrl} className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void uploadAndAnalyzeAudio(recordingFile)}
                    disabled={fullAnalyzing || loadingStages || isRecording}
                    className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {fullAnalyzing ? "Transcribing and analysing..." : "Submit recording for transcription and analysis"}
                  </button>
                  <button
                    type="button"
                    onClick={discardRecording}
                    disabled={fullAnalyzing || isRecording}
                    className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Discard recording
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Recording remains in this browser until you submit it. The server accepts files up to 25 MB; longer recordings may need to be split or compressed.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="call-transcript" className="mb-2 block text-sm font-medium text-gray-700">
            Call transcript
          </label>
          <textarea
            id="call-transcript"
            rows={6}
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              latestTranscriptRef.current = event.target.value;
              finalTranscriptRef.current = event.target.value;
            }}
            placeholder="Paste the conversation transcript here..."
            disabled={analyzing || loadingStages}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            Target stage: Stage {expanded ?? 1} — {STAGES[(expanded ?? 1) - 1].title}. Open another stage before analyzing to change the target.
          </p>
        </div>

        {callMode === "guided_live" && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div>
              <h3 className="font-semibold text-gray-900">Live next-step guidance</h3>
              <p className="mt-1 text-sm text-gray-600">
                During browser recording, speech is transcribed when supported and the assistant refreshes suggestions after you pause. You can also request guidance manually from the transcript. Browser speech recognition availability and accuracy vary.
              </p>
              {isRecording && (
                <div className="rounded-lg border border-blue-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Live transcription status
                  </p>
                  <p className="mt-1 text-sm text-gray-800">{liveTranscriptionStatus}</p>
                  {liveTranscriptPreview && (
                    <p className="mt-2 text-sm italic text-gray-600">
                      Hearing: {liveTranscriptPreview}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void getLiveSuggestion(latestTranscriptRef.current || transcript)}
              disabled={loadingLiveSuggestion || loadingStages || !transcript.trim()}
              className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingLiveSuggestion ? "Getting suggestion..." : "Suggest what to say next"}
            </button>
            {liveSuggestion && (
              <div aria-live="polite" className="space-y-2 rounded-lg border border-blue-200 bg-white p-4">
                <h4 className="font-semibold text-gray-900">Suggested next sentence</h4>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{liveSuggestion.suggestion || "No suggestion was returned. Add more transcript context and try again."}</p>
                {liveSuggestion.reason && <p className="text-sm text-gray-600"><strong>Why:</strong> {liveSuggestion.reason}</p>}
                <p className="border-t border-gray-100 pt-2 text-xs text-gray-500">This suggestion does not change outcomes, save notes, or mark any stage complete.</p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void analyzeTranscript()}
          disabled={analyzing || loadingStages || !transcript.trim()}
          className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzing ? "Analyzing transcript..." : "Analyze transcript with AI"}
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void analyzeEntireCall()}
            disabled={fullAnalyzing || analyzing || loadingStages || !transcript.trim()}
            className="rounded-lg border border-[#243b70] px-4 py-2.5 text-sm font-semibold text-[#243b70] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fullAnalyzing ? "Analysing all stages..." : "Analyse entire call + prospect history"}
          </button>
        </div>

        {fullAnalysis && (
          <div className="space-y-3 rounded-xl border border-green-200 bg-green-50/50 p-4">
            <div>
              <h3 className="font-semibold text-gray-900">Full-call analysis ready for review</h3>
              {fullAnalysis.overall_summary && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{fullAnalysis.overall_summary}</p>}
              {fullAnalysis.history_assessment && <p className="mt-2 text-sm text-gray-700"><strong>Prospect history:</strong> {fullAnalysis.history_assessment}</p>}
              <p className="mt-2 text-xs text-gray-600">AI results have been placed into editable stage drafts. Review the eight stages below and save when ready.</p>
            </div>
            <button
              type="button"
              onClick={() => void saveAllAnalyzedStages()}
              disabled={savingAll || fullAnalyzing || loadingStages}
              className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {savingAll ? "Saving all stages..." : "Save all analysed stages"}
            </button>
          </div>
        )}

        {aiAnalysis && (
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">AI suggestions · Stage {aiAnalysis.stage_number}</h3>
              <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-900">
                Assessment: {aiAnalysis.suggested_outcome.replaceAll("_", " ")}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800">Prospect&apos;s words</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{aiAnalysis.prospect_words || "No exact prospect quotation identified."}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Caller notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{aiAnalysis.caller_notes || "No notes suggested."}</p>
            </div>

            {aiAnalysis.evidence.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Evidence from transcript</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {aiAnalysis.evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              </div>
            )}
            {aiAnalysis.missing_information.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Missing information</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {aiAnalysis.missing_information.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              </div>
            )}
            {aiAnalysis.uncertainty && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Uncertainty</p>
                <p className="mt-1 text-sm text-gray-700">{aiAnalysis.uncertainty}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-blue-200 pt-3 sm:flex-row">
              <button
                type="button"
                onClick={applyAIAnalysis}
                className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58]"
              >
                Apply suggested words and notes
              </button>
              <p className="self-center text-xs text-gray-600">
                This does not select an outcome, mark the stage complete, or save it. Review and save manually.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-3">
        {STAGES.map((stage, index) => {
          const n = index + 1;
          const draft = drafts[n];
          const isOpen = expanded === n;
          const isComplete = draft?.status === "complete";

          return (
            <section
              key={stage.title}
              className={`overflow-hidden rounded-xl border bg-white ${
                isComplete ? "border-green-200" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : n)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 sm:p-5"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete
                      ? "bg-green-100 text-green-700"
                      : "bg-[#edf1fb] text-[#243b70]"
                  }`}
                >
                  {isComplete ? "✓" : n}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900">
                    Stage {n} — {stage.title}
                  </span>

                  <span className="mt-1 block text-xs text-gray-500">
                    {isComplete
                      ? "Completed"
                      : draft?.outcome_key
                        ? "Outcome selected · Not completed"
                        : "Not completed"}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className="text-xl text-gray-400"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-5 border-t border-gray-100 p-4 sm:p-5">
                  <p className="text-sm text-gray-600">
                    {stage.prompt}
                  </p>

                  <div className="space-y-2">
                    {stage.options.map(([key, label, explanation]) => (
                      <label
                        key={key}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                          isReadOnly || loadingStages
                            ? "cursor-default"
                            : "cursor-pointer"
                        } ${
                          draft?.outcome_key === key
                            ? "border-[#526a9d] bg-[#f5f7fc]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`stage-${n}`}
                          checked={draft?.outcome_key === key}
                          disabled={isReadOnly || loadingStages}
                          onChange={() =>
                            update(n, { outcome_key: key })
                          }
                          className="mt-1 accent-[#243b70]"
                        />

                        <span className="flex-1">
                          <span className="block text-sm font-medium text-gray-800">
                            {label}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-gray-500">
                            {explanation}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label
                      htmlFor={`words-${n}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Prospect&apos;s exact words{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>

                    <textarea
                      id={`words-${n}`}
                      rows={3}
                      value={draft?.prospect_words ?? ""}
                      disabled={isReadOnly || loadingStages}
                      onChange={(event) =>
                        update(n, {
                          prospect_words: event.target.value,
                        })
                      }
                      placeholder="Write what the prospect actually said..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`notes-${n}`}
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Your notes{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>

                    <textarea
                      id={`notes-${n}`}
                      rows={2}
                      value={draft?.caller_notes ?? ""}
                      disabled={isReadOnly || loadingStages}
                      onChange={(event) =>
                        update(n, {
                          caller_notes: event.target.value,
                        })
                      }
                      placeholder="Add context or a reminder..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-600"
                    />
                  </div>

                  {!isReadOnly && (
                    <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => void save(n, false)}
                        disabled={saving === n || loadingStages}
                        className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {saving === n ? "Saving..." : "Save progress"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void save(n, true)}
                        disabled={saving === n || loadingStages}
                        className="rounded-lg bg-[#243b70] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#192c58] disabled:opacity-50"
                      >
                        {saving === n
                          ? "Saving..."
                          : isComplete
                            ? "Save changes"
                            : "✓ Mark complete"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {callStatus === "in_progress" && (
        <footer className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-gray-500">
            Ending the call does not mark unfinished stages complete.
          </p>

          <button
            type="button"
            onClick={() => void endCall()}
            disabled={ending || loadingStages}
            className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {ending ? "Ending call..." : "End call"}
          </button>
        </footer>
      )}
    </div>
  );
}