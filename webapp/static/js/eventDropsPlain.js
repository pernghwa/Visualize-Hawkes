var data = {lanes:[{id:0,label:"Process 0"},{id:1,label:"Process 1"},{id:2,label:"Process 2"}],items:[{
	        				id: 0,
	        				lane: 2,
	        				start: 2,
	        				end: 2,
                  value: 1,
	        				class: '',
	        				desc: '',
									label: "Process 2"
	        			}]}
  , lanes = data.lanes
  , items = data.items
  , now = 0
  , datadict = {0:{},1:{},2:{}};


var nodemap = {"Process 0": '#3182bd', "Process 1": '#fd8d3c', "Process 2": '#74c476'};
var namemap = {"0":"Process 0", "1":"Process 1","2":"Process 2"};
var grayscale = d3.scale.linear().domain([0,1.5]).range([238,30]);
var thres = 0.5;
var network_data;

datadict[2][2] = 0;

var margin = {top: 20, right: 15, bottom: 15, left: 80}
  , width = 650 - margin.left - margin.right
  , height = 200 - margin.top - margin.bottom
  , miniHeight = lanes.length * 0.4 + 30
  , mainHeight = height - miniHeight - 50;

var x = d3.scale.linear()
	.domain([0,30])
	.range([0, width]);
var x1 = d3.scale.linear().range([0, width]);

var ext = d3.extent(lanes, function(d) { return d.id; });
var y1 = d3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, mainHeight]);
var y2 = d3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

var chart = d3.select('#line-chart')
	.append('svg:svg')
	.attr('width', width + margin.right + margin.left)
	.attr('height', height + margin.top + margin.bottom)
	.attr('class', 'chart');

chart.append('defs').append('clipPath')
	.attr('id', 'clip')
	.append('rect')
		.attr('width', width)
		.attr('height', mainHeight);

var main = chart.append('g')
	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
	.attr('width', width)
	.attr('height', mainHeight)
	.attr('class', 'main');

var mini = chart.append('g')
	.attr('transform', 'translate(' + margin.left + ',' + (mainHeight + 60) + ')')
	.attr('width', width)
	.attr('height', miniHeight)
	.attr('class', 'mini');

// draw the lanes for the main chart

main.append('g').selectAll('.laneLines')
	.data(lanes)
	.enter().append('line')
	.attr('x1', 0)
	.attr('y1', function(d) { return d3.round(y1(d.id)) + 0.5; })
	.attr('x2', width)
	.attr('y2', function(d) { return d3.round(y1(d.id)) + 0.5; })
	.attr('stroke', function(d) { return d.label === '' ? 'white' : 'lightgray' });

main.append('g').selectAll('.laneText')
	.data(lanes)
	.enter().append('text')
	.text(function(d) { return d.label; })
	.attr('x', -10)
	.attr('y', function(d) { return y1(d.id + .5); })
	.attr('dy', '0.5ex')
	.attr('text-anchor', 'end')
	.attr('class', 'laneText');

// draw the lanes for the mini chart
mini.append('g').selectAll('.laneLines')
	.data(lanes)
	.enter().append('line')
	.attr('x1', 0)
	.attr('y1', function(d) { return d3.round(y2(d.id)) + 0.5; })
	.attr('x2', width)
	.attr('y2', function(d) { return d3.round(y2(d.id)) + 0.5; })
	.attr('stroke', function(d) { return d.label === '' ? 'white' : 'lightgray' });

mini.append('g').selectAll('.laneText')
	.data(lanes)
	.enter().append('text')
	.text(function(d) { return d.label; })
	.attr('x', -10)
	.attr('y', function(d) { return y2(d.id + .5); })
	.attr('dy', '0.5ex')
	.attr('text-anchor', 'end')
	.attr('class', 'laneText');

// draw the x axis
var xDateAxis = d3.svg.axis()
	.scale(x)
	.orient('bottom')
	.ticks(15)
	.tickSize(6, 0, 0);

var x1DateAxis = d3.svg.axis()
	.scale(x1)
	.orient('bottom')
	.ticks(30)
	.tickSize(6, 0, 0);

main.append('g')
	.attr('transform', 'translate(0,' + mainHeight + ')')
	.attr('class', 'main axis date')
	.call(x1DateAxis);

mini.append('g')
	.attr('transform', 'translate(0,' + miniHeight + ')')
	.attr('class', 'axis date')
	.call(xDateAxis);

