import { useEffect, useState, useCallback, Fragment } from "react";
import { getHistory } from "../api";

const RISK_BADGE = {
  low: "bg-green-900/50 text-green-300",
  medium: "bg-yellow-900/50 text-yellow-300",
  high: "bg-red-900/50 text-red-300",
};

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionBadge({ autoExecuted, actionSuccess }) {
  if (!autoExecuted) {
    return <span className="text-xs text-slate-400">Suggested only</span>;
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${
        actionSuccess ? "bg-blue-900/50 text-blue-300" : "bg-red-900/50 text-red-300"
      }`}
    >
      Auto-executed {actionSuccess ? "✓" : "✗"}
    </span>
  );
}

export default function HistoryPanel() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = useCallback(async () => {
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

  if (loading) {
    return <div className="text-slate-400 p-4">Loading history...</div>;
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">
          Incident History ({incidents.length})
        </h3>
        <button
          onClick={fetchHistory}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 text-sm px-4 py-2">{error}</div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="text-slate-400 text-center py-8 text-sm">
            No incidents recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0">
              <tr>
                <th className="py-2 px-4">Time</th>
                <th className="py-2 px-4">Container</th>
                <th className="py-2 px-4">Root Cause</th>
                <th className="py-2 px-4">Risk</th>
                <th className="py-2 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <Fragment key={incident.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === incident.id ? null : incident.id)
                    }
                    className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="py-2 px-4 text-slate-400 whitespace-nowrap">
                      {formatTimestamp(incident.created_at)}
                    </td>
                    <td className="py-2 px-4 font-medium">{incident.container_name}</td>
                    <td className="py-2 px-4 text-slate-300 max-w-xs truncate">
                      {incident.root_cause}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          RISK_BADGE[incident.risk_level] || "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {incident.risk_level}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <ActionBadge
                        autoExecuted={incident.auto_executed}
                        actionSuccess={incident.action_success}
                      />
                    </td>
                  </tr>
                  {expandedId === incident.id && (
                    <tr className="bg-slate-800/30">
                      <td colSpan={5} className="px-4 py-3 text-sm space-y-1">
                        <div>
                          <span className="text-slate-400">Suggested fix: </span>
                          {incident.suggested_fix}
                        </div>
                        <div className="flex gap-4">
                          <span>
                            <span className="text-slate-400">Confidence: </span>
                            {incident.confidence}%
                          </span>
                          <span>
                            <span className="text-slate-400">Intent: </span>
                            {incident.intent}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}