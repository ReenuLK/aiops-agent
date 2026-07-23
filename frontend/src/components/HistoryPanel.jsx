import { useEffect, useState, useCallback, Fragment } from "react";
import { getHistory } from "../api";
import {
  History,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Box,
  Wrench,
  Loader2,
} from "lucide-react";

const RISK_BADGES = {
  low: {
    label: "Low",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  high: {
    label: "High",
    bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
};

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActionBadge({ autoExecuted, actionSuccess }) {
  if (!autoExecuted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
        Suggested Only
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-mono border ${
        actionSuccess
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
      }`}
    >
      {actionSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertOctagon className="w-3 h-3 text-rose-400" />}
      Auto-Executed
    </span>
  );
}

export default function HistoryPanel() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistory(50);
      setIncidents(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredIncidents = incidents.filter(
    (i) =>
      i.container_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.root_cause?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.suggested_fix?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Incident Audit Trail
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                {incidents.length} Records
              </span>
            </h3>
            <p className="text-xs text-slate-400">Historical log of AIOps autonomous diagnostic events</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all w-48 font-mono"
            />
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : "text-slate-400"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs px-4 py-2.5 font-mono">
          {error}
        </div>
      )}

      {/* Table Content */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading && incidents.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-sm font-medium">Loading audit history...</span>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
            <History className="w-10 h-10 text-slate-600 mb-2 opacity-60" />
            <p className="font-medium text-slate-300">No incident logs found</p>
            <p className="text-xs text-slate-500 mt-1">Trigger a scenario or ask the assistant to generate logs</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider sticky top-0 backdrop-blur-md border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target Container</th>
                <th className="py-3 px-4">Root Cause Diagnosis</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Remediation Status</th>
                <th className="py-3 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredIncidents.map((incident) => {
                const isExpanded = expandedId === incident.id;
                const riskBadge = RISK_BADGES[incident.risk_level] || {
                  label: incident.risk_level,
                  bg: "bg-slate-800 text-slate-300 border-slate-700",
                };

                return (
                  <Fragment key={incident.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isExpanded ? "bg-slate-800/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatTimestamp(incident.created_at)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{incident.container_name || "System"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate font-mono">
                        {incident.root_cause}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${riskBadge.bg}`}>
                          {riskBadge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <ActionBadge
                          autoExecuted={incident.auto_executed}
                          actionSuccess={incident.action_success}
                        />
                      </td>

                      <td className="py-3 px-2 text-right text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-950/80">
                        <td colSpan={6} className="px-6 py-4 border-t border-b border-slate-800/80 text-xs">
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                                <Wrench className="w-4 h-4 text-sky-400" />
                                <span>Detailed Remediation Breakdown</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[11px]">
                                Event ID: {incident.id}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-slate-400 font-medium">Suggested Fix Strategy:</span>
                                <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                                  {incident.suggested_fix}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-medium">Confidence Score:</span>
                                  <span className="font-mono text-sky-400 font-semibold">
                                    {incident.confidence}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-sky-400 rounded-full"
                                    style={{ width: `${incident.confidence}%` }}
                                  />
                                </div>

                                <div className="pt-2 flex items-center justify-between text-slate-400">
                                  <span>Intent Classifier:</span>
                                  <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                                    {incident.intent || "diagnostic_query"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}