"""Pydantic schemas for event planner and chat endpoints."""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class BudgetAllocationItem(BaseModel):
    """Deterministic budget allocation item."""
    model_config = ConfigDict(populate_by_name=True)

    category: str = Field(..., description="Expense category name (e.g. Food & drinks, Venue)")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of total budget allocated")
    amount_inr: int = Field(..., ge=0, description="Deterministic calculated amount in INR")
    notes: Optional[str] = Field(default="", description="Category tip or guideline")


class TimelinePhase(BaseModel):
    """Timeline phase or milestone."""
    model_config = ConfigDict(populate_by_name=True)

    timeframe: str = Field(..., description="Timeline milestone (e.g. 8 weeks before, Event day)")
    action: str = Field(..., description="Key task or milestone action")
    details: Optional[str] = Field(default="", description="Additional details")


class ChecklistItem(BaseModel):
    """Checklist action item."""
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., description="Checklist item description")
    category: str = Field(default="General", description="Category for this task")
    priority: str = Field(default="Medium", description="High, Medium, or Low")


class PlanRequest(BaseModel):
    """Request payload for AI event planner."""
    model_config = ConfigDict(populate_by_name=True)

    event_name: str = Field(..., alias="eventName", min_length=1, max_length=150, description="Name of the celebration")
    event_type: str = Field(..., alias="eventType", min_length=1, max_length=100, description="Type of event (Birthday, Wedding, etc.)")
    date: Optional[str] = Field(default="2026-05-15", description="Target celebration date (YYYY-MM-DD)")
    location: str = Field(default="Jaipur, Rajasthan", description="City or venue name")
    guests: int = Field(..., ge=1, le=100000, description="Expected guest count")
    budget_inr: int = Field(..., alias="budgetInr", ge=500, description="Total budget in INR")

    celebration_style: Optional[str] = Field(default="Warm & intimate", alias="celebrationStyle", description="Style mood or vibe")
    setting: Optional[str] = Field(default="Outdoor", description="Outdoor, Indoor, or Open to either")
    dietary_preferences: Optional[Union[str, List[str]]] = Field(
        default="Mixed menu", alias="dietaryPreferences", description="Dietary preferences"
    )
    main_priority: Optional[str] = Field(default="Guest experience", alias="mainPriority", description="Primary focus")
    preferences: Optional[List[str]] = Field(default_factory=list, description="Additional custom preference tags")


class PlanResponse(BaseModel):
    """Structured event plan response."""
    model_config = ConfigDict(populate_by_name=True)

    concept_title: str = Field(..., alias="conceptTitle")
    concept_description: str = Field(..., alias="conceptDescription")
    vibe: str
    color_palette: List[str] = Field(..., alias="colorPalette")
    budget_allocation: List[BudgetAllocationItem] = Field(..., alias="budgetAllocation")
    preparation_timeline: List[TimelinePhase] = Field(..., alias="preparationTimeline")
    checklist: List[ChecklistItem]
    menu_ideas: List[str] = Field(..., alias="menuIdeas")
    vendor_categories: List[str] = Field(..., alias="vendorCategories")
    cost_saving_suggestions: List[str] = Field(..., alias="costSavingSuggestions")
    is_demo: bool = Field(..., alias="isDemo")
    source: str = Field(..., description="'gemini', 'curated_demo', or 'fallback'")
    error_message: Optional[str] = Field(default=None, alias="errorMessage", description="Error explanation if falling back to demo mode")


class ChatRequest(BaseModel):
    """Request payload for event assistant chat."""
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(..., min_length=1, max_length=2000, description="User question or request")
    event_id: Optional[int] = Field(default=None, alias="eventId", description="Associated event ID")
    event_context: Optional[Dict[str, Any]] = Field(default=None, alias="eventContext", description="Context about the event")


class ChatResponse(BaseModel):
    """Response payload for event assistant chat."""
    model_config = ConfigDict(populate_by_name=True)

    response: str
    suggestions: List[str] = Field(default_factory=list)
    is_demo: bool = Field(..., alias="isDemo")
    source: str = Field(..., description="'gemini' or 'curated_demo'")
    error_message: Optional[str] = Field(default=None, alias="errorMessage", description="Error details if fallback occurred")


class HealthResponse(BaseModel):
    """Health check endpoint response."""
    status: str
    app: str
    tagline: str
    version: str
    gemini_configured: bool
    model: str
