// Configuration
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
        const name = d["Process Name"] || "";
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
        return (a["Process Name"] || "").localeCompare(b["Process Name"] || "");
    });

    // Assign Colors based on Process Unique Values
    // Distinct processes
    const processNamesSet = new Set(processedData.map(d => d["Process Name"]));
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
        const pIndex = processNames.indexOf(d["Process Name"]);
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
        .attr("data-process", d => d["Process Name"])
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
        .text(d => d["Risk Name"] || d["Risk Title"] || d["Risk"] || d["Sub-Process Name"] || "");

    // Generate Filter Controls
    createFilterControls(processNames, config.colors);

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
    const allBtn = container.append("button")
        .attr("class", "filter-btn active")
        .style("background-color", "#666")
        .text("Show All")
        .on("click", function () {
            // Reset state
            d3.selectAll(".filter-btn").classed("active", false);
            d3.select(this).classed("active", true);

            // Show all hexes
            d3.selectAll(".hex-group")
                .transition().duration(750)
                .style("opacity", 1)
                .style("pointer-events", "all");
        });

    // Add Process Buttons
    processNames.forEach((proc, i) => {
        const color = colors[i % colors.length];
        // Shorten name if too long? No, keep full name for clarity or maybe truncate?
        // User asked for "Process Name", so we use full name.

        container.append("button")
            .attr("class", "filter-btn")
            .style("background-color", color)
            .text(proc)
            .on("click", function () {
                // Update active state
                d3.selectAll(".filter-btn").classed("active", false);
                d3.select(this).classed("active", true);

                // Filter Hexes
                // Select all and transition
                d3.selectAll(".hex-group")
                    .transition().duration(750)
                    .style("opacity", (d) => d["Process Name"] === proc ? 1 : 0.1)
                    .style("pointer-events", (d) => d["Process Name"] === proc ? "all" : "none");
            });
    });

    // Add About/Methodology Button
    container.append("button")
        .attr("class", "filter-btn about-btn")
        .text("Methodology")
        .on("click", openInfoModal);
}

async function loadData() {
    try {
        const response = await fetch("./data/risk_matrix.xlsx"); // Correct relative path
        if (!response.ok) throw new Error("Fetch failed");
        const buf = await response.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws);
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

    // User requested: Process Name, "Name on Hexagon" (Risk Name), Risk Description
    tooltip.html(`
        <div style="margin-bottom: 5px; color: #aaa; font-size: 0.9em;">${d["Process Name"] || "Process"}</div>
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em;">${d["Risk Name"] || d["Sub-Process Name"] || "Risk"}</div>
        <div style="font-size: 0.9em; line-height: 1.4;">${d["Risk Description"] || "No description available."}</div>
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
        .text(d["Process Name"] || "Process");

    d3.select("#modal-subheader").text(d["Sub-Process Name"] || "");

    // Title: Risk Name preferred, else sub-process
    d3.select("#modal-title").text(d["Risk Name"] || d["Risk Title"] || d["Risk"] || d["Sub-Process Name"] || "Risk Detail");

    d3.select("#modal-desc").text(d["Risk Description"] || "No description provided.");

    // Sources and References
    const sources = d["Sources and References"] || d["Sources"] || d["References"];
    if (sources) {
        d3.select("#modal-sources").text(sources).style("display", "block");
        d3.select("#modal-sources").node().previousElementSibling.style.display = "block"; // Show header
    } else {
        d3.select("#modal-sources").style("display", "none");
        d3.select("#modal-sources").node().previousElementSibling.style.display = "none"; // Hide header
    }

    // Links (Placeholder logic as requested)
    const links = d["Links"] || d["External Links"];
    if (links) {
        d3.select("#modal-links").text(links);
    } else {
        d3.select("#modal-links").html("<em>No external links available yet.</em>");
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
