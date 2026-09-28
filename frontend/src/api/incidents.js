import { apiClient, ORGANIZATION_ID, unwrapCollection } from "./client";

export const SERVICE_NAME_MAP = {
  "ff6b331e-171e-4a62-8aab-6ae6d21c1cee": "Payments API",
  "00719ed9-a651-4ad4-b3c0-6a844bf22be8": "Checkout Service",
};

export function resolveServiceName(serviceId) {
  if (!serviceId) return "Unknown Service";
  return SERVICE_NAME_MAP[serviceId] || `Service (${serviceId.slice(0, 8)})`;
}

export async function listIncidents(orgId = ORGANIZATION_ID) {
  const response = await apiClient.get("/api/incidents", {
    params: { organization_id: orgId },
  });
  return unwrapCollection(response.data);
}

export async function getIncident(incidentId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(`/api/incidents/${incidentId}`, {
    params: { organization_id: orgId },
  });
  return response.data;
}
