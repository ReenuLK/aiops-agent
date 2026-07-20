import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";

const RISK_COLORS = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

function DiagnosisCard({ diagnosis, actionTaken }) {
  if (!diagnosis) return null;

  return (
    <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm space-y-1">
      <div>
        <span className="text-slate-400">Root cause: </span>
        {diagnosis.root_cause}
      </div>
      <div>
        <span className="text-slate-400">Suggested fix: </span>
        {diagnosis.suggested_fix}
      </div>
      <div className="flex gap-4 pt-1">
        <span>
          <span className="text-slate-400">Risk: </span>
          <span className={RISK_COLORS[diagnosis.risk_level] || "text-slate-300"}>
            {diagnosis.risk_level}
          </span>
        </span>
        <span>
          <span className="text-slate-400">Confidence: </span>
          {diagnosis.confidence}%
        </span>
      </div>
      {actionTaken && (
        <div className="pt-1 text-blue-400">
          {actionTaken.auto_executed
            ? `Auto-executed: ${actionTaken.action} (${actionTaken.success ? "succeeded" : "failed"})`
            : "Awaiting approval"}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ role, content, diagnosis, actionTaken }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-100"
        }`}
      >
        <div>{content}</div>
        {!isUser && diagnosis && (
          <DiagnosisCard diagnosis={diagnosis} actionTaken={actionTaken} />
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me things like \"why is my service down?\" or \"fix demo-oom\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const result = await sendChatMessage(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          diagnosis: result.diagnosis,
          actionTaken: result.action_taken,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 flex flex-col h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <ChatBubble
            key={i}
            role={m.role}
            content={m.content}
            diagnosis={m.diagnosis}
            actionTaken={m.actionTaken}
          />
        ))}
        {loading && (
          <div className="text-slate-400 text-sm italic">Thinking...</div>
        )}
      </div>

      <div className="border-t border-slate-700 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a container..."
          disabled={loading}
          className="flex-1 bg-slate-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}