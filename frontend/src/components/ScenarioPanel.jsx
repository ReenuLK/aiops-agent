import { useState } from "react";
import { triggerScenario, resetScenarios } from "../api";

const SCENARIOS = [
  { key: "bad_config", label: "Bad Nginx Config" },
  { key: "memory_leak", label: "Memory Leak (OOM)" },
  { key: "port_conflict", label: "Port Conflict" },
  { key: "missing_env", label: "Missing Env Var" },
];

export default function ScenarioPanel() {
  const [loadingKey, setLoadingKey] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  async function handleTrigger(key) {
    setLoadingKey(key);
    setLastResult(null);
    try {
      const result = await triggerScenario(key);
      setLastResult({ key, success: result.success });
    } catch (e) {
      setLastResult({ key, success: false, error: e.message });
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleReset() {
    setLoadingKey("reset");
    setLastResult(null);
    try {
      const result = await resetScenarios();
      setLastResult({ key: "reset", success: result.success });
    } catch (e) {
      setLastResult({ key: "reset", success: false, error: e.message });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">
          Trigger Failure Scenario (Demo)
        </h3>
        <button
          onClick={handleReset}
          disabled={loadingKey !== null}
          className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
        >
          {loadingKey === "reset" ? "Resetting..." : "Reset All"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleTrigger(s.key)}
            disabled={loadingKey !== null}
            className="text-xs px-3 py-2 rounded bg-orange-800 hover:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loadingKey === s.key ? "Triggering..." : s.label}
          </button>
        ))}
      </div>

      {lastResult && (
        <div
          className={`mt-3 text-xs px-3 py-2 rounded ${
            lastResult.success
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          {lastResult.key}: {lastResult.success ? "triggered successfully" : `failed - ${lastResult.error || "check backend logs"}`}
        </div>
      )}
    </div>
  );
}