import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { TissueOntology } from '../data/ervLociData';
import { ThreeSceneMode } from './ChromatinAndProtein3DStage';

export type PerturbationMode3D =
  | 'wt'
  | 'motif_snv'
  | 'crispri_krab'
  | 'delta_ltr'
  | 'ctrl_alu';

export type CameraFocus3D = 'macro_loop' | 'viral_helix' | 'pol2_hub';

export interface DemoStepConfig {
  stepNumber: number;
  title: string;
  subtitle: string;
  narrative: string;
  keyTakeaway: string;
  locusId: string;
  tissue: TissueOntology;
  isVirusDeleted: boolean;
  recenterOnTss: boolean;
  threeMode: ThreeSceneMode;
  perturbMode3D: PerturbationMode3D;
  cameraFocus3D: CameraFocus3D;
  activeMainView: '3d_stage' | 'our_model';
  modelSubTab?: 'xgboost_model' | 'alphagenome_npz';
  scrollTargetId: string;
}

export const GUIDED_DEMO_STEPS: DemoStepConfig[] = [
  {
    stepNumber: 1,
    title: '8% of Your DNA is Ancient Virus — Visualized in 3D with AlphaGenome + Gemini 4 Argon',
    subtitle: 'Step 1 of 6 (0:00–0:25) · DeepMind AlphaGenome × Argon 3D Engine',
    narrative:
      '700,000 ancient viruses sit in human DNA. Most are dead fossils, but some still act as hidden power switches for our genes. We used Google DeepMind’s AlphaGenome as a virtual CRISPR lab, and used Gemini 4 Argon’s 3D coding capabilities to turn flat genomic matrices into this real-time 3D molecular theater—showing an ancient virus pulsing energy across a 3D loop to switch on the human placenta gene (Syncytin-1).',
    keyTakeaway:
      'Novelty: DeepMind AlphaGenome virtual knockouts + Argon-engineered 3D spatial biology.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'wt',
    cameraFocus3D: 'macro_loop',
    activeMainView: '3d_stage',
    scrollTargetId: 'top',
  },
  {
    stepNumber: 2,
    title: 'Flying Inside the Virus: Argon’s 3D DNA Double Helix & Single-Letter Mutation',
    subtitle: 'Step 2 of 6 (0:25–0:45) · Single-Base Resolution in 3D',
    narrative:
      'Pressing Next flies our Argon-built 3D camera right inside the ancient virus’s DNA double helix, where human proteins physically dock onto the viral groove. Because DeepMind’s AlphaGenome reads DNA down to a single letter, mutating just ONE base pair flashes crimson, detaches the protein, and cuts the gene’s output in half.',
    keyTakeaway:
      'Novelty: Watch a single-letter DNA mutation break protein binding in real-time 3D.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'motif_snv',
    cameraFocus3D: 'viral_helix',
    activeMainView: '3d_stage',
    scrollTargetId: 'top',
  },
  {
    stepNumber: 3,
    title: 'Virtual CRISPR Knockout: Shattering the Virus & Unwinding the 3D Loop',
    subtitle: 'Step 3 of 6 (0:45–1:05) · Full Viral Excision & 3D Floor Collapse',
    narrative:
      'Now we ask AlphaGenome to cut the entire virus out of the human genome. Watch the virus shatter into 40 glowing fragments, the 3D DNA loop physically unwind away from its cyan blueprint, the 3D contact mountain on the floor flatten, and our placental gene lose 70% of its activity—proving in seconds that this ancient virus is a living master switch.',
    keyTakeaway:
      'Novelty: Instant in-silico CRISPR knockouts before spending months in a wet lab.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'delta_ltr',
    cameraFocus3D: 'macro_loop',
    activeMainView: '3d_stage',
    scrollTargetId: 'top',
  },
  {
    stepNumber: 4,
    title: 'Proving It’s Real: Cutting Nearby Decoy DNA Leaves the Loop 100% Intact',
    subtitle: 'Step 4 of 6 (1:05–1:22) · Built-In Scientific Control Proof',
    narrative:
      'How do we prove AlphaGenome isn’t just reacting to any cut in the DNA? Here we cut a nearby non-viral repeat as a control. Watch the yellow decoy shatter on the right flank—while the viral loop, the 3D floor mountain, and the green gene fountain stay 100% untouched. AlphaGenome knows the exact difference between junk DNA and a real viral switch.',
    keyTakeaway:
      'Novelty: Rigorous control benchmarking visually proven in 3D.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'ctrl_alu',
    cameraFocus3D: 'macro_loop',
    activeMainView: '3d_stage',
    scrollTargetId: 'top',
  },
  {
    stepNumber: 5,
    title: 'Distilling AlphaGenome Into Our Own Fast ML Model (0.824 AUROC) + Live Sandbox',
    subtitle: 'Step 5 of 6 (1:22–1:45) · Custom Model Trained on AlphaGenome Ground Truth',
    narrative:
      'Running a massive 131-kilobase oracle on all 700,000 viruses in the human genome is computationally heavy. So with Argon, we ran 81 live AlphaGenome experiments and used them to train our own fast XGBoost classifier on viral DNA sequence patterns and chromatin—reaching 0.824 AUROC and letting you test any viral DNA sequence live below.',
    keyTakeaway:
      'Novelty: We used AlphaGenome as a teacher to train a fast, genome-wide viral switch predictor.',
    locusId: 'LTR_HG38_008_CYP19A1_MER21A',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'delta_ltr',
    cameraFocus3D: 'macro_loop',
    activeMainView: 'our_model',
    modelSubTab: 'xgboost_model',
    scrollTargetId: 'top',
  },
  {
    stepNumber: 6,
    title: '81 Live AlphaGenome API Calls Across 7 Human Tissues — Zero Noise',
    subtitle: 'Step 6 of 6 (1:45–2:00) · Verified Pipeline Outputs & Tissue Atlas',
    narrative:
      'Here are the actual validation plots and live API logs from our 81 AlphaGenome runs across 7 human tissues—from placenta and stem cells to brain and immune cells—turning the viral dark matter of the human genome into a live 3D discovery platform.',
    keyTakeaway:
      'Novelty: Complete end-to-end DeepMind AlphaGenome × AlphaFold × Gemini 4 Argon pipeline.',
    locusId: 'LTR_HG38_006_SLC1A2_HERVK',
    tissue: 'Brain Motor Cortex',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'contact_surface',
    perturbMode3D: 'delta_ltr',
    cameraFocus3D: 'macro_loop',
    activeMainView: 'our_model',
    modelSubTab: 'alphagenome_npz',
    scrollTargetId: 'top',
  },
];

