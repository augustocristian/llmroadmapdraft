// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ARTICLE TABLE — Tabulator-based (zero-dependency, no jQuery).        ║
// ║  Rows are the raw PapaParse record objects; every filter (corpus,     ║
// ║  year, per-column sets, abstract search, reading list, global search) ║
// ║  is one combined predicate: _rowPasses, applied via setFilter().       ║
// ╚══════════════════════════════════════════════════════════════════════╝

let tabulator = null;            // Tabulator instance
let _tableBuilt = false;
let currentCorpus = "all";
let currentYearRange = null;
let _globalQuery = [];           // AND-ed search terms, set by chart clicks (chartClickFilter)
let _abstractQuery = "";         // abstract search box
let _rlFilterActive = false;     // reading-list-only toggle

const MULTI_VALUE_COLS = new Set([
    "TREND", "LLM ITERACTION", "CONTEXTUAL INFO", "APPROACH", "SCOPE",
    "BENCHMARK", "LLMs USED", "EVALUATION METRIC", "TOOL", "TYPE OF CONTRIBUTION", "FOCUS",
]);

const NO_FILTER_COLS = new Set(["TITLE", "ABSTRACT", "BIBTEX"]);

const HIDDEN_COLS = new Set(["KEY", "DATABASE"]);

// On phones, start with only the essentials visible (title/year/venue + the
// BibTeX/Abstract action buttons, which are how a cramped screen drills into
// a row's full detail, including TREND etc., via the dialogs) — the rest
// stays one tap away in the existing "Columns" dropdown, un-hidden here.
const SM_DEFAULT_HIDDEN = new Set([
    "ID", "PUBLICATION TYPE", "TYPE OF CONTRIBUTION", "TREND", "LLM ITERACTION",
    "CONTEXTUAL INFO", "APPROACH", "SCOPE", "FOCUS", "BENCHMARK", "LLMs USED",
    "EVALUATION METRIC", "TOOL",
]);

// ── Reading list (localStorage) ────────────────────────────────────────
const readingList = new Set(JSON.parse(localStorage.getItem("readingList") || "[]"));

function _saveReadingList() {
    localStorage.setItem("readingList", JSON.stringify([...readingList]));
    const badge = document.getElementById("readingListCount");
    if (badge) {
        badge.textContent = readingList.size;
        badge.style.display = readingList.size > 0 ? "" : "none";
    }
}

