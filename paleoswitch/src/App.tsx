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
import { LivingEpigenetic3DStage } from './components/LivingEpigenetic3DStage';
import { OurPredictionsAndModelSection } from './components/OurPredictionsAndModelSection';
import {
  Play,
  Scissors,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Box,
} from 'lucide-react';

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
  const [hero3DStyle, setHero3DStyle] = useState<'epigenetic_fire' | 'alphafold_stage'>(
    'epigenetic_fire'
  );

  // Interactive Guided Demo State
  const [demoOpen, setDemoOpen] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);

  const activeStep = GUIDED_DEMO_STEPS[demoStepIndex] ?? GUIDED_DEMO_STEPS[0];

  const handleSelectLocus = (locus: ErvLocusRecord, keepTissue = false) => {
    setSelectedLocus(locus);
    if (!keepTissue) {
      setSelectedTissue(locus.primaryTissue);
    }
  };

  const handleApplyDemoStep = (index: number, autoScroll = false) => {
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

    if (step.threeMode === 'protein_alphafold' || step.threeMode === 'contact_surface') {
      setHero3DStyle('alphafold_stage');
    }

    if (autoScroll) {
      const el = document.getElementById(step.scrollTargetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleStartDemo = () => {
    setDemoOpen(true);
    handleApplyDemoStep(0, false);
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
    <div className="min-h-screen bg-[#0B0F19] text-slate-900 flex flex-col">
      {/* Compact Sticky Top Navigation & Demo Control Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-slate-100">
        <div className="flex items-center gap-4">
          <a
            href="#top"
            className="text-base font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            PaleoSwitch 3D
          </a>

          {/* Compact Locus Selector Pills right in Header */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {ERV_LOCI_DATASET.slice(0, 7).map((loc) => {
              const active = loc.id === selectedLocus.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleSelectLocus(loc, false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {loc.nearestGene} ({loc.repeatName})
                </button>
              );
            })}
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
          <a
            href="#section-3d-stage"
            className="text-rose-400 hover:text-rose-300 font-semibold transition-colors whitespace-nowrap"
          >
            1. 3D Stage
          </a>
          <a
            href="#section-our-model"
            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors whitespace-nowrap"
          >
            ★ 2. Our Model &amp; .npz Run
          </a>
          <a
            href="#section-locus-explorer"
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            3. Knockout Tracks &amp; Gemini
          </a>
          <a
            href="#section-heatmap-matrix"
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            4. Family × Tissue Matrix
          </a>
          <a
            href="#section-parquet-limits"
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            5. Pipeline &amp; Limits
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsVirusDeleted((d) => !d)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              isVirusDeleted
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isVirusDeleted ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Restore Virus (WT)
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" /> Delete Virus (ΔLTR)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStartDemo}
            className="px-3 py-1.5 text-xs font-semibold text-sky-300 bg-sky-950/90 hover:bg-sky-900 border border-sky-500/40 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            Floating Guide
          </button>
        </div>
      </header>

      {/* Main Container: Starts IMMEDIATELY with the Guided Demo Stepper + 3D Stage */}
      <main id="top" className="max-w-[1480px] w-full mx-auto px-5 py-4 space-y-6 flex-1">
        {/* ================================================================= */}
        {/* HERO SECTION = GUIDED DEMO WALKTHROUGH + IMMEDIATE 3D VISUALS     */}
        {/* ================================================================= */}
        <section id="section-3d-stage" className="space-y-3 scroll-mt-16">
          {/* Guided Story Walkthrough Bar (Walks the audience through Step 1 -> Step 6) */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 text-slate-100 flex flex-col gap-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Step Pills 1..6 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold mr-1">
                  Guided Demo:
                </span>
                {GUIDED_DEMO_STEPS.map((st, idx) => {
                  const isCurr = idx === demoStepIndex;
                  return (
                    <button
                      key={st.stepNumber}
                      type="button"
                      onClick={() => handleApplyDemoStep(idx, false)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                        isCurr
                          ? 'bg-rose-600 text-white font-bold shadow'
                          : 'bg-slate-800/90 text-slate-400 hover:text-white'
                      }`}
                    >
                      Step {st.stepNumber}
                    </button>
                  );
                })}
              </div>

              {/* Switch between the two 3D Visual Engines right at the top */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setHero3DStyle('epigenetic_fire')}
                    className={`px-3 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hero3DStyle === 'epigenetic_fire'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Living Epigenetic Fire &amp; mRNA
                    3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setHero3DStyle('alphafold_stage')}
                    className={`px-3 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hero3DStyle === 'alphafold_stage'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" /> Chromatin Nucleosomes &amp; AlphaFold
                    ({selectedLocus.uniprotId})
                  </button>
                </div>

                {/* Prev / Next Step Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleApplyDemoStep(demoStepIndex - 1, false)}
                    disabled={demoStepIndex === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                    title="Previous Demo Step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDemoStep(demoStepIndex + 1, false)}
                    disabled={demoStepIndex === GUIDED_DEMO_STEPS.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Current Step Narrative & Quick Tissue Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/90">
              <div className="space-y-0.5 max-w-4xl">
                <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                  <span>
                    Step {activeStep.stepNumber}: {activeStep.title}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {activeStep.keyTakeaway}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeStep.narrative}
                </p>
              </div>

              {/* Compact Tissue Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-slate-400">Tissue:</span>
                <select
                  value={selectedTissue}
                  onChange={(e) => setSelectedTissue(e.target.value as TissueOntology)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                >
                  {ALL_TISSUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Immediate Full-Width 3D Visual Stage (Right at the top of the screen!) */}
          {hero3DStyle === 'epigenetic_fire' ? (
            <LivingEpigenetic3DStage
              locus={selectedLocus}
              tissue={selectedTissue}
              isVirusDeleted={isVirusDeleted}
              onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
              externalPerturbMode={activeStep.perturbMode3D}
              externalCameraFocus={activeStep.cameraFocus3D}
            />
          ) : (
            <ChromatinAndProtein3DStage
              locus={selectedLocus}
              tissue={selectedTissue}
              isVirusDeleted={isVirusDeleted}
              onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
              activeSceneMode={threeMode}
              onSceneModeChange={setThreeMode}
            />
          )}
        </section>

        {/* ================================================================= */}
        {/* SECTION: OUR TRAINED MODEL (RETROSWITCH-XGB) & 81 ALPHAGENOME RUN */}
        {/* ================================================================= */}
        <section id="section-our-model" className="scroll-mt-16">
          <OurPredictionsAndModelSection />
        </section>

        {/* ================================================================= */}
        {/* SUPPORTING SECTIONS BELOW THE 3D STAGE (On Light Surface Cards)   */}
        {/* ================================================================= */}
        <div className="bg-[#F8FAFC] rounded-2xl p-6 space-y-6">
          {/* Section 2: Virtual Knockout Genome Browser + Gemini Grounded Synthesis */}
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

          {/* Secondary 3D Stage (whichever isn't currently pinned at the top, so both remain on the page!) */}
          <section id="section-living-epigenetics" className="scroll-mt-20">
            {hero3DStyle === 'epigenetic_fire' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      3D Nucleosome Polymer, AlphaFold Protein ({selectedLocus.uniprotId}
                      ) &amp; Hi-C Relief
                    </h2>
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
            ) : (
              <LivingEpigenetic3DStage
                locus={selectedLocus}
                tissue={selectedTissue}
                isVirusDeleted={isVirusDeleted}
                onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
              />
            )}
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
        </div>
      </main>

      {/* Quiet Scientific Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-4 mt-6">
        <div className="max-w-[1480px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            PaleoSwitch — Endogenous Retrovirus Virtual Knockout Workbench · GRCh38 /
            hg38 RepeatMasker &amp; AlphaGenome Atlas Integration
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleStartDemo}
              className="text-sky-400 hover:underline font-medium cursor-pointer"
            >
              Launch 6-Step Guided Walkthrough
            </button>
            <a
              href="https://deepmind.google.com/science/alphagenome/atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white hover:underline"
            >
              AlphaGenome Atlas
            </a>
            <a
              href="https://alphafold.ebi.ac.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white hover:underline"
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
        onSelectStep={(idx) => handleApplyDemoStep(idx, true)}
        onClose={() => setDemoOpen(false)}
      />
    </div>
  );
}
