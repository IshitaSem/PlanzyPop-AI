"""In-memory sliding-window rate limiter for expensive AI endpoints."""

import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List
from fastapi import HTTPException, Request, status
from app.core.config import settings


class InMemoryRateLimiter:
    """Sliding-window rate limiter tracking requests per client IP."""

    def __init__(self, limit_per_minute: int = 60) -> None:
        self.limit = limit_per_minute
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.lock = Lock()

    def check(self, request: Request) -> None:
        """Verify the client has not exceeded their allowed request quota with proxy awareness."""
        # Inspect X-Forwarded-For only when trusted proxy configuration is enabled
        client_ip = "unknown"
        if getattr(settings, "TRUST_PROXY_HEADERS", True):
            try:
                forwarded_for = request.headers.get("x-forwarded-for", "")
                if forwarded_for:
                    client_ip = forwarded_for.split(",")[0].strip()
            except (KeyError, AttributeError):
                # Handle minimal mock scopes in test environments lacking headers
                pass

        if client_ip == "unknown" and request.client and request.client.host:
            client_ip = request.client.host

        now = time.time()
        window_start = now - 60.0

        with self.lock:
            # Periodic cleanup if tracking table grows large (prevents unbounded memory growth)
            if len(self.requests) > 1000:
                stale_ips = [ip for ip, times in self.requests.items() if not times or times[-1] <= window_start]
                for ip in stale_ips:
                    del self.requests[ip]

            # Purge records older than 1 minute for this client
            timestamps = [t for t in self.requests[client_ip] if t > window_start]
            if len(timestamps) >= self.limit:
                retry_after = int(60.0 - (now - timestamps[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded ({self.limit} req/min). Please try again in {retry_after}s.",
                    headers={"Retry-After": str(retry_after)},
                )
            timestamps.append(now)
            self.requests[client_ip] = timestamps


rate_limiter = InMemoryRateLimiter(limit_per_minute=settings.RATE_LIMIT_PER_MINUTE)
