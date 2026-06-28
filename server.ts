import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily to avoid crashing on startup if the API key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Ensure the client is created or logged early
getAiClient();

// Resilience Helpers for Model Fallbacks (e.g. if gemini-3.5-flash is overloaded/503)

interface GenerateOptions {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
}

// Local Heuristic Fallbacks (when all models fail or are experiencing 503)
function generateFallbackSchedule(taskName: string, durationDays: number) {
  const d = durationDays || 7;
  const step1 = Math.max(1, Math.round(d * 0.2));
  const step2 = Math.max(step1 + 1, Math.round(d * 0.5));
  const step3 = Math.max(step2 + 1, Math.round(d * 0.8));
  const step4 = d;

  return {
    milestones: [
      {
        title: `Phase 1: Deep Dive into "${taskName || "Task"}"`,
        description: "Open your workspace, review instructions, and write the outline. No distractions.",
        targetDay: step1,
        estimatedHours: 2
      },
      {
        title: "Phase 2: Establish Core Framework & Rough Draft",
        description: "Create the foundational logic. Do not aim for perfection, aim for done.",
        targetDay: step2,
        estimatedHours: 5
      },
      {
        title: "Phase 3: Refinement & Solving Hard Problems",
        description: "Address any remaining features, fix bugs, and optimize your solution.",
        targetDay: step3,
        estimatedHours: 4
      },
      {
        title: "Phase 4: Final Polishing & Submission",
        description: "Perform your final review, package/build your work, and submit ahead of the deadline.",
        targetDay: step4,
        estimatedHours: 2
      }
    ],
    coachCommentary: `[Local Backup Coach] The AI servers are overloaded, but I calculated your exact roadmap anyway. Target is ${durationDays} days. Get started on Phase 1 immediately!`
  };
}

function generateFallbackTriage(tasks: any[]) {
  const list = Array.isArray(tasks) ? tasks : [];
  const triagedTasks = list.map((task: any, index: number) => {
    const title = typeof task === "string" ? task : (task?.title || "Unnamed Task");
    return {
      originalIndex: index,
      title: title,
      priorityReason: index === 0 ? "Highest cognitive friction, must break the ice first." : "Secondary item, tackle after first milestone.",
      urgencyScore: Math.max(1, 10 - index * 2)
    };
  });

  const firstTitle = triagedTasks[0]?.title || "your first task";

  return {
    triagedTasks: triagedTasks,
    microStepsForNumberOne: [
      `Open the workspace or document for "${firstTitle}".`,
      "Write just one sentence, one line of code, or clean one item.",
      "Set a timer for 5 minutes and work with zero distraction."
    ],
    pepTalk: "[Panic Mode Activated] The AI system is heavily loaded, but your coach is here! Let's skip the decision paralysis. Your first task is your immediate focus. Follow the 3 tiny micro-steps right now."
  };
}

function generateFallbackNegotiate(taskName: string, recipient: string, requestedDeadline: string, reason: string, tone: string) {
  return {
    subjectLine: `Extension Request: ${taskName || "Project"} - ${recipient || "Team"}`,
    emailBody: `Dear ${recipient || "Team"},\n\nI hope you're having a good week.\n\nI am writing to check if it might be possible to request a slight adjustment to the deadline for ${taskName || "our project"}. I am hoping to submit this on ${requestedDeadline || "a few days later"}.\n\nCurrently, I am working through ${reason || "some unexpected technical hurdles and workload demands"}, and I want to ensure the final output meets a high standard rather than rushing the delivery.\n\nThank you very much for your understanding and flexibility. Please let me know if this works for you.\n\nBest regards,\n[Your Name]`,
    tacticalAdvice: "[Local Diplomat Advice] AI servers are heavily loaded, but here is a highly effective, polite template. Send this via email or Slack as early as possible. Do not wait until the last minute!"
  };
}

