import { useEffect, useState, useCallback } from "react";
import {
  getContainers,
  getContainerStats,
  startContainer,
  stopContainer,
  restartContainer,
} from "../api";
import {
  Play,
  Square,
  RotateCw,
  Box,
  Cpu,
  HardDrive,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const STATUS_CONFIG = {
  running: {
    label: "Running",
    color: "bg-emerald-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    pulse: "status-pulse-green",
  },
  exited: {
    label: "Stopped",
    color: "bg-rose-500",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    pulse: "status-pulse-red",
  },
  restarting: {
    label: "Restarting",
    color: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    pulse: "status-pulse-yellow",
  },
  paused: {
    label: "Paused",
    color: "bg-slate-400",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    pulse: "",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: "bg-slate-500",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    pulse: "",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse}`} />
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

function UsageBar({ value, max = 100, label, unit = "%" }) {
  if (value == null) return <span className="text-slate-500 font-mono text-xs">—</span>;

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  let barColor = "bg-sky-500";
  if (percentage > 85) barColor = "bg-rose-500";
  else if (percentage > 60) barColor = "bg-amber-500";

  return (
    <div className="w-full max-w-[120px] space-y-1">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-slate-300 font-medium">
          {value.toFixed(label === "mem" ? 0 : 1)}
          <span className="text-slate-500 text-[10px] ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ContainerRow({ container, stats, onAction, actionLoading }) {
  const isRunning = container.status === "running";
  const isLoading = actionLoading;

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors group">
      <td className="py-3.5 px-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 group-hover:border-slate-600 transition-colors mt-0.5">
            <Box className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-2">
              {container.name}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[180px]" title={container.image}>
              {container.image}
            </div>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4">
        <StatusBadge status={container.status} />
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <UsageBar value={stats?.cpu_percent} label="cpu" unit="%" />
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <UsageBar value={stats?.mem_usage_mb} max={512} label="mem" unit="MB" />
        </div>
      </td>

      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onAction(container.id, "start")}
            disabled={isLoading || isRunning}
            title="Start Container"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            <span>Start</span>
          </button>

          <button
            onClick={() => onAction(container.id, "stop")}
            disabled={isLoading || !isRunning}
            title="Stop Container"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 fill-current" />}
            <span>Stop</span>
          </button>

          <button
            onClick={() => onAction(container.id, "restart")}
            disabled={isLoading}
            title="Restart Container"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
            <span>Restart</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ContainerList({ onStatsUpdated }) {
  const [containers, setContainers] = useState([]);
  const [statsById, setStatsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchContainers = useCallback(async () => {
    try {
      const data = await getContainers();
      setContainers(data);
      setError(null);

      const runningContainers = data.filter((c) => c.status === "running");
      const statsEntries = await Promise.all(
        runningContainers.map(async (c) => {
          try {
            const stats = await getContainerStats(c.id);
            return [c.id, stats];
          } catch {
            return [c.id, null];
          }
        })
      );
      const newStatsMap = Object.fromEntries(statsEntries);
      setStatsById(newStatsMap);

      if (onStatsUpdated) {
        onStatsUpdated({ containers: data, statsMap: newStatsMap });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  async function handleAction(containerId, action) {
    setActionLoadingId(containerId);
    try {
      if (action === "start") await startContainer(containerId);
      if (action === "stop") await stopContainer(containerId);
      if (action === "restart") await restartContainer(containerId);
      await fetchContainers();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredContainers = containers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.image.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === "all" ||
      (statusFilter === "running" && c.status === "running") ||
      (statusFilter === "stopped" && c.status !== "running");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-xl border border-slate-800">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Containers Fleet
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 border border-slate-700">
                {containers.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Live docker container stats & action controls</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search containers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all w-44"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                statusFilter === "all" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("running")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                statusFilter === "running" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setStatusFilter("stopped")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                statusFilter === "stopped" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Stopped
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs px-4 py-2.5 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
          <span className="text-sm font-medium">Scanning Docker daemon...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Container Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">CPU %</th>
                <th className="py-3 px-4">RAM Usage</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredContainers.map((c) => (
                <ContainerRow
                  key={c.id}
                  container={c}
                  stats={statsById[c.id]}
                  onAction={handleAction}
                  actionLoading={actionLoadingId === c.id}
                />
              ))}
            </tbody>
          </table>

          {filteredContainers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <Box className="w-10 h-10 text-slate-600 mb-2 opacity-60" />
              <p className="font-medium text-slate-300">No matching containers found</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting filters or start Docker daemon</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}