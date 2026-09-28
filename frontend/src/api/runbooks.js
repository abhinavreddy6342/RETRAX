import { apiClient, ORGANIZATION_ID, unwrapCollection } from "./client";

export async function listRunbooks(orgId = ORGANIZATION_ID) {
  const response = await apiClient.get("/api/runbooks", {
    params: { organization_id: orgId },
  });
  // Backend returns an array directly
  return Array.isArray(response.data) ? response.data : unwrapCollection(response.data);
}

export async function getRunbook(runbookId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(`/api/runbooks/${runbookId}`, {
    params: { organization_id: orgId },
  });
  return response.data;
}

export async function getRunbookExperience(runbookId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(
    `/api/runbooks/${runbookId}/experience`,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function getRunbookRecommendations(
  incidentId,
  serviceId,
  orgId = ORGANIZATION_ID
) {
  const response = await apiClient.get(
    `/api/runbooks/recommendations/${incidentId}`,
    {
      params: {
        organization_id: orgId,
        service_id: serviceId,
      },
    }
  );
  return unwrapCollection(response.data);
}

export async function executeRunbook(payload, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post("/api/runbooks/execute", payload, {
    params: { organization_id: orgId },
  });
  return response.data;
}