// ── Abstract / BibTeX modals ───────────────────────────────────────────
function _populateRelatedPapers(title, trends, relatedDiv, relatedList) {
    relatedList.innerHTML = "";
    const allData = globalThis._allData;
    if (!allData || !trends) { relatedDiv.style.display = "none"; return; }
    const paperTrends = trends.split(",").map((s) => s.trim()).filter(Boolean);
    if (paperTrends.length === 0) { relatedDiv.style.display = "none"; return; }
    const related = allData.filter((r) => {
        if ((r.TITLE || "").trim() === title.trim()) return false;
        const rTrends = new Set((r.TREND || "").split(",").map((s) => s.trim()));
        return paperTrends.some((t) => rTrends.has(t));
    }).slice(0, 8);
    if (related.length === 0) { relatedDiv.style.display = "none"; return; }
    related.forEach((r) => {
        const li = document.createElement("li");
        const bibtex = r.BIBTEX || "";
        const paperUrl = (bibtex.match(/url\s*=\s*[{"]([^}"]+)[}"]/i) || [])[1] || "";
        const rTitle = r.TITLE || "";
        const sharedTrends = (r.TREND || "").split(",").map((s) => s.trim()).filter((t) => paperTrends.includes(t));
        if (paperUrl) {
            const linkColor = brandTeal(document.body.classList.contains("dark-mode"));
            li.innerHTML = `<a href="${paperUrl}" target="_blank" style="color:${linkColor};">${rTitle}</a>`;
        } else {
            li.textContent = rTitle;
        }
        sharedTrends.forEach((t) => {
            const chip = document.createElement("span");
            chip.className = "related-chip";
            chip.textContent = t;
            li.appendChild(chip);
        });
        relatedList.appendChild(li);
    });
    relatedDiv.style.display = "";
}

function showAbstract({ title, authors, venue, abstract, url, trends, conf, year }) {
    document.getElementById("modal-abstract-title").textContent = title;
    document.getElementById("modal-abstract-authors").textContent = authors;
    const venueEl = document.getElementById("modal-abstract-venue");
    const confUrl = (typeof _confUrls === "object" && _confUrls && conf && year)
        ? (_confUrls[conf + " " + year] || null) : null;
    if (confUrl) {
        const linkColor = brandTeal(document.body.classList.contains("dark-mode"));
        venueEl.innerHTML = `<a href="${confUrl}" target="_blank" rel="noopener" style="color:${linkColor};font-weight:600;text-decoration:underline;">${venue}</a>`;
    } else {
        venueEl.textContent = venue;
    }
    document.getElementById("modal-abstract-content").textContent = abstract;
    const linkBtn = document.getElementById("modal-abstract-link");
    if (url) { linkBtn.href = url; linkBtn.style.display = ""; } else { linkBtn.style.display = "none"; }
    _populateRelatedPapers(title, trends,
        document.getElementById("modal-related-papers"),
        document.getElementById("modal-related-list"));
    openDialog("modal-abstract");
}

let _lastBibtexBlobUrl = null;
function showBibtex(bibtex) {
    document.getElementById("modal-bibtex-content").textContent = bibtex;
    const dlBtn = document.getElementById("download-bibtex-modal");
    if (_lastBibtexBlobUrl) URL.revokeObjectURL(_lastBibtexBlobUrl);
    _lastBibtexBlobUrl = URL.createObjectURL(new Blob([bibtex], { type: "text/plain" }));
    dlBtn.href = _lastBibtexBlobUrl;
    openDialog("modal-bibtex");
}

// Build the showAbstract() payload straight from a row object.
function _abstractArgs(row) {
    const bibtex = row.BIBTEX || "";
    const authMatch = bibtex.match(/author\s*=\s*[{"]([^}"]+)[}"]/i);
    const authors = authMatch ? authMatch[1].replace(/\s+/g, " ").trim() : "";
    const pubRaw = (row["PUBLISHED INTO"] || "").trim();
    const acronym = pubRaw.replace(/^[CJ]:\s*/, "");
    const pubType = (row["PUBLICATION TYPE"] || "").trim();
    let venue = acronym;
    if (pubType === "arXiv") {
        venue = "arXiv";
    } else {
        const btMatch = bibtex.match(/booktitle\s*=\s*[{"]([^}"]+)[}"]/i);
        const jnMatch = bibtex.match(/journal\s*=\s*[{"]([^}"]+)[}"]/i);
        let longName = "";
        if (btMatch) longName = btMatch[1].trim();
        else if (jnMatch) longName = jnMatch[1].trim();
        if (longName) venue = longName + " (" + acronym + ")";
    }
    const paperUrl = (bibtex.match(/url\s*=\s*[{"]([^}"]+)[}"]/i) || [])[1]?.trim() || "";
    return {
        title: row.TITLE || "", authors, venue, conf: acronym,
        year: row.YEAR || "", url: paperUrl,
        trends: row.TREND || "", abstract: row.ABSTRACT || "",
    };
}

// ── Chip colour maps — derived from the unified _PALETTE ──────────────
// charts.js (loaded first) defines _PALETTE, _chipColor, _lightenHex.
const _P = globalThis._PALETTE || {};

// Map every value of a _PALETTE dimension to its derived chip { bg, fg } pair.
function _paletteChipColors(paletteKey) {
    return Object.fromEntries(
        Object.entries(_P[paletteKey] || {}).map(([k, v]) => [k, _chipColor(v)])
    );
}

const PUB_TYPE_COLORS = _paletteChipColors("pubTypes");
const TREND_COLORS = _paletteChipColors("trends");
const INTERACTION_COLORS = _paletteChipColors("prompting");
const CONTEXT_COLORS = _paletteChipColors("contextualInfo");
const APPROACH_COLORS = _paletteChipColors("approach");
const SCOPE_COLORS = _paletteChipColors("scope");
const CONTRIBUTION_COLORS = _paletteChipColors("contributions");
const FOCUS_COLORS = _paletteChipColors("dimensionFocus");
const LLM_COLORS = _paletteChipColors("llmFamilies");
const YEAR_COLORS = (() => {
    const seq = _P.sequence || [];
    return Object.fromEntries(
        ["2020", "2021", "2022", "2023", "2024", "2025", "2026"].map((y, i) => [y, _chipColor(seq[i] || _C.GRAY)])
    );
})();

// Free-text list columns: one flat chip colour per column, anchored to the
// same _C constant the column's chart uses (bench_trend → PURPLE, etc.).
const CHIP_COLORS = {
    "BENCHMARK":         _chipColor(_C.PURPLE),
    "EVALUATION METRIC": _chipColor(_C.DEEP_RED),
    "TOOL":              _chipColor(_C.GRAY),
};
const NEUTRAL_CHIP = _chipColor(_C.GRAY);

// Venue chips are colored by publication type (all conferences share the
// Conference blue, journals the Journal teal, arXiv the arXiv red) — the
// chipFormatter passes the pubType-anchored pair as overrideColor, so venues
// need no per-acronym map and new venues in the CSV need no code change.
const VENUE_TYPE_CHIPS = {
    conference: _chipColor(_P.pubTypes?.Conference || _C.DEEP_BLUE),
    journal:    _chipColor(_P.pubTypes?.Journal || _C.TEAL),
    arxiv:      _chipColor(_P.pubTypes?.arXiv || _C.DEEP_RED),
};

const PER_VALUE_MAPS = {
    "PUBLICATION TYPE":     PUB_TYPE_COLORS,
    "TREND":                TREND_COLORS,
    "LLM ITERACTION":       INTERACTION_COLORS,
    "CONTEXTUAL INFO":      CONTEXT_COLORS,
    "APPROACH":             APPROACH_COLORS,
    "SCOPE":                SCOPE_COLORS,
    "FOCUS":                FOCUS_COLORS,
    "TYPE OF CONTRIBUTION": CONTRIBUTION_COLORS,
    "YEAR":                 YEAR_COLORS,
    "LLMs USED":            LLM_COLORS,
};

function _fallbackChipColor(val, colName) {
    const valMap = PER_VALUE_MAPS[colName];
    return valMap ? (valMap[val] || NEUTRAL_CHIP) : (CHIP_COLORS[colName] || NEUTRAL_CHIP);
}

function chipHtml(val, colName, url, overrideColor = null) {
    const c = overrideColor || _fallbackChipColor(val, colName);
    const chip = `<span class="table-chip" style="background:${c.bg};color:${c.fg}">${val}</span>`;
    if (url) return `<a href="${url}" target="_blank" rel="noopener" style="text-decoration:none">${chip}</a>`;
    return chip;
}

// Corpus toggle (P/V prefix) + year-range slider.
function _passesCorpusAndYear(rowData) {
    if (currentCorpus === "initial" && !rowData.ID?.startsWith("P")) return false;
    if (currentCorpus === "validation" && !rowData.ID?.startsWith("V")) return false;
    if (!currentYearRange) return true;
    const y = Number.parseFloat(rowData.YEAR);
    return !Number.isNaN(y) && y >= currentYearRange[0] && y <= currentYearRange[1];
}

// Per-column checkbox filters (columnFilters: field → Set of selected values).
function _passesColumnFilters(rowData) {
    for (const [field, selected] of Object.entries(columnFilters)) {
        if (!selected || selected.size === 0) continue;
        const cellVal = rowData[field] || "";
        if (MULTI_VALUE_COLS.has(field)) {
            const vals = cellVal.split(",").map((v) => v.trim()).filter(Boolean);
            if (!vals.some((v) => selected.has(v))) return false;
        } else {
            const clean = field === "PUBLISHED INTO"
                ? cellVal.trim().replace(/^[CJ]:\s*/, "")
                : cellVal.trim();
            if (!selected.has(clean)) return false;
        }
    }
    return true;
}

// Abstract search box + global search terms (set by chart click-filtering;
// multiple terms — e.g. a heatmap cell's row × column — are AND-ed).
function _passesSearchQueries(rowData) {
    if (!_abstractQuery && _globalQuery.length === 0) return true;
    const joined = Object.values(rowData).join(" ").toLowerCase();
    if (_abstractQuery && !joined.includes(_abstractQuery)) return false;
    return _globalQuery.every((term) => joined.includes(term));
}

// ── Unified row predicate (the ONLY filter Tabulator runs) ─────────────
function _rowPasses(rowData) {
    if (!_passesCorpusAndYear(rowData)) return false;
    if (!_passesColumnFilters(rowData)) return false;
    if (_rlFilterActive && !readingList.has((rowData.TITLE || "").trim())) return false;
    return _passesSearchQueries(rowData);
}

function _refilter() {
    if (tabulator && _tableBuilt) tabulator.refreshFilter();
}

// Public state setters --------------------------------------------------
function setTableFilters(corpus, yearRange) {
    currentCorpus = corpus;
    currentYearRange = yearRange;
    _refilter();
}

globalThis._setAbstractQuery = (q) => { _abstractQuery = (q || "").trim().toLowerCase(); _refilter(); };

// Accepts a single string or an array of terms (AND-ed together).
globalThis._setGlobalTableSearch = (q) => {
    const terms = Array.isArray(q) ? q : [q];
    _globalQuery = terms.map((t) => (t || "").trim().toLowerCase()).filter(Boolean);
    _refilter();
};

// ── Column filter state + dropdown UI (vanilla, floating) ──────────────
const columnFilters = {};        // field name → Set of selected values
const _columnUniqueVals = {};    // field name → sorted unique values

function updateFilterBadge() {
    const count = Object.keys(columnFilters).length;
    const btn = document.getElementById("toggleFilters");
    if (!btn) return;
    const isVisible = document.getElementById("tabla").classList.contains("filters-visible");
    const arrow = isVisible ? "&#9650;" : "&#9660;";
    btn.innerHTML = count > 0 ? `${arrow} Filters <span class="filter-badge">${count}</span>` : `${arrow} Filters`;
}

function _computeUniqueVals(data, field) {
    const vals = new Set();
    data.forEach((r) => {
        const v = r[field];
        if (!v) return;
        if (MULTI_VALUE_COLS.has(field)) {
            v.split(",").forEach((s) => { const t = s.trim(); if (t) vals.add(t); });
        } else if (field === "PUBLISHED INTO") {
            vals.add(v.replace(/^[CJ]:\s*/, "").trim());
        } else {
            vals.add(v.trim());
        }
    });
    return [...vals].sort((a, b) => a.localeCompare(b));
}

function _closeColumnFilterDropdowns() {
    document.querySelectorAll(".col-filter-dropdown").forEach((d) => d.remove());
}

function _openColumnFilterDropdown(field, anchorEl) {
    const existing = document.querySelector(`.col-filter-dropdown[data-field="${field}"]`);
    _closeColumnFilterDropdowns();
    if (existing) return; // toggle behaviour: clicking again closes
    const values = _columnUniqueVals[field] || [];
    if (!values.length) return;

    const dd = document.createElement("div");
    dd.className = "col-filter-dropdown active";
    dd.dataset.field = field;
    dd.addEventListener("click", (e) => e.stopPropagation());

    const controls = document.createElement("div");
    controls.className = "col-filter-controls";
    controls.innerHTML = '<a href="#" class="col-filter-action" data-act="all">All</a><a href="#" class="col-filter-action" data-act="none">None</a>';
    dd.appendChild(controls);

    if (values.length > 6) {
        const search = document.createElement("input");
        search.type = "text";
        search.className = "col-filter-search";
        search.placeholder = "Search...";
        search.addEventListener("input", () => {
            const q = search.value.toLowerCase();
            dd.querySelectorAll(".col-filter-item").forEach((item) => {
                item.style.display = item.querySelector("span").textContent.toLowerCase().includes(q) ? "" : "none";
            });
        });
        dd.appendChild(search);
    }

    const list = document.createElement("div");
    list.className = "col-filter-list";
    const selected = columnFilters[field];
    values.forEach((val) => {
        const label = document.createElement("label");
        label.className = "col-filter-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = val;
        cb.checked = !selected || selected.has(val);
        const span = document.createElement("span");
        span.textContent = val;
        label.appendChild(cb);
        label.appendChild(span);
        list.appendChild(label);
    });
    dd.appendChild(list);

    const apply = () => {
        const checked = [...list.querySelectorAll("input:checked")].map((c) => c.value);
        if (checked.length === values.length || checked.length === 0) delete columnFilters[field];
        else columnFilters[field] = new Set(checked);
        anchorEl.classList.toggle("col-filter-active", !!columnFilters[field]);
        updateFilterBadge();
        _refilter();
    };
    list.addEventListener("change", apply);
    controls.addEventListener("click", (e) => {
        const act = e.target.dataset?.act;
        if (!act) return;
        e.preventDefault();
        list.querySelectorAll("input").forEach((cb) => { cb.checked = act === "all"; });
        apply();
    });

    document.body.appendChild(dd);
    const rect = anchorEl.getBoundingClientRect();
    dd.style.position = "fixed";
    dd.style.top = `${rect.bottom + 4}px`;
    dd.style.left = `${Math.min(rect.left, window.innerWidth - 250)}px`;
    dd.style.zIndex = "1200";
}

document.addEventListener("click", _closeColumnFilterDropdowns);

// Header title with an embedded filter button (visible when .filters-visible).
function _filterTitleFormatter(field) {
    return (cell) => {
        const wrap = document.createElement("span");
        wrap.className = "th-filter-wrap";
        wrap.textContent = field;
        const btn = document.createElement("span");
        btn.className = "col-filter-btn";
        btn.title = "Filter";
        btn.innerHTML = "&#9660;";
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            _openColumnFilterDropdown(field, btn);
        });
        wrap.appendChild(btn);
        return wrap;
    };
}

// ── Tabulator init ──────────────────────────────────────────────────────
function initDataTable(data, headers) {
    // Normalise YEAR once (2023.0 → "2023")
    data.forEach((r) => { if (r.YEAR) r.YEAR = String(Math.floor(Number.parseFloat(r.YEAR))); });

    const visibleHeaders = headers.filter((h) => !HIDDEN_COLS.has(h));
    visibleHeaders.filter((h) => !NO_FILTER_COLS.has(h)).forEach((h) => {
        _columnUniqueVals[h] = _computeUniqueVals(data, h);
    });

    const MAX_VISIBLE_CHIPS = 2;
    const chipFormatter = (field) => (cell) => {
        const cellData = cell.getValue() || "";
        if (!cellData) return "";
        const rowData = cell.getRow().getData();
        let raw = cellData;
        const isVenue = field === "PUBLISHED INTO";
        if (isVenue) raw = raw.replace(/^[CJ]:\s*/, "");
        const vals = raw.split(",").map((v) => v.trim()).filter(Boolean);
        let venueColor = null;
        if (isVenue) {
            if (cellData.startsWith("C:")) venueColor = VENUE_TYPE_CHIPS.conference;
            else if (cellData.startsWith("J:")) venueColor = VENUE_TYPE_CHIPS.journal;
            else venueColor = VENUE_TYPE_CHIPS.arxiv;
        }
        const makeChip = (v) => {
            const chipUrl = (isVenue && cellData.startsWith("C:") && typeof _confUrls === "object" && _confUrls)
                ? (_confUrls[v + " " + (rowData.YEAR || "")] || null) : null;
            return chipHtml(v, field, chipUrl, venueColor);
        };
        if (vals.length <= MAX_VISIBLE_CHIPS) return vals.map(makeChip).join(" ");
        const visible = vals.slice(0, MAX_VISIBLE_CHIPS).map(makeChip).join(" ");
        const extra = vals.slice(MAX_VISIBLE_CHIPS).map(makeChip).join(" ");
        const remaining = vals.length - MAX_VISIBLE_CHIPS;
        return `<span class="chip-wrap">${visible}<span class="chip-extra"> ${extra}</span>` +
            `<span class="chip-more">+${remaining}</span></span>`;
    };

    const chipCols = new Set([...MULTI_VALUE_COLS, "PUBLICATION TYPE", "YEAR", "PUBLISHED INTO"]);

    // Expand the hidden chips behind a "+N" toggle: allow the cell to wrap
    // (Tabulator cells are nowrap by default) and re-measure the row height,
    // otherwise the revealed chips stay clipped and invisible.
    const chipMoreCellClick = (e, cell) => {
        const more = e.target.closest(".chip-more");
        if (!more) return;
        e.stopPropagation();
        const wrap = more.parentElement;
        wrap.classList.toggle("expanded");
        cell.getElement().classList.toggle("chips-expanded", wrap.classList.contains("expanded"));
        cell.getRow().normalizeHeight();
    };

    const columns = [
        { // reading-list star
            title: "★", headerSort: false, width: 42, hozAlign: "center", download: false,
            formatter: (cell) => {
                const t = (cell.getRow().getData().TITLE || "").trim();
                const on = readingList.has(t);
                return `<button class="star-btn ${on ? "starred" : ""}" title="Add to reading list">${on ? "★" : "☆"}</button>`;
            },
            cellClick: (e, cell) => {
                e.stopPropagation();
                const t = (cell.getRow().getData().TITLE || "").trim();
                if (readingList.has(t)) readingList.delete(t);
                else readingList.add(t);
                _saveReadingList();
                cell.getRow().reformat();
                if (_rlFilterActive) _refilter();
            },
        },
        ...visibleHeaders.map((h) => {
            const col = { title: h, field: h };
            if (_screenTier() === "sm" && SM_DEFAULT_HIDDEN.has(h)) col.visible = false;
            if (!NO_FILTER_COLS.has(h)) col.titleFormatter = _filterTitleFormatter(h);
            if (chipCols.has(h)) {
                col.formatter = chipFormatter(h);
                col.cellClick = chipMoreCellClick;
            }
            if (h === "TITLE") {
                col.width = 340;
                col.cssClass = "dt-title";
                col.formatter = (cell) => {
                    const rowData = cell.getRow().getData();
                    const title = cell.getValue() || "";
                    const url = (rowData.BIBTEX || "").match(/url\s*=\s*[{"]([^}"]+)[}"]/i)?.[1];
                    return url ? `<a href="${url}" target="_blank">${title}</a>` : title;
                };
                col.tooltip = (e, cell) => {
                    const abs = (cell.getRow().getData().ABSTRACT || "").trim();
                    if (!abs) return "";
                    return abs.length > 220 ? abs.substring(0, 220) + "..." : abs;
                };
            }
            if (h === "BIBTEX") {
                col.headerSort = false;
                col.width = 92;
                col.formatter = (cell) => (cell.getValue() ? '<button class="green-btn bibtex-btn">BibTeX</button>' : "");
                col.cellClick = (e, cell) => {
                    e.stopPropagation();
                    const bib = cell.getRow().getData().BIBTEX;
                    if (bib) showBibtex(bib);
                };
            }
            if (h === "ABSTRACT") {
                col.headerSort = false;
                col.width = 80;
                col.formatter = (cell) => (cell.getValue() ? '<button class="green-btn info-btn">INFO</button>' : "");
                col.cellClick = (e, cell) => {
                    e.stopPropagation();
                    showAbstract(_abstractArgs(cell.getRow().getData()));
                };
            }
            return col;
        }),
    ];

    tabulator = new Tabulator("#tabla", {
        data,
        columns,
        layout: "fitData",
        pagination: true,
        paginationSize: 25,
        paginationCounter: "rows",
        persistence: { sort: true },
        persistenceID: "slr-table",
        placeholder: "No matching articles",
    });

    tabulator.on("tableBuilt", () => {
        _tableBuilt = true;
        tabulator.setFilter(_rowPasses);
    });

    // Row click anywhere (except links/buttons/chips) opens the INFO modal.
    tabulator.on("rowClick", (e, row) => {
        if (e.target.closest("a, button, .chip-more, .col-filter-btn")) return;
        showAbstract(_abstractArgs(row.getData()));
    });

    // Filters visibility toggle (clears all column filters when hidden)
    document.getElementById("toggleFilters").addEventListener("click", () => {
        const tableEl = document.getElementById("tabla");
        const visible = tableEl.classList.toggle("filters-visible");
        if (!visible) {
            Object.keys(columnFilters).forEach((k) => delete columnFilters[k]);
            document.querySelectorAll(".col-filter-btn.col-filter-active").forEach((b) => b.classList.remove("col-filter-active"));
            _closeColumnFilterDropdowns();
            _refilter();
        }
        updateFilterBadge();
    });

    document.getElementById("pageLengthSelect").addEventListener("change", (e) => {
        const v = Number(e.target.value);
        tabulator.setPageSize(v === -1 ? data.length : v);
    });

    _saveReadingList(); // initialise badge

    const showBtn = document.getElementById("showReadingList");
    if (showBtn) {
        showBtn.addEventListener("click", () => {
            _rlFilterActive = !_rlFilterActive;
            showBtn.classList.toggle("active-rl", _rlFilterActive);
            _refilter();
        });
    }
}
