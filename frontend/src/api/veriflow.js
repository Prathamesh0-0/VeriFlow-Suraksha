/**
 * VeriFlow API Client
 * Handles communication with the FastAPI backend.
 */

const API_BASE = '/api';

/**
 * Upload documents and trigger forensic analysis.
 * @param {File[]} files - Array of File objects to upload
 * @param {string|null} demoMode - "clean" | "tampered" | null
 * @returns {Promise<Object>} ForensicReport
 */
export async function uploadDocuments(files, demoMode = null) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  if (demoMode) {
    formData.append('demo_mode', demoMode);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `Upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Run a demo scenario without uploading files.
 * @param {"clean"|"tampered"} scenario
 * @returns {Promise<Object>} ForensicReport
 */
export async function runDemo(scenario) {
  const response = await fetch(`${API_BASE}/demo/${scenario}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Demo failed' }));
    throw new Error(error.detail || `Demo failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check backend health.
 * @returns {Promise<Object>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

/**
 * Get system capabilities (Tesseract, OpenCV availability).
 * @returns {Promise<Object>}
 */
export async function getSystemInfo() {
  const response = await fetch(`${API_BASE}/system-info`);
  return response.json();
}

/**
 * Get heatmap image URL.
 * @param {string} filename 
 * @returns {string}
 */
export function getHeatmapUrl(filename) {
  if (!filename) return '';
  const basename = filename.split(/[/\\]/).pop();
  return `/heatmaps/${basename}`;
}
