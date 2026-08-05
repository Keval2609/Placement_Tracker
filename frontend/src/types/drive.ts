import { DateType, DetectedDateDraft } from "./extraction";

export type ApplicationStatus =
  | "not_applied"
  | "applied"
  | "oa"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type CompanyType = "product" | "startup" | "service" | "psu" | "unknown";

export type DeadlineWindow = "next_7_days" | "next_30_days" | "all";

export interface ApplicationResponse {
  id: string;
  drive_id: string;
  status: ApplicationStatus;
  applied_at?: string | null;
  notes?: string | null;
  updated_at: string;
}

export interface DriveCard {
  id: string;
  company_id: string;
  company_name: string;
  company_type: CompanyType;
  role_title: string;
  application_id: string;
  application_status: ApplicationStatus;
  applied_at?: string | null;
  primary_deadline_iso: string;
  days_left: number;
  is_overdue: boolean;
  created_at: string;
}

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
  company_type: CompanyType;
  role_title: string;
  eligibility_raw?: string | null;
  min_cgpa?: number | null;
  eligible_branches: string[];
  application_link?: string | null;
  status: string;
  application_status: ApplicationStatus;
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
