const CSV_PATH = "data/articlecorpus.csv";

// ── Conference URLs (shared across charts/table) ──
let _confUrls = null;

function loadConfUrls() {
    if (_confUrls) return Promise.resolve(_confUrls);
    return fetch("dashboard/data/conference_urls.json")
        .then((r) => r.json())
        .then((urls) => { _confUrls = urls; return urls; });
}

function confLink(name, year, urls) {
    const key = year ? name + " " + year : name;
    const url = urls ? urls[key] : null;
    if (url) return `<a href="${url}" target="_blank" rel="noopener" style="font-weight:600">${name}</a>`;
    return `<b>${name}</b>`;
}

// ── CSV loading ──
function loadCSV(callback) {
    Papa.parse(CSV_PATH, {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: ({ data, meta }) => {
            data = data.filter((row) => row.ID?.trim());
            loadConfUrls().catch(() => {}).finally(() => {
                callback(data, meta.fields);
            });
        },
    });
}

// ── Filtering utilities ──

function filterByCorpus(data, corpus) {
    if (corpus === "initial") return data.filter((r) => r.ID?.startsWith("P"));
    if (corpus === "validation") return data.filter((r) => r.ID?.startsWith("V"));
    return data;
}

function filterByYear(data, minYear, maxYear) {
    return data.filter((r) => {
        const y = Number.parseFloat(r.YEAR);
        return !Number.isNaN(y) && y >= minYear && y <= maxYear;
    });
}

function applyFilters(data, corpus, yearRange) {
    let filtered = filterByCorpus(data, corpus);
    if (yearRange) filtered = filterByYear(filtered, yearRange[0], yearRange[1]);
    return filtered;
}

function countField(data, field, splitChar = ",", exclude = []) {
    const counts = {};
    data.forEach((r) => {
        const val = r[field];
        if (!val || exclude.includes(val.trim().toLowerCase())) return;
        val.split(splitChar).map((s) => s.trim()).filter(Boolean).forEach((v) => {
            counts[v] = (counts[v] || 0) + 1;
        });
    });
    return counts;
}

// ── Stats bar ──

function updateStats(data) {
    document.getElementById("stat-total").textContent = data.length;
    let j = 0, c = 0, a = 0;
    data.forEach((r) => {
        const t = (r["PUBLICATION TYPE"] || "").trim();
        if (t === "Journal") j++;
        else if (t === "Conference") c++;
        else if (t === "arXiv") a++;
    });
    document.getElementById("stat-journals").textContent = j;
    document.getElementById("stat-conferences").textContent = c;
    document.getElementById("stat-arxiv").textContent = a;
}

// ── Bubble chart: Classification Dimensions by Research Trend ──

function renderBubbleDashboard(data) {
    const baseColors = generateColors(5);
    const DIMS = [
        { col: "APPROACH", name: "Approach", vals: APPROACH_VALS, color: baseColors[0] },
        { col: "SCOPE", name: "Scope", vals: SCOPE_VALS, color: baseColors[1] },
        { col: "LLM ITERACTION", name: "LLM Interaction", vals: PROMPTING_VALS, color: baseColors[2] },
        { col: "CONTEXTUAL INFO", name: "Domain Specific Knowledge", vals: CONTEXTUAL_VALS, color: baseColors[3] },
        { col: "FOCUS", name: "Focus", vals: FOCUS_VALS, color: baseColors[4] },
    ];

    const yLabels = [...TREND_ORDER].reverse();

    // Build x-axis slots with gaps between dimension groups
    const xSlots = [];
    const xGroups = [];
    let xPos = 0;
    const GAP = 1;
    DIMS.forEach((dim, di) => {
        const startPos = xPos;
        dim.vals.forEach((val) => {
            xSlots.push({ pos: xPos, label: val, dimIdx: di });
            xPos++;
        });
        xGroups.push({ label: dim.name, startPos, endPos: xPos - 1, color: dim.color, band: hexAlpha(dim.color, 0.06) });
        if (di < DIMS.length - 1) xPos += GAP;
    });
    const maxXPos = xPos - 1;

    // Count (trend, dim_name, val) intersections
    const counts = {};
    const addCounts = (trends, dimName, vals) => {
        vals.forEach((v) => trends.forEach((trend) => {
            const key = `${trend}|${dimName}|${v}`;
            counts[key] = (counts[key] || 0) + 1;
        }));
    };
    data.forEach((r) => {
        const trends = _splitVals(r.TREND, TREND_ORDER);
        if (trends.length === 0) return;
        DIMS.forEach((dim) => addCounts(trends, dim.name, _splitVals(r[dim.col], dim.vals)));
    });

    const maxCount = Math.max(1, ...Object.values(counts));

    // One dataset per dimension (for colored legend)
    const datasets = DIMS.map((dim, di) => {
        const points = [];
        dim.vals.forEach((val) => {
            const slot = xSlots.find((s) => s.dimIdx === di && s.label === val);
            yLabels.forEach((trend, yi) => {
                const c = counts[`${trend}|${dim.name}|${val}`] || 0;
                if (c > 0) {
                    points.push({
                        x: slot.pos,
                        y: yi,
                        r: Math.max(4, Math.sqrt(c / maxCount) * 22),
                        count: c,
                    });
                }
            });
        });
        return {
            label: dim.name,
            data: points,
            backgroundColor: hexAlpha(dim.color, 0.82),
        };
    });

    renderBubbleChart("chart-bubble", { datasets, xSlots, xGroups, yLabels, maxX: maxXPos });
}

