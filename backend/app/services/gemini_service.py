"""Gemini AI Service integrating Google's official GenAI Python SDK with async execution and caching."""

import asyncio
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.schemas.planner import (
    BudgetAllocationItem,
    ChecklistItem,
    ChatRequest,
    ChatResponse,
    PlanRequest,
    PlanResponse,
    TimelinePhase,
)

logger = logging.getLogger(__name__)

# In-memory response cache for sub-millisecond repeated lookups and efficiency
_PLAN_CACHE: Dict[str, PlanResponse] = {}
_CHAT_CACHE: Dict[str, ChatResponse] = {}
_MAX_CACHE_ENTRIES = 128


def _get_plan_cache_key(req: PlanRequest) -> str:
    key_src = (
        f"{req.event_name.strip().lower()}|{req.event_type.strip().lower()}|"
        f"{req.guests}|{req.budget_inr}|{req.celebration_style}|{req.setting}|"
        f"{req.main_priority}|{req.location.strip().lower()}"
    )
    return hashlib.sha256(key_src.encode("utf-8")).hexdigest()


def _get_chat_cache_key(req: ChatRequest) -> str:
    ctx_str = json.dumps(req.event_context or {}, sort_keys=True)
    key_src = f"{req.message.strip().lower()}|{req.event_id}|{ctx_str}"
    return hashlib.sha256(key_src.encode("utf-8")).hexdigest()


def compute_deterministic_budget(total_budget: int, priority: Optional[str] = None) -> List[BudgetAllocationItem]:
    """Deterministically compute budget allocation percentages and exact INR amounts.

    Budget arithmetic is strictly deterministic and never delegated to AI hallucination.
    """
    p_lower = (priority or "").lower()

    if "food" in p_lower:
        splits = [
            ("Food & drinks", 42.0, "Catering, bar service, live counters"),
            ("Venue", 22.0, "Rental, power backup, basic setup"),
            ("Décor & atmosphere", 16.0, "Lighting, florals, focal backdrops"),
            ("Photography & media", 12.0, "Photo + film coverage"),
            ("Buffer & contingencies", 8.0, "Emergency buffer and miscellaneous"),
        ]
    elif "décor" in p_lower or "atmosphere" in p_lower:
        splits = [
            ("Décor & atmosphere", 28.0, "Thematic styling, ambient lighting, statement florals"),
            ("Venue", 26.0, "Atmospheric setting matching the aesthetic"),
            ("Food & drinks", 28.0, "Curated cocktail/mocktail bites & dinner"),
            ("Photography & media", 11.0, "Aesthetic visual documentation"),
            ("Buffer & contingencies", 7.0, "Emergency buffer"),
        ]
    elif "community" in p_lower or "logistics" in p_lower:
        splits = [
            ("Venue, staging & sound", 30.0, "Park/ground setup, stage, audio & power"),
            ("Food & community refreshments", 30.0, "Snack counters, hydration stations, potluck supplies"),
            ("Activities & cultural games", 20.0, "Interactive games, sports, prizes, cultural performers"),
            ("Logistics, sanitation & first aid", 12.0, "Waste management, permits, signage, safety"),
            ("Buffer & contingencies", 8.0, "Unplanned logistics and reserve fund"),
        ]
    else:
        # Balanced default celebration allocation
        splits = [
            ("Food & drinks", 38.0, "Family-style courses, mocktail bar, desserts"),
            ("Venue", 24.0, "Venue fee, cleaning, setup duration"),
            ("Décor & atmosphere", 18.0, "Florals, lighting accents, table pieces"),
            ("Photography & media", 12.0, "Photo & video moments"),
            ("Buffer & contingencies", 8.0, "Unplanned expenses and tips"),
        ]

    items: List[BudgetAllocationItem] = []
    accumulated_amount = 0

    for idx, (cat, pct, note) in enumerate(splits):
        if idx == len(splits) - 1:
            # Last item absorbs any rounding difference to ensure exact total match
            amount = total_budget - accumulated_amount
        else:
            amount = int(round(total_budget * (pct / 100.0)))
            accumulated_amount += amount

        items.append(
            BudgetAllocationItem(
                category=cat,
                percentage=pct,
                amount_inr=amount,
                notes=note,
            )
        )

    return items


