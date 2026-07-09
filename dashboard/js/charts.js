// ╔══════════════════════════════════════════════════════════════════════╗
// ║  UNIFIED COLOR PALETTE — single source of truth for ALL charts       ║
// ║  Any new visualization MUST reference this object — never invent     ║
// ║  ad-hoc hex codes for concepts already defined here.                 ║
// ╚══════════════════════════════════════════════════════════════════════╝
const _C = {
    DEEP_BLUE:    "#4A90D9",
    SKY_BLUE:     "#5D9CEC",
    LIGHT_BLUE:   "#4FC1E9",
    TEAL:         "#48CFAD",
    GREEN:        "#8CC152",
    LIME:         "#A0D468",
    YELLOW:       "#F5D020",
    AMBER:        "#F5B800",
    ORANGE:       "#F5A623",
    BURNT_ORANGE: "#E07B30",
    CORAL:        "#ED5565",
    DEEP_RED:     "#D0021B",
    PURPLE:       "#AC92EC",
    GRAY:         "#CCD1D9",
};

globalThis._PALETTE = {
    // ── Research trend (6 values) ──────────────────────────────────────
    trends: {
        "Unit Test Generation":             _C.DEEP_BLUE,
        "High-Level Test Gen":              _C.TEAL,
        "Oracle Derivation":                _C.ORANGE,
        "Reflections":                      _C.PURPLE,
        "Test Augmentation or Improvement": _C.GREEN,
        "Test Configuration or Execution":  _C.LIGHT_BLUE,
    },
    // ── Approach ────────────────────────────────────────────────────────
    approach: {
        "Tool/Framework": _C.SKY_BLUE,
        "Agent":          _C.PURPLE,
    },
    // ── Scope ───────────────────────────────────────────────────────────
    scope: {
        "Functional":     _C.TEAL,
        "Non-Functional": _C.AMBER,
    },
    // ── LLM interaction / prompting style ──────────────────────────────
    prompting: {
        "Pure Prompting":   _C.LIGHT_BLUE,
        "Hybrid Prompting": _C.DEEP_BLUE,
    },
    // ── Contextual / domain knowledge ──────────────────────────────────
    contextualInfo: {
        "None":        _C.GRAY,
        "Fine-Tuning": _C.CORAL,
        "RAG":         _C.ORANGE,
    },
    // ── Focus of the contribution ──────────────────────────────────────
    dimensionFocus: {
        "Code/Procedure": _C.DEEP_BLUE,
        "Data":           _C.YELLOW,
        "Optimization":   _C.GREEN,
    },
    // ── Publication type — arXiv is ALWAYS red ─────────────────────────
    pubTypes: {
        "Conference": _C.DEEP_BLUE,
        "Journal":    _C.TEAL,
        "arXiv":      _C.DEEP_RED,
        "Other":      _C.GRAY,
    },
    // ── Type of contribution ────────────────────────────────────────────
    contributions: {
        "Survey":          _C.DEEP_BLUE,
        "New Method/Tool": _C.TEAL,
        "Evaluation":      _C.ORANGE,
    },
    // Conference shades (blue family, 14) — used by the venue stacked bar
    confShades: [
        "#1F4E8C", "#2C6AAD", "#3A7BD5", _C.DEEP_BLUE, _C.SKY_BLUE,
        "#6BA8E0", "#7AB3E8", "#8ABEED", "#9BCAF2", "#ABD5F5",
        "#BAE0F8", "#C9EAFA", "#D9F3FC", "#E7F6FD",
    ],
    // Journal shades (teal/green family, 7) — used by the venue stacked bar
    jourShades: [
        "#1F8C73", "#26A687", _C.TEAL, "#35B89A", _C.GREEN, _C.LIME, "#C2E5A0",
    ],
    // ── LLM families used across the corpus ────────────────────────────
    llmFamilies: {
        "GPT-family":      _C.DEEP_BLUE,
        "Llama-family":    _C.GREEN,
        "CodeLlama":       _C.LIME,
        "DeepSeek":        _C.PURPLE,
        "DeepSeekCoder":   _C.BURNT_ORANGE,
        "Gemini":          _C.AMBER,
        "Mistral":         _C.CORAL,
        "Qwen-family":     _C.YELLOW,
        "CodeBert":        _C.LIGHT_BLUE,
        "CodeT5":          _C.SKY_BLUE,
        "Phi-family":      _C.TEAL,
        "Claude-family":   _C.ORANGE,
        "Gemma-family":    "#2C6AAD",
        "N/S":             _C.GRAY,
        "Other":           _C.GRAY,
    },
    // ── 12-colour sequence for multi-series / generic charts ───────────
    // Order is CVD-validated: no adjacent pair drops below ΔE 20 under
    // protan/deutan/tritan simulation — keep near-identical hues apart
    // (ORANGE vs AMBER/YELLOW, GREEN vs LIME, the three blues).
    sequence: [
        _C.DEEP_BLUE, _C.ORANGE, _C.TEAL, _C.CORAL, _C.LIME,
        _C.PURPLE, _C.BURNT_ORANGE, _C.LIGHT_BLUE, _C.GREEN,
        _C.AMBER, _C.SKY_BLUE, _C.YELLOW,
    ],
};

