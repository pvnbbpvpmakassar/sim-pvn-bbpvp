
import type {
  DashboardMetrics,
  DashboardRow,
  DashboardGroupData,
  AchievementMetrics,
  DashboardSummary,
  ChartDataItem,
  ModuleSummary,
} from "./chart-types";

const safeNumber = (value: unknown): number => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const calculateAchievementPercentage = (
  target: number,
  realisasi: number,
): number => {
  if (target <= 0) return 0;

  return (realisasi / target) * 100;
};

export const calculateAchievementMetrics = (
  targetOrang: number,
  realisasiOrang: number,
): AchievementMetrics => {
  const target = safeNumber(targetOrang);
  const realisasi = safeNumber(realisasiOrang);

  return {
    targetOrang: target,
    realisasiOrang: realisasi,
    selisihOrang: realisasi - target,
    sisaTargetOrang: Math.max(target - realisasi, 0),
    persentaseCapaian: calculateAchievementPercentage(
      target,
      realisasi,
    ),
  };
};

export const sumMetrics = (
  metrics: DashboardMetrics[],
): DashboardMetrics => {
  return metrics.reduce(
    (total, item) => ({
      paket: total.paket + safeNumber(item.paket),
      orang: total.orang + safeNumber(item.orang),
      realisasiPaket:
        total.realisasiPaket + safeNumber(item.realisasiPaket),
      realisasiOrang:
        total.realisasiOrang + safeNumber(item.realisasiOrang),
      anggaran: total.anggaran + safeNumber(item.anggaran),
      realisasiAnggaran:
        total.realisasiAnggaran +
        safeNumber(item.realisasiAnggaran),
    }),
    {
      paket: 0,
      orang: 0,
      realisasiPaket: 0,
      realisasiOrang: 0,
      anggaran: 0,
      realisasiAnggaran: 0,
    },
  );
};

/**
 * Menggabungkan metrik ABT dan NON-ABT.
 */
export const combineRowMetrics = (
  row: DashboardRow,
): DashboardMetrics => {
  return sumMetrics([row.abt, row.nonAbt]);
};

/**
 * Menghitung ringkasan dari baris induk.
 *
 * Jangan ikut menjumlahkan subRows karena berpotensi
 * menghitung ulang data yang sudah direpresentasikan
 * oleh baris induk.
 */
export const calculateDashboardSummary = (
  rows: DashboardRow[],
): DashboardSummary => {
  const metrics = sumMetrics(
    rows.map((row) => combineRowMetrics(row)),
  );

  return {
    ...calculateAchievementMetrics(
      metrics.orang,
      metrics.realisasiOrang,
    ),
    totalPaket: metrics.paket,
    realisasiPaket: metrics.realisasiPaket,
    totalAnggaran: metrics.anggaran,
    realisasiAnggaran: metrics.realisasiAnggaran,
  };
};

export const toChartData = (
  rows: DashboardRow[],
): ChartDataItem[] => {
  return rows.map((row) => {
    const metrics = combineRowMetrics(row);

    return {
      id: row.id,
      kode: row.kode,
      name: row.ro,
      targetOrang: metrics.orang,
      realisasiOrang: metrics.realisasiOrang,
      targetPaket: metrics.paket,
      realisasiPaket: metrics.realisasiPaket,
    };
  });
};

export const buildModuleAchievementData = (
  groups: DashboardGroupData[],
): ModuleSummary[] => {
  return groups.map((group) => {
    const summary = calculateDashboardSummary(group.rows);

    return {
      name: group.groupName,
      targetOrang: summary.targetOrang,
      realisasiOrang: summary.realisasiOrang,
      persentaseCapaian: summary.persentaseCapaian,
    };
  });
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${formatNumber(value)}%`;
};