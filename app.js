// Initialize Materialize select and modal
document.addEventListener("DOMContentLoaded", function () {
    var elems = document.querySelectorAll("select");
    M.FormSelect.init(elems);
    var modals = document.querySelectorAll(".modal");
    M.Modal.init(modals);
});

let chartInstance = null;

// Render bar or pie chart depending on type
function renderChart(type, byYear, byType) {
    const ctx = document.getElementById("grafica");
    if (chartInstance) {
        chartInstance.destroy();
    }

    if (type === "ano") {
        // Generate a different color for each year
        const years = Object.keys(byYear);
        const colors = years.map((_, i) => {
            // Pastel color palette
            const hue = ((i * 360) / years.length) % 360;
            return `hsl(${hue}, 70%, 65%)`;
        });

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: years,
                datasets: [
                    {
                        label: "Number of Publications per Year",
                        data: Object.values(byYear),
                        backgroundColor: colors,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    } else if (type === "tipo") {
        chartInstance = new Chart(ctx, {
            type: "pie",
            data: {
                labels: Object.keys(byType),
                datasets: [
                    {
                        data: Object.values(byType),
                        backgroundColor: [
                            "rgba(255, 99, 132, 0.6)",
                            "rgba(54, 162, 235, 0.6)",
                            "rgba(255, 206, 86, 0.6)",
                            "rgba(75, 192, 192, 0.6)",
                        ],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }
}

// Render stacked bar chart for year/category
function renderChartStacked(years, categories, dataByYearCategory) {
    const ctx = document.getElementById("grafica");
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Fixed pastel colors by category
    const colorMap = {
        Journal: "hsl(120, 70%, 80%)", // pastel green
        arXiv: "hsl(0, 70%, 80%)", // pastel red
        Conference: "hsl(220, 70%, 80%)", // pastel blue
    };

    const fixedOrder = [
        "Journal",
        "Conference",
        "arXiv"
    ];

    // Pastel color palette for categories
    const colors = categories.map((_, i) => {
        const hue = ((i * 360) / categories.length) % 360;
        return `hsl(${hue}, 70%, 65%)`;
    });
    // One dataset per category
    const datasets = fixedOrder.map((cat) => ({
        label: cat,
        backgroundColor: colorMap[cat] || "hsl(0, 0%, 80%)", // fallback light gray
        data: years.map((year) => dataByYearCategory[year]?.[cat] || 0),
    }));

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: years,
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { mode: "index", intersect: false },
                legend: { position: "top" },
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true },
            },
        },
    });
}

// Render chart for LLMs used
function renderLLMsUsedChart(llmsUsedCount) {
    const ctx = document.getElementById("grafica");
    if (chartInstance) {
        chartInstance.destroy();
    }
    const models = Object.keys(llmsUsedCount);
    const counts = Object.values(llmsUsedCount);
    const colors = models.map(
        (_, i) => `hsl(${((i * 360) / models.length) % 360}, 70%, 65%)`
    );
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: models,
            datasets: [
                {
                    label: "LLMs Used",
                    data: counts,
                    backgroundColor: colors,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: { title: { display: true, text: "LLM Model" } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Count" },
                },
            },
        },
    });
}

// Render chart for benchmarks used
function renderBenchmarksChart(benchmarksCount) {
    // Show all categories as they are, no grouping
    const ctx = document.getElementById("grafica");
    if (chartInstance) chartInstance.destroy();
    const labels = Object.keys(benchmarksCount);
    const data = Object.values(benchmarksCount);
    const colors = labels.map(
        (_, i) => `hsl(${((i * 360) / labels.length) % 360}, 70%, 65%)`
    );
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Benchmarks Used",
                    data: data,
                    backgroundColor: colors,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: { title: { display: true, text: "Benchmark" } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Count" },
                },
            },
        },
    });
}

