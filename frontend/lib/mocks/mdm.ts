import type { MDMBanner, MDMByOffice, MDMKpis, MDMTimeline, MDMTopPatches } from '@/lib/types'

export const mockMDMKpis: MDMKpis = {
  completed: 360,
  missing: 55,
  in_progress: 12,
  failed: 6,
  total: 433,
  completed_pct: 83.1,
  missing_pct: 12.7,
  in_progress_pct: 2.8,
  failed_pct: 1.4,
}

export const mockMDMByOffice: MDMByOffice = [
  { office: 'VG España - Chapela',     office_code: 'GLE', completed: 50, missing: 7, in_progress: 4, failed: 2, total: 63 },
  { office: 'VG España - Vigo',        office_code: 'VIG', completed: 43, missing: 6, in_progress: 1, failed: 1, total: 51 },
  { office: 'VG España - Porriño',     office_code: 'TSV', completed: 45, missing: 7, in_progress: 2, failed: 1, total: 55 },
  { office: 'VG España - Arteixo',     office_code: 'EVX', completed: 42, missing: 6, in_progress: 2, failed: 1, total: 51 },
  { office: 'VG España - Coruña',      office_code: 'COR', completed: 33, missing: 6, in_progress: 0, failed: 0, total: 39 },
  { office: 'VG España - Boiro',       office_code: 'BSZ', completed: 38, missing: 6, in_progress: 2, failed: 0, total: 46 },
  { office: 'VG España - Carballo',    office_code: 'GEX', completed: 35, missing: 5, in_progress: 1, failed: 1, total: 42 },
  { office: 'VG España - Santiago',    office_code: 'SAN', completed: 31, missing: 5, in_progress: 0, failed: 0, total: 36 },
  { office: 'VG España - Pontevedra',  office_code: 'PON', completed: 22, missing: 5, in_progress: 0, failed: 0, total: 27 },
  { office: 'VG España - Lugo',        office_code: 'LUG', completed: 21, missing: 2, in_progress: 0, failed: 0, total: 23 },
]

export const mockMDMTopPatches: MDMTopPatches = [
  {
    patch_id: 1052,
    bulletin_id: 'MS26-052',
    description: 'Windows kernel elevation of privilege (CVE-2026-29331)',
    missing_systems: 61,
    installed_systems: 364,
    failed_systems: 8,
    risk_score: 77,
    total_devices: 433,
  },
  {
    patch_id: 1049,
    bulletin_id: 'MS26-049',
    description: 'LDAP remote code execution (CVE-2026-28241)',
    missing_systems: 55,
    installed_systems: 378,
    failed_systems: 0,
    risk_score: 55,
    total_devices: 433,
  },
  {
    patch_id: 1051,
    bulletin_id: 'MS26-051',
    description: 'SMB Server denial of service (CVE-2026-27841)',
    missing_systems: 43,
    installed_systems: 384,
    failed_systems: 3,
    risk_score: 49,
    total_devices: 433,
  },
  {
    patch_id: 1047,
    bulletin_id: 'MS26-047',
    description: 'Windows DNS client memory corruption (CVE-2026-24901)',
    missing_systems: 38,
    installed_systems: 394,
    failed_systems: 1,
    risk_score: 40,
    total_devices: 433,
  },
  {
    patch_id: 1044,
    bulletin_id: 'MS26-044',
    description: 'Windows Defender definition bypass (CVE-2026-22181)',
    missing_systems: 32,
    installed_systems: 401,
    failed_systems: 0,
    risk_score: 32,
    total_devices: 433,
  },
]

export const mockMDMTimeline: MDMTimeline = [
  { date: '2026-05-11', installed: 72,  delay_in_deployment: 8,  reboot_pending: 0, failed: 1 },
  { date: '2026-05-12', installed: 80,  delay_in_deployment: 9,  reboot_pending: 1, failed: 1 },
  { date: '2026-05-13', installed: 85,  delay_in_deployment: 7,  reboot_pending: 0, failed: 1 },
  { date: '2026-05-14', installed: 78,  delay_in_deployment: 6,  reboot_pending: 0, failed: 0 },
  { date: '2026-05-15', installed: 60,  delay_in_deployment: 5,  reboot_pending: 0, failed: 1 },
  { date: '2026-05-16', installed: 82,  delay_in_deployment: 8,  reboot_pending: 1, failed: 2 },
  { date: '2026-05-17', installed: 73,  delay_in_deployment: 9,  reboot_pending: 1, failed: 1 },
  { date: '2026-05-18', installed: 56,  delay_in_deployment: 6,  reboot_pending: 0, failed: 1 },
]

export const mockMDMBanner: MDMBanner = {
  severity: 'critical',
  title: '6 equipos con parches fallidos · concentrado en Chapela (GLE)',
  description: '1,4 % del parque con estado Failed · acción inmediata recomendada',
  failed_count: 6,
  missing_count: 55,
  top_office: 'VG España - Chapela (GLE)',
}
