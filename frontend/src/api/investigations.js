import { apiClient, ORGANIZATION_ID } from "./client";

export async function runInvestigation(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/investigations/incidents/${incidentId}`,
    null,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function compareIncident(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/investigations/incidents/${incidentId}/comparison`,
    null,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function getTrajectory(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(
    `/api/investigations/incidents/${incidentId}/trajectory`,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function recordAction(incidentId, payload, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/investigations/incidents/${incidentId}/actions`,
    payload,
    { params: { organization_id: orgId } }
  );
  return response.data;
}

export async function chatAboutIncident(incidentId, payload, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post(
    `/api/investigations/incidents/${incidentId}/chat`,
    payload,
    { params: { organization_id: orgId } }
  );
  return response.data;
}
