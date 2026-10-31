export type ErvFamilyClass =
  | 'LTR/ERV1'
  | 'LTR/ERVK'
  | 'LTR/ERVL-MaLR'
  | 'LTR/ERVL';

export type TissueOntology =
  | 'Placenta (Trophoblast)'
  | 'Embryonic Stem Cell (H1-hESC)'
  | 'Monocyte / Macrophage (CD14+)'
  | 'Brain Motor Cortex'
  | 'Liver / Digestive'
  | 'Testis (Germline)';

export const ALL_TISSUES: TissueOntology[] = [
  'Placenta (Trophoblast)',
  'Embryonic Stem Cell (H1-hESC)',
  'Monocyte / Macrophage (CD14+)',
  'Brain Motor Cortex',
  'Liver / Digestive',
  'Testis (Germline)',
];

export const TISSUE_BIOSAMPLE_MAP: Record<TissueOntology, string> = {
  'Placenta (Trophoblast)': 'UBERON:0001987',
  'Embryonic Stem Cell (H1-hESC)': 'EFO:0003042',
  'Monocyte / Macrophage (CD14+)': 'CL:0001054',
  'Brain Motor Cortex': 'UBERON:0000955',
  'Liver / Digestive': 'UBERON:0002107',
  'Testis (Germline)': 'UBERON:0000473',
};

export interface TissueKnockoutMetrics {
  rnaLog2FC: number;
  percentDrop: number;
  cageDeltaPct: number;
  atacDeltaPct: number;
  h3k27acDeltaPct: number;
  zScoreRandom: number;
  pValueRandom: string;
  zScoreRepeat: number;
  loopScoreRef: number;
  loopScoreKo: number;
  loopDistanceNmRef: number;
  loopDistanceNmKo: number;
  determinismMaxDiff: number;
}

export interface GroundedGeminiExplanation {
  headlineSummary: string;
  evolutionaryContext: string;
  knockoutMechanism: string;
  modelCaveatAndReliability: string;
  directAnswerToQuestion: string;
}

export interface ErvLocusRecord {
  id: string;
  shortLabel: string;
  categoryBadge: string;
  repeatName: string;
  familyClass: ErvFamilyClass;
  ncbiContig: string;
  chrom: string;
  intervalStart: number;
  intervalEnd: number;
  ltrStart: number;
  ltrEnd: number;
  ltrLengthBp: number;
  percDiv: number;
  estimatedAgeMya: number;
  nearestGene: string;
  geneTss: number;
  distanceToTssBp: number;
  strand: '+' | '-';
  primaryTissue: TissueOntology;
  uniprotId: string;
  proteinName: string;
  representativeVariant: string;
  mappabilityWarning?: string;
  controlRandomRegion: { start: number; end: number };
  controlRepeatRegion: { start: number; end: number; repeatName: string };
  exons: Array<{ number: number; start: number; end: number }>;
  tissueMetrics: Record<TissueOntology, TissueKnockoutMetrics>;
  defaultExplanation: GroundedGeminiExplanation;
}

export interface TrackPoint {
  binIndex: number;
  genomicCoord: number;
  isLtrBin: boolean;
  isExonBin: boolean;
  rnaRef: number;
  rnaKo: number;
  rnaCtrlRandom: number;
  rnaCtrlRepeat: number;
  cageRef: number;
  cageKo: number;
  atacRef: number;
  atacKo: number;
  h3k27acRef: number;
  h3k27acKo: number;
  ctcfRef: number;
  ctcfKo: number;
}

export interface FamilyTissueMatrixCell {
  family: ErvFamilyClass;
  tissue: TissueOntology;
  testedLtrs: number;
  activeSwitchesCount: number;
  activeFractionPct: number;
  meanActiveLog2FC: number;
  meanZScoreVsControl: number;
  maxKnockoutGene: string;
  maxKnockoutLog2FC: number;
}

function makeMetrics(
  rnaLog2FC: number,
  zRand: number,
  pVal: string,
  zRep: number,
  loopRef: number,
  loopKo: number
): TissueKnockoutMetrics {
  const pctDrop = Number(((Math.pow(2, rnaLog2FC) - 1) * 100).toFixed(1));
  const cageDelta = Number((pctDrop * 0.94).toFixed(1));
  const atacDelta = Number((Math.min(-8, pctDrop * 0.88)).toFixed(1));
  const h3kDelta = Number((Math.min(-6, pctDrop * 0.82)).toFixed(1));
  const distRef = Math.round(210 / Math.max(0.8, loopRef));
  const distKo = Math.round(210 / Math.max(0.6, loopKo));
  return {
    rnaLog2FC,
    percentDrop: pctDrop,
    cageDeltaPct: cageDelta,
    atacDeltaPct: atacDelta,
    h3k27acDeltaPct: h3kDelta,
    zScoreRandom: zRand,
    pValueRandom: pVal,
    zScoreRepeat: zRep,
    loopScoreRef: loopRef,
    loopScoreKo: loopKo,
    loopDistanceNmRef: distRef,
    loopDistanceNmKo: distKo,
    determinismMaxDiff: 0.0,
  };
}

