let svg = d3.select("#worldMap");
let width = +svg.attr("width");
let height = +svg.attr("height");

let projection = d3.geoMercator().scale(150).translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

let selectedCountry;

// Zoom behavior
let zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on('zoom', zoomed);

svg.call(zoom);

function zoomed(event) {
    svg.selectAll('path').attr('transform', event.transform);
}

d3.csv("internet-speeds-by-country-2023.csv").then(data => {
    let broadbandByCountry = {};
    data.forEach(d => {
        broadbandByCountry[d.country] = +d.broadband;
    });

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;

        let colorScale = d3.scaleQuantize([0, d3.max(data, d => Number(d.broadband))], d3.schemeGreens[9]);

        // Function to reset the appearance of all countries

        function resetAllCountries() {
            svg.selectAll("path")
                .style("stroke", "#000")
                .style("stroke-width", 0.5)
                .style("opacity", 1);
        }


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
            .style("stroke-width", 0.5)
            .style("opacity", 1)
            .on("mouseover", function (event, d) {   // Hover effect starts here
                d3.select(this)
                    .style("stroke", "#ff0000")  // Darker stroke on hover
                    .style("stroke-width", 3);  // Slightly thicker stroke on hover

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`${d.properties.name}<br>${broadbandByCountry[d.properties.name] ? broadbandByCountry[d.properties.name] + ' Mbps' : 'Data N/A'}`)
                    .style("left", (event.pageX + 28) + "px")
                    .style("top", (event.pageY - 50) + "px");

            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                    .style("stroke", "#000")  // Reset stroke color on hover out
                    .style("stroke-width", 0.5)  // Reset stroke width on hover out
            })    // Hover effect ends here
            .on("click", function (event, d) {
                event.stopPropagation();

                resetAllCountries();

                svg.selectAll("path")
                    .style("opacity", 0.2);

                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", 2)
                    .style("opacity", 1);

                let broadband = broadbandByCountry[d.properties.name];
                // if(broadband) {
                //     animateDownloadBar(broadband);
                // }
            });

        // Reset all countries when clicked outside of a country path
        d3.select(document).on("click", function (event) {
            if (event.target.tagName !== 'PATH') {
                resetAllCountries();
            }
        });

        let legendWidth = 450;
        let legendHeight = 25;

        let legend = svg.append("g")
            .attr("transform", `translate(${width - legendWidth - 20}, ${height - legendHeight - 20})`);

        // Define the linear gradient for the legend
        let gradient = legend.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        // Define the start of gradient
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(0))
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "33%")
            .attr("stop-color", colorScale(100))
            .attr("stop-opacity", 1);

        // Define the end of gradient
        gradient.append("stop")
            .attr("offset", "66%")
            .attr("stop-color", colorScale(200))
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(300))
            .attr("stop-opacity", 1);



        // Add a rectangle filled with the gradient
        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#gradient)")
            .style("stroke", "#000")
            .style("stroke-width", 1);

        // Add text to the start of legend
        legend.append("text")
            .attr("class", "legendText")
            .attr("x", 0)
            .attr("y", legendHeight + 10)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text("0");

        legend.append("text")
            .attr("class", "legendText")
            .attr("x", legendWidth / 3)
            .attr("y", legendHeight + 10)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text("100");

        legend.append("text")
            .attr("class", "legendText")
            .attr("x", legendWidth / 3 * 2)
            .attr("y", legendHeight + 10)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text("200");

        console.log(colorScale(100))

        legend.append("text")
            .attr("class", "legendText")
            .attr("x", legendWidth)
            .attr("y", legendHeight + 10)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(`300`);

    });


});

function resetAllCountries() {
    svg.selectAll("path")
        .style("stroke", "#000")
        .style("stroke-width", 0.5)
        .style("opacity", 1);
}

// The other functions (dragstarted, dragged, calculateDownloadTime, animateDownloadBar) remain unchanged...