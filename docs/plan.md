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

## Next steps

1. Script one knockout on a known LTR near a gene and plot the difference. Check that the effect is big enough to be visually interesting.
2. Scale to a few hundred LTRs on one chromosome and build the family × tissue heatmap.
3. Build the viewer (Gemini-assisted) on top of the saved results.
