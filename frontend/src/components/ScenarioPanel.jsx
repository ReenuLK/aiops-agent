import { useState } from "react";
import { triggerScenario, resetScenarios } from "../api";
import {
  FlaskConical,
  RotateCcw,
  FileCode,
  AlertTriangle,
  Network,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";

const SCENARIOS = [
  {
    key: "bad_config",
    label: "Bad Nginx Config",
    desc: "Inject invalid syntax into nginx.conf",
    icon: FileCode,
    badgeColor: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  },
  {
    key: "memory_leak",
    label: "Memory Leak (OOM)",
    desc: "Trigger high memory allocation process",
    icon: AlertTriangle,
    badgeColor: "border-rose-500/30 text-rose-400 bg-rose-500/10",
  },
  {
    key: "port_conflict",
    label: "Port Conflict",
    desc: "Simulate port binding error on container start",
    icon: Network,
    badgeColor: "border-sky-500/30 text-sky-400 bg-sky-500/10",
  },
  {
    key: "missing_env",
    label: "Missing Env Var",
    desc: "Omit required environment configuration",
    icon: KeyRound,
    badgeColor: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
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
    <div className="glass-panel rounded-xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between h-[520px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Chaos & Fault Injection</h3>
              <p className="text-[11px] text-slate-400">Simulate synthetic container failures</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={loadingKey !== null}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all font-medium"
          >
            {loadingKey === "reset" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Reset All</span>
          </button>
        </div>

        {/* Scenario Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            const isLoading = loadingKey === s.key;

            return (
              <div
                key={s.key}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-2 rounded-lg border ${s.badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                    ID: {s.key}
                  </span>
                </div>

                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-slate-200 mb-0.5">{s.label}</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
                </div>

                <button
                  onClick={() => handleTrigger(s.key)}
                  disabled={loadingKey !== null}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Injecting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-slate-400 group-hover:text-amber-400" />
                      <span>Trigger Scenario</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Status Alert Banner */}
      <div className="mt-4">
        {lastResult ? (
          <div
            className={`text-xs px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 font-mono ${
              lastResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div className="truncate">
              <strong>{lastResult.key}</strong>:{" "}
              {lastResult.success
                ? "Triggered & executed successfully"
                : `Execution failed - ${lastResult.error || "Check backend"}`}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-mono text-center py-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            Click any scenario to inject faults into the test workspace.
          </div>
        )}
      </div>
    </div>
  );
}