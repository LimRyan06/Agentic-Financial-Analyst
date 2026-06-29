"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      alert(data.message || "File uploaded successfully!");
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });
      
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "agent", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "agent", content: "Error connecting to the Agent." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

      <main className="relative max-w-5xl mx-auto p-6 md:p-12 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-8 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Agentic Financial Analyst
            </h1>
            <p className="text-sm text-slate-400 mt-1">Powered by Local Llama 3 & pgvector</p>
          </div>
          <div className="relative group">
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              onChange={handleUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="bg-indigo-600 hover:bg-indigo-500 transition-all text-white px-6 py-3 rounded-xl font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2">
              {isUploading ? "Uploading..." : "Upload Excel Data"}
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-hidden flex flex-col backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <svg className="w-16 h-16 mb-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <h2 className="text-xl font-medium">No Data Reconciled Yet</h2>
                <p className="text-sm mt-2 max-w-sm">Upload an Excel sheet and ask the agent to find discrepancies, summarize the data, or compare rows.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-5 ${
                    msg.role === "user" 
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-none shadow-lg" 
                    : "bg-white/10 text-slate-100 rounded-bl-none shadow-xl border border-white/5"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-slate-100 rounded-2xl rounded-bl-none p-5 border border-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-black/20 border-t border-white/10">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the financial agent to analyze the data..."
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 transition-colors text-white rounded-xl py-4 pl-6 pr-16 outline-none"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
