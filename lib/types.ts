import { z } from "zod";

export type SeasonKey = "rabi" | "kharif1" | "kharif2";

export const farmerInputSchema = z.object({
  upazila: z.string(),
  union: z.string(),
  last_crops: z.object({
    rabi: z.string(),
    kharif1: z.string(),
    kharif2: z.string(),
  }),
  budget: z.enum(["low", "medium", "high"]),
  water: z.enum(["none", "limited", "reliable", "plenty"]),
  can_sell: z.array(z.string()).min(1),
  priorities: z.object({
    profit: z.number().int().min(1).max(5),
    soil: z.number().int().min(1).max(5),
    water: z.number().int().min(1).max(5),
  }),
  failed_crops: z.array(z.string()).optional(),
});

export type FarmerInput = z.infer<typeof farmerInputSchema>;

export type CropDef = {
  id: string;
  name: string;
  irrigation_mm: number;
  legume: boolean;
  ph_min: number;
  ph_max: number;
  heat_days_tolerance: number;
  heat_sensitive_months: number[];
  drainage_ok: string[];
  cost_tier: "low" | "medium" | "high";
  relative_margin_index: number;
  barc_name: string | null;
  calendar_by_slot?: Partial<Record<SeasonKey, string>>;
};

export type RotationDef = {
  rotation_id: string;
  name: string;
  seasons: Record<SeasonKey, { crop: string; months: string }>;
};

export type ScoredCandidate = {
  rotation_id: string;
  name: string;
  seasons: Record<SeasonKey, { crop: string; months: string }>;
  scores: {
    overall: number;
    water: number;
    soil_health: number;
    profit: number;
    climate_risk: number;
  };
  irrigation_mm: number;
  change_vs_current_pct: number;
  sub_scores: {
    water_fits: Record<SeasonKey, number>;
    heat_fits: Record<SeasonKey, number>;
    soil_fits: Record<SeasonKey, number>;
  };
};

export type UnionSoilProfile = {
  upazila: string;
  union: string;
  ph_median: number | null;
  om_pct: number | null;
  p_ppm_median: number | null;
  ec_median: number | null;
  texture: string | null;
  land_type: string | null;
  drainage: string | null;
  ph_class_area: Record<string, number>;
  frs: Record<
    string,
    {
      urea_kg_ha?: number;
      tsp_kg_ha?: number;
      mop_kg_ha?: number;
      lime_kg_ha?: number;
    }
  >;
  sample_count: number;
  source: string;
  source_url: string;
};

export type ClimateSummary = {
  lat: number;
  lon: number;
  grid_key: string;
  rabi_rain_normal_mm: number | null;
  kharif1_rain_normal_mm: number | null;
  kharif2_rain_normal_mm: number | null;
  rabi_rain_last10_mean_mm: number | null;
  kharif1_rain_last10_mean_mm: number | null;
  kharif2_rain_last10_mean_mm: number | null;
  hot_days_feb_mar: number | null;
  hot_days_apr_may: number | null;
  cold_days_dec_jan: number | null;
  gwetroot_rabi_mean: number | null;
  smap_rootzone_rabi_m3m3: number | null;
  smap_rootzone_pctl: number | null;
  rabi_tmax_normal_c: number | null;
  kharif1_tmax_normal_c: number | null;
  kharif2_tmax_normal_c: number | null;
  monthly_rain_normal: { month: string; mm: number }[];
  monthly_tmax_normal: { month: string; c: number }[];
  sources: string[];
};

export type SatelliteSummary = {
  id: string;
  lat: number;
  lon: number;
  smap_monthly: { month: string; rootzone: number; surface: number }[];
  ndvi_series: { date: string; ndvi: number }[];
  rabi_rootzone_mean: number;
  source: string;
  fallback?: boolean;
};