// ── Palette helpers ────────────────────────────────────────────────────
function _hexLuminance(hex) {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => {
        const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// factor >= 0 -> lighten toward white; factor < 0 -> darken (multiply channels)
function _lightenHex(hex, factor) {
    const h = hex.replace("#", "");
    return "#" + [0, 2, 4].map((i) => {
        const c = Number.parseInt(h.slice(i, i + 2), 16);
        const v = factor >= 0
            ? Math.round(c + (255 - c) * factor)
            : Math.round(c * (1 + factor));
        return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
    }).join("");
}

// Generate { bg, fg } chip pair from a palette hex colour.
// bg = 90%-toward-white tint; fg = the colour itself (or 50%-darkened if too bright).
function _chipColor(hex) {
    const bg = _lightenHex(hex, 0.9);
    const fg = _hexLuminance(hex) > 0.18 ? _lightenHex(hex, -0.5) : hex;
    return { bg, fg };
}

// Hex to rgba helper
function hexAlpha(hex, a) {
    const h = hex.replace("#", "");
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function generateColors(count) {
    const seq = globalThis._PALETTE?.sequence || [];
    if (count <= seq.length) return seq.slice(0, count);
    // Extend beyond palette length by lightening cycling colours
    return Array.from({ length: count }, (_, i) =>
        i < seq.length ? seq[i] : _lightenHex(seq[i % seq.length], 0.3)
    );
}

// ── Responsive tiers ───────────────────────────────────────────────────
// Matches the CSS breakpoints in styles.css (992/768/600px) so JS-side chart
// options and CSS-side container widths never disagree: sm = phone (≤600px),
// md = tablet (601-992px), lg = desktop (>992px).
function _screenTier() {
    const w = window.innerWidth;
    if (w <= 600) return "sm";
    if (w <= 992) return "md";
    return "lg";
}

// Legend layout for the charts with the largest legends (renderVenueChart,
// renderLineChart, renderLLMHeatmap): vertical/right-docked on desktop (room
// for many long names), horizontal/scrollable/bottom-docked when compact
// (a vertical legend would otherwise eat 50%+ of a narrow canvas width).
// `type:"scroll"` auto-paginates regardless of series count either way.
function _responsiveLegend(itemSize, fontSize) {
    if (_screenTier() === "lg") {
        return { type: "scroll", orient: "vertical", right: 0, top: "middle", itemWidth: itemSize, itemHeight: itemSize, textStyle: { fontSize } };
    }
    return { type: "scroll", orient: "horizontal", bottom: 0, left: "center", itemWidth: Math.max(8, itemSize - 2), itemHeight: Math.max(8, itemSize - 2), textStyle: { fontSize: Math.max(8, fontSize - 2) } };
}

// ── Chart instances (Apache ECharts) ──────────────────────────────────
// All charts mount on <div class="chart-host"> elements. _initChart is the ONLY
// place echarts.init is called: it disposes any previous instance first (ECharts
// throws a warning and leaks listeners when init-ing over a live instance).
const chartInstances = {};

function _initChart(cid) {
    const el = document.getElementById(cid);
    if (!el) return null;
    if (chartInstances[cid]) {
        chartInstances[cid].dispose();
        delete chartInstances[cid];
    }
    const dark = document.body.classList.contains("dark-mode");
    const chart = echarts.init(el, dark ? "slr-dark" : "slr-light");
    chartInstances[cid] = chart;
    return chart;
}

function destroyChart(cid) {
    if (chartInstances[cid]) {
        chartInstances[cid].dispose();
        delete chartInstances[cid];
    }
}

function resizeCharts() {
    Object.values(chartInstances).forEach((c) => c.resize());
}

let _resizeTimer = null;
let _lastTier = _screenTier();
window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
        const tier = _screenTier();
        if (tier !== _lastTier) {
            _lastTier = tier;
            // Legend/label/layout choices are tier-dependent (see render*
            // functions below), so crossing a breakpoint needs every chart's
            // option recomputed, not just rescaled — reuse the same
            // full-rebuild path the dark-mode toggle already uses.
            if (typeof globalThis._rerenderAllCharts === "function") {
                globalThis._rerenderAllCharts();
                return;
            }
        }
        resizeCharts();
    }, 150);
});

