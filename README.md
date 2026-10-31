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
