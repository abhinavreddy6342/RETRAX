import { apiClient, ORGANIZATION_ID } from "./client";

export async function getPostmortem(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(
    `/api/postmortems/incidents/${incidentId}`,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function learnFromPostmortem(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/postmortems/incidents/${incidentId}/learn`,
    null,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function getLearningStatus(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(
    `/api/learning/incidents/${incidentId}/status`,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function triggerLearning(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/learning/incidents/${incidentId}`,
    null,
    { params: { organization_id: orgId } }
  );
  return response.data;
}
