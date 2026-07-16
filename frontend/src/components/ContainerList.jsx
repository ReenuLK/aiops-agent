import { useEffect, useState, useCallback } from "react";
import {
  getContainers,
  getContainerStats,
  startContainer,
  stopContainer,
  restartContainer,
} from "../api";

const STATUS_COLORS = {
  running: "bg-green-500",
  exited: "bg-red-500",
  restarting: "bg-yellow-500",
  paused: "bg-gray-400",
  created: "bg-blue-400",
};

function StatusDot({ status }) {
  const color = STATUS_COLORS[status] || "bg-gray-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-2`} />;
}

function ContainerRow({ container, stats, onAction, actionLoading }) {
  return (
    <tr className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center">
          <StatusDot status={container.status} />
          <span className="font-medium">{container.name}</span>
        </div>
        <div className="text-xs text-slate-400 pl-4">{container.image}</div>
      </td>
      <td className="py-3 px-4 text-sm capitalize">{container.status}</td>
      <td className="py-3 px-4 text-sm">
        {stats?.cpu_percent != null ? `${stats.cpu_percent.toFixed(1)}%` : "—"}
      </td>
      <td className="py-3 px-4 text-sm">
        {stats?.mem_usage_mb != null
          ? `${stats.mem_usage_mb.toFixed(0)} MB`
          : "—"}
      </td>
      <td className="py-3 px-4 text-right space-x-2">
        <button
          onClick={() => onAction(container.id, "start")}
          disabled={actionLoading || container.status === "running"}
          className="text-xs px-2 py-1 rounded bg-green-700 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button
          onClick={() => onAction(container.id, "stop")}
          disabled={actionLoading || container.status !== "running"}
          className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Stop
        </button>
        <button
          onClick={() => onAction(container.id, "restart")}
          disabled={actionLoading}
          className="text-xs px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Restart
        </button>
      </td>
    </tr>
  );
}

export default function ContainerList() {
  const [containers, setContainers] = useState([]);
  const [statsById, setStatsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchContainers = useCallback(async () => {
    try {
      const data = await getContainers();
      setContainers(data);
      setError(null);

      // Fetch stats only for running containers - stopped ones have nothing to measure
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
      setStatsById(Object.fromEntries(statsEntries));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [fetchContainers]);

  async function handleAction(containerId, action) {
    setActionLoadingId(containerId);
    try {
      if (action === "start") await startContainer(containerId);
      if (action === "stop") await stopContainer(containerId);
      if (action === "restart") await restartContainer(containerId);
      await fetchContainers(); // refresh immediately after an action
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return <div className="text-slate-400 p-6">Loading containers...</div>;
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {error && (
        <div className="bg-red-900/50 text-red-200 text-sm px-4 py-2">
          {error}
        </div>
      )}
      <table className="w-full text-left">
        <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
          <tr>
            <th className="py-3 px-4">Container</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">CPU</th>
            <th className="py-3 px-4">Memory</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => (
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
      {containers.length === 0 && (
        <div className="text-slate-400 text-center py-8">
          No containers found.
        </div>
      )}
    </div>
  );
}