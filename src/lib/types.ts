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
  image_url: string | null;
  bg_color: string | null;
};

export type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  category: string | null;
  folder_id: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
};

export type ResourceFolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
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
  deadline: string | null;
  link: string | null;
  created_at: string;
  amount: string | null;
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

export type SiteSettings = {
  id: number;
  chapter_email: string | null;
  instagram_handle: string | null;
  location: string | null;
  hero_subtitle: string | null;
  about_us: string | null;
  hero_image_url: string | null;
  join_image_url: string | null;
};

export type BoardMemberRow = {
  id: string;
  full_name: string;
  role: string | null;
  about_me: string | null;
  headshot_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
  created_at: string;
};

export type HomeHighlightRow = {
  id: string;
  title: string;
  body: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
};

export type SlideshowPhotoRow = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};