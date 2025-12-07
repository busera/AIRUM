// Configuration
// Configuration
let selectedProcess = "All";
let selectedNIST = "All"; // New state for filter intersection

const config = {
    hex_radius: 60,     // Increased size for visibility
    colors: [
        "#2E8B57", // Process 1: Sea Green
        "#4682B4", // Process 2: Steel Blue
        "#DAA520", // Process 3: Goldenrod
        "#CD853F", // Process 4: Peru
        "#9370DB", // Process 5: Medium Purple
        "#DC143C", // Process 6: Crimson
        "#FF6347"  // Process 7: Tomato
    ],
    // Known process names to enforce ID order if ID is missing in data
    // Or we will dynamically discover and sort.
    // If risk_matrix.xlsx has "Process ID" column, we use it. 
    // Otherwise we trust "Process Name" grouping.
};

// Hexagon math (Point-topped)
// width = sqrt(3) * size
// height = 2 * size
// Horizontal spacing = width
// Vertical spacing = 3/4 * height
const hexWidth = Math.sqrt(3) * config.hex_radius;
const hexHeight = 2 * config.hex_radius;

function simpleHexagonPath(radius) {
    // Generate point-topped hexagon path
    const points = [];
    for (let i = 0; i < 6; i++) {
        // Point-topped has vertices at 30, 90, 150... degrees relative to center?
        // Standard D3 or mathematical convention: 
        // vertex k: angle = 30 + 60*k degrees
        const angle_deg = 30 + 60 * i;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push([radius * Math.cos(angle_rad), radius * Math.sin(angle_rad)]);
    }
    return "M" + points.join("L") + "Z";
}

// Coordinate conversion (Axial -> Pixel)
function hexToPixel(q, r) {
    // x = size * (sqrt(3) * q + sqrt(3)/2 * r)
    // y = size * (3/2 * r)
    const x = config.hex_radius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = config.hex_radius * (3 / 2 * r);
    return { x, y };
}

// Strict Spiral Generator
// 1. Generate rings until we have >= N coordinates
// 2. Do NOT sort by distance (preserves continuous walk order)
// 3. Return exact N coordinates
function generateSpiralCoords(count) {
    const coords = [{ q: 0, r: 0 }]; // Start with center

    let radius = 1;
    // We might generate slightly more than N, but slice at the end.
    while (coords.length < count) {
        // Start at "Bottom Left" of the ring: (-radius, radius)
        let q = -radius;
        let r = radius;

        // Walk the 6 sides
        // Directions for CCW walk starting from Bottom-Left:
        // Right (1,0), Top-Right (1,-1), Top-Left (0,-1), Left (-1,0), Bottom-Left (-1,1), Bottom-Right (0,1)
        const moves = [
            { dq: 1, dr: 0 },
            { dq: 1, dr: -1 },
            { dq: 0, dr: -1 },
            { dq: -1, dr: 0 },
            { dq: -1, dr: 1 },
            { dq: 0, dr: 1 }
        ];

        for (let i = 0; i < 6; i++) {
            const move = moves[i];
            for (let step = 0; step < radius; step++) {
                coords.push({ q, r });
                q += move.dq;
                r += move.dr;
            }
        }
        radius++;
    }

    // Return exact count, preserving the spiral order
    return coords.slice(0, count);
}

