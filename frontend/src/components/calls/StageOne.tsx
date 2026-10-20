"use client";

import { useState } from "react";

export type StageOneOutcome =
  | "intended_person_confirmed"
  | "gatekeeper_or_identity_clarification"
  | "busy_or_callback"
  | "wrong_person_or_outdated_contact"
  | "connection_problem_or_disconnection"
  | "other_or_unclear";

export type StageOneResult = {
  stage_number: 1;
  outcome: StageOneOutcome | "";
  prospect_words: string;
  caller_notes: string;
  callback_date_time: string;
  referral_details: string;
};

type StageOneAction = "save" | "continue" | "end";

type StageOneProps = {
  /** True only when guiding the caller during a live recording session. */
  showLiveGuidance: boolean;
  initialResult?: Partial<StageOneResult>;
  saving?: boolean;
  onSave: (
    result: StageOneResult,
    action: StageOneAction,
  ) => Promise<void>;
};

const OUTCOMES: {
  id: StageOneOutcome;
  title: string;
  cases: string;
  explanation: string;
  guidance: string;
}[] = [
  {
    id: "intended_person_confirmed",
    title: "Intended person confirmed",
    cases: "Case 1",
    explanation:
      "The person confirms that they are the prospect you intended to reach.",
    guidance:
      "Introduce yourself and your company clearly. Continue when you are ready.",
  },
  {
    id: "gatekeeper_or_identity_clarification",
    title: "Gatekeeper or identity clarification",
    cases: "Cases 2 and 3",
    explanation:
      "A receptionist or assistant answers, offers a transfer, or the person asks who is calling.",
    guidance:
      "If a gatekeeper answers, record the situation and decide whether to transfer, continue, or end. If the prospect asks who is calling, repeat your name and company before continuing.",
  },
  {
    id: "busy_or_callback",
    title: "Busy or callback requested",
    cases: "Case 4",
    explanation:
      "The prospect cannot talk now or asks you to call back later. Being busy does not automatically mean rejection.",
    guidance:
      "Respect their availability. If a callback is agreed, record the date and time if provided. End the call if appropriate.",
  },
  {
    id: "wrong_person_or_outdated_contact",
    title: "Wrong person or outdated contact",
    cases: "Case 5",
    explanation:
      "The number belongs to someone else, or the intended person no longer works at the listed company.",
    guidance:
      "Do not force the conversation into the next stage. End the call or record a referral if the person offers one.",
  },
  {
    id: "connection_problem_or_disconnection",
    title: "Silence, poor audio, or unexpected disconnection",
    cases: "Cases 6 and 7",
    explanation:
      "There is silence, repeated greetings, poor audio, or the call ends unexpectedly.",
    guidance:
      "Retry if appropriate. Otherwise, end the call and mark another attempt if needed. Preserve Stage 1 as the last stage reached.",
  },
  {
    id: "other_or_unclear",
    title: "Other or unclear response",
    cases: "Fallback",
    explanation:
      "Something unexpected happened, or the caller cannot confidently identify the outcome.",
    guidance:
      "Record what actually happened. Do not guess the outcome or force progression.",
  },
];

