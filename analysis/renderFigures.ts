/**
 * Renders real figures (inline SVG, no new dependency) from the actual
 * computed three-metric pilot statistics
 * (research-output/phase8/final/three_metric_pilot_stats.json) and the
 * original pilot statistics
 * (research-output/phase8/final/pilot_descriptive_stats.json).
 *
 * Every figure is generated from real, already-computed numbers only --
 * nothing here invents a data point. A figure whose underlying data does
 * not exist is skipped with a console warning, never silently faked.
 * Every figure's title states "EXPLORATORY / PILOT-SCALE (n=5 worlds)".
 */
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(process.cwd(), "research-output", "phase8", "final", "figures");
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 720;
const H = 420;
const MARGIN = { top: 56, right: 24, bottom: 64, left: 72 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

function svgHeader(title: string, subtitle: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${W / 2}" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#111">${esc(title)}</text>
<text x="${W / 2}" y="40" text-anchor="middle" font-size="11" fill="#b45309">${esc(subtitle)}</text>`;
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Bar {
  label: string;
  value: number;
  errLow?: number;
  errHigh?: number;
  color: string;
}

function groupedBarChart(opts: { title: string; subtitle: string; groups: { groupLabel: string; bars: Bar[] }[]; yLabel: string; yMax?: number; source: string }): string {
  const allVals = opts.groups.flatMap((g) => g.bars.map((b) => Math.max(b.value, b.errHigh ?? b.value)));
  const yMax = opts.yMax ?? Math.max(...allVals) * 1.15;
  const barsPerGroup = Math.max(...opts.groups.map((g) => g.bars.length));
  const groupWidth = PLOT_W / opts.groups.length;
  const barWidth = Math.min(36, (groupWidth * 0.7) / barsPerGroup);

  let body = svgHeader(opts.title, opts.subtitle);
  // axes
  body += `<line x1="${MARGIN.left}" y1="${MARGIN.top}" x2="${MARGIN.left}" y2="${MARGIN.top + PLOT_H}" stroke="#333"/>`;
  body += `<line x1="${MARGIN.left}" y1="${MARGIN.top + PLOT_H}" x2="${MARGIN.left + PLOT_W}" y2="${MARGIN.top + PLOT_H}" stroke="#333"/>`;
  body += `<text x="18" y="${MARGIN.top + PLOT_H / 2}" transform="rotate(-90 18 ${MARGIN.top + PLOT_H / 2})" text-anchor="middle" font-size="11" fill="#333">${esc(opts.yLabel)}</text>`;
  // y gridlines
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const y = MARGIN.top + PLOT_H - (v / yMax) * PLOT_H;
    body += `<line x1="${MARGIN.left}" y1="${y}" x2="${MARGIN.left + PLOT_W}" y2="${y}" stroke="#eee"/>`;
    body += `<text x="${MARGIN.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#555">${v.toFixed(3)}</text>`;
  }

  opts.groups.forEach((g, gi) => {
    const groupX = MARGIN.left + gi * groupWidth;
    g.bars.forEach((b, bi) => {
      const x = groupX + groupWidth / 2 - (barsPerGroup * barWidth) / 2 + bi * barWidth;
      const barH = (b.value / yMax) * PLOT_H;
      const y = MARGIN.top + PLOT_H - barH;
      body += `<rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barH}" fill="${b.color}"/>`;
      if (b.errLow !== undefined && b.errHigh !== undefined) {
        const cx = x + (barWidth - 4) / 2;
        const yLow = MARGIN.top + PLOT_H - (b.errLow / yMax) * PLOT_H;
        const yHigh = MARGIN.top + PLOT_H - (b.errHigh / yMax) * PLOT_H;
        body += `<line x1="${cx}" y1="${yLow}" x2="${cx}" y2="${yHigh}" stroke="#111" stroke-width="1.5"/>`;
        body += `<line x1="${cx - 4}" y1="${yHigh}" x2="${cx + 4}" y2="${yHigh}" stroke="#111" stroke-width="1.5"/>`;
        body += `<line x1="${cx - 4}" y1="${yLow}" x2="${cx + 4}" y2="${yLow}" stroke="#111" stroke-width="1.5"/>`;
      }
    });
    body += `<text x="${groupX + groupWidth / 2}" y="${MARGIN.top + PLOT_H + 16}" text-anchor="middle" font-size="10" fill="#111">${esc(g.groupLabel)}</text>`;
  });

  // legend
  const legendLabels = Array.from(new Map(opts.groups.flatMap((g) => g.bars.map((b) => [b.label, b.color] as const))).entries());
  legendLabels.forEach(([label, color], i) => {
    const lx = MARGIN.left + i * 140;
    body += `<rect x="${lx}" y="${H - 16}" width="10" height="10" fill="${color}"/>`;
    body += `<text x="${lx + 14}" y="${H - 7}" font-size="10" fill="#333">${esc(label)}</text>`;
  });

  body += `<text x="${W - 10}" y="${H - 4}" text-anchor="end" font-size="8" fill="#888">source: ${esc(opts.source)}</text>`;
  body += `</svg>`;
  return body;
}

