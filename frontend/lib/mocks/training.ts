import type {
  TrainingBanner,
  TrainingByCountry,
  TrainingDistribution,
  TrainingFriction,
  TrainingKpis,
  TrainingOutliers,
  TrainingTimeline,
} from '@/lib/types'

export const mockTrainingKpis: TrainingKpis = {
  total_users: 1230,
  total_countries: 17,
  total_modules: 23,
  completion_rate: 0.623,
  completion_rate_delta: 0.032,
  avg_score_pct: 20.8,
  avg_duration_min: 4.2,
  avg_duration_delta: -0.5,
}

export const mockTrainingBanner: TrainingBanner = {
  severity: 'warning',
  title: '3 países por debajo del umbral · Phishing avanzado con más fricción',
  description:
    'Nicaragua (8%), Namibia (10%) y Mozambique (9%) con score < 15%. Tasa global de finalización: 62%.',
  countries_below_threshold: 3,
  top_friction_module: 'Phishing avanzado',
  global_completion_rate: 0.623,
}

export const mockTrainingByCountry: TrainingByCountry = [
  { location: 'España',         location_iso: 'ES', user_count: 370, completion_rate: 0.72, avg_score_pct: 22.1, below_threshold: false },
  { location: 'Ecuador',        location_iso: 'EC', user_count: 311, completion_rate: 0.65, avg_score_pct: 18.4, below_threshold: false },
  { location: 'Nicaragua',      location_iso: 'NI', user_count: 165, completion_rate: 0.42, avg_score_pct: 8.2,  below_threshold: true  },
  { location: 'Francia',        location_iso: 'FR', user_count: 81,  completion_rate: 0.78, avg_score_pct: 28.3, below_threshold: false },
  { location: 'Argentina',      location_iso: 'AR', user_count: 54,  completion_rate: 0.55, avg_score_pct: 12.5, below_threshold: true  },
  { location: 'Guatemala',      location_iso: 'GT', user_count: 48,  completion_rate: 0.68, avg_score_pct: 23.7, below_threshold: false },
  { location: 'Portugal',       location_iso: 'PT', user_count: 38,  completion_rate: 0.82, avg_score_pct: 31.2, below_threshold: false },
  { location: 'Grecia',         location_iso: 'GR', user_count: 32,  completion_rate: 0.70, avg_score_pct: 19.1, below_threshold: false },
  { location: 'Perú',           location_iso: 'PE', user_count: 28,  completion_rate: 0.61, avg_score_pct: 16.4, below_threshold: false },
  { location: 'Italia',         location_iso: 'IT', user_count: 26,  completion_rate: 0.75, avg_score_pct: 26.8, below_threshold: false },
  { location: 'Namibia',        location_iso: 'NA', user_count: 22,  completion_rate: 0.48, avg_score_pct: 10.1, below_threshold: true  },
  { location: 'Angola',         location_iso: 'AO', user_count: 18,  completion_rate: 0.60, avg_score_pct: 15.3, below_threshold: false },
  { location: 'Irlanda',        location_iso: 'IE', user_count: 16,  completion_rate: 0.88, avg_score_pct: 42.1, below_threshold: false },
  { location: 'Sudáfrica',      location_iso: 'ZA', user_count: 14,  completion_rate: 0.52, avg_score_pct: 11.4, below_threshold: true  },
  { location: 'Mozambique',     location_iso: 'MZ', user_count: 12,  completion_rate: 0.45, avg_score_pct: 9.3,  below_threshold: true  },
  { location: 'Estados Unidos', location_iso: 'US', user_count: 8,   completion_rate: 0.90, avg_score_pct: 48.2, below_threshold: false },
  { location: 'Colombia',       location_iso: 'CO', user_count: 6,   completion_rate: 0.67, avg_score_pct: 17.8, below_threshold: false },
]

export const mockTrainingTimeline: TrainingTimeline = [
  { month: 'Dic',  completion_rate: 0.580, avg_score_pct: 18.2, avg_duration_min: 4.8 },
  { month: 'Ene',  completion_rate: 0.592, avg_score_pct: 19.0, avg_duration_min: 4.5 },
  { month: 'Feb',  completion_rate: 0.605, avg_score_pct: 19.8, avg_duration_min: 4.3 },
  { month: 'Mar',  completion_rate: 0.601, avg_score_pct: 20.4, avg_duration_min: 4.2 },
  { month: 'Abr',  completion_rate: 0.617, avg_score_pct: 20.9, avg_duration_min: 4.1 },
  { month: 'May',  completion_rate: 0.623, avg_score_pct: 20.8, avg_duration_min: 4.2 },
]

// Friction cells: top 8 modules × top 8 countries by volume
const MODULES = [
  'Phishing avanzado',
  'Ingeniería social',
  'Contraseñas seguras',
  'Malware y ransomware',
  'Seg. dispositivos móviles',
  'Protección de datos',
  'Redes seguras (VPN)',
  'Navegación segura',
]

const COUNTRIES_ISO = ['ES', 'EC', 'NI', 'FR', 'AR', 'GT', 'PT', 'GR']
const COUNTRIES_NAME: Record<string, string> = {
  ES: 'España', EC: 'Ecuador', NI: 'Nicaragua', FR: 'Francia',
  AR: 'Argentina', GT: 'Guatemala', PT: 'Portugal', GR: 'Grecia',
}

