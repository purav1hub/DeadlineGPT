import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Task, Habit, CommitmentContract } from "../types";
import { Send, Volume2, VolumeX, MessageSquare, Flame, Sparkles, Smile, RefreshCw, AlertTriangle } from "lucide-react";
import { VoiceHelper } from "../utils/voice";

interface LiveCoachChatProps {
  tasks: Task[];
  habits: Habit[];
  contracts: CommitmentContract[];
  updateTasks?: (tasks: Task[]) => void;
}

export default function LiveCoachChat({ tasks, habits, contracts, updateTasks }: LiveCoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const defaultMsg: ChatMessage = {
      id: "initial",
      role: "model",
      content: "Welcome to DeadlineGPT, slacker. I am your AI task supervisor. Have you accomplished anything today, or are you just here to make more excuses? Tell me what you are working on, or ask for a reality check.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    return [defaultMsg];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [coachStyle, setCoachStyle] = useState<"tough" | "supportive">("tough");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasAnalyzedRef = useRef(false);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Voice clean-up on unmount
  useEffect(() => {
    return () => {
      VoiceHelper.stop();
    };
  }, []);

  const triggerContextAssessment = async (overrideTasks?: Task[]) => {
    setLoading(true);
    setAnalyzing(true);
    const activeTasks = overrideTasks || tasks;
    try {
      const systemInstruction = coachStyle === "tough"
        ? "You are DeadlineGPT, an aggressive, sarcastic, tough-love productivity coach. You absolutely hate procrastination, roll your eyes at excuses, and give incredibly blunt but useful advice based on the user's tasks, deadlines, habits, and history. Keep answers brief (max 3-4 sentences), funny, and highly actionable."
        : "You are DeadlineGPT in supportive mode. You are a warm, encouraging, but highly structured accountability partner. You help the user break down tasks, quiet their anxiety, and offer gentle encouragement to take the first step. Keep answers warm, positive, and brief (max 3 sentences).";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Analyze my current list of tasks, deadlines, habits, and contracts. Give me an immediate context-aware assessment or call-out of my situation. Be extremely specific to what is on my schedule (e.g. naming specific tasks, deadlines, exam hours, and habit streaks). Offer a quick starting plan or advice."
            }
          ],
          systemInstruction,
          tasks: activeTasks,
          habits,
          contracts,
          localTime: new Date().toString()
        }),
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        setMessages([
          {
            id: "initial_assessment",
            role: "model",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
        ]);
        if (voiceEnabled) {
          setIsSpeaking(true);
          VoiceHelper.speak(
            data.reply,
            () => setIsSpeaking(true),
            () => setIsSpeaking(false)
          );
        }
      }
    } catch (err) {
      console.error("Context-aware assessment trigger failed:", err);
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleInjectDataStructuresExam = () => {
    if (!updateTasks) return;

    const demoExam: Task = {
      id: "demo_ds_exam",
      title: "Data Structures Final Exam",
      description: "Comprehensive final covering Graph Traversals (DFS/BFS), Hash Map collisions, Binary Search Trees, and Big-O computational complexity.",
      deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      priority: "high",
      completed: false,
      category: "School",
      subtasks: [
        { id: "ds_s1", title: "Review Graph Traversals (DFS/BFS)", completed: false },
        { id: "ds_s2", title: "Practice Hash Map collisions handling", completed: false },
        { id: "ds_s3", title: "Solve 2025 Past Exam Papers", completed: false }
      ],
      createdAt: new Date().toISOString()
    };

    const cleanTasks = tasks.filter(t => t.id !== "demo_ds_exam" && t.title !== "Data Structures Final Exam");
    const updatedTasks = [demoExam, ...cleanTasks];
    updateTasks(updatedTasks);

    setMessages([
      {
        id: "demo_sim_msg",
        role: "user",
        content: "[System Trigger] Simulate Data Structures exam in 6 hours situation.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);

    setTimeout(() => {
      triggerContextAssessment(updatedTasks);
    }, 150);
  };

  // Run dynamic context analysis on first load if tasks/habits are present
  useEffect(() => {
    const hasData = (tasks && tasks.length > 0) || (habits && habits.length > 0) || (contracts && contracts.length > 0);
    if (!hasAnalyzedRef.current && hasData) {
      hasAnalyzedRef.current = true;
      triggerContextAssessment();
    }
  }, [tasks, habits, contracts]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    if (!textToSend) {
      setInput("");
    }

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    VoiceHelper.stop();
    setIsSpeaking(false);

    try {
      const systemInstruction = coachStyle === "tough"
        ? "You are DeadlineGPT, an aggressive, sarcastic, tough-love productivity coach. You absolutely hate procrastination, roll your eyes at excuses, and give incredibly blunt but useful advice based on the user's tasks, deadlines, habits, and history. Keep answers brief (max 3-4 sentences), funny, and highly actionable."
        : "You are DeadlineGPT in supportive mode. You are a warm, encouraging, but highly structured accountability partner. You help the user break down tasks, quiet their anxiety, and offer gentle encouragement to take the first step. Keep answers warm, positive, and brief (max 3 sentences).";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          systemInstruction,
          tasks,
          habits,
          contracts,
          localTime: new Date().toString()
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with coach.");
      }

      const modelReply = data.reply || "I didn't hear that. Try again.";
      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        content: modelReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, modelMsg]);

      if (voiceEnabled) {
        setIsSpeaking(true);
        VoiceHelper.speak(
          modelReply,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "system",
        content: `Error: ${error.message || "Failed to get coach feedback."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      VoiceHelper.stop();
      setIsSpeaking(false);
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      // Speak last message as test
      const lastModelMsg = [...messages].reverse().find((m) => m.role === "model");
      if (lastModelMsg) {
        setIsSpeaking(true);
        VoiceHelper.speak(
          lastModelMsg.content,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      }
    }
  };

  const quickPrompts = [
    { label: "Give me a reality check", text: "I'm struggling to start working today and need a serious reality check on my procrastination." },
    { label: "Analyze My Situation", text: "Run a diagnostic check on my tasks, deadlines, and habits right now and give me structured advice on what is most urgent." },
    { label: "I'm overwhelmed, help", text: "I have too much to do and feel completely paralyzed. What is my immediate course of action?" },
    { label: "Roast my productivity", text: "Tell me why my planning habit is absolute garbage and roast my laziness." },
    { label: "Help me write a plan", text: "Help me figure out how to plan my day so I don't fail my upcoming deadlines." }
  ];

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/50 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Banner Controls */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl animate-pulse">
            <Flame className={`h-5 w-5 ${isSpeaking ? "animate-pulse scale-110 text-rose-500" : ""}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">DeadlineGPT Accountability Partner</h3>
            <p className="text-xs text-slate-400">
              {analyzing ? "Analyzing schedule context..." : isSpeaking ? "Speaking..." : "Online & monitoring excuses"}
            </p>
          </div>
        </div>

        {/* Coach Style Selectors & Voice Toggle */}
        <div className="flex items-center gap-2">
          {/* Analyze Context Button */}
          <button
            onClick={() => triggerContextAssessment()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-rose-400 disabled:opacity-50 text-xs font-semibold rounded-lg border border-slate-700/60 transition-all cursor-pointer"
            title="Analyze active tasks and habits"
          >
            <RefreshCw className={`h-3 w-3 ${analyzing ? "animate-spin" : ""}`} />
            Sync & Analyze Schedule
          </button>

          {/* Simulate Exam Emergency Button */}
          <button
            onClick={handleInjectDataStructuresExam}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 disabled:opacity-50 text-xs font-bold rounded-lg border border-rose-500/40 hover:border-rose-500/60 transition-all cursor-pointer animate-pulse"
            title="Simulate Data Structures Exam in 6 hours"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            🚨 Simulate 6h Exam Crisis
          </button>

          {/* Tone Selector */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setCoachStyle("tough")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                coachStyle === "tough"
                  ? "bg-rose-500 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Flame className="h-3 w-3" />
              Tough Love
            </button>
            <button
              onClick={() => setCoachStyle("supportive")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                coachStyle === "supportive"
                  ? "bg-teal-500 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Smile className="h-3 w-3" />
              Supportive
            </button>
          </div>

          {/* Voice Output Toggle */}
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-lg border transition-all ${
              voiceEnabled
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700/80 hover:text-slate-300"
            }`}
            title={voiceEnabled ? "Mute Voice Out" : "Enable Voice Out (TTS)"}
          >
            {voiceEnabled ? <Volume2 className="h-4.5 w-4.5 animate-bounce" /> : <VolumeX className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="p-3 bg-red-950/30 border border-red-900/40 text-red-300 rounded-xl text-xs font-mono">
                {m.content}
              </div>
            );
          }

          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-rose-600 text-white rounded-tr-none shadow-md"
                    : "bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/40 shadow-sm"
                }`}
              >
                <div className="font-medium whitespace-pre-wrap">{m.content}</div>
                <div className={`text-[10px] mt-1 text-right ${isUser ? "text-rose-200" : "text-slate-400"}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 rounded-2xl rounded-tl-none p-4 border border-slate-800/40 max-w-[80%] flex items-center gap-2 text-slate-400 text-xs">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </span>
              <span>DeadlineGPT is typing...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      <div className="px-4 py-2 border-t border-slate-800/50 flex gap-2 overflow-x-auto scrollbar-none bg-slate-900/30">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.text)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-700 rounded-full text-slate-300 text-xs transition-all whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-rose-400" />
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Expose your excuses, check a deadline, or request tough love..."
          className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder:text-slate-500"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white rounded-xl shadow-md cursor-pointer transition-all disabled:text-slate-600"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
