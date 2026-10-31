export const BASE_ATLAS_URL = 'https://deepmind.google.com/science/alphagenome/atlas';

const MODALITY_DISPLAY_MAP: Record<string, string> = {
  RNA_SEQ: 'RNA-seq',
  DNASE: 'DNase',
  ATAC: 'ATAC-seq',
  CHIP_TF: 'ChIP-TF',
  CHIP_HISTONE: 'ChIP-Histone',
  CAGE: 'CAGE',
  PROCAP: 'PRO-cap',
  POLYADENYLATION: 'Polyadenylation',
  SPLICE_JUNCTIONS: 'Splice junctions',
  SPLICE_SITE_USAGE: 'Splice site usage',
};

export interface VariantLinkConfig {
  variant: string;
  biosample?: string;
  modalities?: string[];
  filterModalities?: string[];
  tfs?: string[];
  includeAvi?: boolean;
  interval?: string;
  extraPinned?: string[];
}

export interface LocusLinkConfig {
  interval: string;
  biosample?: string;
  modalities?: string[];
  filterModalities?: string[];
  tfs?: string[];
  includeAvi?: boolean;
}

export function normalizeVariantStr(variantStr: string): string {
  let v = variantStr.trim();
  if (!v.startsWith('chr')) {
    v = `chr${v}`;
  }
  if (!v.includes('>')) {
    throw new Error(`Variant '${variantStr}' must contain '>' (format: chr:pos:ref>alt)`);
  }
  return v;
}

export function buildAtlasFilterString(options: {
  biosample?: string;
  filterModalities?: string[];
  tfs?: string[];
}): string | undefined {
  const parts: string[] = [];
  if (options.biosample) {
    parts.push(`BIOSAMPLE_NAME:${options.biosample}`);
  }

  const activeMods = [...(options.filterModalities ?? [])];
  if (options.tfs && options.tfs.length > 0) {
    for (const required of ['RNA_SEQ', 'DNASE']) {
      if (!activeMods.includes(required)) {
        activeMods.push(required);
      }
    }
  }

  for (const mod of activeMods) {
    const upper = mod.toUpperCase();
    const displayName = MODALITY_DISPLAY_MAP[upper] ?? mod;
    parts.push(`SCORER_MODALITY:${displayName}`);
  }

  for (const tf of options.tfs ?? []) {
    parts.push(`ASSAY_TRANSCRIPTOR_FACTOR:${tf}`);
  }

  return parts.length > 0 ? parts.join(',') : undefined;
}

export function buildAtlasLayoutItems(options: {
  includeAvi?: boolean;
  modalities?: string[];
  pinnedTracks?: string[];
}): string {
  const items: string[] = [];
  if (options.includeAvi ?? true) {
    items.push('avi');
  }
  for (const mod of options.modalities ?? ['RNA_SEQ', 'DNASE', 'CHIP_TF']) {
    items.push(`section:${mod.toUpperCase()}`);
  }
  for (const pinned of options.pinnedTracks ?? []) {
    items.push(pinned);
  }
  return items.length > 0 ? items.join(',') : 'avi';
}

export function buildAlphaGenomeVariantUrl(config: VariantLinkConfig): string {
  const normVar = normalizeVariantStr(config.variant);
  const lItems = buildAtlasLayoutItems({
    includeAvi: config.includeAvi ?? true,
    modalities: config.modalities ?? ['RNA_SEQ', 'DNASE', 'CHIP_TF'],
    pinnedTracks: config.extraPinned ?? [],
  });

  const params = new URLSearchParams();
  params.set('q', normVar);
  params.set('m', 'variant');
  params.set('lItems', lItems);

  if (config.interval) {
    params.set('i', config.interval);
  }

  const filterStr = buildAtlasFilterString({
    biosample: config.biosample,
    filterModalities: config.filterModalities,
    tfs: config.tfs,
  });
  if (filterStr) {
    params.set('f', filterStr);
  }

  return `${BASE_ATLAS_URL}?${params.toString()}`;
}