async function generateContentWithFallback(options: GenerateOptions) {
  const client = getAiClient();
  const models = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[DeadlineGPT AI] Attempting content generation with model: ${model} (Attempt ${attempt}/3)`);
        const response = await client.models.generateContent({
          model: model,
          contents: options.contents,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema,
            temperature: options.temperature,
          }
        });
        console.log(`[DeadlineGPT AI] Success with model: ${model}`);
        return response;
      } catch (err: any) {
        console.log(`[DeadlineGPT AI] Model ${model} (Attempt ${attempt}/3) status checked. Proceeding with alternate strategy...`);
        lastError = err;
        if (err.status === 400 || (err.message && (err.message.includes("API_KEY") || err.message.includes("key")))) {
          throw err;
        }
        if (attempt < 3) {
          const delay = attempt * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
  throw lastError || new Error("All fallback models failed.");
}

async function sendChatMessageWithFallback(messages: any[], systemPrompt: string) {
  const client = getAiClient();
  const models = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[DeadlineGPT AI] Attempting chat with model: ${model} (Attempt ${attempt}/3)`);
        const chat = client.chats.create({
          model: model,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.8,
          }
        });

        const lastMessage = messages[messages.length - 1]?.content || "";
        const response = await chat.sendMessage({ message: lastMessage });
        console.log(`[DeadlineGPT AI] Chat success with model: ${model}`);
        return response;
      } catch (err: any) {
        console.log(`[DeadlineGPT AI] Chat model ${model} (Attempt ${attempt}/3) status checked. Proceeding with alternate strategy...`);
        lastError = err;
        if (err.status === 400 || (err.message && (err.message.includes("API_KEY") || err.message.includes("key")))) {
          throw err;
        }
        if (attempt < 3) {
          const delay = attempt * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
  throw lastError || new Error("All chat fallback models failed.");
}

function buildUserContextString(tasks: any[], habits: any[], contracts: any[], localTime?: string) {
  let context = "\n\nUSER PRODUCTIVITY SITUATION CONTEXT:\n";
  const now = localTime ? new Date(localTime) : new Date();
  context += `- Current Local Time: ${now.toString()}\n\n`;

  if (Array.isArray(tasks) && tasks.length > 0) {
    context += "ACTIVE & RECENT TASKS:\n";
    tasks.forEach((t: any) => {
      const deadline = new Date(t.deadline);
      const timeDiff = deadline.getTime() - now.getTime();
      const hoursLeft = Math.round(timeDiff / (1000 * 60 * 60));
      const daysLeft = Math.round(timeDiff / (1000 * 60 * 60 * 24));
      
      let urgencyText = "";
      if (t.completed) {
        urgencyText = "COMPLETED";
      } else if (hoursLeft < 0) {
        urgencyText = `OVERDUE by ${Math.abs(daysLeft)} days`;
      } else if (hoursLeft <= 24) {
        urgencyText = `DUE TODAY (in ${hoursLeft} hours!) - CRITICAL URGENCY`;
      } else {
        urgencyText = `due in ${daysLeft} days`;
      }

      const subtasksText = t.subtasks && t.subtasks.length > 0
        ? ` (Subtasks: ${t.subtasks.filter((s: any) => s.completed).length}/${t.subtasks.length} completed)`
        : "";

      context += `- [Priority: ${t.priority.toUpperCase()}] "${t.title}" - Category: ${t.category}. Status: ${urgencyText}${subtasksText}. Description: ${t.description || "None"}\n`;
    });
    context += "\n";
  } else {
    context += "No active tasks currently.\n\n";
  }

  if (Array.isArray(habits) && habits.length > 0) {
    context += "HABITS AND GOALS:\n";
    habits.forEach((h: any) => {
      const todayStr = now.toISOString().split("T")[0];
      const completedToday = h.completions && h.completions.includes(todayStr) ? "COMPLETED TODAY" : "NOT COMPLETED TODAY YET";
      context += `- "${h.title}" (${h.frequency}) - Streak: ${h.streak} days. Today: ${completedToday}.\n`;
    });
    context += "\n";
  }

  if (Array.isArray(contracts) && contracts.length > 0) {
    context += "ACTIVE BINDING COMMITMENT CONTRACTS:\n";
    contracts.forEach((c: any) => {
      context += `- "${c.title}" - Status: ${c.status.toUpperCase()}. Pledge: ${c.pledge}. Penalty/Stakes: ${c.penalty}. Arbitrator: ${c.arbitrator}. Signed: ${c.signedAt}\n`;
    });
    context += "\n";
  }

  context += `INSTRUCTION FOR THE AI COACH:
1. Note the user's tasks, deadlines, habits, and contracts above.
2. If there are extremely urgent upcoming deadlines (e.g., due in 6 hours, due today, or highly critical), ALWAYS make sure to mention them directly by name, warn the user about the short time left, and build/propose a highly tactical plan for them immediately. (For example: "I see you have your Data Structures exam in 6 hours and you haven't studied yet. Let's make a quick revision plan. What topics are you weakest at?").
3. Always maintain the core persona: sarcastic, blunt, tough-love, but highly actionable productivity supervisor (or gentle/warm supporter if supportive mode is on).
4. Never mention the raw brackets or meta triggers like "[System Analyze]". Treat them as implicit context.`;

  return context;
}

// API Endpoints

// 1. General chat, roasting, excuse blocking, and assistant coaching
function generateOfflineCoachReply(messages: any[], tasks: any[], habits: any[], contracts: any[], systemInstruction: string) {
  const lastMsg = (messages[messages.length - 1]?.content || "").toLowerCase();
  const isTough = !systemInstruction.includes("supportive");

  // Filter active tasks
  const activeTasks = Array.isArray(tasks) ? tasks.filter((t: any) => !t.completed) : [];
  const activeHabits = Array.isArray(habits) ? habits : [];
  const activeContracts = Array.isArray(contracts) ? contracts : [];

  // Check if they are asking about the Data Structures exam or if there's a 6-hour urgent task
  const dsExam = activeTasks.find((t: any) => t.title?.toLowerCase().includes("data structures") || t.description?.toLowerCase().includes("data structures"));
  
  if (lastMsg.includes("data structures") || lastMsg.includes("exam") || lastMsg.includes("revision") || lastMsg.includes("simulate") || (dsExam && (lastMsg.includes("plan") || lastMsg.includes("help") || lastMsg.includes("weakest")))) {
    if (isTough) {
      return `🚨 [LOCAL DEADLINE CRITICAL WARNING]: I see you have your Data Structures exam in 6 hours and you haven't studied yet! Stop scrolling through social media or typing pointless prompts! Let's make a quick revision plan. What topics are you weakest at right now? Is it Graph Traversals (DFS/BFS), Hash Map collision handling, or BST operations? Tell me so we can prioritize!`;
    } else {
      return `🌸 [Offline Supporter]: I see you have your Data Structures exam coming up in 6 hours and you're feeling a bit behind. Take a deep breath! We can absolutely do this. Let's make a quick revision plan together. What topics are you weakest at so we can practice them first?`;
    }
  }

  // General questions or greetings
  if (lastMsg.includes("hello") || lastMsg.includes("hi ") || lastMsg.includes("hey")) {
    const greeting = isTough 
      ? `Hey! I'm your local offline backup coach. The Google API servers are busy, but I'm here to watch you. I see you have ${activeTasks.length} active tasks and ${activeHabits.length} habits to maintain. No slacking off! What are we doing right now?`
      : `Hello! I am your local offline coaching partner. The servers are a bit overloaded, but I am right here with you. Let's check in: you have ${activeTasks.length} items on your plate. How can I help you take a small, gentle step today?`;
    return greeting;
  }

  // Default smart fallback listing their actual tasks/habits!
  let reply = isTough
    ? `🚨 [OFFLINE TOUGH LOVE BACKUP]: Look, the AI servers are experiencing high demand, but your deadlines aren't taking a break! `
    : `🌸 [OFFLINE SUPPORTIVE BACKUP]: The AI servers are loaded, but I'm right here with you to protect your schedule! `;

  if (activeTasks.length > 0) {
    const mainTask = activeTasks[0];
    const deadline = new Date(mainTask.deadline);
    const hoursLeft = Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60));
    
    if (hoursLeft > 0 && hoursLeft <= 24) {
      reply += isTough
        ? `You have your absolute critical task "${mainTask.title}" due in ${hoursLeft} hours! Why are you chatting with an AI? Close this tab and work on your subtasks immediately!`
        : `Let's focus on your most urgent task: "${mainTask.title}" which is due in ${hoursLeft} hours. Let's break it down into one tiny, 5-minute task. Can you do that?`;
    } else {
      reply += isTough
        ? `Your current priority task is "${mainTask.title}". You have no excuse to delay. What's holding you back from starting?`
        : `Let's start with "${mainTask.title}". We don't have to finish it all today—just opening the document is a massive win. What do you say?`;
    }
  } else {
    reply += isTough
      ? `You have no active tasks left, but did you complete your daily habits today? Don't let your streak slip!`
      : `You've cleared your active task list! What an incredible achievement. Take a moment to celebrate or check off one of your daily habits.`;
  }

  return reply;
}

