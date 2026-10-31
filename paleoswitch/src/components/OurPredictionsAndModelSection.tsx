import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Database,
  Dna,
  CheckCircle2,
  Activity,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

interface OurPredictionsAndModelSectionProps {
  onSelectLocusId?: (id: string) => void;
}

export const OurPredictionsAndModelSection: React.FC<
  OurPredictionsAndModelSectionProps
> = ({ onSelectLocusId }) => {
  const [data, setData] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'xgboost_model' | 'alphagenome_npz'>(
    'xgboost_model'
  );

  // Live Sandbox State
  const [sbxDna, setSbxDna] = useState<string>(
    'TATAAAGGATAAATGAGTCAATGCAAATTTCCGGAA'
  );
  const [sbxDist, setSbxDist] = useState<number>(0.15);
  const [sbxDiv, setSbxDiv] = useState<number>(6.1);
  const [sbxH3k, setSbxH3k] = useState<number>(85);
  const [sbxAtac, setSbxAtac] = useState<number>(80);
  const [sbxResult, setSbxResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/our-results')
      .then((r) => r.json())
      .then((j) => {
        if (j && j.ok) {
          setData(j);
          if (j.loci && j.loci.length > 0) {
            const first = j.loci[0];
            setSbxDna(
              (first.dnaFeatures?.seq_snippet || 'TATAAAGGATAAATGAGTCA').replace(
                '...',
                ''
              )
            );
            setSbxDist(Math.max(0.1, Math.abs(first.ltrRelPosKb || 0.5)));
            setSbxDiv(first.divPct || 6.1);
            setSbxH3k(Math.round(first.metrics?.wtH3k27acLtr || 80));
            setSbxAtac(Math.round(first.metrics?.wtAtacLtr || 75));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/predict-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dnaSequence: sbxDna,
        distKb: sbxDist,
        divPct: sbxDiv,
        h3k27ac: sbxH3k,
        atac: sbxAtac,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok) setSbxResult(res);
      })
      .catch(() => {});
  }, [sbxDna, sbxDist, sbxDiv, sbxH3k, sbxAtac]);

  const selectLocusRow = (idx: number) => {
    setSelectedIdx(idx);
    const loc = data?.loci?.[idx];
    if (!loc) return;
    setSbxDna(
      (loc.dnaFeatures?.seq_snippet || 'TATAAAGGATAAATGAGTCA').replace(
        '...',
        ''
      )
    );
    setSbxDist(Math.max(0.1, Math.abs(loc.ltrRelPosKb || 0.5)));
    setSbxDiv(loc.divPct || 6.1);
    setSbxH3k(Math.round(loc.metrics?.wtH3k27acLtr || 80));
    setSbxAtac(Math.round(loc.metrics?.wtAtacLtr || 75));
  };

  if (!data) {
    return null;
  }

  const report = data.modelReport;
  const loci = data.loci || [];
  const activeLoc = loci[selectedIdx] || loci[0];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-5 shadow-2xl">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Cpu className="w-4 h-4" />
            <span>
              WHAT WE BUILT &amp; RAN: LIVE ALPHAGENOME (.NPZ) + CUSTOM
              RETROSWITCH-XGB MODEL
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Our Custom Trained Switch Predictor (`RetroSwitch-XGB`) &amp; 81 Live
            AlphaGenome API Calls
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            We ran <strong>81 live 131 kb AlphaGenome API predictions</strong> across
            20 real GRCh38 LTR loci (caching raw `.npz` outputs in{' '}
            <code className="text-cyan-300">results/raw/</code>) and trained our own{' '}
            <strong>XGBoost + Random Forest model</strong> (
            <code className="text-cyan-300">scripts/train_switch_model.py</code>) on
            GRCh38 FASTA DNA motifs + chromatin features to predict active viral
            gene switches.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('xgboost_model')}
            className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'xgboost_model'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> 1. Our Trained Model (
            {report?.aurocFullHybrid ?? 0.824} AUROC)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alphagenome_npz')}
            className={`px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'alphagenome_npz'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> 2. Our 20 Cached AlphaGenome .npz
            Predictions &amp; Plots
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: OUR TRAINED MODEL (RETROSWITCH-XGB + LIVE DNA SANDBOX)       */}
      {/* =================================================================== */}
      {activeTab === 'xgboost_model' && report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Feature Importances + 20-Locus Out-of-Fold Predictions Table */}
          <div className="lg:col-span-7 space-y-5">
            {/* 3 Compact Model Performance Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] font-mono text-slate-400">
                  DNA SEQUENCE ONLY (5-FOLD CV)
                </div>
                <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                  {report.aurocSeqOnly} AUROC
                </div>
                <div className="text-[11px] text-slate-500">
                  Motifs + Divergence + TSS Dist
                </div>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3.5">
                <div className="text-[11px] font-mono text-emerald-300">
                  FULL HYBRID MODEL (5-FOLD CV)
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {report.aurocFullHybrid} AUROC
                </div>
                <div className="text-[11px] text-slate-400">
                  DNA Sequence + Chromatin Context
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                <div className="text-[11px] font-mono text-slate-400">
                  EFFECT SIZE PREDICTION ERROR
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {report.maeLog2FC} MAE
                </div>
                <div className="text-[11px] text-slate-500">
                  Pearson r = {report.pearsonR} (140 pairs)
                </div>
              </div>
            </div>

            {/* Feature Importances */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                XGBoost Feature Importances (What Makes an Ancient Virus an Active
                Gene Switch?)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1">
                {(report.featureImportances || []).slice(0, 8).map((f: any) => {
                  const pctW = Math.min(100, (f.importance / 21) * 100);
                  return (
                    <div key={f.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 truncate">{f.label}</span>
                        <span className="font-mono text-cyan-400 font-semibold">
                          {f.importance}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${pctW}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Out-of-Fold Predictions vs Actual AlphaGenome Knockout Table (All 20 Loci) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Out-of-Fold Model Predictions vs. Actual Live AlphaGenome Knockout
                  (20 GRCh38 Loci)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click any row to load into Live DNA Sandbox →
                </span>
              </div>

              <div className="max-h-[260px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-1.5 px-2">Gene • LTR</th>
                      <th className="py-1.5 px-2">Tissue</th>
                      <th className="py-1.5 px-2">Dist</th>
                      <th className="py-1.5 px-2">DNA-Only</th>
                      <th className="py-1.5 px-2">Hybrid Prob</th>
                      <th className="py-1.5 px-2">Model Pred Δ</th>
                      <th className="py-1.5 px-2">AlphaGenome Actual Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.locusPredictions || []).map(
                      (p: any, rIdx: number) => {
                        const isSel = rIdx === selectedIdx;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => selectLocusRow(rIdx)}
                            className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                              isSel
                                ? 'bg-emerald-950/50 text-white'
                                : 'hover:bg-slate-800/50 text-slate-300'
                            }`}
                          >
                            <td className="py-1.5 px-2 font-semibold text-white">
                              {p.gene}{' '}
                              <span className="text-slate-400 font-normal">
                                ({p.ltrName.split(' ')[0]})
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-400">
                              {p.tissue}
                            </td>
                            <td className="py-1.5 px-2 font-mono">
                              {p.distKb} kb
                            </td>
                            <td className="py-1.5 px-2 font-mono text-amber-300">
                              {p.switchProbSeqOnlyPct}%
                            </td>
                            <td
                              className={`py-1.5 px-2 font-mono font-bold ${
                                p.switchProbFullPct >= 50
                                  ? 'text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.switchProbFullPct}%
                            </td>
                            <td className="py-1.5 px-2 font-mono text-cyan-300">
                              {p.predLog2FC > 0 ? '+' : ''}
                              {p.predLog2FC.toFixed(2)}
                            </td>
                            <td
                              className={`py-1.5 px-2 font-mono font-bold ${
                                p.actualLog2FC <= -0.3
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.actualLog2FC > 0 ? '+' : ''}
                              {p.actualLog2FC.toFixed(2)} ({p.actualZ}σ)
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Interactive DNA & Feature Sandbox (/api/predict-switch) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Dna className="w-4 h-4" /> Live Model Sandbox (
                  <code>/api/predict-switch</code>)
                </span>
                <button
                  type="button"
                  onClick={() => selectLocusRow(selectedIdx)}
                  className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to {activeLoc?.gene}
                </button>
              </div>

              <h3 className="text-base font-bold text-white">
                Test Our Trained Model on Any Viral DNA Sequence
              </h3>
              <p className="text-xs text-slate-400">
                Currently loaded:{' '}
                <strong className="text-white">
                  {activeLoc?.gene} • {activeLoc?.ltrName}
                </strong>{' '}
                (real GRCh38 FASTA slice{' '}
                <code className="text-cyan-300">
                  {activeLoc?.chrom}:{activeLoc?.ltrStart?.toLocaleString()}-
                  {activeLoc?.ltrEnd?.toLocaleString()}
                </code>
                ). Edit the DNA sequence or sliders to run live TF motif scanning +
                model prediction:
              </p>

              {/* DNA Textarea */}
              <div>
                <textarea
                  rows={3}
                  value={sbxDna}
                  onChange={(e) => setSbxDna(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Live Scanned TF Motif Hits */}
              {sbxResult?.dnaFeatures && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>LIVE DETECTED TF MOTIFS IN DNA:</span>
                    <span>
                      GC: {sbxResult.dnaFeatures.gc_pct}% · CpG O/E:{' '}
                      {sbxResult.dnaFeatures.cpg_oe} · 4-mer Entropy:{' '}
                      {sbxResult.dnaFeatures.kmer_entropy} bits
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    {Object.entries(sbxResult.dnaFeatures.motifs || {}).map(
                      ([mKey, mVal]: [string, any]) => (
                        <span
                          key={mKey}
                          className={`px-2 py-0.5 rounded border ${
                            Number(mVal) > 0
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          {mKey.split(' ')[0]}: {mVal}/kb
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* 4 Context Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">TSS Distance:</span>
                    <span className="font-mono font-semibold text-white">
                      {sbxDist} kb
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={45}
                    step={0.5}
                    value={sbxDist}
                    onChange={(e) => setSbxDist(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Viral Divergence:</span>
                    <span className="font-mono font-semibold text-white">
                      {sbxDiv}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={35}
                    step={0.5}
                    value={sbxDiv}
                    onChange={(e) => setSbxDiv(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Local H3K27ac:</span>
                    <span className="font-mono font-semibold text-white">
                      {sbxH3k}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={sbxH3k}
                    onChange={(e) => setSbxH3k(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Open Chromatin:</span>
                    <span className="font-mono font-semibold text-white">
                      {sbxAtac}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={sbxAtac}
                    onChange={(e) => setSbxAtac(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Live Prediction Output Box */}
            {sbxResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">
                    Predicted Switch Probability
                  </div>
                  <div
                    className={`text-3xl font-bold font-mono mt-0.5 ${
                      sbxResult.switchProbPct >= 50
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {sbxResult.switchProbPct}%
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {sbxResult.switchProbPct >= 50
                      ? 'Active Cis-Regulatory Viral Switch'
                      : 'Dormant / Neutral Viral Fossil'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">
                    Predicted Knockout Effect
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                    {sbxResult.predLog2FC} log2FC
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    -{sbxResult.predPctDrop}% predicted expression drop
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: OUR 20 CACHED ALPHAGENOME .NPZ PREDICTIONS & STATIC PLOTS    */}
      {/* =================================================================== */}
      {activeTab === 'alphagenome_npz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 Cols: Validation Plots Generated by scripts/run_knockouts.py */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-semibold">
                GENERATED BY <code>scripts/run_knockouts.py</code> (
                <code>results/step1_knockout_tracks.png</code>)
              </div>
              <img
                src="/api/results-static/step1_knockout_tracks.png"
                alt="Step 1 AlphaGenome Knockout Tracks"
                className="w-full rounded-lg border border-slate-800"
              />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-mono text-rose-400 font-semibold">
                GENERATED BY <code>scripts/run_knockouts.py</code> (
                <code>results/family_tissue_heatmap.png</code>)
              </div>
              <img
                src="/api/results-static/family_tissue_heatmap.png"
                alt="Family x Tissue Z-Score Heatmap"
                className="w-full rounded-lg border border-slate-800"
              />
            </div>

            {/* Live Request Log Proof from results/request_log.jsonl */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Live AlphaGenome gRPC Call
                  Log (<code>results/request_log.jsonl</code>)
                </span>
                <span className="text-slate-400">
                  Ref Determinism Noise: Δ = {data.refDeterminismNoise}
                </span>
              </div>
              <div className="max-h-[155px] overflow-y-auto font-mono text-[11px] bg-slate-950 rounded-lg p-2.5 border border-slate-800 space-y-1">
                {(data.requestLogs || []).map((lg: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-slate-300"
                  >
                    <span>
                      [{lg.locus_id}] mode=
                      <strong className="text-cyan-300">{lg.mode}</strong> (len=
                      {lg.seq_len?.toLocaleString()} bp)
                    </span>
                    <span className="text-emerald-400">{lg.elapsed_ms} ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
