import { apiClient } from "./client";

export async function checkHealth() {
  const response = await apiClient.get("/api/health");
  return response.data;
}
