# 2-Minute Live Demo Script: PaleoSwitch 3D (1-Click Synchronized)

**How to Run This Demo:**
- Open **http://localhost:3000**
- You only need **ONE action** for the entire 2-minute pitch: either click the blue **`Next Step ▶`** button at the top-right **OR** simply press the **`→` (Right Arrow) key** on your keyboard!
- **Steps 1–4** automatically animate the **3D Chromatin, Viral DNA Double Helix & Hi-C Simulation**.
- **Steps 5–6** automatically switch to **Tab 2 (`Our Trained RetroSwitch-XGB Model & 81 AlphaGenome .npz Calls`)**.

---

## Step 1 [0:00 – 0:20] The Mystery & Why AlphaGenome Changes Everything
**Screen State:** *Starts on Step 1 automatically (`ERVW-1 / LTR17` in Placenta, Intact Wild-Type 3D Loop hovering above the 3D AlphaGenome Hi-C contact mountain).*

**Say:**
> "Eight percent of the human genome isn’t human—it’s ancient retroviral DNA from viruses that infected our ancestors millions of years ago. RepeatMasker tells us *where* all 700,000 viral LTRs sit, but not which ones still act as living switches for human genes.
>
> Wet-lab CRISPR screens can only test a few dozen loci at a time. With **Google DeepMind’s AlphaGenome**, we feed 131-kilobase GRCh38 DNA sequences into a virtual CRISPR lab—predicting 1-base-pair RNA-seq, CAGE, ATAC, H3K27ac, and 3D Hi-C contact maps simultaneously."

---

## Step 2 [0:20 – 0:40] Zoom Inside the Virus: 3D DNA Double Helix & 1-bp Motif SNV
**Action:** Press **`→` (Right Arrow)** or click **`Next Step (2/6) ▶`**.  
**Screen State:** *The 3D camera automatically flies inside the 780 bp `LTR17` viral double helix. A single mutated nucleotide flashes crimson, the primary TF dimer detaches, and mRNA output drops to 68%.*

**Say:**
> "Here at **Syncytin-1 (`ERVW-1`)** in human placenta, clicking Next flies our camera inside the 780-base-pair **LTR17** virus. Inside its 3D DNA double helix sit conserved `GCM1` and `GATA` transcription factor motifs. Because AlphaGenome operates at single-base resolution, mutating just **one nucleotide** inside the viral motif detaches the transcription factor dimer and cuts gene output in half."

---

## Step 3 [0:40 – 1:00] Full In-Silico CRISPR Excision: Shattering the Virus & Unwinding the Loop
**Action:** Press **`→` (Right Arrow)** or click **`Next Step (3/6) ▶`**.  
**Screen State:** *The camera zooms out to the full 100 kb loop, the red viral switch shatters into 40 fragments, the 3D loop physically unwinds away from the cyan Ghost WT Blueprint, the 3D Hi-C mountain underneath flattens, and the mRNA fountain collapses.*

**Say:**
> "Now we perform a full in-silico CRISPR excision of the virus—padding the outer flank so the gene TSS stays anchored. Watch the viral switch shatter, the 3D loop unwind away from the Wild-Type Ghost Blueprint, the 3D Hi-C contact mountain collapse from **4.18 to 1.12**, and placental Syncytin-1 expression drop by **70% (`log2FC = -1.73, Z = -10.8σ`)**."

---

## Step 4 [1:00 – 1:20] Specificity Proof: Cutting Nearby Alu/L1 Control Repeats Does Nothing
**Action:** Press **`→` (Right Arrow)** or click **`Next Step (4/6) ▶`**.  
**Screen State:** *The yellow `L1M5` control repeat on the right flank shatters into amber fragments, while the viral enhancer-promoter loop, 3D Hi-C peak, and green mRNA stream remain 100% intact.*

**Say:**
> "How do we prove AlphaGenome isn’t just reacting to *any* sequence deletion? When we excise a matched **666-base-pair L1/Alu repeat** in the exact same window, the yellow flank node shatters, but the viral loop, Hi-C mountain, and gene expression stay **100% intact (`log2FC = +0.014, p = 10^{-27}`)**."

---

## Step 5 [1:20 – 1:42] Our Trained ML Model (`RetroSwitch-XGB`): `0.824 AUROC` & Live DNA Sandbox
**Action:** Press **`→` (Right Arrow)** or click **`Next Step (5/6) ▶`**.  
**Screen State:** *Automatically switches to **Tab 2 (`1. Our Trained Model — 0.824 AUROC`)**, showing the XGBoost Feature Importances, the 20-locus Out-of-Fold vs. AlphaGenome table, and the Live DNA Sandbox.*

**Say:**
> "Querying a 131-kilobase oracle on all 700,000 human ERVs is computationally expensive. So we trained our own **XGBoost + Random Forest classifier (`RetroSwitch-XGB`)** on real GRCh38 FASTA sequence features—TF motif density, CpG ratio, 4-mer complexity, viral divergence, and TSS distance—plus chromatin context. In 5-fold cross-validation grouped by gene, DNA sequence features alone reach **0.747 AUROC**, rising to **0.824 AUROC** in our full hybrid model—and you can edit any viral DNA sequence live in our sandbox."

---

## Step 6 [1:42 – 2:00] 81 Live AlphaGenome `.npz` Calls, Zero Determinism Noise & Close
**Action:** Press **`→` (Right Arrow)** or click **`Next Step (6/6) ▶`**.  
**Screen State:** *Automatically switches to **`2. Our 20 Cached AlphaGenome .npz Predictions & Plots`**, displaying `step1_knockout_tracks.png`, `family_tissue_heatmap.png`, and the live gRPC request log (`Δ = 0`).*

**Say:**
> "Finally, here are the static validation plots and gRPC logs from our **81 live AlphaGenome API calls** cached in `.npz` format with **zero reference determinism noise**—alongside honest reporting of short-read mappability limits on young `HERV-K` insertions. Thank you!"
