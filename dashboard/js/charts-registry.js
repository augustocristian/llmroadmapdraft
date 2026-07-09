// ╔══════════════════════════════════════════════════════════════════════╗
// ║  CHART REGISTRY — single source of truth for every "Additional        ║
// ║  Insight" chart. Each entry declares its dropdown label, group, render║
// ║  kind (canvas vs html), and a render(cid, data, ctx) recipe.          ║
// ║                                                                        ║
// ║  Load order: AFTER charts.js (needs the render primitives + _PALETTE), ║
// ║  BEFORE data.js (whose renderInsightsChart dispatcher reads this) and  ║
// ║  main.js (whose buildChartSelect() call populates the <select>).       ║
// ║                                                                        ║
// ║  RULE: any chart/chip for TREND, APPROACH, SCOPE, LLM ITERACTION,      ║
// ║  CONTEXTUAL INFO, FOCUS, PUBLICATION TYPE or TYPE OF CONTRIBUTION must  ║
// ║  resolve its color via _PALETTE.<key>[value] (arXiv is always         ║
// ║  _C.DEEP_RED) — never invent ad-hoc hex codes for these dimensions.     ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Shared value orders (derived from _PALETTE so the registry and the
//    palette can never drift apart) ────────────────────────────────────
const TREND_ORDER = Object.keys(globalThis._PALETTE?.trends || {});
const TREND_SHORT_MAP = {
    "Unit Test Generation":             "Unit Test Gen",
    "High-Level Test Gen":              "HL Test Gen",
    "Oracle Derivation":                "Oracle Deriv.",
    "Reflections":                      "Reflections",
    "Test Augmentation or Improvement": "Test Aug.",
    "Test Configuration or Execution":  "Test Config./Exec.",
};
const TREND_SHORT = TREND_ORDER.map((t) => TREND_SHORT_MAP[t] || t);
const APPROACH_VALS = Object.keys(globalThis._PALETTE?.approach || {});
const SCOPE_VALS = Object.keys(globalThis._PALETTE?.scope || {});
const PROMPTING_VALS = Object.keys(globalThis._PALETTE?.prompting || {});
const CONTEXTUAL_VALS = Object.keys(globalThis._PALETTE?.contextualInfo || {});
const FOCUS_VALS = Object.keys(globalThis._PALETTE?.dimensionFocus || {});
const CONTRIB_VALS = Object.keys(globalThis._PALETTE?.contributions || {});

const _LLM_EXCLUDE = ["n/s", "none"];
// "other" excluded on request: a catch-all bucket adds noise, not insight.
const _BENCH_EXCLUDE = ["none", "no bmk-ds", "n/s", "no bmk", "other"];
const _METRIC_EXCLUDE = ["none", "no eval.", "n/s", "other"];

