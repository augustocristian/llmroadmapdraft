// ╔══════════════════════════════════════════════════════════════════════╗
// ║  CONTRIBUTE FORM — lets a visitor propose a new article without      ║
// ║  learning the CSV schema. Builds a pre-filled GitHub issue (title +  ║
// ║  a ready-to-paste `;`-delimited row) since this is a static site     ║
// ║  with no backend/token to open a PR directly.                       ║
// ╚══════════════════════════════════════════════════════════════════════╝

const DATABASE_VALS = ["ACM", "Elsevier", "IEEE", "Orig", "Springer"];

const CONTRIBUTE_REPO_URL = "https://github.com/augustocristian/llm-testing-roadmap-rp";

// Exact column order of data/articlecorpus.csv.
const CSV_COLUMNS = [
    "ID", "TITLE", "YEAR", "KEY", "PUBLISHED INTO", "PUBLICATION TYPE", "BIBTEX",
    "DATABASE", "TYPE OF CONTRIBUTION", "ABSTRACT", "TREND", "LLM ITERACTION",
    "CONTEXTUAL INFO", "APPROACH", "SCOPE", "FOCUS", "BENCHMARK", "LLMs USED",
    "EVALUATION METRIC", "TOOL",
];

let _contributeOptionsPopulated = false;

// ── Option population ──────────────────────────────────────────────────
function _fillSelect(id, values) {
    const sel = document.getElementById(id);
    values.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
    });
}

// Multi-select rendered as toggleable chips. When `colorMap` is given (a
// { value: {bg, fg} } map — table.js derives these from the same _PALETTE
// charts use, e.g. TREND_COLORS) a selected chip is tinted with the exact
// color that value already has everywhere else in the dashboard.
function _buildChipMultiSelect(containerId, values, colorMap) {
    const container = document.getElementById(containerId);
    container._selected = [];

    const makeChip = (v) => {
        const isSel = container._selected.includes(v);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "contribute-chip" + (isSel ? " contribute-chip-selected" : "");
        const pair = colorMap?.[v];
        if (isSel && pair) {
            chip.style.background = pair.bg;
            chip.style.color = pair.fg;
            chip.style.borderColor = pair.fg;
        }
        chip.textContent = isSel ? `${v} ×` : v;
        chip.addEventListener("click", () => toggle(v));
        return chip;
    };

    const render = () => {
        container.innerHTML = "";
        values.forEach((v) => container.appendChild(makeChip(v)));
    };

    const toggle = (v) => {
        const idx = container._selected.indexOf(v);
        if (idx === -1) container._selected.push(v); else container._selected.splice(idx, 1);
        (container.closest(".contribute-field, .contribute-fieldset") || container).classList.remove("contribute-invalid");
        hideContributeAlert();
        render();
    };

    render();
}

function _getChipSelection(containerId) {
    return document.getElementById(containerId)._selected || [];
}

// Populated lazily (once) the first time the dialog opens, reusing the same
// enum constants the charts use (charts-registry.js) so the dropdowns can
// never drift from the palette's value lists.
function populateContributeOptions() {
    if (_contributeOptionsPopulated) return;
    _fillSelect("c-contribution-type", CONTRIB_VALS);
    _fillSelect("c-llm-interaction", PROMPTING_VALS);
    _fillSelect("c-contextual-info", CONTEXTUAL_VALS);
    _fillSelect("c-approach", APPROACH_VALS);
    _fillSelect("c-scope", SCOPE_VALS);
    _fillSelect("c-focus", FOCUS_VALS);
    _contributeOptionsPopulated = true;
}

// ── ID assignment ──────────────────────────────────────────────────────
// Community-contributed rows use an `Nxxx` id (README.md convention);
// the next one is just the current corpus's max N-id, plus one.
function computeNextId() {
    const data = globalThis._allData || [];
    let max = 0;
    data.forEach((r) => {
        const m = /^N(\d+)$/.exec((r.ID || "").trim());
        if (m) max = Math.max(max, Number.parseInt(m[1], 10));
    });
    return "N" + String(max + 1).padStart(3, "0");
}

