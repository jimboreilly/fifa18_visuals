var potentialSvg = d3.select("#potential");

var width = potentialSvg.attr("width");
var height = potentialSvg.attr("height");

//paddings for minimized size of graph to fit labels/title
var xPadding = 80;
var yPadding = 80;
// Define variables outside the scope of the callback function.
var playerData;

var ageRange = [21, 26];
var valueRange;

var numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

var groupByArray = function (xs, key) {
  return xs.reduce(function (rv, x) {
    let v = key instanceof Function ? key(x) : x[key];
    let el = rv.find((r) => r && r.key === v);
    if (el) { el.values.push(x); }
    else { rv.push({ key: v, values: [x] }); } return rv;
  }, []);
}

// This function will be applied to all rows. Select three columns, change names, and convert strings to numbers.
function parseLine(line) {
  return {
    Name: line["name"],
    Overall: parseInt(line["overall"]),
    Potential: parseInt(line["potential"]),
    Age: parseInt(line["age"]),
    Value: parseInt(line["eur_value"]),
  };
}

d3.csv("data/Fifa18.csv", parseLine, function (error, data) {
  playerData = data;

  playerData = playerData.map(function (player) {
    player.Growth = player.Potential - player.Overall
    return player
  });


  ageExtent = d3.extent(playerData, function (d) { return d.Age; });
  valueExtent = d3.extent(playerData, function (d) { return d.Value; });

  valueRange = valueExtent;

  initializeSliders(ageExtent, valueExtent);

  update();
});

function update() {
  //remove all content from svg
  potentialSvg.selectAll("g > *").remove();
  potentialSvg.selectAll("text").remove();
  potentialSvg.selectAll("circle").remove();

  filteredData = playerData.filter(player =>
    player.Age > ageRange[0] && player.Age < ageRange[1]
    && player.Value > valueRange[0] && player.Value < valueRange[1]
  );

  playerDataByOverall = groupByArray(filteredData, 'Overall');

  //key: Overall values: Array[key: Potential values: Array[Players @ (ovr, pot)]]
  var playersByOverallAndPotential = playerDataByOverall.map(function (overall) {
    var result = {
      Overall: overall.key,
      Potentials: new Array()
    };
    result.Potentials = groupByArray(overall.values, 'Potential');
    return result;
  })

  overallScale = d3.scaleLinear()
    .domain(d3.extent(playerData, function (d) { return d.Overall; }))
    .range([xPadding, width - xPadding])

  potentialScale = d3.scaleLinear()
    .domain(d3.extent(playerData, function (d) { return d.Potential; }))
    .range([height - yPadding, yPadding])

  growthScale = d3.scaleLinear()
    .domain(d3.extent(playerData, function (d) { return d.Growth; }))
    .range([height - yPadding, yPadding]);

  plotGrowthOverInitialOverall(potentialSvg, playersByOverallAndPotential, overallScale, growthScale)
}

function plotGrowthOverInitialOverall(svg, playerData, overallScale, growthScale) {
  playerData.map(function (overallIndex) {
    overallIndex.Potentials.map(function (potentialIndex) {
      svg.append("circle")
        .attr("cx", overallScale(overallIndex.Overall))
        .attr("cy", growthScale(potentialIndex.key - overallIndex.Overall))
        .attr("r", 4)
        .style("fill", "#45b3e7")
        .style("opacity", 0.15 * potentialIndex.values.length)
        .on("click", function () {
          console.log(potentialIndex.values);
          tableUpdate(potentialIndex.key, overallIndex.Overall, potentialIndex.values);
        });
    })
  })

  //x-axis, current overall rating
  var bottomAxis = d3.axisBottom(overallScale)
  svg.append("g")
    .attr("transform", "translate(0," + (height - xPadding) + ")")
    .attr("class", "xaxis")
    .call(bottomAxis);

  //y-axis, growth in overall
  var leftAxis = d3.axisLeft(growthScale);
  svg.append("g")
    .attr("class", "yaxis")
    .attr("transform", "translate(" + yPadding + ", 0)")
    .call(leftAxis);

  //x-axis label
  svg.append("text")
    .attr("transform", "translate(" + (width / 2.3) + "," + (height - (xPadding / 2)) + ")")
    .text("Initial Overall");

  //y-axis label, rotated to be vertical text
  svg.append("text")
    .attr("transform", "translate(" + yPadding / 3 + "," + (height / 1.7) + ")rotate(270)")
    .text("Growth");

}

function tableUpdate(potential, overall, players) {
  console.log(players);
  rows = d3.select("table") // UPDATE
    .selectAll("tbody")
    .selectAll("tr")
    .data(players);

  rows.exit().remove(); // EXIT

  rows.enter() //ENTER + UPDATE
    .append('tr')
    .selectAll("td")
    .data(function (d) { return [d.Name, d.Overall, d.Potential, d.Age, numberWithCommas(d.Value)] })
    .enter()
    .append("td")
    .text(function (d) { return d; });

  var cells = rows.selectAll('td') //update existing cells
    .data(function (d) { return [d.Name, d.Overall, d.Potential, d.Age, numberWithCommas(d.Value)]; })
    .text(function (d) { return d; });

  cells.enter()
    .append("td")
    .text(function (d) { return d; });

  cells.exit().remove();

}

function initializeSliders(ageExtent, valueExtent) {
  $(function () {
    $("#age-range-slider").slider({
      range: true,
      min: ageExtent[0],
      max: ageExtent[1],
      values: ageRange,
      slide: function (event, ui) {
        $("#age").val(ui.values[0] + " - " + ui.values[1]);
      },
      stop: function (event, ui) {
        ageRange = [ui.values[0], ui.values[1]];
        update();
      }
    });
    $("#age").val($("#age-range-slider").slider("values", 0) +
      " - " + $("#age-range-slider").slider("values", 1));
  });

  $(function () {
    $("#value-range-slider").slider({
      range: true,
      min: valueExtent[0],
      max: valueExtent[1],
      values: valueRange,
      slide: function (event, ui) {
        $("#value").val(numberWithCommas(ui.values[0]) + " - " + numberWithCommas(ui.values[1]));
      },
      stop: function (event, ui) {
        valueRange = [ui.values[0], ui.values[1]];
        update();
      }
    });
    $("#value").val(numberWithCommas(valueExtent[0] + " - " + numberWithCommas(valueExtent[1])));
  });
}