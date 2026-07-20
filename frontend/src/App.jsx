import ContainerList from "./components/ContainerList";
import ChatPanel from "./components/ChatPanel";
import ScenarioPanel from "./components/ScenarioPanel";
import HistoryPanel from "./components/HistoryPanel";
import ResourceChart from "./components/ResourceChart";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">AIOps Agent</h1>
        <p className="text-sm text-slate-400">
          Autonomous container monitoring & incident response
        </p>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-3">Containers</h2>
          <ContainerList />
        </section>

        <section>
          <ResourceChart />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-medium mb-3">Chat</h2>
            <ChatPanel />
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">Demo Controls</h2>
            <ScenarioPanel />
          </section>
        </div>

        <section>
          <h2 className="text-lg font-medium mb-3">History</h2>
          <HistoryPanel />
        </section>
      </main>
    </div>
  );
}