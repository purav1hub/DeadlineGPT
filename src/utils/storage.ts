import { Task, Habit, CommitmentContract, ScheduleRoadmap } from "../types";

const KEYS = {
  TASKS: "deadlinegpt_tasks",
  HABITS: "deadlinegpt_habits",
  CONTRACTS: "deadlinegpt_contracts",
  ROADMAPS: "deadlinegpt_roadmaps",
  LAST_PANIC: "deadlinegpt_last_panic",
};

export const StorageHelper = {
  // Tasks
  getTasks(): Task[] {
    const raw = localStorage.getItem(KEYS.TASKS);
    if (!raw) {
      // Provide some excellent starter mock tasks so the app doesn't look empty
      const defaultTasks: Task[] = [
        {
          id: "t0",
          title: "Data Structures Final Exam",
          description: "Major academic final exam. Covers Binary Trees, Hash Maps, Graph algorithms, and Big-O analysis.",
          deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          priority: "high",
          completed: false,
          category: "School",
          subtasks: [
            { id: "s0_1", title: "Review Graph Traversals (DFS/BFS)", completed: false },
            { id: "s0_2", title: "Practice Hash Map collisions handling", completed: false },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: "t1",
          title: "Finish high-priority project slides",
          description: "Compile and design the Q3 marketing presentation. Make sure to use elegant themes.",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 days from now
          priority: "high",
          completed: false,
          category: "Work",
          subtasks: [
            { id: "s1", title: "Outline key deliverables", completed: true },
            { id: "s2", title: "Add charts for campaign analytics", completed: false },
            { id: "s3", title: "Polish styling and proofread", completed: false },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: "t2",
          title: "Study for Machine Learning final exam",
          description: "Review neural net optimization, backprop math, and transformer architectures.",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 5 days from now
          priority: "high",
          completed: false,
          category: "School",
          subtasks: [
            { id: "s4", title: "Solve past practice exam papers", completed: false },
            { id: "s5", title: "Review backpropagation derivations", completed: false },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: "t3",
          title: "Book dental appointment checkup",
          description: "Call health clinic to secure an open slot.",
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 days from now
          priority: "low",
          completed: true,
          category: "Personal",
          subtasks: [],
          createdAt: new Date().toISOString(),
        },
      ];
      this.saveTasks(defaultTasks);
      return defaultTasks;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  },

  // Habits
  getHabits(): Habit[] {
    const raw = localStorage.getItem(KEYS.HABITS);
    if (!raw) {
      const defaultHabits: Habit[] = [
        {
          id: "h1",
          title: "Deep Focus Hour (No Phones)",
          frequency: "daily",
          completions: [
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          ],
          streak: 2,
          createdAt: new Date().toISOString(),
        },
        {
          id: "h2",
          title: "Weekly Reflection & Planning",
          frequency: "weekly",
          completions: [],
          streak: 0,
          createdAt: new Date().toISOString(),
        },
      ];
      this.saveHabits(defaultHabits);
      return defaultHabits;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveHabits(habits: Habit[]): void {
    localStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
  },

  // Commitment Contracts
  getContracts(): CommitmentContract[] {
    const raw = localStorage.getItem(KEYS.CONTRACTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveContracts(contracts: CommitmentContract[]): void {
    localStorage.setItem(KEYS.CONTRACTS, JSON.stringify(contracts));
  },

  // AI Schedule Roadmaps
  getRoadmaps(): ScheduleRoadmap[] {
    const raw = localStorage.getItem(KEYS.ROADMAPS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveRoadmaps(roadmaps: ScheduleRoadmap[]): void {
    localStorage.setItem(KEYS.ROADMAPS, JSON.stringify(roadmaps));
  },
};
