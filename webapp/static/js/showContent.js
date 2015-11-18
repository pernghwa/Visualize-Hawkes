var test_urls = {
	"ap":"http://hosted2.ap.org/APDEFAULT/89ae8247abe8493fae24405546e9a1aa/Article_2015-10-03-US--Supreme%20Court-New%20Term/id-257156c22beb4eb0b92ad6c1038c01f2",
	"buzzfeed":"http://www.buzzfeed.com/andrewkaczynski/scott-walker-on-huckabee-oven-comment-im-certainly-not-gonna",
	"cnn":"http://www.cnn.com/video/#/video/politics/2015/09/03/donald-trump-jeb-bush-feud-history-field-dnt-erin.cnn",
	"fox":"http://feeds.foxnews.com/~r/foxnews/politics/~3/YIVhaa_neNw/",
	"latimes":"http://www.latimes.com/la-rupert-murdoch-obama-20151007-story.html",
	"mcclatchy":"http://www.mcclatchydc.com/news/nation-world/national/article30164082.html",
	"npr":"http://www.npr.org/sections/itsallpolitics/2015/09/15/440413346/scott-walkers-anti-union-push-may-not-prove-so-easy-as-president",
	"nyt":"http://www.nytimes.com/2015/08/08/us/politics/candidates-continue-to-plead-their-cases-after-first-republican-debate.html?_r=0",
	"politico":"http://www.politico.com/story/2015/09/pope-francis-congress-best-quotes-214020",
	"reuters":"http://feeds.reuters.com/~r/reuters/cyclicalconsumergoodsNews/~3/KeZpKWUYtGU/usa-election-republicans-idUSL1N10I2IS20150807",
	"washpo":"http://www.washingtonpost.com/politics/what-kind-of-party-will-the-republican-nominee-lead-in-2016/2015/08/01/9f14a3ea-37d1-11e5-b673-1df005a0fb28_story.html",
	"wsj":"http://blogs.wsj.com/washwire/2015/08/27/capital-journal-trumps-insults-rattle-rivals-please-fans-insurers-win-big-health-rate-increases-biden-checking-emotional-fuel-get-used-to-china-headlines/"
}

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

//renderArticle(test_urls["nyt"]);
//renderTweet("626048997095026689");