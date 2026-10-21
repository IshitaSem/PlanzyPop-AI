/**
 * PlanzyPop AI - Frontend API Service Layer
 * Connects to the FastAPI backend via configurable VITE_API_BASE_URL.
 */

export type PlanRequest = {
  eventName: string
  eventType: string
  date?: string
  location?: string
  guests: number
  budgetInr: number
  celebrationStyle?: string
  setting?: string
  dietaryPreferences?: string
  mainPriority?: string
  preferences?: string[]
}

export type BudgetAllocationItem = {
  category: string
  percentage: number
  amount_inr: number
  notes?: string
}

export type TimelinePhase = {
  timeframe: string
  action: string
  details?: string
}

export type ChecklistItem = {
  title: string
  category: string
  priority: string
}

export type PlanResponse = {
  concept_title: string
  concept_description: string
  vibe: string
  color_palette: string[]
  budget_allocation: BudgetAllocationItem[]
  preparation_timeline: TimelinePhase[]
  checklist: ChecklistItem[]
  menu_ideas: string[]
  vendor_categories: string[]
  cost_saving_suggestions: string[]
  is_demo: boolean
  source: string
  error_message?: string
}

export type ChatRequest = {
  message: string
  eventId?: number
  eventContext?: Record<string, unknown>
}

export type ChatResponse = {
  response: string
  suggestions: string[]
  is_demo: boolean
  source: string
  error_message?: string
}

export type HealthResponse = {
  status: string
  app: string
  tagline: string
  version: string
  gemini_configured: boolean
  model: string
}

// Configurable API base URL with fallback to same-origin relative requests
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  let signal = init?.signal
  if (
    !signal &&
    typeof AbortSignal !== "undefined" &&
    "timeout" in AbortSignal
  ) {
    try {
      signal = AbortSignal.timeout(15000)
    } catch {
      // Safe fallback if AbortSignal.timeout is unavailable in test runner
    }
  }

  const response = await fetch(url, {
    ...init,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Request failed with status ${response.status}: ${response.statusText}`,
    )
  }

  return response.json() as Promise<T>
}

export function normalizePlan(raw: unknown): PlanResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid plan response received from API")
  }

  // Normalize budget allocation items
  const rawBudgetAllocation =
    raw.budget_allocation ?? raw.budgetAllocation ?? []
  const budget_allocation: BudgetAllocationItem[] = Array.isArray(
    rawBudgetAllocation,
  )
    ? rawBudgetAllocation.map((item: unknown) => {
        const itemObj = isRecord(item) ? item : {}
        return {
          category: String(itemObj.category ?? "General"),
          percentage: Number(itemObj.percentage ?? 0),
          amount_inr: Number(itemObj.amount_inr ?? itemObj.amountInr ?? 0),
          notes: itemObj.notes ? String(itemObj.notes) : "",
        }
      })
    : []

  // Normalize preparation timeline
  const rawTimeline =
    raw.preparation_timeline ?? raw.preparationTimeline ?? raw.timeline ?? []
  const preparation_timeline: TimelinePhase[] = Array.isArray(rawTimeline)
    ? rawTimeline.map((item: unknown) => {
        const itemObj = isRecord(item) ? item : {}
        return {
          timeframe: String(itemObj.timeframe ?? "Milestone"),
          action: String(itemObj.action ?? "Task"),
          details: itemObj.details ? String(itemObj.details) : "",
        }
      })
    : []

  // Normalize checklist
  const rawChecklist = raw.checklist ?? []
  const checklist: ChecklistItem[] = Array.isArray(rawChecklist)
    ? rawChecklist.map((item: unknown) => {
        const itemObj = isRecord(item) ? item : {}
        return {
          title: String(itemObj.title ?? "Checklist task"),
          category: String(itemObj.category ?? "General"),
          priority: String(itemObj.priority ?? "Medium"),
        }
      })
    : []

  // Normalize arrays with safe defaults
  const rawColors = raw.color_palette ?? raw.colorPalette
  const color_palette: string[] = Array.isArray(rawColors)
    ? rawColors.map(String)
    : ["#F4A261", "#E76F51", "#2A9D8F", "#E9C46A"]

  const rawMenu = raw.menu_ideas ?? raw.menuIdeas
  const menu_ideas: string[] = Array.isArray(rawMenu)
    ? rawMenu.map(String)
    : ["Curated celebration menu"]

  const rawVendors = raw.vendor_categories ?? raw.vendorCategories
  const vendor_categories: string[] = Array.isArray(rawVendors)
    ? rawVendors.map(String)
    : ["Venue", "Catering", "Décor", "Photo"]

  const rawSavings = raw.cost_saving_suggestions ?? raw.costSavingSuggestions
  const cost_saving_suggestions: string[] = Array.isArray(rawSavings)
    ? rawSavings.map(String)
    : ["Reuse focal décor elements across spaces."]

  return {
    concept_title: String(
      raw.concept_title ?? raw.conceptTitle ?? "Curated Celebration",
    ),
    concept_description: String(
      raw.concept_description ??
        raw.conceptDescription ??
        "A thoughtful celebration tailored for your occasion.",
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
    source: String(
      raw.source ?? (raw.is_demo || raw.isDemo ? "curated_demo" : "gemini"),
    ),
    error_message:
      (raw.error_message ?? raw.errorMessage)
        ? String(raw.error_message ?? raw.errorMessage)
        : undefined,
  }
}

export function normalizeChat(raw: unknown): ChatResponse {
  if (!isRecord(raw)) {
    return {
      response: "PlanzyPop assistant is ready to help with your celebration.",
      suggestions: [],
      is_demo: true,
      source: "curated_demo",
    }
  }
  return {
    response: String(raw.response ?? "PlanzyPop assistant is ready to help."),
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.map(String)
      : [],
    is_demo: Boolean(raw.is_demo ?? raw.isDemo ?? false),
    source: String(raw.source ?? "curated_demo"),
    error_message:
      (raw.error_message ?? raw.errorMessage)
        ? String(raw.error_message ?? raw.errorMessage)
        : undefined,
  }
}

export const api = {
  /** Check if the backend is reachable and Gemini is configured */
  health: () => request<HealthResponse>("/health"),

  /** Generate an event plan via Gemini (or backend fallback) with response normalization */
  generatePlan: async (payload: PlanRequest): Promise<PlanResponse> => {
    const raw = await request<unknown>("/api/plan", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return normalizePlan(raw)
  },

  /** Ask the event-specific celebration assistant with response normalization */
  chat: async (
    message: string,
    eventId?: number,
    eventContext?: Record<string, unknown>,
  ): Promise<ChatResponse> => {
    const raw = await request<unknown>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, eventId, eventContext }),
    })
    return normalizeChat(raw)
  },
}