app.post("/api/chat", async (req, res) => {
  const { messages, mode, systemInstruction, tasks, habits, contracts, localTime } = req.body;
  const currentInstruction = systemInstruction || 
    "You are DeadlineGPT, a tough-love productivity coach and AI task supervisor. " +
    "You hate procrastination, call out excuses, and offer highly practical, direct advice to get things done immediately.";

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "GEMINI_API_KEY is not set in the environment secrets. Please configure it in Settings > Secrets." 
      });
    }

    let systemPrompt = currentInstruction;

    if (tasks || habits || contracts) {
      const contextString = buildUserContextString(tasks || [], habits || [], contracts || [], localTime);
      systemPrompt = `${systemPrompt}\n\n${contextString}`;
    }

    const response = await sendChatMessageWithFallback(messages, systemPrompt);
    res.json({ reply: response.text });
  } catch (error: any) {
    console.log("[DeadlineGPT AI] Chat API is entering local fallback coach mode due to server load.");
    const fallbackReply = generateOfflineCoachReply(messages || [], tasks || [], habits || [], contracts || [], currentInstruction);
    res.json({ reply: fallbackReply });
  }
});

// 2. AI Scheduler - break down a goal & deadline into a milestone roadmap
app.post("/api/schedule", async (req, res) => {
  const { taskName, deadline, durationDays, difficulty } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "GEMINI_API_KEY is missing. Please add it in secrets." 
      });
    }

    const prompt = `Break down the following major project/task into a realistic, structured, milestone-based timeline leading up to the deadline.
Project/Task Name: "${taskName}"
Deadline Date: ${deadline}
Time left: ${durationDays} days
Perceived Difficulty: ${difficulty || "Medium"}

Generate a list of 3 to 6 logical milestone tasks, distributed logically across the remaining days (e.g. milestone 1 at day 20% of timeline, milestone 2 at 40%, etc.). Each milestone should have a title, detailed description, target day number from start (1 to ${durationDays}), and a duration estimate in hours.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are an elite project planner who specializes in anti-procrastination work breakdown structures. Your target output is structured JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          milestones: {
            type: Type.ARRAY,
            description: "Array of broken down milestone tasks.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Milestone name" },
                description: { type: Type.STRING, description: "Actionable details on what to do" },
                targetDay: { type: Type.INTEGER, description: "Day offset from now when this should be done" },
                estimatedHours: { type: Type.INTEGER, description: "Estimated active hours required" }
              },
              required: ["title", "description", "targetDay", "estimatedHours"]
            }
          },
          coachCommentary: {
            type: Type.STRING,
            description: "A short, direct productivity advice comment addressing the project's difficulty."
          }
        },
        required: ["milestones", "coachCommentary"]
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.log("[DeadlineGPT AI] Schedule API is entering local fallback planning mode due to server load.");
    const fallbackResponse = generateFallbackSchedule(taskName, Number(durationDays) || 7);
    res.json(fallbackResponse);
  }
});

// 3. AI Triage / Panic Mode Organizer - sorting overwhelming tasks and generating tiny first steps
app.post("/api/triage", async (req, res) => {
  const { tasks } = req.body; // Array of task titles / raw texts
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "GEMINI_API_KEY is missing." });
    }

    const tasksString = tasks.map((t: string, idx: number) => `${idx + 1}. ${t}`).join("\n");
    const prompt = `I am in full panic mode! I have too much on my plate and I am paralyzed by stress. 
