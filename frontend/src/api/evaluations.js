import { apiClient, ORGANIZATION_ID, unwrapCollection } from "./client";

export async function getEvaluationSummary(orgId = ORGANIZATION_ID) {
  const response = await apiClient.get("/api/evaluations/summary", {
    params: { organization_id: orgId },
  });
  return response.data;
}

export async function listEvaluations(orgId = ORGANIZATION_ID) {
  const response = await apiClient.get("/api/evaluations", {
    params: { organization_id: orgId },
  });
  return Array.isArray(response.data) ? response.data : unwrapCollection(response.data);
}

export async function getEvaluation(evaluationId, orgId = ORGANIZATION_ID) {
  const response = await apiClient.get(`/api/evaluations/${evaluationId}`, {
    params: { organization_id: orgId },
  });
  return response.data;
}

export async function compareEvaluations(payload, orgId = ORGANIZATION_ID) {
  const response = await apiClient.post("/api/evaluations/compare", payload, {
    params: { organization_id: orgId },
  });
  return response.data;
}
