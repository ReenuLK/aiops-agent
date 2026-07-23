import { useState, useCallback } from "react";
import ContainerList from "./components/ContainerList";
import ChatPanel from "./components/ChatPanel";
import ScenarioPanel from "./components/ScenarioPanel";
import HistoryPanel from "./components/HistoryPanel";
import ResourceChart from "./components/ResourceChart";
import {
  Cpu,
  Box,
  Activity,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle,
  Terminal,
  Sparkles,
  Layers,
  Server,
} from "lucide-react";

export default function App() {
  const [statsSummary, setStatsSummary] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    avgCpu: 0,
    totalMem: 0,
  });

  const handleStatsUpdated = useCallback(({ containers, statsMap }) => {
    const total = containers.length;
    const running = containers.filter((c) => c.status === "running").length;
    const stopped = total - running;

    let cpuSum = 0;
    let memSum = 0;
    let count = 0;

    Object.values(statsMap).forEach((stat) => {
      if (stat) {
        if (stat.cpu_percent != null) cpuSum += stat.cpu_percent;
        if (stat.mem_usage_mb != null) memSum += stat.mem_usage_mb;
        count++;
      }
    });

    setStatsSummary({
      total,
      running,
      stopped,
      avgCpu: count > 0 ? cpuSum / count : 0,
      totalMem: memSum,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 bg-ambient-grid flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      <div>
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo Brand */}
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
                <Cpu className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                  AIOps Agent
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Enterprise Copilot
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Autonomous container monitoring & incident remediation
                </p>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Docker Daemon: Active</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AI Remediation Engaged</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Metrics Summary Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Containers */}
            <div className="glass-panel glass-panel-hover rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Containers Fleet</span>
                <div className="text-2xl font-bold text-slate-100 font-mono mt-1 flex items-baseline gap-2">
                  {statsSummary.total}
                  <span className="text-xs text-slate-400 font-normal">total</span>
                </div>
                <div className="flex items-center gap-3 text-xs mt-2 font-mono">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {statsSummary.running} Running
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    {statsSummary.stopped} Stopped
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Box className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: CPU Utilization */}
            <div className="glass-panel glass-panel-hover rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg CPU Load</span>
                <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                  {statsSummary.avgCpu.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono">Live Docker CPU metrics</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: RAM Consumed */}
            <div className="glass-panel glass-panel-hover rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Fleet RAM Utilized</span>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {statsSummary.totalMem.toFixed(0)} <span className="text-sm font-normal">MB</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono">Aggregated memory footprint</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Agent Status */}
            <div className="glass-panel glass-panel-hover rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">AI Copilot Status</span>
                <div className="text-lg font-bold text-slate-100 font-mono mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Autonomous
                </div>
                <p className="text-xs text-emerald-400 mt-2 font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Ready & Diagnosing
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Container Fleet Table */}
          <section>
            <ContainerList onStatsUpdated={handleStatsUpdated} />
          </section>

          {/* Telemetry Chart */}
          <section>
            <ResourceChart />
          </section>

          {/* Interactive Agent & Scenarios Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <ChatPanel />
            </section>

            <section>
              <ScenarioPanel />
            </section>
          </div>

          {/* History Audit Trail */}
          <section>
            <HistoryPanel />
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-400 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>AIOps Agent v1.0.0 • Container Ops Platform</span>
          </div>
          <div className="text-slate-400">
            Powered by FastAPI, Docker Daemon, and React
          </div>
        </div>
      </footer>
    </div>
  );
}