// ── Theme ──────────────────────────────────────────────────────────────
function getChartTheme() {
    const dark = document.body.classList.contains("dark-mode");
    return {
        dark,
        text:       dark ? "#d0d0d0" : "#444",
        muted:      dark ? "#888"    : "#999",
        grid:       dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
        divider:    dark ? "rgba(255,255,255,0.18)" : "#CBD5E1",
        cellBorder: dark ? "#2a2a2a" : "#fff",
    };
}

// Brand teal (--brand-primary / --brand-dark-text in styles.css), as a literal
// hex since ECharts/inline-style consumers can't read CSS custom properties.
function brandTeal(dark) {
    return dark ? "#4db6ac" : "#00796b";
}

// Same font stack as the page body (styles.css) so charts and UI match.
const _FONT_STACK = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function buildEchartsTheme(dark) {
    const text  = dark ? "#d0d0d0" : "#444";
    const muted = dark ? "#888"    : "#999";
    const grid  = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
    const axis = {
        axisLine:      { lineStyle: { color: muted } },
        axisTick:      { lineStyle: { color: muted } },
        // 13px matches renderCrossHeatmap's y-axis labels — the reference
        // size for chart text at md/lg tiers. Charts that don't set their own
        // axisLabel.fontSize (renderLLMHeatmap, renderLineChart,
        // renderStackedAreaChart, renderVenueChart) inherit this uniformly.
        axisLabel:     { color: text, fontSize: 13 },
        nameTextStyle: { color: text },
        splitLine:     { lineStyle: { color: grid } },
    };
    return {
        color: globalThis._PALETTE?.sequence || [],
        textStyle: { color: text, fontFamily: _FONT_STACK },
        title:  { textStyle: { color: text, fontFamily: _FONT_STACK } },
        legend: {
            textStyle: { color: text, fontSize: 12, fontFamily: _FONT_STACK },
            // Scroll-legend paginator arrows: brand teal instead of ECharts'
            // default dark blue-gray, so they match the rest of the palette.
            pageIconColor: brandTeal(dark),
            pageIconInactiveColor: dark ? "rgba(77,182,172,0.35)" : "rgba(0,121,107,0.35)",
            pageTextStyle: { color: text },
        },
        tooltip: { textStyle: { fontFamily: _FONT_STACK } },
        categoryAxis: axis,
        valueAxis: axis,
        animationDuration: 400,
        animationDurationUpdate: 300,
    };
}
echarts.registerTheme("slr-light", buildEchartsTheme(false));
echarts.registerTheme("slr-dark",  buildEchartsTheme(true));

// ── Cross-linking: scroll to table and apply a global search filter ──
// `value` may be a single term or an array of terms (AND-ed by the table filter,
// e.g. a heatmap cell's row × column combination).
function chartClickFilter(field, value) {
    const tableSection = document.getElementById("section-table");
    if (tableSection) tableSection.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof globalThis._setGlobalTableSearch === "function") {
        globalThis._setGlobalTableSearch(value);
    }
}