async function init() {
    // Setup SVG
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear previous
    d3.select("#viz-container").html("");

    const svg = d3.select("#viz-container").append("svg")
        .attr("width", width)
        .attr("height", height);

    // 1. Create a Content Group
    const g = svg.append("g")
        .attr("id", "hive-container");

    // Define Zoom Behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 5]) // Reasonable zoom limits
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    // Apply zoom to SVG
    svg.call(zoom);


    // Add Drop Shadow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "130%");

    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 3)
        .attr("result", "blur");

    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("result", "offsetBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Load Data
    const data = await loadData();
    if (!data) return;

    // Sort Data by Process ID for Color Clustering
    // The file does NOT have a "Process ID" column, but "Process Name" starts with "1. ", "2. ", etc.
    let processedData = [...data];

    // Helper to extract ID
    function getProcessId(d) {
        const name = d.ProcessName || "";
        const match = name.match(/^(\d+)\./);
        return match ? parseInt(match[1]) : 999; // Default to end if no number
    }

    processedData.sort((a, b) => {
        const idA = getProcessId(a);
        const idB = getProcessId(b);
        if (idA !== idB) {
            return idA - idB;
        }
        // Secondary sort by Sub-Process or Risk Name for consistency
        return (a.ProcessName || "").localeCompare(b.ProcessName || "");
    });

    // Assign Colors based on Process Unique Values
    // Distinct processes
    const processNamesSet = new Set(processedData.map(d => d.ProcessName));
    const processNames = Array.from(processNamesSet);
    // Since data is sorted by ID, processNames will also be in ID order (1, 2, 3...)

    // Generate Coordinates
    const coords = generateSpiralCoords(processedData.length);

    // Merge Data with Coords
    const items = processedData.map((d, i) => {
        const { q, r } = coords[i];
        const { x, y } = hexToPixel(q, r);

        // Find color
        // map Process Name to index in our sorted list
        const pIndex = processNames.indexOf(d.ProcessName);
        const color = config.colors[pIndex % config.colors.length];

        return {
            ...d,
            q, r, x, y, color
        };
    });

    // Draw Hexagons
    // Assign class 'hex-group' and data-process attribute for easy selection
    const hexGroup = g.selectAll(".hex-group")
        .data(items)
        .enter()
        .append("g")
        .attr("class", "hex-group")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("data-process", d => d.ProcessName)
        .on("mouseover", function (event, d) {
            // Pop & Zoom Effect
            const el = d3.select(this);
            el.raise() // Bring to front
                .transition().duration(200)
                .attr("transform", `translate(${d.x},${d.y}) scale(1.15)`)
                .style("filter", "url(#drop-shadow)");

            showTooltip(event, d);
        })
        .on("mouseout", function (event, d) {
            // Reset
            d3.select(this)
                .transition().duration(200)
                .attr("transform", `translate(${d.x},${d.y}) scale(1)`)
                .style("filter", null);

            hideTooltip();
        })
        .on("click", function (event, d) {
            openDetailView(d);
        });

    hexGroup.append("path")
        .attr("d", simpleHexagonPath(config.hex_radius))
        .attr("class", "hexagon")
        .attr("fill", d => d.color);
    // Events moved to group


    // Add Text Labels
    // Use foreignObject for automatic text wrapping
    const textWidth = config.hex_radius * 1.5; // Slightly less than full width

    hexGroup.append("foreignObject")
        .attr("x", -textWidth / 2)
        .attr("y", -config.hex_radius / 1.5) // Approximate vertical centering adjustment
        .attr("width", textWidth)
        .attr("height", config.hex_radius * 1.5)
        .attr("pointer-events", "none") // Let mouse events pass to the hexagon path
        .append("xhtml:div")
        .attr("class", "hex-label")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .text(d => d.RiskName);

    // Generate Process Filter Controls
    createFilterControls(processNames, config.colors);

    // Generate NIST Filter Controls
    // Extract unique NIST stages
    const nistStagesSet = new Set(processedData.map(d => d.NIST_Stage).filter(x => x && x !== 'N/A')); // filter out undefined/null/N/A
    const nistStages = Array.from(nistStagesSet).sort();
    createNISTFilterControls(nistStages);

    // 2. Implement 'Auto-Center' Logic
    centerMap(svg, g, zoom, width, height);

    // 3. Zoom Behavior: Handle Window Resize
    window.onresize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        svg.attr("width", newWidth).attr("height", newHeight);
        centerMap(svg, g, zoom, newWidth, newHeight);
    };
}

// Helper to Auto-Center based on BBox
function centerMap(svg, g, zoom, width, height) {
    const bounds = g.node().getBBox();
    const fullWidth = width;
    const fullHeight = height;

    // Calculate mid-point of the content
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;

    // Calculate scale to fit
    const scale = 0.85;

    // Calculate translation to center the mid-point AND sync with D3 Zoom
    // We need: (width/2, height/2) = translate + scale * (midX, midY)
    // Therefore: translate = (width/2, height/2) - scale * (midX, midY)
    const x = (fullWidth / 2) - (scale * midX);
    const y = (fullHeight / 2) - (scale * midY);

    // Create the transform object
    const initialTransform = d3.zoomIdentity
        .translate(x, y)
        .scale(scale);

    // Apply via Zoom Handler (Crucial Step: Updates D3 internal state AND visual)
    svg.call(zoom.transform, initialTransform);
}

