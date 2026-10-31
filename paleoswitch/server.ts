import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Server-side Gemini client utility with required 'aistudio-build' User-Agent
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
${userQuestion ? `\nUser Specific Question: "${userQuestion}"` : ''}`;

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

  // Vite middleware for development or static serving for production
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
