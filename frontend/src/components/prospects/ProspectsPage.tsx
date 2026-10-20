
import type { Prospect } from "@/types";

type ProspectsPageProps = {
  prospects: Prospect[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string;
  success: string;
  onNewProspect: () => void;
  onStartCall: () => void;
  onRetry: () => void;
};

export default function ProspectsPage({
  prospects,
  search,
  setSearch,
  loading,
  error,
  success,
  onNewProspect,
  onStartCall,
  onRetry,
}: ProspectsPageProps) {
  const stats = [
    { label: "Total prospects", value: prospects.length, icon: "◉" },
    { label: "Follow-ups", value: "—", icon: "↻" },
    { label: "Meetings agreed", value: "—", icon: "✓" },
  ];

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Your prospects
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage conversations and never lose track of a follow-up.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onNewProspect}
            className="rounded-lg bg-[#243b70] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#192c58]"
          >
            + New prospect
          </button>

          <button
            type="button"
            onClick={onStartCall}
            disabled={prospects.length === 0}
            className="rounded-lg bg-[#243b70] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#192c58] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Start New Call
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            onClick={onRetry}
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <span className="text-lg text-[#526a9d]">{stat.icon}</span>
            </div>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">All prospects</h3>
            <p className="mt-1 text-xs text-gray-500">
              Live data from your database
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <span className="absolute left-3 top-3 text-gray-400">⌕</span>
            <input
              aria-label="Search prospects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or company..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#526a9d] focus:ring-2 focus:ring-[#526a9d]/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4 font-medium">Prospect</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Email</th>
                <th className="px-5 py-4 font-medium">Phone</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Loading prospects...
                  </td>
                </tr>
              ) : prospects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    {search
                      ? "No prospects match your search."
                      : "No prospects yet. Click New prospect to add one."}
                  </td>
                </tr>
              ) : (
                prospects.map((prospect) => {
                  const initials = prospect.full_name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={prospect.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf1fb] text-xs font-semibold text-[#243b70]">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {prospect.full_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {prospect.company_name || "No company added"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {prospect.job_title || "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {prospect.email || "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {prospect.phone || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          New
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
          {loading
            ? "Loading records..."
            : `Showing ${prospects.length} prospect${
                prospects.length === 1 ? "" : "s"
              }`}
        </div>
      </div>
    </>
  );
}
