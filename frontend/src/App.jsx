import ContainerList from "./components/ContainerList";
import ChatPanel from "./components/ChatPanel";
import ScenarioPanel from "./components/ScenarioPanel";

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

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-lg font-medium mb-3">Chat</h2>
            <ChatPanel />
          </div>
          <div>
            <h2 className="text-lg font-medium mb-3">Scenarios</h2>
            <ScenarioPanel />
          </div>
        </section>
      </main>
    </div>
  );
}