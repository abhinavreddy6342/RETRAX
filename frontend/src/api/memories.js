import { apiClient, ORGANIZATION_ID, unwrapCollection } from "./client";

export async function recallIncidentExperience(
  orgId = ORGANIZATION_ID,
  query = "Analyze this incident using historical engineering experience.",
  serviceId = null,
  limit = 10
) {
  const params = {
    organization_id: orgId,
    query,
    limit,
  };
  if (serviceId) {
    params.service_id = serviceId;
  }

  const response = await apiClient.post(
    "/api/memories/incident-experience",
    null,
    { params }
  );
  return unwrapCollection(response.data);
}

export async function recallMemories(
  orgId = ORGANIZATION_ID,
  query = "incident patterns and root causes",
  serviceId = null,
  incidentId = null,
  limit = 10
) {
  const body = {
    query,
    organization_id: orgId,
    limit,
    ...(serviceId ? { service_id: serviceId } : {}),
    ...(incidentId ? { incident_id: incidentId } : {}),
  };
  const response = await apiClient.post("/api/memories/recall", body);
  return response.data;
}

export async function reflectMemories(
  orgId = ORGANIZATION_ID,
  query = "What patterns emerge from past incidents?",
  serviceId = null,
  incidentId = null
) {
  const body = {
    query,
    organization_id: orgId,
    ...(serviceId ? { service_id: serviceId } : {}),
    ...(incidentId ? { incident_id: incidentId } : {}),
  };
  const response = await apiClient.post("/api/memories/reflect", body);
  return response.data;
}