def get_curated_plan(request: PlanRequest, error_message: Optional[str] = None) -> PlanResponse:
    """Generate a high-quality curated demo plan tailored to the user's input.

    Used when Gemini API key is not configured, or when upstream API calls fail/timeout.
    Supports weddings, birthdays, college fests, and community celebrations (Challenge 5).
    """
    event_type = request.event_type.lower()
    style = request.celebration_style or "Warm & intimate"
    setting = request.setting or "Outdoor"
    budget = request.budget_inr

    # Select thematic styling and concept based on event type
    if "community" in event_type or "society" in event_type or "mela" in event_type or "fair" in event_type:
        concept_title = f"{request.event_name} — Green Canopy & Community Mela"
        concept_description = (
            f"An uplifting, inclusive community celebration for {request.guests} neighbors and guests at {request.location}. "
            f"Featuring local artisan stalls, family game zones, acoustic performances, and eco-friendly hospitality."
        )
        vibe = f"{style} · Inclusive & Uplifting · Vibrant Community Spirit"
        palette = ["#2A9D8F", "#E9C46A", "#F4A261", "#264653"]
        menu = [
            "Local street food bites & live chaat counters",
            "Community masala chai, spiced buttermilk & fruit coolers",
            "Wholesome festival meal boxes / buffet favorites",
            "Artisanal local sweets & celebration dessert treats",
        ]
        savings = [
            "Partner with local neighborhood associations to share municipal staging and tent infrastructure.",
            "Form community volunteer committees for reception, game coordination, and hospitality.",
            "Replace single-use plastics with reusable water stations and compostable serveware.",
        ]
        timeline = [
            TimelinePhase(timeframe="6 weeks before", action="Permits & venue clearance", details=f"Confirm ground booking at {request.location}"),
            TimelinePhase(timeframe="4 weeks before", action="Community stalls & performers", details="Invite local artisans, acoustic music, and game hosts"),
            TimelinePhase(timeframe="2 weeks before", action="Volunteer briefing & logistics", details=f"Organize committees for {request.guests} attendees"),
            TimelinePhase(timeframe="1 week before", action="Sound, safety & sanitation", details="Verify sound equipment, waste bins, and first aid"),
            TimelinePhase(timeframe="Event day", action="Community setup & celebration", details="Morning volunteer assembly, gates open for celebration"),
        ]
        checklist = [
            ChecklistItem(title="Secure municipal approvals & venue reservation", category="Logistics", priority="High"),
            ChecklistItem(title="Arrange hydration stations & waste segregation bins", category="Sanitation", priority="High"),
            ChecklistItem(title="Finalize volunteer task roster and security lead", category="Community", priority="High"),
            ChecklistItem(title="Coordinate sound production & acoustic microphone check", category="Entertainment", priority="Medium"),
            ChecklistItem(title="Publish digital schedule & community map", category="Communication", priority="Medium"),
        ]
        vendors = [
            "Tent, staging & sound production",
            "Local catering & refreshment partners",
            "Eco-sanitation & waste management crew",
            "Community photographer & drone videographer",
            "Family games & interactive host",
        ]
    elif "wedding" in event_type or "engagement" in event_type:
        concept_title = f"{request.event_name} — Marigold Twilight"
        concept_description = (
            f"An enchanting celebration at {request.location} for {request.guests} guests. "
            f"Layered fabrics, glowing fairy lights, and fragrant local florals bring a {style.lower()} "
            f"feeling to life under the open sky."
        )
        vibe = f"{style} · Regal & Joyful · Indian Heritage Charm"
        palette = ["#ED8B75", "#F4CD68", "#61744B", "#F2B5C9"]
        menu = [
            "Regional welcome coolers (Khas & Kokum spritzers)",
            "Live artisan chaat & grilled kebab counters",
            "Royal family-style banquet mains with fresh breads",
            "Artisanal mini mithai platter and bespoke celebration cake",
        ]
        savings = [
            "Reuse ceremonial floral arches at the dinner stage backdrop to save up to ₹15,000.",
            "Choose seasonal local marigolds and mogra rather than imported blooms for 30% savings.",
            "Opt for signature mocktails instead of an extensive open bar menu.",
        ]
        timeline = [
            TimelinePhase(timeframe="8 weeks before", action="Lock venue and date", details=f"Confirm reservation at {request.location}"),
            TimelinePhase(timeframe="4 weeks before", action="Confirm creative vendors", details="Finalize catering tasting and décor palette"),
            TimelinePhase(timeframe="2 weeks before", action="Guest RSVPs & headcount", details=f"Confirm attendance close to {request.guests} guests"),
            TimelinePhase(timeframe="1 week before", action="Vendor walk-through", details="Run final equipment check and run of show"),
            TimelinePhase(timeframe="Event day", action="Setup, verify & celebrate", details="Arrive 3 hours early for checklist verification"),
        ]
        checklist = [
            ChecklistItem(title="Send save-the-dates / invitations", category="Communication", priority="High"),
            ChecklistItem(title="Confirm catering advance and dietary counts", category="Food", priority="High"),
            ChecklistItem(title="Finalize musical playlist and audio setup", category="Entertainment", priority="Medium"),
            ChecklistItem(title="Schedule photographer arrival & key shot list", category="Photography", priority="Medium"),
            ChecklistItem(title="Prepare emergency celebration kit", category="General", priority="Low"),
        ]
        vendors = [
            "Catering & beverage service",
            "Venue & setup crew",
            "Décor, flowers & ambient lighting",
            "Photography & candid film",
            "DJ / Acoustic sound system",
        ]
    elif "college" in event_type or "fest" in event_type:
        concept_title = f"{request.event_name} — Neon Pulse"
        concept_description = (
            f"An electric, high-energy {setting.lower()} gathering for {request.guests} students at {request.location}. "
            "Pulsing neon wayfinding, dynamic lighting, interactive photo pods, and upbeat live performances."
        )
        vibe = "Bold & Energetic · Modern Vibe · High Impact"
        palette = ["#252340", "#7A88CC", "#EC8E82", "#F4CD68"]
        menu = [
            "Loaded street-food sliders & gourmet fries bar",
            "Pop mocktail bar with boba teas & fizzy lemonades",
            "Churros & soft-serve dessert truck station",
        ]
        savings = [
            "Use projection mapping and atmospheric haze instead of physical scenic backdrops.",
            "Leverage student volunteer squads for stage and hospitality management.",
            "Bundle sound and stage lighting from a single unified production vendor.",
        ]
        timeline = [
            TimelinePhase(timeframe="8 weeks before", action="Auditorium / Campus booking", details=f"Confirm reservation at {request.location}"),
            TimelinePhase(timeframe="4 weeks before", action="Artist line-up & technical rider", details="Finalize performance schedule and AV kit"),
            TimelinePhase(timeframe="2 weeks before", action="Student ticketing & registration", details=f"Monitor registrations towards {request.guests}"),
            TimelinePhase(timeframe="1 week before", action="Stage production & security test", details="Conduct sound check and gate security walkthrough"),
            TimelinePhase(timeframe="Event day", action="Doors open & live performances", details="Volunteer deployment and sound console active"),
        ]
        checklist = [
            ChecklistItem(title="Finalize campus authority permission letters", category="Administration", priority="High"),
            ChecklistItem(title="Confirm main stage audio-visual and generator rental", category="Production", priority="High"),
            ChecklistItem(title="Deploy volunteer squads for accreditation & entry", category="Logistics", priority="High"),
            ChecklistItem(title="Set up first-aid station and emergency exits", category="Safety", priority="Medium"),
        ]
        vendors = [
            "Stage, trussing & concert lighting",
            "Concert audio production & sound engineers",
            "Food trucks & quick snack concessions",
            "Event coverage & live streaming",
        ]
    else:
        # Birthday / Private party / General celebration
        concept_title = f"{request.event_name} — Sunset in Bloom"
        concept_description = (
            f"A relaxed {setting.lower()} party for {request.guests} guests at {request.location}. "
            f"Soft peach florals meet warm candlelight and joyful color accents for a memorable {style.lower()} evening."
        )
        vibe = f"{style} · Carefree & Vibrant · Warm Gathering"
        palette = ["#F4A261", "#E76F51", "#2A9D8F", "#E9C46A"]
        menu = [
            "Sunset signature mocktails with citrus and mint",
            "Tapas-style passed starters & mezze boards",
            "Comfort-food main course buffet featuring local favorites",
            "Custom statement birthday cake & dessert shooter cups",
        ]
        savings = [
            "Repurpose garden lighting and welcome signage florals to the cake cutting area.",
            "Select in-season local fruits and treats for the dessert table.",
            "Consolidate audio/visual gear rental into an all-in-one package.",
        ]
        timeline = [
            TimelinePhase(timeframe="4 weeks before", action="Confirm date, venue and invitations", details=f"Send invitations for {request.location}"),
            TimelinePhase(timeframe="2 weeks before", action="Finalize cake, menu and playlist", details="Order custom cake and tasting notes"),
            TimelinePhase(timeframe="1 week before", action="RSVP headcount & vendor check-in", details=f"Target {request.guests} attendees confirmed"),
            TimelinePhase(timeframe="Event day", action="Decor placement & cake cutting", details="Welcome guests and enjoy the celebration"),
        ]
        checklist = [
            ChecklistItem(title="Send save-the-dates / invitations", category="Communication", priority="High"),
            ChecklistItem(title="Order bespoke celebration cake", category="Food", priority="High"),
            ChecklistItem(title="Select party playlist & ambient lighting", category="Décor", priority="Medium"),
            ChecklistItem(title="Confirm photographer arrival window", category="Photography", priority="Medium"),
        ]
        vendors = [
            "Catering & signature desserts",
            "Bespoke floral styling & lighting",
            "Party photography",
            "Acoustic music or DJ rental",
        ]

    # Deterministic budget calculation
    budget_items = compute_deterministic_budget(budget, request.main_priority)

    return PlanResponse(
        concept_title=concept_title,
        concept_description=concept_description,
        vibe=vibe,
        color_palette=palette,
        budget_allocation=budget_items,
        preparation_timeline=timeline,
        checklist=checklist,
        menu_ideas=menu,
        vendor_categories=vendors,
        cost_saving_suggestions=savings,
        is_demo=True,
        source="curated_demo",
        error_message=error_message,
    )


