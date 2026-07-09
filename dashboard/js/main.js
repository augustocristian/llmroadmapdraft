// ── Export filename builder ────────────────────────────────────────────────
// Reads live filter state from globalThis._activeFilters (set by the loadCSV
// callback below). Format: {chart_name}_{corpus}_{yearStart}-{yearEnd}.{ext}
function _buildExportFilename(chartId, ext) {
    const f = globalThis._activeFilters || {};
    const corpus = (f.corpus && f.corpus !== "all") ? f.corpus : "all";
    const yr0 = f.yearRange?.[0] ?? "";
    const yr1 = f.yearRange?.[1] ?? "";
    const years = yr0 && yr1 ? `${yr0}-${yr1}` : "";

    let name = chartId;
    if (chartId === "grafica") {
        const sel = document.getElementById("graficoSelect");
        const txt = (typeof chartLabel === "function" && sel ? chartLabel(sel.value) : null)
            || sel?.options[sel?.selectedIndex]?.text || "chart";
        name = txt.toLowerCase().replace(/[×&]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    } else if (chartId === "chart-bubble") {
        name = "trends_overview";
    }

    const safe = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return [name, safe(corpus), years].filter(Boolean).join("_") + "." + ext;
}

// ── Copy BibTeX button ──
function initCopyBibtex() {
    document.getElementById("copy-bibtex").addEventListener("click", () => {
        const text = document.getElementById("modal-bibtex-content").textContent;
        navigator.clipboard.writeText(text).then(() => toast("BibTeX copied!"));
    });
}

// ── Dark mode toggle (icon button) ──
function initDarkModeToggle() {
    const darkToggle = document.getElementById("dark-mode-toggle");
    const isDark = localStorage.getItem("darkMode") === "true";
    if (isDark) document.body.classList.add("dark-mode");
    if (!darkToggle) return;

    const updateBtn = (dark) => {
        darkToggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
        darkToggle.setAttribute("aria-label", darkToggle.title);
    };
    updateBtn(isDark);
    darkToggle.addEventListener("click", () => {
        const nowDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", nowDark);
        updateBtn(nowDark);
        // ECharts themes are fixed at init time — re-render everything with
        // the new theme once data is available.
        if (typeof globalThis._rerenderAllCharts === "function") globalThis._rerenderAllCharts();
    });
}

// ── Back to top button ──
function initBackToTop() {
    const backToTop = document.getElementById("backToTop");
    window.addEventListener("scroll", () => {
        backToTop.style.display = window.scrollY > 400 ? "block" : "none";
    });
    backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ── Mini-nav smooth scroll + active tracking ──
function initMiniNav() {
    const navLinks = document.querySelectorAll(".mini-nav-link");
    const sections = [...navLinks].map((l) => document.getElementById(l.dataset.section)).filter(Boolean);

    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.section);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    const updateActiveNav = () => {
        const scrollY = window.scrollY + 120;
        let current = sections[0];
        sections.forEach((s) => { if (s.offsetTop <= scrollY) current = s; });
        navLinks.forEach((l) => {
            l.classList.toggle("active", l.dataset.section === current?.id);
        });
    };
    window.addEventListener("scroll", updateActiveNav);
}

// ── Chart download (PNG dropdown) ──
function initChartDownloads() {
    document.querySelectorAll(".chart-download-btn").forEach((btn) => {
        const menu = btn.nextElementSibling;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll(".chart-dl-menu.active").forEach((m) => { if (m !== menu) m.classList.remove("active"); });
            menu.classList.toggle("active");
        });
    });
    document.addEventListener("click", () => {
        document.querySelectorAll(".chart-dl-menu.active").forEach((m) => m.classList.remove("active"));
    });
    document.querySelectorAll(".chart-dl-png").forEach((btn) => {
        btn.addEventListener("click", () => {
            const chart = chartInstances[btn.dataset.chart];
            if (!chart) return;
            const dark = document.body.classList.contains("dark-mode");
            const link = document.createElement("a");
            link.download = _buildExportFilename(btn.dataset.chart, "png");
            link.href = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: dark ? "#1a1a2e" : "#ffffff" });
            link.click();
        });
    });
}