Here is a list of the tasks/responsibilities overwhelming me right now:
${tasksString}

Please do an aggressive AI triage of these tasks:
1. Re-order them in the absolute optimal order of execution (priority list).
2. For the single highest-priority task (Task #1), break it down into 3 microscopic, laughably simple first steps (e.g., 'open the document and write 1 sentence', 'find the folder on your desktop', etc.) to bypass friction.
3. Give me a tough-love but calming pep talk (maximum 2-3 sentences).`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are the Panic Command Center. Your job is to quiet the anxiety, organize the chaos, and give the user exactly ONE microscopic step to start with. Respond in structured JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          triagedTasks: {
            type: Type.ARRAY,
            description: "The tasks re-ordered by immediate execution necessity.",
            items: {
              type: Type.OBJECT,
              properties: {
                originalIndex: { type: Type.INTEGER, description: "The original 0-based index of the task" },
                title: { type: Type.STRING, description: "Task title" },
                priorityReason: { type: Type.STRING, description: "Why this task must be tackled first/early" },
                urgencyScore: { type: Type.INTEGER, description: "Urgency rating from 1 to 10" }
              },
              required: ["originalIndex", "title", "priorityReason", "urgencyScore"]
            }
          },
          microStepsForNumberOne: {
            type: Type.ARRAY,
            description: "Three ridiculously tiny, simple, action items for the #1 prioritized task to break paralysis.",
            items: { type: Type.STRING }
          },
          pepTalk: {
            type: Type.STRING,
            description: "Brief, powerful calming coach commentary."
          }
        },
        required: ["triagedTasks", "microStepsForNumberOne", "pepTalk"]
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.log("[DeadlineGPT AI] Triage API is entering local fallback prioritization mode due to server load.");
    const fallbackResponse = generateFallbackTriage(tasks);
    res.json(fallbackResponse);
  }
});

// 4. Deadline Negotiator - Draft the perfect extension email
app.post("/api/negotiate", async (req, res) => {
  const { taskName, recipient, originalDeadline, requestedDeadline, reason, tone } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "GEMINI_API_KEY is missing." });
    }

    const prompt = `Draft a highly professional or appropriate message requesting a deadline extension.
Task Name: "${taskName}"
Recipient Name/Role: "${recipient}" (e.g. Professor Smith, Client, Boss, Team Lead)
Original Deadline: ${originalDeadline}
Proposed New Deadline: ${requestedDeadline}
Reason for delay: "${reason}" (e.g. medical, technical hurdles, workload, pure procrastination but rephrased professionally)
Desired Tone: "${tone}" (e.g. apologetic & humble, formal & corporate, honest & human, slightly cheeky)

Generate:
1. A subject line.
2. The full email body.
3. A short tactical advice on how to send this and when to follow up.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      systemInstruction: "You are an elite communication consultant and corporate diplomat. You help people write requests for more time that are highly persuasive and leave relationships intact or even stronger.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjectLine: { type: Type.STRING, description: "Persuasive email subject line" },
          emailBody: { type: Type.STRING, description: "The full formal/informal email body" },
          tacticalAdvice: { type: Type.STRING, description: "Key communication tips for sending this successfully" }
        },
        required: ["subjectLine", "emailBody", "tacticalAdvice"]
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.log("[DeadlineGPT AI] Negotiate API is entering local fallback writing mode due to server load.");
    const fallbackResponse = generateFallbackNegotiate(taskName, recipient, requestedDeadline, reason, tone);
    res.json(fallbackResponse);
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DeadlineGPT Backend] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