// ── Small prep helpers (registry-local) ─────────────────────────────────
function _years(data) {
    return [...new Set(data.map((r) => r.YEAR).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
}
function _splitVals(raw, allowed, exclude) {
    return (raw || "").split(",").map((s) => s.trim()).filter((v) => {
        if (!v) return false;
        if (allowed && !allowed.includes(v)) return false;
        if (exclude?.includes(v.toLowerCase())) return false;
        return true;
    });
}

// Count venues of one type ("C:" conferences / "J:" journals) → sorted entries.
function _venueCounts(data, prefix) {
    const counts = {};
    data.forEach((r) => {
        const v = (r["PUBLISHED INTO"] || "").trim();
        if (!v.startsWith(prefix)) return;
        const k = v.slice(prefix.length).trim();
        counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Top-N + "Others" donut panel, colored from a palette ramp (Others → GRAY).
function _venueDonutPanel(title, sorted, topN, shades) {
    const top = sorted.slice(0, topN);
    const othersTotal = sorted.slice(topN).reduce((s, [, v]) => s + v, 0);
    const labels = top.map(([k]) => k);
    const values = top.map(([, v]) => v);
    const colors = top.map((_, i) => shades[i % shades.length]);
    if (othersTotal > 0) { labels.push("Others"); values.push(othersTotal); colors.push(_C.GRAY); }
    return { title, labels, values, colors };
}

// Generic co-occurrence cross-tab → renderCrossHeatmap (rows = top-N of `rowField`).
// `cols` drives counting/filtering; `colLabels` (optional) drives the axis text —
// use this to show short labels (e.g. TREND_SHORT) while counting on full names.
function _crossHeatmap(cid, data, opts) {
    const { rowField, rowAllowed, rowExclude, colField, colAllowed, colExclude,
            cols, colLabels, topN, xTitle, yTitle, palette } = opts;
    const map = {};
    data.forEach((r) => {
        if (!r[rowField] || !r[colField]) return;
        const rowVals = _splitVals(r[rowField], rowAllowed, rowExclude);
        const colVals = _splitVals(r[colField], colAllowed, colExclude);
        rowVals.forEach((rv) => colVals.forEach((cv) => {
            map[rv] ??= {};
            map[rv][cv] = (map[rv][cv] || 0) + 1;
        }));
    });
    let rows = Object.entries(map)
        .map(([k, tc]) => [k, Object.values(tc).reduce((a, b) => a + b, 0)])
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
    if (topN) rows = rows.slice(0, topN);
    const labels = colLabels || cols;
    const fullCol = (col) => (colLabels ? cols[colLabels.indexOf(col)] : col);
    renderCrossHeatmap(cid, rows, labels,
        (row, col) => map[row]?.[fullCol(col)] || 0,
        { xTitle, yTitle, paletteHex: palette, clickTerms: (row, col) => [row, fullCol(col)] });
}

// ── Sankey builder ──────────────────────────────────────────────────────
// Build {links, nodeColors, nodeLabels} for a multi-stage flow. `stages` is an
// array of { rows(record)->string[], prefix, color(label)->hex }. Identical
// labels across stages stay distinct via the per-stage prefix.
function _buildSankey(data, stages) {
    const flows = new Map();
    const nodeColors = {};
    const nodeLabels = {};
    const noteNode = (st, label) => {
        const id = st.prefix + label;
        nodeLabels[id] = label;
        nodeColors[id] = st.color(label) || _C.GRAY;
        return id;
    };
    data.forEach((r) => {
        const perStage = stages.map((st) => st.rows(r));
        for (let i = 0; i < stages.length - 1; i++) {
            perStage[i].forEach((a) => perStage[i + 1].forEach((b) => {
                const fromId = noteNode(stages[i], a);
                const toId = noteNode(stages[i + 1], b);
                if (!flows.has(fromId)) flows.set(fromId, new Map());
                const inner = flows.get(fromId);
                inner.set(toId, (inner.get(toId) || 0) + 1);
            }));
        }
    });
    const links = [];
    flows.forEach((inner, from) => inner.forEach((flow, to) => links.push({ from, to, flow })));
    return { links, nodeColors, nodeLabels };
}

// ── HTML-chart helpers (render directly into #grafica) ─────────────────

function _htmlWordCloud(cid, data) {
    const el = document.getElementById(cid);
    const STOP = new Set(["the", "a", "an", "of", "in", "to", "and", "for", "is", "are", "was", "were", "be", "been",
        "with", "that", "this", "on", "by", "from", "as", "at", "or", "not", "it", "we", "our", "can", "has", "have",
        "which", "their", "its", "such", "these", "than", "also", "but", "more", "into", "each", "using", "used",
        "based", "between", "both", "other", "about", "all", "over", "may", "one", "two", "new", "they", "when",
        "how", "do", "does", "did", "no", "if", "will", "would", "could", "should", "most", "only", "then", "them",
        "where", "what", "who", "so", "up", "out", "some", "through", "while", "after", "before", "i", "ii", "e", "g",
        "et", "al", "ie", "eg", "vs", "per", "via"]);
    const words = {};
    data.forEach((r) => {
        const text = (r.ABSTRACT || "") + " " + (r.TITLE || "");
        text.toLowerCase().replace(/[^a-z]/g, " ").split(/\s+/).forEach((w) => {
            if (w.length > 2 && !STOP.has(w)) words[w] = (words[w] || 0) + 1;
        });
    });
    const sorted = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 120);
    const maxF = sorted[0]?.[1] || 1;
    const colors = generateColors(10);

    let html = '<div style="text-align:center;padding:20px;line-height:2.2;">';
    sorted.forEach(([word, count], i) => {
        const size = Math.max(11, Math.round((count / maxF) * 48));
        const color = colors[i % colors.length];
        const opacity = 0.5 + 0.5 * (count / maxF);
        html += `<span class="wc-word" style="font-size:${size}px;color:${color};opacity:${opacity};font-weight:${size > 24 ? 700 : 400};" title="${word}: ${count}">${word}</span> `;
    });
    html += "</div>";
    el.innerHTML = html;
}

// Paginated instead of one long scrolling list — keeps the chart container's
// height predictable and avoids a tall inner scrollbar for 30 rows.
const _COAUTHOR_PAGE_SIZE = 14;

function _htmlCoauthorTable(cid, data) {
    const el = document.getElementById(cid);
    const pairs = {};
    data.forEach((r) => {
        const bibtex = r.BIBTEX || "";
        const authMatch = bibtex.match(/author\s*=\s*[{"]([^}"]+)[}"]/i);
        if (!authMatch) return;
        const authors = authMatch[1].split(" and ").map((a) => a.trim().replace(/\s+/g, " ")).filter(Boolean);
        for (let i = 0; i < authors.length; i++) {
            for (let j = i + 1; j < authors.length; j++) {
                const pair = [authors[i], authors[j]].sort((a, b) => a.localeCompare(b)).join(" & ");
                pairs[pair] = (pairs[pair] || 0) + 1;
            }
        }
    });
    const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 30);
    const maxP = sorted[0]?.[1] || 1;
    const maxBarPx = _screenTier() === "lg" ? 200 : 100;
    const totalPages = Math.max(1, Math.ceil(sorted.length / _COAUTHOR_PAGE_SIZE));
    let page = 0;

    el.innerHTML = "";
    const tableWrap = document.createElement("div");
    tableWrap.style.overflowX = "auto";
    const pager = document.createElement("div");
    pager.className = "coauthor-pager";
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn-flat";
    prevBtn.textContent = "‹ Prev";
    const pageLabel = document.createElement("span");
    pageLabel.className = "coauthor-pager-label";
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-flat";
    nextBtn.textContent = "Next ›";
    pager.append(prevBtn, pageLabel, nextBtn);
    el.append(tableWrap, pager);

    function renderPage() {
        const start = page * _COAUTHOR_PAGE_SIZE;
        const pageRows = sorted.slice(start, start + _COAUTHOR_PAGE_SIZE);

        let html = '<table class="coauthor-table"><thead><tr><th>Author Pair</th><th>Co-authored Papers</th></tr></thead><tbody>';
        pageRows.forEach(([pair, count]) => {
            const w = Math.round((count / maxP) * maxBarPx);
            html += `<tr class="coauthor-row" data-pair="${encodeURIComponent(pair)}" style="cursor:pointer;" title="Show this pair's papers in the table">` +
                `<td>${pair}</td><td><span class="coauthor-bar" style="width:${w}px;"></span>${count}</td></tr>`;
        });
        html += "</tbody></table>";
        tableWrap.innerHTML = html;

        // Clicking a pair filters the table to papers co-authored by BOTH authors.
        tableWrap.querySelectorAll(".coauthor-row").forEach((tr) => {
            tr.addEventListener("click", () => {
                const authors = decodeURIComponent(tr.dataset.pair).split(" & ");
                chartClickFilter("", authors);
            });
        });

        pageLabel.textContent = `Page ${page + 1} of ${totalPages}`;
        prevBtn.disabled = page === 0;
        nextBtn.disabled = page >= totalPages - 1;
    }

    prevBtn.addEventListener("click", () => { if (page > 0) { page--; renderPage(); } });
    nextBtn.addEventListener("click", () => { if (page < totalPages - 1) { page++; renderPage(); } });
    renderPage();
}

// Interactive tool cloud: font size ∝ number of papers proposing the tool,
// hovering a tool lists the paper title(s), clicking filters the table.
function _htmlToolCloud(cid, data) {
    const el = document.getElementById(cid);
    const exclude = new Set(["-", "none", "n/s", "approach not a tool", "data-set of the study"]);
    const tools = {}; // name → { count, papers }
    data.forEach((r) => {
        (r.TOOL || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((name) => {
            if (exclude.has(name.toLowerCase())) return;
            tools[name] ??= { count: 0, papers: [] };
            tools[name].count++;
            if (r.TITLE) tools[name].papers.push(r.TITLE.trim());
        });
    });
    const sorted = Object.entries(tools).sort((a, b) => b[1].count - a[1].count);
    const maxF = sorted[0]?.[1].count || 1;
    const colors = generateColors(12);

    const wrap = document.createElement("div");
    wrap.style.cssText = "text-align:center;padding:24px;line-height:2.6;max-height:100%;overflow-y:auto;";
    sorted.forEach(([name, info], i) => {
        const span = document.createElement("span");
        span.className = "wc-word";
        const size = 13 + Math.round(((info.count - 1) / Math.max(1, maxF - 1)) * 30);
        span.style.cssText = `font-size:${size}px;color:${colors[i % colors.length]};font-weight:${size > 24 ? 700 : 500};cursor:pointer;`;
        span.textContent = name;
        span.title = `${name} — ${info.count} paper${info.count === 1 ? "" : "s"}:\n` + info.papers.join("\n");
        span.addEventListener("click", () => chartClickFilter("Tool", name));
        wrap.append(span, " ");
    });
    el.innerHTML = "";
    el.appendChild(wrap);
}

// ── The registry ─────────────────────────────────────────────────────────
globalThis.CHART_REGISTRY = {

    // ══ Publication Landscape ══════════════════════════════════════════
    ano: {
        label: "Publications per Year by Venue", group: "Publication Landscape", kind: "canvas",
        render(cid, data, ctx) {
            const years = _years(data);
            const venues = {};
            const venueType = {};
            data.forEach((r) => {
                if (!r.YEAR) return;
                const pubType = (r["PUBLICATION TYPE"] || "").trim();
                const pubInto = (r["PUBLISHED INTO"] || "").trim();
                let venue, vtype;
                if (pubType === "arXiv") {
                    venue = "arXiv"; vtype = "arxiv";
                } else if (pubInto.startsWith("C:")) {
                    venue = pubInto.replace(/^C:\s*/, ""); vtype = "conf";
                } else if (pubInto.startsWith("J:")) {
                    venue = pubInto.replace(/^J:\s*/, ""); vtype = "jour";
                } else {
                    venue = pubInto || pubType || "Other"; vtype = "conf";
                }
                venueType[venue] = vtype;
                venues[venue] ??= {};
                venues[venue][r.YEAR] = (venues[venue][r.YEAR] || 0) + 1;
            });

            const total = (v) => Object.values(venues[v]).reduce((s, n) => s + n, 0);
            const confAll = Object.keys(venues).filter((v) => venueType[v] === "conf").sort((a, b) => total(b) - total(a));
            const jourAll = Object.keys(venues).filter((v) => venueType[v] === "jour").sort((a, b) => total(b) - total(a));
            const arxivVenues = Object.keys(venues).filter((v) => venueType[v] === "arxiv");

            const TOP_CONF = 14, TOP_JOUR = 7;
            const confVenues = confAll.slice(0, TOP_CONF);
            if (confAll.length > TOP_CONF) {
                venues["Other Conf."] = {};
                confAll.slice(TOP_CONF).forEach((v) => {
                    years.forEach((y) => { venues["Other Conf."][y] = (venues["Other Conf."][y] || 0) + (venues[v][y] || 0); });
                });
                confVenues.unshift("Other Conf.");
            }
            const jourVenues = jourAll.slice(0, TOP_JOUR);
            if (jourAll.length > TOP_JOUR) {
                venues["Other Jour."] = {};
                jourAll.slice(TOP_JOUR).forEach((v) => {
                    years.forEach((y) => { venues["Other Jour."][y] = (venues["Other Jour."][y] || 0) + (venues[v][y] || 0); });
                });
                jourVenues.unshift("Other Jour.");
            }
            const stackOrder = [...confVenues, ...jourVenues, ...arxivVenues];

            const CONF_PAL = ctx.PALETTE?.confShades || [];
            const JOUR_PAL = ctx.PALETTE?.jourShades || [];
            const colorMap = {};
            confVenues.forEach((v, i) => { colorMap[v] = CONF_PAL[i % CONF_PAL.length]; });
            jourVenues.forEach((v, i) => { colorMap[v] = JOUR_PAL[i % JOUR_PAL.length]; });
            arxivVenues.forEach((v) => { colorMap[v] = ctx.PALETTE?.pubTypes?.arXiv || _C.DEEP_RED; });

            const series = stackOrder.map((venue) => ({
                name: venue,
                data: years.map((y) => venues[venue][y] || 0),
                color: colorMap[venue],
            }));
            renderVenueChart(cid, years, series);
        },
    },

    trend_time: {
        label: "Research Trend over Time", group: "Publication Landscape", kind: "canvas",
        render(cid, data, ctx) {
            const years = _years(data);
            const counts = {};
            TREND_ORDER.forEach((t) => { counts[t] = {}; });
            data.forEach((r) => {
                if (!r.YEAR) return;
                _splitVals(r.TREND, TREND_ORDER).forEach((t) => {
                    counts[t][r.YEAR] = (counts[t][r.YEAR] || 0) + 1;
                });
            });
            const series = TREND_ORDER.map((t) => ({
                name: t,
                data: years.map((y) => counts[t][y] || 0),
                color: ctx.PALETTE?.trends?.[t],
            }));
            renderLineChart(cid, years, series);
        },
    },

    contrib_time: {
        label: "Contribution Type over Time", group: "Publication Landscape", kind: "canvas",
        render(cid, data, ctx) {
            const years = _years(data);
            const counts = {};
            CONTRIB_VALS.forEach((c) => { counts[c] = {}; });
            data.forEach((r) => {
                if (!r.YEAR) return;
                _splitVals(r["TYPE OF CONTRIBUTION"], CONTRIB_VALS).forEach((c) => {
                    counts[c][r.YEAR] = (counts[c][r.YEAR] || 0) + 1;
                });
            });
            const series = CONTRIB_VALS.map((c) => ({
                name: c,
                data: years.map((y) => counts[c][y] || 0),
                color: ctx.PALETTE?.contributions?.[c],
            }));
            renderStackedAreaChart(cid, years, series, "No. Articles");
        },
    },

    conf_map: {
        label: "Conference Locations", group: "Publication Landscape", kind: "html",
        render(cid, data) { renderConferenceMap(cid, data); },
    },

    venues: {
        label: "Conferences & Journals", group: "Publication Landscape", kind: "canvas",
        render(cid, data, ctx) {
            renderMultiDonut(cid, [
                _venueDonutPanel("Conferences", _venueCounts(data, "C:"), 14, ctx.PALETTE?.confShades || []),
                _venueDonutPanel("Journals", _venueCounts(data, "J:"), 7, ctx.PALETTE?.jourShades || []),
            ]);
        },
    },

    contrib_db: {
        label: "Contribution & Source Database", group: "Publication Landscape", kind: "canvas",
        render(cid, data, ctx) {
            const toPanel = (title, field, colorOf) => {
                const sorted = Object.entries(countField(data, field)).sort((a, b) => b[1] - a[1]);
                return {
                    title,
                    labels: sorted.map(([k]) => k),
                    values: sorted.map(([, v]) => v),
                    colors: colorOf
                        ? sorted.map(([k]) => colorOf(k) || _C.GRAY)
                        : generateColors(sorted.length),
                };
            };
            renderMultiDonut(cid, [
                toPanel("Type of Contribution", "TYPE OF CONTRIBUTION", (k) => ctx.PALETTE?.contributions?.[k]),
                toPanel("Source Database", "DATABASE"),
            ]);
        },
    },

    // ══ Tooling & Evaluation ═════════════════════════════════════════════
    llmsused: {
        label: "LLMs Used", group: "Tooling & Evaluation", kind: "canvas",
        render(cid, data, ctx) {
            renderBarFromCount(cid, data, "LLMs USED", "LLMs Used", _LLM_EXCLUDE, ctx.PALETTE?.llmFamilies);
        },
    },

    llm_timeline: {
        label: "LLM Usage over Time", group: "Tooling & Evaluation", kind: "canvas",
        render(cid, data) {
            const years = _years(data);
            const counts = {};
            data.forEach((r) => {
                if (!r.YEAR || !r["LLMs USED"]) return;
                _splitVals(r["LLMs USED"], null, _LLM_EXCLUDE).forEach((llm) => {
                    counts[llm] ??= {};
                    counts[llm][r.YEAR] = (counts[llm][r.YEAR] || 0) + 1;
                });
            });
            const totals = Object.entries(counts)
                .map(([llm, yc]) => [llm, Object.values(yc).reduce((a, b) => a + b, 0)])
                .sort((a, b) => b[1] - a[1]);
            const topLLMs = totals.slice(0, 15).map(([l]) => l);
            renderLLMHeatmap(cid, years, topLLMs, counts);
        },
    },

    benchmarks: {
        label: "Benchmarks Used", group: "Tooling & Evaluation", kind: "canvas",
        render(cid, data) {
            renderBarFromCount(cid, data, "BENCHMARK", "Benchmarks", _BENCH_EXCLUDE);
        },
    },

    metrics: {
        label: "Evaluation Metrics", group: "Tooling & Evaluation", kind: "canvas",
        render(cid, data) {
            renderBarFromCount(cid, data, "EVALUATION METRIC", "Metrics", _METRIC_EXCLUDE);
        },
    },

    tools: {
        label: "Tools Proposed", group: "Tooling & Evaluation", kind: "html",
        render(cid, data) { _htmlToolCloud(cid, data); },
    },

    // ══ Cross-Dimensional Analysis ═══════════════════════════════════════
    dim_flow: {
        label: "Trend → Approach → Scope → Prompting → Context → Focus", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data, ctx) {
            const P = ctx.PALETTE;
            const sankeyTrends = TREND_ORDER.filter((t) => t !== "Reflections");
            const { links, nodeColors, nodeLabels } = _buildSankey(data, [
                { prefix: "T:", color: (l) => P?.trends?.[l], rows: (r) => _splitVals(r.TREND, sankeyTrends) },
                { prefix: "A:", color: (l) => P?.approach?.[l], rows: (r) => _splitVals(r.APPROACH, APPROACH_VALS) },
                { prefix: "S:", color: (l) => P?.scope?.[l], rows: (r) => _splitVals(r.SCOPE, SCOPE_VALS) },
                { prefix: "L:", color: (l) => P?.prompting?.[l], rows: (r) => _splitVals(r["LLM ITERACTION"], PROMPTING_VALS) },
                { prefix: "C:", color: (l) => P?.contextualInfo?.[l], rows: (r) => _splitVals(r["CONTEXTUAL INFO"], CONTEXTUAL_VALS) },
                { prefix: "F:", color: (l) => P?.dimensionFocus?.[l], rows: (r) => _splitVals(r.FOCUS, FOCUS_VALS) },
            ]);
            renderSankeyChart(cid, links, nodeColors, nodeLabels,
                [["Trend"], ["Approach"], ["Scope"], ["LLM", "Iteration"], ["Context"], ["Focus"]]);
        },
    },

    llm_trend: {
        label: "LLM Family × Trend", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            _crossHeatmap(cid, data, {
                rowField: "LLMs USED", rowExclude: _LLM_EXCLUDE,
                colField: "TREND", colAllowed: TREND_ORDER, cols: TREND_ORDER, colLabels: TREND_SHORT,
                topN: 15, xTitle: "Testing Trend", yTitle: "LLM Family", palette: _C.DEEP_BLUE,
            });
        },
    },

    bench_trend: {
        label: "Benchmark × Trend", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            _crossHeatmap(cid, data, {
                rowField: "BENCHMARK", rowExclude: _BENCH_EXCLUDE,
                colField: "TREND", colAllowed: TREND_ORDER, cols: TREND_ORDER, colLabels: TREND_SHORT,
                topN: 18, xTitle: "Testing Trend", yTitle: "Benchmark", palette: _C.PURPLE,
            });
        },
    },

    metric_trend: {
        label: "Metric × Trend", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            _crossHeatmap(cid, data, {
                rowField: "EVALUATION METRIC", rowExclude: _METRIC_EXCLUDE,
                colField: "TREND", colAllowed: TREND_ORDER, cols: TREND_ORDER, colLabels: TREND_SHORT,
                topN: 18, xTitle: "Testing Trend", yTitle: "Evaluation Metric", palette: _C.DEEP_RED,
            });
        },
    },

    gap_matrix: {
        label: "Approach × Scope Gap Matrix", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            _crossHeatmap(cid, data, {
                rowField: "APPROACH", rowAllowed: APPROACH_VALS,
                colField: "SCOPE", colAllowed: SCOPE_VALS, cols: SCOPE_VALS,
                xTitle: "Scope", yTitle: "Approach", palette: _C.ORANGE,
            });
        },
    },

    dsk_trend: {
        label: "Contextual Info × Trend", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            _crossHeatmap(cid, data, {
                rowField: "CONTEXTUAL INFO", rowAllowed: CONTEXTUAL_VALS,
                colField: "TREND", colAllowed: TREND_ORDER, cols: TREND_ORDER, colLabels: TREND_SHORT,
                xTitle: "Testing Trend", yTitle: "Contextual Info", palette: _C.TEAL,
            });
        },
    },

    trend_matrix: {
        label: "Trend Co-occurrence", group: "Cross-Dimensional Analysis", kind: "canvas",
        render(cid, data) {
            // Symmetric co-occurrence matrix: diagonal = papers in that trend,
            // off-diagonal = papers tagged with both trends.
            const matrix = {};
            TREND_ORDER.forEach((a) => { matrix[a] = {}; TREND_ORDER.forEach((b) => { matrix[a][b] = 0; }); });
            data.forEach((r) => {
                const trends = _splitVals(r.TREND, TREND_ORDER);
                trends.forEach((t) => { matrix[t][t]++; });
                for (let i = 0; i < trends.length; i++) {
                    for (let j = i + 1; j < trends.length; j++) {
                        matrix[trends[i]][trends[j]]++;
                        matrix[trends[j]][trends[i]]++;
                    }
                }
            });
            // X-axis (rotated) always abbreviates, matching every other
            // cross-tab heatmap's TREND column axis. Y-axis only abbreviates
            // on phones — at md/lg there's plenty of horizontal room
            // (containLabel) to show the full trend name.
            const rowLabels = _screenTier() === "sm" ? TREND_SHORT : TREND_ORDER;
            const resolveTrend = (label) => (TREND_ORDER.includes(label) ? label : TREND_ORDER[TREND_SHORT.indexOf(label)]);
            renderCrossHeatmap(cid, rowLabels, TREND_SHORT,
                (row, col) => matrix[resolveTrend(row)]?.[resolveTrend(col)] || 0,
                {
                    xTitle: "Testing Trend", yTitle: "Testing Trend", paletteHex: _C.TEAL,
                    clickTerms: (row, col) => [...new Set([resolveTrend(row), resolveTrend(col)])],
                });
        },
    },

    // ══ Exploration ══════════════════════════════════════════════════════
    coauthors: {
        label: "Frequent Co-authors", group: "Exploration", kind: "html",
        render(cid, data) { _htmlCoauthorTable(cid, data); },
    },

    wordcloud: {
        label: "Abstract Word Cloud", group: "Exploration", kind: "html",
        render(cid, data) { _htmlWordCloud(cid, data); },
    },
};

// ── Dropdown ordering ──────────────────────────────────────────────────
globalThis.CHART_GROUP_ORDER = ["Publication Landscape", "Tooling & Evaluation", "Cross-Dimensional Analysis", "Exploration"];
globalThis.DEFAULT_CHART_KEY = "ano";

// Look up a chart's display label (used by the export filename builder).
globalThis.chartLabel = function chartLabel(key) {
    return globalThis.CHART_REGISTRY[key]?.label || "chart";
};

// Populate <select id="graficoSelect"> with <optgroup>/<option> from the registry.
globalThis.buildChartSelect = function buildChartSelect(selectId = "graficoSelect") {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const entries = Object.entries(globalThis.CHART_REGISTRY);
    const html = globalThis.CHART_GROUP_ORDER.map((group) => {
        const opts = entries
            .filter(([, e]) => e.group === group)
            .map(([key, e]) => {
                const selected = key === globalThis.DEFAULT_CHART_KEY ? " selected" : "";
                return `<option value="${key}"${selected}>${e.label}</option>`;
            })
            .join("");
        return opts ? `<optgroup label="${group.replaceAll("&", "&amp;")}">${opts}</optgroup>` : "";
    }).join("");
    sel.innerHTML = html;
};
