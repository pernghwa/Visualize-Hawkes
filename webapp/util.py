from itertools import combinations
import datetime
import numpy as np

nmap = {
    'ap':0,
    'buzzfeed':1,
    'cnn':2,
    'fox':3,
    'latimes':4,
    'mcclatchy':5,
    'npr':6,
    'nyt':7,
    'politico':8,
    'reuters':9,
    'washpo':10,
    'wsj':11
}

nmapcorrect = {
    'washingtonpost':'washpo',
    'foxnews':'fox',
    'nytimes':'nyt'
}

cand_query = {
    'randpaul':'Rand_Paul',
    'rand paul':'Rand_Paul',
    'senator paul':'Rand_Paul',
    'santorum':'Rick_Santorum',
    'ricksantorum':'Rick_Santorum',
    'scott walker':'Scott_Walker',
    'walker':'Scott_Walker',
    'govwalker':'Scott_Walker',
    'gov walker':'Scott_Walker',
    'governor walker':'Scott_Walker',
    'gov. walker':'Scott_Walker',
    'scottwalker':'Scott_Walker',
    'christie':'Chris_Christie',
    'chrischristie':'Chris_Christie',
    'govchristie':'Chris_Christie',
    'gov. christie':'Chris_Christie',
    'gov christie':'Chris_Christie',
    'lindseygraham':'Lindsey_Graham',
    'lindseygrahamsc':'Lindsey_Graham',
    'lindsey graham':'Lindsey_Graham',
    'senator graham':'Lindsey_Graham',
    'sen graham':'Lindsey_Graham',
    'sen. graham':'Lindsey_Graham',
    'jeb ':'Jeb_Bush',
    'jeb bush':'Jeb_Bush',
    'jebbush':'Jeb_Bush',
    'govbush':'Jeb_Bush',
    'governor bush':'Jeb_Bush',
    'gov bush':'Jeb_Bush',
    'gov. bush':'Jeb_Bush',
    'govperry':'Rick_Perry',
    ' perry ':'Rick_Perry',
    'governorperry':'Rick_Perry',
    'gov perry':'Rick_Perry',
    'gov. perry':'Rick_Perry',
    'governor perry':'Rick_Perry',
    'governorperry':'Rick_Perry',
    'rick perry':'Rick_Perry',
    'rickperry':'Rick_Perry',
    'donald':'Donald_Trump',
    'donald trump':'Donald_Trump',
    'realdonaldtrump':'Donald_Trump',
    'trump':'Donald_Trump',
    'marcorubio':'Marco_Rubio',
    'marco rubio':'Marco_Rubio',
    'senator rubio':'Marco_Rubio',
    'sen rubio':'Marco_Rubio',
    'sen. rubio':'Marco_Rubio',
    ' rubio ':'Marco_Rubio',
    'mike huckabee':'Mike_Huckabee',
    'huckabee':'Mike_Huckabee',
    'govhuckabee':'Mike_Huckabee',
    'govmikehuckabee':'Mike_Huckabee',
    'gov huckabee':'Mike_Huckabee',
    'governor huckabee':'Mike_Huckabee',
    'bobby jindal':'Bobby_Jindal',
    'bobbyjindal':'Bobby_Jindal',
    'jindal':'Bobby_Jindal',
    'govjindal':'Bobby_Jindal',
    'governor jindal':'Bobby_Jindal',
    'fiorina':'Carly_Fiorina',
    'carly fiorina':'Carly_Fiorina',
    'carlyfiorina':'Carly_Fiorina',
    'ted cruz':'Ted_Cruz',
    'tedcruz':'Ted_Cruz',
    'sen cruz':'Ted_Cruz',
    'sen. cruz':'Ted_Cruz',
    'sencruz':'Ted_Cruz',
    'senator cruz':'Ted_Cruz',
    ' cruz ':'Ted_Cruz',
    'dr carson':'Ben_Carson',
    'ben carson':'Ben_Carson',
    'realbencarson':'Ben_Carson',
    'kasich':'John_Kasich',
    'johnkasich':'John_Kasich',
    'john kasich':'John_Kasich',
    'govkasich':'John_Kasich',
    'governor kasich':'John_Kasich',
    'george pataki':'George_Pataki',
    'govpataki':'George_Pataki',
    'governor pataki':'George_Pataki',
    'governorpataki':'George_Pataki',
    'pataki':'George_Pataki',
    'hillary':'Hillary_Clinton',
    'hillary clinton':'Hillary_Clinton',
    'hillaryclinton':'Hillary_Clinton',
    'bernie sanders':'Bernie_Sanders',
    'sanders':'Bernie_Sanders',
    'berniesanders':'Bernie_Sanders',
    'sensanders':'Bernie_Sanders',
    'senator sanders':'Bernie_Sanders',
    'sen sanders':'Bernie_Sanders',
    'sen. sanders':'Bernie_Sanders',
    'jim webb':'Jim_Webb',
    'jimwebb':'Jim_Webb',
    'jimwebbusa':'Jim_Webb',
    'chafee':'Lincoln_Chafee',
    'lincoln chafee':'Lincoln_Chafee',
    'lincolnchafee':'Lincoln_Chafee',
    'chafee':'Lincoln_Chafee',
    'martin omalley':'Martin_OMalley',
    'martinomalley':'Martin_OMalley',
    'martin o\'malley':'Martin_OMalley'
}

