from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import select

from app.db.models import (
    Incident,
    InvestigationAction,
    Postmortem,
    Resolution,
)
from app.db.session import SessionLocal
from app.services.hindsight_service import hindsight_service


async def seed_hindsight() -> None:
    db = SessionLocal()

    try:
        incidents = db.scalars(
            select(Incident).order_by(Incident.started_at.asc())
        ).all()

        if not incidents:
            print("No incidents found.")
            return

        total = 0

        for incident in incidents:
            resolution = db.scalar(
                select(Resolution).where(
                    Resolution.incident_id == incident.id
                )
            )

            postmortem = db.scalar(
                select(Postmortem).where(
                    Postmortem.incident_id == incident.id
                )
            )

            actions = db.scalars(
                select(InvestigationAction)
                .where(
                    InvestigationAction.incident_id == incident.id
                )
                .order_by(InvestigationAction.timestamp.asc())
            ).all()

            successful_actions = [
                action.action
                for action in actions
                if action.result.lower() == "success"
            ]

            failed_actions = [
                action.action
                for action in actions
                if action.result.lower() == "failure"
            ]

            lessons = (
                postmortem.lessons_learned
                if postmortem and postmortem.lessons_learned
                else []
            )

            preventive_actions = (
                postmortem.preventive_actions
                if postmortem and postmortem.preventive_actions
                else []
            )

            # -----------------------------------------------------
            # 1. Full incident experience
            # -----------------------------------------------------

            incident_content = (
                f"Historical incident: {incident.incident_key}\n"
                f"Service: {incident.service_id}\n"
                f"Title: {incident.title}\n"
                f"Description: {incident.description}\n"
                f"Environment: {incident.environment}\n"
                f"Severity: {incident.severity}\n"
                f"Observed error: {incident.current_error or 'None'}\n"
                f"Impact: {incident.impact or 'None'}\n"
                f"Root cause: {incident.root_cause or 'Unknown'}\n"
                f"Resolution: {incident.resolution_summary or 'Unknown'}\n"
                f"Successful actions: {', '.join(successful_actions) or 'None'}\n"
                f"Failed actions: {', '.join(failed_actions) or 'None'}\n"
                f"Lessons: {', '.join(lessons) or 'None'}\n"
                f"Preventive actions: {', '.join(preventive_actions) or 'None'}"
            )

            result = await hindsight_service.client.aretain(
                bank_id=hindsight_service.bank_id,
                content=incident_content,
                timestamp=incident.started_at,
                context=(
                    "RETRAX durable engineering experience. "
                    "Preserve the incident symptoms, root cause, resolution, "
                    "successful approaches, failed approaches, lessons, and prevention."
                ),
                metadata={
                    "source": "retrax_seed",
                    "organization_id": incident.organization_id,
                    "incident_id": incident.id,
                    "incident_key": incident.incident_key,
                    "service_id": incident.service_id,
                },
                tags=[
                    "retrax",
                    "experience:incident",
                    f"organization:{incident.organization_id}",
                    f"service:{incident.service_id}",
                    f"incident:{incident.id}",
                ],
            )

            if result.success:
                total += 1

            print(
                f"[INCIDENT] {incident.incident_key}: "
                f"{'OK' if result.success else 'FAILED'}"
            )

            # -----------------------------------------------------
            # 2. Individual action experiences
            # -----------------------------------------------------

            for action in actions:
                action_type = (
                    "successful_action"
                    if action.result.lower() == "success"
                    else "failed_action"
                    if action.result.lower() == "failure"
                    else "investigation_action"
                )

                action_content = (
                    f"Investigation action during incident "
                    f"{incident.incident_key}.\n"
                    f"Action: {action.action}\n"
                    f"Result: {action.result}\n"
                    f"Reason: {action.reason or 'Not recorded'}\n"
                    f"Evidence: {action.evidence or []}\n"
                    f"Runbook: {action.runbook_id or 'None'}\n"
                    f"Hypothesis: {action.hypothesis_id or 'None'}"
                )

                result = await hindsight_service.client.aretain(
                    bank_id=hindsight_service.bank_id,
                    content=action_content,
                    timestamp=action.timestamp,
                    context=(
                        "RETRAX decision trajectory memory. "
                        "Preserve both successful and failed investigation actions."
                    ),
                    metadata={
                        "source": "retrax_seed",
                        "organization_id": incident.organization_id,
                        "incident_id": incident.id,
                        "incident_key": incident.incident_key,
                        "service_id": incident.service_id,
                        "action_result": action.result,
                    },
                    tags=[
                        "retrax",
                        f"experience:{action_type}",
                        f"organization:{incident.organization_id}",
                        f"service:{incident.service_id}",
                        f"incident:{incident.id}",
                    ],
                )

                if result.success:
                    total += 1

                print(
                    f"  [ACTION] {action.result.upper():10} "
                    f"{action.action[:70]}"
                )

            # -----------------------------------------------------
            # 3. Postmortem learning
            # -----------------------------------------------------

            if postmortem:
                postmortem_content = (
                    f"Postmortem for incident {incident.incident_key}.\n"
                    f"Summary: {postmortem.summary}\n"
                    f"Root cause: {postmortem.root_cause or 'Unknown'}\n"
                    f"Contributing factors: "
                    f"{postmortem.contributing_factors or []}\n"
                    f"Successful actions: "
                    f"{postmortem.successful_actions or []}\n"
                    f"Failed actions: "
                    f"{postmortem.failed_actions or []}\n"
                    f"Preventive actions: "
                    f"{postmortem.preventive_actions or []}\n"
                    f"Lessons learned: "
                    f"{postmortem.lessons_learned or []}"
                )

                result = await hindsight_service.client.aretain(
                    bank_id=hindsight_service.bank_id,
                    content=postmortem_content,
                    timestamp=postmortem.created_at,
                    context=(
                        "RETRAX postmortem learning. "
                        "Use this memory to improve future incident response."
                    ),
                    metadata={
                        "source": "retrax_seed",
                        "organization_id": incident.organization_id,
                        "incident_id": incident.id,
                        "incident_key": incident.incident_key,
                        "service_id": incident.service_id,
                    },
                    tags=[
                        "retrax",
                        "experience:postmortem",
                        "learning:durable",
                        f"organization:{incident.organization_id}",
                        f"service:{incident.service_id}",
                        f"incident:{incident.id}",
                    ],
                )

                if result.success:
                    total += 1

                print(
                    f"  [POSTMORTEM] "
                    f"{'OK' if result.success else 'FAILED'}"
                )

        print()
        print(f"TOTAL HINDSIGHT RETAINS: {total}")

    finally:
        db.close()
        await hindsight_service.client.aclose()


if __name__ == "__main__":
    asyncio.run(seed_hindsight())