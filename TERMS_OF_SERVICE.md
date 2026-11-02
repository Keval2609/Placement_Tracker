# Terms of Service

**Last Updated:** November 2, 2026  
**Effective Date:** November 2, 2026  

Welcome to **DriveTrack** ("Placement Tracker", "we", "us", or "our"), available at [drivetrack.page](https://www.drivetrack.page). By accessing, registering for, or using our web application, Application Programming Interfaces (APIs), Progressive Web Application (PWA) client, or associated services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms").

If you do not agree to these Terms, please do not use the Service.

---

## 1. Acceptance & Eligibility

1.1. **Eligibility**: You must be at least 16 years of age or a enrolled college/university student or job seeker to use DriveTrack. By using the Service, you represent and warrant that you meet these eligibility requirements.

1.2. **Account Registration**: Access to authenticated tracking features requires creating an account via our identity provider (**Clerk**). You agree to provide accurate, current, and complete registration information and to maintain the security of your account credentials. You are solely responsible for all activities that occur under your account.

---

## 2. Description of the Service

2.1. **Purpose**: DriveTrack is a personal placement and recruitment productivity tool designed to help students and job seekers track campus placement circulars, recruitment milestones, off-campus applications, and scheduled deadlines.

2.2. **Dual-Track Ingestion**:
* **Campus Drives**: Users may submit unstructured campus placement announcements (such as text notices, WhatsApp messages, or `.pdf`/`.docx` circulars) for automated extraction into structured drafts via Large Language Model (LLM) inference.
* **Off-Campus Applications**: Users may manually log direct recruitment applications without AI processing.

2.3. **Notification Channels**: The Service provides deadline alert evaluation and notification dispatch through Web Push (VAPID) and optional fallback escalation via the Telegram Bot API.

---

## 3. Human-in-the-Loop Trust Gate & Disclaimer of Accuracy

3.1. **AI Output is Advisory**: All dates, cutoffs (CGPA), eligible branches, compensation packages (CTC), and milestones generated via automated LLM parsing are algorithmic suggestions intended solely as convenience drafts.

3.2. **User Responsibility for Verification**:
* DriveTrack enforces a **Human-in-the-Loop Verification Gate** requiring you to confirm or adjust extracted information before it is persisted to your active tracker.
* **You bear sole and ultimate responsibility for verifying all dates, interview schedules, test links, and eligibility criteria directly with your college Training & Placement (T&P) cell, university administrators, and hiring companies.**
* We do not warrant or guarantee that AI-extracted text is error-free, timely, or exhaustive.

---

## 4. Non-Affiliation Disclaimer

4.1. **Independent Product**: DriveTrack is an independent software project. It is **not** affiliated with, endorsed by, sponsored by, or partner to any academic institution, university training and placement cell, or any hiring enterprise (including, but not limited to, entities referenced in mock demonstrations such as Google, Microsoft, Goldman Sachs, Uber, Cisco, or others).

4.2. **Trademark Notice**: All product names, logos, brands, and registered trademarks displayed in the Service or demo showcase belong to their respective owners. Their inclusion is solely for identification and portfolio demonstration purposes and does not imply endorsement or partnership.

---

## 5. User Conduct & Acceptable Use

You agree not to use the Service to:
1. Reverse engineer, decompile, disable, or attempt to circumvent security mechanisms, access controls, or Row-Level Security (RLS) tenant isolation policies in the database;
2. Upload notices, documents, or content containing malicious software, viruses, or illegal material;
3. Probe, scan, or test the vulnerability of the system or network without explicit written authorization;
4. Interfere with or disrupt the normal operation of our servers, APIs, or notification schedulers;
5. Create duplicate accounts to spam or manipulate service quotas.

---

## 6. Service Availability & Notification Reliability

6.1. **Best-Effort Delivery**: Deadline alerts (Web Push notifications and Telegram messages) are provided on a best-effort basis. Timely delivery depends on network connectivity, browser service worker lifecycles, and third-party operating system power managers (e.g., aggressive OEM background task termination on mobile devices).

6.2. **No Guarantee of Delivery**: DriveTrack and its developers shall not be liable for missed recruitment deadlines, disqualified applications, or lost employment opportunities resulting from suppressed notifications or network interruptions.

---

## 7. Intellectual Property & Open Source

7.1. **Open Source Core**: The underlying application codebase is licensed under the **Apache 2.0 License**.

7.2. **User Data Ownership**: You retain all rights and ownership to the personal notes, application statuses, and documents you upload to DriveTrack. We claim no ownership over your career data.

---

## 8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DRIVETRACK, ITS MAINTAINERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, GOODWILL, OR CAREER OPPORTUNITIES ARISING FROM OR RELATED TO:
* YOUR ACCESS TO OR INABILITY TO ACCESS THE SERVICE;
* ANY ERRORS, INACCURACIES, OR OMISSIONS IN AI-PARSED DATA;
* DELAYED OR UNDELIVERED NOTIFICATIONS OR ALERTS;
* ANY UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR CONTENT.

THE SERVICE IS PROVIDED ON AN **"AS IS"** AND **"AS AVAILABLE"** BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED.

---

## 9. Account Termination & Data Deletion

You may stop using the Service at any time. You may request account deletion or delete individual drive entries directly through the application. Upon account deletion, your personal application records will be removed in accordance with our [Privacy Policy](/privacy-policy).

We reserve the right to suspend or terminate accounts that violate these Terms or threaten the security and integrity of the platform.

---

## 10. Modifications to Terms

We may update these Terms from time to time. When changes occur, we will update the "Last Updated" date at the top of this page. Your continued use of the Service following any revisions constitutes your acceptance of the new Terms.

---

## 11. Contact Us

If you have questions, feedback, or concerns regarding these Terms of Service, please reach out to us at:
* **Project Repository**: [GitHub Issues](https://github.com/Keval2609/Placement_Tracker/issues)  
* **Website**: [drivetrack.page](https://www.drivetrack.page)
