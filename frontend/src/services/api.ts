/**
 * PlanzyPop AI - Frontend API Service Layer
 * Connects to the FastAPI backend via configurable VITE_API_BASE_URL.
 */

export type PlanRequest = {
  eventName: string;
  eventType: string;
  date?: string;
  location?: string;
  guests: number;
  budgetInr: number;
  celebrationStyle?: string;
  setting?: string;
  dietaryPreferences?: string;
  mainPriority?: string;
  preferences?: string[];
};

export type BudgetAllocationItem = {
  category: string;
  percentage: number;
  amount_inr: number;
  notes?: string;
};

export type TimelinePhase = {
  timeframe: string;
  action: string;
  details?: string;
};

export type ChecklistItem = {
  title: string;
  category: string;
  priority: string;
};

export type PlanResponse = {
  concept_title: string;
  concept_description: string;
  vibe: string;
  color_palette: string[];
  budget_allocation: BudgetAllocationItem[];
  preparation_timeline: TimelinePhase[];
  checklist: ChecklistItem[];
  menu_ideas: string[];
  vendor_categories: string[];
  cost_saving_suggestions: string[];
  is_demo: boolean;
  source: string;
  error_message?: string;
};

export type ChatRequest = {
  message: string;
  eventId?: number;
  eventContext?: Record<string, unknown>;
};

export type ChatResponse = {
  response: string;
  suggestions: string[];
  is_demo: boolean;
  source: string;
  error_message?: string;
};

export type HealthResponse = {
  status: string;
  app: string;
  tagline: string;
  version: string;
  gemini_configured: boolean;
  model: string;
};

// Configurable API base URL with fallback to same-origin relative requests
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function normalizePlan(raw: any): PlanResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid plan response received from API");
  }

  // Normalize budget allocation items
  const rawBudgetAllocation = raw.budget_allocation ?? raw.budgetAllocation ?? [];
  const budget_allocation: BudgetAllocationItem[] = Array.isArray(rawBudgetAllocation)
    ? rawBudgetAllocation.map((item: any) => ({
        category: String(item?.category ?? "General"),
        percentage: Number(item?.percentage ?? 0),
        amount_inr: Number(item?.amount_inr ?? item?.amountInr ?? 0),
        notes: item?.notes ? String(item.notes) : "",
      }))
    : [];

  // Normalize preparation timeline
  const rawTimeline = raw.preparation_timeline ?? raw.preparationTimeline ?? raw.timeline ?? [];
  const preparation_timeline: TimelinePhase[] = Array.isArray(rawTimeline)
    ? rawTimeline.map((item: any) => ({
        timeframe: String(item?.timeframe ?? "Milestone"),
        action: String(item?.action ?? "Task"),
        details: item?.details ? String(item.details) : "",
      }))
    : [];

  // Normalize checklist
  const rawChecklist = raw.checklist ?? [];
  const checklist: ChecklistItem[] = Array.isArray(rawChecklist)
    ? rawChecklist.map((item: any) => ({
        title: String(item?.title ?? "Checklist task"),
        category: String(item?.category ?? "General"),
        priority: String(item?.priority ?? "Medium"),
      }))
    : [];

  // Normalize arrays with safe defaults
  const color_palette: string[] = Array.isArray(raw.color_palette ?? raw.colorPalette)
    ? (raw.color_palette ?? raw.colorPalette).map(String)
    : ["#F4A261", "#E76F51", "#2A9D8F", "#E9C46A"];

  const menu_ideas: string[] = Array.isArray(raw.menu_ideas ?? raw.menuIdeas)
    ? (raw.menu_ideas ?? raw.menuIdeas).map(String)
    : ["Curated celebration menu"];

  const vendor_categories: string[] = Array.isArray(raw.vendor_categories ?? raw.vendorCategories)
    ? (raw.vendor_categories ?? raw.vendorCategories).map(String)
    : ["Venue", "Catering", "Décor", "Photo"];

  const cost_saving_suggestions: string[] = Array.isArray(raw.cost_saving_suggestions ?? raw.costSavingSuggestions)
    ? (raw.cost_saving_suggestions ?? raw.costSavingSuggestions).map(String)
    : ["Reuse focal décor elements across spaces."];

  return {
    concept_title: String(raw.concept_title ?? raw.conceptTitle ?? "Curated Celebration"),
    concept_description: String(
      raw.concept_description ?? raw.conceptDescription ?? "A thoughtful celebration tailored for your occasion."
    ),
    vibe: String(raw.vibe ?? "Celebration vibe"),
    color_palette,
    budget_allocation,
    preparation_timeline,
    checklist,
    menu_ideas,
    vendor_categories,
    cost_saving_suggestions,
    is_demo: Boolean(raw.is_demo ?? raw.isDemo ?? false),
    source: String(raw.source ?? (raw.is_demo || raw.isDemo ? "curated_demo" : "gemini")),
    error_message: raw.error_message ?? raw.errorMessage ? String(raw.error_message ?? raw.errorMessage) : undefined,
  };
}

export function normalizeChat(raw: any): ChatResponse {
  if (!raw || typeof raw !== "object") {
    return {
      response: "PlanzyPop assistant is ready to help with your celebration.",
      suggestions: [],
      is_demo: true,
      source: "curated_demo",
    };
  }
  return {
    response: String(raw.response ?? "PlanzyPop assistant is ready to help."),
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String) : [],
    is_demo: Boolean(raw.is_demo ?? raw.isDemo ?? false),
    source: String(raw.source ?? "curated_demo"),
    error_message: raw.error_message ?? raw.errorMessage ? String(raw.error_message ?? raw.errorMessage) : undefined,
  };
}

export const api = {
  /** Check if the backend is reachable and Gemini is configured */
  health: () => request<HealthResponse>("/health"),

  /** Generate an event plan via Gemini (or backend fallback) with response normalization */
  generatePlan: async (payload: PlanRequest): Promise<PlanResponse> => {
    const raw = await request<any>("/api/plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizePlan(raw);
  },

  /** Ask the event-specific celebration assistant with response normalization */
  chat: async (message: string, eventId?: number, eventContext?: Record<string, unknown>): Promise<ChatResponse> => {
    const raw = await request<any>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, eventId, eventContext }),
    });
    return normalizeChat(raw);
  },
};