interface GuidedDemoWalkthroughProps {
  isOpen: boolean;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onClose: () => void;
}

export const GuidedDemoWalkthrough: React.FC<GuidedDemoWalkthroughProps> = ({
  isOpen,
  currentStepIndex,
  onSelectStep,
  onClose,
}) => {
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!isOpen || !autoPlay) return;
    const timer = window.setInterval(() => {
      if (currentStepIndex < GUIDED_DEMO_STEPS.length - 1) {
        onSelectStep(currentStepIndex + 1);
      } else {
        setAutoPlay(false);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [isOpen, autoPlay, currentStepIndex, onSelectStep]);

  if (!isOpen) return null;

  const step = GUIDED_DEMO_STEPS[currentStepIndex] ?? GUIDED_DEMO_STEPS[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(460px,94vw)] bg-slate-900 text-white border border-slate-700 rounded-xl shadow-xl p-4">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-semibold">
          <span>2-MINUTE LIVE PITCH CONTROLLER</span>
          <span aria-hidden="true">·</span>
          <span>Step {step.stepNumber}/6</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setAutoPlay(false);
            onClose();
          }}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          title="Exit Guided Demo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5 my-2.5">
        {GUIDED_DEMO_STEPS.map((s, idx) => (
          <button
            key={s.stepNumber}
            type="button"
            onClick={() => onSelectStep(idx)}
            className={`h-1.5 rounded-full transition-colors cursor-pointer ${
              idx === currentStepIndex
                ? 'bg-teal-400'
                : idx < currentStepIndex
                ? 'bg-blue-500'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={`Jump to Step ${s.stepNumber}: ${s.title}`}
          />
        ))}
      </div>

      <h4 className="text-sm font-bold text-white leading-snug">{step.title}</h4>
      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
        {step.narrative}
      </p>

      <div className="mt-2.5 p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-teal-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <span>{step.keyTakeaway}</span>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAutoPlay((a) => !a)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            autoPlay
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {autoPlay ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause Auto-Tour
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Auto-Play (8s/step)
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentStepIndex === 0}
            onClick={() => {
              setAutoPlay(false);
              onSelectStep(Math.max(0, currentStepIndex - 1));
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          {currentStepIndex < GUIDED_DEMO_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setAutoPlay(false);
                onSelectStep(currentStepIndex + 1);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Next Step <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAutoPlay(false);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Finish Demo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
