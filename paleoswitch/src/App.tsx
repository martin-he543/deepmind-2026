import React, { useState } from 'react';
import {
  ALL_TISSUES,
  ERV_LOCI_DATASET,
  ErvFamilyClass,
  ErvLocusRecord,
  TissueOntology,
} from './data/ervLociData';
import { GenomeTrackBrowser } from './components/GenomeTrackBrowser';
import {
  ChromatinAndProtein3DStage,
  ThreeSceneMode,
} from './components/ChromatinAndProtein3DStage';
import { GeminiInterpreterPanel } from './components/GeminiInterpreterPanel';
import { FamilyTissueHeatmapSection } from './components/FamilyTissueHeatmapSection';
import { MethodologyAndParquetSection } from './components/MethodologyAndParquetSection';
import {
  GUIDED_DEMO_STEPS,
  GuidedDemoWalkthrough,
} from './components/GuidedDemoWalkthrough';
import { InSilicoMutagenesisShowcase } from './components/InSilicoMutagenesisShowcase';
import { Play, Scissors, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedLocus, setSelectedLocus] = useState<ErvLocusRecord>(
    ERV_LOCI_DATASET[0]
  );
  const [selectedTissue, setSelectedTissue] = useState<TissueOntology>(
    ERV_LOCI_DATASET[0].primaryTissue
  );
  const [isVirusDeleted, setIsVirusDeleted] = useState<boolean>(false);
  const [recenterOnTss, setRecenterOnTss] = useState<boolean>(true);
  const [threeMode, setThreeMode] = useState<ThreeSceneMode>('chromatin_loop');

  // Interactive Guided Demo State
  const [demoOpen, setDemoOpen] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);

  const currentMetrics = selectedLocus.tissueMetrics[selectedTissue];

  const handleSelectLocus = (locus: ErvLocusRecord, keepTissue = false) => {
    setSelectedLocus(locus);
    if (!keepTissue) {
      setSelectedTissue(locus.primaryTissue);
    }
  };

  const handleApplyDemoStep = (index: number) => {
    const clampedIdx = Math.max(0, Math.min(GUIDED_DEMO_STEPS.length - 1, index));
    const step = GUIDED_DEMO_STEPS[clampedIdx];
    setDemoStepIndex(clampedIdx);
    const targetLocus =
      ERV_LOCI_DATASET.find((l) => l.id === step.locusId) ?? ERV_LOCI_DATASET[0];
    setSelectedLocus(targetLocus);
    setSelectedTissue(step.tissue);
    setIsVirusDeleted(step.isVirusDeleted);
    setRecenterOnTss(step.recenterOnTss);
    setThreeMode(step.threeMode);

    const el = document.getElementById(step.scrollTargetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartDemo = () => {
    setDemoOpen(true);
    handleApplyDemoStep(0);
  };

  const handleSelectFamilyAndTissueFromMatrix = (
    family: ErvFamilyClass,
    tissue: TissueOntology
  ) => {
    setSelectedTissue(tissue);
    const matchingLocus =
      ERV_LOCI_DATASET.find(
        (l) => l.familyClass === family && l.primaryTissue === tissue
      ) ??
      ERV_LOCI_DATASET.find((l) => l.familyClass === family) ??
      selectedLocus;
    setSelectedLocus(matchingLocus);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          PaleoSwitch
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#section-locus-explorer"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Locus Explorer
          </a>
          <a
            href="#section-3d-stage"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Chromatin &amp; Protein
          </a>
          <a
            href="#section-heatmap-matrix"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Family × Tissue Matrix
          </a>
          <a
            href="#section-parquet-limits"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Data &amp; Limits
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleStartDemo}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Interactive Demo
          </button>
        </div>
      </header>

      {/* Main Workbench Container (1440px max width) */}
      <main id="top" className="max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6 flex-1">
        {/* Hero & Quick-Try Experiment Control Console */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Endogenous Retrovirus (ERV) Virtual Knockout Atlas</span>
                <span aria-hidden="true">·</span>
                <span>UCSC rmsk / NCBI rm.out (GRCh38)</span>
                <span aria-hidden="true">·</span>
                <span>AlphaGenome + Gemini Grounded Synthesis</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Which ancient viruses still switch human genes on?
              </h1>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                About 8% of the human genome is viral DNA from ancient retroviral
                infections. RepeatMasker already annotates where their Long Terminal
                Repeats (LTRs) sit. We perform <strong>in-silico virtual knockouts</strong>{' '}
                with AlphaGenome—predicting regulatory tracks before and after deleting
                each LTR—to measure which viral families still act as active gene
                switches across human tissues.
              </p>
            </div>

            {/* Hero Primary Interactive Action Cluster */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-mono text-slate-500">
                CORE EXPERIMENT: VIRTUAL KNOCKOUT
              </div>
              <button
                type="button"
                onClick={() => setIsVirusDeleted((d) => !d)}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isVirusDeleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isVirusDeleted ? (
                  <>
                    <RefreshCw className="w-4 h-4" /> Restore Wild-Type Virus (Ref)
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" /> Delete Virus ({selectedLocus.repeatName}{' '}
                    ΔLTR)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartDemo}
                className="w-full py-2 px-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Walk Me Through the
                6-Step Demo
              </button>
            </div>
          </div>

          {/* Quick-Try Positive Sanity Checks & Candidate Loci Selector */}
          <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                1. Select ERV Locus (Literature Sanity Checks, ALS Candidates &amp; Silent Controls):
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Active: {selectedLocus.id} ({selectedLocus.chrom}:
                {selectedLocus.ltrStart.toLocaleString()}-
                {selectedLocus.ltrEnd.toLocaleString()})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ERV_LOCI_DATASET.map((loc) => {
                const active = loc.id === selectedLocus.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocus(loc, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {loc.shortLabel} · <span className="font-mono">{loc.familyClass}</span>
                  </button>
                );
              })}
            </div>

            {/* Tissue Ontology Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-xs font-semibold text-slate-700">
                2. Select Biosample / Tissue Ontology:
              </span>
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {ALL_TISSUES.map((t) => {
                  const active = t === selectedTissue;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTissue(t)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Telemetry Strip */}
          <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-500">
                PREDICTED {selectedLocus.nearestGene} EXPRESSION Δ
              </div>
              <div className="mt-1 flex items-baseline">
                <span
                  className={`text-2xl font-mono font-bold tabular-nums ${
                    currentMetrics.percentDrop < -25
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {currentMetrics.percentDrop > 0
                    ? `+${currentMetrics.percentDrop}`
                    : currentMetrics.percentDrop}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">
                  % ({currentMetrics.rnaLog2FC.toFixed(2)} log2FC)
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                CAGE TSS Δ: {currentMetrics.cageDeltaPct}% · H3K27ac:{' '}
                {currentMetrics.h3k27acDeltaPct}%
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-500">
                EMPIRICAL CONTROL CALIBRATION
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-blue-700">
                  Z = {currentMetrics.zScoreRandom.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">
                  p = {currentMetrics.pValueRandom}
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                vs. Alu/L1 Repeat Ctrl: Z = {currentMetrics.zScoreRepeat.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-500">
                3D ENHANCER–PROMOTER CONTACT
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-teal-700">
                  {currentMetrics.loopScoreRef.toFixed(2)} →{' '}
                  {currentMetrics.loopScoreKo.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">O/E</span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                3D Distance: {currentMetrics.loopDistanceNmRef} nm →{' '}
                {currentMetrics.loopDistanceNmKo} nm
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-500">
                VIRAL ELEMENT &amp; EVOLUTIONARY AGE
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-slate-900">
                  {selectedLocus.percDiv.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">
                  % div (~{selectedLocus.estimatedAgeMya} MYA)
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                {selectedLocus.repeatName} ({selectedLocus.ltrLengthBp} bp,{' '}
                {selectedLocus.distanceToTssBp.toLocaleString()} bp to TSS)
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Virtual Knockout Genome Browser + Gemini Grounded Synthesis */}
        <section id="section-locus-explorer" className="space-y-6 scroll-mt-20">
          <GenomeTrackBrowser
            locus={selectedLocus}
            tissue={selectedTissue}
            isVirusDeleted={isVirusDeleted}
            onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
            recenterOnTss={recenterOnTss}
            onToggleRecenter={() => setRecenterOnTss((r) => !r)}
          />

          <GeminiInterpreterPanel
            locus={selectedLocus}
            tissue={selectedTissue}
          />

          <InSilicoMutagenesisShowcase
            locus={selectedLocus}
            tissue={selectedTissue}
          />
        </section>

        {/* Section 2: 3D Chromatin Loop, AlphaFold Protein Structure & Contact Relief */}
        <section id="section-3d-stage" className="space-y-3 scroll-mt-20">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Interactive 3D WebGL Spatial Workbench</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Driven by AlphaGenome Contact O/E &amp; Live AlphaFold DB pLDDT
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                  3D Chromatin Loop Reconstruction, AlphaFold Protein (
                  {selectedLocus.uniprotId}) &amp; Hi-C Contact Relief
                </h2>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Drag to orbit · Scroll to zoom · Press H to toggle 3D dock
              </div>
            </div>

            <ChromatinAndProtein3DStage
              locus={selectedLocus}
              tissue={selectedTissue}
              isVirusDeleted={isVirusDeleted}
              onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
              activeSceneMode={threeMode}
              onSceneModeChange={setThreeMode}
            />
          </div>
        </section>

        {/* Section 3: ERV Family × Tissue Summary Heatmap & Empirical Controls */}
        <section id="section-heatmap-matrix" className="scroll-mt-20">
          <FamilyTissueHeatmapSection
            selectedTissue={selectedTissue}
            onSelectFamilyAndTissue={handleSelectFamilyAndTissueFromMatrix}
          />
        </section>

        {/* Section 4: ltrs.parquet Contract Table, Pipeline Architecture & Known Limits */}
        <section id="section-parquet-limits" className="scroll-mt-20">
          <MethodologyAndParquetSection
            selectedLocusId={selectedLocus.id}
            selectedTissue={selectedTissue}
            onSelectLocus={(loc) => handleSelectLocus(loc, true)}
          />
        </section>
      </main>

      {/* Quiet Scientific Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            PaleoSwitch — Endogenous Retrovirus Virtual Knockout Workbench · GRCh38 /
            hg38 RepeatMasker &amp; AlphaGenome Atlas Integration
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleStartDemo}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Launch 6-Step Guided Walkthrough
            </button>
            <a
              href="https://deepmind.google.com/science/alphagenome/atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 hover:underline"
            >
              AlphaGenome Atlas
            </a>
            <a
              href="https://alphafold.ebi.ac.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 hover:underline"
            >
              AlphaFold DB
            </a>
          </div>
        </div>
      </footer>

      {/* Guided Hackathon Demo Walkthrough Floating Controller */}
      <GuidedDemoWalkthrough
        isOpen={demoOpen}
        currentStepIndex={demoStepIndex}
        onSelectStep={handleApplyDemoStep}
        onClose={() => setDemoOpen(false)}
      />
    </div>
  );
}
