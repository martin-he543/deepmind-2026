import React, { useState } from 'react';
import {
  ALL_TISSUES,
  ErvFamilyClass,
  FAMILY_TISSUE_SUMMARY_MATRIX,
  FamilyTissueMatrixCell,
  TissueOntology,
} from '../data/ervLociData';

const ERV_FAMILIES: Array<{
  family: ErvFamilyClass;
  subtitle: string;
  ageRange: string;
  genomeCopies: string;
}> = [
  {
    family: 'LTR/ERV1',
    subtitle: 'HERV-W (LTR17), HERV-H (LTR7), MER41',
    ageRange: '15–45 MYA',
    genomeCopies: '~112k copies',
  },
  {
    family: 'LTR/ERVK',
    subtitle: 'HERV-K (HML-2 / LTR5_Hs) — Youngest',
    ageRange: '1–15 MYA',
    genomeCopies: '~11k copies',
  },
  {
    family: 'LTR/ERVL-MaLR',
    subtitle: 'THE1A/B, MLT1 (Mammalian Apparent LTR)',
    ageRange: '35–75 MYA',
    genomeCopies: '~365k copies',
  },
  {
    family: 'LTR/ERVL',
    subtitle: 'MLT2A1/B, HERV-L — Ancient Mammalian',
    ageRange: '60–100 MYA',
    genomeCopies: '~160k copies',
  },
];

interface FamilyTissueHeatmapSectionProps {
  selectedTissue: TissueOntology;
  onSelectFamilyAndTissue: (family: ErvFamilyClass, tissue: TissueOntology) => void;
}

export const FamilyTissueHeatmapSection: React.FC<
  FamilyTissueHeatmapSectionProps
