# ERVs and AI: an overview of the field and its limits

This is a field where most tools predate modern AI while the data has exploded. Here is an overview aimed at spotting where AI could actually help.

## 1. The basics

**What an ERV is.** A retrovirus infected a germline cell and integrated into its genome. From then on it was passed to offspring like any other gene. Transposable elements make up about 45% of the human genome, and about 8% of it is HERVs. That is more than our protein-coding genes (about 1.5%).

**The structure, which doubles as a detection signature.** An intact HERV provirus looks like today's exogenous retroviruses: gag, pro, pol and env genes flanked by two long terminal repeats (LTRs). At integration the two LTRs are identical. Over time:

- Mutations accumulate. The divergence between the two LTRs works as a molecular clock for dating the insertion.
- Recombination between the two LTRs deletes the interior and leaves a "solo LTR". This is by far the most common form.
- Copies fragment, nest inside each other, and undergo deletions and inversions.

**Why people care.**

- Domestication: syncytins, derived from env, are essential to the placenta.
- Regulation: many LTRs act as promoters or enhancers, for example in immune-response networks.
- Disease: HERV-W in multiple sclerosis, HERV-K in ALS and cancers, and as immunotherapy targets.
- Paleovirology: ERVs are "fossils" of viruses extinct for millions of years.

**The star family: HERV-K (HML-2).** It is the youngest family and the only one still partly coding in humans. HML-2 integrated into our genome between one and five million years ago. Some of its insertions are polymorphic, meaning present in some humans and absent in others.

## 2. Main tasks and current tools

| Task | Classical tools | Underlying method |
|---|---|---|
| Find ERVs in an assembled genome | RepeatMasker + Dfam/Repbase, LTRharvest, LTR_retriever, RetroTector, DIGS, ERVdetective | Homology (BLAST, HMM) + LTR-…-LTR structure search |
| Classify into families/superfamilies | Manual nomenclature, TEclass2, BERTE | Alignment, and more recently deep learning |
| Detect polymorphic insertions in an individual | ERVcaller, RetroSeq, RetroSnake | Chimeric reads and discordant pairs in WGS |
| Measure expression locus by locus | Telescope, TEtranscripts, SQuIRE, SERVE | Probabilistic reassignment of multi-mapped reads |
| Find non-retroviral viral elements | detectEVE, DIGS | Homology + confidence scoring |

Almost everything relies on similarity to sequences we already know. Detection workflows are mainly built on homology-based methods such as BLAST+, DIAMOND or HMM searches. That is the main limit.

## 3. Where the limits are today

**a) The homology ceiling: we only find what resembles what we already know.** Old ERVs are so degraded that they fall below detection thresholds. As one review puts it, copies of the same TE can differ greatly from each other, which makes decayed copies particularly hard to identify. This is genomic dark matter: part of what is annotated as "unknown" is probably of viral origin.

**b) Annotation itself is fragile.** The main difficulties are repetitiveness, large numbers of very similar or degraded copies, and nested elements. Tools are also very heterogeneous in documentation, usability and methods. For non-model genomes, TE annotation is now the bottleneck of genome analysis.

**c) Expression quantification is biased.** A 100–150 bp short read from one HML-2 copy aligns equally well to dozens of other copies. Katzourakis's group at Oxford showed that family-level analysis gives reliable results, but per-integration analysis suffers from substantial bias that existing algorithms only partly correct. The bias is stronger for recent integrations and can lead to wrong biological conclusions. This matters because many "HERV and cancer" papers rely on this kind of data.

**d) The reference genome is incomplete.** Polymorphic insertions absent from the reference (hg38) are invisible to standard pipelines. Technical limitations have been a major obstacle to untargeted identification of polymorphic HERV-K insertions. Long-read sequencing changes this: at two loci, one study found that about 5% of individuals carry a previously unknown tandem-repeat-like sequence.

**e) Classification is inconsistent.** Family names are historical (HERV-K for the lysine tRNA, HERV-W for tryptophan, and so on), subfamilies overlap, and consensus libraries are messy. A TEclass2 reviewer noted that these libraries are redundant, fragmented, and contain chimeric elements and contamination from gene families.

**f) There is no ground truth, which is the key point for AI.** The "labels" used to train models come from RepeatMasker. A model trained on them learns to reproduce RepeatMasker, biases included. There is no shared reference benchmark for detecting degraded ERVs. That is both a limitation and an opportunity.

## 4. Where AI stands in this field

AI is present but still modest. As early as 2019, a systematic review concluded that using ML for TE detection and classification is an open problem. Recent work includes:

- **Classification:** TEclass2 uses Transformers to classify consensus sequences into 16 superfamilies. But it classifies sequences that are already identified and discovers nothing new.
- **Alignment-free detection:** a Kyoto team trained an SVM on k-mers and showed that k-mers of length three or more were enough to distinguish viral from human sequences. This led to new endogenous viral elements and is a proof of concept that alignment-free approaches work.
- **Metagenomic virome:** DeepVirFinder and geNomad show what deep learning can do on free-living viruses. Transferring this to integrated, degraded ERVs is still to be done.

What is almost entirely missing:

- Genomic language models (DNABERT, Nucleotide Transformer, Evo) applied specifically to ERVs.
- Protein-level remote homology detection (ESM embeddings, Foldseek-style structural search) to recover pol/env remnants too divergent for BLAST.
- Models for reassigning multi-mapped reads.

## 5. Realistic "game changer" ideas for a hackathon

1. **Find ghost ERVs.** Translate "unannotated" or "Unknown" genomic regions, run them through ESM, and compare against embeddings of real retroviral Pol/Env proteins. This yields a candidate list that BLAST misses. It is the most striking idea and is doable in 48 hours on one chromosome.
2. **Delineate ERVs by segmentation.** Frame detection as sequence segmentation (LTR / gag / pol / env / host) with a small model trained on well-annotated proviruses, then test it on degraded copies.
3. **Date and classify with a genomic language model.** Use DNA language model embeddings to cluster LTRs and spot poorly defined subfamilies.
4. **Build a benchmark.** Simulate the evolution of known proviruses (mutations, deletions, nested insertions at various ages) in a synthetic genome, then measure where RepeatMasker drops off. It is less glamorous but very useful, and it solves the ground-truth problem.

## Free data

Dfam (families and HMMs), the UCSC rmsk track, the gEVE database (mammalian ERVs), the T2T-CHM13 and Human Pangenome assemblies, and RetroTector for human proviruses.
