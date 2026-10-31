import React, { useEffect, useState } from 'react';
import {
  ALL_TISSUES,
  ERV_LOCI_DATASET,
  ErvLocusRecord,
  TissueOntology,
} from './data/ervLociData';
import {
  ChromatinAndProtein3DStage,
  ThreeSceneMode,
} from './components/ChromatinAndProtein3DStage';
import {
  GUIDED_DEMO_STEPS,
  GuidedDemoWalkthrough,
} from './components/GuidedDemoWalkthrough';
import { LivingEpigenetic3DStage } from './components/LivingEpigenetic3DStage';
import { OurPredictionsAndModelSection } from './components/OurPredictionsAndModelSection';
import {
  Scissors,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Cpu,
} from 'lucide-react';

export default function App() {
  const [selectedLocus, setSelectedLocus] = useState<ErvLocusRecord>(
    ERV_LOCI_DATASET[0]
  );
  const [selectedTissue, setSelectedTissue] = useState<TissueOntology>(
    ERV_LOCI_DATASET[0].primaryTissue
  );
  const [isVirusDeleted, setIsVirusDeleted] = useState<boolean>(false);
  const [threeMode, setThreeMode] = useState<ThreeSceneMode>('chromatin_loop');
  const [activeMainView, setActiveMainView] = useState<'3d_stage' | 'our_model'>(
    '3d_stage'
  );
  const [hero3DStyle, setHero3DStyle] = useState<
    'epigenetic_fire' | 'alphafold_stage'
  >('epigenetic_fire');

  // Interactive 6-Step Guided Demo State
  const [demoOpen, setDemoOpen] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);

  const activeStep = GUIDED_DEMO_STEPS[demoStepIndex] ?? GUIDED_DEMO_STEPS[0];

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
    setThreeMode(step.threeMode);
    setActiveMainView(step.activeMainView);
  };

  // Allow Right Arrow / Left Arrow keys to step through the 2-minute live pitch effortlessly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        setDemoStepIndex((prev) => {
          const next = Math.min(GUIDED_DEMO_STEPS.length - 1, prev + 1);
          handleApplyDemoStep(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setDemoStepIndex((prev) => {
          const next = Math.max(0, prev - 1);
          handleApplyDemoStep(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* Clean Top Bar: Only the 2 Core Views + Locus Pills + Delete Virus */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-base font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            PaleoSwitch 3D
          </div>

          {/* 2 Core View Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMainView('3d_stage')}
              className={`px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeMainView === '3d_stage'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> 1. 3D Chromatin &amp; Viral Helix
              Simulation
            </button>
            <button
              type="button"
              onClick={() => setActiveMainView('our_model')}
              className={`px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeMainView === 'our_model'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> 2. Our Model (`RetroSwitch-XGB`) &amp;
              81 AlphaGenome Calls
            </button>
          </div>
        </div>

        {/* Quick Locus Pills */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {ERV_LOCI_DATASET.slice(0, 6).map((loc) => {
            const active = loc.id === selectedLocus.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelectLocus(loc, false)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {loc.nearestGene} ({loc.repeatName})
              </button>
            );
          })}
        </div>

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
        </div>
      </header>

      {/* Main Workspace: Guided Demo Stepper + Active Core View (No Extra Bottom Clutter!) */}
      <main
        id="top"
        className="max-w-[1480px] w-full mx-auto px-5 py-4 space-y-4 flex-1"
      >
        {/* 1-Click Synchronized Presentation Stepper (Steps 1..6 -> Click "Next Step ▶" or press Right Arrow!) */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 text-slate-100 flex flex-col gap-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold mr-1">
                2-Min Live Demo (Press → or Click Next):
              </span>
              {GUIDED_DEMO_STEPS.map((st, idx) => {
                const isCurr = idx === demoStepIndex;
                return (
                  <button
                    key={st.stepNumber}
                    type="button"
                    onClick={() => handleApplyDemoStep(idx)}
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

            <div className="flex flex-wrap items-center gap-2">
              {activeMainView === '3d_stage' && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setHero3DStyle('epigenetic_fire')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      hero3DStyle === 'epigenetic_fire'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Living Epigenetic 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setHero3DStyle('alphafold_stage')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      hero3DStyle === 'alphafold_stage'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AlphaFold Protein ({selectedLocus.uniprotId})
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDemoStep(demoStepIndex - 1)}
                  disabled={demoStepIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDemoStep(demoStepIndex + 1)}
                  disabled={demoStepIndex === GUIDED_DEMO_STEPS.length - 1}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1 shadow-md cursor-pointer"
                >
                  Next Step ({ Math.min(6, demoStepIndex + 2) }/6){' '}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/90">
            <div className="space-y-0.5 max-w-4xl">
              <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                <span className="text-rose-400 font-mono">
                  [{activeStep.subtitle.split('·')[0].trim()}]
                </span>
                <span>{activeStep.title}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {activeStep.keyTakeaway}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeStep.narrative}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-slate-400">Tissue:</span>
              <select
                value={selectedTissue}
                onChange={(e) =>
                  setSelectedTissue(e.target.value as TissueOntology)
                }
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

        {/* CORE VIEW 1: 3D SIMULATION (Active on Steps 1, 2, 3, 4) */}
        {activeMainView === '3d_stage' &&
          (hero3DStyle === 'epigenetic_fire' ? (
            <LivingEpigenetic3DStage
              locus={selectedLocus}
              tissue={selectedTissue}
              isVirusDeleted={isVirusDeleted}
              onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
              externalPerturbMode={activeStep.perturbMode3D}
              externalCameraFocus={activeStep.cameraFocus3D}
            />
          ) : (
            <div className="bg-white rounded-2xl p-4 text-slate-900">
              <ChromatinAndProtein3DStage
                locus={selectedLocus}
                tissue={selectedTissue}
                isVirusDeleted={isVirusDeleted}
                onToggleDeleteVirus={() => setIsVirusDeleted((d) => !d)}
                activeSceneMode={threeMode}
                onSceneModeChange={setThreeMode}
              />
            </div>
          ))}

        {/* CORE VIEW 2: OUR TRAINED MODEL & 81 ALPHAGENOME .NPZ CALLS (Active on Steps 5 & 6) */}
        {activeMainView === 'our_model' && (
          <OurPredictionsAndModelSection
            externalTab={activeStep.modelSubTab}
          />
        )}
      </main>

      <GuidedDemoWalkthrough
        isOpen={demoOpen}
        currentStepIndex={demoStepIndex}
        onSelectStep={(idx) => handleApplyDemoStep(idx)}
        onClose={() => setDemoOpen(false)}
      />
    </div>
  );
}
