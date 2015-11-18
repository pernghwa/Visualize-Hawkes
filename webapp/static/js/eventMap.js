var grayscale = d3.scale.linear().domain([0,1.5]).range([238,30]);
var thres = 0.5;
var network_data;

// execute modeling training
d3.select('#run-btn').on('click',execute_model);

function cleardata(){
	d3.select("#network").html("");
	d3.select("#inferred").html("");
	d3.select("#line-chart").html("");
}

function execute_model(){
	var topic = d3.select(".btn-md.active").attr("id");
	var g1 = d3.select("#row1-groups .default-hover-active");
	var gid1 = null;
	if(g1[0][0])gid1 = g1.attr("id");
	var p1 = d3.select("#row1-entities .activated");
	var pid1 = null;
	if(!p1[0][0]) pid1 = "aggregated";
	else pid1 = p1.attr("id");
	var gid2 = null;
	var g2 = d3.select("#row2-groups .default-hover-active");
	if(g2[0][0]) gid2 = g2.attr("id");
	var p2 = d3.select("#row2-entities .activated");
	var pid2 = null;
	if(!p2[0][0]) {console.log(p2);pid2 = "aggregated";}
	else {console.log(p2);pid2 = p2.attr("id");}
	console.log(gid1);
	console.log(gid2);
	console.log(pid1);
	console.log(pid2);
	/*$.ajax({
	    type: 'POST',
	    url: submit_voice_url,
	    data: JSON.stringify({"topic":topic,"group_in":gid1,"group_out":gid2,"person_in":pid1,"person_out":pid2}),
	    dataType: 'json',
	    contentType: 'application/json; charset=utf-8'
	}).done(function(nn) {
		var network = [];
		nn.network.forEach(function(i,d){
			network.push(i);
		})
		show_results(network,nn);
	});*/
}

var data_rate = {rate:[
        {"key":"Scott Walker","values":[[1441171156000,86],[1439080246000,135],[1437529453000,1261],[1437161488000,188]]},
        {"key":"Jeb Bush","values":[[1441171156000,127],[1439080246000,0],[1437529453000,0],[1437161488000,0]]},
        {"key":"Donald Trump","values":[[1441171156000,1227],[1439080246000,1000],[1437529453000,0],[1437161488000,0]]},
        {"key":"Hillary Clinton","values":[[1441171156000,12700],[1439080246000,50],[1437529453000,3000],[1437161488000,2000]]},
        {"key":"Ben Carson","values":[[1441171156000,10],[1439080246000,100],[1437529453000,20],[1437161488000,20]]}
        ]}

show_results(null,data_rate);

function show_results(network,data){
	d3.select("#inferred").html("")
	//var rate = JSON.parse(data.rate);
	var rate = data.rate;
	d3.select("#inferred").append('svg').attr('id','infer').style("height","420");
	draw_stack("infer",rate);
	
	network_data = network;
	//draw_network(network);
}

function draw_stack(dom_name,data){
	nv.addGraph(function() {
	var chart = nv.models.stackedAreaChart()
	                .x(function(d) { return d[0] })
	                .y(function(d) { return d[1] })
	                .clipEdge(true)
	                .width(700).height(350)
	                .useInteractiveGuideline(true) 
	                .showControls(false)
	                .margin({top:50,right:30,bottom:50,left:130});

	chart.color(function (d, i) {
    		var colors = d3.scale.category20().range();
    		return colors[i % colors.length];
		})

	  chart.xAxis
			.showMaxMin(false)
			.axisLabel('Time')
			.tickFormat(function(d) { 
          		return d3.time.format('%x')(new Date(d)) 
    		});

	  chart.yAxis
    		.axisLabel('Intensity')
	        .tickFormat(d3.format(',.2f'));
	  console.log(data);
	  d3.select('#'+dom_name)
	        .datum(data)
	        .transition().duration(500).call(chart);

	  nv.utils.windowResize(chart.update);

	  return chart;
	});
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

function addZoom(options) {
    // scaleExtent
    var scaleExtent = 10;
    
    // parameters
    var yAxis       = options.yAxis;
    var xAxis       = options.xAxis;
    var xDomain     = options.xDomain || xAxis.scale().domain;
    var yDomain     = options.yDomain || yAxis.scale().domain;
    var redraw      = options.redraw;
    var svg         = options.svg;
    var discrete    = options.discrete;
    
    // scales
    var xScale = xAxis.scale();
    var yScale = yAxis.scale();
    
    // min/max boundaries
    var x_boundary = xScale.domain().slice();
    var y_boundary = yScale.domain().slice();
    
    // create d3 zoom handler
    var d3zoom = d3.behavior.zoom();
    
    // ensure nice axis
    xScale.nice();
    yScale.nice();
       
    // fix domain
    function fixDomain(domain, boundary) {
        if (discrete) {
            domain[0] = parseInt(domain[0]);
            domain[1] = parseInt(domain[1]);
        }
        domain[0] = Math.min(Math.max(domain[0], boundary[0]), boundary[1] - boundary[1]/scaleExtent);
        domain[1] = Math.max(boundary[0] + boundary[1]/scaleExtent, Math.min(domain[1], boundary[1]));
        return domain;
    };
    
    // zoom event handler
    function zoomed() {
        yDomain(fixDomain(yScale.domain(), y_boundary));
        xDomain(fixDomain(xScale.domain(), x_boundary));
        redraw();
    };

    // zoom event handler
    function unzoomed() {
        xDomain(x_boundary);
        yDomain(y_boundary);
        redraw();
        d3zoom.scale(1);
        d3zoom.translate([0,0]);
    };
    
    // initialize wrapper
    d3zoom.x(xScale)
          .y(yScale)
          .scaleExtent([1, scaleExtent])
          .on('zoom', zoomed);
          
    // add handler
    d3.select('#inferred').call(d3zoom).on('dblclick.zoom', unzoomed);
};
        
// add zoom
/*({
    xAxis  : chart.xAxis,
    yAxis  : chart.yAxis,
    yDomain: chart.yDomain,
    xDomain: chart.xDomain,
    redraw : function() { chart.update() },
    svg    : svg
});
nv.utils.windowResize(chart.update);*/
