from __future__ import annotations

from datetime import datetime
import json
import logging
from pathlib import Path
import re
from typing import Any

from hindsight_client import Hindsight

from app.core.config import settings
from app.services.ollama_service import ollama_service


logger = logging.getLogger(__name__)

DEMO_MEMORY_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "seed"
    / "demo_historical_memory.json"
)

SERVICE_MAP = {
    "ff6b2fa0-7c88-4679-ba6b-bfabb5e7f68a": "payments",
    "0071b1a4-cbda-4a5e-bc38-59f6d0b36de7": "checkout",
}

STOP_WORDS = {
    "the", "a", "an", "is", "in", "for", "to", "of", "and", "on", "with",
    "this", "that", "it", "as", "at", "by", "from", "or", "are", "be",
    "was", "were", "what", "how", "why", "when", "where", "can", "could",
    "should", "would", "do", "does", "did", "have", "has", "had", "using",
    "use", "used", "incident", "incidents", "engineering", "experience",
    "historical", "prior", "previous", "please", "into", "about",
}

HIGH_SIGNAL_KEYWORDS = {
    "connection": 3.0,
    "pool": 3.0,
    "exhaustion": 3.0,
    "5xx": 3.0,
    "postgresql": 2.5,
    "postgres": 2.5,
    "max_connections": 3.0,
    "timeout": 2.5,
    "latency": 2.5,
    "retry": 2.5,
    "amplification": 2.5,
    "capacity": 2.0,
    "pod": 2.0,
    "recycle": 2.5,
    "pressure": 2.5,
    "database": 2.0,
    "saturation": 2.5,
    "payments": 2.0,
    "checkout": 2.0,
    "remediation": 2.0,
    "failed": 2.0,
    "failure": 2.0,
    "successful": 2.0,
    "root-cause": 2.5,
    "cause": 2.0,
    "lesson": 2.0,
}


