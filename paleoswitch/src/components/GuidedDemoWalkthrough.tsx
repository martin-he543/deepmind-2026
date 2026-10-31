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
    title: 'The Mystery: 8% of Human DNA is Ancient Virus — AlphaGenome Turns It Into a 3D Lab',
    subtitle: 'Step 1 of 6 (0:00–0:20) · Intact Wild-Type 3D Loop & Hi-C Floor',
    narrative:
      '8% of our genome (~700,000 elements) comes from ancient retroviruses (ERVs). RepeatMasker only finds where they sit, not which ones still switch human genes on. Using Google DeepMind’s AlphaGenome (131 kb context), we predict 1-bp RNA-seq, CAGE, ATAC, H3K27ac, and 3D Hi-C contact maps simultaneously. Here in Placenta, watch LTR17 actively pulse energy across the 3D loop into Syncytin-1 (ERVW-1).',
    keyTakeaway:
      'Impact: AlphaGenome replaces months of wet-lab CRISPR screening with an instant 3D sequence-to-function oracle.',
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
    title: 'Zoom Inside the Virus: 3D DNA Double Helix & 1-bp TF Motif Mutation',
    subtitle: 'Step 2 of 6 (0:20–0:40) · Base-Resolution Motif Dissection',
    narrative:
      'Clicking Next flies the camera inside the 780 bp viral LTR17 sequence. Inside its 3D DNA double helix sit conserved GCM1 and GATA2/3 binding motifs. Because AlphaGenome predicts at 1-bp resolution, mutating a single nucleotide inside the viral motif flashes crimson, detaches the transcription factor dimer, and cuts mRNA output to 68%.',
    keyTakeaway:
      'Impact: Resolves single-nucleotide variants (SNVs) inside viral regulatory motifs in 3D.',
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
    title: 'Full In-Silico CRISPR Excision: Shattering the Virus & Unwinding the 3D Loop',
    subtitle: 'Step 3 of 6 (0:40–1:00) · ΔLTR Knockout & Hi-C Mountain Collapse',
    narrative:
      'Now we excise the entire 780 bp LTR17 virus in silico (padding the outer flank to keep the ERVW-1 TSS anchored). Watch the viral switch shatter into 40 fragments, the 3D loop physically unwind away from the cyan Ghost WT Blueprint, the 3D Hi-C contact mountain flatten (4.18 → 1.12 O/E), and placental Syncytin-1 expression drop by 70% (log2FC = -1.73, Z = -10.82σ).',
    keyTakeaway:
      'Impact: Proves causal gene-switch activity in silico before wet-lab CRISPR validation.',
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
    title: 'Specificity Proof: Cutting Nearby Alu/L1 Control Repeats Leaves the Loop Intact',
    subtitle: 'Step 4 of 6 (1:00–1:20) · Mandatory Repeat & Random Null Controls',
    narrative:
      'How do we prove AlphaGenome isn’t just reacting to any deletion? Here we excise a matched 666 bp L1M5/Alu control repeat in the same window. Watch the yellow control node shatter on the right flank while the viral loop, 3D Hi-C mountain, and green mRNA stream stay 100% intact (log2FC = +0.014, empirical p = 2.8e-27).',
    keyTakeaway:
      'Impact: Benchmarking against Alu/L1 and random non-repeat deletions eliminates false positives.',
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
    title: 'Our Trained ML Model (RetroSwitch-XGB): 0.824 AUROC & Live DNA Sandbox',
    subtitle: 'Step 5 of 6 (1:20–1:42) · Predicting Active Viral Switches Genome-Wide',
    narrative:
      'Querying AlphaGenome’s 131 kb oracle on all 700,000 human ERVs is expensive. So we trained our own XGBoost + Random Forest model (RetroSwitch-XGB) on GRCh38 FASTA sequence motifs (STAT1, GATA, OCT4, TATA, CpG ratio, 4-mer entropy), viral divergence, TSS distance, and chromatin. In 5-fold cross-validation grouped by gene, DNA sequence features alone reach 0.747 AUROC, rising to 0.824 AUROC in our full hybrid model.',
    keyTakeaway:
      'Impact: Fast, interpretable XGBoost screening trained directly on AlphaGenome virtual knockouts.',
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
    title: '81 Live AlphaGenome Calls (.npz Cache), 0.0000 Determinism & Tissue Heatmap',
    subtitle: 'Step 6 of 6 (1:42–2:00) · Verified Pipeline Outputs & Epistemic Honesty',
    narrative:
      'Here are the static validation figures and gRPC request logs from our 81 live AlphaGenome 131 kb API calls across 20 GRCh38 loci (with 0.000000 reference determinism noise). We also highlight known blind spots—such as young HERV-K (LTR5_Hs, 2.1% div) elements where short-read mappability limits attenuate ENCODE training signal.',
    keyTakeaway:
      'Impact: End-to-end reproducible pipeline (ltrs.parquet + raw/*.npz + RetroSwitch-XGB) ready for target discovery.',
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
