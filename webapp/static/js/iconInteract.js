// voice icons

// profile pictures
var cand_dict = {
	"bush":"bush.jpg",
	"carson":"carson.jpg",
	"clinton":"clinton.png",
	"cruz":"cruz.jpeg",
	"huckabee":"huckabee.jpg",
	"paul":"paul.jpg",
	"rubio":"rubio.jpg",
	"sanders":"sanders.png",
	"trump":"trump.jpg",
	"walker":"walker.png"
	};
var cand_party = {
	"bush":"gop",
	"carson":"gop",
	"clinton":"dem",
	"cruz":"gop",
	"huckabee":"gop",
	"paul":"gop",
	"rubio":"gop",
	"sanders":"dem",
	"trump":"gop",
	"walker":"gop"
	};
var news_dict = {
	"ap":"ap.png",
	"buzzfeed":"buzzfeed.png",
	"cnn":"cnn.png",
	"fox":"fox.png",
	"latimes":"latimes.jpeg",
	"mcclatchy":"mcclatchy.jpg",
	"npr":"npr.png",
	"nyt":"nyt.png",
	"politico":"politico.jpeg",
	"reuters":"reuters.png",
	"washpo":"washpo.png",
	"wsj":"wsj.jpeg"
	};
var group_names = ["politicians","media","public"];

function addProfileRow(rnum){
	var rname = "#input"+rnum+"-row";
	var gname = "#row"+rnum+"-groups";
	// initialize group icons
	var grow = d3.select(gname);
	for(var i=group_names.length-1; i >= 0 ; i--){
		var imgpath = "static/images/"+group_names[i]+".png";
		grow.append("a")
			.attr("id","group-row"+rnum+"-"+group_names[i])
			.attr("class","animated fadeInLeft icon default-hover")
			.attr("height",80)
			.attr("width",80)
			.style("background-image","url(\""+imgpath+"\")")
			.style("-webkit-animation-delay",i*0.2+"s")
			.on("click",function(){
				$(this).removeClass("default-hover");
				$(this).addClass("default-hover-activated");
				$(this).siblings().removeClass("default-hover-activated");
				if($(this).attr("id").indexOf("media") > -1)
					addIconsRow(rnum,"news");
				else
					addIconsRow(rnum,"cand");
			});
	}
}

function addIconsRow(rnum,intag){
	var dict;
	var tag = intag;
	var entname = "#row"+rnum+"-entities";
	d3.select(entname).html("");
	var entrow = d3.select(entname);
	// initialize entity images
	var isize = 80;
	if(tag === "news") {dict = news_dict; isize = 60;}
	else {dict = cand_dict; isize = 80;}
	var count = Object.keys(dict).length-1;
	for(var key in dict){
		var imgpath = "static/images/"+dict[key];
		var cand_class = cand_party[key];
		if(cand_class === undefined){cand_class="default-hover";}
		if(tag == "news"){
		entrow.append("a")
			.attr("id","entity-row"+rnum+"-"+key)
			.attr("class","animated fadeInLeft icon-sm "+cand_class)
			.style("background-image","url(\""+imgpath+"\")")
			.style("-webkit-animation-delay",count*0.05+"s")
			.on("click",function(){
				var clist = $(this).attr("class").split();
				var cand_class = clist[clist.length-1];
				console.log(cand_class)
				//$(this).removeClass(cand_class);
				$(this).addClass(cand_class+"-activated");
				$(this).siblings().removeClass("default-hover-activated");
				$(this).siblings().removeClass("dem-activated");
				$(this).siblings().removeClass("gop-activated");
			});
		}else{
		entrow.append("a")
			.attr("id","entity-row"+rnum+"-"+key)
			.attr("class","animated fadeInLeft icon "+cand_class)
			.style("background-image","url(\""+imgpath+"\")")
			.style("-webkit-animation-delay",count*0.05+"s")
			.on("click",function(){
				var clist = $(this).attr("class").split();
				var cand_class = clist[clist.length-1];
				//$(this).removeClass(cand_class);
				$(this).addClass(cand_class+"-activated");
				$(this).siblings().removeClass("default-hover-activated");
				$(this).siblings().removeClass("dem-activated");
				$(this).siblings().removeClass("gop-activated");
			});
		}
		count -= 1;
	}
}

var buttonState = -1;
d3.select("#collapse-button")
	.on("click",function(){
		if(buttonState == -1){
			d3.select("#collapsible-container").attr("class","collapse");
			d3.select("#collapse-button-span").attr("class","glyphicon glyphicon-chevron-down");
			// draw infobox
			// drawInfoBox();
		}
		else{
			d3.select("#collapsible-container").attr("class","");
			d3.select("#collapse-button-span").attr("class","glyphicon glyphicon-chevron-up");
		}
		buttonState *= -1;
	});

$('body').on('click', '.btn-group button', function (e) {
    $(this).addClass('active');
    $(this).siblings().removeClass('active');
});

addProfileRow(1);
addProfileRow(2);