// draw the items
var itemRects = main.append('g')
	.attr('clip-path', 'url(#clip)');

mini.append('g').selectAll('miniItems')
	.data(items)
	.enter().append('circle')
	.attr('class', function(d) { return 'data'; })
	.attr('cx', function(d) { return x(d.start); })
  .attr('cy', function(d) { return y2(d.lane)+ .5 * y2(1);})
  .attr('r', function(d){return d.value *3})
  .style("fill",function(d){return nodemap['Process '+(d.lane)];})
  .style("opacity",0.8);

// invisible hit area to move around the selection window
mini.append('rect')
	.attr('pointer-events', 'painted')
	.attr('width', width)
	.attr('height', miniHeight)
	.attr('visibility', 'hidden')
	.on('mouseup', moveBrush);

// draw the selection area
var brush = d3.svg.brush()
	.x(x)
	.extent([0,15])
	.on("brush", display);

mini.append('g')
	.attr('class', 'x brush')
	.call(brush)
	.selectAll('rect')
		.attr('y', 1)
		.attr('height', miniHeight - 1);

mini.selectAll('rect.background').remove();
display();

chart.on('click',function(d,i){
var coords = d3.mouse(this);
var cx = Math.round(x1.invert(coords[0]-margin.left)), laney = Math.floor(y1.invert(coords[1]-margin.top));
if (cx <=0 || laney > 2 ) return;
if (cx in datadict[laney] || cx == 0) return;
data.items.push({id: data.items.length,lane: laney,start: cx,end: cx,value: 1,
	class: '',desc: '',label:data.lanes[laney].label});
datadict[laney][cx] = 0;
items = data.items;
display();
});

// slider
d3.select("#edge-slider").call(d3.slider()
		.min(0)
		.max(1)
		.value(0)
		.orientation("vertical").on("slide", function(evt, value) {
  d3.select('#slidertext').text("Weight threshold: "+String(value).substring(0,4));
	thres = value;
	filter_edge_color();
	//draw_network(network_data);
}));

// clear time series elements
d3.select('#clear-btn').on('click',cleardata);

// execute modeling training
d3.select('#run-btn').on('click',execute_model);

function cleardata(){
	data.items = [];
	items = data.items;
	datadict = {0:{},1:{},2:{}};
	display();
	d3.select("#network").html("");
	d3.select("#inferred").html("");
	d3.select("#response").html("");
	d3.select("#background").html("");
}

function execute_model(){
	$.ajax({
	    type: 'POST',
	    url: submit_data_url,
	    data: JSON.stringify({'data':data.items}),
	    dataType: 'json',
	    contentType: 'application/json; charset=utf-8'
	}).done(function(nn) {
		var network = [];
		nn.network.forEach(function(i,d){
			network.push(i);
		})
		show_results(network,nn);
	});
}

var multiple=false;

function show_results(network,data){
	d3.select("#inferred").html("")
	var rate = JSON.parse(data.rate);
	for(var i=0; i< 3; i++){
		d3.select("#inferred").append('svg').attr('id','infer'+i).style("height","120");
		draw_stack("infer"+i,rate[String(i)],i);
	}
	var response = JSON.parse(data.response);
	//console.log(response);
	d3.select("#response").html("");
	console.log(JSON.parse(data.response));
	for(var i=0; i<3; i++){
		d3.select("#response").append('svg').attr('id','response'+i).style("height","120");
		draw_lines("response"+i,response[String(i)],i,multiple);
	}
	network_data = network;
	draw_network(network);
}

function draw_stack(dom_name,data,k){
	nv.addGraph(function() {
	var chart = nv.models.stackedAreaChart()
	                .x(function(d) { return d[0] })
	                .y(function(d) { return d[1] })
	                .clipEdge(true);

		if(k < 2){
				chart.xAxis
						.showMaxMin(false)
						.tickFormat(d3.format(',r'));
									}
		else{
				chart.xAxis
						.showMaxMin(false)
						.axisLabel('Time')
						.tickFormat(d3.format(',r'));
		}

	  chart.yAxis
    		.axisLabel('Intensity')
	      .tickFormat(d3.format(',.2f'));

	  d3.select('#'+dom_name)
	    .datum(data)
	      .transition().duration(500).call(chart);

	  nv.utils.windowResize(chart.update);

	  return chart;
	});
}