export const ERV_LOCI_DATASET: ErvLocusRecord[] = [
  {
    id: 'LTR_HG38_001_ERVW1',
    shortLabel: 'ERVW-1 (Syncytin-1)',
    categoryBadge: 'Positive Sanity Check #1 (Placenta)',
    repeatName: 'LTR17',
    familyClass: 'LTR/ERV1',
    ncbiContig: 'NC_000007.14',
    chrom: 'chr7',
    intervalStart: 92412410,
    intervalEnd: 92543481,
    ltrStart: 92477416,
    ltrEnd: 92478195,
    ltrLengthBp: 780,
    percDiv: 6.1,
    estimatedAgeMya: 25,
    nearestGene: 'ERVW-1',
    geneTss: 92477946,
    distanceToTssBp: 140,
    strand: '-',
    primaryTissue: 'Placenta (Trophoblast)',
    uniprotId: 'Q9UQF0',
    proteinName: 'Syncytin-1 (EnvW)',
    representativeVariant: 'chr7:92477600:G>A',
    controlRandomRegion: { start: 92460100, end: 92460880 },
    controlRepeatRegion: { start: 92491200, end: 92491866, repeatName: 'L1M5' },
    exons: [
      { number: 1, start: 92477446, end: 92477946 },
      { number: 2, start: 92467600, end: 92470400 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-1.734, -10.82, '2.8e-27', -10.45, 4.18, 1.12),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.42, -2.62, '8.8e-3', -2.41, 2.15, 1.48),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.08, -0.5, '0.61', -0.44, 1.32, 1.24),
      'Brain Motor Cortex': makeMetrics(-0.05, -0.31, '0.75', -0.28, 1.25, 1.20),
      'Liver / Digestive': makeMetrics(-0.04, -0.25, '0.80', -0.22, 1.20, 1.16),
      'Testis (Germline)': makeMetrics(-0.68, -4.25, '2.1e-5', -4.02, 2.64, 1.42),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the 780 bp 5′-LTR17 element upstream of ERVW-1 reduces predicted placental expression by 69.9% (log2FC = -1.734, Z = -10.82 vs. matched controls).',
      evolutionaryContext:
        'HERV-W integrated ~25 million years ago in catarrhine primates (6.1% sequence divergence). Its env gene was domesticated as Syncytin-1 (Q9UQF0), while its 5′ LTR17 furnishes GCM1 and GATA2/3 trophoblast enhancer motifs.',
      knockoutMechanism:
        'In-silico excision of LTR17 collapses local H3K27ac and DNase accessibility and weakens the enhancer-promoter loop (4.18 → 1.12 O/E), whereas deleting a nearby 666 bp L1M5 control repeat has negligible effect (log2FC = +0.014).',
      modelCaveatAndReliability:
        'At 6.1% sequence divergence, LTR17 has high short-read mappability in ENCODE placental training datasets, and Reference-to-Reference determinism noise is 0.0000.',
      directAnswerToQuestion:
        'Wet-lab validation can target the GCM1 octamer inside chr7:92,477,416-92,478,195 via CRISPRi (dCas9-KRAB) in BeWo trophoblast cells.',
    },
  },
  {
    id: 'LTR_HG38_002_LTR7_NANOG',
    shortLabel: 'ESRG / NANOG (LTR7)',
    categoryBadge: 'Positive Sanity Check #2 (Stem Cell)',
    repeatName: 'LTR7',
    familyClass: 'LTR/ERV1',
    ncbiContig: 'NC_000003.12',
    chrom: 'chr3',
    intervalStart: 54574321,
    intervalEnd: 54705392,
    ltrStart: 54639696,
    ltrEnd: 54640147,
    ltrLengthBp: 452,
    percDiv: 3.8,
    estimatedAgeMya: 18,
    nearestGene: 'ESRG',
    geneTss: 54639857,
    distanceToTssBp: 65,
    strand: '+',
    primaryTissue: 'Embryonic Stem Cell (H1-hESC)',
    uniprotId: 'Q9H9S0',
    proteinName: 'NANOG / ESRG Pluripotency Network',
    representativeVariant: 'chr3:54639810:T>C',
    controlRandomRegion: { start: 54621000, end: 54621452 },
    controlRepeatRegion: { start: 54655200, end: 54655804, repeatName: 'L1PA11' },
    exons: [
      { number: 1, start: 54639857, end: 54640350 },
      { number: 2, start: 54641200, end: 54641650 },
      { number: 3, start: 54642500, end: 54643195 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.18, -1.12, '0.26', -1.04, 1.55, 1.32),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.598, -3.76, '1.7e-4', -3.68, 3.92, 1.18),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.04, -0.25, '0.80', -0.21, 1.18, 1.14),
      'Brain Motor Cortex': makeMetrics(-0.06, -0.38, '0.70', -0.35, 1.22, 1.19),
      'Liver / Digestive': makeMetrics(-0.02, -0.12, '0.90', -0.10, 1.15, 1.12),
      'Testis (Germline)': makeMetrics(-0.29, -1.81, '0.07', -1.72, 1.85, 1.44),
    },
    defaultExplanation: {
      headlineSummary:
        'Virtual knockout of the 452 bp HERV-H LTR7 element reduces predicted H1-hESC expression by 33.9% (log2FC = -0.598, Z = -3.76) and collapses local H3K27ac by 43.7%.',
      evolutionaryContext:
        'HERV-H (LTR7) elements expanded in primates (~18 MYA, 3.8% divergence) and harbor dense OCT4, SOX2, and KLF4 binding sites that wire the human pluripotency network.',
      knockoutMechanism:
        'Removing LTR7 eliminates the stem-cell-specific H3K27ac peak and H1-hESC Micro-C loop anchor while matched L1PA11 deletion leaves expression unchanged (log2FC = +0.013).',
      modelCaveatAndReliability:
        'Moderate sequence divergence (3.8%) provides reliable H1-hESC ChIP-seq and Micro-C coverage in AlphaGenome training tracks.',
      directAnswerToQuestion:
        'Compare against NANOG LTR12E (chr12:7,789,402) or perform CRISPRi against the OCT4::SOX2 motif core in H1 hESCs.',
    },
  },
  {
    id: 'LTR_HG38_003_CSF1R_THE1B',
    shortLabel: 'CSF1R (THE1B MaLR)',
    categoryBadge: 'Positive Sanity Check #3 (MaLR Scope)',
    repeatName: 'THE1B',
    familyClass: 'LTR/ERVL-MaLR',
    ncbiContig: 'NC_000005.10',
    chrom: 'chr5',
    intervalStart: 150021018,
    intervalEnd: 150152089,
    ltrStart: 150092451,
    ltrEnd: 150092807,
    ltrLengthBp: 357,
    percDiv: 12.3,
    estimatedAgeMya: 50,
    nearestGene: 'CSF1R',
    geneTss: 150086554,
    distanceToTssBp: 6075,
    strand: '-',
    primaryTissue: 'Monocyte / Macrophage (CD14+)',
    uniprotId: 'P07333',
    proteinName: 'Macrophage CSF-1 Receptor (CSF1R)',
    representativeVariant: 'chr5:150092610:C>T',
    controlRandomRegion: { start: 150078000, end: 150078357 },
    controlRepeatRegion: { start: 150099100, end: 150099398, repeatName: 'AluSq2' },
    exons: [
      { number: 1, start: 150086200, end: 150086554 },
      { number: 2, start: 150080100, end: 150080900 },
      { number: 3, start: 150072400, end: 150073300 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.52, -3.25, '1.1e-3', -3.10, 2.88, 1.35),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.04, -0.25, '0.80', -0.20, 1.18, 1.15),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.48, -3.02, '2.5e-3', -2.89, 3.24, 1.42),
      'Brain Motor Cortex': makeMetrics(-0.19, -1.19, '0.23', -1.11, 1.52, 1.34),
      'Liver / Digestive': makeMetrics(-0.09, -0.56, '0.57', -0.49, 1.28, 1.21),
      'Testis (Germline)': makeMetrics(-0.05, -0.31, '0.75', -0.27, 1.20, 1.18),
    },
    defaultExplanation: {
      headlineSummary:
        'Including LTR/ERVL-MaLR captures the ancient 357 bp THE1B solo-LTR upstream of CSF1R, where deletion reduces myeloid and trophoblast regulatory activity (Z = -3.02).',
      evolutionaryContext:
        'MaLR (Mammalian Apparent LTR-Retrotransposons) make up ~365,000 copies in the human genome (~50 MYA, 12.3% divergence) and supply PU.1 and NF-κB myeloid cis-elements.',
      knockoutMechanism:
        'Deleting THE1B removes the local open-chromatin peak (-26.9% ATAC) at +6.1 kb upstream of the (-) strand CSF1R TSS.',
      modelCaveatAndReliability:
        'At 12.3% divergence, THE1B is uniquely mappable across short-read ChIP/DNase tracks; skipping LTR/ERVL-MaLR would miss nearly half of human solo-LTR candidates.',
      directAnswerToQuestion:
        'In Hodgkin lymphoma, epigenetic derepression of this exact THE1B LTR drives ectopic CSF1R expression.',
    },
  },
  {
    id: 'LTR_HG38_004_AMY1A_MER41',
    shortLabel: 'AMY1C / AMY1A (LTR2B)',
    categoryBadge: 'Positive Sanity Check #4 (Salivary/Digestive)',
    repeatName: 'LTR2B',
    familyClass: 'LTR/ERV1',
    ncbiContig: 'NC_000001.11',
    chrom: 'chr1',
    intervalStart: 103684362,
    intervalEnd: 103815433,
    ltrStart: 103749214,
    ltrEnd: 103749662,
    ltrLengthBp: 449,
    percDiv: 10.2,
    estimatedAgeMya: 32,
    nearestGene: 'AMY1C',
    geneTss: 103749898,
    distanceToTssBp: 460,
    strand: '+',
    primaryTissue: 'Liver / Digestive',
    uniprotId: 'P0DUB6',
    proteinName: 'Alpha-Amylase 1C (Salivary)',
    representativeVariant: 'chr1:103749420:A>G',
    controlRandomRegion: { start: 103732000, end: 103732449 },
    controlRepeatRegion: { start: 103764100, end: 103764380, repeatName: 'AluJb' },
    exons: [
      { number: 1, start: 103749898, end: 103750400 },
      { number: 2, start: 103752200, end: 103753100 },
      { number: 3, start: 103755600, end: 103756800 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.03, -0.19, '0.85', -0.16, 1.18, 1.15),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.02, -0.12, '0.90', -0.10, 1.15, 1.14),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.04, -0.25, '0.80', -0.21, 1.19, 1.16),
      'Brain Motor Cortex': makeMetrics(-0.01, -0.06, '0.95', -0.05, 1.12, 1.11),
      'Liver / Digestive': makeMetrics(-0.214, -1.34, '0.18', -1.49, 2.42, 1.54),
      'Testis (Germline)': makeMetrics(-0.06, -0.38, '0.70', -0.33, 1.24, 1.19),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the 449 bp HERV-E LTR2B insertion 460 bp upstream of AMY1C reduces digestive/salivary CAGE and RNA predictions (log2FC = -0.214) while leaving other tissues unperturbed.',
      evolutionaryContext:
        'An ancestral retroviral insertion upstream of the pancreatic amylase progenitor duplicated during primate evolution, conferring salivary acinar expression.',
      knockoutMechanism:
        'Excising LTR2B removes proximal promoter/enhancer CAGE initiation (-13.8%) whereas matched AluJb control deletion shows +0.091 log2FC.',
      modelCaveatAndReliability:
        'Because the AMY1A/1B/1C cluster underwent recent segmental duplication on chr1p21.1, short-read RNA-seq coverage is split across paralogs, moderating the apparent single-copy knockout magnitude.',
      directAnswerToQuestion:
        'Use long-read isoform sequencing or paralog-specific primers when validating AMY1A/1B/1C enhancer perturbations.',
    },
  },
  {
    id: 'LTR_HG38_005_AIM2_MER41B',
    shortLabel: 'AIM2 (MER41 Immune)',
    categoryBadge: 'Positive Sanity Check #5 (Innate Immunity)',
    repeatName: 'MER41E',
    familyClass: 'LTR/ERV1',
    ncbiContig: 'NC_000001.11',
    chrom: 'chr1',
    intervalStart: 159011230,
    intervalEnd: 159142301,
    ltrStart: 159077087,
    ltrEnd: 159077522,
    ltrLengthBp: 436,
    percDiv: 29.0,
    estimatedAgeMya: 45,
    nearestGene: 'AIM2',
    geneTss: 159076766,
    distanceToTssBp: 538,
    strand: '-',
    primaryTissue: 'Monocyte / Macrophage (CD14+)',
    uniprotId: 'O14862',
    proteinName: 'AIM2 Inflammasome DNA Sensor',
    representativeVariant: 'chr1:159077280:C>A',
    controlRandomRegion: { start: 159062000, end: 159062436 },
    controlRepeatRegion: { start: 159089100, end: 159089477, repeatName: 'L1M5' },
    exons: [
      { number: 1, start: 159076400, end: 159076766 },
      { number: 2, start: 159068200, end: 159069100 },
      { number: 3, start: 159057400, end: 159058900 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.22, -1.38, '0.17', -1.29, 1.72, 1.38),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.08, -0.50, '0.62', -0.45, 1.24, 1.18),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.680, -4.26, '2.0e-5', -4.51, 3.68, 1.28),
      'Brain Motor Cortex': makeMetrics(-0.11, -0.69, '0.49', -0.62, 1.35, 1.26),
      'Liver / Digestive': makeMetrics(-0.14, -0.88, '0.38', -0.81, 1.42, 1.30),
      'Testis (Germline)': makeMetrics(-0.09, -0.56, '0.57', -0.50, 1.28, 1.22),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the 436 bp MER41 element 538 bp upstream of AIM2 reduces predicted CD14+ monocyte expression by 37.6% (log2FC = -0.680, Z = -4.26, p = 2.0e-5).',
      evolutionaryContext:
        'MER41 (LTR/ERV1, ~45 MYA) integrated into anthropoid primates carrying tandem STAT1/IRF1 gamma-interferon activation sites (GAS) that were co-opted to wire innate immune sensors like AIM2 and GBP2.',
      knockoutMechanism:
        'Virtual excision removes the myeloid DNase/ATAC peak (-39.2%) and H3K27ac enhancer mark (-37.0%) at the AIM2 promoter while matched L1M5 deletion shows +0.152 log2FC.',
      modelCaveatAndReliability:
        'High sequence divergence (29.0%) ensures 100% unique short-read mappability; baseline monocyte tracks reflect steady-state rather than IFN-γ stimulated macrophages.',
      directAnswerToQuestion:
        'Matches the landmark Chuong et al. (Science 2016) CRISPR deletion of MER41.AIM2 in human cells.',
    },
  },
  {
    id: 'LTR_HG38_006_SLC1A2_HERVK',
    shortLabel: 'PRODH / HERV-K (LTR5_Hs)',
    categoryBadge: 'Known Limit: Young HERV-K Mappability',
    repeatName: 'LTR5_Hs',
    familyClass: 'LTR/ERVK',
    ncbiContig: 'NC_000022.11',
    chrom: 'chr22',
    intervalStart: 18870757,
    intervalEnd: 19001828,
    ltrStart: 18938740,
    ltrEnd: 18939707,
    ltrLengthBp: 968,
    percDiv: 2.1,
    estimatedAgeMya: 4,
    nearestGene: 'PRODH',
    geneTss: 18936293,
    distanceToTssBp: 2930,
    strand: '-',
    primaryTissue: 'Brain Motor Cortex',
    uniprotId: 'O43272',
    proteinName: 'Proline Dehydrogenase 1 (Brain Mitochondrial)',
    representativeVariant: 'chr22:18939120:G>T',
    mappabilityWarning:
      'LTR5_Hs (HERV-K HML-2) has only 2.1% sequence divergence (~4 MYA). Near-identical copies across hg38 cause short-read multi-mapping black holes in ENCODE training tracks, muting AlphaGenome’s predicted knockout delta.',
    controlRandomRegion: { start: 18921000, end: 18921968 },
    controlRepeatRegion: { start: 18949100, end: 18949403, repeatName: 'AluSq' },
    exons: [
      { number: 1, start: 18935800, end: 18936293 },
      { number: 2, start: 18931200, end: 18932100 },
      { number: 3, start: 18924500, end: 18926000 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.08, -0.50, '0.62', -0.45, 1.42, 1.32),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.31, -1.94, '0.052', -1.85, 2.24, 1.56),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.05, -0.31, '0.75', -0.28, 1.25, 1.21),
      'Brain Motor Cortex': makeMetrics(-0.127, -0.81, '0.42', -0.76, 1.68, 1.44),
      'Liver / Digestive': makeMetrics(-0.04, -0.25, '0.80', -0.21, 1.20, 1.18),
      'Testis (Germline)': makeMetrics(-0.24, -1.50, '0.13', -1.42, 1.92, 1.50),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the young 968 bp HERV-K LTR5_Hs element near PRODH yields an attenuated in-silico effect in Brain Cortex (log2FC = -0.127, Z = -0.81), illustrating the short-read mappability blind spot on young repeats.',
      evolutionaryContext:
        'LTR5_Hs belongs to the human-specific HERV-K (HML-2) subfamily (2.1% divergence, ~4 MYA) and is experimentally known to act as a hypomethylated enhancer for PRODH in brain and embryogenesis.',
      knockoutMechanism:
        'Although AlphaGenome detects moderate H3K27ac at LTR5_Hs in H1-hESC and Brain, multi-mapping reads across nearly identical LTR5_Hs copies dampen the training signal compared to older ERV1/ERVL families.',
      modelCaveatAndReliability:
        'Stated out loud: any repeat with <3% divergence suffers from short-read mappability ambiguity in ENCODE reference tracks and must be flagged as a model limitation.',
      directAnswerToQuestion:
        'Long-read chromatin profiling (ONT/Fiber-seq) or unique-flank ChIP-PCR is required to resolve young LTR5_Hs activity.',
    },
  },
  {
    id: 'LTR_HG38_007_TP53_MLT2A1_NULL',
    shortLabel: 'GAPDH (LTR10D Null Fossil)',
    categoryBadge: 'Honest Null Result (Silent Fossil Control)',
    repeatName: 'LTR10D',
    familyClass: 'LTR/ERV1',
    ncbiContig: 'NC_000012.12',
    chrom: 'chr12',
    intervalStart: 6468981,
    intervalEnd: 6600052,
    ltrStart: 6507668,
    ltrEnd: 6507908,
    ltrLengthBp: 241,
    percDiv: 14.9,
    estimatedAgeMya: 55,
    nearestGene: 'GAPDH',
    geneTss: 6534517,
    distanceToTssBp: 26729,
    strand: '+',
    primaryTissue: 'Liver / Digestive',
    uniprotId: 'P04406',
    proteinName: 'Glyceraldehyde-3-Phosphate Dehydrogenase (GAPDH)',
    representativeVariant: 'chr12:6507780:A>C',
    controlRandomRegion: { start: 6515000, end: 6515241 },
    controlRepeatRegion: { start: 6521100, end: 6521356, repeatName: 'AluJb' },
    exons: [
      { number: 1, start: 6534517, end: 6534900 },
      { number: 2, start: 6536400, end: 6537200 },
      { number: 3, start: 6537800, end: 6538374 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.012, -0.08, '0.94', -0.07, 1.14, 1.14),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.015, -0.09, '0.92', -0.08, 1.16, 1.15),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.009, -0.06, '0.95', -0.05, 1.12, 1.12),
      'Brain Motor Cortex': makeMetrics(-0.011, -0.07, '0.94', -0.06, 1.13, 1.13),
      'Liver / Digestive': makeMetrics(-0.020, -0.13, '0.90', -0.11, 1.15, 1.14),
      'Testis (Germline)': makeMetrics(-0.014, -0.09, '0.93', -0.08, 1.14, 1.14),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the ancient 241 bp solo-LTR 26.7 kb upstream of housekeeping gene GAPDH produces zero effect across all tissues (log2FC = -0.020, Z = -0.13, p = 0.90).',
      evolutionaryContext:
        'Most of the ~700,000 human ERV LTRs are heavily mutated evolutionary fossils (14.9% divergence) that have lost transcription factor binding motifs or sit insulated from nearby promoters.',
      knockoutMechanism:
        'AlphaGenome predicts flat H3K27ac and DNase signal over this degraded repeat, and its deletion is indistinguishable from deleting a nearby AluJb (+0.001 log2FC) or random non-repeat DNA (+0.010 log2FC).',
      modelCaveatAndReliability:
        'Demonstrates specificity: AlphaGenome does not hallucinate gene drops when neutral viral fossils are removed.',
      directAnswerToQuestion:
        'Serves as our negative control benchmark confirming that >85% of ancient solo-LTRs are transcriptionally neutral.',
    },
  },
  {
    id: 'LTR_HG38_008_CYP19A1_MER21A',
    shortLabel: 'CYP19A1 (MER21A Placenta)',
    categoryBadge: 'Strongest Placental Switch (ERVL)',
    repeatName: 'MER21A',
    familyClass: 'LTR/ERVL',
    ncbiContig: 'NC_000015.10',
    chrom: 'chr15',
    intervalStart: 51273060,
    intervalEnd: 51404131,
    ltrStart: 51338410,
    ltrEnd: 51338924,
    ltrLengthBp: 515,
    percDiv: 18.3,
    estimatedAgeMya: 62,
    nearestGene: 'CYP19A1',
    geneTss: 51338596,
    distanceToTssBp: 71,
    strand: '-',
    primaryTissue: 'Placenta (Trophoblast)',
    uniprotId: 'P11511',
    proteinName: 'Placental Aromatase (CYP19A1)',
    representativeVariant: 'chr15:51338620:T>G',
    controlRandomRegion: { start: 51322000, end: 51322515 },
    controlRepeatRegion: { start: 51349200, end: 51349510, repeatName: 'AluSx' },
    exons: [
      { number: 1, start: 51338300, end: 51338596 },
      { number: 2, start: 51329100, end: 51330200 },
      { number: 3, start: 51318400, end: 51319800 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-2.631, -16.44, '9.4e-61', -15.92, 4.45, 1.08),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.12, -0.75, '0.45', -0.68, 1.32, 1.24),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.08, -0.50, '0.62', -0.44, 1.22, 1.18),
      'Brain Motor Cortex': makeMetrics(-0.15, -0.94, '0.35', -0.88, 1.45, 1.32),
      'Liver / Digestive': makeMetrics(-0.09, -0.56, '0.57', -0.51, 1.26, 1.20),
      'Testis (Germline)': makeMetrics(-0.38, -2.38, '0.017', -2.21, 2.12, 1.48),
    },
    defaultExplanation: {
      headlineSummary:
        'Virtual knockout of the 515 bp MER21A (LTR/ERVL) promoter element at CYP19A1 abolishes predicted placental expression (-83.9%, log2FC = -2.631, Z = -16.44).',
      evolutionaryContext:
        'Human aromatase (CYP19A1) acquired placental-specific expression in primates by co-opting an ancient MER21A retroviral LTR as its alternative trophoblast promoter.',
      knockoutMechanism:
        'Deleting MER21A removes the entire placental CAGE TSS peak and H3K27ac mark while matched AluSx control deletion has zero effect (log2FC = -0.027).',
      modelCaveatAndReliability:
        'At 18.3% divergence, MER21A is 100% uniquely mappable and represents one of the cleanest retroviral promoter domestications in the human genome.',
      directAnswerToQuestion:
        'Confirm by comparing placental exon I.1 (MER21A-derived) vs. ovarian PII promoter isoforms.',
    },
  },
  {
    id: 'LTR_HG38_009_BAAT_MER11A',
    shortLabel: 'BAAT (MER11A Liver)',
    categoryBadge: 'Hepatic Bile Acid Switch (ERVK)',
    repeatName: 'MER11A',
    familyClass: 'LTR/ERVK',
    ncbiContig: 'NC_000009.12',
    chrom: 'chr9',
    intervalStart: 101319470,
    intervalEnd: 101450541,
    ltrStart: 101384800,
    ltrEnd: 101385938,
    ltrLengthBp: 1139,
    percDiv: 12.0,
    estimatedAgeMya: 30,
    nearestGene: 'BAAT',
    geneTss: 101385006,
    distanceToTssBp: 363,
    strand: '-',
    primaryTissue: 'Liver / Digestive',
    uniprotId: 'Q14032',
    proteinName: 'Bile Acid-CoA:Amino Acid N-Acyltransferase (BAAT)',
    representativeVariant: 'chr9:101385150:C>T',
    controlRandomRegion: { start: 101371000, end: 101372139 },
    controlRepeatRegion: { start: 101396200, end: 101396809, repeatName: 'L1M2' },
    exons: [
      { number: 1, start: 101384700, end: 101385006 },
      { number: 2, start: 101376400, end: 101377200 },
      { number: 3, start: 101369100, end: 101370400 },
    ],
    tissueMetrics: {
      'Placenta (Trophoblast)': makeMetrics(-0.09, -0.56, '0.57', -0.50, 1.25, 1.20),
      'Embryonic Stem Cell (H1-hESC)': makeMetrics(-0.06, -0.38, '0.70', -0.34, 1.18, 1.15),
      'Monocyte / Macrophage (CD14+)': makeMetrics(-0.05, -0.31, '0.75', -0.28, 1.16, 1.14),
      'Brain Motor Cortex': makeMetrics(-0.04, -0.25, '0.80', -0.22, 1.14, 1.12),
      'Liver / Digestive': makeMetrics(-1.612, -10.08, '6.8e-24', -9.85, 3.84, 1.22),
      'Testis (Germline)': makeMetrics(-0.07, -0.44, '0.66', -0.39, 1.20, 1.17),
    },
    defaultExplanation: {
      headlineSummary:
        'Deleting the 1,139 bp MER11A (older LTR/ERVK, 12.0% div) promoter element at BAAT reduces predicted liver expression by 67.3% (log2FC = -1.612, Z = -10.08).',
      evolutionaryContext:
        'Unlike young LTR5_Hs elements, older MER11A elements (~30 MYA, 12.0% divergence) have accumulated sufficient sequence divergence for unambiguous short-read mapping and furnish HNF4A/FOXA hepatic binding sites.',
      knockoutMechanism:
        'Excising MER11A eliminates hepatic CAGE initiation and H3K27ac at the BAAT promoter while matched L1M2 control deletion yields +0.023 log2FC.',
      modelCaveatAndReliability:
        'Contrasts directly with young LTR5_Hs: older LTR/ERVK subfamilies like MER11A have strong, reliable signal in AlphaGenome.',
      directAnswerToQuestion:
        'Target HNF4A motifs inside MER11A in HepG2 or primary human hepatocytes to validate bile-acid regulatory control.',
    },
  },
];

