var vars = ["distance", "avgspeed", "duration", "maxspeed"];
var xLabSel = vars[0];
var yLabSel = vars[1];
var zLabSel = vars[2];

//-------------------------------------------------------------------
// Menu for variables with ith element selected by default
//-------------------------------------------------------------------
buildDropDown = function(varid){

	d3.select(".varselector").append("select")
		.attr("id", varid)
	    .on("change", selectVars)
		.selectAll("option")
		.data(vars).enter().append("option")
		    .attr("value", function(d){ return d; }) /* Optional */
		    .attr("selected", function(d) { if (d==vars[varid]) return "selected";})
		    .text(function(d){ return d; });
}

//-------------------------------------------------------------------
// Scatter plot with regression line
//-------------------------------------------------------------------
scatterFromJson = function(elem, data) {

	data.forEach(function(d){ d.date = dateFormat.parse(d.date); });
	data.forEach(function(d){ d.duration = d.duration / 3600; });

	buildDropDown(0);
	buildDropDown(1);
	buildDropDown(2);

	scatter(elem, data, xLabSel, yLabSel, zLabSel);	
}

//-------------------------------------------------------------------
// 
//-------------------------------------------------------------------
selectVars = function(){
	var varid = this.id;
	if(varid == 0)
		xLabSel = this.options[this.selectedIndex].value;
	else if(varid == 1)
		yLabSel = this.options[this.selectedIndex].value;
	else if(varid == 2)
		zLabSel = this.options[this.selectedIndex].value;

	console.log(xLabSel, yLabSel, zLabSel);
}

//-------------------------------------------------------------------
// Array helpers
//-------------------------------------------------------------------
arrayForKey = function(dat, key) {
	return d3.map(dat.map(function(d){ return d[key]; })).values();
}

vectorForKey = function(dat, key) {
	return Vector.create(arrayForKey(dat, key));
}

//-------------------------------------------------------------------
// Standard deviation
//-------------------------------------------------------------------
sd = function(x) {
  var n = x.length;

  if (n < 1) return NaN;
  if (n === 1) return 0;

  var mean = d3.mean(x),
      i = -1,
      s = 0;

  while (++i < n) {
    var v = x[i] - mean;
    s += v * v;
  }

  return Math.sqrt(s / n);
};

//-------------------------------------------------------------------
// Correlation coefficient
//-------------------------------------------------------------------
corr = function(x, y, meanx, meany, sdx, sdy) {
  //console.log(x);
  //console.log(y);

  var n = x.length;

  if (n < 1) return NaN;
  if (n === 1) return 0;

  var i = -1;
  var c = 0;

  // Mean of mean-adjusted variable multiple (dot product)
  while (++i < n) {
    c += (x[i] - meanx) * (y[i] - meany);
    //console.log(i, x[i], y[i]);
  }

  c /= n;

  return c / (sdx * sdy);
}


//-------------------------------------------------------------------
// Linear regression
//-------------------------------------------------------------------
linearRegression = function(dat, xlab, ylab) {
	
	var x = arrayForKey(dat, xlab);
	var y = arrayForKey(dat, ylab);
	var mux = d3.mean(x);
	var muy = d3.mean(y);
	var sdx = sd(x);
	var sdy = sd(y);
	console.log("LinReg Stats: ", mux, muy, sdx, sdy);

	var cor = corr(x, y, mux, muy, sdx, sdy);
	console.log("LinReg corr: ", cor);

	var b = cor * (sdy / sdx);
	var a = muy - (b * mux);
	console.log("LinReg factors: ", a,b);

	return [a,b];
}

//-------------------------------------------------------------------
// Draw line from intercept and slope
//-------------------------------------------------------------------
drawline = function(elem, factors, x1, x2, xscale, yscale){

  	//console.log(factors);
	line = elem.append("line")
	    .attr(
	    {
	    	"class" : "line",
	        "x1" : xscale(x1),
	        "x2" : xscale(x2),
	        "y1" : yscale(factors[0]),
	        "y2" : yscale(factors[0] + factors[1]*x2),
	        "fill" : "none",
	        "shape-rendering" : "crispEdges",
	        "stroke" : "red",
	        "stroke-width" : "1px"
    });
}

//-------------------------------------------------------------------
// Scatter chart
//-------------------------------------------------------------------
scatter = function(id, dat, xlab, ylab, zlab) {

	// Setup
	var margin = {top: 10, right: 40, bottom: 100, left: 40};
	var width = 800 - margin.left - margin.right;
	var height = 500 - margin.top - margin.bottom;
	
	include0 = false;

	// Create scales and axis
	xdomain = [0, d3.max(dat, function(d) { return d[xlab]; })];
	var x = d3.scale.linear().domain(xdomain).nice().rangeRound([0, width]); 

	if (include0)
		var ydomain = [0, d3.max(dat, function(d) { return d[ylab]; })];
	else
		var ydomain = d3.extent(dat, function(d) { return d[ylab]; });
	var y = d3.scale.linear().domain(ydomain).nice().range([height, 0]);

	//zdomain = [0, d3.max(dat, function(d) { return d[zlab]; })];
	zdomain = d3.extent(dat, function(d) { return d[zlab]; });
	var z = d3.scale.linear().domain(zdomain).range([2,10]);

	// Create axes
	var xAxis = d3.svg.axis().scale(x).orient("bottom")
	var yAxis = d3.svg.axis().scale(y).orient("left");

	// Create svg container for chart
	var svg = d3.select(id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Append axes
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		.append("text")
		  .attr("y", -8)
		  .attr("x", width)
		  .style("text-anchor", "end")
		  .text(runMapper[xlab]["label"]);

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
		  .attr("transform", "rotate(-90)")
		  .attr("y", 6)
		  .attr("dy", ".71em")
		  .style("text-anchor", "end")
		  .text(runMapper[ylab]["label"]);

	// Create tooltip
	tip = d3.tip().attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) { return d[ylab].toFixed(2); });

	svg.call(tip);

	// Create marks
	var bars = svg.selectAll(".dots")
		.data(dat, function(d) { return d[xlab]; })
		.enter().append("svg:circle")
		.on('mouseover', function(d) { tip.show(d); } )
		.on('mouseout', tip.hide)
		.attr("cx", function(d) { return x(d[xlab]); })
		.attr("cy", function(d) { return y(d[ylab]); })
		.attr("r", function(d) { return z(d[zlab]); })
		.attr("class", "dot");	

	// Draw regression line
	factors = linearRegression(dat, xlab, ylab);
	drawline(svg, factors, 0, xdomain[1], x, y);
}
	