// ── Keyboard shortcuts ──
function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        // Ctrl+K → focus abstract search
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            const input = document.getElementById("abstractSearch");
            if (input) input.focus();
        }
        // Escape → close dropdowns
        if (e.key === "Escape") {
            document.querySelectorAll(".col-filter-dropdown.active, .col-vis-dropdown.active").forEach((d) => d.classList.remove("active"));
        }
    });
}

// ── Year bounds from the loaded data ──
function _getYearBounds(data) {
    const years = data.map((r) => Math.floor(Number.parseFloat(r.YEAR))).filter((y) => !Number.isNaN(y));
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
}

// ── Recompute filtered data + redraw everything that depends on it ──
function _refreshDashboard(data, state) {
    globalThis._activeFilters = { corpus: state.corpus, yearRange: state.yearRange };
    const filtered = applyFilters(data, state.corpus, state.yearRange);
    const chartKey = document.getElementById("graficoSelect").value;
    updateStatsAnimated(filtered);
    updateSummaryStats(filtered);
    renderBubbleDashboard(filtered);
    renderInsightsChart(filtered, chartKey);
    setTableFilters(state.corpus, state.yearRange);
    updateHash(state.corpus, state.yearRange, chartKey);
}

// Re-render every visible chart with the current ECharts theme (used by the
// dark-mode toggle — themes are fixed at echarts.init time).
function _rerenderCharts(data, state) {
    const filtered = applyFilters(data, state.corpus, state.yearRange);
    renderBubbleDashboard(filtered);
    renderInsightsChart(filtered, document.getElementById("graficoSelect").value);
}

// ── Year range slider ──
// rangeMax must be strictly greater than rangeMin to avoid noUiSlider locking
// up when all data falls in a single year.
function initYearSlider(state, minYear, maxYear, refresh) {
    const sliderEl = document.getElementById("yearSlider");
    const rangeMax = Math.max(maxYear, minYear + 1);
    noUiSlider.create(sliderEl, {
        start: state.yearRange,
        connect: true,
        step: 1,
        margin: 0,
        range: { min: minYear, max: rangeMax },
        format: {
            to: (v) => Math.round(v),
            from: Number,
        },
    });

    document.getElementById("yearMinLabel").textContent = state.yearRange[0];
    document.getElementById("yearMaxLabel").textContent = state.yearRange[1];

    // "update" fires continuously on every drag tick — keep it to cheap label
    // text only. The expensive refresh (disposes/re-inits every chart) waits
    // for "change", which fires once when the user releases the handle, so
    // dragging doesn't visibly collapse/resize the charts mid-drag.
    sliderEl.noUiSlider.on("update", (values) => {
        document.getElementById("yearMinLabel").textContent = values[0];
        document.getElementById("yearMaxLabel").textContent = values[1];
    });
    sliderEl.noUiSlider.on("change", (values) => {
        state.yearRange = [values[0], values[1]];
        refresh();
    });
}

// ── Corpus toggle buttons ──
function initCorpusToggle(state, refresh) {
    document.querySelectorAll("#corpusToggle .corpus-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#corpusToggle .corpus-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.corpus = btn.dataset.corpus;
            refresh();
        });
    });
}

// ── Insights chart selector ──
function initChartSelector(data, state, hashState) {
    const chartSelect = document.getElementById("graficoSelect");
    if (hashState.chart && globalThis.CHART_REGISTRY?.[hashState.chart]) {
        chartSelect.value = hashState.chart;
        renderInsightsChart(applyFilters(data, state.corpus, state.yearRange), hashState.chart);
    }
    chartSelect.addEventListener("change", (e) => {
        const filtered = applyFilters(data, state.corpus, state.yearRange);
        renderInsightsChart(filtered, e.target.value);
        updateHash(state.corpus, state.yearRange, e.target.value);
    });
}

// ── Abstract full-text search (feeds the unified Tabulator predicate) ──
function initAbstractSearchInput() {
    const abstractInput = document.getElementById("abstractSearch");
    if (!abstractInput) return;
    let debounce = null;
    abstractInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => globalThis._setAbstractQuery(abstractInput.value), 300);
    });
}

