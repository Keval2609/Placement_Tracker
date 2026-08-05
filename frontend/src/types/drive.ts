import { DateType, DetectedDateDraft } from "./extraction";

export interface DriveDateSaved {
  id: string;
  date_type: DateType;
  label?: string | null;
  date_iso: string;
  date_raw?: string | null;
  source: "ai_suggested" | "user_added";
  confirmed_by_user: boolean;
  is_primary_deadline: boolean;
}

export interface DriveDetail {
  id: string;
  company_id: string;
  company_name: string;
  company_type: "product" | "startup" | "service" | "psu" | "unknown";
  role_title: string;
  eligibility_raw?: string | null;
  min_cgpa?: number | null;
  eligible_branches: string[];
  application_link?: string | null;
  status: string;
  application_status:
    | "not_applied"
    | "applied"
    | "oa"
    | "interview"
    | "offer"
    | "rejected"
    | "withdrawn";
  created_at: string;
  dates: DriveDateSaved[];
}

export interface TimelineEvent {
  id: string;
  event_type: "initial_capture" | "update";
  source_type: "whatsapp_text" | "pdf" | "docx";
  summary_of_changes: string;
  raw_text?: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  drive_id: string;
  drive_update_id?: string | null;
  original_filename: string;
  storage_path: string;
  uploaded_at: string;
  download_url: string;
  update_summary?: string | null;
}

export interface DriveUpdateDraft {
  update_id: string;
  drive_id: string;
  update_result: {
    new_dates: DetectedDateDraft[];
    field_changes: Record<string, unknown>;
    summary_of_changes: string;
  };
  raw_text?: string | null;
  source_type: "whatsapp_text" | "pdf" | "docx";
}

export interface ConfirmUpdatePayload {
  confirmed_new_dates: DetectedDateDraft[];
  confirmed_field_changes: Record<string, unknown>;
  summary_of_changes?: string;
  raw_text?: string;
  source_type: "whatsapp_text" | "pdf" | "docx";
}

export interface ConfirmUpdateResponse {
  update_id: string;
  drive_id: string;
  summary_of_changes: string;
  added_dates_count: number;
  updated_fields_count: number;
}
