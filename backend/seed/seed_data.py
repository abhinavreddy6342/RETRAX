from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select

from app.db.base import utcnow
from app.db.models import (
    Deployment,
    Incident,
    IncidentEvent,
    InvestigationAction,
    Organization,
    Postmortem,
    Resolution,
    Runbook,
    Service,
    Team,
    User,
)
from app.db.session import SessionLocal


def uid() -> str:
    return str(uuid4())


def now_minus(hours: int) -> datetime:
    return utcnow() - timedelta(hours=hours)


def seed() -> None:
    db = SessionLocal()

    try:
        existing_org = db.scalar(
            select(Organization).where(
                Organization.slug == "acme-engineering"
            )
        )

        if existing_org:
            print("Seed data already exists.")
            return

        # ---------------------------------------------------------
        # Organization
        # ---------------------------------------------------------

        organization = Organization(
            id=uid(),
            name="Acme Engineering",
            slug="acme-engineering",
            created_at=utcnow(),
        )
        db.add(organization)
        db.flush()

        # ---------------------------------------------------------
        # Teams
        # ---------------------------------------------------------

        sre_team = Team(
            id=uid(),
            organization_id=organization.id,
            name="Site Reliability Engineering",
            created_at=utcnow(),
        )

        platform_team = Team(
            id=uid(),
            organization_id=organization.id,
            name="Platform Engineering",
            created_at=utcnow(),
        )

        db.add_all([sre_team, platform_team])
        db.flush()

        # ---------------------------------------------------------
        # Users
        # ---------------------------------------------------------

        abhinav = User(
            id=uid(),
            organization_id=organization.id,
            team_id=sre_team.id,
            name="Abhinav Reddy",
            email="abhinav@acme.example",
            role="engineer",
            created_at=utcnow(),
        )

        arjun = User(
            id=uid(),
            organization_id=organization.id,
            team_id=platform_team.id,
            name="Arjun Sharma",
            email="arjun@acme.example",
            role="senior_engineer",
            created_at=utcnow(),
        )

        db.add_all([abhinav, arjun])
        db.flush()

        # ---------------------------------------------------------
        # Services
        # ---------------------------------------------------------

        payments = Service(
            id=uid(),
            organization_id=organization.id,
            owner_team_id=sre_team.id,
            name="payments-api",
            environment="production",
            description="Core payment processing API.",
            created_at=utcnow(),
            updated_at=utcnow(),
        )

        checkout = Service(
            id=uid(),
            organization_id=organization.id,
            owner_team_id=platform_team.id,
            name="checkout-service",
            environment="production",
            description="Customer checkout orchestration service.",
            created_at=utcnow(),
            updated_at=utcnow(),
        )

        db.add_all([payments, checkout])
        db.flush()

        # ---------------------------------------------------------
        # Deployments
        # ---------------------------------------------------------

        payments_deployment_old = Deployment(
            id=uid(),
            service_id=payments.id,
            version="2026.09.18",
            environment="production",
            commit_sha="a91f4c2",
            deployed_by="platform-bot",
            notes="Routine payment service deployment.",
            deployed_at=now_minus(96),
        )

        payments_deployment_current = Deployment(
            id=uid(),
            service_id=payments.id,
            version="2026.09.26",
            environment="production",
            commit_sha="f82d1e9",
            deployed_by="platform-bot",
            notes="Database connection pool optimization.",
            deployed_at=now_minus(18),
        )

        checkout_deployment = Deployment(
            id=uid(),
            service_id=checkout.id,
            version="2026.09.25",
            environment="production",
            commit_sha="c73bb21",
            deployed_by="platform-bot",
            notes="Checkout validation update.",
            deployed_at=now_minus(30),
        )

        db.add_all(
            [
                payments_deployment_old,
                payments_deployment_current,
                checkout_deployment,
            ]
        )
        db.flush()

        # ---------------------------------------------------------
        # Runbooks
        # ---------------------------------------------------------

        payments_connection_runbook = Runbook(
            id=uid(),
            organization_id=organization.id,
            service_id=payments.id,
            runbook_key="RB-PAYMENTS-DB-CONNECTION",
            name="Payments API Database Connection Recovery",
            description="Investigate and recover database connection exhaustion.",
            steps=[
                {
                    "order": 1,
                    "title": "Check connection pool",
                    "instruction": "Inspect active and idle database connections.",
                    "expected_result": "Connection usage below configured maximum.",
                    "command": "SELECT * FROM pg_stat_activity;",
                    "risk_level": "low",
                },
                {
                    "order": 2,
                    "title": "Check recent deployment",
                    "instruction": "Compare current deployment with the previous stable release.",
                    "expected_result": "Identify recent connection-pool configuration changes.",
                    "command": "git diff <previous> <current>",
                    "risk_level": "low",
                },
                {
                    "order": 3,
                    "title": "Recycle affected pods",
                    "instruction": "Restart only unhealthy application instances.",
                    "expected_result": "Connection usage returns to normal.",
                    "command": "kubectl rollout restart deployment/payments-api",
                    "risk_level": "medium",
                },
            ],
            risk_level="medium",
            created_at=utcnow(),
            updated_at=utcnow(),
        )

        checkout_latency_runbook = Runbook(
            id=uid(),
            organization_id=organization.id,
            service_id=checkout.id,
            runbook_key="RB-CHECKOUT-LATENCY",
            name="Checkout Latency Investigation",
            description="Investigate elevated checkout latency and dependency failures.",
            steps=[
                {
                    "order": 1,
                    "title": "Inspect request latency",
                    "instruction": "Check p95 and p99 checkout latency.",
                    "expected_result": "Identify whether latency is application or dependency related.",
                    "command": "curl http://localhost:9090/api/v1/query",
                    "risk_level": "low",
                },
                {
                    "order": 2,
                    "title": "Inspect dependency errors",
                    "instruction": "Check payment and inventory dependency error rates.",
                    "expected_result": "Identify failing dependency.",
                    "command": "kubectl logs deployment/checkout-service",
                    "risk_level": "low",
                },
            ],
            risk_level="low",
            created_at=utcnow(),
            updated_at=utcnow(),
        )

        db.add_all(
            [
                payments_connection_runbook,
                checkout_latency_runbook,
            ]
        )
        db.flush()

        # ---------------------------------------------------------
        # Historical Incident 1
        # ---------------------------------------------------------

        incident_1 = Incident(
            id=uid(),
            incident_key="INC-2026-0918",
            organization_id=organization.id,
            service_id=payments.id,
            assigned_to=arjun.id,
            deployment_id=payments_deployment_old.id,
            title="Payments API database connection exhaustion",
            description=(
                "Payment requests began failing intermittently after a traffic spike. "
                "Database connection usage reached the configured pool limit."
            ),
            severity="SEV-1",
            status="resolved",
            environment="production",
            current_error="psycopg.OperationalError: too many connections",
            impact="Payment requests returned 5xx responses for approximately 18 minutes.",
            root_cause=(
                "A connection pool configuration change increased retained connections "
                "per application instance beyond the database capacity."
            ),
            resolution_summary=(
                "Reduced connection pool size and recycled affected application pods."
            ),
            started_at=now_minus(240),
            detected_at=now_minus(238),
            resolved_at=now_minus(222),
            created_at=now_minus(240),
            updated_at=now_minus(222),
        )

        db.add(incident_1)
        db.flush()

        # Incident events
        db.add_all(
            [
                IncidentEvent(
                    id=uid(),
                    incident_id=incident_1.id,
                    event_type="detected",
                    timestamp=now_minus(238),
                    actor="monitoring",
                    title="Connection failures detected",
                    description="Database connection errors crossed the alert threshold.",
                    event_metadata={"threshold": 90},
                ),
                IncidentEvent(
                    id=uid(),
                    incident_id=incident_1.id,
                    event_type="investigation",
                    timestamp=now_minus(232),
                    actor="arjun",
                    title="Connection pool identified as suspect",
                    description="Active connections matched the recent deployment change.",
                    event_metadata={"signal": "pool_exhaustion"},
                ),
                IncidentEvent(
                    id=uid(),
                    incident_id=incident_1.id,
                    event_type="resolved",
                    timestamp=now_minus(222),
                    actor="arjun",
                    title="Pool configuration reverted",
                    description="Connection usage returned to normal after rollout.",
                    event_metadata={"resolution": "pool_revert"},
                ),
            ]
        )

        # Successful and failed investigation actions
        db.add_all(
            [
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_1.id,
                    runbook_id=payments_connection_runbook.id,
                    action="Inspect PostgreSQL active connections",
                    actor="arjun",
                    timestamp=now_minus(236),
                    result="success",
                    reason="Confirmed connection exhaustion.",
                    evidence=[
                        "active connections at 100% of configured limit"
                    ],
                    action_metadata={"query": "pg_stat_activity"},
                ),
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_1.id,
                    runbook_id=None,
                    action="Increase database max_connections immediately",
                    actor="arjun",
                    timestamp=now_minus(230),
                    result="failure",
                    reason=(
                        "Database capacity could not be safely increased during "
                        "the incident without broader infrastructure changes."
                    ),
                    evidence=[],
                    action_metadata={},
                ),
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_1.id,
                    runbook_id=payments_connection_runbook.id,
                    action="Reduce application connection pool size and recycle pods",
                    actor="arjun",
                    timestamp=now_minus(224),
                    result="success",
                    reason="Removed excess retained connections.",
                    evidence=[
                        "connection usage dropped below 60%",
                        "5xx rate returned to baseline",
                    ],
                    action_metadata={},
                ),
            ]
        )

        # Resolution
        db.add(
            Resolution(
                id=uid(),
                incident_id=incident_1.id,
                root_cause=incident_1.root_cause,
                resolution=incident_1.resolution_summary,
                outcome="resolved",
                successful_actions=[
                    "Inspect PostgreSQL active connections",
                    "Reduce application connection pool size",
                    "Recycle affected pods",
                ],
                failed_actions=[
                    "Increase database max_connections immediately",
                ],
                resolved_by="arjun",
                resolved_at=incident_1.resolved_at,
            )
        )

        # Postmortem
        db.add(
            Postmortem(
                id=uid(),
                incident_id=incident_1.id,
                summary=(
                    "Database connection exhaustion caused payment failures after "
                    "a connection-pool configuration change."
                ),
                impact=incident_1.impact,
                timeline=[
                    {
                        "timestamp": incident_1.detected_at.isoformat(),
                        "event": "Connection failures detected",
                    },
                    {
                        "timestamp": now_minus(232).isoformat(),
                        "event": "Pool exhaustion confirmed",
                    },
                    {
                        "timestamp": incident_1.resolved_at.isoformat(),
                        "event": "Pool reverted and pods recycled",
                    },
                ],
                root_cause=incident_1.root_cause,
                contributing_factors=[
                    "Connection pool sizing was not validated against database capacity."
                ],
                successful_actions=[
                    "Inspect active connections",
                    "Reduce connection pool",
                    "Recycle pods",
                ],
                failed_actions=[
                    "Increase database max_connections during incident",
                ],
                preventive_actions=[
                    "Add deployment-time connection capacity validation.",
                    "Alert on connection-pool utilization before exhaustion.",
                ],
                lessons_learned=[
                    "Check recent deployment changes before modifying database capacity.",
                    "Do not immediately increase database capacity without validating the application pool configuration.",
                ],
                created_at=incident_1.resolved_at,
            )
        )

        # ---------------------------------------------------------
        # Historical Incident 2
        # ---------------------------------------------------------

        incident_2 = Incident(
            id=uid(),
            incident_key="INC-2026-0922",
            organization_id=organization.id,
            service_id=checkout.id,
            assigned_to=abhinav.id,
            deployment_id=checkout_deployment.id,
            title="Checkout latency caused by payment dependency timeouts",
            description=(
                "Checkout p99 latency increased significantly. Investigation showed "
                "payment dependency requests timing out under load."
            ),
            severity="SEV-2",
            status="resolved",
            environment="production",
            current_error="payment dependency timeout",
            impact="Checkout completion latency increased for approximately 11 minutes.",
            root_cause=(
                "Payment dependency response latency exceeded the checkout timeout "
                "threshold during a transient load increase."
            ),
            resolution_summary=(
                "Reduced unnecessary retry amplification and increased dependency "
                "capacity after confirming downstream saturation."
            ),
            started_at=now_minus(120),
            detected_at=now_minus(118),
            resolved_at=now_minus(107),
            created_at=now_minus(120),
            updated_at=now_minus(107),
        )

        db.add(incident_2)
        db.flush()

        db.add_all(
            [
                IncidentEvent(
                    id=uid(),
                    incident_id=incident_2.id,
                    event_type="detected",
                    timestamp=now_minus(118),
                    actor="monitoring",
                    title="Checkout p99 latency alert",
                    description="Checkout p99 crossed the configured threshold.",
                    event_metadata={"p99_ms": 4200},
                ),
                IncidentEvent(
                    id=uid(),
                    incident_id=incident_2.id,
                    event_type="resolved",
                    timestamp=now_minus(107),
                    actor="abhinav",
                    title="Downstream saturation mitigated",
                    description="Retry amplification was reduced and payment capacity restored.",
                    event_metadata={"resolution": "dependency_capacity"},
                ),
            ]
        )

        db.add_all(
            [
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_2.id,
                    runbook_id=checkout_latency_runbook.id,
                    action="Inspect checkout p99 latency",
                    actor="abhinav",
                    timestamp=now_minus(116),
                    result="success",
                    reason="Confirmed latency increase was concentrated in payment calls.",
                    evidence=["checkout p99 = 4200ms"],
                    action_metadata={},
                ),
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_2.id,
                    runbook_id=None,
                    action="Increase checkout request timeout immediately",
                    actor="abhinav",
                    timestamp=now_minus(113),
                    result="failure",
                    reason="Increasing timeout increased queued requests without fixing downstream saturation.",
                    evidence=["request queue depth increased"],
                    action_metadata={},
                ),
                InvestigationAction(
                    id=uid(),
                    incident_id=incident_2.id,
                    runbook_id=checkout_latency_runbook.id,
                    action="Reduce retry amplification and restore payment capacity",
                    actor="abhinav",
                    timestamp=now_minus(109),
                    result="success",
                    reason="Downstream saturation decreased and checkout latency recovered.",
                    evidence=["p99 returned below 900ms"],
                    action_metadata={},
                ),
            ]
        )

        db.add(
            Resolution(
                id=uid(),
                incident_id=incident_2.id,
                root_cause=incident_2.root_cause,
                resolution=incident_2.resolution_summary,
                outcome="resolved",
                successful_actions=[
                    "Inspect checkout p99 latency",
                    "Reduce retry amplification",
                    "Restore payment capacity",
                ],
                failed_actions=[
                    "Increase checkout request timeout immediately",
                ],
                resolved_by="abhinav",
                resolved_at=incident_2.resolved_at,
            )
        )

        db.add(
            Postmortem(
                id=uid(),
                incident_id=incident_2.id,
                summary=(
                    "Checkout latency was caused by downstream payment saturation "
                    "and amplified retries."
                ),
                impact=incident_2.impact,
                timeline=[
                    {
                        "timestamp": incident_2.detected_at.isoformat(),
                        "event": "Latency alert triggered",
                    },
                    {
                        "timestamp": incident_2.resolved_at.isoformat(),
                        "event": "Retry amplification reduced and capacity restored",
                    },
                ],
                root_cause=incident_2.root_cause,
                contributing_factors=[
                    "Retry policy amplified downstream load."
                ],
                successful_actions=[
                    "Inspect dependency latency",
                    "Reduce retry amplification",
                    "Restore payment capacity",
                ],
                failed_actions=[
                    "Increase request timeout",
                ],
                preventive_actions=[
                    "Add retry-budget monitoring.",
                    "Alert on dependency saturation before latency reaches checkout users.",
                ],
                lessons_learned=[
                    "Increasing timeouts can worsen queues when the downstream dependency is saturated.",
                    "Check dependency health before changing frontend-facing timeout limits.",
                ],
                created_at=incident_2.resolved_at,
            )
        )

        db.commit()

        print("RETRAX seed complete.")
        print(f"Organization: {organization.id}")
        print(f"Team: {sre_team.id}")
        print(f"Engineer: {abhinav.id}")
        print(f"Service 1: {payments.id}")
        print(f"Service 2: {checkout.id}")
        print(f"Historical Incident 1: {incident_1.id}")
        print(f"Historical Incident 2: {incident_2.id}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()