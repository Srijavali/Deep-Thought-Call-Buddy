
// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { API_URL } from "@/lib/api";

// type FollowUpTask = {
//   id: string;
//   prospect_id: string;
//   prospect_name?: string;
//   company_name?: string;
//   title: string;
//   details?: string;
//   due_at?: string | null;
//   timezone?: string;
//   status: string;
//   source_excerpt?: string;
//   needs_confirmation?: boolean;
// };

// export default function FollowUpReminderBar() {
//   const [tasks, setTasks] = useState<FollowUpTask[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [busyId, setBusyId] = useState<string | null>(null);

//   const loadTasks = useCallback(async () => {
//     try {
//       const response = await fetch(
//         `${API_URL}/follow-up-tasks?status=pending`,
//         { cache: "no-store" }
//       );

//       if (!response.ok) {
//         throw new Error(`Request failed: ${response.status}`);
//       }

//       const data = await response.json();
//       setTasks(Array.isArray(data.items) ? data.items : []);
//       setError("");
//     } catch (err) {
//       console.error("Unable to load reminders:", err);
//       setError("Couldn't load follow-up reminders. Check your backend connection.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     void loadTasks();

//     const interval = window.setInterval(() => {
//       void loadTasks();
//     }, 60_000);

//     return () => window.clearInterval(interval);
//   }, [loadTasks]);

//   const updateTask = async (
//     taskId: string,
//     status: "completed" | "dismissed"
//   ) => {
//     setBusyId(taskId);
//     setError("");

//     try {
//       const response = await fetch(
//         `${API_URL}/follow-up-tasks/${encodeURIComponent(taskId)}`,
//         {
//           method: "PATCH",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ status }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(`Update failed: ${response.status}`);
//       }

//       await loadTasks();
//     } catch (err) {
//       console.error("Unable to update reminder:", err);
//       setError("Couldn't update this reminder. Please try again.");
//     } finally {
//       setBusyId(null);
//     }
//   };

//   if (loading && tasks.length === 0) {
//     return (
//       <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
//         Loading follow-up reminders...
//       </div>
//     );
//   }

//   if (tasks.length === 0 && !error) {
//     return null;
//   }

//   return (
//     <section aria-label="Follow-up reminders" className="mb-5 space-y-3">
//       {error && (
//         <div
//           role="alert"
//           className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
//         >
//           {error}
//           <button
//             type="button"
//             onClick={() => void loadTasks()}
//             className="ml-2 font-semibold underline"
//           >
//             Retry
//           </button>
//         </div>
//       )}

//       {tasks.map((task) => (
//         <article
//           key={task.id}
//           className="rounded-xl border border-amber-200 bg-amber-50 p-4"
//         >
//           <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
//             Follow-up reminder
//           </p>

//           <h3 className="mt-1 font-semibold text-gray-900">
//             {task.prospect_name || "Prospect"}
//             {task.company_name ? ` · ${task.company_name}` : ""}
//           </h3>

//           <p className="mt-1 text-sm text-gray-800">{task.title}</p>

//           {task.due_at ? (
//             <p className="mt-2 text-xs text-gray-600">
//               Due: {new Date(task.due_at).toLocaleString()}
//             </p>
//           ) : (
//             <p className="mt-2 text-xs text-amber-800">
//               Deadline not specified.
//             </p>
//           )}

//           {task.details && (
//             <p className="mt-2 text-sm text-gray-700">{task.details}</p>
//           )}

//           {task.source_excerpt && (
//             <blockquote className="mt-2 border-l-2 border-amber-400 pl-3 text-sm italic text-gray-600">
//               “{task.source_excerpt}”
//             </blockquote>
//           )}

//           {task.needs_confirmation && (
//             <p className="mt-2 text-sm font-medium text-amber-800">
//               Confirm the follow-up timing before acting.
//             </p>
//           )}

//           <div className="mt-3 flex flex-wrap gap-2">
//             <button
//               type="button"
//               disabled={busyId === task.id || task.needs_confirmation === true}
//               onClick={() => void updateTask(task.id, "completed")}
//               className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
//             >
//               {busyId === task.id ? "Saving..." : "Complete"}
//             </button>

//             <button
//               type="button"
//               disabled={busyId === task.id}
//               onClick={() => void updateTask(task.id, "dismissed")}
//               className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
//             >
//               Dismiss
//             </button>
//           </div>
//         </article>
//       ))}
//     </section>
//   );
// }