function createFilterControls(processNames, colors) {
    const container = d3.select("#filter-container");
    container.html(""); // Clear existing

    // Add "Show All" button
    container.append("button")
        .attr("class", "filter-btn active") // Default active
        .attr("data-val", "All")
        .style("background-color", "#666")
        .text("Show All")
        .on("click", function () {
            selectedProcess = "All";
            updateViz();

            // UI Update
            d3.selectAll("#filter-container .filter-btn").classed("active", false);
            d3.select(this).classed("active", true);
        });

    // Add Process Buttons
    processNames.forEach((proc, i) => {
        const color = colors[i % colors.length];

        container.append("button")
            .attr("class", "filter-btn")
            .attr("data-val", proc)
            .style("background-color", color)
            .text(proc)
            .on("click", function () {
                selectedProcess = proc;
                updateViz();

                // UI Update
                d3.selectAll("#filter-container .filter-btn").classed("active", false);
                d3.select(this).classed("active", true);
            });
    });

    // Add About/Methodology Button
    container.append("button")
        .attr("class", "filter-btn about-btn")
        .text("Methodology")
        .on("click", openInfoModal);
}

function createNISTFilterControls(stages) {
    const container = d3.select("#nist-filter-container");
    container.html(""); // Clear existing

    // Add "All Stages" button
    container.append("button")
        .attr("class", "nist-filter-btn active") // Default active
        .attr("data-val", "All")
        .text("All Stages")
        .on("click", function () {
            selectedNIST = "All";
            updateViz();

            // UI Update
            d3.selectAll("#nist-filter-container .nist-filter-btn").classed("active", false);
            d3.select(this).classed("active", true);
        });

    // Add Stage Buttons
    stages.forEach(stage => {
        container.append("button")
            .attr("class", "nist-filter-btn")
            .attr("data-val", stage)
            .text(stage)
            .on("click", function () {
                selectedNIST = stage;
                updateViz();

                // UI Update
                d3.selectAll("#nist-filter-container .nist-filter-btn").classed("active", false);
                d3.select(this).classed("active", true);
            });
    });
}

function updateViz() {
    d3.selectAll(".hex-group")
        .transition().duration(750)
        .style("opacity", (d) => {
            const matchesProcess = (selectedProcess === 'All' || d.ProcessName === selectedProcess);
            const matchesNIST = (selectedNIST === 'All' || d.NIST_Stage === selectedNIST);
            return (matchesProcess && matchesNIST) ? 1 : 0.1;
        })
        .style("pointer-events", (d) => {
            const matchesProcess = (selectedProcess === 'All' || d.ProcessName === selectedProcess);
            const matchesNIST = (selectedNIST === 'All' || d.NIST_Stage === selectedNIST);
            return (matchesProcess && matchesNIST) ? "all" : "none";
        });
}

// Data Normalization Helper
function getValue(row, possibleKeys) {
    const rowKeys = Object.keys(row);
    // Find a key in the row that loosely matches one of our possible keys
    const match = rowKeys.find(k =>
        possibleKeys.some(pk => k.trim().toLowerCase() === pk.toLowerCase())
    );
    return match ? row[match] : null;
}

