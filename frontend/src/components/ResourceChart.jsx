import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getContainers, getContainerStats } from "../api";
import { Activity, Cpu, HardDrive, RefreshCw, BarChart2 } from "lucide-react";

const MAX_POINTS = 20;

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const cpu = payload.find((p) => p.dataKey === "cpu")?.value ?? 0;
    const mem = payload.find((p) => p.dataKey === "memory")?.value ?? 0;

    return (
      <div className="glass-panel p-3 rounded-lg border border-slate-700 shadow-xl text-xs font-mono space-y-1.5 min-w-[140px]">
        <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Time</span>
          <span className="text-slate-200">{label}</span>
        </div>
        <div className="flex items-center justify-between text-sky-400">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" /> CPU Load:
          </span>
          <span className="font-semibold">{cpu.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> RAM Usage:
          </span>
          <span className="font-semibold">{mem.toFixed(0)} MB</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function ResourceChart() {
  const [containers, setContainers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const historyByContainer = useRef({});
  const [activeMetric, setActiveMetric] = useState("all");

  useEffect(() => {
    async function loadContainers() {
      try {
        const data = await getContainers();
        const running = data.filter((c) => c.status === "running");
        setContainers(running);
        if (!selectedId && running.length > 0) {
          setSelectedId(running[0].id);
        }
      } catch {}
    }
    loadContainers();
    const interval = setInterval(loadContainers, 5000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    async function pollStats() {
      try {
        const stats = await getContainerStats(selectedId);
        const point = {
          time: new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          cpu: stats.cpu_percent ?? 0,
          memory: stats.mem_usage_mb ?? 0,
        };

        const existing = historyByContainer.current[selectedId] || [];
        const updated = [...existing, point].slice(-MAX_POINTS);
        historyByContainer.current[selectedId] = updated;
        setHistory(updated);
      } catch {}
    }

    pollStats();
    const interval = setInterval(pollStats, 5000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const selectedContainer = containers.find((c) => c.id === selectedId);

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-xl border border-slate-800 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Resource Telemetry
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 5s
              </span>
            </h3>
            <p className="text-xs text-slate-400">Real-time CPU and Memory consumption curve</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Metric Selector Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveMetric("all")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeMetric === "all" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setActiveMetric("cpu")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeMetric === "cpu" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              CPU %
            </button>
            <button
              onClick={() => setActiveMetric("memory")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeMetric === "memory" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              RAM (MB)
            </button>
          </div>

          {/* Container Select Dropdown */}
          <select
            value={selectedId || ""}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setHistory(historyByContainer.current[e.target.value] || []);
            }}
            className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer max-w-[200px]"
          >
            {containers.length === 0 && <option value="">No running containers</option>}
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.image})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Canvas */}
      {history.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm bg-slate-950/40 rounded-xl border border-slate-800/50">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2 opacity-80" />
          <p className="font-medium text-slate-300">Collecting live container metrics...</p>
          <p className="text-xs text-slate-500 mt-1">
            {selectedContainer ? `Monitoring ${selectedContainer.name}` : "Select a running container to begin"}
          </p>
        </div>
      ) : (
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontStyle="italic" />
              <YAxis yAxisId="cpu" stroke="#38bdf8" fontSize={10} domain={[0, "auto"]} />
              <YAxis yAxisId="mem" orientation="right" stroke="#34d399" fontSize={10} domain={[0, "auto"]} />
              <Tooltip content={<CustomTooltip />} />

              {(activeMetric === "all" || activeMetric === "cpu") && (
                <Area
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="cpu"
                  name="CPU %"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                  isAnimationActive={true}
                />
              )}

              {(activeMetric === "all" || activeMetric === "memory") && (
                <Area
                  yAxisId="mem"
                  type="monotone"
                  dataKey="memory"
                  name="Memory MB"
                  stroke="#34d399"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memGradient)"
                  isAnimationActive={true}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}