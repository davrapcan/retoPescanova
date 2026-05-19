// ─── Generic wrapper ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  meta?: Record<string, unknown>
  todo?: string
}

// ─── MDM ─────────────────────────────────────────────────────────────────────

export interface MDMKpis {
  completed: number
  missing: number
  in_progress: number
  failed: number
  total: number
  completed_pct: number
  missing_pct: number
  in_progress_pct: number
  failed_pct: number
}

export interface MDMOfficeItem {
  office: string
  office_code: string
  completed: number
  missing: number
  in_progress: number
  failed: number
  total: number
}

export type MDMByOffice = MDMOfficeItem[]

export interface MDMPatchItem {
  patch_id: number
  bulletin_id: string
  description: string
  missing_systems: number
  installed_systems: number
  failed_systems: number
  risk_score: number
  total_devices: number
}

export type MDMTopPatches = MDMPatchItem[]

export interface MDMTimelineItem {
  date: string
  installed: number
  delay_in_deployment: number
  reboot_pending: number
  failed: number
}

export type MDMTimeline = MDMTimelineItem[]

export interface MDMBanner {
  severity: 'ok' | 'warning' | 'critical'
  title: string
  description: string
  failed_count: number
  missing_count: number
  top_office: string | null
}

// ─── Training ─────────────────────────────────────────────────────────────────

export interface TrainingKpis {
  total_users: number
  total_countries: number
  total_modules: number
  completion_rate: number
  completion_rate_delta: number | null
  avg_score_pct: number
  avg_duration_min: number
  avg_duration_delta: number | null
}

export interface TrainingCountryItem {
  location: string
  location_iso: string
  user_count: number
  completion_rate: number
  avg_score_pct: number
  below_threshold: boolean
}

export type TrainingByCountry = TrainingCountryItem[]

export interface TrainingTimelineItem {
  month: string
  completion_rate: number
  avg_score_pct: number
  avg_duration_min: number
}

export type TrainingTimeline = TrainingTimelineItem[]

export interface TrainingFrictionCell {
  module_name: string
  location: string
  location_iso: string
  friction_score: number | null
  avg_duration_min: number
  incomplete_rate: number
  user_count: number
  low_sample: boolean
}

export interface TrainingFriction {
  cells: TrainingFrictionCell[]
  modules: string[]
  countries: string[]
  p95_duration_global: number
}

export interface TrainingDistributionItem {
  bin_start: number
  bin_end: number
  count: number
  label: string
}

export type TrainingDistribution = TrainingDistributionItem[]

export interface TrainingOutlierItem {
  user_id: string
  location: string
  total_duration_min: number
  score_pct: number
  severity: 'critical' | 'warning'
}

export type TrainingOutliers = TrainingOutlierItem[]

export interface TrainingBanner {
  severity: 'ok' | 'warning' | 'critical'
  title: string
  description: string
  countries_below_threshold: number
  top_friction_module: string | null
  global_completion_rate: number
}
