"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  BookOpen,
  RefreshCw,
  Plus,
  Trash2,
  Menu,
  X,
  MessageSquare,
  Sparkles
} from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

interface KBItem {
  id: string;
  question: string;
  topic: string;
  answer: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "kb">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [kb, setKB] = useState<KBItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/kb/list").then(res => res.json()).then(data => setKB(data));
  }, []);

  useEffect(() => {
    if (mounted) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  if (!mounted) return <div className="h-screen bg-[#212121]" />;

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();

      if (data.answer) {
        setMessages(prev => [...prev, { role: "model", text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: "Lỗi hệ thống: " + (data.error || "Vui lòng thử lại sau.") }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", text: "Không thể kết nối với máy chủ AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const rebuildEmbeddings = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/kb/rebuild", { method: "POST" });
      alert("Dữ liệu đã được đồng bộ hóa thành công!");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-[#ececec] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? "260px" : "0px", opacity: sidebarOpen ? 1 : 0 }}
        className="bg-[#171717] flex flex-col relative z-30"
      >
        <div className="p-3 flex flex-col h-full">
          <button
            onClick={() => { setMessages([]); setActiveTab("chat"); }}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[#212121] transition-colors border border-white/10 mb-2"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Đoạn chat mới</span>
          </button>

          <nav className="flex-1 mt-4 space-y-1 overflow-y-auto scrollbar-hide">
            <SidebarButton
              icon={<MessageSquare size={18} />}
              label="Bot Vận Hành"
              active={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
            />
            <SidebarButton
              icon={<BookOpen size={18} />}
              label="Kho kiến thức"
              active={activeTab === "kb"}
              onClick={() => setActiveTab("kb")}
            />
          </nav>

          <div className="mt-auto pt-4 border-t border-white/10">
            <button
              onClick={rebuildEmbeddings}
              disabled={isSyncing}
              className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[#212121] transition-colors text-sm text-slate-400"
            >
              <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Đang đồng bộ..." : "Đồng bộ hóa dữ liệu"}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative transition-all duration-300">
        {/* Top Header Mobile/Toggle */}
        <header className="flex items-center justify-between p-4 bg-[#212121] md:bg-transparent">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
          >
            <Menu size={20} />
          </button>
          <div className="md:hidden font-bold flex items-center gap-2">
            <Bot size={20} className="text-emerald-500" />
            <span>Bot Vận Hành</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {activeTab === "chat" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-0">
              <div className="max-w-3xl mx-auto py-8 space-y-12">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center opacity-80">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <Sparkles size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Tôi có thể giúp gì cho bạn hôm nay?</h2>
                    <p className="text-slate-400 max-w-sm">HỎi về quy trình POD, chính sách GHN hoặc các nghiệp vụ bưu cục.</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex gap-6 ${msg.role === "model" ? "" : "justify-end"}`}>
                      <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-slate-700" : "bg-[#10a37f]"
                          }`}>
                          {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`space-y-4 pt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                          <div className={`whitespace-pre-wrap leading-relaxed ${msg.role === "user"
                            ? "bg-[#303030] px-4 py-2.5 rounded-2xl inline-block"
                            : "text-[16px]"
                            }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="animate-pulse flex gap-1 items-center pt-3">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 md:pb-12 border-t border-white/5 md:border-t-0">
              <div className="max-w-3xl mx-auto relative">
                <div className="flex items-end gap-2 bg-[#303030] rounded-2xl p-2.5 shadow-xl border border-white/5 transition-all focus-within:border-white/20">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'inherit';
                      if (e.target.scrollHeight < 200) {
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      } else {
                        e.target.style.height = '200px';
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                        (e.target as HTMLTextAreaElement).style.height = 'inherit';
                      }
                    }}
                    placeholder="Hỏi Bot Vận Hành về quy trình..."
                    className="flex-1 bg-transparent border-none py-2 px-3 outline-none text-[16px] resize-none max-h-[200px] scrollbar-hide text-[#ececec]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-[#ececec] disabled:bg-white/10 disabled:text-slate-600 text-black rounded-xl flex items-center justify-center transition-all active:scale-90"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="text-center text-[11px] text-slate-500 mt-3">
                  AI có thể đưa ra câu trả lời không chính xác. Hãy kiểm tra các thông tin quan trọng.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-12 px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Kho kiến thức</h2>
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Plus size={18} />
                  Thêm dữ liệu
                </button>
              </div>

              <div className="grid gap-4">
                {kb.map((item) => (
                  <div key={item.id} className="bg-[#303030] border border-white/5 p-6 rounded-xl hover:border-white/10 transition-all group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded inline-block mb-3">
                          {item.topic || "Nghiệp vụ"}
                        </span>
                        <h4 className="font-semibold text-white mb-2">{item.question}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
                      </div>
                      <button className="p-2 opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${active
        ? "bg-[#212121] text-white"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
