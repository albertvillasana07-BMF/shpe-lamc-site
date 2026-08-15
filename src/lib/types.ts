export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "pending" | "admin";
  is_owner: boolean;
  created_at: string;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
};

export type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
};

export type SponsorRow = {
  id: string;
  name: string;
  tier: string | null;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
};

export type ScholarshipRow = {
  id: string;
  title: string;
  description: string | null;
  amount: string | null;
  deadline: string | null;
  link: string | null;
  created_at: string;
};
export type MemberRow = {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  created_at: string;
};
export type SponsorInquiryRow = {
  id: string;
  organization: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
};
