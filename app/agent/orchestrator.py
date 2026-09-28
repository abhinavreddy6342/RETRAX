from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.db.models.incident import Incident
from app.services.hindsight_service import hindsight_service


@dataclass
class AgentDecision:
    """Structured decision produced by the RETRAX incident agent."""

    incident_id: str
    summary: str
    historical_experience: list[dict[str, Any]]
    reasoning: str
    recommended_actions: list[str]
    successful_patterns: list[str]
    failed_patterns: list[str]
    warnings: list[str]
    preventive_insights: list[str]
    confidence: float
    memory_count: int


class IncidentIntelligenceAgent:
    """
    RETRAX memory-augmented incident response agent.

    The agent does not treat historical incidents as simple search results.
    It combines historical experience with Hindsight reflection to produce
    actionable incident-response guidance.
    """

    def __init__(self) -> None:
        self.hindsight = hindsight_service

    async def investigate(
        self,
        *,
        incident: Incident,
    ) -> AgentDecision:
        """Investigate an active incident using historical experience."""

        query = self._build_query(incident)

        recall = await self.hindsight.recall(
            query=query,
            limit=8,
            organization_id=incident.organization_id,
            service_id=incident.service_id,
            incident_id=incident.id,
        )

        historical_experience = recall.get("results", [])

        context = self._build_context(
            incident=incident,
            memories=historical_experience,
        )

        reflection = await self.hindsight.reflect(
            query=(
                "Analyze the current incident using historical engineering "
                "experience. Identify what is similar, what is different, "
                "what worked before, what failed before, what should not be "
                "repeated, and what investigation should happen next."
            ),
            context=context,
            organization_id=incident.organization_id,
            service_id=incident.service_id,
            incident_id=incident.id,
        )

        reflection_text = reflection.get("text", "")

        successful_patterns = self._extract_section(
            reflection_text,
            "What Worked",
        )

        failed_patterns = self._extract_section(
            reflection_text,
            "What Failed",
        )

        warnings = self._extract_section(
            reflection_text,
            "What Should Not Be Repeated",
        )

        preventive_insights = self._extract_section(
            reflection_text,
            "Preventive Measures",
        )

        recommendations = self._build_recommendations(
            incident=incident,
            memories=historical_experience,
            reflection=reflection_text,
        )

        confidence = self._calculate_confidence(
            memory_count=len(historical_experience),
            reflection_text=reflection_text,
        )

        return AgentDecision(
            incident_id=incident.id,
            summary=self._build_summary(incident, reflection_text),
            historical_experience=historical_experience,
            reasoning=reflection_text,
            recommended_actions=recommendations,
            successful_patterns=successful_patterns,
            failed_patterns=failed_patterns,
            warnings=warnings,
            preventive_insights=preventive_insights,
            confidence=confidence,
            memory_count=len(historical_experience),
        )

    def _build_query(self, incident: Incident) -> str:
        """Create a high-signal historical-memory query."""

        return (
            f"Current incident: {incident.title}\n"
            f"Service: {incident.service_id}\n"
            f"Environment: {incident.environment}\n"
            f"Severity: {incident.severity}\n"
            f"Description: {incident.description}\n"
            f"Current error: {incident.current_error or 'None'}\n"
            f"Impact: {incident.impact or 'None'}\n"
            "Find similar incidents, root causes, successful actions, "
            "failed actions, runbooks, lessons, and warnings."
        )

    def _build_context(
        self,
        *,
        incident: Incident,
        memories: list[dict[str, Any]],
    ) -> str:
        """Convert current incident and recalled memories into reasoning context."""

        memory_text = "\n\n".join(
            (
                f"Historical experience {index + 1}:\n"
                f"{memory.get('text', '')}"
            )
            for index, memory in enumerate(memories)
        )

        return (
            "CURRENT INCIDENT\n"
            f"ID: {incident.id}\n"
            f"Title: {incident.title}\n"
            f"Description: {incident.description}\n"
            f"Service: {incident.service_id}\n"
            f"Environment: {incident.environment}\n"
            f"Severity: {incident.severity}\n"
            f"Error: {incident.current_error or 'None'}\n"
            f"Impact: {incident.impact or 'None'}\n\n"
            "HISTORICAL ENGINEERING EXPERIENCE\n"
            f"{memory_text or 'No relevant historical experience found.'}"
        )

    def _build_recommendations(
        self,
        *,
        incident: Incident,
        memories: list[dict[str, Any]],
        reflection: str,
    ) -> list[str]:
        """
        Build immediate investigation guidance.

        These are deliberately grounded in recalled experience rather than
        generic incident-response boilerplate.
        """

        recommendations: list[str] = []

        reflection_lower = reflection.lower()

        if "connection" in reflection_lower:
            recommendations.append(
                "Inspect current database connection usage and connection-pool configuration."
            )

        if "deployment" in reflection_lower:
            recommendations.append(
                "Inspect recent deployments and configuration changes affecting the service."
            )

        if "timeout" in reflection_lower:
            recommendations.append(
                "Check downstream dependency latency before increasing request timeouts."
            )

        if "retry" in reflection_lower:
            recommendations.append(
                "Inspect retry amplification and downstream saturation."
            )

        if "runbook" in reflection_lower:
            recommendations.append(
                "Review the previously associated runbook and its historical outcome."
            )

        if not recommendations:
            recommendations.append(
                "Compare the current incident symptoms with the most relevant historical experiences."
            )

        if memories:
            recommendations.append(
                "Validate the current symptoms against recalled historical evidence before applying remediation."
            )

        return recommendations[:6]

    def _calculate_confidence(
        self,
        *,
        memory_count: int,
        reflection_text: str,
    ) -> float:
        """Estimate confidence from available historical evidence."""

        if memory_count == 0:
            return 0.20

        score = min(0.80, 0.30 + (memory_count * 0.08))

        if len(reflection_text.strip()) > 300:
            score += 0.10

        return min(score, 0.95)

    def _build_summary(
        self,
        incident: Incident,
        reflection: str,
    ) -> str:
        """Create a concise command-center summary."""

        if reflection.strip():
            first_paragraph = reflection.strip().split("\n\n")[0]
            return (
                f"{incident.title}: "
                f"{first_paragraph[:500]}"
            )

        return (
            f"{incident.title}: historical experience was retrieved, "
            "but no synthesized guidance was produced."
        )

    def _extract_section(
        self,
        text: str,
        heading: str,
    ) -> list[str]:
        """Extract bullet-like lines from a reflected section."""

        lines = text.splitlines()

        start = -1

        for index, line in enumerate(lines):
            normalized = line.strip().lower()

            if heading.lower() in normalized:
                start = index + 1
                break

        if start == -1:
            return []

        items: list[str] = []

        for line in lines[start:]:
            stripped = line.strip()

            if stripped.startswith("#"):
                break

            if stripped.startswith("**") and stripped.endswith("**"):
                break

            if stripped.startswith("*"):
                value = stripped.lstrip("*").strip()
                if value:
                    items.append(value)

            elif stripped.startswith("-"):
                value = stripped.lstrip("-").strip()
                if value:
                    items.append(value)

        return items[:10]


incident_agent = IncidentIntelligenceAgent()


async def investigate_incident(
    incident: Incident,
) -> AgentDecision:
    """Convenience entry point for RETRAX agent investigation."""

    return await incident_agent.investigate(
        incident=incident,
    )