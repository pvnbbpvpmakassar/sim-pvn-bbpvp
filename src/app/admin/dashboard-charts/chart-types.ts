import type {
  DashboardMetrics,
  DashboardRow,
  DashboardSubRow,
  DashboardGroupData,
} from "@/app/actions/data";

export type ChartDataItem = {
  id: string;
  kode: string;
  name: string;
  targetOrang: number;
  realisasiOrang: number;
  targetPaket: number;
  realisasiPaket: number;
};

export type AchievementMetrics = {
  targetOrang: number;
  realisasiOrang: number;
  selisihOrang: number;
  sisaTargetOrang: number;
  persentaseCapaian: number;
};

export type DashboardSummary = AchievementMetrics & {
  totalPaket: number;
  realisasiPaket: number;
  totalAnggaran: number;
  realisasiAnggaran: number;
};

export type ModuleSummary = {
  name: string;
  targetOrang: number;
  realisasiOrang: number;
  persentaseCapaian: number;
};

export type UPTPCategory =
  | "Satpel"
  | "UPTD"
  | "PFLK"
  | "Non-Batch";

export type UPTPChartDataItem = ChartDataItem & {
  kategori: UPTPCategory;
};

export type ProduktivitasROData = ChartDataItem & {
  kodeRO: string;
};

export type DashboardFilters = {
  search: string;
  module: string;
};

export type {
  DashboardMetrics,
  DashboardRow,
  DashboardSubRow,
  DashboardGroupData,
};