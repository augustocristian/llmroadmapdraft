[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20039989.svg)](https://doi.org/10.5281/zenodo.20039989)

# Replication package for *'A Research Roadmap on the Usage of Large Language Models in Software Testing'*

This repository contains the replication package of the paper *A Research Roadmap on the Usage of Large Language Models
in Software Testing* published at *TO-DO*. The roadmap is considered "live" because we pursue the community to add new
works and align them with the trends and dimensions proposed (See [CONTRIBUTING](#contributing))

This replication package includes the raw data from the articles analyzed in the roadmap and an
[interactive view of them hosted on GitHub Pages](https://augustocristian.github.io/llm-testing-roadmap-rp/).
The replication package structure is depicted as follows:

```markdown
📁 /
├── 📜 .gitignore
├── 📜 CITATION.cff
├── 🤝 LICENSE
├── 🏗️ pyproject.toml
├── 🌐 index.html
├── 📖 README.md
│
├── 📦 retrieval/
│   ├── 🐍 core.py
│   └── 🐍 __init__.py
│
├── 📁 dashboard/

└── 📁 data/
    ├── 𝄜 articlecorpus.csv
    └── 𝄜 validation.csv
```

- `📦 retrieval` contains the Python scripts used retrieve the validation article corpus. It includes `🐍 core.py` with
  the retrieval pipeline, which create into the `📁 data` the files with the result of each stage articles.

- `📁 dashboard` contains the html, jss and css code responsible of the rendering and the different functionalities of the dashboard

- `📁 data` contains:

    - The roadmap dataset (`𝄜 articlecorpus.csv`) is a semicolon-separated CSV file, with a structure (columns) as follows:
        - **ID:** Internal reference used in the study, `PXX` for the original corpus and `VXX` for validation.
        - **Title:** Title of the article.
        - **Year:** Publication year or when it was made available on arXiv.
        - **Key:** BibTeX key.
        - **Published into:** Name of the journal or conference where it is published (prefixed with `C:` for conferences or `J:` for journals).
        - **Publication type:** Type of publication: Conference, Journal, or arXiv.
        - **Bibtex:** BibTeX entry of the publication.
        - **Database:** Source database: ACM, IEEE, Elsevier, Springer, or Orig.
        - **Type of Contribution:** Type of contribution: Survey, Evaluation, or Research Contribution.
        - **Abstract:** Short abstract retrieved from the article.
        - **Trend:** Type of LLM-based testing: Unit Test Generation, High-Level Test Gen, Oracle Derivation, Test Augmentation or Improvement, Test Configuration or Execution, and Reflections.
        - **LLM Interaction:** Type of LLM interaction: Pure Prompting or Hybrid Prompting.
        - **Domain Specific Knowledge:** How the LLM is improved with context: None, RAG, or Fine-Tuning.
        - **Approach:** Type of approach: Tool/Framework or Agent.
        - **Scope:** Testing scope: Functional or Non-Functional.
        - **Focus:** refers if the approach is intended to generate Code/Procedure, Data or Optimization .
        - **Benchmark:** Name or identifier of the benchmark used.
        - **LLMs Used:** Name of the model/models used in the article.
        - **Evaluation Metric:** Name of the metrics used in evaluating the article.
        - **Tool:** Name of the tool proposed by the article.

    - The validation dataset (`𝄜 validation.csv`) is a semicolon-separated CSV file, with a structure (columns) as follows:
        - **ID:** Internal reference used in the study.
        - **Title:** Title of the article.
        - **Authors:** Authors of the article.
        - **Year:** Publication year.
        - **DOI:** article DOI retrieved programmatically.
        - **Abstract:** Short abstract retrieved from the article.
        - **I/E:** result of the inclusion/exclusion criteria.

The data of the replication package is also archived on [Zenodo](https://doi.org/10.5281/zenodo.17144160)

## Treatment Replication Procedure

To run the experimentation script provided in `📦 retrieval/`, Python version 3.12 or later is required. Follow these steps to execute the script:

1. Navigate to the root of the repository and create a virtual environment:

   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:

   * On Windows: `venv\Scripts\activate`
   * On Linux/macOS: `source venv/bin/activate`

3. Install and configure the project:

   ```bash
   pip install -e .
   ```
4. Run the experimentation script with:

   ```bash
   retrieval
   ```

## Contributing

See the general contribution policies and guidelines for *giis-uniovi* at
[CONTRIBUTING.md](https://github.com/giis-uniovi/.github/blob/main/profile/CONTRIBUTING.md).

### Proposing a new article for the corpus

Found a paper on LLM-based software testing that isn't in the roadmap yet? You can propose it by
opening a pull request that adds one row to `data/articlecorpus.csv` (`;`-separated). Please:

1. Fork the repository and create a branch for your addition.
2. Append a **single new row** to `data/articlecorpus.csv` for your article or propose some modification in the existing
   ones. Make the minimal modifications as possible to ease the reviewer work.
3. Assign it an **`ID` of the form `Nxxx`** (`N` for *New*, followed by a zero-padded 3-digit
   number continuing the existing sequence, e.g. `N001`, `N002`, ...). This prefix marks the row
   as a community-contributed candidate, separate from the paper's own `P` (initial) and
   `V` (validation) sets, so it doesn't affect the dashboard's existing Corpus filter or
   any of the reported study statistics until a maintainer reviews and re-classifies it.
4. Fill in the following fields for your row (see the `articlecorpus.csv` column reference near
   the top of this file for the full description of every column):

   | Field                  | Required      | Notes                                                                                                                                                                                      |
   |------------------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | `ID`                   | Yes           | `Nxxx`, e.g. `N001`                                                                                                                                                                        |
   | `TITLE`                | Yes           | Full article title                                                                                                                                                                         |
   | `YEAR`                 | Yes           | Publication year (or year made available on arXiv)                                                                                                                                         |
   | `KEY`                  | Yes           | BibTeX citation key                                                                                                                                                                        |
   | `PUBLISHED INTO`       | Yes           | Venue name prefixed with `C:` (conference) or `J:` (journal); leave as the venue name only for arXiv                                                                                       |
   | `PUBLICATION TYPE`     | Yes           | `Conference`, `Journal`, or `arXiv`                                                                                                                                                        |
   | `BIBTEX`               | Yes           | Full BibTeX entry (used for the citation/BibTeX export features and to back-fill authors/venue in the table)                                                                               |
   | `DATABASE`             | Yes           | Source database: `ACM`, `IEEE`, `Elsevier`, `Springer`, or `Orig`                                                                                                                          |
   | `TYPE OF CONTRIBUTION` | Yes           | `Survey`, `New Method/Tool`, or `Evaluation`                                                                                                                                               |
   | `ABSTRACT`             | Yes           | Short abstract                                                                                                                                                                             |
   | `TREND`                | Yes           | One or more (comma-separated) of: `Unit Test Generation`, `High-Level Test Gen`, `Oracle Derivation`, `Test Augmentation or Improvement`, `Test Configuration or Execution`, `Reflections` |
   | `LLM ITERACTION`       | Yes           | `Pure Prompting` or `Hybrid Prompting`                                                                                                                                                     |
   | `CONTEXTUAL INFO`      | Yes           | `None`, `RAG`, or `Fine-Tuning`                                                                                                                                                            |
   | `APPROACH`             | Yes           | `Tool/Framework` or `Agent`                                                                                                                                                                |
   | `SCOPE`                | Yes           | `Functional` or `Non-Functional`                                                                                                                                                           |
   | `FOCUS`                | Yes           | `Code/Procedure`, `Data`, or `Optimization`                                                                                                                                                |
   | `BENCHMARK`            | If applicable | Comma-separated benchmark name(s) used                                                                                                                                                     |
   | `LLMs USED`            | If applicable | Comma-separated LLM name(s)/family used                                                                                                                                                    |
   | `EVALUATION METRIC`    | If applicable | Comma-separated evaluation metric(s) used                                                                                                                                                  |
   | `TOOL`                 | If applicable | Name of the tool proposed by the article, if any                                                                                                                                           |

5. Open the pull request describing the article and why it fits the roadmap's scope. A maintainer
   will validate it  and, once accepted, it will appear in the live roadmap.

## Contact

Contact any of the researchers who authored the paper; their affiliation and contact information are provided in the
paper itself.

## Citing this work

- Cristian Augusto, Antonia Bertolino, Guglielmo De Angelis, Francesca Lonetti and Jesús Morán, “A Research Roadmap on the Usage of Large Language Models in Software Testing” in TO-DO - [TO-DO](https://doi.org/XXXXX) - [Full Paper available](TO-DO) - [Authors version](TO-DO) -
  [Download citation](TO-DO)

## Acknowledgments

This work was supported in part by the project EQUAVEL (PID2022-137646OB-C32) funded by MCIN/AEI/10.13039/501100011033/FEDER,
UE and in part by the European [HORIZON-KDT-JU research project MATISSE](https://matisse-kdt.eu/): *"Model-based
engineering of Digital Twins for early verification and validation of Industrial Systems"*, HORIZON-KDT-JU-2023-2-
RIA, Proposal number: 101140216-2, KDT232RIA_00017, and also by the (partial) support of the PNRR MUR project [FAIR (PE0000013)](https://www.mur.gov.it/sites/default/files/2023-02/D.D.%20341%20_PE0000013_rev181022NF.pdf).