// ── Bar chart (horizontal, one bar per label) ──
function renderBarChart(cid, labels, data, label, colorMap) {
    const chart = _initChart(cid);
    if (!chart) return;
    const n = labels.length;
    const colors = generateColors(n);
    chart.setOption({
        grid: { left: 8, right: 40, top: 24, bottom: 34, containLabel: true },
        tooltip: { trigger: "item", formatter: (p) => `${p.name}: ${p.value} paper${p.value === 1 ? "" : "s"}` },
        xAxis: { type: "value", name: "No. Articles", nameLocation: "middle", nameGap: 26, minInterval: 1 },
        yAxis: { type: "category", data: [...labels].reverse() },
        series: [{
            type: "bar",
            barMaxWidth: 22,
            data: [...data].reverse().map((v, i) => {
                const name = labels[n - 1 - i];
                const color = colorMap?.[name] || colors[n - 1 - i];
                return { value: v, itemStyle: { color, borderRadius: [0, 3, 3, 0] } };
            }),
            label: { show: true, position: "right", fontSize: 10 },
        }],
    });
    chart.on("click", (p) => chartClickFilter(label, p.name));
}

// ── LLM usage timeline (stacked bar per family) ──
function renderLLMHeatmap(cid, years, llms, counts) {
    const compact = _screenTier() !== "lg";
    const chart = _initChart(cid);
    if (!chart) return;
    const fallback = generateColors(llms.length);
    const colors = llms.map((l, i) => globalThis._PALETTE?.llmFamilies?.[l] || fallback[i]);
    chart.setOption({
        grid: { left: 8, right: compact ? 12 : 150, top: 30, bottom: compact ? 84 : 30, containLabel: true },
        legend: _responsiveLegend(12, 10),
        tooltip: { trigger: "item" },
        xAxis: { type: "category", data: years, name: "Year", nameLocation: "middle", nameGap: 28 },
        yAxis: { type: "value", name: "No. Papers", minInterval: 1 },
        series: llms.map((llm, i) => ({
            name: llm, type: "bar", stack: "llm",
            data: years.map((y) => counts[llm]?.[y] || 0),
            itemStyle: { color: colors[i], borderColor: "#fff", borderWidth: 0.5 },
            emphasis: { focus: "series" },
        })),
    });
}

// ── Line chart — series = [{ name, data, color }] ──
function renderLineChart(cid, labels, series) {
    const compact = _screenTier() !== "lg";
    const chart = _initChart(cid);
    if (!chart) return;
    chart.setOption({
        grid: { left: 8, right: compact ? 12 : 175, top: 30, bottom: compact ? 84 : 30, containLabel: true },
        legend: _responsiveLegend(14, 13),
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: labels, name: "Year", nameLocation: "middle", nameGap: 28, boundaryGap: false },
        yAxis: { type: "value", name: "No. Articles", minInterval: 1 },
        series: series.map((s) => ({
            name: s.name, type: "line", smooth: 0.3, symbolSize: 6,
            data: s.data,
            itemStyle: { color: s.color },
            lineStyle: { color: s.color, width: 2.2 },
            emphasis: { focus: "series" },
        })),
    });
    // Clicking a point filters the table to that series (e.g. trend) AND that
    // x value (e.g. year) — terms are AND-ed by _setGlobalTableSearch.
    chart.on("click", (p) => chartClickFilter("", [p.seriesName, labels[p.dataIndex]]));
}

// ── Stacked area chart — series = [{ name, data, color }] ──
function renderStackedAreaChart(cid, labels, series, yLabel) {
    const chart = _initChart(cid);
    if (!chart) return;
    chart.setOption({
        grid: { left: 8, right: 24, top: 44, bottom: 30, containLabel: true },
        legend: { top: 0, type: "scroll", itemWidth: 14, textStyle: { fontSize: 13 } },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: labels, name: "Year", nameLocation: "middle", nameGap: 28, boundaryGap: false },
        yAxis: { type: "value", name: yLabel || "No. Articles", minInterval: 1 },
        series: series.map((s) => ({
            name: s.name, type: "line", stack: "total", smooth: 0.3, symbolSize: 5,
            data: s.data,
            itemStyle: { color: s.color },
            lineStyle: { color: s.color, width: 1.6 },
            areaStyle: { color: s.color, opacity: 0.35 },
            emphasis: { focus: "series" },
        })),
    });
}

