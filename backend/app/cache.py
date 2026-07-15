"""
cache.py

Thin wrapper around Redis for caching container stats. Dashboard polling
(every few seconds, once the frontend exists) would otherwise hit the
Docker API directly on every request - this caches results for a short
TTL so repeated polls within that window are served from Redis instead.
"""

import os
import json
from dotenv import load_dotenv
import redis

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
STATS_CACHE_TTL_SECONDS = 5  # short TTL: stats should still feel "live"

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


def get_cached_stats(container_id: str) -> dict | None:
    """Returns cached stats for a container, or None if not cached/expired."""
    try:
        cached = redis_client.get(f"stats:{container_id}")
        if cached:
            return json.loads(cached)
        return None
    except redis.RedisError:
        # If Redis is down for any reason, fail open - caller falls back
        # to hitting Docker directly rather than the whole app breaking.
        return None


def set_cached_stats(container_id: str, stats: dict) -> None:
    """Caches stats for a container with a short TTL."""
    try:
        redis_client.setex(
            f"stats:{container_id}",
            STATS_CACHE_TTL_SECONDS,
            json.dumps(stats),
        )
    except redis.RedisError:
        pass  # caching is a nice-to-have, never let it break the request