def categorize_gemini_error(e: Exception) -> str:
    """Convert low-level exceptions into safe, informative diagnostic explanations without leaking secrets."""
    err_str = str(e)
    err_type = type(e).__name__

    if "401" in err_str or "403" in err_str or "API_KEY_INVALID" in err_str or "PERMISSION_DENIED" in err_str:
        return "Gemini API key is invalid or unauthorized. Serving curated demo plan."
    elif "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
        return "Gemini API rate limit or quota exceeded. Serving curated demo plan."
    elif "503" in err_str or "UNAVAILABLE" in err_str:
        return "Gemini AI service temporarily experiencing high demand. Serving curated demo plan."
    elif "404" in err_str or "NOT_FOUND" in err_str:
        return "Requested Gemini model is not accessible. Serving curated demo plan."
    elif "timeout" in err_str.lower() or "connection" in err_str.lower():
        return "Network connection to Gemini AI timed out. Serving curated demo plan."
    return f"Gemini API request failed ({err_type}). Serving curated demo plan."


class GeminiService:
    """Service encapsulating Gemini API calls with non-blocking async execution, caching, and fallbacks."""

    def __init__(self) -> None:
        self._client: Optional[Any] = None

    def _get_client(self) -> Optional[Any]:
        """Lazy-initialize Google GenAI client."""
        if not settings.is_gemini_configured:
            return None

        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning("Could not initialize Google GenAI client: %s", str(e))
                self._client = None
        return self._client

    def _get_candidate_models(self) -> List[str]:
        """Return candidate models list, prioritizing configured model followed by verified fallbacks."""
        primary = settings.GEMINI_MODEL.strip()
        fallbacks = ["gemini-3-flash-preview", "gemini-3.8-flash", "gemini-flash-latest"]
        models = [primary]
        for m in fallbacks:
            if m not in models:
                models.append(m)
        return models

    async def generate_plan(self, request: PlanRequest) -> PlanResponse:
        """Generate a complete event plan via Gemini, or fall back to curated demo plan with caching."""
        cache_key = _get_plan_cache_key(request)
        if cache_key in _PLAN_CACHE:
            logger.info("Serving event plan from cache (key=%s)", cache_key[:8])
            return _PLAN_CACHE[cache_key]

        client = self._get_client()

        if client is None:
            msg = "Gemini API key is not configured in backend/.env. Using curated demo celebration plan."
            logger.info("%s", msg)
            plan = get_curated_plan(request, error_message=msg)
            if len(_PLAN_CACHE) < _MAX_CACHE_ENTRIES:
                _PLAN_CACHE[cache_key] = plan
            return plan

        prompt = (
            f"You are PlanzyPop AI, an expert celebration and event planning architect.\n"
            f"Tagline: 'Your vibe. Your plan. Your party.'\n\n"
            f"Generate a creative, detailed celebration plan for the following details:\n"
            f"- Event: {request.event_name} ({request.event_type})\n"
            f"- Date: {request.date}\n"
            f"- Location: {request.location}\n"
            f"- Expected Guests: {request.guests}\n"
            f"- Total Budget: INR {request.budget_inr:,}\n"
            f"- Celebration Style: {request.celebration_style}\n"
            f"- Setting: {request.setting}\n"
            f"- Dietary Preferences: {request.dietary_preferences}\n"
            f"- Priority: {request.main_priority}\n\n"
            f"Respond ONLY with a valid JSON object matching this schema:\n"
            f"{{\n"
            f'  "concept_title": "Short creative title",\n'
            f'  "concept_description": "2-3 sentence concept overview",\n'
            f'  "vibe": "Short vibe descriptor",\n'
            f'  "color_palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],\n'
            f'  "menu_ideas": ["Dish 1", "Dish 2", "Dish 3", "Dish 4"],\n'
            f'  "vendor_categories": ["Category 1", "Category 2", "Category 3", "Category 4"],\n'
            f'  "cost_saving_suggestions": ["Idea 1", "Idea 2", "Idea 3"],\n'
            f'  "timeline": [\n'
            f'    {{"timeframe": "8 weeks before", "action": "Task name", "details": "Details"}},\n'
            f'    {{"timeframe": "4 weeks before", "action": "Task name", "details": "Details"}},\n'
            f'    {{"timeframe": "1 week before", "action": "Task name", "details": "Details"}},\n'
            f'    {{"timeframe": "Event day", "action": "Task name", "details": "Details"}}\n'
            f'  ],\n'
            f'  "checklist": [\n'
            f'    {{"title": "Task 1", "category": "Food", "priority": "High"}},\n'
            f'    {{"title": "Task 2", "category": "Venue", "priority": "Medium"}},\n'
            f'    {{"title": "Task 3", "category": "Décor", "priority": "Medium"}}\n'
            f'  ]\n'
            f"}}\n"
            f"Do not include markdown code fence formatting, output pure JSON only."
        )

        models_to_try = self._get_candidate_models()
        last_error: Optional[Exception] = None

        for model_name in models_to_try:
            try:
                # Offload to worker thread with strict timeout to keep asyncio loop 100% non-blocking
                response = await asyncio.wait_for(
                    asyncio.to_thread(client.models.generate_content, model=model_name, contents=prompt),
                    timeout=settings.AI_TIMEOUT_SECONDS,
                )

                raw_text = response.text or ""
                # Strip potential ```json fences
                cleaned = raw_text.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[-1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("```", 1)[0]
                data = json.loads(cleaned.strip())

                # Deterministic budget calculation based on request budget
                budget_items = compute_deterministic_budget(request.budget_inr, request.main_priority)

                timeline_items = [
                    TimelinePhase(
                        timeframe=item.get("timeframe", "Milestone"),
                        action=item.get("action", "Milestone action"),
                        details=item.get("details", ""),
                    )
                    for item in data.get("timeline", [])
                ] or [
                    TimelinePhase(timeframe="Preparation", action="Review event roadmap", details="Coordinate vendors")
                ]

                checklist_items = [
                    ChecklistItem(
                        title=item.get("title", "Checklist item"),
                        category=item.get("category", "General"),
                        priority=item.get("priority", "Medium"),
                    )
                    for item in data.get("checklist", [])
                ] or [
                    ChecklistItem(title="Finalize guest confirmations", category="General", priority="High")
                ]

                plan = PlanResponse(
                    concept_title=data.get("concept_title", f"{request.event_name} Celebration"),
                    concept_description=data.get("concept_description", "A beautifully tailored celebration plan."),
                    vibe=data.get("vibe", request.celebration_style or "Tailored Celebration"),
                    color_palette=data.get("color_palette", ["#ED8B75", "#F4CD68", "#61744B", "#F2B5C9"]),
                    budget_allocation=budget_items,
                    preparation_timeline=timeline_items,
                    checklist=checklist_items,
                    menu_ideas=data.get("menu_ideas", ["Curated celebration menu"]),
                    vendor_categories=data.get("vendor_categories", ["Venue", "Catering", "Décor", "Photo"]),
                    cost_saving_suggestions=data.get("cost_saving_suggestions", ["Reuse floral elements across spaces"]),
                    is_demo=False,
                    source="gemini",
                )

                if len(_PLAN_CACHE) < _MAX_CACHE_ENTRIES:
                    _PLAN_CACHE[cache_key] = plan
                return plan
            except Exception as e:
                last_error = e
                logger.warning("Gemini generation attempt with model '%s' failed: %s (%s)", model_name, type(e).__name__, str(e))
                if "401" in str(e) or "403" in str(e) or "API_KEY_INVALID" in str(e) or "PERMISSION_DENIED" in str(e):
                    break
                continue

        error_desc = categorize_gemini_error(last_error) if last_error else "Gemini API request failed. Serving curated demo plan."
        logger.warning("All Gemini generation attempts failed. %s", error_desc)
        fallback_plan = get_curated_plan(request, error_message=error_desc)
        if len(_PLAN_CACHE) < _MAX_CACHE_ENTRIES:
            _PLAN_CACHE[cache_key] = fallback_plan
        return fallback_plan

    async def generate_chat_reply(self, request: ChatRequest) -> ChatResponse:
        """Generate conversational event advice via Gemini, or provide curated response with caching."""
        cache_key = _get_chat_cache_key(request)
        if cache_key in _CHAT_CACHE:
            logger.info("Serving chat response from cache")
            return _CHAT_CACHE[cache_key]

        client = self._get_client()

        if client is None:
            # Curated helpful demo assistant reply
            resp = ChatResponse(
                response=(
                    f"Hi! As your PlanzyPop AI assistant, I can help you tailor your celebration. "
                    f"Regarding '{request.message}': Focus on prioritizing guest comfort and cohesive lighting first. "
                    f"Would you like recommendations on vendor budgets, music selection, or timeline pacing?"
                ),
                suggestions=[
                    "How do I allocate budget for music?",
                    "What are cost-saving ideas for flowers?",
                    "Check timeline for event week",
                ],
                is_demo=True,
                source="curated_demo",
                error_message="Gemini API key is not configured in backend/.env. Using demo assistant response.",
            )
            if len(_CHAT_CACHE) < _MAX_CACHE_ENTRIES:
                _CHAT_CACHE[cache_key] = resp
            return resp

        prompt = (
            f"You are the PlanzyPop AI Celebration Assistant. Tagline: 'Your vibe. Your plan. Your party.'\n"
            f"Help the user with their event planning inquiry concisely (under 120 words).\n"
            f"User message: {request.message}\n"
        )
        if request.event_context:
            prompt += f"Event context: {json.dumps(request.event_context)}\n"

        prompt += "\nProvide a practical, warm response with 2-3 quick follow-up suggestions."

        models_to_try = self._get_candidate_models()
        last_error: Optional[Exception] = None

        for model_name in models_to_try:
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(client.models.generate_content, model=model_name, contents=prompt),
                    timeout=settings.AI_TIMEOUT_SECONDS,
                )

                text = (response.text or "").strip()
                if text:
                    resp = ChatResponse(
                        response=text,
                        suggestions=[
                            "Review budget breakdown",
                            "Adjust vendor allocations",
                            "Check celebration timeline",
                        ],
                        is_demo=False,
                        source="gemini",
                    )
                    if len(_CHAT_CACHE) < _MAX_CACHE_ENTRIES:
                        _CHAT_CACHE[cache_key] = resp
                    return resp
            except Exception as e:
                last_error = e
                logger.warning("Gemini chat attempt with model '%s' failed: %s", model_name, str(e))
                if "401" in str(e) or "403" in str(e) or "API_KEY_INVALID" in str(e) or "PERMISSION_DENIED" in str(e):
                    break
                continue

        error_desc = categorize_gemini_error(last_error) if last_error else "Gemini chat request failed. Serving demo response."
        logger.warning("All Gemini chat attempts failed. %s", error_desc)
        fallback_resp = ChatResponse(
            response=(
                f"Thanks for asking! For '{request.message}', keeping your key vendor quotes aligned "
                f"with your total budget is crucial. Consider booking catering early to lock in seasonal rates."
            ),
            suggestions=[
                "How to negotiate with caterers?",
                "What questions should I ask photographers?",
                "Best lighting options for evening events",
            ],
            is_demo=True,
            source="curated_demo",
            error_message=error_desc,
        )
        if len(_CHAT_CACHE) < _MAX_CACHE_ENTRIES:
            _CHAT_CACHE[cache_key] = fallback_resp
        return fallback_resp


gemini_service = GeminiService()
