import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export const ORGANIZATION_ID = "9887ffdf-ea38-49cd-a5c9-ab4a67868cd7";
export function unwrapCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