// ── Donut/pie panel(s) — panels = [{ title, labels, values, colors? }] ──
function renderMultiDonut(cid, panels) {
    const compact = _screenTier() !== "lg" && panels.length > 1;
    const host = document.getElementById(cid);
    // Stack panels vertically with a generously tall container instead of the
    // default side-by-side layout — ECharts pie radius % is always relative to
    // min(containerWidth, containerHeight) of the WHOLE canvas, so side-by-side
    // (or naively restacked) percentage centers can't give each panel an
    // independent, non-overlapping box. Pixel-based sizing below (computed
    // after init, once real dimensions are known) sidesteps that entirely.
    if (compact && host?.parentElement) {
        host.parentElement.style.height = (panels.length * 220) + "px";
    }
    const chart = _initChart(cid);
    if (!chart) return;
    const titleColor = brandTeal(getChartTheme().dark);

    let centers, radiusFor, titleTop, titleLeft;
    if (compact) {
        const w = chart.getWidth();
        const perPanelH = chart.getHeight() / panels.length;
        const contentH = perPanelH * 0.8;
        const outerR = Math.min(w, contentH) / 2 * 0.85;
        centers = panels.map((_, i) => ["50%", i * perPanelH + perPanelH * 0.58]);
        radiusFor = () => [outerR * 0.6, outerR];
        titleTop = (i) => i * perPanelH + 16;
        titleLeft = () => "center";
    } else {
        const centersFor = { 1: ["50%"], 2: ["27%", "73%"], 3: ["17%", "50%", "83%"] };
        const xCenters = centersFor[panels.length] || centersFor[3];
        centers = xCenters.map((x) => [x, "55%"]);
        radiusFor = () => ["34%", "56%"];
        titleTop = () => 32;
        titleLeft = (i) => xCenters[i];
    }

    chart.setOption({
        title: panels.map((p, i) => ({
            text: p.title, left: titleLeft(i), top: titleTop(i), textAlign: "center",
            // Smaller than "Additional Insights" (.card-title-sm, ~16-20.8px)
            // and in the same brand teal rather than the theme's near-black
            // default title color.
            textStyle: { fontSize: 15, fontWeight: "bold", color: titleColor },
        })),
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        series: panels.map((p, i) => {
            const manySlices = compact && p.labels.length > 8;
            return {
                type: "pie",
                radius: radiusFor(i),
                center: centers[i],
                data: p.labels.map((l, j) => ({
                    name: l, value: p.values[j],
                    itemStyle: p.colors?.[j] ? { color: p.colors[j] } : undefined,
                })),
                label: manySlices ? { show: false } : { fontSize: 12, formatter: "{b}\n{c}" },
                labelLine: manySlices ? { show: false } : { length: 10, length2: 6 },
                itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
                percentPrecision: 1,
            };
        }),
    });
    chart.on("click", (p) => chartClickFilter("", p.name));
}

// ── Venue stacked bar (year × venue) — series = [{ name, data, color }] ──
function renderVenueChart(cid, years, series) {
    const compact = _screenTier() !== "lg";
    const chart = _initChart(cid);
    if (!chart) return;
    const totals = years.map((_, i) => series.reduce((s, d) => s + (d.data[i] || 0), 0));
    chart.setOption({
        grid: { left: 8, right: compact ? 12 : 175, top: 30, bottom: compact ? 84 : 8, containLabel: true },
        legend: { ..._responsiveLegend(14, 13), data: series.map((s) => s.name) },
        tooltip: { trigger: "item" },
        xAxis: { type: "category", data: years },
        yAxis: { type: "value", name: "No. Articles", minInterval: 1 },
        series: [
            ...series.map((s) => ({
                name: s.name, type: "bar", stack: "v",
                data: s.data,
                itemStyle: { color: s.color, borderColor: "#fff", borderWidth: 0.6 },
                emphasis: { focus: "series" },
            })),
            { // invisible stack-topper that carries the per-year total labels
                type: "bar", stack: "v", silent: true,
                tooltip: { show: false },
                itemStyle: { color: "transparent" },
                data: totals.map((t) => ({
                    value: 0,
                    label: { show: t > 0, position: "top", formatter: String(t), fontWeight: "bold", fontSize: 12 },
                })),
            },
        ],
    });
    // Clicking a venue's segment filters the table to that venue AND year
    // (AND-ed by _setGlobalTableSearch, same pattern as every other chart).
    // The invisible total-label series is silent:true, so it never fires here.
    chart.on("click", (p) => chartClickFilter("", [p.seriesName, years[p.dataIndex]]));
}

