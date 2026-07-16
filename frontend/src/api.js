/**
 * api.js
 *
 * Thin wrapper around fetch() for talking to the FastAPI backend.
 * Centralizing the base URL here means switching from localhost to a
 * deployed backend URL later only requires changing one line.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function getContainers() {
  return request("/containers?all=true");
}

export function getContainerStats(containerId) {
  return request(`/containers/${containerId}/stats`);
}

export function startContainer(containerId) {
  return request(`/containers/${containerId}/start`, { method: "POST" });
}

export function stopContainer(containerId) {
  return request(`/containers/${containerId}/stop`, { method: "POST" });
}

export function restartContainer(containerId) {
  return request(`/containers/${containerId}/restart`, { method: "POST" });
}

export function sendChatMessage(message) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getHistory(limit = 50) {
  return request(`/history?limit=${limit}`);
}