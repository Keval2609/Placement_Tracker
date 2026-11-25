export type DateType =
  | "application_deadline"
  | "oa"
  | "interview"
  | "ppt"
  | "result"
  | "joining"
  | "other";

export type DateSource = "ai_suggested" | "user_added";

export interface DetectedDateDraft {
  id: string;
  date_type: DateType;
  label?: string | null;
  date_iso: string | null;
  date_raw?: string | null;
  source: DateSource;
  confirmed_by_user: boolean;
  is_primary_deadline?: boolean;
}

import { ApplicationStatus } from "./drive";

export interface DrivePostingDraft {
  id?: string;
  company_name: string;
  role_title: string;
  eligibility_raw?: string | null;
  job_description?: string | null;
  min_cgpa?: number | null;
  eligible_branches?: string[];
  application_link?: string | null;
  ctc_display?: string | null;
  application_status?: ApplicationStatus;
  is_off_campus?: boolean;
  dates: DetectedDateDraft[];
}

export interface ExtractionAPIResponse {
  postings: {
    company_name: string;
    role_title: string;
    eligibility_raw?: string | null;
    min_cgpa?: number | null;
    eligible_branches?: string[];
    application_link?: string | null;
    ctc_display?: string | null;
    dates: {
      date_type: DateType;
      label?: string | null;
      date_iso: string | null;
      date_raw?: string | null;
    }[];
  }[];
}
