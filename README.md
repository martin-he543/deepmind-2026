# deepmind-2026

## Data

The genome data (~2 GB) is not tracked in git. Download it from NCBI into `data/`:

```bash
B=https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF
mkdir -p data/human_GRCh38 data/pig_Sscrofa11.1

# Human (GRCh38.p14)
H=$B/000/001/405/GCF_000001405.40_GRCh38.p14/GCF_000001405.40_GRCh38.p14
for s in genomic.fna.gz rm.out.gz assembly_report.txt; do
  curl -fL -o data/human_GRCh38/GCF_000001405.40_GRCh38.p14_$s ${H}_$s
done

# Pig (Sscrofa11.1)
P=$B/000/003/025/GCF_000003025.6_Sscrofa11.1/GCF_000003025.6_Sscrofa11.1
for s in genomic.fna.gz rm.out.gz assembly_report.txt; do
  curl -fL -o data/pig_Sscrofa11.1/GCF_000003025.6_Sscrofa11.1_$s ${P}_$s
done
```

Gene annotation (GENCODE v46, `chr*` names, used for TSSs/exons):

```bash
mkdir -p data/gencode
curl -fL -o data/gencode/gencode.v46.basic.annotation.gtf.gz \
  https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_46/gencode.v46.basic.annotation.gtf.gz
```

Unpack the human FASTA so `pyfaidx` can index it (~3.3 GB):
`gzip -dk data/human_GRCh38/GCF_000001405.40_GRCh38.p14_genomic.fna.gz`

### Direct links

Human GRCh38.p14 (`data/human_GRCh38/`):
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/405/GCF_000001405.40_GRCh38.p14/GCF_000001405.40_GRCh38.p14_genomic.fna.gz (928 MB, genome FASTA)
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/405/GCF_000001405.40_GRCh38.p14/GCF_000001405.40_GRCh38.p14_rm.out.gz (180 MB, RepeatMasker annotations)
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/001/405/GCF_000001405.40_GRCh38.p14/GCF_000001405.40_GRCh38.p14_assembly_report.txt (78 KB)

Pig Sscrofa11.1 (`data/pig_Sscrofa11.1/`):
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/003/025/GCF_000003025.6_Sscrofa11.1/GCF_000003025.6_Sscrofa11.1_genomic.fna.gz (745 MB, genome FASTA)
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/003/025/GCF_000003025.6_Sscrofa11.1/GCF_000003025.6_Sscrofa11.1_rm.out.gz (153 MB, RepeatMasker annotations)
- https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/003/025/GCF_000003025.6_Sscrofa11.1/GCF_000003025.6_Sscrofa11.1_assembly_report.txt (69 KB)

## API keys

Put keys in `.env` (git-ignored): `GEMINI_API_KEY`, `ALPHAGENOME_API_KEY`.

If AlphaGenome calls hang or curl reports `unable to get local issuer certificate`, antivirus software (e.g. AVG) is probably intercepting HTTPS. Run `python scripts/export_windows_roots.py .certs/roots.pem` and add `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=<absolute path to .certs/roots.pem>` to `.env`.

## Pipeline & Interactive Viewer (`RETROSWITCH`)

1. **Stage 1 — Select ERV LTR Loci & Matched Controls (`results/ltrs.parquet`)**:
   ```bash
   python scripts/build_ltrs.py
   ```
2. **Stage 2 — Run Live AlphaGenome Virtual Knockouts & Cache Outputs (`results/raw/*.npz`, `results/viewer_data.json`)**:
   ```bash
   python scripts/run_knockouts.py
   python scripts/sync_html_data.py
   ```
3. **Stage 3 — Launch Interactive 3D & Multi-Track Browser (`http://localhost:8050`)**:
   ```bash
   python serve.py
   ```
4. **Verify End-to-End Tests**:
   ```bash
   python tests/test_pipeline.py
   ```

