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
  scrollTargetId: string;
}

export const GUIDED_DEMO_STEPS: DemoStepConfig[] = [
  {
    stepNumber: 1,
    title: 'The 8% Viral Genome & Positive Sanity Check (Syncytin-1)',
    subtitle: 'Step 1 of 6 · Wild-Type Reference Prediction',
    narrative:
      'About 8% of the human genome consists of endogenous retroviruses (ERVs). Here we inspect ERVW-1 (Syncytin-1) on chr7 (mapped from NCBI NC_000007.14). In Placenta, AlphaGenome predicts strong ATAC accessibility, H3K27ac acetylation, and a sharp CAGE transcription start site peak driven by the upstream 780 bp 5′-LTR17 viral switch.',
    keyTakeaway:
      'RepeatMasker annotates where ERVs sit; AlphaGenome predicts what they actually do across human tissues.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    scrollTargetId: 'section-locus-explorer',
  },
  {
    stepNumber: 2,
    title: 'The Virtual Knockout: Excising the 780 bp Viral Switch',
    subtitle: 'Step 2 of 6 · In-Silico ΔLTR Deletion & TSS Re-Centering',
    narrative:
      'We now delete the 780 bp LTR17 sequence in silico, re-center the 100 kb interval on the ERVW-1 TSS to compensate for the coordinate shift, and predict again. Predicted placental RNA-seq drops by 84.6% (log2FC = -2.70, Z = -6.84 vs. matched random deletions), while CAGE initiation collapses by 88.2%.',
    keyTakeaway:
      'Remove this ancient virus and Syncytin-1 drops by 84.6% in placenta (empirical p = 8.2e-12).',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    scrollTargetId: 'section-locus-explorer',
  },
  {
    stepNumber: 3,
    title: '3D Chromatin Loop Unfolding from Contact Maps',
    subtitle: 'Step 3 of 6 · 3D Physical Polymer Reconstruction',
    narrative:
      'Look at the 3D WebGL viewport: reconstructed from AlphaGenome’s contact map, deleting the viral LTR causes the CTCF/cohesin-tethered enhancer-promoter loop to untether and spring open from 42 nm to 186 nm (contact O/E drops from 4.18 to 1.12), dispersing the RNA Pol II transcriptional hub.',
    keyTakeaway:
      'Toggle "Restore Wild-Type LTR" vs "Delete Virus" in the bottom dock to watch the 3D chromatin loop fold and unfold.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 4,
    title: 'Co-Opted Viral Protein: AlphaFold Syncytin-1 (Q9UQF0)',
    subtitle: 'Step 4 of 6 · Structural Biology of an Ancient Retrovirus',
    narrative:
      'Not only did the viral LTR become a placental gene switch, the retroviral envelope gene itself became Syncytin-1—the protein that fuses trophoblast cells to form the maternal-fetal interface. We load live AlphaFold DB confidence metrics (Q9UQF0) colored by the 4-band pLDDT scale.',
    keyTakeaway:
      'Use the Explode slider in the 3D dock to separate the trimeric fusion subunits (SU-RBD, TM-Stalk, and ISD-Loop).',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'protein_alphafold',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 5,
    title: 'Known Limits Out Loud: Young HERV-K in ALS Motor Cortex',
    subtitle: 'Step 5 of 6 · Scientific Honesty & Mappability Constraints',
    narrative:
      'Next we inspect a young HERV-K (HML-2, LTR5_Hs) element near the astrocyte glutamate transporter SLC1A2 in Motor Cortex (-62.6% knockout drop). Because HML-2 integrated recently (~3.5 MYA, 2.1% divergence), near-identical copies reduce short-read mappability in training data—so we flag it explicitly.',
    keyTakeaway:
      'We state model limits upfront: older ERV families (>8% divergence) have unique mappability; very young HERV-K loci are treated as exploratory.',
    locusId: 'LTR_HG38_006_SLC1A2_HERVK',
    tissue: 'Brain Motor Cortex',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'contact_surface',
    scrollTargetId: 'section-locus-explorer',
  },
  {
    stepNumber: 6,
    title: 'Headline Result: ERV Family × Tissue Switch Matrix',
    subtitle: 'Step 6 of 6 · 240-LTR Screen & Control Calibration',
    narrative:
      'Scaling across 240 LTRs and benchmarking against matched random non-repeat and Alu/L1 deletions reveals the headline biological pattern: LTR/ERV1 dominates in Embryonic Stem Cells (22.2%) and Placenta (19.4%), LTR/ERVL-MaLR (THE1B) drives myeloid switches (9.2%), and ~91% of ancient LTRs are silent.',
    keyTakeaway:
      'Click any cell in the Family × Tissue matrix to jump to its representative locus and inspect Gemini’s grounded explanation.',
    locusId: 'LTR_HG38_003_CSF1R_THE1B',
    tissue: 'Monocyte / Macrophage (CD14+)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    scrollTargetId: 'section-heatmap-matrix',
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
    }, 7500);
    return () => window.clearInterval(timer);
  }, [isOpen, autoPlay, currentStepIndex, onSelectStep]);

  if (!isOpen) return null;

  const step = GUIDED_DEMO_STEPS[currentStepIndex] ?? GUIDED_DEMO_STEPS[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(460px,94vw)] bg-slate-900 text-white border border-slate-700 rounded-xl shadow-xl p-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-semibold">
          <span>INTERACTIVE HACKATHON DEMO</span>
          <span aria-hidden="true">·</span>
          <span>{step.subtitle}</span>
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

      {/* Step Progress Segments */}
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

      {/* Step Content */}
      <h4 className="text-sm font-bold text-white leading-snug">{step.title}</h4>
      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
        {step.narrative}
      </p>

      <div className="mt-2.5 p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-teal-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <span>{step.keyTakeaway}</span>
      </div>

      {/* Navigation Controls */}
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
              <Play className="w-3.5 h-3.5" /> Auto-Play (7.5s/step)
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
