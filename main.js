let svg = d3.select("#worldMap");
let width = +svg.attr("width");
let height = +svg.attr("height");
let downloadBar = d3.select("#downloadBar");

let projection = d3.geoMercator().scale(150).translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

let selectedCountry;

let zoom = d3.zoom()
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
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    let sec = seconds % 60;

    let timeStr = `${hours ? hours + " h " : ""} ${minutes ? minutes + " min " : ""} ${sec ? sec + " sec " : ""}`;
    return timeStr.trim();
}

d3.csv("internet-speeds-by-country-2023-in-megabyte-per-second.csv").then(data => {
    let broadbandByCountry = {};
    data.forEach(d => {
        broadbandByCountry[d.country] = +d.broadband;
    });

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;

        let colorScale = d3.scaleQuantize([0, d3.max(data, d => Number(d.broadband))], d3.schemeGreens[9]);

        let tooltip = d3.select("#tooltip");

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
                    .style("fill", "#fa4343");
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

                d3.select(this) // change color
                    .style("fill", "#f50a0a");
                svg.selectAll("path") // reduce opacity of another countries
                    .style("opacity", 0.2);

                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", 1)
                    .style("opacity", 1);

                let broadband = broadbandByCountry[d.properties.name];

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


        let legend = svg.append("g")
            .attr("transform", `translate(50, ${height / 2 - legendHeight / 2})`); // Vertically centered and to the left side

        legend.append("text")
            .attr("class", "legendTitle")
            .attr("x", -50)
            .attr("y", -20)
            .attr("text-anchor", "start")
            .style("font-weight", "bold")
            .style("font-size", "15px")
            .text("Megabyte / second");

        // Define the vertical gradient for the legend
        let gradient = legend.append("defs")
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

        // Adjust the legend labels for the vertical orientation
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

    let fileSize = Number(document.getElementById("fileSize").value);
    let fileUnit = document.getElementById("fileUnit").value;

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

    let startTime = Date.now();
    let lastUpdate = 0;
    let lastPercentage = 0;

    function updateText(elapsedMs) {
        let percentage = Math.min(100, (elapsedMs / ms) * 100);
        let elapsedSeconds = Math.round(elapsedMs / 1000);
        let totalSeconds = Math.round(ms / 1000);

        lastPercentage = Math.floor(percentage);
        // Show percentage inside the bar
        downloadBar.text(`${lastPercentage}%`);
        downloadBar.style("width", percentage + "%");

        let elapsedFormatted = formatTime(elapsedSeconds);
        let totalFormatted = formatTime(totalSeconds);
        // Display time info below the bar
        let timeInfo = document.getElementById("timeInfo");
        timeInfo.textContent = `(${elapsedFormatted ? elapsedFormatted : "0 sec"} / ${totalFormatted} total)`;
    }

    function animate() {
        let elapsed = Date.now() - startTime;

        if (elapsed >= ms) {
            updateText(ms);
            animationFrameId = null; // Reset the animation ID
            return; // stop the animation
        }

        if (Date.now() - lastUpdate >= 1000 || Math.floor((elapsed / ms) * 100) !== lastPercentage) {
            lastUpdate = Date.now();
            updateText(elapsed);
        } else {
            let percentage = Math.min(100, (elapsed / ms) * 100);
            downloadBar.style("width", percentage + "%");
        }

        animationFrameId = requestAnimationFrame(animate); // Store the ID returned by requestAnimationFrame
    }

    animate();
}


// Get the modal and its elements
const modal = document.getElementById('myModal');
const btn = document.getElementById('openModalBtn');
const span = document.getElementsByClassName('close')[0];

btn.onclick = function () {
    modal.style.display = 'block';
    setTimeout(function () {
        modal.style.opacity = '1'; // Fade in the modal
        modal.querySelector('.modal-content').style.opacity = '1'; // Fade in the modal content
    }, 10); // Short delay to ensure that display:block has been applied first
}

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
    modal.style.opacity = '0'; // Fade out the modal
    modal.querySelector('.modal-content').style.opacity = '0'; // Fade out the modal content
    setTimeout(function () {
        modal.style.display = 'none';
    }, 300); // Delay equal to the transition duration
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.opacity = '0'; // Fade out the modal
        modal.querySelector('.modal-content').style.opacity = '0'; // Fade out the modal content
        setTimeout(function () {
            modal.style.display = 'none';
        }, 300); // Delay equal to the transition duration
    }
}











