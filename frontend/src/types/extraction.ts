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
  date_iso: string;
  date_raw: string;
  source: DateSource;
  confirmed_by_user: boolean;
}

export interface DrivePostingDraft {
  id: string;
  company_name: string;
  role_title: string;
  eligibility_raw?: string | null;
  min_cgpa?: number | null;
  eligible_branches: string[];
  application_link?: string | null;
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
    dates: {
      date_type: DateType;
      label?: string | null;
      date_iso: string;
      date_raw: string;
    }[];
  }[];
}