pmap1 = {
    'Rand_Paul':0,
    'Scott_Walker':1,
    'Jeb_Bush':2,
    'Donald_Trump':3,
    'Marco_Rubio':4,
    'Mike_Huckabee':5,
    'Ted_Cruz':6,
    'Ben_Carson':7,
    'Hillary_Clinton':8,
    'Bernie_Sanders':9
}

pmapkeys = ['Rand_Paul','Scott_Walker','Jeb_Bush','Donald_Trump','Marco_Rubio',
    'Mike_Huckabee','Ted_Cruz','Ben_Carson','Hillary_Clinton','Bernie_Sanders']

cand_party = {
    "bush":2,
    "carson":7,
    "clinton":8,
    "cruz":6,
    "huckabee":5,
    "paul":0,
    "rubio":4,
    "sanders":9,
    "trump":3,
    "walker":1
};

pmap2 = {
    'Rand Paul':0,
    'Scott Walker':1,
    'Jeb Bushes':2,
    'Jeb Bush First':2,
    'Floridians Jeb Bush':2,
    'Daybook Jeb Bush':2,
    'Jeb Bush':2,
    'S.C. Jeb Bush':2,
    'Florida Jeb Bush':2,
    'Donald Trump':3,
    'Marco Rubio':4,
    'N.H. Marco Rubio':4,
    'Mike Huckabee':5,
    'Ted Cruz':6,
    'Ben Carson':7,
    'Hillary Clinton':8,
    'Bernie Sanders':9,
    'Bernie Sandersa':9
}