// Render chart for metrics used
function renderMetricsChart(metricsCount) {
    // Show all categories as they are, no grouping
    const ctx = document.getElementById("grafica");
    if (chartInstance) chartInstance.destroy();
    const labels = Object.keys(metricsCount);
    const data = Object.values(metricsCount);
    const colors = labels.map(
        (_, i) => `hsl(${((i * 360) / labels.length) % 360}, 70%, 65%)`
    );
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Metrics Used",
                    data: data,
                    backgroundColor: colors,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: { title: { display: true, text: "Metric" } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Count" },
                },
            },
        },
    });
}

// Render chart for Classification vs LLM Approach Type
function renderClassificationLLMTypeChart(
    classificationLLMType,
    llmApproachTypes
) {
        // Custom color map
    const colorMap = {
        "LLM-Pure-Prompting": "hsl(200, 70%, 80%)",    // light blue
        "Hybrid-Prompting": "hsl(200, 70%, 40%)",      // dark blue
        "LLM-Pure-FineTune": "hsl(0, 70%, 80%)",      // light red
        "Hybrid-FineTune": "hsl(0, 70%, 40%)",        // dark red
        "None": "hsl(0, 0%, 80%)"             // grey
    };
    // Enforce fixed stacking order
    const fixedOrder = [
        "LLM-Pure-Prompting",
        "Hybrid-Prompting",
        "LLM-Pure-FineTune",
        "Hybrid-FineTune",
        "None"
    ];

    const ctx = document.getElementById("grafica");
    if (chartInstance) chartInstance.destroy();

    // Sort classifications by total number of papers (descending)
    const classifications = Object.keys(classificationLLMType)
        .map((cl) => ({
            name: cl,
            total: llmApproachTypes.reduce(
                (sum, type) => sum + (classificationLLMType[cl][type] || 0),
                0
            ),
        }))
        .sort((a, b) => b.total - a.total)
        .map((cl) => cl.name);

    const datasets = fixedOrder.map((type) => ({
        label: type,
        data: classifications.map((cl) => classificationLLMType[cl][type] || 0),
        backgroundColor: colorMap[type] || "hsl(0, 0%, 90%)", // fallback light gray
    }));

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: classifications,
            datasets: datasets,
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top" },
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: "Count" },
                },
                y: {
                    stacked: true,
                    title: { display: true, text: "Classification" },
                },
            },
        },
    });
}

// Render chart for conferences
function renderConferencesChart(conferencesCount) {
    const ctx = document.getElementById("grafica");
    if (chartInstance) chartInstance.destroy();
    const labels = Object.keys(conferencesCount);
    const data = Object.values(conferencesCount);
    const colors = labels.map(
        (_, i) => `hsl(${((i * 360) / labels.length) % 360}, 70%, 65%)`
    );
    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: colors,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top" },
            },
        },
    });
}

// Render chart for journals
function renderJournalsChart(journalsCount) {
    const ctx = document.getElementById("grafica");
    if (chartInstance) chartInstance.destroy();
    const labels = Object.keys(journalsCount);
    const data = Object.values(journalsCount);
    const colors = labels.map(
        (_, i) => `hsl(${((i * 360) / labels.length) % 360}, 70%, 65%)`
    );
    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: colors,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top" },
            },
        },
    });
}

// Download functionality for CSV, JSON, and XLSX
let globalRawCSV = null;
let globalDataArray = null;
let globalHeaders = null;

// Load CSV as text for direct download
fetch("data/Papers.csv")
    .then((response) => response.text())
    .then((text) => {
        globalRawCSV = text;
        document
            .getElementById("download-csv")
            .setAttribute(
                "href",
                "data:text/csv;charset=utf-8," + encodeURIComponent(text)
            );
    });

