# Privacy Policy

**Last Updated:** November 2, 2026  
**Effective Date:** November 2, 2026  

At **DriveTrack** ("Placement Tracker", "we", "us", or "our"), available at [drivetrack.page](https://www.drivetrack.page), we believe privacy is a fundamental student right. This Privacy Policy outlines how we collect, process, store, and safeguard your personal information when you use our web application, APIs, and notification services.

**Our Core Privacy Principle:** We do NOT sell, rent, or trade your personal information, resumes, or job application histories to advertisers, recruiters, or data brokers.

---

## 1. Information We Collect

### A. Account & Identity Information
When you register for an account using **Clerk**, we receive standard identity information, including:
* Your unique user ID (Clerk Subject identifier `sub`);
* Your primary email address;
* Your display name and profile picture (if provided through your authentication provider).

### B. Placement Drives & Application Records
When you interact with the Service, you provide:
* **Hiring Details**: Company names, role titles, full-text job descriptions, CTC/salary packages, and application portal URLs;
* **Eligibility Criteria**: Minimum CGPA requirements and eligible degree branches (e.g., Computer Science, Electrical Engineering);
* **Important Milestones**: Application deadlines, Online Assessment (OA) dates, interview rounds, and presentation schedules;
* **Funnel Pipeline State**: Your personal progress status (`not_applied`, `applied`, `oa`, `interview`, `offer`, `rejected`, or `withdrawn`), application timestamps, and personal interview notes.

### C. Notice Documents & Announcements
* Unstructured notice text submitted for parsing (e.g. copied from college WhatsApp groups or emails);
* Uploaded circular documents (`.pdf` or `.docx` files, up to 10MB) parsed using server-side document readers.

### D. Device, Notification & Communication Identifiers
* **Web Push Subscriptions**: VAPID browser push endpoints and cryptographic keys used solely to transmit deadline reminders to your browser;
* **Telegram Integration**: Optional Telegram Chat ID linked to your account to escalate urgent deadlines if push notifications go unacknowledged.

### E. Diagnostic & Technical Data
* Anonymized operational logs and error diagnostics (via **Sentry**) to identify crashes and system performance degradation;
* Standard HTTP request headers (IP address, browser user-agent) necessary for security rate-limiting and session management.

---

## 2. How We Use Your Information

We process your data strictly to provide and maintain the Service:
1. **Notice Parsing & Extraction**: Transforming unstructured notices into structured deadline and criteria drafts using AI inference;
2. **Personal Recruitment Tracking**: Managing your personal Kanban pipeline and executive dashboard;
3. **Automated Deadline Alerts**: Evaluating upcoming deadlines at 48-hour, 24-hour, and 6-hour windows in Indian Standard Time (IST) and delivering alerts to your configured devices;
4. **Security & Tenant Isolation**: Verifying cryptographically signed JSON Web Tokens (JWT) to ensure only you can access your private job records.

---

## 3. AI Processing & Model Privacy

3.1. **Inference Providers**: AI extraction is executed via:
* Cloud LPU inference powered by **Groq** (`llama-3.3-70b-versatile`); or
* Self-hosted local inference powered by **Ollama** (`llama3:8b`).

3.2. **Data Minimization in Prompts**:
* Notice text sent to the LLM is processed transiently with strict JSON schema instructions to extract hiring parameters (dates, eligibility, company name, role).
* **No Foundation Model Training**: Notice text and document content sent through the extraction pipeline are **never used to train, retrain, or fine-tune public foundation AI models**.

---

## 4. Data Storage & Database Row-Level Security (RLS)

4.1. **Tenant Isolation**: Your data is stored in **Supabase PostgreSQL**. We enforce PostgreSQL **Row-Level Security (RLS)** at the database kernel level:
* Every database read, write, update, and delete operation is bound to the requesting user's verified Clerk ID via a custom `requesting_user_id()` function.
* **No cross-tenant data access**: Other users or students cannot query, view, or modify your application entries, notes, or uploaded notices.

4.2. **Encryption**: All data in transit between your browser, our API servers, Supabase, and Clerk is encrypted using industry-standard **TLS 1.3 / HTTPS**. Database disks and automated backups are encrypted at rest.

---

## 5. Third-Party Service Providers

We utilize trusted third-party infrastructure providers to support the Service:

| Provider | Purpose | Privacy Reference |
| :--- | :--- | :--- |
| **Clerk** | Authentication, user accounts, and session tokens | [Clerk Privacy Policy](https://clerk.com/privacy) |
| **Supabase** | PostgreSQL database hosting, Storage & RLS | [Supabase Privacy Policy](https://supabase.com/privacy) |
| **Groq** | Fast cloud LPU inference for schema-constrained notice parsing | [Groq Privacy Policy](https://groq.com/privacy-policy) |
| **Telegram Bot API** | Optional secondary alert channel for deadline escalation | [Telegram Privacy Policy](https://telegram.org/privacy) |
| **Sentry** | Frontend error tracking and crash reporting | [Sentry Privacy Policy](https://sentry.io/privacy) |
| **Vercel / Render** | Web frontend and backend cloud hosting | [Vercel Privacy](https://vercel.com/legal/privacy-policy) / [Render Privacy](https://render.com/privacy) |

---

## 6. Cookies & Local Storage

* **Local Storage (`localStorage`)**: We store your selected visual theme preference (`theme: "dark"` or `"light"`) and prototype interactive showcase state on your device.
* **Essential Authentication Cookies**: Handled directly by Clerk to keep you securely signed in.
* **No Advertising or Behavioral Trackers**: We do not use third-party advertising cookies, retargeting pixels, or commercial tracking scripts.

---

## 7. Data Retention & Your Rights

7.1. **Retention Period**: We retain your drive tracking records and application statuses for as long as your account remains active, or until you manually remove them.

7.2. **Your Rights**: Under applicable data protection regulations (including GDPR, CCPA, and India's Digital Personal Data Protection Act):
* **Right of Access & Portability**: You may view all your tracked drives directly in your dashboard or export them via the API;
* **Right to Rectification**: You can edit company names, roles, deadlines, and notes at any time;
* **Right to Erasure**: You can delete individual drives or request full account deletion, resulting in permanent removal of your records from our primary database.

---

## 8. Children's Privacy

The Service is intended for university students, college attendees, and adult job seekers. We do not knowingly collect personal information from individuals under the age of 16. If we become aware that a child under 16 has provided personal data, we will promptly delete such information.

---

## 9. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect operational, legal, or technical changes. We encourage you to review this page periodically. The "Last Updated" date at the top of the policy indicates when revisions were made.

---

## 10. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or how your personal information is handled, please contact us at:
* **Project Repository**: [GitHub Issues](https://github.com/Keval2609/Placement_Tracker/issues)  
* **Website**: [drivetrack.page](https://www.drivetrack.page)