// ── Generic cross-tab heatmap ──
// opts: { xTitle, yTitle, paletteHex, clickTerms }.
// `paletteHex` MUST be a colour from _PALETTE (Color Consistency Rule); the cell
// ramp goes from a near-white tint of it to a slightly darkened version.
// `clickTerms(row, col)` maps a clicked cell's displayed labels to the search
// terms used for table filtering (needed when the axis shows shortened labels).
function renderCrossHeatmap(cid, rowLabels, colLabels, counts, opts) {
    const { xTitle, yTitle, paletteHex, clickTerms } = opts || {};
    const compact = _screenTier() !== "lg";
    // On phones, cap displayed rows lower — rows arrive pre-sorted by
    // frequency (see _crossHeatmap), so slicing further here keeps "most
    // important first" while keeping the chart from towering at a fixed
    // per-row pixel height.
    const shownRows = compact && rowLabels.length > 10 ? rowLabels.slice(0, 10) : rowLabels;
    // Adapt the container height to the row count (the fixed CSS height would
    // squash an 18-row heatmap and stretch a 2-row one). Must happen BEFORE
    // _initChart so ECharts inits at the final size; renderInsightsChart
    // resets the inline height when another chart type is selected.
    const host = document.getElementById(cid);
    if (host?.parentElement) {
        const perRow = compact ? 26 : 34;
        const chrome = compact ? 90 : 130;
        const px = Math.max(260, shownRows.length * perRow + chrome);
        host.parentElement.style.height = px + "px";
    }
    const chart = _initChart(cid);
    if (!chart) return;
    const t = getChartTheme();
    const hex = paletteHex || _C.DEEP_BLUE;
    const rampLow  = t.dark ? _lightenHex(hex, -0.75) : _lightenHex(hex, 0.92);
    const rampHigh = _lightenHex(hex, -0.2);
    const rows = [...shownRows].reverse(); // biggest row at top
    const cells = [];
    let maxVal = 1;
    rows.forEach((row, ri) => colLabels.forEach((col, ci) => {
        const v = counts(row, col);
        if (v > maxVal) maxVal = v;
        cells.push([ci, ri, v]);
    }));
    const data = cells.map(([ci, ri, v]) => ({
        value: [ci, ri, v],
        label: { color: v > maxVal * 0.55 ? "#fff" : t.text },
    }));
    chart.setOption({
        grid: { left: 8, right: 24, top: 10, bottom: 58, containLabel: true },
        tooltip: {
            formatter: (p) => `${rows[p.value[1]]}  ×  ${colLabels[p.value[0]]}<br>${p.value[2]} paper${p.value[2] === 1 ? "" : "s"}`,
        },
        xAxis: {
            type: "category", data: colLabels,
            // Extra room between the (rotated) tick labels and the axis
            // title below them, especially now the tick labels are bigger.
            name: xTitle, nameLocation: "middle", nameGap: 58,
            // Font size matches .coauthor-table's 0.82rem (~13px at the
            // default root size) so text reads consistently across charts.
            axisLabel: { fontSize: compact ? 11 : 13, rotate: compact ? 40 : 30, interval: 0 }, splitLine: { show: false },
        },
        yAxis: { type: "category", data: rows, name: yTitle, axisLabel: { fontSize: 13 }, splitLine: { show: false } },
        visualMap: {
            show: false, min: 0, max: maxVal,
            inRange: { color: [rampLow, rampHigh] },
        },
        series: [{
            type: "heatmap", data,
            itemStyle: { borderColor: t.cellBorder, borderWidth: 2 },
            label: { show: true, fontSize: 12, formatter: (p) => (p.value[2] > 0 ? p.value[2] : "") },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
        }],
    });
    // Clicking a non-empty cell filters the table to papers matching BOTH the
    // row and the column value (terms are AND-ed by _setGlobalTableSearch).
    chart.on("click", (p) => {
        if (!p.value[2]) return;
        const row = rows[p.value[1]];
        const col = colLabels[p.value[0]];
        chartClickFilter("", clickTerms ? clickTerms(row, col) : [row, col]);
    });
}

