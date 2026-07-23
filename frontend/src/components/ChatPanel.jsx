import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";
import {
  Bot,
  User,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Wrench,
  ShieldAlert,
  Loader2,
  Terminal,
  Zap,
} from "lucide-react";

const RISK_CONFIG = {
  low: {
    label: "LOW RISK",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  medium: {
    label: "MEDIUM RISK",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  high: {
    label: "HIGH RISK",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
};

const SUGGESTED_PROMPTS = [
  "Why is my service down?",
  "Fix demo-oom container",
  "Check bad nginx config",
  "How to resolve port conflict?",
];

function DiagnosisCard({ diagnosis, actionTaken }) {
  if (!diagnosis) return null;

  const risk = RISK_CONFIG[diagnosis.risk_level] || {
    label: diagnosis.risk_level?.toUpperCase() || "UNKNOWN",
    color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  };

  return (
    <div className="mt-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2.5 shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Wrench className="w-3.5 h-3.5 text-sky-400" />
          <span>AIOps Incident Diagnostics</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${risk.color}`}>
          {risk.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <div>
          <span className="text-slate-400 font-medium">Root Cause: </span>
          <span className="text-slate-200 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            {diagnosis.root_cause}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Suggested Fix: </span>
          <span className="text-slate-200">{diagnosis.suggested_fix}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
        <div className="flex items-center gap-1">
          <span>Confidence Score:</span>
          <span className="font-mono text-sky-400 font-semibold">{diagnosis.confidence}%</span>
        </div>
      </div>

      {actionTaken && (
        <div className="pt-2 border-t border-slate-800/80">
          {actionTaken.auto_executed ? (
            <div
              className={`p-2 rounded-lg text-xs flex items-center gap-2 font-mono ${
                actionTaken.success
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
              }`}
            >
              {actionTaken.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>
                Auto-executed: <strong>{actionTaken.action}</strong> (
                {actionTaken.success ? "Succeeded" : "Failed"})
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Awaiting manual approval for execution</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ role, content, diagnosis, actionTaken }) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 h-fit">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-md ${
          isUser
            ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-none"
            : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none"
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {!isUser && diagnosis && (
          <DiagnosisCard diagnosis={diagnosis} actionTaken={actionTaken} />
        )}
      </div>

      {isUser && (
        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 shrink-0 h-fit">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your AIOps Copilot. I continuously monitor container telemetry, logs, and failure scenarios. How can I help you troubleshoot today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(customText) {
    const textToSend = typeof customText === "string" ? customText : input;
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    if (typeof customText !== "string") setInput("");
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
        { role: "assistant", content: `Error communicating with agent: ${e.message}` },
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
    <div className="glass-panel rounded-xl border border-slate-800 flex flex-col h-[520px] shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              AIOps Agent Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">Autonomous incident diagnosis & auto-remediation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>LLM Agent</span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Prompts:
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-[11px] font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 rounded-full px-2.5 py-0.5 whitespace-nowrap transition-all disabled:opacity-50 hover:border-slate-500"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
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
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono bg-slate-900/80 border border-slate-800 rounded-xl p-3 w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing container telemetry & logs...</span>
          </div>
        )}
      </div>

      {/* Input Form Footer */}
      <div className="border-t border-slate-800 p-3 bg-slate-900/60 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI agent: e.g. 'Why is bad-nginx crashing?'"
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50 transition-all font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium text-xs hover:from-sky-400 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}