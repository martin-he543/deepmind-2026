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
  scrollTargetId: string;
}

export const GUIDED_DEMO_STEPS: DemoStepConfig[] = [
  {
    stepNumber: 1,
    title: 'Why AlphaGenome Changes Everything: 8% of Our DNA is Ancient Virus',
    subtitle: 'Step 1 of 6 · AlphaGenome 131 kb Sequence-to-Function Oracle',
    narrative:
      'About 8% of the human genome (~700,000 elements) comes from ancient retroviruses (ERVs). RepeatMasker only tells us WHERE they sit—not which ones still work. By feeding 131 kb GRCh38 DNA sequences into Google DeepMind’s AlphaGenome, we predict 1-bp RNA-seq, CAGE, ATAC, H3K27ac, and 3D Hi-C contact maps simultaneously. Here in Placenta, watch LTR17 actively loop to ERVW-1 (Syncytin-1) above the glowing 3D Hi-C contact mountain.',
    keyTakeaway:
      'Impact: AlphaGenome turns 700,000 static viral annotations into a live, multi-modal 3D functional genomics oracle.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'wt',
    cameraFocus3D: 'macro_loop',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 2,
    title: 'Zoom Inside the Virus: 3D DNA Double Helix & Transcription Factor Docking',
    subtitle: 'Step 2 of 6 · Base-Resolution Motif Dissection',
    narrative:
      'The camera now flies inside the 780 bp viral LTR17 sequence. Inside its 3D DNA double helix sit conserved GCM1 and GATA2/3 transcription factor binding sites originally evolved by the ancient retrovirus to hijack host cells. Click "2. 1-bp Motif SNV" below to mutate a single nucleotide inside the viral helix and watch the TF protein detach and gene output drop by ~55%.',
    keyTakeaway:
      'Impact: AlphaGenome has 1-bp resolution—it resolves single-nucleotide mutations inside viral TF binding motifs.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'motif_snv',
    cameraFocus3D: 'viral_helix',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 3,
    title: 'In-Silico CRISPR Excision: Shattering the Viral Switch & Unwinding the Loop',
    subtitle: 'Step 3 of 6 · Full ΔLTR Virtual Knockout & Hi-C Collapse',
    narrative:
      'Now we perform a full in-silico CRISPR excision of the 780 bp LTR17 element (padding the outer flank to keep the ERVW-1 TSS anchored). Watch the 3D loop physically unwind away from the cyan Ghost WT Blueprint, the 3D Hi-C contact mountain underneath flatten (4.18 → 1.12 O/E), and the nascent mRNA fountain drop by 69.9% (log2FC = -1.73, Z = -10.82σ).',
    keyTakeaway:
      'Impact: Virtual knockouts test causal enhancer function in seconds before spending months on wet-lab CRISPR.',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'delta_ltr',
    cameraFocus3D: 'macro_loop',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 4,
    title: 'Specificity Proof: Deleting Nearby Alu/L1 Control Repeats Does Nothing',
    subtitle: 'Step 4 of 6 · Mandatory Repeat & Random Null Controls',
    narrative:
      'How do we know AlphaGenome isn’t just reacting to ANY sequence deletion? Here we excise a matched 666 bp L1/Alu repeat in the exact same window ("5. Cut Alu Control"). Watch the amber control repeat shatter on the right flank while the viral enhancer-promoter loop, 3D Hi-C peak, and mRNA stream stay 100% intact (log2FC = +0.014).',
    keyTakeaway:
      'Impact: Benchmarking against Alu/L1 and random deletions proves statistical specificity (empirical p = 2.8e-27).',
    locusId: 'LTR_HG38_001_ERVW1',
    tissue: 'Placenta (Trophoblast)',
    isVirusDeleted: false,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'ctrl_alu',
    cameraFocus3D: 'macro_loop',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 5,
    title: 'Innate Immunity & Onco-Exaptation: MER41 Wiring Human Macrophages',
    subtitle: 'Step 5 of 6 · Tissue-Specific Viral Rewiring (AIM2 & CSF1R)',
    narrative:
      'Switching to CD14+ Monocytes/Macrophages at AIM2 (chr1), an ancient 45-MYA MER41 retrovirus supplies STAT1/IRF1 interferon motifs. Applying CRISPRi epigenetic silencing ("3. dCas9-KRAB") cages the virus in heterochromatin and collapses AIM2 expression (-37.6%, Z = -4.26σ)—reproducing Chuong et al. (Science 2016) purely in silico.',
    keyTakeaway:
      'Impact: Explains how ancient viral switches wire human immunity and get hijacked in cancer (CSF1R/THE1B).',
    locusId: 'LTR_HG38_005_AIM2_MER41B',
    tissue: 'Monocyte / Macrophage (CD14+)',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'chromatin_loop',
    perturbMode3D: 'crispri_krab',
    cameraFocus3D: 'macro_loop',
    scrollTargetId: 'section-3d-stage',
  },
  {
    stepNumber: 6,
    title: 'Scientific Honesty: Young HERV-K Mappability & The 240-LTR Tissue Atlas',
    subtitle: 'Step 6 of 6 · Known Model Blind Spots & Genome-Wide Scale',
    narrative:
      'Finally, we test a young human-specific HERV-K (LTR5_Hs, 2.1% divergence) near PRODH in Brain Cortex. Because young LTR5_Hs copies are nearly identical across hg38, short-read ENCODE training data has mappability blind spots—so AlphaGenome predicts an attenuated delta (-0.13 log2FC). Scroll down to explore the full ERV Family × Tissue Matrix and Gemini co-scientist.',
    keyTakeaway:
      'Impact: Combines AlphaGenome’s predictive power with rigorous epistemic honesty about short-read training limits.',
    locusId: 'LTR_HG38_006_SLC1A2_HERVK',
    tissue: 'Brain Motor Cortex',
    isVirusDeleted: true,
    recenterOnTss: true,
    threeMode: 'contact_surface',
    perturbMode3D: 'delta_ltr',
    cameraFocus3D: 'macro_loop',
    scrollTargetId: 'section-3d-stage',
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
          <span>ALPHAGENOME GUIDED WALKTHROUGH</span>
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