// ── BibTeX key extraction ──────────────────────────────────────────────
// The KEY column is derived from the pasted BibTeX entry (not a separate
// input) so it can never drift from the entry itself.
function extractBibtexKey(bibtex) {
    const m = /@\w+\{\s*([^,\s]+)\s*,/.exec(bibtex || "");
    return m ? m[1] : null;
}

// ── CSV row building ───────────────────────────────────────────────────
function csvEscape(value) {
    const s = String(value ?? "");
    if (/[;"\n\r]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
}

function buildCsvRow(fields) {
    return CSV_COLUMNS.map((col) => csvEscape(fields[col] ?? "")).join(";");
}

// ── GitHub issue body ──────────────────────────────────────────────────
function buildIssueBody(fields, csvRow, comment) {
    const rows = CSV_COLUMNS.map((col) => {
        const val = String(fields[col] ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ").trim();
        return `| ${col} | ${val || "_(none)_"} |`;
    });
    const lines = [];
    if (comment?.trim()) {
        lines.push("### Contributor comment", "", comment.trim(), "");
    }
    lines.push(
        "## Proposed new article",
        "",
        "| Field | Value |",
        "|---|---|",
        ...rows,
        "",
        "### Ready-to-paste CSV row (data/articlecorpus.csv)",
        "",
        "```",
        csvRow,
        "```",
    );
    return lines.join("\n");
}

// ── Inline error feedback (the dialog is a native <dialog> in the browser's
// top layer, so the page-level toast() renders behind it — errors need to
// live inside the dialog instead). ──────────────────────────────────────
function showContributeAlert(message) {
    const el = document.getElementById("contribute-alert");
    el.textContent = message;
    el.hidden = false;
    el.scrollIntoView({ block: "nearest" });
}

function hideContributeAlert() {
    const el = document.getElementById("contribute-alert");
    el.hidden = true;
    el.textContent = "";
}

function _clearFieldErrors(form) {
    form.querySelectorAll(".contribute-invalid").forEach((el) => el.classList.remove("contribute-invalid"));
}

function _markFieldError(el) {
    if (!el) return;
    (el.closest(".contribute-field, .contribute-fieldset") || el).classList.add("contribute-invalid");
}

// ── Form reading ────────────────────────────────────────────────────────
function _readContributeForm(form) {
    const venueType = form.querySelector('input[name="venueType"]:checked')?.value || "";
    return {
        title: document.getElementById("c-title").value.trim(),
        year: document.getElementById("c-year").value.trim(),
        bibtex: document.getElementById("c-bibtex").value.trim(),
        venueType,
        venueName: document.getElementById("c-venue-name").value.trim(),
        databases: _getChipSelection("c-database-group"),
        contributionType: document.getElementById("c-contribution-type").value,
        abstract: document.getElementById("c-abstract").value.trim(),
        trends: _getChipSelection("c-trend-group"),
        llmInteraction: document.getElementById("c-llm-interaction").value,
        contextualInfo: document.getElementById("c-contextual-info").value,
        approach: document.getElementById("c-approach").value,
        scope: document.getElementById("c-scope").value,
        focus: document.getElementById("c-focus").value,
        benchmark: document.getElementById("c-benchmark").value.trim(),
        llmsUsed: document.getElementById("c-llms-used").value.trim(),
        evaluationMetric: document.getElementById("c-evaluation-metric").value.trim(),
        tool: document.getElementById("c-tool").value.trim(),
        comment: document.getElementById("c-comment").value.trim(),
    };
}

// ── Open / submit ──────────────────────────────────────────────────────
function openContributeForm() {
    populateContributeOptions();
    const form = document.getElementById("contribute-form");
    form.reset();
    _clearFieldErrors(form);
    hideContributeAlert();
    _buildChipMultiSelect("c-database-group", DATABASE_VALS);
    _buildChipMultiSelect("c-trend-group", TREND_ORDER, TREND_COLORS);
    document.getElementById("contribute-next-id").textContent = computeNextId();
    openDialog("modal-contribute");
}

function submitContribute() {
    const form = document.getElementById("contribute-form");
    hideContributeAlert();
    _clearFieldErrors(form);

    if (!form.reportValidity()) {
        form.querySelectorAll(":invalid").forEach((el) => _markFieldError(el));
        return;
    }

    const values = _readContributeForm(form);

    if (values.trends.length === 0) {
        _markFieldError(document.getElementById("c-trend-group"));
        showContributeAlert("Select at least one Trend value.");
        return;
    }

    if (values.databases.length === 0) {
        _markFieldError(document.getElementById("c-database-group"));
        showContributeAlert("Select at least one Database value.");
        return;
    }

    const bibtexKey = extractBibtexKey(values.bibtex);
    if (!bibtexKey) {
        _markFieldError(document.getElementById("c-bibtex"));
        showContributeAlert("Couldn't find a citation key in the BibTeX entry (expected: @type{key, ...}).");
        return;
    }

    const id = computeNextId();
    const venuePrefix = values.venueType === "Conference" ? "C" : "J";
    const publishedInto = values.venueType === "arXiv"
        ? values.venueName
        : `${venuePrefix}: ${values.venueName}`;

    const fields = {
        ID: id,
        TITLE: values.title,
        YEAR: values.year,
        KEY: bibtexKey,
        "PUBLISHED INTO": publishedInto,
        "PUBLICATION TYPE": values.venueType,
        BIBTEX: values.bibtex,
        DATABASE: values.databases.join(", "),
        "TYPE OF CONTRIBUTION": values.contributionType,
        ABSTRACT: values.abstract,
        TREND: values.trends.join(", "),
        "LLM ITERACTION": values.llmInteraction,
        "CONTEXTUAL INFO": values.contextualInfo,
        APPROACH: values.approach,
        SCOPE: values.scope,
        FOCUS: values.focus,
        BENCHMARK: values.benchmark,
        "LLMs USED": values.llmsUsed,
        "EVALUATION METRIC": values.evaluationMetric,
        TOOL: values.tool,
    };

    const csvRow = buildCsvRow(fields);
    const fullBody = buildIssueBody(fields, csvRow, values.comment);
    const title = `Add new Article ${id}: ${values.title}`;

    const confirmed = window.confirm(
        `Suggest "${values.title}" (${id}) for inclusion in the roadmap?\n\n` +
        "This opens a pre-filled GitHub issue in a new tab — you'll need to review and submit it there."
    );
    if (!confirmed) return;

    navigator.clipboard?.writeText(fullBody).catch(() => {});

    const buildIssueUrl = (body) => {
        const params = new URLSearchParams({
            title,
            body,
            assignees: "augustocristian,moranjesus",
            labels: "contribution",
        });
        return `${CONTRIBUTE_REPO_URL}/issues/new?${params.toString()}`;
    };

    let url = buildIssueUrl(fullBody);
    if (url.length > 7500) {
        const shortBody = "The full suggestion (including the ready-to-paste CSV row) was copied to your clipboard — " +
            "paste it below.\n\n### Contributor comment\n\n" + (values.comment || "_(none)_");
        url = buildIssueUrl(shortBody);
    }

    window.open(url, "_blank", "noopener");

    document.getElementById("modal-contribute").close();
    toast("Draft issue opened on GitHub — please review and submit it.");
}

function initContribute() {
    const form = document.getElementById("contribute-form");
    document.getElementById("open-contribute").addEventListener("click", (e) => {
        e.preventDefault();
        openContributeForm();
    });
    document.getElementById("contribute-submit").addEventListener("click", () => submitContribute());

    const clearFieldFeedback = (e) => {
        hideContributeAlert();
        e.target.closest(".contribute-field, .contribute-fieldset")?.classList.remove("contribute-invalid");
    };
    form.addEventListener("input", clearFieldFeedback);
    form.addEventListener("change", clearFieldFeedback);
}