// friction_score per [module][country]
const FRICTION_MATRIX: number[][] = [
  // ES     EC     NI     FR     AR     GT     PT     GR
  [56.2,  61.4,  82.3,  42.1,  67.8,  55.3,  38.4,  44.7],  // Phishing avanzado
  [48.3,  52.1,  73.5,  35.8,  58.9,  46.2,  31.5,  40.1],  // Ingeniería social
  [35.7,  42.8,  65.2,  28.3,  51.4,  38.9,  25.6,  33.2],  // Contraseñas seguras
  [41.2,  45.3,  68.9,  33.7,  54.6,  42.1,  28.4,  36.8],  // Malware y ransomware
  [38.6,  40.1,  62.4,  30.2,  49.8,  35.7,  24.1,  32.5],  // Seg. dispositivos móviles
  [32.4,  35.8,  55.7,  26.9,  45.2,  32.1,  21.8,  28.4],  // Protección de datos
  [28.7,  33.2,  51.3,  23.4,  41.6,  29.8,  18.2,  25.6],  // Redes seguras
  [25.1,  30.4,  47.8,  19.8,  38.2,  26.5,  15.3,  22.1],  // Navegación segura
]

// duration avg [module][country] in minutes
const DURATION_MATRIX: number[][] = [
  [8.4, 9.1, 12.0, 6.2, 10.3, 7.8, 5.4, 6.6],
  [7.1, 7.8, 10.5, 5.3, 8.9,  6.5, 4.6, 5.8],
  [5.3, 6.4, 9.2,  4.2, 7.6,  5.8, 3.8, 5.1],
  [6.1, 6.7, 10.1, 5.0, 8.1,  6.2, 4.2, 5.4],
  [5.7, 5.9, 9.0,  4.5, 7.3,  5.3, 3.6, 4.8],
  [4.8, 5.3, 8.1,  4.0, 6.7,  4.8, 3.2, 4.2],
  [4.2, 4.9, 7.4,  3.5, 6.1,  4.4, 2.7, 3.8],
  [3.7, 4.5, 6.9,  2.9, 5.6,  3.9, 2.3, 3.3],
]

// incomplete_rate [module][country]
const INCOMPLETE_MATRIX: number[][] = [
  [0.40, 0.46, 0.70, 0.30, 0.55, 0.39, 0.24, 0.32],
  [0.34, 0.38, 0.62, 0.24, 0.47, 0.32, 0.20, 0.28],
  [0.24, 0.30, 0.53, 0.18, 0.39, 0.26, 0.15, 0.22],
  [0.29, 0.32, 0.57, 0.22, 0.43, 0.29, 0.18, 0.25],
  [0.26, 0.28, 0.51, 0.20, 0.37, 0.24, 0.15, 0.22],
  [0.22, 0.25, 0.45, 0.17, 0.33, 0.22, 0.13, 0.19],
  [0.19, 0.23, 0.41, 0.15, 0.30, 0.20, 0.11, 0.17],
  [0.17, 0.21, 0.37, 0.13, 0.27, 0.18, 0.09, 0.15],
]

// user_count [module][country]
const USER_COUNT_MATRIX: number[][] = [
  [68, 55, 32, 14, 10, 8,  6,  5 ],
  [62, 51, 29, 12, 9,  7,  5,  4 ],
  [70, 58, 34, 15, 11, 9,  7,  6 ],
  [65, 52, 30, 13, 10, 8,  5,  5 ],
  [58, 48, 27, 11, 8,  7,  4,  4 ],
  [72, 60, 35, 16, 12, 9,  6,  5 ],
  [60, 50, 28, 12, 9,  7,  5,  4 ],
  [75, 62, 36, 17, 13, 10, 7,  6 ],
]

function buildFrictionCells() {
  const cells = []
  for (let m = 0; m < MODULES.length; m++) {
    for (let c = 0; c < COUNTRIES_ISO.length; c++) {
      const iso = COUNTRIES_ISO[c]
      const count = USER_COUNT_MATRIX[m][c]
      cells.push({
        module_name: MODULES[m],
        location: COUNTRIES_NAME[iso],
        location_iso: iso,
        friction_score: FRICTION_MATRIX[m][c],
        avg_duration_min: DURATION_MATRIX[m][c],
        incomplete_rate: INCOMPLETE_MATRIX[m][c],
        user_count: count,
        low_sample: count < 5,
      })
    }
  }
  return cells
}

export const mockTrainingFriction: TrainingFriction = {
  cells: buildFrictionCells(),
  modules: MODULES,
  countries: COUNTRIES_ISO,
  p95_duration_global: 13,
}

export const mockTrainingDistribution: TrainingDistribution = [
  { bin_start: 0,  bin_end: 10,  count: 420, label: '0–10%'   },
  { bin_start: 10, bin_end: 20,  count: 320, label: '10–20%'  },
  { bin_start: 20, bin_end: 30,  count: 160, label: '20–30%'  },
  { bin_start: 30, bin_end: 40,  count: 110, label: '30–40%'  },
  { bin_start: 40, bin_end: 50,  count: 80,  label: '40–50%'  },
  { bin_start: 50, bin_end: 60,  count: 60,  label: '50–60%'  },
  { bin_start: 60, bin_end: 70,  count: 38,  label: '60–70%'  },
  { bin_start: 70, bin_end: 80,  count: 20,  label: '70–80%'  },
  { bin_start: 80, bin_end: 90,  count: 14,  label: '80–90%'  },
  { bin_start: 90, bin_end: 100, count: 8,   label: '90–100%' },
]

export const mockTrainingOutliers: TrainingOutliers = [
  { user_id: 'USR-04821', location: 'Nicaragua',  total_duration_min: 112, score_pct: 8.2,  severity: 'critical' },
  { user_id: 'USR-11203', location: 'Argentina',  total_duration_min: 98,  score_pct: 12.5, severity: 'critical' },
  { user_id: 'USR-07634', location: 'Ecuador',    total_duration_min: 87,  score_pct: 21.4, severity: 'warning'  },
  { user_id: 'USR-03019', location: 'España',     total_duration_min: 76,  score_pct: 27.8, severity: 'warning'  },
]
