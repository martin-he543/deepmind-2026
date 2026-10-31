# Plan: which ancient viruses still switch genes on?

## The idea

About 8% of the human genome is endogenous retroviruses (ERVs): DNA from viruses that infected our ancestors millions of years ago. Their ends (LTRs) can act as switches that turn nearby genes on, which has been linked to the placenta, ALS, multiple sclerosis and cancer.

We don't try to *detect* ERVs, because RepeatMasker already annotates them. We use **AlphaGenome** to ask what each known ERV *does*, and **Gemini** to make the results visual and understandable.

## Core experiment: the virtual knockout

1. Pick an ERV LTR near a gene (from the UCSC `rmsk` annotation, hg38).
2. Predict regulatory tracks (RNA-seq, CAGE, ATAC/DNase, histone marks) with AlphaGenome.
3. Delete the LTR from the sequence and predict again.
4. The difference is the LTR's predicted effect: *"remove this virus and gene X drops by N% in tissue Y."*

Repeat over many LTRs to get the headline result: **which ERV families still act as gene switches, and in which tissues.**

## Who does what

```
DNA region → AlphaGenome → numbers (tracks, contact maps, knockout Δ)
                                   ↓
                         Gemini → 3D viewer, charts, plain-English explanations
```

Every visual is driven by real AlphaGenome output. Gemini renders and explains it but never invents the data. Any purely illustrative animation is labelled as such.

## Demo flow

1. **Overview:** ERVs near genes, coloured by family.
2. **Click an ERV:** genome-browser tracks across tissues, plus a Gemini explanation (family, age, nearby gene).
3. **"Delete virus":** before/after tracks showing the knockout effect.
4. **3D fold:** approximate 3D DNA reconstructed from AlphaGenome's contact map, showing whether the LTR loops over to the gene. Labelled as a reconstruction from predicted contacts.
5. **Optional:** AlphaFold structure of an ERV-derived protein (e.g. syncytin-1).
6. **Summary:** heatmap of ERV family × tissue, ranked by knockout effect.

## Known limits (say these out loud)

- These are model predictions, not lab measurements.
- AlphaGenome is likely less reliable on very young ERVs (e.g. HERV-K HML-2), because near-identical copies are hard to map in its training data. Older families are safer.
- Contact maps are coarse, so the 3D fold is illustrative.

## Practical constraints

- Input lengths are fixed (~16 kb, 100 kb, 500 kb, 1 Mb); resize intervals with the SDK.
- Each knockout is 2 API calls. Test speed and limits on ~20 LTRs before scaling.
- Skip per-base mutation scans, or do at most one as a showcase, because they cost thousands of calls.

## Data (already downloaded, see README)

- `data/human_GRCh38/`: genome FASTA, `rm.out.gz` (RepeatMasker), assembly report. NCBI's `rm.out` is **not** a UCSC `rmsk` table: contigs are named `NC_000001.11`, not `chr1`, so map them using the assembly report before sending coordinates to AlphaGenome (which expects hg38 `chr*` names).
- `rm.out` classes include `LTR/ERV1`, `LTR/ERVK`, `LTR/ERVL` **and** `LTR/ERVL-MaLR` (the biggest group, ~750k LTR/ERV* rows in total, mostly solo LTRs). Decide up front whether MaLR is in scope.
- `data/pig_Sscrofa11.1/` is **not usable with AlphaGenome**, which only supports human and mouse. Keep it only if we fall back to the detection idea, or drop it.

## Experimental design (what the core experiment still needs)

**Choosing LTRs.** Solo LTR or intact element, at least ~300 bp, within ~50 kb of a protein-coding TSS, away from the interval edge (the deletion needs flanking context), and not overlapping an exon. Record family, divergence (`perc div.` in `rm.out` is a rough age proxy), distance to TSS and strand.

**Controls (without these the heatmap is not interpretable).**
- Delete a random non-repeat region of the same length at a similar distance from the same gene. This gives the null distribution of "deletion effect".
- Delete a non-ERV repeat (e.g. an Alu or L1 of similar size) to separate "ERVs are special" from "deleting anything near a gene matters".
- Predict the unedited reference twice to check run-to-run determinism.

**Effect metric.** Define before running: log2 fold change of the gene's predicted RNA-seq (or CAGE at its TSS) summed over exons, per tissue, and a local change in ATAC/H3K27ac over the LTR. Report the effect relative to the control distribution (empirical p-value or z-score), not the raw delta.

**Choosing tissues.** Pick a fixed list of ontology terms (e.g. placenta, ESC, brain, liver, blood/monocyte, testis) rather than all of them, to keep the heatmap readable and the multiple-testing burden low.

**Sanity checks against known biology** (positives the model should recover, and the first thing to test):
- ERVW-1 / syncytin-1 locus in placenta.
- HERV-H LTR7 in embryonic stem cells.
- The LTR promoter of CSF1R in monocytes/macrophages.
- Salivary amylase AMY1 (ERV-derived enhancer).
If the model does not reproduce these, say so and treat the whole-genome result as exploratory.

**Orientation.** Deleting the LTR shifts coordinates. Handle this explicitly (delete, then re-centre on the gene) so the ref and alt tracks line up for the difference.

## Engineering notes

- Add keys to `.env` (`ALPHAGENOME_API_KEY`, `GEMINI_API_KEY`); `python-dotenv` and `alphagenome` are now in requirements.txt (check the exact SDK package name and version against the AlphaGenome docs).
- Cache every API response to disk (`results/raw/<ltr_id>.npz`) keyed by interval and edit, so reruns, demo and plots never re-spend quota.
- Keep a single `ltrs.parquet` table (id, coords, family, age proxy, nearest gene, distance) as the contract between the pipeline stages and the viewer.
- Add retry with backoff (`tenacity` is already installed) and a request log to measure latency and the rate limit during the 20-LTR trial.
- Use a small committed sample of results for the demo so it runs without the 2 GB of data.

## Risks and fallbacks

| Risk | Fallback |
|---|---|
| API quota or latency too limiting | Use fewer LTRs (100 instead of hundreds) or a smaller input length (100 kb) |
| Knockout effects are tiny or noisy | Focus on a handful of strong, literature-backed loci as case studies |
| Effects are no larger than controls | Report that honestly: "most ERV LTRs don't act as switches in the model" is still a result |
| 3D fold is unconvincing | Drop it and keep tracks plus the heatmap |
| Gemini generates inaccurate explanations | Constrain it with structured inputs (numbers and annotations) and show those numbers beside the text |

## Suggested split of work

1. **Data and selection:** parse `rm.out`, map contigs, find LTRs near TSSs, build `ltrs.parquet`.
2. **Experiment:** knockout runner, controls, caching, effect metric.
3. **Viewer and narrative:** tracks, heatmap, Gemini explanations, 3D fold, pitch.

## Next steps

1. Script one knockout on a known LTR near a gene and plot the difference. Check that the effect is big enough to be visually interesting.
2. Scale to a few hundred LTRs on one chromosome and build the family × tissue heatmap.
3. Build the viewer (Gemini-assisted) on top of the saved results.
