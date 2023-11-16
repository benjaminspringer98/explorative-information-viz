const svg = d3.select("#worldMap");
const width = +svg.attr("width");
const height = +svg.attr("height");
const downloadBar = d3.select("#downloadBar");
const projection = d3.geoMercator().scale(150).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);
const timeInfo = document.getElementById("  ");

const colors = {
    hover: "#0D98BA",
    clicked: "#0D98BA",
}

const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', zoomed);

svg.call(zoom);

function zoomed(event) {
    svg.selectAll('path').attr('transform', event.transform);
}

function resetAllCountries() {
    svg.selectAll("path")
        .style("stroke", "#000")
        .style("stroke-width", 0.3)
        .style("opacity", 1);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;

    const timeStr = `${hours ? hours + " h " : ""} ${minutes ? minutes + " min " : ""} ${sec ? sec + " sec " : ""}`;
    return timeStr.trim();
}

d3.csv("data/internet-speeds-by-country-2023-in-megabyte-per-second.csv").then(data => {
    const broadbandByCountry = {};
    data.forEach(d => {
        broadbandByCountry[d.country] = +d.broadband;
    });

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;
        const colorScale = d3.scaleQuantize([0, d3.max(data, d => Number(d.broadband))], d3.schemeGreens[9]);
        const tooltip = d3.select("#tooltip");

        svg.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", path)
            .style("fill", d => {
                let broadband = broadbandByCountry[d.properties.name];
                return broadband ? colorScale(broadband) : "#ccc";
            })
            .style("stroke", "#000")
            .style("stroke-width", 0.3)
            .style("opacity", 1)
            // start hover effect
            .on("mouseover", function (event, d) {
                d3.select(this) // change color
                    .style("fill", colors.hover);
                tooltip.transition() // show tooltip
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`${d.properties.name}<br>${broadbandByCountry[d.properties.name] ? Math.round((broadbandByCountry[d.properties.name] + Number.EPSILON) * 100) / 100 + ' MB / sec' : 'Data N/A'}`)
                    .style("left", (event.pageX + 28) + "px")
                    .style("top", (event.pageY - 50) + "px");
            })
            // stop hover effect
            .on("mouseout", function (event, d) {
                d3.select(this) // reset color
                    .style("fill", d => {
                        let broadband = broadbandByCountry[d.properties.name];
                        return broadband ? colorScale(broadband) : "#ccc";
                    });
                tooltip.transition() // hide tooltip
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function (event, d) {
                event.stopPropagation();
                resetAllCountries();

                svg.selectAll("path") // reduce opacity of other countries
                    .style("opacity", 0.2);

                d3.select(this)
                    .style("fill", colors.clicked)
                    .style("stroke", "black")
                    .style("stroke-width", 0.7)
                    .style("opacity", 1);

                const broadband = broadbandByCountry[d.properties.name];
                if (!broadband) {
                    timeInfo.textContent = "No data";
                }
                animateDownloadBar(broadband)
            });

        // Reset all countries when clicked outside of a country path
        d3.select(document).on("click", function (event) {
            if (event.target.tagName !== 'PATH') {
                resetAllCountries();
            }
        });

        const legendHeight = 300;
        const legendWidth = 20;
        const legend = svg.append("g")
            .attr("transform", `translate(50, ${height / 2 - legendHeight / 2})`);

        legend.append("text")
            .attr("class", "legendTitle")
            .attr("x", -45)
            .attr("y", -20)
            .attr("text-anchor", "start")
            .style("font-weight", "bold")
            .style("font-size", "15px")
            .text("Megabytes / second");

        // Define the vertical gradient for the legend
        const gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%")
            .attr("spreadMethod", "pad");

        const max = 30;
        const step = 5;
        for (let i = 0; i <= max; i += step) {
            gradient.append("stop")
                .attr("offset", `${i / max * 100}%`)
                .attr("stop-color", colorScale(i))
                .attr("stop-opacity", 1);
        }

        // Add a rectangle filled with the vertical gradient
        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#gradient)")
            .style("stroke", "#000")
            .style("stroke-width", 1);

        const labels = [0, 5, 10, 15, 20, 25, 30];
        const labelYPositions = labels.map(l => legendHeight - (l / max * legendHeight));
        labelYPositions.forEach((pos, i) => {
            legend.append("text")
                .attr("class", "legendText")
                .attr("x", legendWidth + 5)
                .attr("y", pos)
                .attr("dy", ".35em")
                .style("text-anchor", "start")
                .text(labels[i]);
        });

    });

});

let animationFrameId = null; // Store the ID returned by requestAnimationFrame

function animateDownloadBar(broadbandInMbPerSecond) {
    // If an animation is ongoing, cancel it
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    downloadBar.interrupt();
    downloadBar.style("width", "0").text("");

    if (!broadbandInMbPerSecond) {
        return;
    }

    const fileSize = Number(document.getElementById("fileSize").value);
    const fileUnit = document.getElementById("fileUnit").value;

    let fileSizeInMb;
    switch (fileUnit) {
        case "MB":
            fileSizeInMb = fileSize;
            break;
        case "GB":
            fileSizeInMb = fileSize * 1000;
            break;
    }

    const ms = (fileSizeInMb / broadbandInMbPerSecond) * 1000; // milliseconds

    const startTime = Date.now();
    let lastUpdate = 0;
    let lastPercentage = 0;

    function updateText(elapsedMs) {
        const percentage = Math.min(100, (elapsedMs / ms) * 100);
        const elapsedSeconds = Math.round(elapsedMs / 1000);
        const totalSeconds = Math.round(ms / 1000);

        lastPercentage = Math.floor(percentage);
        // Show percentage inside the bar
        downloadBar.text(`${lastPercentage}%`);
        downloadBar.style("width", percentage + "%");

        const elapsedFormatted = formatTime(elapsedSeconds);
        const totalFormatted = formatTime(totalSeconds);
        // Display time info below the bar
        timeInfo.textContent = `(${elapsedFormatted ? elapsedFormatted : "0 sec"} / ${totalFormatted} total)`;
    }

    function animate() {
        const elapsed = Date.now() - startTime;

        if (elapsed >= ms) {
            updateText(ms);
            animationFrameId = null; // Reset the animation ID
            return; // stop the animation
        }

        if (Date.now() - lastUpdate >= 1000 || Math.floor((elapsed / ms) * 100) !== lastPercentage) {
            lastUpdate = Date.now();
            updateText(elapsed);
        } else {
            const percentage = Math.min(100, (elapsed / ms) * 100);
            downloadBar.style("width", percentage + "%");
        }

        animationFrameId = requestAnimationFrame(animate); // Store the ID returned by requestAnimationFrame
    }

    animate();
}