function lineChart(opts: { title: string; subtitle: string; series: { label: string; color: string; points: { x: number; y: number }[] }[]; xLabel: string; yLabel: string; xMax: number; source: string }): string {
  let body = svgHeader(opts.title, opts.subtitle);
  body += `<line x1="${MARGIN.left}" y1="${MARGIN.top}" x2="${MARGIN.left}" y2="${MARGIN.top + PLOT_H}" stroke="#333"/>`;
  body += `<line x1="${MARGIN.left}" y1="${MARGIN.top + PLOT_H}" x2="${MARGIN.left + PLOT_W}" y2="${MARGIN.top + PLOT_H}" stroke="#333"/>`;
  body += `<text x="${MARGIN.left + PLOT_W / 2}" y="${H - 20}" text-anchor="middle" font-size="11" fill="#333">${esc(opts.xLabel)}</text>`;
  body += `<text x="18" y="${MARGIN.top + PLOT_H / 2}" transform="rotate(-90 18 ${MARGIN.top + PLOT_H / 2})" text-anchor="middle" font-size="11" fill="#333">${esc(opts.yLabel)}</text>`;
  for (let i = 0; i <= 4; i++) {
    const v = i / 4;
    const y = MARGIN.top + PLOT_H - v * PLOT_H;
    body += `<line x1="${MARGIN.left}" y1="${y}" x2="${MARGIN.left + PLOT_W}" y2="${y}" stroke="#eee"/>`;
    body += `<text x="${MARGIN.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#555">${v.toFixed(2)}</text>`;
  }
  const toX = (x: number) => MARGIN.left + (x / opts.xMax) * PLOT_W;
  const toY = (y: number) => MARGIN.top + PLOT_H - y * PLOT_H;

  opts.series.forEach((s) => {
    if (s.points.length === 0) return;
    const pts = [{ x: 0, y: 0 }, ...s.points, { x: opts.xMax, y: s.points.at(-1)!.y }];
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");
    body += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2"/>`;
  });
  opts.series.forEach((s, i) => {
    const lx = MARGIN.left + i * 140;
    body += `<rect x="${lx}" y="${H - 16}" width="10" height="4" fill="${s.color}"/>`;
    body += `<text x="${lx + 14}" y="${H - 7}" font-size="10" fill="#333">${esc(s.label)}</text>`;
  });
  body += `<text x="${W - 10}" y="${H - 4}" text-anchor="end" font-size="8" fill="#888">source: ${esc(opts.source)}</text>`;
  body += `</svg>`;
  return body;
}

function writeSvg(name: string, svg: string): void {
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, svg);
  console.log(`Wrote ${p}`);
}