async function loadData() {
    try {
        const response = await fetch("./data/risk_matrix.xlsx"); // Correct relative path
        if (!response.ok) throw new Error("Fetch failed");
        const buf = await response.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        // Normalize Data
        const cleanData = rawData.map(row => {
            return {
                // Check for variations like "Process Name", "Process Group", "Process"
                ProcessName: getValue(row, ['Process Name', 'Process', 'Risk Process']) || 'Unknown Process',
                // Check for "Sub-Process Name", "Sub Process"
                SubProcessName: getValue(row, ['Sub-Process Name', 'Sub Process']) || 'Unknown Sub-Process',
                // Check for "Risk Name", "Risk", "Risk Title"
                RiskName: String(getValue(row, ['Risk Name', 'Risk', 'Risk Title']) || 'Unknown Risk'),
                // Check for "Risk Description", "Description"
                RiskDescription: String(getValue(row, ['Risk Description', 'Description', 'Desc']) || ''),
                // Check for "NIST AI Lifecycle Stage", "NIST Stage", "NIST"
                NIST_Stage: String(getValue(row, ['NIST AI Lifecycle Stage', 'NIST Stage', 'NIST']) || 'N/A'),
                // Check for "Sources" (Text Citations) - "Sources and References" column
                SourcesText: String(getValue(row, ['Sources and References', 'Sources', 'Source', 'References', 'Citation']) || ''),
                // Check for "URL Sources" (Links) - Force String
                // Added variations: URL Source, Link Sources, Links
                SourceLinks: String(getValue(row, ['URL Sources', 'URL Source', 'Link Sources', 'Links']) || '')
            };
        });

        console.log('First Clean Row:', cleanData[0]);
        return cleanData;

    } catch (e) {
        // Fallback or error logging
        console.error("Data load error", e);
        try {
            // Also try root if deployed differently? No, require standard structure.
            // But let's keep robust fallback just in case user didn't move it yet locally?
            // User requested strict structure, so we stick to ./data/
            // Re-throwing or alerting better for devops audit.
            alert("Error loading data from ./data/risk_matrix.xlsx. Check console.");
        } catch (e2) { }
    }
}

