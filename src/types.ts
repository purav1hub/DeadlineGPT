export type Priority = "low" | "medium" | "high";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string (YYYY-MM-DD)
  priority: Priority;
  completed: boolean;
  subtasks: Subtask[];
  createdAt: string;
  category: string; // e.g. "Work", "School", "Personal"
}

export interface Milestone {
  title: string;
  description: string;
  targetDay: number;
  estimatedHours: number;
  completed?: boolean;
}

export interface ScheduleRoadmap {
  taskName: string;
  deadline: string;
  milestones: Milestone[];
  coachCommentary: string;
  generatedAt: string;
}

export interface CommitmentContract {
  id: string;
  title: string;
  pledge: string; // What they commit to
  deadline: string;
  penalty: string; // The stakes
  arbitrator: string; // Friend/supervisor verifying
  signature: string; // Base64 signature image
  signedAt: string;
  status: "active" | "fulfilled" | "breached";
}

export interface Habit {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  completions: string[]; // dates of completion YYYY-MM-DD
  streak: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: string;
}

export interface ExtensionDraft {
  subjectLine: string;
  emailBody: string;
  tacticalAdvice: string;
}
