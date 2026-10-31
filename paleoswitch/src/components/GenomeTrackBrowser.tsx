import React, { useMemo, useState } from 'react';
import {
  ErvLocusRecord,
  TissueOntology,
  computeAlphaGenomeTracks,
  TISSUE_BIOSAMPLE_MAP,
} from '../data/ervLociData';
import {
  buildAlphaGenomeLocusUrl,
  buildAlphaGenomeVariantUrl,
} from '../utils/atlasLinks';
import {
  Scissors,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  AlignCenterHorizontal,
} from 'lucide-react';

export type TrackDisplayMode = 'overlay_ko' | 'delta_diff' | 'controls_compare';

interface GenomeTrackBrowserProps {
  locus: ErvLocusRecord;
  tissue: TissueOntology;
  isVirusDeleted: boolean;
  onToggleDeleteVirus: () => void;
  recenterOnTss: boolean;
  onToggleRecenter: () => void;
}

export const GenomeTrackBrowser: React.FC<GenomeTrackBrowserProps> = ({
  locus,
  tissue,
  isVirusDeleted,
  onToggleDeleteVirus,
  recenterOnTss,
  onToggleRecenter,
}) => {
  const [displayMode, setDisplayMode] = useState<TrackDisplayMode>('overlay_ko');
  const [hoverBinIndex, setHoverBinIndex] = useState<number | null>(null);

  const trackPoints = useMemo(
    () => computeAlphaGenomeTracks(locus, tissue, recenterOnTss),
    [locus, tissue, recenterOnTss]
  );

  const metrics = locus.tissueMetrics[tissue];
  const hoveredPoint =
    hoverBinIndex !== null ? trackPoints[hoverBinIndex] ?? null : null;

  const atlasLocusUrl = useMemo(
    () =>
      buildAlphaGenomeLocusUrl({
        interval: `${locus.chrom}:${locus.intervalStart}-${locus.intervalEnd}`,
        biosample: TISSUE_BIOSAMPLE_MAP[tissue],
        modalities: ['RNA_SEQ', 'CAGE', 'ATAC', 'CHIP_HISTONE', 'CHIP_TF'],
      }),
    [locus, tissue]
  );

  const atlasVariantUrl = useMemo(
    () =>
      buildAlphaGenomeVariantUrl({
        variant: locus.representativeVariant,
        biosample: TISSUE_BIOSAMPLE_MAP[tissue],
        interval: `${locus.chrom}:${locus.ltrStart - 2500}-${locus.ltrEnd + 2500}`,
      }),
    [locus, tissue]
  );

  const svgWidth = 860;
  const trackHeight = 56;
  const padLeft = 136;
  const padRight = 24;
  const plotWidth = svgWidth - padLeft - padRight;

  const coordToX = (coord: number) => {
    const frac =
      (coord - locus.intervalStart) / (locus.intervalEnd - locus.intervalStart);
    return padLeft + Math.max(0, Math.min(1, frac)) * plotWidth;
  };

  const buildAreaPath = (values: number[], yTop: number, height: number) => {
    if (values.length === 0) return '';
    const stepX = plotWidth / (values.length - 1);
    const baseline = yTop + height;
    const pts = values.map((v, idx) => {
      const x = padLeft + idx * stepX;
      const y = baseline - Math.max(0, Math.min(1, v)) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${padLeft},${baseline} L ${pts.join(' L ')} L ${
      padLeft + plotWidth
    },${baseline} Z`;
  };

  const buildLinePath = (values: number[], yTop: number, height: number) => {
    if (values.length === 0) return '';
    const stepX = plotWidth / (values.length - 1);
    const baseline = yTop + height;
    const pts = values.map((v, idx) => {
      const x = padLeft + idx * stepX;
      const y = baseline - Math.max(0, Math.min(1, v)) * (height - 6);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(' ');
  };

  const buildDeltaPath = (
    refVals: number[],
    altVals: number[],
    yTop: number,
    height: number
  ) => {
    const stepX = plotWidth / (refVals.length - 1);
    const midY = yTop + height * 0.35;
    const pts = refVals.map((r, idx) => {
      const diff = altVals[idx] - r; // typically negative on knockout
      const x = padLeft + idx * stepX;
      const y = midY - diff * (height * 0.6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${padLeft},${midY} L ${pts.join(' L ')} L ${
      padLeft + plotWidth
    },${midY} Z`;
  };

  const tracksConfig = [
    {
      id: 'rna',
      label: 'RNA-seq (Exons)',
      unit: 'norm TPM',
      colorRef: '#1A73E8',
      colorKo: '#DC2626',
      deltaLabel: `${metrics.rnaLog2FC > 0 ? '+' : ''}${metrics.rnaLog2FC.toFixed(2)} log2FC (${metrics.percentDrop}%)`,
      refValues: trackPoints.map((p) => p.rnaRef),
      koValues: trackPoints.map((p) => p.rnaKo),
      ctrlRandomValues: trackPoints.map((p) => p.rnaCtrlRandom),
      ctrlRepeatValues: trackPoints.map((p) => p.rnaCtrlRepeat),
    },
    {
      id: 'cage',
      label: 'CAGE (5′ TSS)',
      unit: 'tags/M',
      colorRef: '#0D9488',
      colorKo: '#DC2626',
      deltaLabel: `${metrics.cageDeltaPct}% at TSS`,
      refValues: trackPoints.map((p) => p.cageRef),
      koValues: trackPoints.map((p) => p.cageKo),
      ctrlRandomValues: trackPoints.map((p) => p.cageRef * 0.985),
      ctrlRepeatValues: trackPoints.map((p) => p.cageRef * 0.978),
    },
    {
      id: 'atac',
      label: 'ATAC / DNase',
      unit: 'openness',
      colorRef: '#E8710A',
      colorKo: '#DC2626',
      deltaLabel: `${metrics.atacDeltaPct}% over LTR`,
      refValues: trackPoints.map((p) => p.atacRef),
      koValues: trackPoints.map((p) => p.atacKo),
      ctrlRandomValues: trackPoints.map((p) => p.atacRef * 0.99),
      ctrlRepeatValues: trackPoints.map((p) => p.atacRef * 0.982),
    },
    {
      id: 'h3k27ac',
      label: 'H3K27ac (Enhancer)',
      unit: 'ChIP fold',
      colorRef: '#9334E6',
      colorKo: '#DC2626',
      deltaLabel: `${metrics.h3k27acDeltaPct}% mark`,
      refValues: trackPoints.map((p) => p.h3k27acRef),
      koValues: trackPoints.map((p) => p.h3k27acKo),
      ctrlRandomValues: trackPoints.map((p) => p.h3k27acRef * 0.988),
      ctrlRepeatValues: trackPoints.map((p) => p.h3k27acRef * 0.98),
    },
    {
      id: 'ctcf',
      label: 'CTCF (Anchor)',
      unit: 'ChIP signal',
      colorRef: '#475569',
      colorKo: '#DC2626',
      deltaLabel: `Loop ${metrics.loopScoreRef.toFixed(1)} → ${metrics.loopScoreKo.toFixed(1)}`,
      refValues: trackPoints.map((p) => p.ctcfRef),
      koValues: trackPoints.map((p) => p.ctcfKo),
      ctrlRandomValues: trackPoints.map((p) => p.ctcfRef * 0.992),
      ctrlRepeatValues: trackPoints.map((p) => p.ctcfRef * 0.989),
    },
  ];

  const ltrXStart = coordToX(locus.ltrStart);
  const ltrXEnd = Math.max(ltrXStart + 8, coordToX(locus.ltrEnd));
  const tssX = coordToX(locus.geneTss);
  const ctrlRandomX = coordToX(locus.controlRandomRegion.start);
  const ctrlRepeatX = coordToX(locus.controlRepeatRegion.start);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {/* Top Action & Coordinate Provenance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-900">
              {locus.chrom}:{locus.intervalStart.toLocaleString()}-
              {locus.intervalEnd.toLocaleString()} (100 kb window)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              NCBI: {locus.ncbiContig} → {locus.chrom}
            </span>
            <span aria-hidden="true">·</span>
            <span>Predicted by AlphaGenome (Cached .npz)</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            Virtual Knockout Genome Browser: {locus.repeatName} ({locus.familyClass}) →{' '}
            <span className="font-mono text-blue-700">{locus.nearestGene}</span>
          </h2>
        </div>

        {/* Primary Virtual Knockout Switch & Deep-Links */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleDeleteVirus}
            className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isVirusDeleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isVirusDeleted ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Restore Wild-Type LTR (Ref)
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" /> Delete Virus ({locus.ltrLengthBp} bp ΔLTR)
              </>
            )}
          </button>

          <a
            href={atlasLocusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            AlphaGenome Atlas (Locus) <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
          </a>

          <a
            href={atlasVariantUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            Atlas Variant ({locus.representativeVariant}){' '}
            <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
          </a>
        </div>
      </div>

      {/* Young ERV Mappability Warning Banner (if applicable, e.g. HERV-K HML-2) */}
      {locus.mappabilityWarning && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Known Model Constraint: </span>
            {locus.mappabilityWarning}
          </div>
        </div>
      )}

      {/* Track View Mode & TSS Coordinate Re-Centering Controls */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setDisplayMode('overlay_ko')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              displayMode === 'overlay_ko'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ref vs. ΔLTR Knockout
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('delta_diff')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              displayMode === 'delta_diff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Δ Difference (Alt − Ref)
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('controls_compare')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              displayMode === 'controls_compare'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Compare Null Controls (Random &amp; Alu/L1)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleRecenter}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              recenterOnTss
                ? 'border-teal-600 bg-teal-50 text-teal-900'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
            title="Deleting an LTR shifts downstream coordinates by Δbp. Re-centering on the gene TSS aligns Ref and Alt exons."
          >
            <AlignCenterHorizontal className="w-3.5 h-3.5" />
            {recenterOnTss
              ? `Aligned on ${locus.nearestGene} TSS (+${locus.ltrLengthBp} bp shift compensated)`
              : `Raw Unaligned Coordinates (${locus.ltrLengthBp} bp deletion shift artifact)`}
          </button>
        </div>
      </div>

      {/* Interactive SVG Multi-Track Canvas */}
      <div className="mt-3 relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} 375`}
          className="w-full h-auto select-none cursor-crosshair bg-slate-50/60 rounded-lg border border-slate-200"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            if (relX < padLeft || relX > svgWidth - padRight) {
              setHoverBinIndex(null);
              return;
            }
            const bin = Math.round(
              ((relX - padLeft) / plotWidth) * (trackPoints.length - 1)
            );
            setHoverBinIndex(Math.max(0, Math.min(trackPoints.length - 1, bin)));
          }}
          onMouseLeave={() => setHoverBinIndex(null)}
        >
          {/* Highlight Vertical Band for ERV LTR */}
          <rect
            x={ltrXStart - 3}
            y={12}
            width={Math.max(10, ltrXEnd - ltrXStart + 6)}
            height={348}
            fill={isVirusDeleted ? '#FEE2E2' : '#CCFBF1'}
            opacity={0.65}
          />

          {/* Highlight Vertical Line for Target Gene TSS */}
          <line
            x1={tssX}
            y1={12}
            x2={tssX}
            y2={358}
            stroke="#1D4ED8"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />

          {/* Top Annotation Track: RepeatMasker LTR + Control Regions + Gene Exons */}
          <g transform="translate(0, 14)">
            <text
              x={12}
              y={16}
              className="text-[11px] font-semibold fill-slate-700"
            >
              Annotations (hg38)
            </text>
            <text
              x={12}
              y={30}
              className="text-[10px] font-mono fill-slate-400"
            >
              rm.out + Ensembl
            </text>

            {/* Backbone line */}
            <line
              x1={padLeft}
              y1={20}
              x2={svgWidth - padRight}
              y2={20}
              stroke="#CBD5E1"
              strokeWidth={1.5}
            />

            {/* Control 1: Random Non-Repeat Region */}
            <rect
              x={ctrlRandomX - 4}
              y={13}
              width={10}
              height={14}
              rx={2}
              fill="#94A3B8"
            />
            <text
              x={ctrlRandomX}
              y={9}
              textAnchor="middle"
              className="text-[9px] font-mono fill-slate-500"
            >
              Ctrl:Random
            </text>

            {/* Control 2: Non-ERV Repeat (Alu/L1) */}
            <rect
              x={ctrlRepeatX - 4}
              y={13}
              width={10}
              height={14}
              rx={2}
              fill="#64748B"
            />
            <text
              x={ctrlRepeatX}
              y={9}
              textAnchor="middle"
              className="text-[9px] font-mono fill-slate-500"
            >
              Ctrl:Alu/L1
            </text>

            {/* Viral ERV LTR Element Box */}
            <rect
              x={ltrXStart - 2}
              y={10}
              width={Math.max(12, ltrXEnd - ltrXStart + 4)}
              height={20}
              rx={3}
              fill={isVirusDeleted ? '#EF4444' : '#0D9488'}
            />
            <text
              x={(ltrXStart + ltrXEnd) / 2}
              y={8}
              textAnchor="middle"
              className="text-[10px] font-mono font-semibold fill-teal-900"
            >
              {isVirusDeleted ? `Δ ${locus.repeatName} (Excised)` : locus.repeatName}
            </text>

            {/* Target Gene Exons */}
            {locus.exons.map((ex) => {
              const exX1 = coordToX(Math.min(ex.start, ex.end));
              const exX2 = Math.max(exX1 + 7, coordToX(Math.max(ex.start, ex.end)));
              return (
                <rect
                  key={ex.number}
                  x={exX1}
                  y={12}
                  width={exX2 - exX1}
                  height={16}
                  rx={2}
                  fill="#1D4ED8"
                />
              );
            })}
            <text
              x={tssX + 6}
              y={10}
              className="text-[10px] font-mono font-semibold fill-blue-800"
            >
              {locus.nearestGene} TSS ({locus.strand})
            </text>
          </g>

          {/* 5 Quantitative AlphaGenome Modality Tracks */}
          {tracksConfig.map((trk, idx) => {
            const yTop = 58 + idx * 60;
            const baselineY = yTop + trackHeight;

            return (
              <g key={trk.id}>
                {/* Horizontal Track Separator & Baseline */}
                <line
                  x1={12}
                  y1={baselineY}
                  x2={svgWidth - padRight}
                  y2={baselineY}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />

                {/* Left Track Label & Quantitative Knockout Readout */}
                <text
                  x={12}
                  y={yTop + 20}
                  className="text-[11px] font-semibold fill-slate-800"
                >
                  {trk.label}
                </text>
                <text
                  x={12}
                  y={yTop + 35}
                  className="text-[10px] font-mono fill-slate-500"
                >
                  {trk.deltaLabel}
                </text>

                {displayMode === 'delta_diff' ? (
                  <>
                    {/* Zero reference midline for Delta mode */}
                    <line
                      x1={padLeft}
                      y1={yTop + trackHeight * 0.35}
                      x2={svgWidth - padRight}
                      y2={yTop + trackHeight * 0.35}
                      stroke="#94A3B8"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                    <path
                      d={buildDeltaPath(
                        trk.refValues,
                        trk.koValues,
                        yTop,
                        trackHeight
                      )}
                      fill="#EF4444"
                      fillOpacity={0.38}
                      stroke="#DC2626"
                      strokeWidth={1.6}
                    />
                  </>
                ) : displayMode === 'controls_compare' ? (
                  <>
                    {/* Reference fill */}
                    <path
                      d={buildAreaPath(trk.refValues, yTop, trackHeight)}
                      fill={trk.colorRef}
                      fillOpacity={0.18}
                    />
                    {/* Control 1: Random Non-Repeat Deletion (Dashed Slate) */}
                    <path
                      d={buildLinePath(trk.ctrlRandomValues, yTop, trackHeight)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                    {/* Control 2: Non-ERV Repeat Deletion (Dotted Amber) */}
                    <path
                      d={buildLinePath(trk.ctrlRepeatValues, yTop, trackHeight)}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                    />
                    {/* ΔLTR Knockout Line (Solid Crimson) */}
                    <path
                      d={buildLinePath(trk.koValues, yTop, trackHeight)}
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth={1.8}
                    />
                  </>
                ) : (
                  <>
                    {/* Standard Overlay Mode: Wild-Type Ref vs ΔLTR Knockout */}
                    <path
                      d={buildAreaPath(
                        isVirusDeleted ? trk.koValues : trk.refValues,
                        yTop,
                        trackHeight
                      )}
                      fill={isVirusDeleted ? trk.colorKo : trk.colorRef}
                      fillOpacity={0.25}
                    />
                    {/* Always show Wild-Type Ref outline as ghost reference when virus is deleted */}
                    {isVirusDeleted && (
                      <path
                        d={buildLinePath(trk.refValues, yTop, trackHeight)}
                        fill="none"
                        stroke={trk.colorRef}
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                        opacity={0.75}
                      />
                    )}
                    <path
                      d={buildLinePath(
                        isVirusDeleted ? trk.koValues : trk.refValues,
                        yTop,
                        trackHeight
                      )}
                      fill="none"
                      stroke={isVirusDeleted ? trk.colorKo : trk.colorRef}
                      strokeWidth={2}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Interactive Crosshair Probe Line */}
          {hoveredPoint && (
            <line
              x1={
                padLeft +
                (hoveredPoint.binIndex / (trackPoints.length - 1)) * plotWidth
              }
              y1={12}
              x2={
                padLeft +
                (hoveredPoint.binIndex / (trackPoints.length - 1)) * plotWidth
              }
              y2={358}
              stroke="#0F172A"
              strokeWidth={1}
            />
          )}
        </svg>

        {/* Bottom Crosshair Telemetry Strip */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono tabular-nums text-slate-700">
          {hoveredPoint ? (
            <>
              <div>
                <span className="text-slate-500">PROBE: </span>
                <span className="font-semibold text-slate-900">
                  {locus.chrom}:{hoveredPoint.genomicCoord.toLocaleString()}
                </span>
                {hoveredPoint.isLtrBin && (
                  <span className="ml-2 text-teal-700 font-semibold">
                    [Inside {locus.repeatName}]
                  </span>
                )}
                {hoveredPoint.isExonBin && (
                  <span className="ml-2 text-blue-700 font-semibold">
                    [{locus.nearestGene} Exon]
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  RNA Ref→ΔLTR: {hoveredPoint.rnaRef.toFixed(2)} →{' '}
                  <strong className="text-rose-600">
                    {hoveredPoint.rnaKo.toFixed(2)}
                  </strong>
                </span>
                <span>
                  CAGE: {hoveredPoint.cageRef.toFixed(2)} →{' '}
                  <strong className="text-rose-600">
                    {hoveredPoint.cageKo.toFixed(2)}
                  </strong>
                </span>
                <span>
                  ATAC: {hoveredPoint.atacRef.toFixed(2)} →{' '}
                  <strong className="text-rose-600">
                    {hoveredPoint.atacKo.toFixed(2)}
                  </strong>
                </span>
                <span>
                  H3K27ac: {hoveredPoint.h3k27acRef.toFixed(2)} →{' '}
                  <strong className="text-rose-600">
                    {hoveredPoint.h3k27acKo.toFixed(2)}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between w-full text-slate-500">
              <span>
                Hover across any genomic track above to inspect base-bin Ref vs. ΔLTR
                knockout and control predictions.
              </span>
              <span>
                Distance to {locus.nearestGene} TSS:{' '}
                <strong className="text-slate-800">
                  {locus.distanceToTssBp.toLocaleString()} bp
                </strong>{' '}
                · Divergence: <strong className="text-slate-800">{locus.percDiv}%</strong> (~
                {locus.estimatedAgeMya} MYA)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
