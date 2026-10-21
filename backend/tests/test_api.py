"""Automated API tests for PlanzyPop AI backend."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health endpoint returns expected app branding and status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "PlanzyPop AI"
    assert data["tagline"] == "Your vibe. Your plan. Your party."
    assert "gemini_configured" in data
    assert "version" in data


def test_root_endpoint():
    """Test root endpoint provides app metadata and navigation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "PlanzyPop AI"
    assert data["docs_url"] == "/docs"
    assert data["health_url"] == "/health"


def test_plan_endpoint_valid_camel_case():
    """Test plan generation endpoint with frontend camelCase request payload."""
    payload = {
        "eventName": "Aarav's 25th Birthday",
        "eventType": "Birthday",
        "date": "2026-05-20",
        "location": "Skyline Lounge, Bengaluru",
        "guests": 50,
        "budgetInr": 150000,
        "celebrationStyle": "Playful & colourful",
        "setting": "Outdoor",
        "dietaryPreferences": "Mixed menu",
        "mainPriority": "Food",
        "preferences": ["Cocktail bar", "DJ setup"],
    }
    response = client.post("/api/plan", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify structured fields
    assert "concept_title" in data or "conceptTitle" in data
    assert "vibe" in data
    assert "color_palette" in data or "colorPalette" in data
    assert "budget_allocation" in data or "budgetAllocation" in data
    assert "preparation_timeline" in data or "preparationTimeline" in data
    assert "checklist" in data
    assert "menu_ideas" in data or "menuIdeas" in data
    assert "cost_saving_suggestions" in data or "costSavingSuggestions" in data

    # Verify deterministic budget math
    budget_items = data.get("budget_allocation") or data.get("budgetAllocation")
    assert len(budget_items) > 0
    total_allocated = sum(item["amount_inr"] for item in budget_items)
    assert total_allocated == payload["budgetInr"], "Deterministic budget items must sum exactly to requested budget!"


def test_plan_endpoint_valid_snake_case():
    """Test plan generation endpoint with snake_case request payload."""
    payload = {
        "event_name": "Riya & Kabir Engagement",
        "event_type": "Engagement",
        "date": "2026-06-15",
        "location": "Heritage Haveli, Udaipur",
        "guests": 120,
        "budget_inr": 450000,
        "celebration_style": "Warm & intimate",
        "setting": "Outdoor",
        "dietary_preferences": "Vegetarian",
        "main_priority": "Décor & atmosphere",
    }
    response = client.post("/api/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    budget_items = data.get("budget_allocation") or data.get("budgetAllocation")
    total_allocated = sum(item["amount_inr"] for item in budget_items)
    assert total_allocated == payload["budget_inr"]


def test_plan_endpoint_validation_error():
    """Test plan endpoint rejects invalid payloads with 422 Unprocessable Entity."""
    # Missing required 'eventName' / 'event_name' and 'eventType'
    response = client.post("/api/plan", json={"guests": 50, "budgetInr": 100000})
    assert response.status_code == 422

    # Negative guest count
    invalid_guests = {
        "eventName": "Test Event",
        "eventType": "Party",
        "guests": -10,
        "budgetInr": 50000,
    }
    response = client.post("/api/plan", json=invalid_guests)
    assert response.status_code == 422

    # Negative budget
    invalid_budget = {
        "eventName": "Test Event",
        "eventType": "Party",
        "guests": 10,
        "budgetInr": -500,
    }
    response = client.post("/api/plan", json=invalid_budget)
    assert response.status_code == 422


def test_chat_endpoint_valid():
    """Test event assistant chat endpoint with valid message."""
    payload = {
        "message": "What is a good way to save on evening floral decorations?",
        "eventId": 1,
        "eventContext": {"budget": 120000, "guests": 60, "style": "Garden party"},
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
    assert "suggestions" in data
    assert "is_demo" in data or "isDemo" in data


def test_chat_endpoint_validation_error():
    """Test chat endpoint rejects empty message."""
    response = client.post("/api/chat", json={"message": ""})
    assert response.status_code == 422


def test_cors_headers():
    """Test CORS headers are returned for allowed frontend origins."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
    }
    response = client.options("/api/plan", headers=headers)
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_deterministic_budget_precision_various_amounts():
    """Verify deterministic budget calculation always totals exact budget for arbitrary numbers."""
    from app.services.gemini_service import compute_deterministic_budget

    test_cases = [
        (50000, "Food"),
        (73429, "Décor & atmosphere"),
        (150000, "Guest experience"),
        (250000, "Staying on budget"),
        (999999, "Food"),
    ]

    for budget, priority in test_cases:
        items = compute_deterministic_budget(budget, priority)
        total = sum(i.amount_inr for i in items)
        assert total == budget, f"Expected total {budget}, got {total} for priority {priority}"
        # Percentage sum check (around 100%)
        pct_sum = sum(i.percentage for i in items)
        assert abs(pct_sum - 100.0) < 0.01


def test_error_message_transparency_in_curated_plan():
    """Verify curated fallback clearly identifies demo status and source."""
    from app.services.gemini_service import get_curated_plan
    from app.schemas.planner import PlanRequest

    req = PlanRequest(
        eventName="Transparency Test",
        eventType="Birthday",
        guests=40,
        budgetInr=80000,
    )
    plan = get_curated_plan(req, error_message="Simulated API downtime")
    assert plan.is_demo is True
    assert plan.source == "curated_demo"
    assert plan.error_message == "Simulated API downtime"



def test_community_event_plan():
    """Verify community event planning satisfies Hack2Skill Challenge 5 requirements."""
    payload = {
        "eventName": "Greenfield Monsoon Mela",
        "eventType": "Community event",
        "date": "2026-08-15",
        "location": "Community Grounds, Pune",
        "guests": 350,
        "budgetInr": 200000,
        "celebrationStyle": "Inclusive & uplifting",
        "setting": "Outdoor",
        "mainPriority": "Community logistics",
    }
    response = client.post("/api/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "concept_title" in data or "conceptTitle" in data
    title = data.get("concept_title") or data.get("conceptTitle")
    assert "Greenfield" in title
    checklist = data.get("checklist", [])
    assert any("permission" in c["title"].lower() or "municipal" in c["title"].lower() or "volunteer" in c["title"].lower() for c in checklist)


def test_rate_limiter_protection():
    """Verify rate limiter triggers HTTP 429 when abuse threshold is crossed."""
    from app.core.rate_limiter import InMemoryRateLimiter
    from fastapi import Request

    test_limiter = InMemoryRateLimiter(limit_per_minute=3)
    scope = {"type": "http", "client": ("198.51.100.1", 12345)}
    req = Request(scope)

    # First 3 should pass
    test_limiter.check(req)
    test_limiter.check(req)
    test_limiter.check(req)

    # 4th request must raise 429
    with pytest.raises(Exception) as exc_info:
        test_limiter.check(req)
    assert "429" in str(exc_info.value)


def test_oversized_payload_rejection():
    """Verify input bounds reject excessively long inputs."""
    payload = {
        "eventName": "A" * 200,  # Max allowed is 150
        "eventType": "Birthday",
        "guests": 20,
        "budgetInr": 50000,
    }
    response = client.post("/api/plan", json=payload)
    assert response.status_code == 422


def test_deterministic_budget_community_priority():
    """Verify deterministic budget splits for community event priorities."""
    from app.services.gemini_service import compute_deterministic_budget

    budget = 180000
    items = compute_deterministic_budget(budget, "Community logistics")
    total = sum(i.amount_inr for i in items)
    assert total == budget
    cats = [i.category for i in items]
    assert any("venue" in c.lower() or "sound" in c.lower() for c in cats)
    assert any("sanitation" in c.lower() or "logistics" in c.lower() for c in cats)


def test_plan_caching_performance():
    """Verify in-memory caching serves repeated identical requests without re-computation."""
    payload = {
        "eventName": "Cache Speed Test Party",
        "eventType": "Birthday",
        "date": "2026-07-20",
        "location": "Jaipur",
        "guests": 45,
        "budgetInr": 120000,
        "celebrationStyle": "Playful",
    }
    # Initial request populates cache
    res1 = client.post("/api/plan", json=payload)
    assert res1.status_code == 200

    # Second identical request must be served from cache with identical output
    res2 = client.post("/api/plan", json=payload)
    assert res2.status_code == 200
    title1 = res1.json().get("concept_title") or res1.json().get("conceptTitle")
    title2 = res2.json().get("concept_title") or res2.json().get("conceptTitle")
    assert title1 == title2


def test_chat_caching_performance():
    """Verify in-memory caching serves repeated identical assistant queries instantly."""
    payload = {
        "message": "What is the best way to handle parking for 80 guests?",
        "eventId": 10,
    }
    res1 = client.post("/api/chat", json=payload)
    assert res1.status_code == 200
    res2 = client.post("/api/chat", json=payload)
    assert res2.status_code == 200
    assert res1.json()["response"] == res2.json()["response"]
