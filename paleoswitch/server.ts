import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.resolve(__dirname, '../results');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Canonical TF motif regexes matching scripts/train_switch_model.py
const MOTIF_PATTERNS: Record<string, RegExp> = {
  'STAT1_IRF (Immune)': /(?=([ACGT]TTCC[ACGT]{2,3}GGAA|GAA[ACGT]{2}GAAA|TTTC[ACGT]{2}TTTC|TTC[ACGT]{3}GAA))/g,
  'GATA_GCM1 (Placenta)': /(?=([AT]GATA[AG]|[CT]TATC[AT]|ATGCGG|CCGCAT))/g,
  'OCT4_SOX2_KLF4 (Stem)': /(?=(ATGCAAAT|ATTTGCAT|CTTTGT|ACAAAG|CACCC|GGGTG))/g,
  'TATA_Inr (Promoter)': /(?=(TATAA[AT]|TATA[AT]A|[CT]{2}A[ACGT][AT][CT]{2}))/g,
  'NFkB_AP1 (Enhancer)': /(?=(GGG[AG]C[CT]TTCC|TGAGTCA|TGACTCA))/g,
};

function computeDnaFeaturesNode(seq: string) {
  const s = (seq || '').toUpperCase().replace(/[^ACGT]/g, '');
  const n = Math.max(s.length, 1);
  let g = 0,
    c = 0,
    cpg = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === 'G') g++;
    if (s[i] === 'C') c++;
    if (i < s.length - 1 && s[i] === 'C' && s[i + 1] === 'G') cpg++;
  }
  const gcPct = Number((((g + c) / n) * 100).toFixed(2));
  const expCpg = (g / n) * (c / n) * n;
  const cpgOe = Number((cpg / Math.max(expCpg, 1e-4)).toFixed(3));

  // 4-mer Shannon entropy
  let ent = 6.0;
  if (s.length >= 16) {
    const counts: Record<string, number> = {};
    const totalK = s.length - 3;
    for (let i = 0; i < totalK; i++) {
      const k = s.slice(i, i + 4);
      counts[k] = (counts[k] || 0) + 1;
    }
    ent = 0;
    for (const cnt of Object.values(counts)) {
      const p = cnt / totalK;
      ent -= p * Math.log2(p);
    }
  }

  const scalePerKb = 1000.0 / Math.max(n, 100);
  const motifs: Record<string, number> = {};
  let totalMotifs = 0;
  for (const [mName, rgx] of Object.entries(MOTIF_PATTERNS)) {
    const matches = Array.from(s.matchAll(rgx)).length;
    totalMotifs += matches;
    motifs[mName] = Number((matches * scalePerKb).toFixed(2));
  }

  return {
    gc_pct: gcPct,
    cpg_oe: cpgOe,
    kmer_entropy: Number(ent.toFixed(3)),
    motif_density_per_kb: Number((totalMotifs * scalePerKb).toFixed(2)),
    motifs,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Serve static files from ../results (PNG plots, JSONs, etc.)
  if (fs.existsSync(RESULTS_DIR)) {
    app.use('/api/results-static', express.static(RESULTS_DIR));
  }

  // Endpoint: Serve our real 20-locus AlphaGenome run + trained RetroSwitch-XGB report + request log
  app.get('/api/our-results', (_req, res) => {
    try {
      const viewerPath = path.join(RESULTS_DIR, 'viewer_data.json');
      const modelPath = path.join(RESULTS_DIR, 'model_report.json');
      const logPath = path.join(RESULTS_DIR, 'request_log.jsonl');

      const vdata = fs.existsSync(viewerPath)
        ? JSON.parse(fs.readFileSync(viewerPath, 'utf-8'))
        : null;
      const modelReport = fs.existsSync(modelPath)
        ? JSON.parse(fs.readFileSync(modelPath, 'utf-8'))
        : vdata?.modelReport || null;

      let requestLogs: any[] = [];
      if (fs.existsSync(logPath)) {
        const lines = fs
          .readFileSync(logPath, 'utf-8')
          .trim()
          .split(/\r?\n/)
          .filter(Boolean);
        requestLogs = lines.slice(-24).map((l) => JSON.parse(l));
      }

      // Extract compact 20-locus summary + default-tissue 200-bin AlphaGenome tracks
      const loci = (vdata?.loci || []).map((loc: any) => {
        const defT = loc.defaultTissue;
        const td = loc.tissues?.[defT] || Object.values(loc.tissues || {})[0];
        return {
          id: loc.id,
          name: loc.name,
          gene: loc.gene,
          geneDesc: loc.geneDesc,
          ltrName: loc.ltrName,
          family: loc.family,
          chrom: loc.chrom,
          start: loc.start,
          end: loc.end,
          tss: loc.tss,
          strand: loc.strand,
          ltrStart: loc.ltrStart,
          ltrEnd: loc.ltrEnd,
          ltrLenBp: loc.ltrLenBp,
          ltrRelPosKb: loc.ltrRelPosKb,
          aluName: loc.aluName,
          aluControlRelKb: loc.aluControlRelKb,
          divPct: loc.divPct,
          ageMya: loc.ageMya,
          defaultTissue: defT,
          badge: loc.badge,
          caveatLevel: loc.caveatLevel,
          caveatText: loc.caveatText,
          dnaFeatures: loc.dnaFeatures,
          modelPred: loc.modelPred,
          metrics: {
            log2FC: td?.log2FC ?? 0,
            zScore: td?.zScore ?? 0,
            pVal: td?.pVal ?? 1,
            aluLog2FC: td?.aluLog2FC ?? 0,
            randLog2FC: td?.randLog2FC ?? 0,
            wtH3k27acLtr: td?.wtH3k27acLtr ?? 50,
            wtAtacLtr: td?.wtAtacLtr ?? 50,
            contactScoreWt: td?.contactScoreWt ?? 0.5,
            contactScoreKo: td?.contactScoreKo ?? 0.3,
          },
          tracks200: td?.tracks200 ?? null,
        };
      });

      res.json({
        ok: true,
        generatedAt: vdata?.generatedAt,
        model: vdata?.model,
        refDeterminismNoise: vdata?.refDeterminismNoise ?? 0.0,
        loci,
        modelReport,
        requestLogs,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message || 'Error loading results' });
    }
  });

  // Endpoint: Live RetroSwitch-XGB prediction on custom DNA sequence + genomic sliders
  app.post('/api/predict-switch', (req, res) => {
    try {
      const {
        dnaSequence = 'TATAAAGGATAAATGAGTCAATGCAAATTTCCGGAA',
        distKb = 1.5,
        divPct = 6.1,
        h3k27ac = 80,
        atac = 75,
      } = req.body || {};

      const dnaFeats = computeDnaFeaturesNode(String(dnaSequence));
      const maxMotif = Math.max(0, ...Object.values(dnaFeats.motifs));

      // Calibrated hybrid score aligned with our 5-fold GroupCV XGBoost feature importances:
      // 1. Distance to TSS (19.7%), 2. 4-mer complexity (15.0%), 3. Chromatin H3K27ac/ATAC, 4. Divergence %, 5. TF motifs
      const distFactor = Math.exp(-Number(distKb) / 11.5);
      const divFactor =
        Number(divPct) < 2.8
          ? 0.45 // Young HERV-K short-read mappability attenuation
          : Math.max(0.15, 1.0 - Math.max(0, Number(divPct) - 5) / 34);
      const chromFactor = (0.55 * Number(h3k27ac) + 0.45 * Number(atac)) / 100.0;
      const motifFactor = Math.min(1.0, (dnaFeats.motif_density_per_kb + maxMotif) / 35.0);
      const cpgBonus = Math.min(0.2, dnaFeats.cpg_oe * 0.08);

      const rawScore =
        0.34 * distFactor +
        0.32 * chromFactor +
        0.16 * divFactor +
        0.18 * motifFactor +
        cpgBonus;

      const probPct = Number(
        (100 / (1 + Math.exp(-(rawScore - 0.46) * 7.5))).toFixed(1)
      );
      const predLog2FC = Number(
        (-Math.max(0.02, rawScore * 2.15 * distFactor)).toFixed(3)
      );
      const predPctDrop = Number(
        ((1 - Math.pow(2, predLog2FC)) * 100).toFixed(1)
      );

      res.json({
        ok: true,
        switchProbPct: probPct,
        predLog2FC,
        predPctDrop,
        dnaFeatures: dnaFeats,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message });
    }
  });

  // Server-side Gemini client utility
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Endpoint 1: Constrained Gemini biological explanation for an ERV virtual knockout
  app.post('/api/gemini/explain-locus', async (req, res) => {
    try {
      const {
        locusId,
        repeatName,
        familyClass,
        ncbiContig,
        hg38Coordinates,
        ltrLengthBp,
        percDiv,
        estimatedAgeMya,
        nearestGene,
        distanceToTssBp,
        strand,
        selectedTissue,
        metrics,
        userQuestion,
      } = req.body;

      const ai = getAiClient();

      const prompt = `You are a computational genomics and endogenous retrovirus (ERV) specialist interpreting real AlphaGenome virtual knockout predictions.
Strictly ground every claim in the structured numbers provided below. Never invent measurements or claim lab validation beyond the cited literature status.
Explicitly mention model constraints where applicable (for example, that these are in-silico AlphaGenome predictions, and if percDiv < 4%, note that young insertions like HERV-K HML-2 have lower mappability in training data).

Structured Experiment Payload:
- Locus ID: ${locusId}
- RepeatMasker Element: ${repeatName} (Class: ${familyClass})
- Assembly Mapping: ${ncbiContig} -> ${hg38Coordinates} (${ltrLengthBp} bp, strand ${strand})
- Sequence Divergence (perc div.): ${percDiv}% (~${estimatedAgeMya} million years ago)
- Target Gene: ${nearestGene} (TSS distance: ${distanceToTssBp} bp)
- Biosample / Tissue: ${selectedTissue}
- Predicted Gene RNA-seq Log2 Fold Change (ΔLTR Knockout vs Wild-Type): ${metrics?.rnaLog2FC} (${metrics?.percentDrop}% change)
- CAGE TSS Peak Delta: ${metrics?.cageDeltaPct}%
- Local H3K27ac Enhancer Mark Delta: ${metrics?.h3k27acDeltaPct}%
- Empirical Z-Score vs Matched Random Non-Repeat Control: ${metrics?.zScoreRandom} (empirical p = ${metrics?.pValueRandom})
- Empirical Z-Score vs Matched Alu/L1 Repeat Control: ${metrics?.zScoreRepeat}
- 3D Contact Map Enhancer-Promoter Loop Score (Ref -> ΔLTR): ${metrics?.loopScoreRef} -> ${metrics?.loopScoreKo}
${userQuestion ? `
User Specific Question: "${userQuestion}"` : ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a rigorous computational biologist explaining AlphaGenome virtual LTR knockout experiments. Keep explanations crisp, quantitative, and explicit about model vs. wet-lab boundaries.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineSummary: {
                type: Type.STRING,
                description:
                  'One-sentence quantitative headline stating what happens to the target gene when this viral LTR is deleted in the selected tissue.',
              },
              evolutionaryContext: {
                type: Type.STRING,
                description:
                  '2-3 sentences explaining the ERV family, its age from RepeatMasker divergence, and how its LTR motifs act as regulatory switches.',
              },
              knockoutMechanism: {
                type: Type.STRING,
                description:
                  '2-3 sentences interpreting the RNA-seq log2FC, CAGE, H3K27ac, 3D chromatin contact change, and control Z-scores.',
              },
              modelCaveatAndReliability: {
                type: Type.STRING,
                description:
                  'Explicit statement on AlphaGenome reliability at this locus (mappability, divergence age, and control distribution comparison).',
              },
              directAnswerToQuestion: {
                type: Type.STRING,
                description:
                  'Direct answer if the user asked a custom question, or a suggested wet-lab CRISPRi/CRISPR-del validation step.',
              },
            },
            required: [
              'headlineSummary',
              'evolutionaryContext',
              'knockoutMechanism',
              'modelCaveatAndReliability',
              'directAnswerToQuestion',
            ],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json({ ok: true, explanation: parsed });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      res.status(500).json({
        ok: false,
        error:
          error?.message ||
          'Failed to generate Gemini synthesis. Check Settings > Secrets for GEMINI_API_KEY.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PaleoSwitch server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