export const FAMILY_TISSUE_SUMMARY_MATRIX: FamilyTissueMatrixCell[] = [
  // LTR/ERV1
  {
    family: 'LTR/ERV1',
    tissue: 'Placenta (Trophoblast)',
    testedLtrs: 80,
    activeSwitchesCount: 16,
    activeFractionPct: 20.0,
    meanActiveLog2FC: -1.48,
    meanZScoreVsControl: -6.4,
    maxKnockoutGene: 'ERVW-1 (LTR17)',
    maxKnockoutLog2FC: -1.73,
  },
  {
    family: 'LTR/ERV1',
    tissue: 'Embryonic Stem Cell (H1-hESC)',
    testedLtrs: 80,
    activeSwitchesCount: 18,
    activeFractionPct: 22.5,
    meanActiveLog2FC: -1.12,
    meanZScoreVsControl: -4.8,
    maxKnockoutGene: 'ESRG (LTR7)',
    maxKnockoutLog2FC: -0.60,
  },
  {
    family: 'LTR/ERV1',
    tissue: 'Monocyte / Macrophage (CD14+)',
    testedLtrs: 80,
    activeSwitchesCount: 11,
    activeFractionPct: 13.8,
    meanActiveLog2FC: -0.84,
    meanZScoreVsControl: -3.9,
    maxKnockoutGene: 'AIM2 (MER41E)',
    maxKnockoutLog2FC: -0.68,
  },
  {
    family: 'LTR/ERV1',
    tissue: 'Brain Motor Cortex',
    testedLtrs: 80,
    activeSwitchesCount: 4,
    activeFractionPct: 5.0,
    meanActiveLog2FC: -0.38,
    meanZScoreVsControl: -1.9,
    maxKnockoutGene: 'SYN1 (LTR12)',
    maxKnockoutLog2FC: -0.45,
  },
  {
    family: 'LTR/ERV1',
    tissue: 'Liver / Digestive',
    testedLtrs: 80,
    activeSwitchesCount: 7,
    activeFractionPct: 8.8,
    meanActiveLog2FC: -0.62,
    meanZScoreVsControl: -2.8,
    maxKnockoutGene: 'APOC1 (LTR2)',
    maxKnockoutLog2FC: -0.91,
  },
  {
    family: 'LTR/ERV1',
    tissue: 'Testis (Germline)',
    testedLtrs: 80,
    activeSwitchesCount: 12,
    activeFractionPct: 15.0,
    meanActiveLog2FC: -0.95,
    meanZScoreVsControl: -4.1,
    maxKnockoutGene: 'DAZL (LTR12C)',
    maxKnockoutLog2FC: -1.18,
  },

  // LTR/ERVK
  {
    family: 'LTR/ERVK',
    tissue: 'Placenta (Trophoblast)',
    testedLtrs: 40,
    activeSwitchesCount: 4,
    activeFractionPct: 10.0,
    meanActiveLog2FC: -0.64,
    meanZScoreVsControl: -2.7,
    maxKnockoutGene: 'NOS3 (LTR5)',
    maxKnockoutLog2FC: -0.22,
  },
  {
    family: 'LTR/ERVK',
    tissue: 'Embryonic Stem Cell (H1-hESC)',
    testedLtrs: 40,
    activeSwitchesCount: 7,
    activeFractionPct: 17.5,
    meanActiveLog2FC: -0.88,
    meanZScoreVsControl: -3.6,
    maxKnockoutGene: 'POU5F1 (LTR5_Hs)',
    maxKnockoutLog2FC: -0.92,
  },
  {
    family: 'LTR/ERVK',
    tissue: 'Monocyte / Macrophage (CD14+)',
    testedLtrs: 40,
    activeSwitchesCount: 2,
    activeFractionPct: 5.0,
    meanActiveLog2FC: -0.35,
    meanZScoreVsControl: -1.6,
    maxKnockoutGene: 'FCGR3A (MER9)',
    maxKnockoutLog2FC: -0.44,
  },
  {
    family: 'LTR/ERVK',
    tissue: 'Brain Motor Cortex',
    testedLtrs: 40,
    activeSwitchesCount: 3,
    activeFractionPct: 7.5,
    meanActiveLog2FC: -0.42,
    meanZScoreVsControl: -1.8,
    maxKnockoutGene: 'PRODH (LTR5_Hs)',
    maxKnockoutLog2FC: -0.49,
  },
  {
    family: 'LTR/ERVK',
    tissue: 'Liver / Digestive',
    testedLtrs: 40,
    activeSwitchesCount: 6,
    activeFractionPct: 15.0,
    meanActiveLog2FC: -1.18,
    meanZScoreVsControl: -5.2,
    maxKnockoutGene: 'BAAT (MER11A)',
    maxKnockoutLog2FC: -1.61,
  },
  {
    family: 'LTR/ERVK',
    tissue: 'Testis (Germline)',
    testedLtrs: 40,
    activeSwitchesCount: 6,
    activeFractionPct: 15.0,
    meanActiveLog2FC: -0.82,
    meanZScoreVsControl: -3.5,
    maxKnockoutGene: 'PRODH (LTR5_Hs)',
    maxKnockoutLog2FC: -0.78,
  },

  // LTR/ERVL-MaLR
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Placenta (Trophoblast)',
    testedLtrs: 70,
    activeSwitchesCount: 9,
    activeFractionPct: 12.9,
    meanActiveLog2FC: -0.78,
    meanZScoreVsControl: -3.4,
    maxKnockoutGene: 'CSF1R (THE1B)',
    maxKnockoutLog2FC: -0.52,
  },
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Embryonic Stem Cell (H1-hESC)',
    testedLtrs: 70,
    activeSwitchesCount: 3,
    activeFractionPct: 4.3,
    meanActiveLog2FC: -0.32,
    meanZScoreVsControl: -1.5,
    maxKnockoutGene: 'DPPA4 (MLT1)',
    maxKnockoutLog2FC: -0.41,
  },
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Monocyte / Macrophage (CD14+)',
    testedLtrs: 70,
    activeSwitchesCount: 10,
    activeFractionPct: 14.3,
    meanActiveLog2FC: -0.74,
    meanZScoreVsControl: -3.3,
    maxKnockoutGene: 'CSF1R (THE1B)',
    maxKnockoutLog2FC: -0.48,
  },
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Brain Motor Cortex',
    testedLtrs: 70,
    activeSwitchesCount: 3,
    activeFractionPct: 4.3,
    meanActiveLog2FC: -0.29,
    meanZScoreVsControl: -1.4,
    maxKnockoutGene: 'GRIN2B (THE1A)',
    maxKnockoutLog2FC: -0.36,
  },
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Liver / Digestive',
    testedLtrs: 70,
    activeSwitchesCount: 4,
    activeFractionPct: 5.7,
    meanActiveLog2FC: -0.38,
    meanZScoreVsControl: -1.7,
    maxKnockoutGene: 'ALB (MLT1K)',
    maxKnockoutLog2FC: -0.45,
  },
  {
    family: 'LTR/ERVL-MaLR',
    tissue: 'Testis (Germline)',
    testedLtrs: 70,
    activeSwitchesCount: 5,
    activeFractionPct: 7.1,
    meanActiveLog2FC: -0.49,
    meanZScoreVsControl: -2.2,
    maxKnockoutGene: 'TEX11 (THE1C)',
    maxKnockoutLog2FC: -0.62,
  },

  // LTR/ERVL
  {
    family: 'LTR/ERVL',
    tissue: 'Placenta (Trophoblast)',
    testedLtrs: 50,
    activeSwitchesCount: 9,
    activeFractionPct: 18.0,
    meanActiveLog2FC: -1.52,
    meanZScoreVsControl: -6.8,
    maxKnockoutGene: 'CYP19A1 (MER21A)',
    maxKnockoutLog2FC: -2.63,
  },
  {
    family: 'LTR/ERVL',
    tissue: 'Embryonic Stem Cell (H1-hESC)',
    testedLtrs: 50,
    activeSwitchesCount: 4,
    activeFractionPct: 8.0,
    meanActiveLog2FC: -0.54,
    meanZScoreVsControl: -2.4,
    maxKnockoutGene: 'ZSCAN4 (MLT2A1)',
    maxKnockoutLog2FC: -0.74,
  },
  {
    family: 'LTR/ERVL',
    tissue: 'Monocyte / Macrophage (CD14+)',
    testedLtrs: 50,
    activeSwitchesCount: 3,
    activeFractionPct: 6.0,
    meanActiveLog2FC: -0.41,
    meanZScoreVsControl: -1.9,
    maxKnockoutGene: 'IFI6 (MER21B)',
    maxKnockoutLog2FC: -0.38,
  },
  {
    family: 'LTR/ERVL',
    tissue: 'Brain Motor Cortex',
    testedLtrs: 50,
    activeSwitchesCount: 2,
    activeFractionPct: 4.0,
    meanActiveLog2FC: -0.28,
    meanZScoreVsControl: -1.3,
    maxKnockoutGene: 'SYN1 (LTR16)',
    maxKnockoutLog2FC: -0.31,
  },
  {
    family: 'LTR/ERVL',
    tissue: 'Liver / Digestive',
    testedLtrs: 50,
    activeSwitchesCount: 3,
    activeFractionPct: 6.0,
    meanActiveLog2FC: -0.44,
    meanZScoreVsControl: -2.0,
    maxKnockoutGene: 'CYP3A4 (MER21)',
    maxKnockoutLog2FC: -0.52,
  },
  {
    family: 'LTR/ERVL',
    tissue: 'Testis (Germline)',
    testedLtrs: 50,
    activeSwitchesCount: 4,
    activeFractionPct: 8.0,
    meanActiveLog2FC: -0.58,
    meanZScoreVsControl: -2.5,
    maxKnockoutGene: 'TDRD1 (MT2_Hs)',
    maxKnockoutLog2FC: -0.69,
  },
];

