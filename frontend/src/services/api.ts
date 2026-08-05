import { ExtractionAPIResponse } from "../types/extraction";
import {
  ApplicationResponse,
  ApplicationStatus,
  ConfirmUpdatePayload,
  ConfirmUpdateResponse,
  DocumentItem,
  DriveCard,
  DriveDetail,
  DriveUpdateDraft,
  TimelineEvent,
} from "../types/drive";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function ingestText(text: string): Promise<ExtractionAPIResponse> {
  const response = await fetch(`${API_BASE_URL}/ingest/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status})`);
  }

  return response.json();
}

export async function ingestFile(file: File): Promise<ExtractionAPIResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/ingest/file`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status})`);
  }

  return response.json();
}

export async function fetchDashboardDrives(): Promise<DriveCard[]> {
  const response = await fetch(`${API_BASE_URL}/drives`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed fetching drives (${response.status})`);
  }
  const data = await response.json();
  return data.drives || [];
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  notes?: string
): Promise<ApplicationResponse> {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed updating status (${response.status})`);
  }

  return response.json();
}

export async function fetchDriveDetail(id: string): Promise<DriveDetail> {
  const response = await fetch(`${API_BASE_URL}/drives/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Drive not found (${response.status})`);
  }
  return response.json();
}

export async function fetchDriveTimeline(id: string): Promise<TimelineEvent[]> {
  const response = await fetch(`${API_BASE_URL}/drives/${id}/timeline`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed fetching timeline (${response.status})`);
  }
  const data = await response.json();
  return data.timeline || [];
}

export async function fetchDriveDocuments(id: string): Promise<DocumentItem[]> {
  const response = await fetch(`${API_BASE_URL}/drives/${id}/documents`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed fetching documents (${response.status})`);
  }
  const data = await response.json();

  // Prepend backend base URL if download_url is relative
  return (data.documents || []).map((doc: DocumentItem) => ({
    ...doc,
    download_url: doc.download_url.startsWith("http")
      ? doc.download_url
      : `${API_BASE_URL}${doc.download_url}`,
  }));
}

export async function proposeDriveUpdateText(
  id: string,
  text: string
): Promise<DriveUpdateDraft> {
  const response = await fetch(`${API_BASE_URL}/drives/${id}/updates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed extracting update (${response.status})`);
  }

  return response.json();
}

export async function proposeDriveUpdateFile(
  id: string,
  file: File,
  text?: string
): Promise<DriveUpdateDraft> {
  const formData = new FormData();
  formData.append("file", file);
  if (text) {
    formData.append("text", text);
  }

  const response = await fetch(`${API_BASE_URL}/drives/${id}/updates`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed extracting update file (${response.status})`);
  }

  return response.json();
}

export async function confirmDriveUpdate(
  id: string,
  updateId: string,
  payload: ConfirmUpdatePayload
): Promise<ConfirmUpdateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/drives/${id}/updates/${updateId}/confirm`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed confirming update (${response.status})`);
  }

  return response.json();
}