function draw_lines(dom_name,dd,k,multiple){
		nv.addGraph(function() {
		var data = [];
		if(multiple){
			for(var idx=0; idx<3; idx++){
				var item = dd[String(idx)];
				var tmp = {key:"Process: "+k+"->"+idx,values:[]};
				for(var j=0; j < item.values.length;j++){
					var array = item.values[j];
					tmp.values.push({x:array.x,y:array.y});
				}
				data.push(tmp);
			}
		}
		else{
			var tmp = {key:"Process: "+k, values:[]};
			for(var j=0; j< dd.values.length; j++){
				var array = dd.values[j];
				tmp.values.push({x:array.x,y:array.y})
			}
			data.push(tmp);
		}
		console.log(data);
  	var chart = nv.models.lineChart();
		chart.height('120');
		if(k < 2){
  		chart.xAxis
    		.tickFormat(d3.format(',r'));
		}
		else{
			chart.xAxis
    		.axisLabel('Time')
    		.tickFormat(d3.format(',r'));
		}


  	chart.yAxis
    	.axisLabel('Intensity')
    	.tickFormat(d3.format('.02f'));

  	d3.select('#'+dom_name)
    	.datum(data)
    	.transition().duration(500)
    	.call(chart);

  	nv.utils.windowResize(chart.update);

  	return chart;
		});
}

function display () {
  mini.selectAll('circle').remove();
  mini.selectAll('miniItems')
    .data(items)
    .enter().append('circle')
    .attr('class', function(d) { return 'data'; })
    .attr('cx', function(d) { return x(d.start); })
    .attr('cy', function(d) { return y2(d.lane)+ .5 * y2(1);})
    .attr('r', function(d){var r = d.value * 3;
    if (r > 5) r = 5 + d.value/5 * 0.3;
    return r; })
    .style("fill",function(d){return nodemap['Process '+(d.lane)];})
    .style("opacity",0.8);

	var rects, labels
	  , minExtent = brush.extent()[0]
	  , maxExtent = brush.extent()[1]
	  , visItems = items.filter(function (d) { return d.start < maxExtent && d.end > minExtent});

  if(minExtent<0)minExtent=0;
	mini.select('.brush').call(brush.extent([minExtent, maxExtent]));

	x1.domain([minExtent, maxExtent]);

	if ((maxExtent - minExtent) > 30) {
		x1DateAxis.ticks(30)
	}
	else {
		x1DateAxis.ticks((maxExtent - minExtent))
	}

	// update the axis
	main.select('.main.axis.date').call(x1DateAxis);
  itemRects.selectAll('circle').remove();
	// upate the item rects
	rects = itemRects.selectAll('circle')
		.data(visItems, function (d) { return d.id; });

	rects.enter().append('circle')
		.attr('cx', function(d) { return x1(d.start); })
		.attr('cy', function(d) { return y1(d.lane) + .5 * y1(1); })
		.attr('r', function(d) {
      var r = d.value * 5;
      if (r > 8) r = 8 + d.value/8 * 0.4;
      return r; })
		.attr('class', function(d) { return 'data'; })
    .on('click', function(d){
      d.value += 1;
      display();})
    .style("fill",function(d){return nodemap['Process '+(d.lane)];})
    .style("opacity",0.8);

	rects.exit().remove();

}

function moveBrush () {
	var origin = d3.mouse(this)
	  , point = x.invert(origin[0])
	  , halfExtent = (brush.extent()[1] - brush.extent()[0]) / 2
	  , start = point - halfExtent
	  , end = point + halfExtent;

	brush.extent([start,end]);
	display();
}

// generates a single path for each item class in the mini display
// ugly - but draws mini 2x faster than append lines or line generator
// is there a better way to do a bunch of lines as a single path with d3?
function getPaths(items) {
	var paths = {}, d, offset = .5 * y2(1) + 0.5, result = [];
	for (var i = 0; i < items.length; i++) {
		d = items[i];
		if (!paths[d.class]) paths[d.class] = '';
		paths[d.class] += ['M',x(d.start),(y2(d.lane) + offset),'H',x(d.end+1)].join(' ');
	}

	for (var className in paths) {
		result.push({class: className, path: paths[className]});
	}

	return result;
}

////////////////////////////////////////////////////////////////////////////////
// Draw network
////////////////////////////////////////////////////////////////////////////////
// enable point dragging
var radius = 20,
		width_net = 300,
		height_net = 200;