// ── Insights chart (selectable, dispatched via CHART_REGISTRY) ──

function renderInsightsChart(data, chartKey) {
    const cid = "grafica";
    const entry = globalThis.CHART_REGISTRY?.[chartKey];
    const hostEl = document.getElementById(cid);

    destroyChart(cid);
    document.querySelectorAll("#section-insights .chart-empty").forEach((el) => el.remove());
    if (hostEl) {
        hostEl.style.display = "";
        hostEl.parentElement.style.display = "";
        hostEl.parentElement.style.height = ""; // undo any heatmap-set inline height
    }

    if (!entry) return; // unknown/removed key → blank
    if (!data || data.length === 0) { showChartEmpty(); return; }

    entry.render(cid, data, { PALETTE: globalThis._PALETTE });
}

// Empty-state message shown when the active filters yield no rows.
function showChartEmpty() {
    const target = document.getElementById("grafica")?.parentElement;
    if (!target) return;
    const msg = document.createElement("div");
    msg.className = "chart-empty";
    msg.textContent = "No data for the current filters.";
    target.appendChild(msg);
}

// ── Bar chart from a field's value counts ──
function renderBarFromCount(cid, data, field, label, exclude, colorMap) {
    const c = countField(data, field, ",", exclude || []);
    const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
    renderBarChart(cid, sorted.map(([k]) => k), sorted.map(([, v]) => v), label, colorMap);
}

// ── Conference Map (Leaflet) ──
let _confCoords = null;
let _confMapInstance = null;

function renderConferenceMap(cid, data) {
    const el = document.getElementById(cid);

    function build(coords, urls) {
        // Extract address from BibTeX for each conference paper
        const addrRegex = /address\s*=\s*\{([^}]+)\}/i;
        const locations = {};
        data.forEach((r) => {
            const pub = (r["PUBLISHED INTO"] || "").trim();
            if (!pub.startsWith("C:")) return;
            const conf = pub.replace(/^C:\s*/, "");
            const bib = r.BIBTEX || "";
            const m = bib.match(addrRegex);
            if (!m) return;
            const addr = m[1].trim();
            const c = coords[addr];
            if (!c) return;
            const key = c.lat + "," + c.lng;
            if (!locations[key]) locations[key] = { lat: c.lat, lng: c.lng, papers: [], confs: new Set() };
            locations[key].papers.push({ title: r.TITLE || r.ID, conf, year: r.YEAR });
            locations[key].confs.add(conf);
        });

        el.innerHTML = '<div id="conf-map" style="height:100%;min-height:400px;width:100%;border-radius:8px;"></div>';

        if (_confMapInstance) { _confMapInstance.remove(); _confMapInstance = null; }
        const map = L.map("conf-map").setView([20, 0], 2);
        _confMapInstance = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);

        const maxPapers = Math.max(1, ...Object.values(locations).map((l) => l.papers.length));

        Object.values(locations).forEach((loc) => {
            const radius = 8 + (loc.papers.length / maxPapers) * 22;
            const confs = [...loc.confs].sort((a, b) => a.localeCompare(b)).map((c) => confLink(c, null, urls)).join(", ");
            const paperList = loc.papers
                .sort((a, b) => (a.year || "").localeCompare(b.year || ""))
                .map((p) => `<li>${confLink(p.conf, p.year, urls)} (${p.year}) — ${p.title}</li>`)
                .join("");
            const popup = `<div style="max-height:200px;overflow:auto;">${confs} — ${loc.papers.length} paper(s)<ul style="margin:4px 0 0 16px;padding:0;font-size:0.85rem;">${paperList}</ul></div>`;
            L.circleMarker([loc.lat, loc.lng], {
                radius,
                fillColor: _C.TEAL,
                color: _lightenHex(_C.TEAL, -0.3),
                weight: 1,
                fillOpacity: 0.7,
            }).addTo(map).bindPopup(popup);
        });

        // Fix Leaflet rendering in hidden containers
        setTimeout(() => map.invalidateSize(), 200);
    }

    Promise.all([
        _confCoords ? Promise.resolve(_confCoords) : fetch("dashboard/data/conference_coords.json").then((r) => r.json()).then((c) => { _confCoords = c; return c; }),
        loadConfUrls().catch(() => null),
    ]).then(([coords, urls]) => build(coords, urls))
      .catch((err) => { el.innerHTML = '<p class="red-text">Could not load conference data: ' + err.message + '</p>'; });
}