function showTooltip(event, d) {
    const tooltip = d3.select("#tooltip");
    tooltip.transition().duration(200).style("opacity", 0.9);

    // NIST Stage Logic
    const nistStage = d.NIST_Stage;
    const nistHtml = (nistStage && nistStage !== 'N/A')
        ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #555; font-size: 0.85em; color: #bbb;">AI Lifecycle Stage (by NIST): <span style="color: #fff; font-weight: 600;">${nistStage}</span></div>`
        : "";

    // User requested: Process Name, "Name on Hexagon" (Risk Name), Risk Description
    tooltip.html(`
        <div style="margin-bottom: 5px; color: #aaa; font-size: 0.9em;">${d.ProcessName}</div>
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em;">${d.RiskName}</div>
        <div style="font-size: 0.9em; line-height: 1.4;">${d.RiskDescription || "No description available."}</div>
        ${nistHtml}
    `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
    d3.select("#tooltip").transition().duration(500).style("opacity", 0);
}

// Deep Dive Logic
function openDetailView(d) {
    const overlay = d3.select("#detail-overlay");

    // Populate Content
    d3.select("#modal-header")
        .style("color", d.color) // Match process color
        .text(d.ProcessName);

    d3.select("#modal-subheader").text(d.SubProcessName || "");

    // Inject Divider before Modal Body if not present
    let topDivider = d3.select("#top-divider");
    if (topDivider.empty()) {
        topDivider = d3.select(".overlay-content")
            .insert("div", ".modal-body")
            .attr("class", "modal-divider")
            .attr("id", "top-divider");
    }

    // Inject NIST Badge Container if not present
    let metaRow = d3.select(".modal-meta-row");
    if (metaRow.empty()) {
        metaRow = d3.select(".overlay-content")
            .insert("div", "#modal-title") // Insert before Risk Name
            .attr("class", "modal-meta-row");
    }

    // Populate NIST Badge
    const nistValue = d.NIST_Stage;
    if (nistValue && nistValue !== 'N/A') {
        metaRow.html(`<span class="nist-badge">AI Lifecycle Stage: ${nistValue}</span>`)
            .style("display", "block");
    } else {
        metaRow.style("display", "none");
    }

    // Title: Risk Name preferred, else sub-process
    d3.select("#modal-title").text(d.RiskName || d.SubProcessName || "Risk Detail");

    d3.select("#modal-desc").text(d.RiskDescription || "No description provided.");

    // --- Sources and References (Text) ---
    const sourcesText = d.SourcesText;
    const sourcesContainer = d3.select("#modal-sources");
    // The specific header for this section is the H4 immediately preceding the #modal-sources div
    const sourcesHeader = sourcesContainer.node().previousElementSibling;

    if (sourcesText && typeof sourcesText === 'string' && sourcesText.trim().length > 0) {
        // Clear previous
        sourcesContainer.html("");

        // Split by newlines
        const lines = sourcesText.split('\n');

        lines.forEach(line => {
            if (line.trim()) {
                sourcesContainer.append("div")
                    .attr("class", "source-detail-item")
                    .text(line.trim());
            }
        });

        // Show container and header
        sourcesContainer.style("display", "block").style("margin-bottom", "15px");
        if (sourcesHeader) d3.select(sourcesHeader).style("display", "block");

    } else {
        sourcesContainer.style("display", "none");
        if (sourcesHeader) d3.select(sourcesHeader).style("display", "none");
    }

    // --- Links (URL Sources) ---
    const rawLinks = d.SourceLinks;
    const linksContainer = d3.select("#modal-links");
    const linksHeader = linksContainer.node().previousElementSibling;

    // Clear the container first
    linksContainer.html("");

    // Only proceed if there is text
    if (rawLinks && typeof rawLinks === 'string' && rawLinks.trim().length > 0) {

        // Ensure Header is visible and set proper text
        if (linksHeader && linksHeader.tagName === 'H4') {
            d3.select(linksHeader).text("RELEVANT LINKS").style("display", "block");
        }

        // Start list
        let listHtml = '<ul class="source-list">';
        // Split by the double-pipe delimiter
        const sourceList = rawLinks.split(" || ");

        sourceList.forEach(sourceItem => {
            if (!sourceItem || !sourceItem.trim()) return;

            // Safe Split
            const parts = sourceItem.split(" | ");

            // Handle cases where there might be no title
            let title = parts[0] ? parts[0].trim() : "Source";
            let url = parts[1] ? parts[1].trim() : "#";

            if (!url) url = "#";

            // Fallback
            if (parts.length === 1) {
                title = "Reference Link";
                url = parts[0].trim();
            }

            // Tag Extraction
            let badgeHtml = "";
            title = String(title);
            const tagMatch = title.match(/\((public|internal)\)/i);
            if (tagMatch) {
                const tagType = tagMatch[1].toLowerCase();
                const tagLabel = tagType.toUpperCase();
                badgeHtml = `<span class="tag-badge ${tagType}">${tagLabel}</span>`;
                title = title.replace(tagMatch[0], "").trim();
            }

            if (url && url !== "#") {
                listHtml += `<li>
                    <a href="${url}" target="_blank" class="source-link">
                        ${title} <span class="external-icon">↗</span>
                    </a>
                    ${badgeHtml}
                 </li>`;
            }
        });

        listHtml += '</ul>';
        linksContainer.html(listHtml);

    } else {
        // Hide Links section if empty
        linksContainer.html('');
        if (linksHeader) {
            d3.select(linksHeader).style("display", "none");
        }
    }

    // Show Overlay
    overlay.style("display", "flex")
        .transition().duration(300)
        .style("opacity", 1)
        .on("end", () => {
            overlay.classed("active", true); // Helper class for pointer events
        });

    // Disable Body Scroll
    d3.select("body").style("overflow", "hidden");

    // Close Button Handler
    d3.select("#close-btn").on("click", closeDetailView);

    // Close on background click
    overlay.on("click", function (event) {
        if (event.target === this) {
            closeDetailView();
        }
    });
}

function closeDetailView() {
    const overlay = d3.select("#detail-overlay");
    overlay.transition().duration(300)
        .style("opacity", 0)
        .on("end", () => {
            overlay.style("display", "none").classed("active", false);
            d3.select("body").style("overflow", null); // Re-enable scroll
        });
}

// Info Modal Logic
function openInfoModal() {
    const overlay = d3.select("#info-modal");

    // Show Overlay
    overlay.style("display", "flex")
        .transition().duration(300)
        .style("opacity", 1)
        .on("end", () => {
            overlay.classed("active", true);
        });

    d3.select("body").style("overflow", "hidden");

    // Handlers
    d3.select("#info-close-btn").on("click", closeInfoModal);
    overlay.on("click", function (event) {
        if (event.target === this) {
            closeInfoModal();
        }
    });
}

function closeInfoModal() {
    const overlay = d3.select("#info-modal");
    overlay.transition().duration(300)
        .style("opacity", 0)
        .on("end", () => {
            overlay.style("display", "none").classed("active", false);
            d3.select("body").style("overflow", null);
        });
}

init();
