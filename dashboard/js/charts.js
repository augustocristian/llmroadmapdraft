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
globalThis.resizeCharts = resizeCharts;

let _resizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(resizeCharts, 150);
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

// Same font stack as the page body (styles.css) so charts and UI match.
const _FONT_STACK = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function buildEchartsTheme(dark) {
    const text  = dark ? "#d0d0d0" : "#444";
    const muted = dark ? "#888"    : "#999";
    const grid  = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
    const axis = {
        axisLine:      { lineStyle: { color: muted } },
        axisTick:      { lineStyle: { color: muted } },
        axisLabel:     { color: text },
        nameTextStyle: { color: text },
        splitLine:     { lineStyle: { color: grid } },
    };
    return {
        color: globalThis._PALETTE?.sequence || [],
        textStyle: { color: text, fontFamily: _FONT_STACK },
        title:  { textStyle: { color: text, fontFamily: _FONT_STACK } },
        legend: { textStyle: { color: text, fontSize: 11, fontFamily: _FONT_STACK } },
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
        yAxis: { type: "category", data: [...labels].reverse(), axisLabel: { fontSize: 11 } },
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
    const chart = _initChart(cid);
    if (!chart) return;
    const fallback = generateColors(llms.length);
    const colors = llms.map((l, i) => globalThis._PALETTE?.llmFamilies?.[l] || fallback[i]);
    chart.setOption({
        grid: { left: 8, right: 150, top: 16, bottom: 30, containLabel: true },
        legend: { type: "scroll", orient: "vertical", right: 0, top: "middle", itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 10 } },
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
    const chart = _initChart(cid);
    if (!chart) return;
    chart.setOption({
        grid: { left: 8, right: 175, top: 16, bottom: 30, containLabel: true },
        legend: { type: "scroll", orient: "vertical", right: 0, top: "middle", itemWidth: 14, textStyle: { fontSize: 11 } },
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
        legend: { top: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
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
    const chart = _initChart(cid);
    if (!chart) return;
    const centersFor = { 1: ["50%"], 2: ["27%", "73%"], 3: ["17%", "50%", "83%"] };
    const centers = centersFor[panels.length] || centersFor[3];
    chart.setOption({
        title: panels.map((p, i) => ({
            text: p.title, left: centers[i], top: 22, textAlign: "center",
            textStyle: { fontSize: 14, fontWeight: "bold" },
        })),
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        series: panels.map((p, i) => ({
            type: "pie",
            radius: ["34%", "56%"],
            center: [centers[i], "55%"],
            data: p.labels.map((l, j) => ({
                name: l, value: p.values[j],
                itemStyle: p.colors?.[j] ? { color: p.colors[j] } : undefined,
            })),
            label: { fontSize: 10, formatter: "{b}\n{c}" },
            labelLine: { length: 10, length2: 6 },
            itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
            percentPrecision: 1,
        })),
    });
    chart.on("click", (p) => chartClickFilter("", p.name));
}

// ── Venue stacked bar (year × venue) — series = [{ name, data, color }] ──
function renderVenueChart(cid, years, series) {
    const chart = _initChart(cid);
    if (!chart) return;
    const totals = years.map((_, i) => series.reduce((s, d) => s + (d.data[i] || 0), 0));
    chart.setOption({
        grid: { left: 8, right: 160, top: 24, bottom: 8, containLabel: true },
        legend: {
            type: "scroll", orient: "vertical", right: 0, top: "middle",
            data: series.map((s) => s.name),
            itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 10 },
        },
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
                    label: { show: t > 0, position: "top", formatter: String(t), fontWeight: "bold", fontSize: 11 },
                })),
            },
        ],
    });
}

