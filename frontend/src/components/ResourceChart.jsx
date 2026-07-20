import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getContainers, getContainerStats } from "../api";

const MAX_POINTS = 20;

export default function ResourceChart() {
  const [containers, setContainers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const historyByContainer = useRef({});

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

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Resource Usage</h3>
        <select
          value={selectedId || ""}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setHistory(historyByContainer.current[e.target.value] || []);
          }}
          className="bg-slate-800 text-sm rounded px-2 py-1 outline-none"
        >
          {containers.length === 0 && <option value="">No running containers</option>}
          {containers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {history.length < 2 ? (
        <div className="text-slate-400 text-sm text-center py-12">
          Collecting data points...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
            <YAxis yAxisId="cpu" stroke="#60a5fa" fontSize={11} />
            <YAxis yAxisId="mem" orientation="right" stroke="#34d399" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
            />
            <Legend />
            <Line
              yAxisId="cpu"
              type="monotone"
              dataKey="cpu"
              name="CPU %"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="mem"
              type="monotone"
              dataKey="memory"
              name="Memory MB"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}