"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "agent";
  content: string;
  timestamp: string;
};

type UploadedFile = {
  id: string;
  name: string;
  uploadedAt: string;
  sheets: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AgentAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.122m-1.5-2.122L14.25 14.5m-4.5 0L7.5 17.25M14.25 14.5L16.5 17.25M7.5 17.25L6 18.75M16.5 17.25L18 18.75" />
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [agentStatus, setAgentStatus] = useState<"ready" | "thinking">("ready");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── File Upload Logic ──────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    if (!file.name.match(/\.(xls|xlsx|csv)$/i)) {
      alert("Only .xls, .xlsx, and .csv files are supported.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      // Add to sidebar list
      setUploadedFiles((prev) => [
        {
          id: Date.now().toString(),
          name: file.name,
          uploadedAt: "Just now",
          sheets: Math.floor(Math.random() * 3) + 1,
        },
        ...prev,
      ]);
      // Notify in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `✅ **${file.name}** has been ingested successfully. You can now ask me to analyze, compare, or summarize the data.`,
          timestamp: getTimestamp(),
        },
      ]);
    } catch {
      alert("Error uploading file. Is the backend running?");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadFile(e.target.files[0]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) uploadFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ── Chat Logic ─────────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: getTimestamp() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setAgentStatus("thinking");
    try {
      const res = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: data.reply, timestamp: getTimestamp() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "⚠️ Could not reach the Agent. Please make sure the backend is running on port 8080.", timestamp: getTimestamp() },
      ]);
    } finally {
      setIsLoading(false);
      setAgentStatus("ready");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearData = () => {
    if (confirm("Clear all uploaded files and chat history?")) {
      setUploadedFiles([]);
      setMessages([]);
    }
  };

  // ── Quick Actions ──────────────────────────────────────────────────────────

  const quickActions = [
    {
      label: "Find discrepancies",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      label: "Summarize Sheet 1",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Compare both sheets",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d1520] text-[#e2e8f0] font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0d1117] border-r border-[#1e2d42]">

        {/* Logo */}
        <div className="p-5 border-b border-[#1e2d42]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.4)]">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3l9 4 9-4v14l-9 4-9-4V3z" opacity="0.7" />
                <path d="M12 7l9-4-9 10L3 3l9 4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Agentic</p>
              <p className="text-xs text-[#64748b] leading-none mt-0.5">Financial Analyst</p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-4 border-b border-[#1e2d42]">
          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-3">
            Upload Excel or CSV File
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-[#1e2d42] hover:border-blue-500/50 hover:bg-blue-500/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-emerald-400 font-bold text-sm">X</span>
            </div>
            <p className="text-xs text-[#64748b] leading-relaxed">
              {isUploading ? "Uploading..." : "Drag & drop your .xlsx file here"}
            </p>
            {!isUploading && (
              <>
                <p className="text-xs text-[#64748b] my-1">or</p>
                <button className="mt-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg text-xs font-medium text-white">
                  Browse Files
                </button>
                <p className="text-[10px] text-[#475569] mt-2">Supports .xlsx, .xls, .csv</p>
              </>
            )}
          </div>
        </div>

        {/* Uploaded Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#64748b] uppercase tracking-widest">
              Uploaded Files
            </p>
            <button className="text-[#475569] hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {uploadedFiles.length === 0 ? (
            <p className="text-xs text-[#475569] text-center mt-4">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#131c2b] border border-[#1e2d42] hover:border-[#2e4060] transition-colors group">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold text-[10px]">X</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {file.uploadedAt} · {file.sheets} sheet{file.sheets !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#475569] hover:text-white">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear Data Button */}
        <div className="p-4 border-t border-[#1e2d42]">
          <button
            onClick={handleClearData}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-medium transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Data
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d42] bg-[#0d1520]">
          <h1 className="text-lg font-bold text-white">Agentic Financial Analyst</h1>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            agentStatus === "ready"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              agentStatus === "ready" ? "bg-emerald-400 animate-pulse" : "bg-blue-400 animate-ping"
            }`} />
            {agentStatus === "ready" ? "Agent Ready" : "Agent Thinking..."}
          </div>
        </header>

        {/* Quick Actions */}
        <div className="px-6 py-3 flex gap-3 border-b border-[#1e2d42] bg-[#0d1520]">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.label)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131c2b] border border-[#1e2d42] hover:border-blue-500/50 hover:bg-blue-500/5 text-sm text-[#94a3b8] hover:text-white transition-all duration-200"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 select-none">
              <div className="w-16 h-16 rounded-2xl bg-[#131c2b] border border-[#1e2d42] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg">No Data Reconciled Yet</h2>
              <p className="text-sm text-[#64748b] mt-2 max-w-sm">
                Upload an Excel sheet on the left, then use the quick actions above or type a question below.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "agent" && <AgentAvatar />}
              <div className={`max-w-[70%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#1e3a5f] text-white rounded-br-sm"
                    : "bg-[#131c2b] border border-[#1e2d42] text-[#cbd5e1] rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-[#475569] px-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <AgentAvatar />
              <div className="bg-[#131c2b] border border-[#1e2d42] rounded-2xl rounded-bl-sm px-4 py-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 dot-1" />
                <span className="w-2 h-2 rounded-full bg-blue-400 dot-2" />
                <span className="w-2 h-2 rounded-full bg-blue-400 dot-3" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-6 py-4 border-t border-[#1e2d42] bg-[#0d1520]">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-[#131c2b] border border-[#1e2d42] focus-within:border-blue-500/50 rounded-2xl px-4 py-3 transition-colors">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#475569] hover:text-blue-400 transition-colors flex-shrink-0"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent to compare sheets, find discrepancies, summarize data..."
              className="flex-1 bg-transparent text-sm text-white placeholder-[#475569] outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