class HindsightService:
    """
    RETRAX memory layer.

    Hindsight remains the primary durable engineering-memory system.
    When Hindsight recall or reflection is unavailable (due to exhausted credits,
    connectivity, or service exceptions), RETRAX falls back to the deterministic
    local demo historical memory store and local Ollama reasoning.
    """

    def __init__(self) -> None:
        self.bank_id = settings.HINDSIGHT_BANK_ID

        self.client = Hindsight(
            base_url=settings.HINDSIGHT_BASE_URL,
            api_key=settings.HINDSIGHT_API_KEY or None,
        )
        self._demo_memories_cache: list[dict[str, Any]] | None = None

    def _load_demo_memories(self) -> list[dict[str, Any]]:
        """Load and cache the demo historical memories from seed data."""
        if self._demo_memories_cache is not None:
            return self._demo_memories_cache

        try:
            if DEMO_MEMORY_FILE.exists():
                with open(DEMO_MEMORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self._demo_memories_cache = data
                        return data
        except Exception as exc:
            logger.error("Failed to load demo_historical_memory.json: %s", exc)

        return []

    def _retrieve_and_rank_demo_memories(
        self,
        *,
        query: str,
        limit: int = 10,
        memory_types: list[str] | None = None,
        service_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Deterministic retrieval and ranking over demo historical memories.

        Token overlap and domain keyword weighting ensure relevant
        experiences (such as Payments API connection pressure) rank at the top.
        """
        memories = self._load_demo_memories()
        if not memories:
            return []

        # Extract tokens from query
        raw_tokens = re.findall(r"[a-zA-Z0-9_-]+", query.lower())
        query_tokens = [t for t in raw_tokens if t not in STOP_WORDS and len(t) > 1]

        # Determine target service if present in query or service_id
        target_service = None
        if service_id:
            target_service = SERVICE_MAP.get(service_id, service_id).lower()
        if not target_service:
            for token in query_tokens:
                if token in {"payments", "payment"}:
                    target_service = "payments"
                    break
                elif token in {"checkout"}:
                    target_service = "checkout"
                    break

        scored: list[tuple[float, dict[str, Any]]] = []

        for record in memories:
            rec_type = record.get("memory_type", "")
            if memory_types and len(memory_types) > 0:
                # If 'experience' is requested, match all resolution/experience records
                if "experience" not in memory_types and rec_type not in memory_types:
                    continue

            content = record.get("content", "")
            tags = record.get("tags", [])
            service = record.get("service", "")
            incident_key = record.get("incident_key", "")

            # Build corpus of record text
            record_corpus = f"{content} {' '.join(tags)} {service} {incident_key} {rec_type}".lower()
            record_tokens = set(re.findall(r"[a-zA-Z0-9_-]+", record_corpus))

            score = 0.0

            # 1. Token overlap scoring
            for qt in query_tokens:
                if qt in record_tokens:
                    weight = HIGH_SIGNAL_KEYWORDS.get(qt, 1.0)
                    score += weight
                elif any(qt in rt for rt in record_tokens):
                    score += 0.5

            # 2. Service relevance boost
            if target_service and service.lower() == target_service:
                score += 2.5

            # 3. High signal keywords in record content
            for kw, kw_weight in HIGH_SIGNAL_KEYWORDS.items():
                if kw in query_tokens and kw in record_corpus:
                    score += kw_weight * 0.5

            # Map raw score to normalized relevance between 0.55 and 0.98
            if score > 0:
                relevance = min(0.98, 0.60 + (score / 25.0) * 0.38)
            else:
                # Baseline relevance for demo historical store
                relevance = 0.55 if service.lower() == (target_service or "payments") else 0.45

            scored.append((relevance, record))

        # Sort by relevance descending
        scored.sort(key=lambda x: x[0], reverse=True)

        results: list[dict[str, Any]] = []
        for relevance, record in scored[:limit]:
            results.append({
                "id": record.get("id"),
                "text": record.get("content", ""),
                "content": record.get("content", ""),
                "type": record.get("memory_type"),
                "memory_type": record.get("memory_type"),
                "score": round(relevance, 2),
                "relevance": round(relevance, 2),
                "incident_key": record.get("incident_key"),
                "incident_id": record.get("incident_key"),
                "service": record.get("service"),
                "service_id": record.get("service"),
                "occurred_at": record.get("occurred_at"),
                "tags": record.get("tags", []),
            })

        return results

    async def retain(
        self,
        *,
        content: str,
        memory_type: str,
        organization_id: str | None = None,
        incident_id: str | None = None,
        service_id: str | None = None,
        tags: list[str] | None = None,
        timestamp: datetime | None = None,
        context: str | None = None,
    ) -> Any:
        """Store durable engineering experience in Hindsight."""

        memory_tags = [f"memory_type:{memory_type}"]

        if organization_id:
            memory_tags.append(f"organization:{organization_id}")

        if incident_id:
            memory_tags.append(f"incident:{incident_id}")

        if service_id:
            memory_tags.append(f"service:{service_id}")

        if tags:
            memory_tags.extend(tags)

        metadata: dict[str, str] = {
            "source": "retrax",
            "memory_type": memory_type,
        }

        if organization_id:
            metadata["organization_id"] = organization_id

        if incident_id:
            metadata["incident_id"] = incident_id

        if service_id:
            metadata["service_id"] = service_id

        try:
            return await self.client.aretain(
                bank_id=self.bank_id,
                content=content,
                timestamp=timestamp,
                context=context,
                metadata=metadata,
                tags=memory_tags,
            )
        except Exception as exc:
            logger.warning("Hindsight retain unavailable: %s", exc)
            return {
                "status": "retained_locally",
                "hindsight_available": False,
                "memory_type": memory_type,
            }

    async def recall(
        self,
        *,
        query: str,
        limit: int = 10,
        memory_types: list[str] | None = None,
        organization_id: str | None = None,
        service_id: str | None = None,
        incident_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Retrieve relevant historical engineering experience.

        When Hindsight recall fails (exhausted credits, connectivity, etc.),
        RETRAX falls back to demo_historical_memory.json to retrieve and rank
        real historical incident experience.
        """

        tags: list[str] = []

        if organization_id:
            tags.append(f"organization:{organization_id}")

        # Note: We do NOT use current incident_id as a hard filter tag
        # so that previous incidents (INC-2026-0918, INC-2026-0922) are recalled.
        if service_id:
            tags.append(f"service:{service_id}")

        try:
            response = await self.client.arecall(
                bank_id=self.bank_id,
                query=query,
                types=memory_types or None,
                tags=tags or None,
                max_tokens=max(1000, min(limit * 700, 8000)),
            )

            raw_results = getattr(response, "results", [])
            if raw_results:
                results: list[dict[str, Any]] = []
                for item in raw_results[:limit]:
                    results.append(
                        {
                            "id": getattr(item, "id", None),
                            "text": getattr(item, "text", ""),
                            "content": getattr(item, "text", ""),
                            "type": getattr(item, "type", None),
                            "memory_type": getattr(item, "type", None),
                            "score": getattr(item, "score", None),
                            "relevance": getattr(item, "score", None),
                        }
                    )

                return {
                    "query": query,
                    "results": results,
                    "total": len(results),
                    "available": True,
                    "provider": "hindsight",
                    "hindsight_available": True,
                    "demo_memory": False,
                }

        except Exception as exc:
            logger.warning(
                "Hindsight recall unavailable (%s); falling back to demo historical store.",
                exc,
            )

        # ---------------------------------------------------------
        # DEMO HISTORICAL MEMORY FALLBACK
        # ---------------------------------------------------------
        demo_results = self._retrieve_and_rank_demo_memories(
            query=query,
            limit=limit,
            memory_types=memory_types,
            service_id=service_id,
        )

        return {
            "query": query,
            "results": demo_results,
            "total": len(demo_results),
            "available": True,
            "provider": "demo_memory",
            "hindsight_available": False,
            "demo_memory": True,
        }

    async def reflect(
        self,
        *,
        query: str,
        context: str | None = None,
        memory_types: list[str] | None = None,
        organization_id: str | None = None,
        service_id: str | None = None,
        incident_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Synthesize incident reasoning.

        Hindsight reflection is preferred.
        Ollama is used locally when Hindsight reflection fails.
        """

        tags: list[str] = []

        if organization_id:
            tags.append(f"organization:{organization_id}")

        if service_id:
            tags.append(f"service:{service_id}")

        try:
            response = await self.client.areflect(
                bank_id=self.bank_id,
                query=query,
                context=context,
                tags=tags or None,
                include_facts=True,
                fact_types=memory_types or None,
                budget="mid",
            )

            text = getattr(response, "text", "")
            if text:
                return {
                    "query": query,
                    "text": text,
                    "based_on": getattr(response, "based_on", None),
                    "provider": "hindsight",
                    "hindsight_available": True,
                    "demo_memory": False,
                }

        except Exception as exc:
            logger.warning(
                "Hindsight reflection unavailable (%s); using local Ollama reasoning.",
                exc,
            )

        # ---------------------------------------------------------
        # LOCAL OLLAMA FALLBACK
        # ---------------------------------------------------------
        #
        # When Hindsight reflection is unavailable, Ollama reasons
        # strictly over the supplied context (which includes retrieved
        # historical memory from the fallback store).
        #
        effective_context = context
        if not effective_context:
            recalled = await self.recall(
                query=query,
                limit=6,
                organization_id=organization_id,
                service_id=service_id,
            )
            recalled_items = recalled.get("results", [])
            if recalled_items:
                mem_lines = "\n\n".join(
                    f"Historical experience {idx + 1}:\n{m.get('text', '')}"
                    for idx, m in enumerate(recalled_items)
                )
                effective_context = (
                    f"HISTORICAL ENGINEERING EXPERIENCE\n{mem_lines}"
                )

        local_system = (
            "You are the RETRAX incident-response reasoning engine. "
            "You are analyzing production incidents using recalled historical experience. "
            "The supplied RETRAX CONTEXT is the only source of truth.\n\n"

            "EVIDENCE POLICY:\n"
            "1. Use only facts explicitly present in RETRAX CONTEXT.\n"
            "2. Never invent previous incidents, previous services, historical "
            "root causes, historical actions, historical failures, historical "
            "successes, metrics, deployments, outcomes, commands, or evidence.\n"
            "3. Never assume that a fact exists merely because it would be "
            "technically plausible.\n"
            "4. If historical experience is absent, say exactly: "
            "'No relevant historical experience found.'\n"
            "5. Never describe anything as a historical lesson unless it is "
            "explicitly present as historical evidence in the context.\n"
            "6. Distinguish CURRENT FACTS from INFERENCE.\n"
            "7. An inference must be labeled as an inference or hypothesis and "
            "must be based only on the supplied current incident facts.\n"
            "8. Do not fabricate numerical values, percentages, timestamps, "
            "latencies, error rates, traffic levels, connection counts, or "
            "recovery measurements.\n"
            "9. Do not claim that any command, investigation, deployment, "
            "rollback, remediation, configuration change, restart, or "
            "infrastructure action was executed on the current incident unless "
            "the context explicitly states so.\n\n"

            "OUTPUT FORMAT:\n"
            "Return exactly these sections in this order:\n"
            "### Incident Facts\n"
            "### Historical Evidence\n"
            "### Inference and Hypotheses\n"
            "### What Worked Before\n"
            "### What Failed Before\n"
            "### What Should Not Be Repeated\n"
            "### Preventive Lessons\n"
            "### Investigation Recommendations\n\n"

            "STYLE:\n"
            "Be concise, technically specific, and operationally useful. "
            "Use short bullets where appropriate. "
            "Do not add unsupported sections. "
            "Do not fabricate missing information."
        )

        local_user = (
            "RETRAX REQUEST\n"
            f"{query.strip()}\n\n"
            "RETRAX CONTEXT\n"
            f"{effective_context.strip() if effective_context else 'No additional context was provided.'}\n\n"
            "FINAL CHECK BEFORE ANSWERING\n"
            "Only state historical claims when explicitly supported by the "
            "RETRAX CONTEXT. If no historical experience is supplied, explicitly "
            "state that no relevant historical experience was found."
        )

        local_text = await ollama_service.text(
            local_user,
            system=local_system,
            temperature=0.0,
        )

        return {
            "query": query,
            "text": local_text,
            "based_on": [],
            "provider": "ollama",
            "hindsight_available": False,
            "demo_memory": True,
        }


hindsight_service = HindsightService()


async def retain_incident_experience(
    *,
    incident_key: str,
    title: str,
    description: str,
    root_cause: str | None,
    successful_actions: list[str],
    failed_actions: list[str],
    lessons: list[str],
    preventive_actions: list[str],
    organization_id: str,
    service_id: str,
    timestamp: datetime | None = None,
) -> Any:
    """Convert a completed incident into durable Hindsight experience."""

    experience = (
        f"Incident {incident_key}: {title}\n"
        f"Description: {description}\n"
        f"Root cause: {root_cause or 'Not confirmed'}\n"
        f"Successful actions: "
        f"{', '.join(successful_actions) or 'None recorded'}\n"
        f"Failed actions: "
        f"{', '.join(failed_actions) or 'None recorded'}\n"
        f"Lessons learned: "
        f"{', '.join(lessons) or 'None recorded'}\n"
        f"Preventive actions: "
        f"{', '.join(preventive_actions) or 'None recorded'}"
    )

    return await hindsight_service.retain(
        content=experience,
        memory_type="incident_resolution",
        organization_id=organization_id,
        incident_id=incident_key,
        service_id=service_id,
        tags=[
            "experience:incident",
            "outcome:resolved",
        ],
        timestamp=timestamp,
        context=(
            "RETRAX engineering incident memory. "
            "Store durable symptoms, root causes, successful actions, "
            "failed actions, lessons, and prevention knowledge."
        ),
    )


async def retain_failed_action(
    *,
    incident_id: str,
    organization_id: str,
    service_id: str,
    action: str,
    reason: str,
    timestamp: datetime | None = None,
) -> Any:
    """Persist negative engineering experience."""

    content = (
        f"During incident {incident_id}, engineers attempted: {action}. "
        f"The action failed or was ineffective. Reason: {reason}. "
        "Future responders should consider this prior failure before "
        "repeating it."
    )

    return await hindsight_service.retain(
        content=content,
        memory_type="failed_action",
        organization_id=organization_id,
        incident_id=incident_id,
        service_id=service_id,
        tags=[
            "experience:failure",
            "outcome:failed",
            "warning:do-not-repeat",
        ],
        timestamp=timestamp,
        context=(
            "Negative engineering experience from a production incident. "
            "Preserve failed approaches so future investigations do not "
            "repeat them."
        ),
    )


async def recall_similar_incidents(
    *,
    query: str,
    organization_id: str,
    service_id: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """Recall historical incidents relevant to the current incident."""

    return await hindsight_service.recall(
        query=query,
        limit=limit,
        memory_types=["experience"],
        organization_id=organization_id,
        service_id=service_id,
    )


async def reflect_on_incident(
    *,
    query: str,
    organization_id: str,
    service_id: str | None = None,
    incident_id: str | None = None,
    context: str | None = None,
) -> dict[str, Any]:
    """Generate incident reasoning using Hindsight or local Ollama."""

    return await hindsight_service.reflect(
        query=query,
        organization_id=organization_id,
        service_id=service_id,
        incident_id=incident_id,
        context=context,
    )