# preprocess datasets into time series
def data_to_series(data,time_range,time_scale,pmap,kname,names={},verbose=False,bidir=True,key='entities',postpend=False,key2='entities',pmap2=None):
    # transform data to series format for hawkes process model
    # data: a list of json objects 
    # time_range: (start_time,end_time) tuple
    # time_scale: granularity of time <timedelta> 
    # pmap: entity-process_num map
    # names: {<index>:<str>} mapping from process id to process name
    # setup timerange map transformed to hour scale
    timemax = ((time_range[1]-time_range[0]).days*24)/(time_scale.days*24+time_scale.seconds/3600)
    timeint = lambda d: ((d-time_range[0]).days*24+d.hour)/(time_scale.days*24+time_scale.seconds/3600)
    map_to_time = lambda d: d*time_scale+time_range[0]
    K = len({v:0 for v in pmap.values()})
    if pmap2 is not None:
        K2 = len({v:0 for v in pmap2.values()})
        series_matched2 = np.zeros((timemax,K,K2))
    else:
        series_matched2 = None

    if postpend:
        K += 1
    series = np.zeros((timemax,K))
    series_matched = np.zeros((timemax,K,K))
    count = 0
    matched_data = {}
    def remap_data_obj(data_objs):
        new_objs = {}
        map_to_msec = lambda d: (d - datetime.datetime.utcfromtimestamp(0)).total_seconds() * 1000.0
        for key in data_objs:
            new_objs[key] = []
            print len(data_objs[key].keys())

            for time in data_objs[key].keys():
                tmp = {}
                tmp["time"] = map_to_msec(map_to_time(time))
                tmp["sizes"] = np.sqrt(data_objs[key][time]["max_size"])
                if 'tweet_id' in data_objs[key][time]['tweet']['tweet']:
                    tmp['id'] = str(data_objs[key][time]['tweet']['tweet']['tweet_id'])
                else:
                    tmp['id'] = str(data_objs[key][time]['tweet']['tweet']['id'])
                new_objs[key].append(tmp)
        return new_objs
    def add_datum_obj(data_objs,datum,name,reduceItem=False):
        # collapse time to time_scale
        #time = map_to_time(timeint(datum['time']))
        map_to_msec = lambda d: (d - datetime.datetime.utcfromtimestamp(0)).total_seconds() * 1000.0
        timeint2 = lambda d: ((d-time_range[0]).days*24+d.hour)/(time_scale.days*24+time_scale.seconds/3600)
        subscale = datetime.timedelta(hours=2)
        if reduceItem:
            try:
                time = timeint2(datetime.datetime.strptime(datum['time'],'%a %b %d %H:%M:%S +0000 %Y'))
            except Exception:
                time = timeint2(datum['time'])
            try:    
                if time in data_objs[name]:
                    if datum['tweet']['retweet_count']+1 > data_objs[name][time]["max_size"]:
                        data_objs[name][time] = {"max_size":datum['tweet']['retweet_count']+1,"tweet":datum}
                else:
                    data_objs[name][time] = {"max_size":datum['tweet']['retweet_count']+1,"tweet":datum}                
            except Exception:
                data_objs[name] = {time:{"max_size":datum['tweet']['retweet_count']+1,"tweet":datum}}
            return data_objs
        try:
            datum_obj = {"time":map_to_msec(datetime.datetime.strptime(datum['time'],'%a %b %d %H:%M:%S +0000 %Y')),'sizes':1}
        except Exception:
            datum_obj = {"time":map_to_msec(datum['time']),"sizes":1}
        if 'article' in datum:
            datum_obj['url'] = datum['article']['url']
            datum_obj['id'] = datum['article']['article_id']
        else:
            if 'tweet_id' in datum['tweet']:
                datum_obj['id'] = str(datum['tweet']['tweet_id'])
            else:
                datum_obj['id'] = str(datum['tweet']['id'])
        try:
            data_objs[name].append(datum_obj)
        except Exception:
            data_objs[name] = [datum_obj]
        return data_objs
    # collect data instances for dropevent display
    # object format {"sizes":number of data, "date":time of event, "url":url for article, "id": tweet id}
    print kname
    data_objs = {}
    print len(data)
    count = 0
    for datum in data:
        try:
            tnum = timeint(datetime.datetime.strptime(datum['time'],'%a %b %d %H:%M:%S +0000 %Y'))
        except Exception:
            tnum = timeint(datum['time'])
        if tnum >= timemax or tnum < 0:
            continue
        tmp = []
        if type(datum[key]) is list:
            if kname == "cand_tweets":
                assert(datum['tweet']['user']['screen_name'].lower() in cand_query,datum['tweet']['user']['screen_name'])
                data_objs = add_datum_obj(data_objs,datum,cand_query[datum['tweet']['user']['screen_name'].lower()])
            for name in datum[key]:
                if name in pmap:
                    series[tnum,pmap[name]] += 1
                    tmp.append(name)
                    if kname != "cand_tweets" and kname != "public_tweets":
                        data_objs = add_datum_obj(data_objs,datum,name)
                    elif kname == "public_tweets":
                        data_objs = add_datum_obj(data_objs,datum,name,True)
                        count += 1
        else:
            ### BUG ###
            if datum[key].lower() in nmapcorrect:
                datum[key] = nmapcorrect[datum[key].lower()]
            if datum[key].lower() in pmap:
                series[tnum,pmap[datum[key].lower()]] += 1
                tmp.append(datum[key].lower())
                if kname == "cand_tweets":
                    assert(datum['tweet']['user']['screen_name'].lower() in cand_query,datum['tweet']['user']['screen_name'])
                    data_objs = add_datum_obj(data_objs,datum,cand_query[datum['tweet']['user']['screen_name'].lower()])  
                elif kname != "public_tweets":                  
                    data_objs = add_datum_obj(data_objs,datum,datum[key].lower())
                else:
                    data_objs = add_datum_obj(data_objs,datum,datum[key].lower(),True)
                    count += 1

        if pmap2:
            tmp2 = []
            if kname == "news_articles":
                for name in cand_query:
                    if name in datum['article']['title'].lower() and cand_query[name] in pmap2:
                        print datum['article']['title'].lower()
                        tmp2.append(cand_query[name])
            else:
                if type(datum[key2]) is list:
                    for name in datum[key2]:
                        if name in pmap2:
                            tmp2.append(name)
                else:
                    ### BUG ###
                    if datum[key2] in pmap2:
                        tmp2.append(datum[key2])

        for pair in combinations(tmp,2):
            count += 1       
            series_matched[tnum,pmap[pair[0]],pmap[pair[1]]] += 1
            if bidir:
                series_matched[tnum,pmap[pair[1]],pmap[pair[0]]] += 1

        if pmap2:
            assert(type(datum[key] is not list))
            for item in {i:0 for i in tmp2}:
                series_matched2[tnum,pmap[datum[key].lower()],pmap2[item]] += 1

        if len(tmp) > 1:
            if verbose:
                print datum
            try:
                matched_data[tnum].append(datum)
            except Exception:
                matched_data[tnum] = [datum]
        if len(tmp) == 0 and postpend:
            series[tnum,len(pmap)] += 1

    print count
    if kname == "public_tweets":
        data_objs = remap_data_obj(data_objs)

    if pmap2:
        print np.sum(series_matched2[:,3,:],axis=0)
    return series, series_matched, matched_data, data_objs, series_matched2