// ── Reveal the dashboard once initial charts are rendered ──
function _revealDashboard() {
    document.getElementById("main-content").style.display = "";
    // Charts were initialised while #main-content was display:none (0×0 host) —
    // resize them now that the layout has real dimensions.
    resizeCharts();
    const overlay = document.getElementById("loading-overlay");
    overlay.classList.add("hidden");
    setTimeout(() => overlay.remove(), 400);
}

// ── Wire up the dashboard once the CSV has loaded ──
function initDashboard(data, headers) {
    globalThis._allData = data;

    initExport(data, headers);
    initDataTable(data, headers);

    const { minYear, maxYear } = _getYearBounds(data);
    const hashState = parseHash();
    const state = {
        corpus: hashState.corpus || "all",
        yearRange: (hashState.yearMin && hashState.yearMax) ? [hashState.yearMin, hashState.yearMax] : [minYear, maxYear],
    };

    if (hashState.corpus) {
        document.querySelectorAll("#corpusToggle .corpus-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.corpus === state.corpus);
        });
    }

    // Sync active filter state so _buildExportFilename is always accurate.
    globalThis._activeFilters = { corpus: state.corpus, yearRange: state.yearRange };
    globalThis._rerenderAllCharts = () => _rerenderCharts(data, state);

    const refresh = () => _refreshDashboard(data, state);
    initYearSlider(state, minYear, maxYear, refresh);
    initCorpusToggle(state, refresh);
    initChartSelector(data, state, hashState);
    initAbstractSearchInput();

    initColumnVisibility(headers);
    initExportFiltered();
    initBulkBibtex();
    initCardCollapse();
    initActiveFilterChips();
    renderSparklines(data);

    // ── Render initial charts + reveal content ──
    const initialFiltered = applyFilters(data, state.corpus, state.yearRange);
    renderBubbleDashboard(initialFiltered);
    updateStatsAnimated(initialFiltered);
    updateSummaryStats(initialFiltered);

    _revealDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
    // Populate the insights chart selector from CHART_REGISTRY before use.
    if (typeof buildChartSelect === "function") buildChartSelect();

    initDialogs(); // native <dialog> close/backdrop wiring (ui.js)
    initCitation();
    initCopyBibtex();
    initDarkModeToggle();
    initBackToTop();
    initMiniNav();
    initChartDownloads();
    initKeyboardShortcuts();

    loadCSV(initDashboard);
});

// ── Animated stat counters ──
function animateValue(el, newVal) {
    const current = Number.parseInt(el.textContent) || 0;
    if (current === newVal) return;
    const diff = newVal - current;
    const steps = Math.min(Math.abs(diff), 20);
    const stepTime = Math.max(15, 300 / steps);
    let step = 0;
    const timer = setInterval(() => {
        step++;
        el.textContent = Math.round(current + (diff * step) / steps);
        if (step >= steps) { el.textContent = newVal; clearInterval(timer); }
    }, stepTime);
}

function updateStatsAnimated(data) {
    let j = 0, c = 0, a = 0;
    data.forEach((r) => {
        const t = (r["PUBLICATION TYPE"] || "").trim();
        if (t === "Journal") j++;
        else if (t === "Conference") c++;
        else if (t === "arXiv") a++;
    });
    animateValue(document.getElementById("stat-total"), data.length);
    animateValue(document.getElementById("stat-journals"), j);
    animateValue(document.getElementById("stat-conferences"), c);
    animateValue(document.getElementById("stat-arxiv"), a);
}