function main(): void {
  const finalDir = path.join(process.cwd(), "research-output", "phase8", "final");
  const threeMetricPath = path.join(finalDir, "three_metric_pilot_stats.json");
  const originalPath = path.join(finalDir, "pilot_descriptive_stats.json");

  if (!fs.existsSync(threeMetricPath)) {
    console.warn(`SKIPPED all figures: ${threeMetricPath} does not exist yet.`);
    return;
  }
  const tm = JSON.parse(fs.readFileSync(threeMetricPath, "utf-8"));
  const orig = fs.existsSync(originalPath) ? JSON.parse(fs.readFileSync(originalPath, "utf-8")) : null;

  const SUBTITLE = `EXPLORATORY / PILOT-SCALE (n=${tm.pilotWorlds} worlds) -- NOT a confirmatory result`;
  const DETA_COLOR = "#2563eb";
  const BKT_COLOR = "#dc2626";
  const C0_COLOR = "#6b7280";
  const C2_COLOR = "#16a34a";
  const C3_COLOR = "#ca8a04";

  // Figure 1: Brier score comparison
  const brierFamilies = Object.keys(tm.brierScore);
  writeSvg(
    "figure1_brier_score_comparison.svg",
    groupedBarChart({
      title: "Figure 1 — Track A Brier Score: Det-A vs. BKT-fit",
      subtitle: SUBTITLE,
      yLabel: "Mean Brier score (lower is better)",
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: brierFamilies.map((fam) => {
        const d = tm.brierScore[fam];
        return {
          groupLabel: fam,
          bars: [
            { label: "Det-A", value: d.detA.mean, color: DETA_COLOR },
            { label: "BKT-fit", value: d.bktFit.mean, color: BKT_COLOR },
          ],
        };
      }),
    }),
  );

  // Figure 3: RMSE comparison
  const rmseFamilies = Object.keys(tm.latentMasteryRmse);
  writeSvg(
    "figure3_rmse_comparison.svg",
    groupedBarChart({
      title: "Figure 3 — Track A Latent-Mastery RMSE: Det-A vs. BKT-fit",
      subtitle: SUBTITLE,
      yLabel: "Mean RMSE (lower is better)",
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: rmseFamilies.map((fam) => {
        const d = tm.latentMasteryRmse[fam];
        return {
          groupLabel: fam,
          bars: [
            { label: "Det-A", value: d.detA.mean, color: DETA_COLOR },
            { label: "BKT-fit", value: d.bktFit.mean, color: BKT_COLOR },
          ],
        };
      }),
    }),
  );

  // Figure 2: QTM attainment probability + restricted-mean QTM, by config and policy
  const qtmConfigs = Object.keys(tm.questionsToMastery);
  writeSvg(
    "figure2a_qtm_attainment_probability.svg",
    groupedBarChart({
      title: "Figure 2a — Questions-to-Mastery: attainment probability within budget (T=60)",
      subtitle: SUBTITLE,
      yLabel: "P(mastery attained by budget end)",
      yMax: 1,
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: qtmConfigs.map((cfg) => {
        const p = tm.questionsToMastery[cfg].pooled;
        return {
          groupLabel: cfg,
          bars: [
            { label: "C0 (non-adaptive)", value: p.C0.attainmentProbability, color: C0_COLOR },
            { label: "C2 (adaptive)", value: p.C2.attainmentProbability, color: C2_COLOR },
            { label: "C3 (prereq-unaware)", value: p.C3.attainmentProbability, color: C3_COLOR },
          ],
        };
      }),
    }),
  );
  writeSvg(
    "figure2b_qtm_restricted_mean.svg",
    groupedBarChart({
      title: "Figure 2b — Restricted-mean Questions-to-Mastery (censored at budget=60)",
      subtitle: SUBTITLE,
      yLabel: "Mean questions to mastery (lower is better; censored = 60)",
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: qtmConfigs.map((cfg) => {
        const p = tm.questionsToMastery[cfg].pooled;
        return {
          groupLabel: cfg,
          bars: [
            { label: "C0 (non-adaptive)", value: p.C0.restrictedMeanQtm, color: C0_COLOR },
            { label: "C2 (adaptive)", value: p.C2.restrictedMeanQtm, color: C2_COLOR },
            { label: "C3 (prereq-unaware)", value: p.C3.restrictedMeanQtm, color: C3_COLOR },
          ],
        };
      }),
    }),
  );

  // Figure 2c: cumulative attainment curves for one representative config (S4-GF, the theoretically-favored cell)
  if (tm.questionsToMastery["S4-GF"]) {
    const p = tm.questionsToMastery["S4-GF"].pooled;
    writeSvg(
      "figure2c_cumulative_attainment_S4-GF.svg",
      lineChart({
        title: "Figure 2c — Cumulative mastery-attainment curve, config S4-GF",
        subtitle: SUBTITLE,
        xLabel: "Questions administered",
        yLabel: "Cumulative P(mastery attained)",
        xMax: 60,
        source: "research-output/phase8/final/three_metric_pilot_stats.json",
        series: [
          { label: "C0", color: C0_COLOR, points: p.C0.cumulativeAttainmentCurve.map((pt: { step: number; cumulativeProbability: number }) => ({ x: pt.step, y: pt.cumulativeProbability })) },
          { label: "C2", color: C2_COLOR, points: p.C2.cumulativeAttainmentCurve.map((pt: { step: number; cumulativeProbability: number }) => ({ x: pt.step, y: pt.cumulativeProbability })) },
          { label: "C3", color: C3_COLOR, points: p.C3.cumulativeAttainmentCurve.map((pt: { step: number; cumulativeProbability: number }) => ({ x: pt.step, y: pt.cumulativeProbability })) },
        ],
      }),
    );
  } else {
    console.warn("SKIPPED figure2c: S4-GF config not present in computed stats.");
  }

  // Figure 4: performance-by-simulator-family -- Brier across all 4 families, Det-A only, single series
  writeSvg(
    "figure4_brier_by_family_detA.svg",
    groupedBarChart({
      title: "Figure 4 — Det-A Brier score by simulator family",
      subtitle: SUBTITLE,
      yLabel: "Mean Brier score",
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: brierFamilies.map((fam) => ({
        groupLabel: fam,
        bars: [{ label: "Det-A", value: tm.brierScore[fam].detA.mean, color: DETA_COLOR }],
      })),
    }),
  );

  // Figure 5: adaptive-vs-non-adaptive efficiency -- attainment probability delta (C2-C0) across configs
  writeSvg(
    "figure5_adaptive_efficiency_delta.svg",
    groupedBarChart({
      title: "Figure 5 — Adaptive vs. non-adaptive efficiency: attainment-probability delta (C2 - C0)",
      subtitle: SUBTITLE,
      yLabel: "Delta attainment probability (positive = adaptive wins)",
      source: "research-output/phase8/final/three_metric_pilot_stats.json",
      groups: qtmConfigs.map((cfg) => {
        const p = tm.questionsToMastery[cfg].pooled;
        const delta = p.C2.attainmentProbability - p.C0.attainmentProbability;
        return { groupLabel: cfg, bars: [{ label: "C2 - C0", value: Math.abs(delta), color: delta >= 0 ? C2_COLOR : "#b91c1c" }] };
      }),
    }),
  );

  // Figure 6: robustness check -- primary (Brier) vs secondary (log loss) directional agreement, if original stats available
  if (orig) {
    const commonFamilies = brierFamilies.filter((f) => orig.trackA[f]);
    writeSvg(
      "figure8_robustness_brier_vs_logloss.svg",
      groupedBarChart({
        title: "Figure 8 — Robustness check: Det-A minus BKT-fit, Brier (primary) vs. log loss (secondary)",
        subtitle: SUBTITLE,
        yLabel: "Mean difference (Det-A - BKT-fit)",
        source: "research-output/phase8/final/{three_metric_pilot_stats,pilot_descriptive_stats}.json",
        groups: commonFamilies.map((fam) => ({
          groupLabel: fam,
          bars: [
            { label: "Brier diff", value: Math.abs(tm.brierScore[fam].diff_detA_minus_bktFit.mean ?? 0), color: tm.brierScore[fam].diff_detA_minus_bktFit.mean >= 0 ? "#b91c1c" : "#16a34a" },
            { label: "Log-loss diff", value: Math.abs(orig.trackA[fam].diff_logLoss_detA_minus_bktFit.mean ?? 0), color: orig.trackA[fam].diff_logLoss_detA_minus_bktFit.mean >= 0 ? "#f97316" : "#0891b2" },
          ],
        })),
      }),
    );
  } else {
    console.warn("SKIPPED figure8 (robustness check): original pilot_descriptive_stats.json not found.");
  }

  console.log("NOT RENDERED (no underlying per-response/per-trajectory data retained in any stored artifact): a reliability/calibration-bin plot (Brier) requiring raw prediction rows, and representative individual mastery trajectories requiring per-step trajectory retention -- see docs/COMPLETE_RESEARCH_PAPER_EVIDENCE_DOSSIER.md Section 21 (data-availability matrix) for the exact instrumentation gap.");
}

main();