export default function StageOne({
  showLiveGuidance,
  initialResult,
  saving = false,
  onSave,
}: StageOneProps) {
  const [selectedOutcome, setSelectedOutcome] =
    useState<StageOneOutcome | "">(
      initialResult?.outcome ?? "",
    );

  const [expandedOutcome, setExpandedOutcome] =
    useState<StageOneOutcome | "">("");

  const [prospectWords, setProspectWords] = useState(
    initialResult?.prospect_words ?? "",
  );

  const [callerNotes, setCallerNotes] = useState(
    initialResult?.caller_notes ?? "",
  );

  const [callbackDateTime, setCallbackDateTime] = useState(
    initialResult?.callback_date_time ?? "",
  );

  const [referralDetails, setReferralDetails] = useState(
    initialResult?.referral_details ?? "",
  );

  const [localError, setLocalError] = useState("");

  const isCallback =
    selectedOutcome === "busy_or_callback";

  const isReferral =
    selectedOutcome === "wrong_person_or_outdated_contact" ||
    selectedOutcome === "gatekeeper_or_identity_clarification";

  const buildResult = (): StageOneResult => ({
    stage_number: 1,
    outcome: selectedOutcome,
    prospect_words: prospectWords.trim(),
    caller_notes: callerNotes.trim(),
    callback_date_time: callbackDateTime,
    referral_details: referralDetails.trim(),
  });

  const handleAction = async (action: StageOneAction) => {
    setLocalError("");

    if (!selectedOutcome) {
      setLocalError("Select what happened before saving Stage 1.");
      return;
    }

    try {
      await onSave(buildResult(), action);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "Could not save Stage 1. Please try again.",
      );
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      {/* Stage heading */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#526a9d]">
          Stage 1 of 8
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Opening
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Confirm who answered, establish the caller&apos;s identity,
          and determine whether the conversation can proceed.
        </p>
      </div>

      {/* Progress indicator */}
      <div
        className="grid grid-cols-8 gap-1.5"
        aria-label="Call stage progress"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full ${
              index === 0 ? "bg-[#243b70]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Outcome options */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            What happened?
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Select the closest match. Expand the arrow to see its
            explanation.
          </p>
        </div>

        {OUTCOMES.map((item) => {
          const selected = selectedOutcome === item.id;
          const expanded = expandedOutcome === item.id;

          return (
            <div
              key={item.id}
              className={`overflow-hidden rounded-xl border bg-white transition ${
                selected
                  ? "border-[#526a9d] ring-1 ring-[#526a9d]/20"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Selecting the outcome is separate from expanding it. */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutcome(item.id);
                    setLocalError("");
                  }}
                  aria-pressed={selected}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-[#243b70] bg-[#243b70]"
                        : "border-gray-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {item.cases}
                    </span>
                  </span>
                </button>

                {/* Arrow only expands/collapses the explanation. */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOutcome(expanded ? "" : item.id)
                  }
                  aria-expanded={expanded}
                  aria-label={
                    expanded
                      ? `Hide explanation for ${item.title}`
                      : `Show explanation for ${item.title}`
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-5 w-5 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {expanded && (
                <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-4 py-4 pl-12">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      What this means
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Guidance is shown only in live-call mode. */}
                  {showLiveGuidance && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <p className="text-sm font-semibold text-blue-900">
                        What to do next
                      </p>
                      <p className="mt-1 text-sm leading-6 text-blue-900">
                        {item.guidance}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conditional fields */}
      {isCallback && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="stage1-callback"
            className="block text-sm font-semibold text-gray-900"
          >
            Agreed callback date and time
          </label>

          <p className="mt-1 text-sm text-gray-500">
            Fill this in only if the prospect agreed to a callback.
          </p>

          <input
            id="stage1-callback"
            type="datetime-local"
            value={callbackDateTime}
            onChange={(event) =>
              setCallbackDateTime(event.target.value)
            }
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/15"
          />
        </div>
      )}

      {isReferral && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label
            htmlFor="stage1-referral"
            className="block text-sm font-semibold text-gray-900"
          >
            Referral or transfer details
          </label>

          <p className="mt-1 text-sm text-gray-500">
            Record the person's name, role, contact details, or transfer
            information only if it was actually provided.
          </p>

          <textarea
            id="stage1-referral"
            value={referralDetails}
            onChange={(event) =>
              setReferralDetails(event.target.value)
            }
            rows={3}
            placeholder="e.g. Referred me to the operations manager..."
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/15"
          />
        </div>
      )}

      {/* Prospect's exact words */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label
          htmlFor="stage1-prospect-words"
          className="block text-sm font-semibold text-gray-900"
        >
          Prospect&apos;s words
          <span className="ml-2 font-normal text-gray-400">
            Optional
          </span>
        </label>

        <p className="mt-1 text-sm text-gray-500">
          Capture what the prospect actually said. Keep their wording
          separate from your interpretation.
        </p>

        <textarea
          id="stage1-prospect-words"
          value={prospectWords}
          onChange={(event) => setProspectWords(event.target.value)}
          rows={3}
          placeholder="e.g. I'm about to enter a meeting. Could you call tomorrow?"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/15"
        />
      </div>

      {/* Caller notes */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label
          htmlFor="stage1-caller-notes"
          className="block text-sm font-semibold text-gray-900"
        >
          Caller notes
          <span className="ml-2 font-normal text-gray-400">
            Optional
          </span>
        </label>

        <textarea
          id="stage1-caller-notes"
          value={callerNotes}
          onChange={(event) => setCallerNotes(event.target.value)}
          rows={2}
          placeholder="Anything else to record about this opening..."
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/15"
        />
      </div>

      {localError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {localError}
        </div>
      )}

      {/* Selection is not the same as stage completion. */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAction("end")}
          className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          End Call and Save
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAction("save")}
            className="rounded-lg border border-[#243b70] px-5 py-3 text-sm font-semibold text-[#243b70] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Stage"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleAction("continue")}
            className="rounded-lg bg-[#243b70] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save and Continue"}
          </button>
        </div>
      </div>
    </section>
  );
}