// ── Sankey flow — links = [{ from, to, flow }], prefixed node ids ──
function renderSankeyChart(cid, links, nodeColors, nodeLabels, dimHeaders) {
    // 6 stages in a narrow phone canvas is inherently too dense to compress
    // losslessly — shrink gutters/labels somewhat, but the primary fix is
    // letting the chart render at a legible fixed width and scroll
    // horizontally (.chart-scroll-x, styles.css), so treat this as "readable
    // via scroll + tooltip," not "every label visible unscrolled." The class
    // must be set BEFORE _initChart so ECharts measures the final width;
    // renderInsightsChart (data.js) removes it when another chart is picked.
    const compact = _screenTier() !== "lg";
    const rightGutter = compact ? 24 : 96;
    document.getElementById(cid)?.parentElement?.classList.toggle("chart-scroll-x", compact);
    const chart = _initChart(cid);
    if (!chart) return;
    const t = getChartTheme();
    const stageTitleColor = brandTeal(t.dark); // same brand teal as the donut panel titles
    const headers = dimHeaders || [];
    const D = headers.length;
    const headerGraphics = headers.map((lines, i) => {
        const pos = {};
        if (D <= 1 || i === 0) pos.left = 14;
        else if (i === D - 1) pos.right = rightGutter;
        else pos.left = `${(i / (D - 1)) * (compact ? 78 : 86)}%`;
        return {
            type: "text", ...pos, top: 8,
            style: { text: lines.join(" "), fontSize: compact ? 10 : 13, fontWeight: "bold", fill: stageTitleColor },
        };
    });
    chart.setOption({
        graphic: headerGraphics,
        tooltip: {
            formatter: (p) => {
                if (p.dataType !== "edge") return nodeLabels[p.name] || p.name;
                const plural = p.data.value === 1 ? "" : "s";
                return `${nodeLabels[p.data.source] || p.data.source} → ${nodeLabels[p.data.target] || p.data.target}: ${p.data.value} paper${plural}`;
            },
        },
        series: [{
            type: "sankey",
            top: 36, left: 14, right: rightGutter, bottom: 12,
            nodeAlign: "justify", nodeGap: compact ? 8 : 14, nodeWidth: compact ? 12 : 18,
            data: Object.keys(nodeLabels).map((id) => ({ name: id, itemStyle: { color: nodeColors[id] || _C.GRAY } })),
            links: links.map((l) => ({ source: l.from, target: l.to, value: l.flow })),
            label: { formatter: (p) => nodeLabels[p.name] || p.name, fontSize: compact ? 9 : 13, color: t.text },
            lineStyle: { color: "gradient", opacity: 0.5, curveness: 0.5 },
            emphasis: { focus: "adjacency" },
        }],
    });
}