"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type FollowUpTask = {
  id: string;
  prospect_id: string;
  prospect_name?: string;
  company_name?: string;
  title: string;
  details?: string;
  due_at?: string | null;
  timezone?: string;
  status: string;
  source_excerpt?: string;
  needs_confirmation?: boolean;
};

type TaskStatus = "completed" | "dismissed";

const REFRESH_INTERVAL_MS = 60_000;

function formatDueDate(
  dueAt: string,
  timezone?: string
): string {
  const date = new Date(dueAt);

  if (Number.isNaN(date.getTime())) {
    return "Invalid deadline";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(date);
  } catch {
    // Fall back to the browser's local timezone if the saved timezone
    // is invalid or unsupported.
    return date.toLocaleString();
  }
}

export default function FollowUpReminderBar() {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/follow-up-tasks?status=pending`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      const items =
        typeof data === "object" &&
        data !== null &&
        "items" in data &&
        Array.isArray(data.items)
          ? (data.items as FollowUpTask[])
          : [];

      setTasks(items);
      setError("");
    } catch (err) {
      console.error("Unable to load follow-up reminders:", err);

      setError(
        "Couldn't load follow-up reminders. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();

    // Keep reminders up to date while the application is open.
    const interval = window.setInterval(() => {
      void loadTasks();
    }, REFRESH_INTERVAL_MS);

    // Refresh immediately when post-call analysis saves follow-up tasks.
    const handleTasksUpdated = () => {
      void loadTasks();
    };

    window.addEventListener(
      "deepthought:follow-up-tasks-updated",
      handleTasksUpdated
    );

    // Refresh when the user returns to the browser tab.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadTasks();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "deepthought:follow-up-tasks-updated",
        handleTasksUpdated
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadTasks]);

  const updateTask = async (
    taskId: string,
    status: TaskStatus
  ) => {
    if (busyId !== null) {
      return;
    }

    setBusyId(taskId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/follow-up-tasks/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        let message = `Update failed: ${response.status}`;

        try {
          const data = await response.json();

          if (
            typeof data.detail === "string" &&
            data.detail.trim()
          ) {
            message = data.detail;
          }
        } catch {
          // Use the fallback error message.
        }

        throw new Error(message);
      }

      // Remove the completed or dismissed task immediately.
      setTasks((current) =>
        current.filter((task) => task.id !== taskId)
      );

      // Confirm the server's current pending-task list.
      await loadTasks();
    } catch (err) {
      console.error("Unable to update follow-up reminder:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Couldn't update this reminder. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div
        role="status"
        className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500"
      >
        Loading follow-up reminders...
      </div>
    );
  }

  if (tasks.length === 0 && !error) {
    return null;
  }

  return (
    <section
      aria-label="Follow-up reminders"
      className="mb-5 space-y-3"
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadTasks()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {tasks.map((task) => {
        const requiresConfirmation =
          task.needs_confirmation === true;

        return (
          <article
            key={task.id}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Follow-up reminder
              </p>

              {requiresConfirmation && (
                <span className="rounded-full border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800">
                  Confirmation needed
                </span>
              )}
            </div>

            <h3 className="mt-1 font-semibold text-gray-900">
              {task.prospect_name || "Prospect"}
              {task.company_name
                ? ` · ${task.company_name}`
                : ""}
            </h3>

            <p className="mt-1 text-sm font-medium text-gray-800">
              {task.title}
            </p>

            {task.due_at ? (
              <p className="mt-2 text-xs text-gray-600">
                <span className="font-semibold">Due:</span>{" "}
                {formatDueDate(task.due_at, task.timezone)}
                {task.timezone ? ` (${task.timezone})` : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                Deadline not confirmed.
              </p>
            )}

            {task.details && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {task.details}
              </p>
            )}

            {task.source_excerpt && (
              <blockquote className="mt-2 border-l-2 border-amber-400 pl-3 text-sm italic text-gray-600">
                “{task.source_excerpt}”
              </blockquote>
            )}

            {requiresConfirmation && (
              <p className="mt-2 text-sm font-medium text-amber-800">
                Check the original conversation and confirm the
                follow-up timing before acting.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  busyId !== null || requiresConfirmation
                }
                onClick={() =>
                  void updateTask(task.id, "completed")
                }
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  requiresConfirmation
                    ? "Confirm the follow-up timing before completing this task."
                    : "Mark this follow-up as completed."
                }
              >
                {busyId === task.id
                  ? "Saving..."
                  : "Complete"}
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() =>
                  void updateTask(task.id, "dismissed")
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyId === task.id
                  ? "Saving..."
                  : "Dismiss"}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}