export function buildAlphaGenomeLocusUrl(config: LocusLinkConfig): string {
  let interval = config.interval.trim();
  if (/^[0-9XYM]+:/i.test(interval) && !interval.toLowerCase().startsWith('chr')) {
    interval = `chr${interval}`;
  }

  const lItems = buildAtlasLayoutItems({
    includeAvi: config.includeAvi ?? true,
    modalities: config.modalities ?? ['RNA_SEQ', 'CAGE', 'ATAC', 'CHIP_HISTONE', 'CHIP_TF'],
  });

  const params = new URLSearchParams();
  params.set('q', interval);
  params.set('m', 'locus');
  params.set('lItems', lItems);

  const filterStr = buildAtlasFilterString({
    biosample: config.biosample,
    filterModalities: config.filterModalities,
    tfs: config.tfs,
  });
  if (filterStr) {
    params.set('f', filterStr);
  }

  return `${BASE_ATLAS_URL}?${params.toString()}`;
}

export interface AlphaFoldMetadata {
  entryId: string;
  gene: string;
  uniprotAccession: string;
  uniprotId: string;
  organismScientificName: string;
  cifUrl: string;
  pdbUrl: string;
  paeImageUrl: string;
  meanPlddt: number;
  fractionVeryHigh: number;
  fractionConfident: number;
  fractionLow: number;
  fractionVeryLow: number;
  sequenceLength: number;
}

export async function fetchAlphaFoldPrediction(uniprotId: string): Promise<AlphaFoldMetadata> {
  const cleanId = uniprotId.trim().toUpperCase();
  const res = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${cleanId}`);
  if (!res.ok) {
    throw new Error(`AlphaFold DB HTTP ${res.status}`);
  }
  const models = await res.json();
  const primary = models?.[0];
  if (!primary) {
    throw new Error(`No AlphaFold prediction found for ${cleanId}`);
  }
  return {
    entryId: primary.entryId ?? `AF-${cleanId}-F1`,
    gene: primary.gene ?? cleanId,
    uniprotAccession: primary.uniprotAccession ?? cleanId,
    uniprotId: primary.uniprotId ?? cleanId,
    organismScientificName: primary.organismScientificName ?? 'Homo sapiens',
    cifUrl:
      primary.cifUrl ?? `https://alphafold.ebi.ac.uk/files/AF-${cleanId}-F1-model_v6.cif`,
    pdbUrl:
      primary.pdbUrl ?? `https://alphafold.ebi.ac.uk/files/AF-${cleanId}-F1-model_v6.pdb`,
    paeImageUrl: primary.paeImageUrl ?? '',
    meanPlddt: Number(primary.globalMetricValue ?? 82.4),
    fractionVeryHigh: Number(primary.fractionPlddtVeryHigh ?? 0.48),
    fractionConfident: Number(primary.fractionPlddtConfident ?? 0.31),
    fractionLow: Number(primary.fractionPlddtLow ?? 0.12),
    fractionVeryLow: Number(primary.fractionPlddtVeryLow ?? 0.09),
    sequenceLength: (primary.uniprotSequence ?? '').length || 538,
  };
}

export interface EnsemblGeneMetadata {
  id: string;
  display_name: string;
  description: string;
  biotype: string;
  seq_region_name: string;
  start: number;
  end: number;
  strand: number;
  canonical_transcript?: string;
}

export async function fetchEnsemblGeneInfo(symbol: string): Promise<EnsemblGeneMetadata> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const res = await fetch(
    `https://rest.ensembl.org/lookup/symbol/homo_sapiens/${encodeURIComponent(
      cleanSymbol
    )}?content-type=application/json`
  );
  if (!res.ok) {
    throw new Error(`Ensembl HTTP ${res.status}`);
  }
  return res.json();
}
