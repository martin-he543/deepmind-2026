import React, { useEffect, useState } from 'react';
import {
  ErvLocusRecord,
  TissueOntology,
  GroundedGeminiExplanation,
} from '../data/ervLociData';
import { Send, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GeminiInterpreterPanelProps {
  locus: ErvLocusRecord;
  tissue: TissueOntology;
}

export const GeminiInterpreterPanel: React.FC<GeminiInterpreterPanelProps> = ({
  locus,
  tissue,
}) => {
  const [explanation, setExplanation] = useState<GroundedGeminiExplanation>(
    locus.defaultExplanation
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLiveGenerated, setIsLiveGenerated] = useState(false);

  const metrics = locus.tissueMetrics[tissue];

  // Reset to locus default grounded explanation when locus changes
  useEffect(() => {
    setExplanation(locus.defaultExplanation);
    setIsLiveGenerated(false);
    setErrorMsg(null);
  }, [locus]);

  const handleSynthesizeWithGemini = async (questionOverride?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/gemini/explain-locus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locusId: locus.id,
          repeatName: locus.repeatName,
          familyClass: locus.familyClass,
          ncbiContig: locus.ncbiContig,
          hg38Coordinates: `${locus.chrom}:${locus.ltrStart}-${locus.ltrEnd}`,
          ltrLengthBp: locus.ltrLengthBp,
          percDiv: locus.percDiv,
          estimatedAgeMya: locus.estimatedAgeMya,
          nearestGene: locus.nearestGene,
          distanceToTssBp: locus.distanceToTssBp,
          strand: locus.strand,
          selectedTissue: tissue,
          metrics,
          userQuestion: (questionOverride ?? customQuestion).trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      setExplanation(data.explanation);
      setIsLiveGenerated(true);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Unable to reach server-side Gemini endpoint.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Constrained Plain-English Interpreter</span>
            <span aria-hidden="true">·</span>
            <span>Grounded in AlphaGenome Output</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-teal-700">
              {isLiveGenerated ? 'Live Gemini Synthesis' : 'Cached Grounded Synthesis'}
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            Biological Mechanism &amp; Epistemic Audit ({locus.nearestGene} in {tissue})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => handleSynthesizeWithGemini()}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Synthesizing...' : 'Re-Synthesize for Selected Tissue'}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split Layout: Left = Structured Numbers Contract, Right = Plain-English Gemini Synthesis */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (5 cols): Authoritative AlphaGenome Numbers & Annotations */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>Structured AlphaGenome Input Payload</span>
              <span className="font-mono text-[11px] text-slate-500">ltrs.parquet + .npz</span>
            </div>

            <dl className="mt-2.5 space-y-1.5 text-xs font-mono tabular-nums">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Repeat / Family:</dt>
                <dd className="text-slate-900 font-semibold">
                  {locus.repeatName} ({locus.familyClass})
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Contig Mapping:</dt>
                <dd className="text-slate-800">
                  {locus.ncbiContig} → {locus.chrom}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Divergence (Age):</dt>
                <dd className="text-slate-900">
                  {locus.percDiv}% (~{locus.estimatedAgeMya} MYA)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Target TSS Distance:</dt>
                <dd className="text-slate-900">
                  {locus.nearestGene} ({locus.distanceToTssBp.toLocaleString()} bp, {locus.strand})
                </dd>
              </div>
              <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-200">
                <dt className="text-slate-500">RNA-seq ΔLTR Effect:</dt>
                <dd
                  className={`font-bold ${
                    metrics.percentDrop < -25 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {metrics.rnaLog2FC.toFixed(2)} log2FC ({metrics.percentDrop}%)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">CAGE / H3K27ac Δ:</dt>
                <dd className="text-slate-900">
                  {metrics.cageDeltaPct}% / {metrics.h3k27acDeltaPct}%
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Z vs Random Control:</dt>
                <dd className="text-blue-700 font-semibold">
                  Z = {metrics.zScoreRandom.toFixed(2)} (p = {metrics.pValueRandom})
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Z vs Alu/L1 Repeat:</dt>
                <dd className="text-teal-700 font-semibold">
                  Z = {metrics.zScoreRepeat.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">3D Contact Loop O/E:</dt>
                <dd className="text-slate-900">
                  {metrics.loopScoreRef.toFixed(2)} → {metrics.loopScoreKo.toFixed(2)} (
                  {metrics.loopDistanceNmRef}nm → {metrics.loopDistanceNmKo}nm)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Ref Determinism Δ:</dt>
                <dd className="text-emerald-700">
                  {metrics.determinismMaxDiff.toFixed(4)} (Exact)
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Gemini is strictly constrained to the numeric payload above.</span>
          </div>
        </div>

        {/* Right Column (7 cols): Plain-English Explanation & Interactive Hypothesis Query */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
              <div className="text-[11px] font-mono text-blue-800 font-semibold">
                01. Headline Knockout Effect
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">
                {explanation.headlineSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="text-[11px] font-mono text-slate-500 font-semibold">
                  02. Evolutionary Context &amp; Viral Co-Option
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {explanation.evolutionaryContext}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="text-[11px] font-mono text-slate-500 font-semibold">
                  03. Regulatory &amp; 3D Looping Mechanism
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {explanation.knockoutMechanism}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <div className="text-[11px] font-mono text-amber-900 font-semibold">
                04. Known Limits, Mappability &amp; Control Calibration
              </div>
              <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">
                {explanation.modelCaveatAndReliability}
              </p>
              {explanation.directAnswerToQuestion && (
                <p className="text-xs text-teal-900 font-medium mt-1.5 pt-1.5 border-t border-amber-200/70">
                  Note: {explanation.directAnswerToQuestion}
                </p>
              )}
            </div>
          </div>

          {/* Ask Gemini a Specific Question Grounded in This Locus */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSynthesizeWithGemini();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={`Ask Gemini about ${locus.repeatName} → ${locus.nearestGene} (e.g., "How would we validate this with CRISPRi?")`}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Ask Gemini
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