var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("drag", dragmove);

function dragmove(d) {
  d3.select(this)
      .attr("cx", d.x = Math.max(radius, Math.min(width_net - radius, d3.event.x)))
      .attr("cy", d.y = d.y);
}

// get the data
d3.csv("static/data/force.csv", function(error, links) {
	network_data = links;
	draw_network(links);
});

function filter_edge_color(){
	d3.selectAll("#net_svg .link")
		.style("stroke",function(d){var s = grayscale(d.value);
			if (d.value < thres) return d3.rgb(256,256,256);
			return d3.rgb(s,s,s);});
	d3.selectAll("#net_svg .textlabel")
		.style("stroke",function(d,i){
			//console.log(network_data[i]);
			if(network_data[i].value < thres) return "white";
			else return "black";
		});
}

function draw_network(inlinks){
	// clear current #network <div> content and renew with new svg
	d3.select("#network").html("");

	var svg_net = d3.select("#network").append("svg")
						.attr("id","net_svg")
				    .attr("width", width_net)
				    .attr("height", height_net);

	var nodes = {};
	var links = inlinks.filter(function(d){return d.value > thres;});
	var links = inlinks;
	// Compute the distinct nodes from the links.
	links.forEach(function(link) {
	    link.source = nodes[link.source] ||
	        (nodes[link.source] = {name: link.source});
	    link.target = nodes[link.target] ||
	        (nodes[link.target] = {name: link.target});
	    link.value = +link.value;
	});

	var force = d3.layout.force()
	    .nodes(d3.values(nodes))
	    .links(links)
	    .size([width_net, height_net])
	    .linkDistance(120)
	    .charge(-300)
	    .on("tick", tick)
	    .start();

	// build the arrow.
	svg_net.append("svg:defs").selectAll("marker")
	    .data(["end"])      // Different link/path types can be defined here
	  .enter().append("svg:marker")    // This section adds in the arrows
	    .attr("id", String)
	    .attr("viewBox", "0 -5 10 10")
	    .attr("refX", 15)
	    .attr("refY", -1.5)
	    .attr("markerWidth", 6)
	    .attr("markerHeight", 6)
	    .attr("orient", "auto")
			.style("fill",d3.rgb(150,150,150))
	  .append("svg:path")
	    .attr("d", "M0,-5L10,0L0,5");

	// add the links and the arrows
	var path = svg_net.append("svg:g").selectAll("path")
	    .data(links)
	  .enter().append("svg:path")
	//    .attr("class", function(d) { return "link " + d.type; })
	    .attr("class", "link")
			.attr("id", function(d,i){return "path"+i;})
			.style("stroke",function(d){var s = grayscale(d.value); return d3.rgb(s,s,s);})
	    .attr("marker-end", "url(#end)");

	links.forEach(function(d,i){
		svg_net.append("text")
			.attr("x",1)
			.attr("dy","-.5em")
			.append("textPath")
			.attr("class","textlabel")
			.attr("stroke","black")
			.attr("stroke-width","0.5px")
			.attr("xlink:href",function(){return "#path"+i;})
			.attr("startOffset","50%")
			.text(function(){ return "\t\t"+String(d.value).substring(0,4);});
		});

	// define the nodes
	var node = svg_net.selectAll(".node")
	    .data(force.nodes())
	  .enter().append("g")
	    .attr("class", "node")
	    .call(force.drag);

	// add the nodes
	node.append("circle")
	    .attr("r", 5)
	    .style("fill",function(d){return nodemap[d.name];})
	    .style("opacity",0.8);

	// add the text
	node.append("text")
	    .attr("x", 12)
	    .attr("dy", ".35em")
	    .text(function(d) { return d.name; });

	// add the curvy lines
	function tick() {
	    path.attr("d", function(d) {
	        var dx = d.target.x - d.source.x,
	            dy = d.target.y - d.source.y,
	            dr = Math.sqrt(dx * dx + dy * dy);
	        return "M" +
	            d.source.x + "," +
	            d.source.y + "A" +
	            dr + "," + dr + " 0 0,1 " +
	            d.target.x + "," +
	            d.target.y;
	    });

	    node
	        .attr("transform", function(d) {
	  	    return "translate(" + d.x + "," + d.y + ")"; });
	}
}
