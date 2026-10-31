ERVs make a good hackathon topic: there's a clear biological story, free labelled data, a strong classical baseline to beat, and real open problems.

## The core idea

About 8% of the human genome is endogenous retroviral sequence, the remains of ancient infections that got into the germline. Most copies are badly degraded: mutated, truncated, or reduced to a single LTR (long terminal repeat). Current tools mostly rely on homology or structure. RepeatMasker compares against the Dfam/Repbase libraries, while LTRharvest, LTR_retriever and RetroTector look for paired LTRs and retroviral genes. These work well for known families in well-studied genomes. They do worse on highly diverged copies and on new lineages in non-model species.

The pitch: **a deep learning model that flags and classifies ERV sequences directly from DNA, including degraded or unfamiliar ones, with an interpretable view of what it's detecting.**

## Three ways to scope it

**1. Window classifier (safest for 24–48h).** Given a 1–5 kb DNA window, predict ERV vs. not ERV, plus the class: ERV1 (gamma-like), ERVK (beta-like) or ERVL (spuma-like). This is achievable and easy to demo.

**2. Structural segmentation (more impressive).** Label each position as LTR, gag, pol, env, LTR or background, similar to gene annotation. The output looks like a genome-browser track showing the anatomy of each provirus.

**3. Cross-species discovery (best story).** Train on human and mouse, then run on a less-studied genome such as a bat, bird or pig. Check predictions independently by searching for retroviral protein domains, such as reverse transcriptase (Pfam RVT_1) and integrase (rve). This shows the model finding things the reference libraries miss. The pig angle is useful because porcine ERVs (PERVs) are a known safety concern for pig-to-human organ transplants.

## Practical pipeline

For data, download hg38 (start with one or two chromosomes) and the RepeatMasker annotation table (`rmsk`) from UCSC. Filter for the `LTR/ERV1`, `LTR/ERVK` and `LTR/ERVL` classes, then extract sequences with `bedtools getfasta`. For negatives, include hard cases: other repeats like LINEs, SINEs and DNA transposons, not just random background. Otherwise the model only learns "repeat vs. not repeat."

For the baseline, use k-mer frequency vectors (k=4–6) with logistic regression or XGBoost. It takes about an hour to build and will be surprisingly strong, which gives you an honest number to beat.

For the main model, either train a 1D CNN from scratch or fine-tune a pretrained DNA language model such as DNABERT-2, Nucleotide Transformer or HyenaDNA (better for longer contexts). A free Colab GPU is enough for a few thousand sequences.

For the demo, build a Streamlit app: paste in a FASTA sequence and get highlighted ERV regions with confidence scores. Add a saliency or attention map showing whether the model picks up real features like LTR promoter motifs, the primer binding site, or polyadenylation signals. Judges respond well to interpretability.

## Pitfalls that will affect your results

*Data leakage* is the main one. ERV copies within a family are often nearly identical, so a random train/test split overstates accuracy. Hold out an entire chromosome, or cluster sequences with MMseqs2 or CD-HIT before splitting. A stronger test is to hold out a whole subfamily (e.g. train without HERV-K) and see if the model still detects it.

*Label noise* is the second. Your ground truth comes from RepeatMasker, so a model that matches it perfectly has only learned to imitate RepeatMasker. Present the work as faster or more sensitive detection, and use the protein-domain check to argue that some "false positives" are real ERVs that RepeatMasker missed.

*Class imbalance* is the third: ERVs are a minority of the genome. Report precision/recall or PR-AUC rather than accuracy.

## Pitch angles

For medical relevance, HERV-K has been linked to ALS and some cancers, and HERV-W to multiple sclerosis. For evolution, ERVs are a "fossil record" of past viral infections (paleovirology). For a technical claim, showing a pretrained DNA model beating k-mers on held-out subfamilies is a clean, defensible result.

What's the hackathon's theme or track, and how long do you have? That would decide which of the three scopes makes the most sense.