> = ({ selectedTissue, onSelectFamilyAndTissue }) => {
  const [metricView, setMetricView] = useState<
    'active_pct' | 'mean_log2fc' | 'z_score'
  >('active_pct');
  const [selectedCell, setSelectedCell] = useState<FamilyTissueMatrixCell>(
    FAMILY_TISSUE_SUMMARY_MATRIX[0]
  );

  const getCell = (
    family: ErvFamilyClass,
    tissue: TissueOntology
  ): FamilyTissueMatrixCell | undefined =>
    FAMILY_TISSUE_SUMMARY_MATRIX.find(
      (c) => c.family === family && c.tissue === tissue
    );

  // Discrete scientific color scale (Cyan/Teal/Blue to High-Impact Crimson/Amber)
  const getCellColorStyle = (cell: FamilyTissueMatrixCell) => {
    const intensity =
      metricView === 'active_pct'
        ? Math.min(1, cell.activeFractionPct / 24)
        : metricView === 'mean_log2fc'
        ? Math.min(1, Math.abs(cell.meanActiveLog2FC) / 2.0)
        : Math.min(1, Math.abs(cell.meanZScoreVsControl) / 5.0);

    if (intensity > 0.72) {
      return 'bg-blue-700 text-white border-blue-800';
    }
    if (intensity > 0.48) {
      return 'bg-teal-600 text-white border-teal-700';
    }
    if (intensity > 0.25) {
      return 'bg-teal-100 text-teal-950 border-teal-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>240-LTR Chromosome Screen Summary</span>
            <span aria-hidden="true">·</span>
            <span>Calibrated Against Matched Null Deletions</span>
            <span aria-hidden="true">·</span>
            <span>Click any cell to load locus</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            Headline Result: ERV Family × Human Tissue Regulatory Switch Matrix
          </h2>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMetricView('active_pct')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              metricView === 'active_pct'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            % Active Switches (|Z| &gt; 2.5)
          </button>
          <button
            type="button"
            onClick={() => setMetricView('mean_log2fc')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              metricView === 'mean_log2fc'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mean Active log2FC
          </button>
          <button
            type="button"
            onClick={() => setMetricView('z_score')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              metricView === 'z_score'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Empirical Z vs. Controls
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Heatmap Matrix Table (8 cols) */}
        <div className="xl:col-span-8 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                <th className="py-2 pr-3 font-semibold">
                  RepeatMasker Class (rm.out)
                </th>
                {ALL_TISSUES.map((t) => {
                  const shortT = t.split(' (')[0];
                  return (
                    <th
                      key={t}
                      className={`py-2 px-2 text-center font-semibold ${
                        selectedTissue === t ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      {shortT}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ERV_FAMILIES.map((famInfo) => (
                <tr key={famInfo.family}>
                  <td className="py-3 pr-3">
                    <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{famInfo.family}</span>
                      {famInfo.family === 'LTR/ERVK' && (
                        <span
                          className="text-[10px] font-normal text-amber-700"
                          title="Low divergence (<3%): interpret with mappability caution"
                        >
                          · Low-div caution
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {famInfo.subtitle}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {famInfo.ageRange} · {famInfo.genomeCopies}
                    </div>
                  </td>

                  {ALL_TISSUES.map((t) => {
                    const cell = getCell(famInfo.family, t);
                    if (!cell) return <td key={t} />;
                    const isFocused =
                      selectedCell.family === cell.family &&
                      selectedCell.tissue === cell.tissue;

                    const primaryVal =
                      metricView === 'active_pct'
                        ? `${cell.activeFractionPct.toFixed(1)}%`
                        : metricView === 'mean_log2fc'
                        ? `${cell.meanActiveLog2FC.toFixed(2)}`
                        : `Z=${cell.meanZScoreVsControl.toFixed(1)}`;

                    return (
                      <td key={t} className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCell(cell);
                            onSelectFamilyAndTissue(cell.family, cell.tissue);
                          }}
                          className={`w-full rounded-lg border p-2.5 text-center transition-all cursor-pointer font-mono tabular-nums ${getCellColorStyle(
                            cell
                          )} ${
                            isFocused
                              ? 'ring-2 ring-slate-950 ring-offset-1'
                              : 'hover:opacity-90'
                          }`}
                        >
                          <div className="text-sm font-bold">{primaryVal}</div>
                          <div className="text-[10px] opacity-85 mt-0.5 truncate">
                            {cell.activeSwitchesCount}/{cell.testedLtrs} LTRs
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Color Scale Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Scale:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-slate-100 border border-slate-300 inline-block" />
                &lt;6% (Baseline / Neutral)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-teal-100 border border-teal-300 inline-block" />
                6–12% (Moderate)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block" />
                12–18% (Enriched)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-blue-700 inline-block" />
                &gt;18% (Dominant Lineage Switch)
              </span>
            </div>
            <span className="font-mono text-[11px]">
              Total Screened: 240 LTRs (480 AlphaGenome API calls cached)
            </span>
          </div>
        </div>

        {/* Right Inspector: Selected Matrix Cell + Null Control Calibration Distribution (4 cols) */}
        <div className="xl:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div>
            <div className="text-xs font-mono text-slate-500">
              SELECTED CELL INSPECTOR
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
              {selectedCell.family} in {selectedCell.tissue}
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-500">ACTIVE SWITCHES</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedCell.activeSwitchesCount} / {selectedCell.testedLtrs} (
                  {selectedCell.activeFractionPct}%)
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-500">TOP HIT LOCUS</div>
                <div className="text-xs font-bold text-blue-700 mt-1 truncate">
                  {selectedCell.maxKnockoutGene}
                </div>
                <div className="text-[11px] text-rose-600 font-semibold">
                  {selectedCell.maxKnockoutLog2FC.toFixed(2)} log2FC
                </div>
              </div>
            </div>
          </div>

          {/* Empirical Null Control Distribution Comparison */}
          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-800">
              Empirical Control Calibration (Why Controls Matter)
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Deleting any sequence near a gene can mildly perturb predicted tracks.
              We benchmark every ΔLTR knockout against three mandatory controls:
            </p>

            <div className="mt-2.5 space-y-2 text-xs font-mono tabular-nums">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-700">
                    1. Active {selectedCell.family} ΔLTR Knockouts
                  </span>
                  <span className="font-bold text-rose-600">
                    Mean {selectedCell.meanActiveLog2FC.toFixed(2)} log2FC (Z ={' '}
                    {selectedCell.meanZScoreVsControl.toFixed(2)})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-rose-600"
                    style={{
                      width: `${Math.min(
                        100,
                        (Math.abs(selectedCell.meanActiveLog2FC) / 2.7) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">
                    2. Matched Alu / L1 Non-ERV Repeat Deletions
                  </span>
                  <span className="text-slate-700">Mean -0.07 log2FC (Z = -0.38)</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: '6%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">
                    3. Matched Random Non-Repeat Deletions (Null)
                  </span>
                  <span className="text-slate-700">Mean -0.05 log2FC (SD = 0.14)</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-slate-500" style={{ width: '4%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">
                    4. Unedited Reference Run-to-Run Determinism
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    Max Δ = 0.0000 log2FC
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '1%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
