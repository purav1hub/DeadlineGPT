import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  FileSignature, 
  TrendingUp, 
  Copy, 
  Volume2, 
  VolumeX, 
  Award, 
  Activity, 
  CheckCircle, 
  BookOpen, 
  UserCheck, 
  RefreshCw, 
  FileText, 
  X,
  Search,
  ChevronRight,
  ShieldAlert,
  Frown,
  Mic,
  ArrowRight
} from "lucide-react";
import { Task, Habit, CommitmentContract, ScheduleRoadmap, Milestone, ExtensionDraft } from "./types";
import { StorageHelper } from "./utils/storage";
import { VoiceHelper } from "./utils/voice";
import LiveCoachChat from "./components/LiveCoachChat";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "tasks" | "panic" | "scheduler" | "habits" | "contracts" | "negotiator" | "coach"
  >("dashboard");

  // Core States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [contracts, setContracts] = useState<CommitmentContract[]>([]);
  const [roadmaps, setRoadmaps] = useState<ScheduleRoadmap[]>([]);

  // Task-specific form/states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskCategory, setNewTaskCategory] = useState("Work");
  const [roastingTask, setRoastingTask] = useState<Task | null>(null);
  const [roastReply, setRoastReply] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);

  // Panic Mode specific states
  const [panicInput, setPanicInput] = useState("");
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicResult, setPanicResult] = useState<{
    triagedTasks: { originalIndex: number; title: string; priorityReason: string; urgencyScore: number }[];
    microStepsForNumberOne: string[];
    pepTalk: string;
  } | null>(null);
  const [panicCompletedSteps, setPanicCompletedSteps] = useState<boolean[]>([false, false, false]);

  // AI Scheduler specific states
  const [goalName, setGoalName] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalDifficulty, setGoalDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Crisis">("Medium");
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<ScheduleRoadmap | null>(null);

  // Habits specific states
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<"daily" | "weekly">("daily");

  // Commitment Contract specific states
  const [contractTitle, setContractTitle] = useState("");
  const [contractPledge, setContractPledge] = useState("");
  const [contractDeadline, setContractDeadline] = useState("");
  const [contractPenalty, setContractPenalty] = useState("");
  const [contractArbitrator, setContractArbitrator] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Procrastination Negotiator specific states
  const [negotiatorTask, setNegotiatorTask] = useState("");
  const [negotiatorRecipient, setNegotiatorRecipient] = useState("");
  const [negotiatorOriginalDate, setNegotiatorOriginalDate] = useState("");
  const [negotiatorNewDate, setNegotiatorNewDate] = useState("");
  const [negotiatorReason, setNegotiatorReason] = useState("");
  const [negotiatorTone, setNegotiatorTone] = useState("formal");
  const [negotiatorDraft, setNegotiatorDraft] = useState<ExtensionDraft | null>(null);
  const [negotiatorLoading, setNegotiatorLoading] = useState(false);
  const [isDraftSpeaking, setIsDraftSpeaking] = useState(false);

  // Load initial data
  useEffect(() => {
    setTasks(StorageHelper.getTasks());
    setHabits(StorageHelper.getHabits());
    setContracts(StorageHelper.getContracts());
    setRoadmaps(StorageHelper.getRoadmaps());
  }, []);

  // Sync state functions
  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    StorageHelper.saveTasks(newTasks);
  };

  const updateHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
    StorageHelper.saveHabits(newHabits);
  };

  const updateContracts = (newContracts: CommitmentContract[]) => {
    setContracts(newContracts);
    StorageHelper.saveContracts(newContracts);
  };

  const updateRoadmaps = (newRoadmaps: ScheduleRoadmap[]) => {
    setRoadmaps(newRoadmaps);
    StorageHelper.saveRoadmaps(newRoadmaps);
  };

  // Compute stats for Dashboard
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  
  const highPriorityPendingCount = pendingTasks.filter(t => t.priority === "high").length;
  
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const deadline = new Date(dateStr);
    deadline.setHours(23, 59, 59, 999);
    return deadline.getTime() < Date.now();
  };

  const overdueTasksCount = pendingTasks.filter(t => isOverdue(t.deadline)).length;

  // Procrastination panic level rating (0 to 100)
  const calculateProcrastinationLevel = () => {
    if (totalTasksCount === 0) return 0;
    let score = 0;
    // Overdue tasks add heavy weight
    score += overdueTasksCount * 25;
    // High priority pending tasks add weight
    score += highPriorityPendingCount * 15;
    // Unchecked habits add minor weight
    const uncheckedHabitsCount = habits.length - habits.filter(h => {
      const todayStr = new Date().toISOString().split("T")[0];
      return h.completions.includes(todayStr);
    }).length;
    score += uncheckedHabitsCount * 8;
    // Pending contracts add weight
    const activeContracts = contracts.filter(c => c.status === "active").length;
    score += activeContracts * 12;

    return Math.min(100, Math.max(5, score));
  };

  const panicLevel = calculateProcrastinationLevel();

  const getPanicLevelDetails = () => {
    if (panicLevel < 20) return { label: "Zen Mode", color: "text-teal-400 bg-teal-500/10", border: "border-teal-500/20" };
    if (panicLevel < 45) return { label: "Mild Slacking", color: "text-amber-400 bg-amber-500/10", border: "border-amber-500/20" };
    if (panicLevel < 75) return { label: "High Procrastination", color: "text-orange-400 bg-orange-500/10", border: "border-orange-500/20" };
    return { label: "CRITICAL PANIC EMERGENCY", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", border: "border-rose-500/30 animate-pulse" };
  };

  const panicDetails = getPanicLevelDetails();

  // Tasks Management Actions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const deadlineVal = newTaskDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const createdTask: Task = {
      id: "t_" + Math.random().toString(36).substring(2, 9),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      deadline: deadlineVal,
      priority: newTaskPriority,
      completed: false,
      category: newTaskCategory,
      subtasks: [],
      createdAt: new Date().toISOString()
    };

    updateTasks([createdTask, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDeadline("");
  };

  const toggleTaskCompletion = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    updateTasks(updated);
  };

  const deleteTask = (taskId: string) => {
    updateTasks(tasks.filter(t => t.id !== taskId));
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [
            ...t.subtasks,
            { id: "s_" + Math.random().toString(36).substring(2, 9), title: title.trim(), completed: false }
          ]
        };
      }
      return t;
    });
    updateTasks(updated);
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    });
    updateTasks(updated);
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId)
        };
      }
      return t;
    });
    updateTasks(updated);
  };

  // Roast me request
  const requestRoast = async (task: Task) => {
    setRoastingTask(task);
    setRoastReply("");
    setRoastLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `I have a task named "${task.title}" with a priority of "${task.priority}" and a deadline of ${task.deadline}. Its description is "${task.description || "none"}". I haven't finished it yet and I'm slacking. Roast me aggressively and make me feel ashamed for putting this off, then tell me to start now.`
          }],
          systemInstruction: "You are the ruthless, sarcastic, high-energy DeadlineGPT roasting bot. You absolutely tear into slackers and tear down their pathetic excuses in 3 highly creative, punchy, funny, and brutal sentences."
        })
      });
      const data = await response.json();
      setRoastReply(data.reply || "You are too pathetic to even roast. Just do it.");
    } catch (e) {
      setRoastReply("Error loading your roast. But trust me, you are slacking.");
    } finally {
      setRoastLoading(false);
    }
  };

  // SOS Panic triage execution
  const executePanicTriage = async () => {
    if (!panicInput.trim()) return;
    setPanicLoading(true);
    setPanicResult(null);
    setPanicCompletedSteps([false, false, false]);

    try {
      // Split user dump by double newlines or single newlines to parse a crude list
      const parsedList = panicInput
        .split(/\n+/)
        .map(t => t.replace(/^[-*•\d\.\s]+/, "").trim())
        .filter(t => t.length > 2);

      const tasksToTriage = parsedList.length > 0 ? parsedList : [panicInput];

      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksToTriage })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse");

      setPanicResult(data);
    } catch (e: any) {
      console.error(e);
      // Fallback
      setPanicResult({
        triagedTasks: [
          { originalIndex: 0, title: panicInput.slice(0, 50) + "...", priorityReason: "Highest anxiety generator detected.", urgencyScore: 9 }
        ],
        microStepsForNumberOne: [
          "Open your work workspace right now.",
          "Write exactly one sentence or click one button.",
          "Set a timer for 5 minutes and commit to staying on task until it rings."
        ],
        pepTalk: "Take a deep breath. Stop looking at the mountain. Just focus on the next microscopic pebble in front of you."
      });
    } finally {
      setPanicLoading(false);
    }
  };

  // AI Milestone Scheduler execution
  const executeScheduler = async () => {
    if (!goalName.trim() || !goalDeadline) return;
    setSchedulerLoading(true);
    
    try {
      const targetDate = new Date(goalDeadline);
      const diffTime = Math.abs(targetDate.getTime() - Date.now());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: goalName,
          deadline: goalDeadline,
          durationDays: diffDays,
          difficulty: goalDifficulty
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const newRoadmap: ScheduleRoadmap = {
        taskName: goalName,
        deadline: goalDeadline,
        milestones: data.milestones.map((m: any) => ({ ...m, completed: false })),
        coachCommentary: data.coachCommentary,
        generatedAt: new Date().toLocaleDateString()
      };

      updateRoadmaps([newRoadmap, ...roadmaps]);
      setActiveRoadmap(newRoadmap);
      // Automatically add this as a core task too!
      const mainTask: Task = {
        id: "t_sch_" + Math.random().toString(36).substring(2, 9),
        title: `AI Plan: ${goalName}`,
        description: `Full AI scheduled timeline leading to ${goalDeadline}. Coach says: "${data.coachCommentary}"`,
        deadline: goalDeadline,
        priority: goalDifficulty === "Hard" || goalDifficulty === "Crisis" ? "high" : "medium",
        completed: false,
        category: "School",
        subtasks: data.milestones.map((m: any) => ({
          id: "sub_sch_" + Math.random().toString(36).substring(2, 9),
          title: `Day ${m.targetDay}: ${m.title}`,
          completed: false
        })),
        createdAt: new Date().toISOString()
      };
      updateTasks([mainTask, ...tasks]);

      setGoalName("");
      setGoalDeadline("");
    } catch (e) {
      console.error(e);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const toggleMilestoneCompleted = (roadmapIndex: number, milestoneIndex: number) => {
    const updated = [...roadmaps];
    const m = updated[roadmapIndex].milestones[milestoneIndex];
    m.completed = !m.completed;
    updateRoadmaps(updated);
  };

  // Habits tracker actions
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    const habit: Habit = {
      id: "h_" + Math.random().toString(36).substring(2, 9),
      title: newHabitTitle.trim(),
      frequency: newHabitFrequency,
      completions: [],
      streak: 0,
      createdAt: new Date().toISOString()
    };

    updateHabits([habit, ...habits]);
    setNewHabitTitle("");
  };

  const toggleHabitToday = (habitId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const updated = habits.map(h => {
      if (h.id === habitId) {
        let newCompletions = [...h.completions];
        let newStreak = h.streak;
        
        if (newCompletions.includes(todayStr)) {
          // Remove completion
          newCompletions = newCompletions.filter(c => c !== todayStr);
          newStreak = Math.max(0, newStreak - 1);
        } else {
          // Add completion
          newCompletions.push(todayStr);
          
          // Basic streak increment
          const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          if (h.completions.includes(yesterdayStr) || h.streak === 0) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }

        return {
          ...h,
          completions: newCompletions,
          streak: newStreak
        };
      }
      return h;
    });

    updateHabits(updated);
  };

  const deleteHabit = (id: string) => {
    updateHabits(habits.filter(h => h.id !== id));
  };

  // Commitment Contract digital canvas drawing handlers
  const handleSignatureStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#ef4444"; // high-visibility red
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const handleSignatureDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Contract Creator submission
  const handleSignContract = () => {
    if (!contractTitle.trim() || !contractPledge.trim() || !contractDeadline || !contractPenalty.trim() || !hasSigned) return;

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL() : "";

    const contract: CommitmentContract = {
      id: "contract_" + Math.random().toString(36).substring(2, 9),
      title: contractTitle.trim(),
      pledge: contractPledge.trim(),
      deadline: contractDeadline,
      penalty: contractPenalty.trim(),
      arbitrator: contractArbitrator.trim() || "The Public / AI Coach",
      signature: signatureDataUrl,
      signedAt: new Date().toLocaleString(),
      status: "active"
    };

    updateContracts([contract, ...contracts]);

    // Add contract to central tasks list as well
    const contractTask: Task = {
      id: "t_con_" + contract.id,
      title: `Binding Contract: ${contractTitle}`,
      description: `STAKES ARE HIGH! Penalty if failed: ${contractPenalty}. Arbitrator: ${contractArbitrator}`,
      deadline: contractDeadline,
      priority: "high",
      completed: false,
      category: "Personal",
      subtasks: [],
      createdAt: new Date().toISOString()
    };
    updateTasks([contractTask, ...tasks]);

    // Clear inputs
    setContractTitle("");
    setContractPledge("");
    setContractDeadline("");
    setContractPenalty("");
    setContractArbitrator("");
    clearSignatureCanvas();
  };

  const updateContractStatus = (id: string, status: "fulfilled" | "breached") => {
    const updated = contracts.map(c => c.id === id ? { ...c, status } : c);
    updateContracts(updated);
  };

  const deleteContract = (id: string) => {
    updateContracts(contracts.filter(c => c.id !== id));
  };

  // Deadline Negotiator API executor
  const executeNegotiator = async () => {
    if (!negotiatorTask.trim() || !negotiatorRecipient.trim() || !negotiatorNewDate) return;
    setNegotiatorLoading(true);
    setNegotiatorDraft(null);
    VoiceHelper.stop();
    setIsDraftSpeaking(false);

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: negotiatorTask,
          recipient: negotiatorRecipient,
          originalDeadline: negotiatorOriginalDate || "tomorrow",
          requestedDeadline: negotiatorNewDate,
          reason: negotiatorReason || "Severe workload compression and technical hurdles.",
          tone: negotiatorTone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNegotiatorDraft(data);
    } catch (e) {
      console.error(e);
      setNegotiatorDraft({
        subjectLine: `Extension Request: ${negotiatorTask}`,
        emailBody: `Dear ${negotiatorRecipient},\n\nI hope you are well. I am writing to respectfully request a slight extension on our deadline for "${negotiatorTask}".\n\nUnfortunately, due to unexpected complications, I need a small amount of extra time to ensure the output meets our quality standards. Would it be possible to shift the delivery date to ${negotiatorNewDate}?\n\nThank you for your understanding.\n\nBest regards,\n[Your Name]`,
        tacticalAdvice: "Send this draft early in the morning, and follow up gently if you get no response in 24 hours."
      });
    } finally {
      setNegotiatorLoading(false);
    }
  };

  // Read draft letter aloud with Voice Synthesis
  const handleReadAloud = () => {
    if (!negotiatorDraft) return;

    if (isDraftSpeaking) {
      VoiceHelper.stop();
      setIsDraftSpeaking(false);
    } else {
      setIsDraftSpeaking(true);
      const textToSpeak = `Subject: ${negotiatorDraft.subjectLine}. ${negotiatorDraft.emailBody}`;
      VoiceHelper.speak(
        textToSpeak,
        () => setIsDraftSpeaking(true),
        () => setIsDraftSpeaking(false)
      );
    }
  };

  // Filter tasks computed list
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || t.category === filterCategory;
    const matchesPriority = filterPriority === "All" || t.priority === filterPriority;
    
    let matchesStatus = true;
    if (filterStatus === "pending") matchesStatus = !t.completed;
    if (filterStatus === "completed") matchesStatus = t.completed;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* 1. Sidebar Panel */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 p-5 flex flex-col gap-6 flex-shrink-0">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-rose-400 bg-clip-text text-transparent">
              DeadlineGPT
            </h1>
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 font-semibold">
              Accountability Protocol
            </span>
          </div>
        </div>

        {/* Procrastination Meter (Quick Look) */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-slate-400">
            <span>Slack Index</span>
            <span className={`font-mono font-bold ${panicDetails.color.split(" ")[0]}`}>
              {panicLevel}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-400 via-amber-400 to-rose-500 h-full transition-all duration-1000 ease-out"
              style={{ width: `${panicLevel}%` }}
            />
          </div>
          <div className={`mt-2 text-[10px] font-semibold text-center rounded px-1.5 py-0.5 ${panicDetails.color}`}>
            {panicDetails.label}
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Activity className="h-4.5 w-4.5" />
            Performance & Stats
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "tasks"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <CheckSquare className="h-4.5 w-4.5" />
            My Action Items
            {pendingTasks.length > 0 && (
              <span className="ml-auto bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("panic")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "panic"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4 animate-pulse"
                : "text-slate-400 hover:text-rose-400 hover:bg-slate-800/50"
            }`}
          >
            <ShieldAlert className="h-4.5 w-4.5 text-rose-400" />
            <span className="text-rose-400 font-bold">SOS PANIC TRIAGE</span>
          </button>

          <button
            onClick={() => setActiveTab("scheduler")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "scheduler"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Clock className="h-4.5 w-4.5" />
            AI Roadmap Planner
          </button>

          <button
            onClick={() => setActiveTab("habits")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "habits"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Flame className="h-4.5 w-4.5 text-amber-500" />
            Goals & Habits
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "contracts"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <FileSignature className="h-4.5 w-4.5" />
            Binding Contracts
          </button>

          <button
            onClick={() => setActiveTab("negotiator")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "negotiator"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            Deadline Negotiator
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "coach"
                ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-4"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Sparkles className="h-4.5 w-4.5 text-rose-400" />
            AI Coach Chat
          </button>
        </nav>

        {/* Footer Credit */}
        <div className="text-[10px] text-slate-500 font-mono text-center">
          v2.4 • Secured via Local & AI Triage
        </div>
      </aside>

      {/* 2. Main Work Content Viewport */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* A. PERFORMANCE DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">Productivity Performance Terminal</h2>
                <p className="text-sm text-slate-400">Aggregated diagnostic metrics and accountability status report.</p>
              </div>
              <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-slate-400 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-rose-500 animate-spin" style={{ animationDuration: "8s" }} />
                System Active
              </div>
            </div>

            {/* Quick Metrics Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Completion Rate</span>
                  <CheckCircle className="h-5 w-5 text-teal-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black font-mono">
                    {totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100}%
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    {completedTasksCount} / {totalTasksCount} items completed
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue Incidents</span>
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black font-mono text-rose-400">
                    {overdueTasksCount}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Requires immediate triage protocol
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Habits Streak</span>
                  <Flame className="h-5 w-5 text-amber-500" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black font-mono text-amber-500">
                    {habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0} <span className="text-xs text-slate-400">Days</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Longest streak currently maintained
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legally Bound Contracts</span>
                  <FileSignature className="h-5 w-5 text-rose-500" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black font-mono">
                    {contracts.filter(c => c.status === "active").length} <span className="text-xs text-slate-400">Active</span>
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Stakes are high. Do not breach.
                  </p>
                </div>
              </div>

            </div>

            {/* Custom Responsive SVG Chart of Completion & Activity Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-teal-400" />
                  Productivity Progress Timeline
                </h3>
                
                {/* SVG Line Chart */}
                <div className="h-[220px] w-full bg-slate-950/60 rounded-xl p-4 relative border border-slate-900 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block"></span>Completed</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>Procrastination</span>
                  </div>

                  {/* SVG Canvas */}
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="panicGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="0" y1="37" x2="500" y2="37" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="112" x2="500" y2="112" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />

                    {/* Area Gradients */}
                    <path d="M 0 150 Q 100 110 200 90 T 400 40 L 500 30 L 500 150 Z" fill="url(#chartGrad)" />
                    <path d="M 0 40 Q 120 70 240 60 T 480 120 L 500 130 L 500 150 Z" fill="url(#panicGrad)" />

                    {/* Line path Completed */}
                    <path d="M 0 150 Q 100 110 200 90 T 400 40 L 500 30" fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                    {/* Line path Panic */}
                    <path d="M 0 40 Q 120 70 240 60 T 480 120 L 500 130" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="2 2" />

                    {/* Circles on Nodes */}
                    <circle cx="200" cy="90" r="4" fill="#14b8a6" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="400" cy="40" r="4" fill="#14b8a6" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="240" cy="60" r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
                  </svg>

                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 border-t border-slate-900 pt-1.5">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun (Today)</span>
                  </div>
                </div>
              </div>

              {/* Task Category Distribution Panel */}
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-rose-400" />
                  Category Load Diagnostic
                </h3>

                <div className="space-y-4">
                  {["Work", "School", "Personal"].map(cat => {
                    const count = tasks.filter(t => t.category === cat).length;
                    const percent = totalTasksCount > 0 ? Math.round((count / totalTasksCount) * 100) : 0;
                    
                    const colorMap: Record<string, string> = {
                      Work: "bg-teal-500",
                      School: "bg-rose-500",
                      Personal: "bg-amber-500"
                    };

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorMap[cat]}`}></span>
                            {cat}
                          </span>
                          <span className="font-mono text-slate-400">{count} items ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${colorMap[cat]} transition-all duration-1000`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5 leading-relaxed">
                  <Sparkles className="h-5 w-5 text-rose-500 flex-shrink-0" />
                  <span>
                    <strong>System Recommendation:</strong> {highPriorityPendingCount > 0 
                      ? `Tackle your ${highPriorityPendingCount} pending high-priority items. Start with the micro-steps in SOS Panic Triage.` 
                      : "Everything is under control. Keep up the habit streaks to avoid last-minute panic attacks."}
                  </span>
                </div>
              </div>

            </div>

            {/* Quick Action Hub Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-gradient-to-br from-rose-950/20 via-slate-900/60 to-slate-900/60 p-5 rounded-2xl border border-rose-500/20 flex flex-col justify-between">
                <div>
                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg w-max mb-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">SOS Overwhelm Triage</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Feeling anxious and stuck? Dump your raw brain chaos into our panic solver. AI will organize it instantly and give you 3 ridiculous easy baby steps.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("panic")} 
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  Trigger Emergency SOS Triage
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-gradient-to-br from-teal-950/20 via-slate-900/60 to-slate-900/60 p-5 rounded-2xl border border-teal-500/20 flex flex-col justify-between">
                <div>
                  <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg w-max mb-3">
                    <FileSignature className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Commitment Contract</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Bind your target goal in a strict accountability contract. Declare a penalty stake, appoint an arbitrator, and sign the canvas with your real signature.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("contracts")} 
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  Create Legal Bond Contract
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>
        )}

        {/* B. MY TASKS VIEW */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Action Center</h2>
                <p className="text-sm text-slate-400">Manage and execute your active goals. Force accountability.</p>
              </div>
              
              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300"
                >
                  <option value="All">All Categories</option>
                  <option value="Work">Work</option>
                  <option value="School">School</option>
                  <option value="Personal">Personal</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300"
                >
                  <option value="All">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      filterStatus === "all" ? "bg-slate-800 text-white" : "text-slate-400"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      filterStatus === "pending" ? "bg-slate-800 text-white" : "text-slate-400"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus("completed")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      filterStatus === "completed" ? "bg-slate-800 text-white" : "text-slate-400"
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add Task Side Panel */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 h-max">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-rose-500" />
                  Initiate Goal
                </h3>

                <form onSubmit={handleAddTask} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Title</label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Code database schema"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Description</label>
                    <textarea
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Details, specifications, and scope..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Deadline</label>
                      <input
                        type="date"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-rose-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Category</label>
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-rose-500/50"
                      >
                        <option value="Work">Work</option>
                        <option value="School">School</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">Priority Rank</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as const).map((p) => {
                        const styleMap = {
                          low: "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
                          medium: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
                          high: "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
                        };

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewTaskPriority(p)}
                            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize cursor-pointer ${
                              newTaskPriority === p 
                                ? "ring-2 ring-rose-500/80 bg-rose-500 text-white border-transparent"
                                : "text-slate-400 bg-slate-950 border-slate-800"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Commit New Goal
                  </button>
                </form>
              </div>

              {/* Tasks List Grid Panel */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search committed goals..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-sm placeholder:text-slate-500 focus:border-rose-500/50"
                  />
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/60 space-y-3">
                    <Frown className="h-10 w-10 text-slate-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">No active items match filter</h4>
                      <p className="text-xs text-slate-500 mt-1">Change your filters or commit a new goal on the left.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((t) => {
                      const overdue = isOverdue(t.deadline) && !t.completed;
                      const hasSubtasks = t.subtasks.length > 0;
                      const completedSubtasks = t.subtasks.filter(s => s.completed).length;

                      const priorityStyle = {
                        low: "bg-teal-500/10 text-teal-400 border-teal-500/20",
                        medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        high: "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }[t.priority];

                      return (
                        <div 
                          key={t.id} 
                          className={`bg-slate-900/40 p-4 rounded-2xl border transition-all ${
                            t.completed 
                              ? "opacity-60 border-slate-800/40" 
                              : overdue 
                                ? "border-rose-500/30 bg-rose-950/5" 
                                : "border-slate-800/80 hover:border-slate-700/80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => toggleTaskCompletion(t.id)}
                              className="mt-0.5 text-slate-500 hover:text-rose-500 transition-colors flex-shrink-0 cursor-pointer"
                            >
                              {t.completed ? (
                                <div className="p-0.5 bg-rose-500 text-white rounded">
                                  <CheckCircle className="h-4.5 w-4.5" />
                                </div>
                              ) : (
                                <Square className="h-5 w-5 text-slate-600" />
                              )}
                            </button>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-sm font-bold text-slate-200 ${t.completed ? "line-through text-slate-500" : ""}`}>
                                  {t.title}
                                </h4>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-slate-400">
                                  {t.category}
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${priorityStyle} capitalize`}>
                                  {t.priority} Priority
                                </span>
                              </div>

                              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                                {t.description}
                              </p>

                              {/* Target Deadline */}
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-2 font-mono">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Deadline: {t.deadline}</span>
                                {overdue && (
                                  <span className="text-rose-400 font-bold ml-2 animate-pulse flex items-center gap-0.5">
                                    <AlertTriangle className="h-3 w-3" /> Overdue Crisis
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Options/Actions */}
                            <div className="flex items-center gap-1">
                              {!t.completed && (
                                <button
                                  onClick={() => requestRoast(t)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                                  title="Roast my excuses for not finishing this!"
                                >
                                  Roast Me
                                </button>
                              )}
                              <button
                                onClick={() => deleteTask(t.id)}
                                className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Subtasks checklist logic */}
                          <div className="mt-4 border-t border-slate-800/40 pt-3 pl-8 space-y-2">
                            {hasSubtasks && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                                  <span>Checklist Milestones</span>
                                  <span>{completedSubtasks} / {t.subtasks.length} Completed</span>
                                </div>
                                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-teal-500 h-full transition-all duration-500" 
                                    style={{ width: `${(completedSubtasks / t.subtasks.length) * 100}%` }}
                                  />
                                </div>
                                
                                <div className="space-y-1 mt-2">
                                  {t.subtasks.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between gap-2 group text-xs text-slate-300">
                                      <button
                                        onClick={() => toggleSubtask(t.id, s.id)}
                                        className="flex items-center gap-2 hover:text-slate-100 transition-colors cursor-pointer"
                                      >
                                        {s.completed ? (
                                          <CheckCircle className="h-3.5 w-3.5 text-teal-400" />
                                        ) : (
                                          <Square className="h-3.5 w-3.5 text-slate-600" />
                                        )}
                                        <span className={s.completed ? "line-through text-slate-500" : ""}>
                                          {s.title}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => deleteSubtask(t.id, s.id)}
                                        className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Add mini subtask form */}
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const input = (e.currentTarget.elements.namedItem("subTitle") as HTMLInputElement).value;
                                if (input.trim()) {
                                  addSubtask(t.id, input);
                                  e.currentTarget.reset();
                                }
                              }}
                              className="flex items-center gap-1.5 max-w-xs"
                            >
                              <input
                                name="subTitle"
                                placeholder="Add step to checklist..."
                                className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs flex-1 text-slate-200 placeholder:text-slate-600"
                              />
                              <button 
                                type="submit" 
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 rounded-lg cursor-pointer"
                              >
                                Add
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Roast Modal Overlay / Panel display */}
            {roastingTask && (
              <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => setRoastingTask(null)}
                    className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                      <Flame className="h-5 w-5 animate-bounce" />
                    </div>
                    <h3 className="text-base font-bold text-white">Ruthless Procrastination Roast</h3>
                  </div>

                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Target Task</div>
                    <div className="font-bold text-slate-300">{roastingTask.title}</div>
                    <div className="text-slate-400">{roastingTask.description || "No detail provided"}</div>
                  </div>

                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl relative">
                    {roastLoading ? (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <RefreshCw className="h-4.5 w-4.5 animate-spin text-rose-500" />
                        <span>DeadlineGPT is compiling highly toxic feedback...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm italic font-medium leading-relaxed text-slate-100">
                          "{roastReply}"
                        </p>
                        <button
                          onClick={() => VoiceHelper.speak(roastReply)}
                          className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Listen Aloud
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setRoastingTask(null)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Dismiss Roast
                    </button>
                    <button
                      onClick={() => {
                        toggleTaskCompletion(roastingTask.id);
                        setRoastingTask(null);
                      }}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      I Completed It!
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* C. SOS PANIC TRIAGE VIEW */}
        {activeTab === "panic" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="mx-auto p-3 bg-rose-500/10 text-rose-500 rounded-full w-max animate-bounce">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-rose-400 uppercase tracking-tight">SOS Emergency Triage</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Paralyzed by stress? Too much on your mind? Just type a raw list of everything overwhelming you. We will organize your chaos instantly.
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-rose-500/20 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Dump Your Brain Chaos (Raw list or single paragraph)
                </label>
                <textarea
                  value={panicInput}
                  onChange={(e) => setPanicInput(e.target.value)}
                  placeholder="e.g. I have a chemistry report due at midnight, my room is a mess, I forgot to answer Professor's email, and I also need to prepare slides for tomorrow's team presentation and buy groceries..."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <button
                onClick={executePanicTriage}
                disabled={panicLoading || !panicInput.trim()}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {panicLoading ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    Analyzing Anxiety Vectors...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                    AGGRESSIVE AI TRIAGE PROTOCOL
                  </>
                )}
              </button>
            </div>

            {/* Results Display */}
            {panicResult && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                
                {/* 1. Calm Pep Talk from coach */}
                <div className="p-4 bg-teal-950/20 border border-teal-500/30 rounded-2xl flex items-start gap-3">
                  <Flame className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400 block font-mono">
                      AI Supervisor Pep Talk
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-slate-200 mt-1">
                      "{panicResult.pepTalk}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Microscopic First Steps */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                        <Flame className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-sm font-bold uppercase text-slate-200">Micro-Steps (Anti-Friction)</h3>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      To beat paralysis, your highest priority task has been broken down into three laughably small steps. Check them off one by one.
                    </p>

                    <div className="space-y-2.5 pt-2">
                      {panicResult.microStepsForNumberOne.map((step, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const updated = [...panicCompletedSteps];
                            updated[idx] = !updated[idx];
                            setPanicCompletedSteps(updated);
                          }}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            panicCompletedSteps[idx] 
                              ? "bg-teal-500/5 border-teal-500/20 opacity-60 text-slate-400" 
                              : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"
                          }`}
                        >
                          {panicCompletedSteps[idx] ? (
                            <CheckCircle className="h-4.5 w-4.5 text-teal-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-600 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={`text-xs ${panicCompletedSteps[idx] ? "line-through" : ""}`}>
                            {step}
                          </span>
                        </button>
                      ))}
                    </div>

                    {panicCompletedSteps.every(Boolean) && (
                      <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs text-teal-400 text-center font-bold animate-pulse">
                        🔥 High-friction barrier shattered! You have started. Keep moving!
                      </div>
                    )}
                  </div>

                  {/* Triaged Priority Queue */}
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
                        <AlertTriangle className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="text-sm font-bold uppercase text-slate-200">Optimized Execution Order</h3>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      AI sorted your tasks by immediate risk and urgency. Execute them strictly in this sequence.
                    </p>

                    <div className="space-y-2">
                      {panicResult.triagedTasks.map((t, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full font-mono">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-200">{t.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              {t.priorityReason}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 flex-shrink-0">
                            Urgency: {t.urgencyScore}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setPanicInput("");
                      setPanicResult(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Clear SOS Panel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* D. AI ROADMAP SCHEDULER VIEW */}
        {activeTab === "scheduler" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">AI Milestone Roadmap</h2>
                <p className="text-sm text-slate-400">Transform a large goal into a structured timeline lead up to your deadline.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Build Roadmap Input Form */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 h-max space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-teal-400" />
                  Generate New Plan
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Major Project / Objective</label>
                    <input
                      type="text"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="e.g. Write biology research thesis paper"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Final Deadline</label>
                      <input
                        type="date"
                        value={goalDeadline}
                        onChange={(e) => setGoalDeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-teal-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Self Difficulty</label>
                      <select
                        value={goalDifficulty}
                        onChange={(e) => setGoalDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-teal-500/50"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                        <option value="Crisis">Crisis Emergency</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={executeScheduler}
                    disabled={schedulerLoading || !goalName.trim() || !goalDeadline}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {schedulerLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Plotting Milestone Calendar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Plot AI Project Calendar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Roadmap Timeline Viewer */}
              <div className="lg:col-span-2 space-y-4">
                
                {roadmaps.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/60 space-y-2">
                    <Clock className="h-10 w-10 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">No active scheduled roadmaps</h4>
                    <p className="text-xs text-slate-500">Input a goal and final deadline on the left to map milestones.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* Saved Roadmaps Tabs */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                      {roadmaps.map((r, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => setActiveRoadmap(r)}
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                            (activeRoadmap?.taskName === r.taskName)
                              ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {r.taskName.length > 25 ? r.taskName.slice(0, 25) + "..." : r.taskName}
                        </button>
                      ))}
                    </div>

                    {/* Active Roadmap Timeline Panel */}
                    {activeRoadmap && (
                      <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest block">
                              AI Scheduled Milestone Roadmap
                            </span>
                            <h3 className="text-lg font-black text-white mt-0.5">{activeRoadmap.taskName}</h3>
                            <span className="text-xs text-slate-400 font-mono">Target Deadline: {activeRoadmap.deadline}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              const updated = roadmaps.filter(r => r.taskName !== activeRoadmap.taskName);
                              updateRoadmaps(updated);
                              setActiveRoadmap(updated[0] || null);
                            }}
                            className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg"
                            title="Delete this roadmap"
                          >
                            <Trash className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        {/* Coach Commentary Banner */}
                        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed italic flex gap-2.5 items-start">
                          <Flame className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>AI Supervisor:</strong> "{activeRoadmap.coachCommentary}"
                          </span>
                        </div>

                        {/* Interactive Timeline Stepper */}
                        <div className="relative border-l border-slate-800/80 ml-4 pl-6 space-y-6">
                          {activeRoadmap.milestones.map((m, mIdx) => {
                            const rIdx = roadmaps.findIndex(rm => rm.taskName === activeRoadmap.taskName);

                            return (
                              <div key={mIdx} className="relative group">
                                {/* Bullet Node */}
                                <button
                                  onClick={() => toggleMilestoneCompleted(rIdx, mIdx)}
                                  className={`absolute -left-10 top-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                                    m.completed 
                                      ? "bg-teal-500 border-teal-400 text-white shadow-md shadow-teal-500/10" 
                                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                                  }`}
                                >
                                  {m.completed ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <span className="text-[10px] font-bold font-mono">D{m.targetDay}</span>
                                  )}
                                </button>

                                {/* Content Details */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-bold ${m.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                                      {m.title}
                                    </h4>
                                    <span className="text-[10px] font-mono bg-slate-950 border border-slate-800/60 px-1.5 py-0.5 rounded text-slate-400">
                                      Day Offset: +{m.targetDay} Days
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      Est: {m.estimatedHours}h work
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                    {m.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Completion Progress Bar */}
                        <div className="space-y-2 border-t border-slate-800/60 pt-4">
                          {(() => {
                            const total = activeRoadmap.milestones.length;
                            const completed = activeRoadmap.milestones.filter(m => m.completed).length;
                            const percent = Math.round((completed / total) * 100);

                            return (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                                  <span>Milestones completion rate</span>
                                  <span>{percent}% ({completed} / {total})</span>
                                </div>
                                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-teal-500 transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* E. GOALS & HABITS VIEW */}
        {activeTab === "habits" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Daily & Weekly Discipline</h2>
                <p className="text-sm text-slate-400">Keep your long-term consistency. Keep streaks burning.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add Habit Creator Form */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 h-max space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-amber-500" />
                  Initiate Discipline
                </h3>

                <form onSubmit={handleAddHabit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Habit Title</label>
                    <input
                      type="text"
                      required
                      value={newHabitTitle}
                      onChange={(e) => setNewHabitTitle(e.target.value)}
                      placeholder="e.g. 1 hour distraction-free focus"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">Recurrence frequency</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewHabitFrequency("daily")}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          newHabitFrequency === "daily"
                            ? "bg-amber-500 text-slate-950 font-black border-transparent"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Daily Check
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewHabitFrequency("weekly")}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          newHabitFrequency === "weekly"
                            ? "bg-amber-500 text-slate-950 font-black border-transparent"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Weekly Check
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Establish Discipline
                  </button>
                </form>
              </div>

              {/* Habits List Grid View */}
              <div className="lg:col-span-2 space-y-4">
                
                {habits.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/60 space-y-2">
                    <Flame className="h-10 w-10 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">No established habits currently</h4>
                    <p className="text-xs text-slate-500">Initiate some self discipline items on the left to start tracking streaks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {habits.map((h) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const completedToday = h.completions.includes(todayStr);

                      return (
                        <div 
                          key={h.id} 
                          className={`bg-slate-900/40 p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            completedToday 
                              ? "border-amber-500/30 bg-amber-500/5" 
                              : "border-slate-800/80 hover:border-slate-700/80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
                                {h.frequency} Habit
                              </span>
                              <h4 className="text-sm font-bold text-slate-200 mt-0.5">{h.title}</h4>
                            </div>

                            <button
                              onClick={() => deleteHabit(h.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-800/50 pt-3 flex-wrap gap-2">
                            {/* Streak meter */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                              <Flame className={`h-4.5 w-4.5 ${h.streak > 0 ? "text-amber-500 animate-pulse scale-110" : "text-slate-600"}`} />
                              <span className="font-bold">
                                {h.streak} Day {h.streak === 1 ? "Streak" : "Streaks"}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleHabitToday(h.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
                                completedToday
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                              }`}
                            >
                              {completedToday ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Checked Today
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5" />
                                  Check In
                                </>
                              )}
                            </button>
                          </div>

                          {/* Quick 5 Days Mini History nodes */}
                          <div className="flex gap-1.5 justify-start">
                            {[0, 1, 2, 3, 4].map((offset) => {
                              const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
                              const dStr = d.toISOString().split("T")[0];
                              const dayLetter = d.toLocaleDateString([], { weekday: "narrow" });
                              const hasCompleted = h.completions.includes(dStr);

                              return (
                                <div 
                                  key={offset} 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                                    hasCompleted 
                                      ? "bg-amber-500 border-transparent text-slate-950 font-black" 
                                      : "bg-slate-950 border-slate-800/80 text-slate-500"
                                  }`}
                                  title={`${d.toLocaleDateString()}: ${hasCompleted ? "Completed" : "Incomplete"}`}
                                >
                                  {dayLetter}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* F. COMMITMENT CONTRACTS VIEW */}
        {activeTab === "contracts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Binding Commitment Contracts</h2>
                <p className="text-sm text-slate-400">Lock your goals in a strict legal protocol. Set stakes, select arbitrator, and sign.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create Contract builder form */}
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 h-max space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <FileSignature className="h-4.5 w-4.5" />
                  Draft Contract Proposal
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Official Title</label>
                    <input
                      type="text"
                      value={contractTitle}
                      onChange={(e) => setContractTitle(e.target.value)}
                      placeholder="e.g. Draft Q3 Marketing Deck Presentation"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">The Pledge Statement</label>
                    <textarea
                      value={contractPledge}
                      onChange={(e) => setContractPledge(e.target.value)}
                      placeholder="I formally swear on my honor to completely finish..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Final Deadline</label>
                      <input
                        type="date"
                        value={contractDeadline}
                        onChange={(e) => setContractDeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-rose-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Witness Arbitrator</label>
                      <input
                        type="text"
                        value={contractArbitrator}
                        onChange={(e) => setContractArbitrator(e.target.value)}
                        placeholder="Friend, Boss, Partner"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-rose-400 font-bold block uppercase tracking-wider">
                      ⚠️ The Penalty Stake / Consequence
                    </label>
                    <input
                      type="text"
                      value={contractPenalty}
                      onChange={(e) => setContractPenalty(e.target.value)}
                      placeholder="e.g. Lose $50, eat ghost pepper, ban social media"
                      className="w-full px-3 py-2 bg-rose-950/20 border border-rose-500/30 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500"
                    />
                  </div>

                  {/* Interactive Digital Canvas Drawing Pad */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400 font-semibold block">Signature Bind (Draw with Mouse/Touch)</label>
                      <button
                        onClick={clearSignatureCanvas}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                      >
                        Clear Canvas
                      </button>
                    </div>

                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleSignatureStart}
                      onMouseMove={handleSignatureDraw}
                      onMouseUp={handleSignatureStop}
                      onMouseLeave={handleSignatureStop}
                      onTouchStart={handleSignatureStart}
                      onTouchMove={handleSignatureDraw}
                      onTouchEnd={handleSignatureStop}
                      width={300}
                      height={90}
                      className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl cursor-crosshair w-full block h-[90px]"
                    />
                  </div>

                  <button
                    onClick={handleSignContract}
                    disabled={!contractTitle.trim() || !contractPledge.trim() || !contractDeadline || !contractPenalty.trim() || !hasSigned}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileSignature className="h-4.5 w-4.5" />
                    Seal & Bind Commitment Contract
                  </button>
                </div>
              </div>

              {/* Saved Signed Contracts Viewer */}
              <div className="lg:col-span-2 space-y-4">
                
                {contracts.length === 0 ? (
                  <div className="p-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/60 space-y-2">
                    <FileSignature className="h-10 w-10 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">No active legally bound contracts</h4>
                    <p className="text-xs text-slate-500">Draft your contract on the left. Signing with the canvas binds your honor.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((c) => {
                      const isCompleted = c.status === "fulfilled";
                      const isBreached = c.status === "breached";

                      return (
                        <div 
                          key={c.id} 
                          className={`bg-slate-900/60 p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
                            isCompleted 
                              ? "border-teal-500/20 bg-teal-500/5 opacity-85" 
                              : isBreached 
                                ? "border-rose-500/20 bg-rose-950/10 opacity-80 animate-pulse" 
                                : "border-slate-800/80 hover:border-slate-700/80"
                          }`}
                        >
                          {/* Sealed status watermark */}
                          {isCompleted && (
                            <div className="absolute top-4 right-4 text-xs font-black uppercase border-2 border-teal-500 px-3 py-1 text-teal-400 tracking-widest rounded-lg transform rotate-12 bg-slate-950">
                              Honored & Fulfilled
                            </div>
                          )}

                          {isBreached && (
                            <div className="absolute top-4 right-4 text-xs font-black uppercase border-2 border-rose-500 px-3 py-1 text-rose-500 tracking-widest rounded-lg transform -rotate-12 bg-slate-950">
                              Breached & Defaulted
                            </div>
                          )}

                          <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                              <span className="text-[10px] font-mono text-rose-500 font-bold uppercase tracking-widest block">
                                COMMITMENT AGREEMENT CONTRACT
                              </span>
                              <h3 className="text-base font-black text-white mt-1">{c.title}</h3>
                              <p className="text-xs text-slate-400 mt-2 font-serif italic border-l-2 border-slate-700 pl-3 leading-relaxed">
                                "{c.pledge}"
                              </p>
                            </div>

                            <button
                              onClick={() => deleteContract(c.id)}
                              className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          {/* Specifics list details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 mt-4 text-[11px] font-mono">
                            <div>
                              <span className="text-slate-500 block uppercase">STAKE / PENALTY</span>
                              <span className="font-bold text-rose-400 uppercase">{c.penalty}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block uppercase">WITNESS ARBITRATOR</span>
                              <span className="font-bold text-slate-200">{c.arbitrator}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block uppercase">DEADLINE TARGET</span>
                              <span className="font-bold text-slate-300">{c.deadline}</span>
                            </div>
                          </div>

                          {/* Signature stamp display */}
                          <div className="flex items-end justify-between mt-5 border-t border-slate-800/60 pt-4 flex-wrap gap-4">
                            <div>
                              <span className="text-[10px] font-mono text-slate-500 uppercase block">Signed on Date</span>
                              <span className="text-xs font-mono text-slate-400">{c.signedAt}</span>
                            </div>

                            {c.signature && (
                              <div className="text-right">
                                <span className="text-[9px] font-mono text-slate-500 uppercase block">Secure Binding Digital Seal</span>
                                <img 
                                  src={c.signature} 
                                  alt="Digital Bind Signature" 
                                  className="h-10 border border-slate-800 bg-slate-950/90 rounded px-2 py-0.5 mt-1 object-contain inline-block"
                                />
                              </div>
                            )}
                          </div>

                          {/* Contract Execution Controllers */}
                          {c.status === "active" && (
                            <div className="flex gap-2.5 mt-4 border-t border-slate-800/40 pt-3">
                              <button
                                onClick={() => updateContractStatus(c.id, "fulfilled")}
                                className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Award className="h-4 w-4" />
                                I Honorably Kept My Pledge
                              </button>
                              <button
                                onClick={() => updateContractStatus(c.id, "breached")}
                                className="flex-1 py-1.5 bg-rose-950/30 hover:bg-rose-900/30 text-rose-400 font-bold text-xs rounded-lg border border-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Frown className="h-4 w-4" />
                                I Defaulted & Breached
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* G. DEADLINE NEGOTIATOR VIEW */}
        {activeTab === "negotiator" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-2xl font-black text-white">Deadline Negotiator</h2>
              <p className="text-sm text-slate-400">Compose polite, persuasive requests for more time without burning Bridges.</p>
            </div>

            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Extension solicitor Parameter Builder</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Goal / Task Title</label>
                  <input
                    type="text"
                    value={negotiatorTask}
                    onChange={(e) => setNegotiatorTask(e.target.value)}
                    placeholder="e.g. Q3 Presentation Deck slides"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:border-rose-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Recipient (Who gets the letter?)</label>
                  <input
                    type="text"
                    value={negotiatorRecipient}
                    onChange={(e) => setNegotiatorRecipient(e.target.value)}
                    placeholder="e.g. Professor Robinson, Client John"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:border-rose-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Original Deadline Date</label>
                  <input
                    type="date"
                    value={negotiatorOriginalDate}
                    onChange={(e) => setNegotiatorOriginalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:border-rose-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Proposed Extended Date</label>
                  <input
                    type="date"
                    value={negotiatorNewDate}
                    onChange={(e) => setNegotiatorNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:border-rose-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Reason for delay (be honest, we translate professionally)</label>
                <textarea
                  value={negotiatorReason}
                  onChange={(e) => setNegotiatorReason(e.target.value)}
                  placeholder="e.g. My internet crashed and my cat ran away, or I just procrastinated like a dog..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:border-rose-500/50 resize-none"
                />
              </div>

              {/* Tone selectors */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">Desired Letter Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "formal", label: "Formal Corporate" },
                    { key: "humble", label: "Apologetic & Humble" },
                    { key: "honest", label: "Honest & Human" },
                    { key: "cheeky", label: "Slightly Cheeky" }
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setNegotiatorTone(t.key)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer capitalize ${
                        negotiatorTone === t.key 
                          ? "bg-rose-500 text-white border-transparent shadow-md"
                          : "text-slate-400 bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={executeNegotiator}
                disabled={negotiatorLoading || !negotiatorTask.trim() || !negotiatorRecipient.trim() || !negotiatorNewDate}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {negotiatorLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Drafting Persuasive Alibi...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Draft Extension Proposal
                  </>
                )}
              </button>
            </div>

            {/* Negotiator Draft Result panel */}
            {negotiatorDraft && (
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="h-4.5 w-4.5 text-rose-500" />
                    Generated Extension Proposal Letter
                  </h4>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleReadAloud}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                        isDraftSpeaking
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isDraftSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {isDraftSpeaking ? "Stop Speaking" : "Speak Aloud"}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${negotiatorDraft.subjectLine}\n\n${negotiatorDraft.emailBody}`);
                        alert("Copied letter to clipboard!");
                      }}
                      className="px-3 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Proposal
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs font-mono">
                    <span className="text-slate-500 block uppercase font-bold text-[9px] mb-1">Subject Line</span>
                    <span className="text-slate-200 font-bold">{negotiatorDraft.subjectLine}</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-300 select-all">
                    {negotiatorDraft.emailBody}
                  </div>

                  <div className="bg-slate-950/40 p-3.5 border border-slate-800 rounded-xl text-[11px] leading-relaxed text-slate-400">
                    <strong className="text-slate-200 uppercase tracking-wide text-[10px] block mb-1">💡 Coach Strategic Delivery Advice:</strong>
                    {negotiatorDraft.tacticalAdvice}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* H. LIVE COACH CHAT VIEW */}
        {activeTab === "coach" && (
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Live AI Supervisor Chat</h2>
                <p className="text-sm text-slate-400">Get tough love, reality checks, or quick breakdown plans immediately.</p>
              </div>
            </div>
            <LiveCoachChat tasks={tasks} habits={habits} contracts={contracts} />
          </div>
        )}

      </main>

    </div>
  );

  function handleSignatureStop() {
    setIsDrawing(false);
  }
}