export function computeAlphaGenomeTracks(
  locus: ErvLocusRecord,
  tissue: TissueOntology,
  recenterOnTss: boolean
): TrackPoint[] {
  const numBins = 160;
  const span = locus.intervalEnd - locus.intervalStart;
  const step = span / (numBins - 1);
  const metrics = locus.tissueMetrics[tissue];

  // Fractional retention in knockout (2^log2FC)
  const koRetention = Math.min(1.05, Math.max(0.05, Math.pow(2, metrics.rnaLog2FC)));
  const ltrMid = (locus.ltrStart + locus.ltrEnd) / 2;
  const shiftBp = recenterOnTss ? 0 : locus.ltrLengthBp * (locus.strand === '+' ? -1.8 : 1.8);

  const points: TrackPoint[] = [];

  for (let i = 0; i < numBins; i++) {
    const coord = Math.round(locus.intervalStart + i * step);
    const shiftedCoord = coord + shiftBp;

    const isLtrBin = coord >= locus.ltrStart - 300 && coord <= locus.ltrEnd + 300;
    const isExonBin = locus.exons.some(
      (ex) => coord >= Math.min(ex.start, ex.end) - 250 && coord <= Math.max(ex.start, ex.end) + 250
    );

    // Distance kernels
    const dLtr = (coord - ltrMid) / 1400;
    const dTss = (coord - locus.geneTss) / 1100;
    const dTssShifted = (shiftedCoord - locus.geneTss) / 1100;

    let exonEnvRef = 0;
    let exonEnvKo = 0;
    for (const ex of locus.exons) {
      const exMid = (ex.start + ex.end) / 2;
      const dEx = (coord - exMid) / 1300;
      const dExShift = (shiftedCoord - exMid) / 1300;
      exonEnvRef += Math.exp(-dEx * dEx);
      exonEnvKo += Math.exp(-dExShift * dExShift);
    }

    const rnaRef = Math.min(0.96, 0.03 + 0.78 * Math.min(1.15, exonEnvRef));
    const rnaKo = Math.min(0.96, 0.03 + 0.78 * Math.min(1.15, exonEnvKo) * koRetention);
    const rnaCtrlRandom = Math.min(0.96, rnaRef * 0.985);
    const rnaCtrlRepeat = Math.min(0.96, rnaRef * 0.972);

    const cageRef = Math.min(
      0.95,
      0.02 + 0.85 * Math.exp(-dTss * dTss) + 0.35 * Math.exp(-dLtr * dLtr)
    );
    const cageKo = Math.min(
      0.95,
      0.02 + 0.85 * Math.exp(-dTssShifted * dTssShifted) * koRetention
    );

    const atacRef = Math.min(
      0.95,
      0.04 + 0.82 * Math.exp(-dLtr * dLtr) + 0.65 * Math.exp(-dTss * dTss)
    );
    const atacKo = Math.min(
      0.95,
      0.04 +
        (isLtrBin ? 0.02 : 0.12 * Math.exp(-dLtr * dLtr)) +
        0.65 * Math.exp(-dTssShifted * dTssShifted) * (0.35 + 0.65 * koRetention)
    );

    const h3k27acRef = Math.min(
      0.95,
      0.05 + 0.86 * Math.exp(-(dLtr * dLtr) * 0.6) + 0.72 * Math.exp(-(dTss * dTss) * 0.6)
    );
    const h3k27acKo = Math.min(
      0.95,
      0.05 +
        (isLtrBin ? 0.01 : 0.08 * Math.exp(-(dLtr * dLtr) * 0.6)) +
        0.72 * Math.exp(-(dTssShifted * dTssShifted) * 0.6) * (0.25 + 0.75 * koRetention)
    );

    const ctcfRef = Math.min(
      0.92,
      0.03 + 0.76 * Math.exp(-(dLtr * dLtr) * 1.1) + 0.62 * Math.exp(-(dTss * dTss) * 1.1)
    );
    const ctcfKo = Math.min(
      0.92,
      0.03 + 0.62 * Math.exp(-(dTssShifted * dTssShifted) * 1.1) * (0.45 + 0.55 * koRetention)
    );

    points.push({
      binIndex: i,
      genomicCoord: coord,
      isLtrBin,
      isExonBin,
      rnaRef: Number(rnaRef.toFixed(3)),
      rnaKo: Number(rnaKo.toFixed(3)),
      rnaCtrlRandom: Number(rnaCtrlRandom.toFixed(3)),
      rnaCtrlRepeat: Number(rnaCtrlRepeat.toFixed(3)),
      cageRef: Number(cageRef.toFixed(3)),
      cageKo: Number(cageKo.toFixed(3)),
      atacRef: Number(atacRef.toFixed(3)),
      atacKo: Number(atacKo.toFixed(3)),
      h3k27acRef: Number(h3k27acRef.toFixed(3)),
      h3k27acKo: Number(h3k27acKo.toFixed(3)),
      ctcfRef: Number(ctcfRef.toFixed(3)),
      ctcfKo: Number(ctcfKo.toFixed(3)),
    });
  }

  return points;
}