// Prepare JSON and XLSX after PapaParse loads data
Papa.parse("data/Papers.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
        let data = results.data;
        let headers = results.meta.fields;
        data = data.filter((row) => row["ID"] && row["ID"].trim() !== "");

        // Save for download
        globalDataArray = data;
        globalHeaders = headers;

        // JSON download
        const jsonStr = JSON.stringify(data, null, 2);
        const jsonBlob = new Blob([jsonStr], { type: "application/json" });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        document.getElementById("download-json").setAttribute("href", jsonUrl);

        // XLSX download (using SheetJS CDN)
        document
            .getElementById("download-xlsx")
            .addEventListener("click", function (e) {
                e.preventDefault();
                if (typeof XLSX === "undefined") {
                    const script = document.createElement("script");
                    script.src =
                        "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
                    script.onload = () =>
                        exportToXLSX(globalDataArray, globalHeaders);
                    document.body.appendChild(script);
                } else {
                    exportToXLSX(globalDataArray, globalHeaders);
                }
            });

        // --- DataTable ---
        let dataTable = $("#tabla").DataTable({
            data: data.map((row) => headers.map((h) => row[h] || "")),
            columns: headers.map((h) => ({ title: h })),
            pageLength: 5,
            scrollX: true,
            columnDefs: [
                {
                    targets: headers.indexOf("KEY"),
                    visible: false,
                    searchable: false,
                },
                {
                    targets: headers.indexOf("TITLE"),
                    width: "30%",
                    render: function (data, type, row) {
                        let bibtex = row[headers.indexOf("BIBTEX")] || "";
                        let urlMatch = bibtex.match(
                            /url\s*=\s*[{"]([^}"]+)[}"]/i
                        );
                        let url = urlMatch ? urlMatch[1] : null;
                        if (url) {
                            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${data}</a>`;
                        }
                        return data; // fallback if no URL in bibtex
                    },
                },
                {
                    targets: headers.indexOf("BIBTEX"),
                    render: function (data, type, row) {
                        if (!data) return "";
                        let fileName =
                            (row[headers.indexOf("KEY")]
                                ? row[headers.indexOf("KEY")]
                                : "citation") + ".bib";
                        let blob = new Blob([data], { type: "text/plain" });
                        let url = URL.createObjectURL(blob);
                        return `<a class="btn-small teal lighten-2 white-text" href="${url}" download="${fileName}">Download</a>`;
                    },
                },
                {
                    targets: headers.indexOf("ABSTRACT"),
                    render: function (data, type, row) {
                        if (!data) return "";
                        // Use data-* attributes to safely pass the title and abstract
                        return `<a class="btn-small waves-effect waves-light modal-trigger" 
                          href="#modal-abstract" 
                          data-title="${encodeURIComponent(
                              row[headers.indexOf("TITLE")] || ""
                          )}"
                          data-abstract="${encodeURIComponent(data)}"
                          onclick="showAbstractFromAttr(this)">
                          <i class="material-icons">info</i>
                        </a>`;
                    },
                },
            ],
        });

        // Initialize Materialize select
        M.FormSelect.init(document.querySelectorAll("#pageLengthSelect"));

        // Change the number of papers displayed when selected
        document
            .getElementById("pageLengthSelect")
            .addEventListener("change", function () {
                dataTable.page.len(Number(this.value)).draw();
            });

        // --- Process data for charts ---
        let byYear = {};
        let byType = {};
        let llmsUsedCount = {};
        let benchmarksCount = {};
        let metricsCount = {};
        let classificationLLMType = {};
        let llmApproachTypesSet = new Set();
        let conferencesCount = {};
        let journalsCount = {};

        data.forEach((r) => {
            let year = r["YEAR"];
            let type = r["PUBLICATION TYPE"];
            let llms = r["LLMs USED"];
            let benchmark = r["BENCHMARK"];
            let metric = r["EVALUATION METRIC"];
            let classification = r["CLASSIFICATION"];
            let llmType = r["LLM APPROACH TYPE"];
            let publishedIntoAll = r["PUBLISHED INTO"];
            if (year) byYear[year] = (byYear[year] || 0) + 1;
            if (type) byType[type] = (byType[type] || 0) + 1;
            if (llms && llms.trim() !== "") {
                // Split by comma and trim spaces
                llms.split(",").forEach((model) => {
                    let cleanModel = model.trim();
                    if (
                        cleanModel &&
                        cleanModel.toLowerCase() !== "n/s" &&
                        cleanModel.toLowerCase() !== "none"
                    ) {
                        llmsUsedCount[cleanModel] =
                            (llmsUsedCount[cleanModel] || 0) + 1;
                    }
                });
            }
            if (
                benchmark &&
                benchmark.trim() !== "" &&
                benchmark.toLowerCase() !== "none" &&
                benchmark.toLowerCase() !== "no bmk-ds"
            ) {
                benchmark.split(",").forEach((b) => {
                    let cleanB = b.trim();
                    if (cleanB) {
                        benchmarksCount[cleanB] =
                            (benchmarksCount[cleanB] || 0) + 1;
                    }
                });
            }
            if (
                metric &&
                metric.trim() !== "" &&
                metric.toLowerCase() !== "none" &&
                metric.toLowerCase() !== "no eval."
            ) {
                metric.split(",").forEach((m) => {
                    let cleanM = m.trim();
                    if (cleanM) {
                        metricsCount[cleanM] = (metricsCount[cleanM] || 0) + 1;
                    }
                });
            }
            // --- Count for Classification vs LLM Approach Type chart ---

            if (classification && llmType) {
                // Split both by comma and trim spaces
                let classArr = classification
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c);
                let llmArr = llmType
                    .split(",")
                    .map((l) => l.trim())
                    .filter((l) => l);
                classArr.forEach((cl) => {
                    if (!classificationLLMType[cl])
                        classificationLLMType[cl] = {};
                    llmArr.forEach((type) => {
                        classificationLLMType[cl][type] =
                            (classificationLLMType[cl][type] || 0) + 1;
                        llmApproachTypesSet.add(type);
                    });
                });
            }
            let publishedInto = r["PUBLISHED INTO"];
            if (publishedInto && publishedInto.trim() !== "") {
                // Conferences
                if (publishedInto.trim().startsWith("C:")) {
                    let confName = publishedInto.trim().replace(/^C:\s*/, "");
                    conferencesCount[confName] =
                        (conferencesCount[confName] || 0) + 1;
                }
                // Journals
                if (publishedInto.trim().startsWith("J:")) {
                    let journalName = publishedInto
                        .trim()
                        .replace(/^J:\s*/, "");
                    journalsCount[journalName] =
                        (journalsCount[journalName] || 0) + 1;
                }
            }
        });

        // Initial render
        renderChart("ano", byYear, byType);

        // --- Process data for stacked chart ---
        let yearsSet = new Set();
        let categoriesSet = new Set();
        let dataByYearCategory = {};

        data.forEach((r) => {
            let year = r["YEAR"];
            let cat = r["PUBLICATION TYPE"];
            if (!year || !cat) return;
            yearsSet.add(year);
            categoriesSet.add(cat);
            if (!dataByYearCategory[year]) dataByYearCategory[year] = {};
            dataByYearCategory[year][cat] =
                (dataByYearCategory[year][cat] || 0) + 1;
        });

        let years = Array.from(yearsSet).sort();
        let categories = Array.from(categoriesSet);

        // Dynamic chart change
        document
            .getElementById("graficoSelect")
            .addEventListener("change", function () {
                if (this.value === "ano") {
                    renderChartStacked(years, categories, dataByYearCategory);
                } else if (this.value === "llmsused") {
                    renderLLMsUsedChart(llmsUsedCount);
                } else if (this.value === "benchmarks") {
                    renderBenchmarksChart(benchmarksCount);
                } else if (this.value === "metrics") {
                    renderMetricsChart(metricsCount);
                } else if (this.value === "category") {
                    renderClassificationLLMTypeChart(
                        classificationLLMType,
                        Array.from(llmApproachTypesSet)
                    );
                } else if (this.value === "conferences") {
                    renderConferencesChart(conferencesCount);
                } else if (this.value === "journals") {
                    renderJournalsChart(journalsCount);
                }
            });

        // Initial render: stacked year/category chart
        renderChartStacked(years, categories, dataByYearCategory);
    },
});

// Global function to display the modal with the abstract
function showAbstract(title, abstract) {
    document.getElementById("modal-abstract-title").textContent = title;
    document.getElementById("modal-abstract-content").textContent = abstract;
    var modal = M.Modal.getInstance(document.getElementById("modal-abstract"));
    modal.open();
}

// New function to display the abstract using data-* attributes
function showAbstractFromAttr(el) {
    const title = decodeURIComponent(el.getAttribute("data-title") || "");
    const abstract = decodeURIComponent(el.getAttribute("data-abstract") || "");
    showAbstract(title, abstract);
}

// Citation info (keep in sync with your CITATION.cff)
let citationData = null;

// Load and parse CITATION.cff
fetch("CITATION.cff")
    .then((response) => response.text())
    .then((cffText) => {
        const cff = jsyaml.load(cffText);
        const pc = cff["preferred-citation"];

        citationData = {
            authors: pc.authors.map((a) => ({
                given: a["given-names"],
                family: a["family-names"],
                orcid: a.orcid || null,
            })),
            title: pc.title,
            journal: pc.journal?.name || "",
            year: pc.year,
            volume: pc.journal?.volume || "",
            issue: pc.journal?.issue || "",
            pages: pc.journal?.pages
                ? `${pc.journal.pages.start}-${pc.journal.pages.end}`
                : "",
            publisher: pc.journal?.publisher || "",
            doi: pc.doi || "",
            url: cff.url || "",
        };
    })
    .catch((err) => console.error("Error loading CITATION.cff:", err));

function formatBibTeX(data) {
    // BibTeX author format: "Last, First and Last, First and ..."
    const authors = data.authors
        .map((a) => `${a.family}, ${a.given}`)
        .join(" and ");
    return `@article{Bertolino2025,
    author    = {${authors}},
    title     = {${data.title}},
    journal   = {${data.journal}},
    year      = {${data.year}},
    volume    = {${data.volume}},
    number    = {${data.issue}},
    pages     = {${data.pages}},
    publisher = {${data.publisher}},
    doi       = {${data.doi}}
    }`;
}

document.addEventListener("DOMContentLoaded", function () {
    // Modal for citation
    var citationModal = document.getElementById("modal-citation");
    if (citationModal) M.Modal.init(citationModal);

    // Always set BibTeX link on click (fixes issues with multiple elements or reloads)
    document
        .getElementById("download-bibtex")
        .addEventListener("click", function (e) {
            const bibtexStr = formatBibTeX(citationData);
            const bibtexBlob = new Blob([bibtexStr], { type: "text/x-bibtex" });
            const bibtexUrl = URL.createObjectURL(bibtexBlob);
            this.setAttribute("href", bibtexUrl);
            // Let the default action (download) happen
        });

    document
        .getElementById("show-citation")
        .addEventListener("click", function () {
            const citation = formatCitationAPA(citationData);
            document.getElementById("citation-content").innerHTML = citation;
            var modal = M.Modal.getInstance(
                document.getElementById("modal-citation")
            );
            modal.open();
        });

    document
        .getElementById("copy-citation")
        .addEventListener("click", function (e) {
            e.preventDefault();
            const text = document.getElementById("citation-content").innerText;
            navigator.clipboard.writeText(text);
        });
});

function formatCitationAPA(data) {
    // Format authors: Last, F., Last, F., & Last, F.
    const authors = data.authors
        .map((a) => `${a.family}, ${a.given[0]}.`)
        .join(", ")
        .replace(/, ([^,]*)$/, ", & $1");
    return `${authors} (${data.year}). ${data.title}. <i>${data.journal}</i>, ${data.volume}(${data.issue}), ${data.pages}. ${data.publisher}. https://doi.org/${data.doi}`;
}

// Export to XLSX using SheetJS
function exportToXLSX(dataArray, headers) {
    if (!window.XLSX) {
        alert("XLSX library not loaded.");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(dataArray, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Papers");
    XLSX.writeFile(wb, "Papers.xlsx");
}
