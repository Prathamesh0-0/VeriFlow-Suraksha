/**
 * VeriFlow API Client
 * Handles communication with the FastAPI backend.
 */

// Auto-detect if running on localhost. If on Vercel (production), bypass Vercel's 4.5MB 
// proxy upload limit by communicating directly with the Hugging Face backend.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_BACKEND = 'https://shameless0-0-veriflow-backend.hf.space';
const LOCAL_BACKEND = 'http://localhost:8000';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (isLocal ? LOCAL_BACKEND : PROD_BACKEND);
const API_BASE = `${BACKEND_URL}/api`;


/*
 * Upload documents and trigger forensic analysis.
 * @param {File[]} files - Array of File objects to upload
 * @returns {Promise<Object>} ForensicReport
 */
export async function uploadDocuments(files) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

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
 * Fetch available dataset packets.
 * @returns {Promise<Object>}
 */
export async function getDatasets() {
  const response = await fetch(`${API_BASE}/datasets`);
  if (!response.ok) {
    throw new Error('Failed to fetch datasets');
  }
  return response.json();
}

/**
 * Run analysis on a specific dataset packet.
 * @param {string} packetId
 * @returns {Promise<Object>} ForensicReport
 */
export async function runDatasetDemo(packetId) {
  const response = await fetch(`${API_BASE}/demo/${packetId}`, {
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
  return BACKEND_URL ? `${BACKEND_URL}/heatmaps/${basename}` : `/heatmaps/${basename}`;
}

/**
 * Poll for background offline AI analysis completion.
 * @param {string} packetId 
 * @returns {Promise<Object>}
 */
export async function getAIStatus(packetId) {
  const response = await fetch(`${API_BASE}/ai-status/${packetId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI status');
  }
  return response.json();
}
