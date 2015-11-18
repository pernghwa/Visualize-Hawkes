
require.config({
    paths: {
        'd3': 'd3',
        'd3.chart.eventDrops': 'eventDrops',
        'nv': 'nvd3'
    },
    shim: {
        'd3.chart.eventDrops': {
            deps: ['d3'],
            exports: 'd3.chart.eventDrops'
        },
        'nv' : {
            deps: ['d3']
        }
    }
});

require(['d3', 'nv', 'd3.chart.eventDrops'], function() {

    // execute modeling training
    $(document).ready(function(){
        d3.select('#run-btn').on('click',execute_model);
    });
    
    function cleardata(){
        d3.select("#network").html("");
        d3.select("#inferred").html("");
        d3.select("#line-chart").html("");
        d3.select("#contentContainer").html("");
        nodes = {};
    }
    
    function execute_model(){
        var topic = d3.select(".btn-md.active").attr("id");
        var g1 = d3.select("#row1-groups .default-hover-activated");
        var gid1 = null;
        if(g1[0][0])gid1 = g1.attr("id");
        var p1 = d3.select("#row1-entities .dem-activated,.gop-activated");
        var pid1 = null;
        if(!p1[0][0]) {
            var p12 = d3.select("#row1-entities > .default-hover-activated");
            if(!p12[0][0]) pid1 = "aggregated";
            else pid1 = p12.attr("id");
        }
        else pid1 = p1.attr("id");
        var gid2 = null;
        var g2 = d3.select("#row2-groups .default-hover-activated");
        if(g2[0][0]) gid2 = g2.attr("id");
        var p2 = d3.select("#row2-entities .dem-activated,.gop-activated");
        var pid2 = null;
        if(!p2[0][0]) {
            var p22 = d3.select("#row2-entities > .default-hover-activated");
            if(!p22[0][0])pid2 = "aggregated";
            else pid2 = p22.attr("id");
        }
        else {console.log(p2);pid2 = p2.attr("id");}
        console.log(gid1);
        console.log(gid2);
        console.log(pid1);
        console.log(pid2);
        $.ajax({
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
        });
    }
    
    function show_results(network,data){
        cleardata();
        var rate = JSON.parse(data.rate);
        d3.select("#inferred").append('svg').attr('id','infer').style("height","420");
        draw_stack("infer",rate);
        var events = JSON.parse(data.events);
        var stime = JSON.parse(data.stime);
        var etime = JSON.parse(data.etime);
        var keylist = data.keylist;
        console.log(keylist);
        draw_events("line-chart",events,keylist,stime,etime);
        network_data = network;
        cur_links = network;
        draw_slider();
        draw_network(network,true);
    }
    
    function draw_events(dom_id,dataraw,keylist,stime,etime){
        var data = [];
        for(var i=0; i< keylist.length; i++){
            var key = keylist[i];
            var obj = dataraw[key];
            obj.name = key;
            obj.dates = $.map(obj.dates, function(d){
                return new Date(d)});
            obj.sizes = $.map(obj.sizes, function(d){return 30*parseFloat(d)});
            if(obj.urls){
                obj.ids = $.map(obj.urls, function(d){return d;});
            }
            data.push(obj);
        }
        var endTime = new Date(etime);
        var startTime = new Date(stime);
        var color = d3.scale.category20();
        // create chart function
        var eventDropsChart = d3.chart.eventDrops()
            .eventLineColor(function (datum, index) {
                return color(index);
            }).eventClick(function(datum){
                var c = parseInt(datum.id);
                if (isNaN(c))renderArticle(datum.id);
                else renderTweet(datum.id);
            }).width(700)
            .margin({
              top: 60,
              left: 120,
              bottom: 40,
              right: 50
            })
            .start(new Date(startTime))
            .end(new Date(endTime));

        // bind data with DOM
        d3.select('#'+dom_id)
            .datum(data)
            .call(eventDropsChart);
    }

    var grayscale = d3.scale.linear().domain([0,1.5]).range([238,30]);
    var thres = 0.0;
    var cur_links;
    var network_data;
        
    ////////////////////////////////////////////////////////////////////////////////
    // Draw network
    ////////////////////////////////////////////////////////////////////////////////
    // enable point dragging
    var radius = 20,
            width_net = 350,
            height_net = 350;
        
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

    function draw_slider(){
        var header = d3.select('#network-header').html("Link threshold <span id=\"output\">0.10</span>");
        header.append("input")
            .attr("type","range")
            .attr("id","thresholdSlider")
            .attr("name","points")
            .attr("value",2)
            .attr("min",0)
            .attr("max",20)
            .on("change",function(){
                var thr = this.value/20.0;
                d3.select("#output").html(thr.toFixed(2));
                var links = cur_links.filter(function(d){return d.value>thr;});
                draw_network(links,true);
            });
    }

    function clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }

    var nodes = {};
    function draw_network(inlinks,clear){
        // clear current #network <div> content and renew with new svg
        var svg_net;
        var links = [];
        for(var i=0;i<inlinks.length;i++){
            links.push(clone(inlinks[i]));
        }
        d3.select("#network").html("");
    
        svg_net = d3.select("#network").append("svg")
                        .attr("id","net_svg")
                        .attr("width", width_net)
                        .attr("height", height_net);

        var colors = d3.scale.category20().range();    
        if($.isEmptyObject(nodes)){
            // Compute the distinct nodes from the links.
            links.forEach(function(link,i) {
                link.source = nodes[link.source_name] ||
                    (nodes[link.source_name] = {id: link.source, name:link.source_name});
                link.target = nodes[link.target_name] ||
                    (nodes[link.target_name] = {id: link.target, name:link.target_name});
                link.value = +link.value;
            });
            links = links.filter(function(d){return d.value>0.1;});
        }
        else{
            links.forEach(function(link,i) {
                link.source = nodes[link.source_name];
                link.target = nodes[link.target_name];
                link.value = +link.value;
            });            
        }
        // build the arrow.

        var force = d3.layout.force()
            .size([width_net, height_net])
            .linkDistance(120)
            .charge(-300)
            .nodes(d3.values(nodes))
            .links(links)
            .on("tick", tick)
            .start();

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
                .attr("class", "link")
                .attr("id", function(d,i){return "path"+i;})
                .style("stroke",function(d){var s = grayscale(d.value); return d3.rgb(s,s,s);})
                .attr("marker-end", "url(#end)");
    
        /*links.forEach(function(d,i){
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
            });*/

        // define the nodes
            var node = svg_net.selectAll(".node")
                .data(force.nodes())
              .enter().append("g")
                .attr("class", "node")
                .call(force.drag);
        
            // add the nodes
            node.append("circle")
                .attr("r", 5)
                .style("fill",function(d){return colors[parseInt(d.id)];})
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

    function renderArticle(url){
        var container = d3.select("#contentContainer").html("")
            .append("iframe")
            .attr("id","articleContainer")
            .attr("width","790px")
            .attr("height","850px")
            .attr("src",url);
    }
    
    function renderTweet(id){
            d3.select("#contentContainer").html("");
            var info = $("#contentContainer");
            $.getJSON("https://api.twitter.com/1/statuses/oembed.json?id="+id+"&align=left&callback=?",
                function(data){
                    var span = document.createElement("span");
                    $(span).html(data.html);
                    info.html(span);
                });
        }


    function draw_stack(dom_name,data){
        nv.addGraph(function() {
        var maxY = d3.max(data.map(function(obj) {
                return d3.max(obj.values.map(function(d){
                    return d[1];
                }))
            }));
        var minY = d3.min(data.map(function(obj) {
                return d3.min(obj.values.map(function(d){
                    return d[1];
                }))
            }));

        var chart = nv.models.stackedAreaChart();
                    chart
                        .x(function(d) { return d[0] })
                        .y(function(d) { return d[1] })
                        .width(1200).height(450)
                        .yDomain([0-0.0001,maxY+0.0001])
                        //.useInteractiveGuideline(true) 
                        .showControls(false)
                        .margin({top:50,right:30,bottom:50,left:130})
                        .clipEdge(true);
    
          chart.color(function (d, i) {
                var colors = d3.scale.category20().range();
                return colors[i % colors.length];
            })
    
          chart.xAxis
                .tickFormat(function(d) { 
                    return d3.time.format('%x')(new Date(d)) 
                });

          chart.yAxis
                .axisLabel('Intensity')
                .tickFormat(d3.format(',.2f'))
                //.scale()
                //.domain([0,maxY+0.2]);
        chart.forceY([0,maxY+0.2]);

          d3.select('#'+dom_name)
                .datum(data)
                .call(chart);
    
          nv.utils.windowResize(chart.update);
    
          return chart;
        });
    }
                
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


});