// ── Bubble overview (trends × classification dimensions) ──
function renderBubbleChart(cid, bubbleData) {
    const compact = _screenTier() !== "lg";
    const chart = _initChart(cid);
    if (!chart) return;
    // A fixed marker/font size looks increasingly small and empty on very
    // wide (ultrawide-monitor) containers — scale modestly past ~1400px of
    // actual rendered width (checked after init, not by screen tier, since
    // "lg" already spans everything above 992px).
    const big = !compact && chart.getWidth() > 1400;
    const t = getChartTheme();
    const { datasets, xSlots, xGroups, yLabels, yLabelsShort, yLabelsWrapped, maxX } = bubbleData;
    const solidColor = (rgba) => (rgba.startsWith("rgba") ? rgba.slice(0, rgba.lastIndexOf(",") + 1) + "1)" : rgba);
    let groupLabelFontSize = 15;
    if (compact) groupLabelFontSize = 12;
    else if (big) groupLabelFontSize = 18;

    // Category axes give deterministic ticks at every slot position (a value
    // axis can't be forced to tick exactly on the integer slot grid). Gap
    // positions between dimension groups become empty-label categories.
    const xData = Array.from({ length: maxX + 1 }, (_, i) =>
        xSlots.find((s) => s.pos === i)?.label || "");
    // Display-only line breaks for the longest x-axis values — xData itself
    // (used below by the tooltip and the click-filter handler) MUST stay the
    // real, unwrapped CSV value or search matching would break.
    const _XVAL_WRAP_BUBBLE = {
        "Tool/Framework": "Tool/\nFramework",
        "Pure Prompting": "Pure\nPrompting",
        "Hybrid Prompting": "Hybrid\nPrompting",
        "Code/Procedure": "Code/\nProcedure",
    };
    const xDataWrapped = xData.map((v) => _XVAL_WRAP_BUBBLE[v] || v);

    const markAreaData = (xGroups || []).map((g) => ([
        {
            xAxis: g.startPos,
            itemStyle: { color: g.band },
            label: {
                show: true, position: "top", fontWeight: "bold", color: solidColor(g.color),
                formatter: compact ? (g.shortLabel || g.label) : g.label,
                fontSize: groupLabelFontSize,
            },
        },
        { xAxis: g.endPos },
    ]));
    // Dashed divider centred on the gap category between consecutive groups
    const markLineData = [];
    for (let i = 0; i < (xGroups || []).length - 1; i++) {
        markLineData.push({ xAxis: xGroups[i].endPos + 1 });
    }

    chart.setOption({
        grid: { left: 8, right: 20, top: 34, bottom: 8, containLabel: true },
        tooltip: { formatter: (p) => `${yLabels[p.value[1]]}: ${xData[p.value[0]]} (${p.value[2]} articles)` },
        xAxis: {
            // xDataWrapped line-breaks the known-long values for display at
            // every tier; xData (used above by the tooltip, and below by the
            // click handler) stays the real, unwrapped value.
            type: "category", data: xDataWrapped,
            axisLabel: compact
                ? { fontSize: 13, rotate: 60, interval: "auto" }
                : { fontSize: big ? 15 : 13, rotate: 50, interval: 0 },
            axisTick: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            // Tick labels abbreviate on phones (yLabelsShort) and line-wrap on
            // large screens (yLabelsWrapped, plenty of row height to spare);
            // tooltip/click-filter below still resolve against plain yLabels.
            type: "category",
            data: compact ? (yLabelsShort || yLabels) : (yLabelsWrapped || yLabels),
            axisLabel: { fontSize: big ? 16 : 13, lineHeight: big ? 18 : 15 },
            splitLine: { lineStyle: { color: t.grid, width: 0.8 } },
        },
        series: datasets.map((ds, di) => ({
            name: ds.label,
            type: "scatter",
            data: ds.data.map((p) => [p.x, p.y, p.count]),
            symbolSize: (d) => {
                const pt = ds.data.find((p) => p.x === d[0] && p.y === d[1]);
                return (pt?.r || 4) * (big ? 2.6 : 2);
            },
            itemStyle: { color: ds.backgroundColor, borderColor: "#fff", borderWidth: 1.5 },
            label: {
                show: true, position: "inside", color: "#fff", fontSize: big ? 14 : 12, fontWeight: "bold",
                formatter: (p) => {
                    const pt = ds.data.find((q) => q.x === p.value[0] && q.y === p.value[1]);
                    return (pt?.r || 0) >= 10 ? String(p.value[2]) : "";
                },
            },
            // bands + dividers + group headers ride on the first series only
            ...(di === 0 ? {
                markArea: { silent: true, data: markAreaData },
                markLine: {
                    silent: true, symbol: "none",
                    lineStyle: { type: "dashed", color: t.divider, width: 1 },
                    label: { show: false },
                    data: markLineData,
                },
            } : {}),
        })),
    });
    // Clicking a bubble filters the table to that trend AND dimension value
    // (AND-ed by _setGlobalTableSearch, same pattern as every other chart).
    chart.on("click", (p) => {
        const val = xData[p.value[0]];
        const trend = yLabels[p.value[1]];
        if (!val || !trend) return;
        chartClickFilter("", [trend, val]);
    });
}

// ── Sparklines (plain canvas 2D, not ECharts — too small to warrant it) ──
function renderSparklines(data) {
    const years = {};
    data.forEach((r) => { if (r.YEAR) years[r.YEAR] = (years[r.YEAR] || 0) + 1; });
    const sorted = Object.entries(years).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length < 2) return;

    const vals = sorted.map(([, c]) => c);
    const max = Math.max(...vals);

    function drawSparkline(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = _C.DEEP_BLUE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        vals.forEach((v, i) => {
            const x = (i / (vals.length - 1)) * w;
            const y = h - (v / max) * (h - 4) - 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const maxIdx = vals.indexOf(max);
        const mx = (maxIdx / (vals.length - 1)) * w;
        const my = h - (h - 4) - 2;
        ctx.fillStyle = _C.BURNT_ORANGE;
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSparkline("spark-avg-year");
    drawSparkline("spark-peak-year");
}
