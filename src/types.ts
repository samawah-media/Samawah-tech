export type ProjectStatus = 'draft' | 'published' | 'archived';

export interface ProjectCard {
  id: string;
  slug: string;
  title_ar: string;
  subtitle_ar: string;
  short_description_ar: string;
  project_url: string;
  cover_image_url: string;
  logo_url?: string;
  accent_color: string;
  tags: string[];
  category: string;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: number;
  status: ProjectStatus;
  ai_image_prompt?: string;
  screenshot_source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ShowcaseLink {
  id: string;
  slug: string;
  title_ar: string;
  description_ar: string;
  project_ids: string[];
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}
