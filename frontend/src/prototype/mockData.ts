export interface PrototypeDrive {
  id: string;
  company_name: string;
  role_title: string;
  company_type: "product" | "startup" | "service" | "psu";
  ctc_display: string;
  base_salary?: string;
  location: string;
  days_left: number;
  primary_deadline: string;
  deadline_timestamp: string;
  is_overdue: boolean;
  application_status: "not_applied" | "applied" | "oa" | "interview" | "offer" | "rejected" | "withdrawn";
  min_cgpa: number | null;
  eligible_branches: string[];
  application_link: string;
  rounds: {
    name: string;
    status: "completed" | "current" | "upcoming";
    date?: string;
  }[];
  description: string;
  requirements: string[];
  documents: {
    name: string;
    size: string;
    type: string;
  }[];
  timeline: {
    title: string;
    date: string;
    badge: string;
    notes: string;
    type: "deadline" | "oa" | "interview" | "result" | "info";
  }[];
}

export const PROTOTYPE_DRIVES: PrototypeDrive[] = [
  {
    id: "proto-1",
    company_name: "Google",
    role_title: "Software Development Engineer",
    company_type: "product",
    ctc_display: "₹34.5 LPA",
    base_salary: "₹18 LPA Base + Stocks",
    location: "Bangalore / Hyderabad",
    days_left: 1,
    primary_deadline: "Tomorrow, 11:59 PM",
    deadline_timestamp: "2026-09-09T23:59:59Z",
    is_overdue: false,
    application_status: "applied",
    min_cgpa: 8.0,
    eligible_branches: ["CSE", "IT", "ECE"],
    application_link: "https://careers.google.com/jobs/results/",
    rounds: [
      { name: "Resume Screen", status: "completed", date: "Sep 02" },
      { name: "Online Assessment", status: "current", date: "Sep 12" },
      { name: "Tech Round 1", status: "upcoming" },
      { name: "Tech Round 2", status: "upcoming" },
      { name: "Googlyness & HR", status: "upcoming" },
    ],
    description: "Full-time campus hiring for Software Engineers to design high-throughput distributed systems, algorithms, and core infrastructure.",
    requirements: ["Strong DSA in C++ / Java / Go", "System Design fundamentals", "Zero active backlogs"],
    documents: [
      { name: "Google_Campus_Recruitment_Guide_2026.pdf", size: "2.4 MB", type: "PDF" },
      { name: "OA_Guidelines_HackerRank.pdf", size: "840 KB", type: "PDF" }
    ],
    timeline: [
      { title: "Circular Released", date: "01 Sep 2026", badge: "Notice", notes: "Campus circular posted on Placement Portal by TPO", type: "info" },
      { title: "Application Form Filled", date: "03 Sep 2026", badge: "Applied", notes: "Applied on portal with resume version v3.1", type: "deadline" },
      { title: "Online Coding Test", date: "12 Sep 2026", badge: "OA", notes: "2 LeetCode Medium/Hard algorithmic questions on HackerEarth", type: "oa" }
    ]
  },
  {
    id: "proto-2",
    company_name: "Microsoft",
    role_title: "Software Engineer (Cloud & AI)",
    company_type: "product",
    ctc_display: "₹28.0 LPA",
    base_salary: "₹16 LPA + ₹12L Stocks",
    location: "Hyderabad / Noida",
    days_left: 3,
    primary_deadline: "11 Sep 2026, 6:00 PM",
    deadline_timestamp: "2026-09-11T18:00:00Z",
    is_overdue: false,
    application_status: "oa",
    min_cgpa: 7.5,
    eligible_branches: ["CSE", "IT", "ECE", "EE"],
    application_link: "https://careers.microsoft.com/students",
    rounds: [
      { name: "Registration", status: "completed", date: "Aug 29" },
      { name: "Codility Test", status: "current", date: "Sep 10" },
      { name: "Technical Round", status: "upcoming" },
      { name: "Managerial Round", status: "upcoming" },
    ],
    description: "Hiring for Azure Core Systems, Developer Division, and Microsoft 365 Core Services.",
    requirements: ["Proficiency in C#, C++, or Python", "Understanding of multithreading & networks"],
    documents: [
      { name: "Microsoft_Eligible_Students_List.xlsx", size: "1.1 MB", type: "XLSX" },
      { name: "Sample_Codility_Instructions.pdf", size: "620 KB", type: "PDF" }
    ],
    timeline: [
      { title: "Portal Registration Closes", date: "11 Sep 2026", badge: "Deadline", notes: "Mandatory Superset + MS Careers sign-up", type: "deadline" },
      { title: "Codility OA Scheduled", date: "10 Sep 2026", badge: "Test", notes: "90 min, 3 algorithmic coding challenges", type: "oa" }
    ]
  },
  {
    id: "proto-3",
    company_name: "Goldman Sachs",
    role_title: "Quantitative Technology Analyst",
    company_type: "product",
    ctc_display: "₹26.5 LPA",
    base_salary: "₹17.5 LPA + Performance Bonus",
    location: "Bangalore",
    days_left: 0,
    primary_deadline: "Today, 11:59 PM",
    deadline_timestamp: "2026-09-08T23:59:59Z",
    is_overdue: false,
    application_status: "interview",
    min_cgpa: 8.2,
    eligible_branches: ["CSE", "IT", "Math & Computing"],
    application_link: "https://goldmansachs.tal.net/campus",
    rounds: [
      { name: "Aptitude + Math Test", status: "completed", date: "Aug 26" },
      { name: "Coding Round", status: "completed", date: "Sep 01" },
      { name: "Superday Interviews", status: "current", date: "Sep 08" },
    ],
    description: "Role involves low-latency algorithmic trading systems, quant research modeling, and financial data engineering.",
    requirements: ["Probability & Statistics", "Data Structures & C++", "Problem-solving mindset"],
    documents: [
      { name: "GS_Superday_Shortlist_2026.pdf", size: "430 KB", type: "PDF" }
    ],
    timeline: [
      { title: "Aptitude Round Cleared", date: "26 Aug 2026", badge: "Passed", notes: "Scored in top 5 percentile", type: "oa" },
      { title: "Superday Virtual Interview", date: "08 Sep 2026", badge: "Interview", notes: "3 back-to-back technical & quant rounds", type: "interview" }
    ]
  },
  {
    id: "proto-4",
    company_name: "Uber",
    role_title: "Backend Engineer I",
    company_type: "product",
    ctc_display: "₹38.0 LPA",
    base_salary: "₹22 LPA + ₹16L RSUs",
    location: "Bangalore / Hyderabad",
    days_left: 6,
    primary_deadline: "14 Sep 2026, 11:59 PM",
    deadline_timestamp: "2026-09-14T23:59:59Z",
    is_overdue: false,
    application_status: "not_applied",
    min_cgpa: 7.0,
    eligible_branches: ["CSE", "IT"],
    application_link: "https://uber.com/careers/campus",
    rounds: [
      { name: "Application", status: "current" },
      { name: "Codesignal General Assessment", status: "upcoming" },
      { name: "System Architecture & Coding", status: "upcoming" },
      { name: "Bar Raiser", status: "upcoming" },
    ],
    description: "Scale high-concurrency microservices processing millions of rides and delivery orders in real time.",
    requirements: ["Go / Java / Python", "Database indexing & Redis caching", "REST / gRPC"],
    documents: [
      { name: "Uber_Job_Description_SDE1.pdf", size: "1.8 MB", type: "PDF" }
    ],
    timeline: [
      { title: "Drive Announced", date: "06 Sep 2026", badge: "New Notice", notes: "Shortlisting will be based on CGPA and CodeSignal score", type: "info" }
    ]
  },
  {
    id: "proto-5",
    company_name: "TCS (Digital Cadre)",
    role_title: "Systems Engineer (Digital & Prime)",
    company_type: "service",
    ctc_display: "₹9.0 LPA",
    base_salary: "₹9.0 LPA CTC",
    location: "Pan India",
    days_left: -4,
    primary_deadline: "04 Sep 2026 (Closed)",
    deadline_timestamp: "2026-09-04T18:00:00Z",
    is_overdue: true,
    application_status: "offer",
    min_cgpa: 6.5,
    eligible_branches: ["All Engineering Branches"],
    application_link: "https://nextstep.tcs.com",
    rounds: [
      { name: "NQT Cognitive + Coding", status: "completed", date: "Aug 15" },
      { name: "Technical + Managerial", status: "completed", date: "Aug 28" },
      { name: "HR Fitment", status: "completed", date: "Sep 01" },
    ],
    description: "Specialized digital software engineering unit working on AI, Cloud, and modern enterprise modernization projects.",
    requirements: ["Good communication", "Any OOP language (Java/Python/C++)"],
    documents: [
      { name: "TCS_Offer_Letter_Intent.pdf", size: "510 KB", type: "PDF" }
    ],
    timeline: [
      { title: "TCS NQT Cleared", date: "15 Aug 2026", badge: "Passed", notes: "Selected for Digital track", type: "oa" },
      { title: "Offer Letter Released", date: "04 Sep 2026", badge: "Offer", notes: "Letter of intent received on NextStep portal", type: "result" }
    ]
  },
  {
    id: "proto-6",
    company_name: "Cisco Systems",
    role_title: "Software Engineer - Networking & Security",
    company_type: "product",
    ctc_display: "₹19.5 LPA",
    base_salary: "₹14.5 LPA Base",
    location: "Bangalore",
    days_left: 12,
    primary_deadline: "20 Sep 2026, 5:00 PM",
    deadline_timestamp: "2026-09-20T17:00:00Z",
    is_overdue: false,
    application_status: "applied",
    min_cgpa: 7.5,
    eligible_branches: ["CSE", "IT", "ECE", "Telecom"],
    application_link: "https://jobs.cisco.com/campus",
    rounds: [
      { name: "Resume Selection", status: "completed", date: "Sep 04" },
      { name: "Online Hackathon / Test", status: "current", date: "Sep 18" },
      { name: "Technical Interview 1 & 2", status: "upcoming" },
      { name: "ETR Fitment", status: "upcoming" },
    ],
    description: "Focuses on cloud networking, cybersecurity software, enterprise switching protocols, and SD-WAN.",
    requirements: ["Computer Networks (OSI, TCP/IP)", "Python or C", "Linux basics"],
    documents: [
      { name: "Cisco_Ideathon_Eligibility.pdf", size: "980 KB", type: "PDF" }
    ],
    timeline: [
      { title: "Application Submitted", date: "04 Sep 2026", badge: "Applied", notes: "Applied through college TPO portal", type: "deadline" }
    ]
  }
];

export const SAMPLE_WHATSAPP_NOTICE = `*CAMPUS RECRUITMENT DRIVE 2026 - GOOGLE INDIA*
Dear Final Year B.Tech Students (CSE / IT / ECE),

Google India is visiting our campus for hiring Software Development Engineers (SDE - 1).

*Key Details:*
• *Role:* Software Development Engineer (Full Time)
• *Package (CTC):* 34.50 LPA (18.00 LPA Base + 12L Stocks + Relocation & Benefits)
• *Eligibility Criteria:*
  - B.Tech CSE / IT / ECE
  - Minimum CGPA: 8.00 and above (No active backlogs)
• *Registration Deadline:* 09th September 2026, strictly by 11:59 PM.
• *OA Date:* 12th September 2026 (HackerEarth link will be emailed to registered students).

*Registration Link:* https://forms.gle/GooglePlacement2026Drive
Late submissions will *NOT* be entertained under any circumstances.

Regards,
Training & Placement Officer (TPO)`;
