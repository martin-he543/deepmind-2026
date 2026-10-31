# 2-Minute Live Demo Script: PaleoSwitch 3D (AlphaGenome × XGBoost)

**Target Duration:** 2 minutes (~280–300 spoken words)  
**Setup Before Starting:**
- Open **http://localhost:3000** at the top of the page.
- Make sure **Step 1** (`ERVW-1 / LTR17` in `Placenta`, `1. Intact Virus (WT)`) is active in the **Living Epigenetic Fire & mRNA 3D** stage.

---

## [0:00 – 0:25] The Hook & Why AlphaGenome Changes the Game (25s)

**On Screen:** *The 3D chromatin loop is pulsing in Wild-Type. Glowing energy orbs travel from the red `LTR17` viral pacemaker across the cohesin bridge into `ERVW-1`, driving a fountain of green mRNA transcripts above the 3D Hi-C contact mountain.*

**What to Say:**
> "Eight percent of the human genome isn't human—it’s ancient retroviral DNA from viruses that infected our ancestors millions of years ago. RepeatMasker already tells us *where* all 700,000 viral LTRs sit, but it cannot tell us which ones are dead fossils and which ones still act as living switches for human genes.
>
> Wet-lab CRISPR screens can only test a few dozen elements at a time. With **Google DeepMind’s AlphaGenome**, we turn 131-kilobase GRCh38 DNA sequences into a **virtual CRISPR laboratory**—predicting 1-base-pair RNA-seq, CAGE, ATAC, H3K27ac, and 3D Hi-C contact maps simultaneously."

---

## [0:25 – 0:55] Live 3D Dissection: From 1-bp Motif Mutation to Full Viral Knockout (30s)

**Action 1 (at 0:25):** Click **`Step 2`** *(or click **`2. 1-bp TF Motif SNV`** in the bottom 3D bar)*.  
*The camera flies inside the rotating 3D viral DNA double helix. A single mutated nucleotide flashes crimson, and the primary transcription factor dimer detaches.*

**What to Say:**
> "Look at **Syncytin-1 (`ERVW-1`)** in human placenta. If we zoom inside the 780-base-pair **LTR17** virus, we see its 3D DNA double helix where host transcription factors dock. Because AlphaGenome operates at single-base resolution, mutating just **one nucleotide** inside the viral motif detaches the transcription factor and cuts gene output in half."

**Action 2 (at 0:40):** Click **`Step 3`** *(or click **`4. Full ΔLTR Viral Cut`**)*.  
*The red viral switch shatters into 40 fragments, the 3D loop physically unwinds away from the cyan Ghost WT Blueprint, the 3D Hi-C mountain underneath flattens, and the mRNA fountain collapses.*

**What to Say:**
> "And when we perform a full in-silico CRISPR excision of the virus—realigning coordinates at the TSS—the 3D enhancer-promoter loop unwinds, the 3D Hi-C contact mountain collapses from **4.18 to 1.12**, and placental Syncytin-1 expression drops by **70% (`log2FC = -1.73, Z = -10.8σ`)**."

---

## [0:55 – 1:20] Scientific Rigor: Mandatory Controls & Macrophage Immunity (25s)

**Action 3 (at 0:55):** Click **`Step 4`** *(or click **`5. Cut L1M5 Control`**)*.  
*The yellow control repeat on the right flank shatters, while the viral loop and green mRNA stream stay 100% intact.*

**What to Say:**
> "How do we know AlphaGenome isn’t just reacting to *any* deletion? When we delete a matched **L1/Alu repeat** or random DNA in the exact same window, the flank shatters but the loop and gene expression stay **100% intact (`log2FC = +0.014`)**—giving an empirical p-value of $10^{-27}$."

**Action 4 (at 1:10):** Click **`Step 5`** (`AIM2 / MER41` in `Monocyte / Macrophage` with violet `3. dCas9-KRAB Silencing`).

**What to Say:**
> "Switch to human macrophages at **AIM2**, and an ancient **MER41** virus wires our interferon immune response; caging it with virtual **dCas9-KRAB** silences the gene, reproducing Chuong et al.’s *Science* CRISPR results purely in silico."

---

## [1:20 – 1:50] What We Built: 81 Live AlphaGenome Calls + Our `RetroSwitch-XGB` Model (30s)

**Action 5 (at 1:20):** Scroll down one screen to **`Our Custom Trained Switch Predictor (RetroSwitch-XGB) & 81 Live AlphaGenome API Calls`**. Click a row in the table (e.g., `CYP19A1` or `BAAT`) and drag the **TSS Distance** slider in the **Live Model Sandbox**.

**What to Say:**
> "Under the hood, we ran **81 live 131 kb AlphaGenome API calls** across 20 GRCh38 loci—verifying **zero reference-to-reference determinism noise**—and cached the raw `.npz` tensors.
>
> Because querying a 100-kilobase oracle on all 700,000 human ERVs is computationally expensive, we trained our own **XGBoost classifier (`RetroSwitch-XGB`)** on GRCh38 FASTA sequence motifs, 4-mer complexity, viral divergence, and chromatin context. Evaluated with 5-fold cross-validation grouped by gene, DNA sequence features alone reach **0.747 AUROC**, rising to **0.824 AUROC** in our full hybrid model—and you can edit any viral DNA sequence live in our sandbox."

---

## [1:50 – 2:00] Epistemic Honesty & Close (10s)

**Action 6 (at 1:50):** Point briefly to **`Step 6 (PRODH / Young HERV-K)`** or the **Family × Tissue Matrix** + **Gemini Interpreter**.

**What to Say:**
> "We also surface AlphaGenome’s blind spots—showing how young human-specific **HERV-K (`LTR5_Hs`)** repeats suffer from short-read mappability limits—while **Gemini** synthesizes grounded CRISPR validation plans from our JSON metrics. Thank you!"