// ── Generic cross-tab heatmap ──
// opts: { xTitle, yTitle, paletteHex, clickTerms }.
// `paletteHex` MUST be a colour from _PALETTE (Color Consistency Rule); the cell
// ramp goes from a near-white tint of it to a slightly darkened version.
// `clickTerms(row, col)` maps a clicked cell's displayed labels to the search
// terms used for table filtering (needed when the axis shows shortened labels).
function renderCrossHeatmap(cid, rowLabels, colLabels, counts, opts) {
    const { xTitle, yTitle, paletteHex, clickTerms } = opts || {};
    // Adapt the container height to the row count (the fixed CSS height would
    // squash an 18-row heatmap and stretch a 2-row one). Must happen BEFORE
    // _initChart so ECharts inits at the final size; renderInsightsChart
    // resets the inline height when another chart type is selected.
    const host = document.getElementById(cid);
    if (host?.parentElement) {
        const px = Math.max(260, rowLabels.length * 30 + 130); // 30px/row + axis chrome
        host.parentElement.style.height = px + "px";
    }
    const chart = _initChart(cid);
    if (!chart) return;
    const t = getChartTheme();
    const hex = paletteHex || _C.DEEP_BLUE;
    const rampLow  = t.dark ? _lightenHex(hex, -0.75) : _lightenHex(hex, 0.92);
    const rampHigh = _lightenHex(hex, -0.2);
    const rows = [...rowLabels].reverse(); // biggest row at top
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
        grid: { left: 8, right: 24, top: 10, bottom: 44, containLabel: true },
        tooltip: {
            formatter: (p) => `${rows[p.value[1]]}  ×  ${colLabels[p.value[0]]}<br>${p.value[2]} paper${p.value[2] === 1 ? "" : "s"}`,
        },
        xAxis: {
            type: "category", data: colLabels,
            name: xTitle, nameLocation: "middle", nameGap: 44,
            axisLabel: { fontSize: 10, rotate: 30, interval: 0 }, splitLine: { show: false },
        },
        yAxis: { type: "category", data: rows, name: yTitle, axisLabel: { fontSize: 10 }, splitLine: { show: false } },
        visualMap: {
            show: false, min: 0, max: maxVal,
            inRange: { color: [rampLow, rampHigh] },
        },
        series: [{
            type: "heatmap", data,
            itemStyle: { borderColor: t.cellBorder, borderWidth: 2 },
            label: { show: true, fontSize: 9, formatter: (p) => (p.value[2] > 0 ? p.value[2] : "") },
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
    const chart = _initChart(cid);
    if (!chart) return;
    const t = getChartTheme();
    const headers = dimHeaders || [];
    const D = headers.length;
    const headerGraphics = headers.map((lines, i) => {
        const pos = {};
        if (D <= 1 || i === 0) pos.left = 14;
        else if (i === D - 1) pos.right = 96;
        else pos.left = `${(i / (D - 1)) * 86}%`;
        return {
            type: "text", ...pos, top: 8,
            style: { text: lines.join(" "), fontSize: 13, fontWeight: "bold", fill: t.text },
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
            top: 36, left: 14, right: 96, bottom: 12,
            nodeAlign: "justify", nodeGap: 14, nodeWidth: 18,
            data: Object.keys(nodeLabels).map((id) => ({ name: id, itemStyle: { color: nodeColors[id] || _C.GRAY } })),
            links: links.map((l) => ({ source: l.from, target: l.to, value: l.flow })),
            label: { formatter: (p) => nodeLabels[p.name] || p.name, fontSize: 12, color: t.text },
            lineStyle: { color: "gradient", opacity: 0.5, curveness: 0.5 },
            emphasis: { focus: "adjacency" },
        }],
    });
}

// ── Bubble overview (trends × classification dimensions) ──
function renderBubbleChart(cid, bubbleData) {
    const chart = _initChart(cid);
    if (!chart) return;
    const t = getChartTheme();
    const { datasets, xSlots, xGroups, yLabels, maxX } = bubbleData;
    const solidColor = (rgba) => rgba.startsWith("rgba") ? rgba.replace(/[\d.]+\)$/, "1)") : rgba;

    // Category axes give deterministic ticks at every slot position (a value
    // axis can't be forced to tick exactly on the integer slot grid). Gap
    // positions between dimension groups become empty-label categories.
    const xData = Array.from({ length: maxX + 1 }, (_, i) =>
        xSlots.find((s) => s.pos === i)?.label || "");

    const markAreaData = (xGroups || []).map((g) => ([
        {
            xAxis: g.startPos,
            itemStyle: { color: g.band },
            label: { show: true, position: "top", formatter: g.label, fontWeight: "bold", fontSize: 12, color: solidColor(g.color) },
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
            type: "category", data: xData,
            axisLabel: { fontSize: 10, rotate: 50, interval: 0 },
            axisTick: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            type: "category", data: yLabels,
            axisLabel: { fontSize: 11 },
            splitLine: { lineStyle: { color: t.grid, width: 0.8 } },
        },
        series: datasets.map((ds, di) => ({
            name: ds.label,
            type: "scatter",
            data: ds.data.map((p) => [p.x, p.y, p.count]),
            symbolSize: (d) => {
                const pt = ds.data.find((p) => p.x === d[0] && p.y === d[1]);
                return (pt?.r || 4) * 2;
            },
            itemStyle: { color: ds.backgroundColor, borderColor: "#fff", borderWidth: 1.5 },
            label: {
                show: true, position: "inside", color: "#fff", fontSize: 10, fontWeight: "bold",
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
}