// ── Summary statistics ──
function updateSummaryStats(data) {
    // Avg papers/year
    const years = {};
    data.forEach((r) => { if (r.YEAR) years[r.YEAR] = (years[r.YEAR] || 0) + 1; });
    const yearKeys = Object.keys(years);
    document.getElementById("summary-avg-year").textContent =
        yearKeys.length > 0 ? (data.length / yearKeys.length).toFixed(1) : "-";

    // Peak year
    let peakYear = "-", peakCount = 0;
    for (const [y, cnt] of Object.entries(years)) {
        if (cnt > peakCount) { peakCount = cnt; peakYear = y; }
    }
    document.getElementById("summary-peak-year").textContent = peakYear + " (" + peakCount + ")";

    // Top conference and top journal
    const confCounts = {}, jourCounts = {};
    data.forEach((r) => {
        const v = (r["PUBLISHED INTO"] || "").trim();
        if (v.startsWith("C:")) { const k = v.replace(/^C:\s*/, ""); confCounts[k] = (confCounts[k] || 0) + 1; }
        else if (v.startsWith("J:")) { const k = v.replace(/^J:\s*/, ""); jourCounts[k] = (jourCounts[k] || 0) + 1; }
    });
    const topConf = Object.entries(confCounts).sort((a, b) => b[1] - a[1])[0];
    const topJour = Object.entries(jourCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("summary-top-conf").textContent = topConf ? topConf[0] : "-";
    document.getElementById("summary-top-jour").textContent = topJour ? topJour[0] : "-";

    // Most used LLM
    const llmCounts = countField(data, "LLMs USED", ",", ["n/s", "none"]);
    const topLLM = Object.entries(llmCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("summary-top-llm").textContent = topLLM ? topLLM[0] : "-";

    // Top trend
    const trendCounts = countField(data, "TREND");
    const topTrend = Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("summary-top-trend").textContent = topTrend ? topTrend[0] : "-";

    // Top benchmark
    const bmkCounts = countField(data, "BENCHMARK", ",", ["none", "no bmk-ds", "other", "custom"]);
    const topBmk = Object.entries(bmkCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("summary-top-benchmark").textContent = topBmk ? topBmk[0] : "-";
}

// ── Column visibility ──
function initColumnVisibility(headers) {
    const btn = document.getElementById("colVisBtn");
    const dropdown = document.getElementById("colVisDropdown");
    if (!btn || !dropdown || !tabulator) return;

    const hiddenSet = new Set(["KEY", "DATABASE"]);
    headers.filter((h) => !hiddenSet.has(h)).forEach((field) => {
        const label = document.createElement("label");
        label.className = "col-vis-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        // Reflect the same default-hidden decision table.js's column config
        // made (SM_DEFAULT_HIDDEN, shared global) rather than querying
        // Tabulator's column API — this runs synchronously right after
        // initDataTable, before Tabulator's async "tableBuilt" fires, and
        // getColumn() returns `false` (not undefined) until then, which
        // would defeat `?.` and throw on the following method call.
        cb.checked = !(_screenTier() === "sm" && SM_DEFAULT_HIDDEN.has(field));
        const span = document.createElement("span");
        span.textContent = field;
        label.appendChild(cb);
        label.appendChild(span);
        dropdown.appendChild(label);
        cb.addEventListener("change", () => {
            const col = tabulator.getColumn(field);
            if (col) col.toggle();
        });
    });

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const opening = !dropdown.classList.contains("active");
        dropdown.classList.toggle("active");
        if (opening) {
            // Clamp on-screen (mirrors the column-filter dropdown's clamp,
            // table.js:365-369) now that this dropdown is position:fixed.
            const rect = btn.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + 4}px`;
            dropdown.style.left = `${Math.max(8, Math.min(rect.right - dropdown.offsetWidth, window.innerWidth - dropdown.offsetWidth - 8))}px`;
        }
    });
    document.addEventListener("click", () => dropdown.classList.remove("active"));
    dropdown.addEventListener("click", (e) => e.stopPropagation());
}

// ── Export filtered data ──
function initExportFiltered() {
    const btn = document.getElementById("exportFiltered");
    if (!btn) return;
    // Tabulator exports the filtered ("active") row objects as raw values.
    btn.addEventListener("click", () => {
        if (tabulator) tabulator.download("csv", "articlecorpus_filtered.csv", {}, "active");
    });
}

// ── Shareable URL hash ──
function updateHash(corpus, yearRange, chart) {
    const params = new URLSearchParams();
    if (corpus && corpus !== "all") params.set("corpus", corpus);
    if (yearRange) { params.set("ymin", yearRange[0]); params.set("ymax", yearRange[1]); }
    if (chart && chart !== globalThis.DEFAULT_CHART_KEY) params.set("chart", chart);
    const hash = params.toString();
    history.replaceState(null, "", hash ? "#" + hash : location.pathname);
}

function parseHash() {
    const result = {};
    if (!location.hash || location.hash.length < 2) return result;
    const params = new URLSearchParams(location.hash.substring(1));
    if (params.get("corpus")) result.corpus = params.get("corpus");
    if (params.get("ymin")) result.yearMin = Number(params.get("ymin"));
    if (params.get("ymax")) result.yearMax = Number(params.get("ymax"));
    if (params.get("chart")) result.chart = params.get("chart");
    return result;
}

// ── Card collapse ──
function initCardCollapse() {
    document.querySelectorAll(".card-collapse-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const collapsible = btn.closest(".card-content").querySelector(".card-collapsible");
            if (!collapsible) return;
            const isCollapsed = collapsible.classList.toggle("collapsed");
            btn.classList.toggle("collapsed", isCollapsed);
            btn.title = isCollapsed ? "Expand" : "Collapse";
            // ECharts inits at 0×0 inside a collapsed card — fix sizes on expand.
            if (!isCollapsed && typeof resizeCharts === "function") resizeCharts();
        });
    });
}

// ── Active filter chips ──
// Builds a chip as real DOM nodes (rather than innerHTML + template literals)
// so that user-supplied search text and column values can never be
// interpreted as markup.
function _makeFilterChip(label, value, removeData) {
    const chip = document.createElement("span");
    chip.className = "active-filter-chip";

    const b = document.createElement("b");
    b.textContent = label + ":";
    chip.append(b, " " + value + " ");

    const remove = document.createElement("span");
    remove.className = "chip-remove";
    Object.entries(removeData).forEach(([key, val]) => { remove.dataset[key] = val; });
    remove.textContent = "×";
    chip.appendChild(remove);

    return chip;
}

function initActiveFilterChips() {
    const container = document.getElementById("activeFilterChips");
    if (!container || !tabulator) return;

    function renderChips() {
        container.innerHTML = "";
        let hasChips = false;

        for (const [field, selected] of Object.entries(columnFilters)) {
            if (!selected || selected.size === 0) continue;
            selected.forEach((val) => {
                hasChips = true;
                container.appendChild(_makeFilterChip(field, val, { field, val }));
            });
        }

        if (_globalQuery.length > 0) {
            hasChips = true;
            container.appendChild(_makeFilterChip("Search", _globalQuery.join(" + "), { type: "search" }));
        }

        if (_abstractQuery) {
            hasChips = true;
            container.appendChild(_makeFilterChip("Abstract", _abstractQuery, { type: "abstract" }));
        }

        container.style.display = hasChips ? "" : "none";
    }

    container.addEventListener("click", (e) => {
        const remove = e.target.closest(".chip-remove");
        if (!remove) return;
        const type = remove.dataset.type;
        if (type === "search") {
            globalThis._setGlobalTableSearch("");
        } else if (type === "abstract") {
            const absInput = document.getElementById("abstractSearch");
            if (absInput) absInput.value = "";
            globalThis._setAbstractQuery("");
        } else {
            const field = remove.dataset.field;
            const val = remove.dataset.val;
            if (columnFilters[field]) {
                columnFilters[field].delete(val);
                if (columnFilters[field].size === 0) delete columnFilters[field];
            }
            updateFilterBadge();
            if (tabulator) tabulator.refreshFilter();
        }
        renderChips();
    });

    tabulator.on("dataFiltered", renderChips);
    renderChips();
}

// ── Bulk BibTeX export ──
function initBulkBibtex() {
    const btn = document.getElementById("exportBibtex");
    if (!btn) return;
    btn.addEventListener("click", () => {
        if (!tabulator) return;
        const rows = tabulator.getData("active");
        const bibtexAll = rows.map((r) => r.BIBTEX || "").filter(Boolean).join("\n\n");
        if (!bibtexAll) { toast("No BibTeX entries found"); return; }
        const blob = new Blob([bibtexAll], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "articlecorpus_filtered.bib";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(`Exported ${rows.length} BibTeX entries`);
    });
}

