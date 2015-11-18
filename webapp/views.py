import os, sys, json, pickle
from flask import render_template, request, jsonify
from webapp import app
from runHawkes import *
from rate_computation import *
from util import *

@app.route('/')
@app.route('/simulate')
def index():
	return render_template("simulate.html")

@app.route('/voicemap')
def voicepage():
	return render_template("voicemap.html")

@app.route('/submit_voice/', methods=["POST"])
def submit_voice():
	global model
	global global_data
	global nmap
	global pmap1
	global pmapkeys
	topic = request.json['topic'].split('-')[-1]
	group1 = request.json['group_in'].split('-')[-1]
	group2 = request.json['group_out'].split('-')[-1]
	person1 = request.json['person_in'].split('-')[-1]
	if not "row2" in request.json['person_out']:
		person2 = "aggregate"
	else:
		person2 = request.json['person_out'].split('-')[-1]
	pid1, pid2 = -1, "aggregate"

	def generate_output_dist(rate,labelmap,ppair,topid):
		time_range = (datetime.datetime(2015,7,4),datetime.datetime(2015,10,27))
		time_scale = datetime.timedelta(hours=8)
		# map from discrete timestamps to milliseconds
		map_to_time = lambda d: (d*time_scale+time_range[0] - datetime.datetime.utcfromtimestamp(0)).total_seconds() * 1000.0
		output = [{"key":labelmap[k],"values":[]} for k in topid]
		for i,tid in enumerate(topid):
			for j in range(len(rate[0][0])):
				output[i]["values"].append([map_to_time(j),rate[ppair[0]][tid][j]])
		return output

	def generate_output_events(events,labelmap,topid,events2=None,isPublic=0):
		output = {}
		print events.keys()
		newids = []
		newtop = []
		print isPublic
		for tid in topid:
			if events2 is not None:
				if labelmap[tid] in events2 and len(events2[labelmap[tid]])>0:
					name = labelmap[tid]
					if (tid in range(len(labelmap)-11,len(labelmap)) and isPublic ==2):
						name = labelmap[tid]+'_Pub'
					if (isPublic == 2 and tid in range(len(labelmap)-11,len(labelmap))) or (isPublic == 1 and tid in range(11, len(labelmap))) or (isPublic==0):
						print 'inside'
						output[name] = events2[labelmap[tid]]
						newids.append(name)
						newtop.append(tid)
						continue
			try:
				print labelmap[tid], len(events[labelmap[tid]])
				name = labelmap[tid]
				if (tid in range(11) and isPublic == 1):
					name = labelmap[tid]+'_Pub'
				if len(events[labelmap[tid]]) > 0:
					output[name] = events[labelmap[tid]]
					newids.append(name)
					newtop.append(tid)
			except Exception:
				pass
		return output, newids, newtop

	tmap = {
		"public":"public_tweets",
		"media":"news_articles_org",
		"politicians":"cand_tweets"
	}
	data = global_data[topic]
	labelmap = {}
	for key in pmapkeys:
		if person1.lower() in key.lower():
			print person1, key
			labelmap = {pmap1[key]:key for key in pmap1}
			break
	if len(labelmap) > 0 and group1 == "public":
		labelmap[10] = "General_Public"
	if len(labelmap) == 0:
		labelmap = {nmap[key]:key for key in nmap}
	curcount = len(labelmap)
	if group1 != group2:
		print group2
		if group2 != "media":
			for key in pmapkeys:
				labelmap[pmap1[key]+curcount] = key
			if group2 == "public":
				labelmap[10+curcount] = "General_Public"
		else:
			for key in nmap:
				labelmap[nmap[key]+curcount] = key
	offset = 0
	if curcount != len(labelmap):
		offset = curcount
	if person2 != "aggregate":
		if group2 != "media":
			for key in pmapkeys:
				if person2.lower() in key.lower():
					pid2 = pmap1[key] + offset
		else:
			for key in nmap:
				if person2.lower() in key.lower():
					pid2 = nmap[key] + offset
	if group1 != "media":
		for key in pmapkeys:
			if person1.lower() in key.lower():
				pid1 = pmap1[key] 
	else:
		for key in nmap:
			if person1.lower() in key.lower():
				pid1 = nmap[key]
	print pid1, pid2, person1, tmap[group1], tmap[group2], curcount, labelmap
	if len(labelmap) == curcount:
		# handcraft case
		if group1 != "media" and group1 != "public":
			exp12 = np.concatenate([data[tmap[group1]]["data"].astype(int),data["news_cand"]["data"].astype(int)],axis=1)
			exp12_ref = np.concatenate([data[tmap[group1]]["ref"].astype(int),data["news_cand"]["ref"].astype(int)],axis=1)
			tensor2 = data["news_cand"]["tensor"]
		else:
			exp12 = data[tmap[group1]]["data"].astype(int)
			exp12_ref = data[tmap[group1]]["ref"].astype(int)
			tensor2 = None
	else:
		exp12 = np.concatenate([data[tmap[group1]]["data"].astype(int),data[tmap[group2]]["data"].astype(int)],axis=1)
		exp12_ref = np.concatenate([data[tmap[group1]]["ref"].astype(int),data[tmap[group2]]["ref"].astype(int)],axis=1)		
		tensor2 = data[tmap[group2]]["tensor"]

	tensor_cross = data[tmap[group1]]["extra"]
	tensor1 = data[tmap[group1]]["tensor"]
	
	model.T = exp12.shape[0]
	model.K = exp12.shape[1]
	model.data = exp12
	tthr, rescale = 0, 1.5
	if topic == "mexico":
		tthr = 0
		rescale = 0.5
	w_eff, inferred, topid = model.execute_voice(exp12_ref,(curcount,len(labelmap)),tensor1,tensor2,thres=tthr,rescale=rescale,tensor_cross=tensor_cross)
	if pid1 in topid:
		topid.remove(pid1)
	topid = sorted(topid[:9])	
	print w_eff.shape, topid, pid2
	if pid2 != "aggregate":
		topid = [pid2]
	isPublic = 0
	if group1 == group2:
		#topid = range(0,curcount)
		topid = [pid1] + topid
		if group1 == "public":
			isPublic = 1
		events, newids, newtop = generate_output_events(data[tmap[group1]]["events"],labelmap,topid,isPublic=isPublic)
	else:
		topid = [pid1] + topid
		if group1 == "public":
			isPublic = 1
		elif group2 == "public":
			isPublic = 2
		print topid, isPublic, tmap[group1], tmap[group2]
		events, newids, newtop = generate_output_events(data[tmap[group1]]["events"],labelmap,topid,events2=data[tmap[group2]]["events"],isPublic=isPublic)
	print "newids", newids, topid
	for i,tid in enumerate(newtop):
		labelmap[tid] = newids[i]
	print pid1, pid2
	topid = newtop
	rate_dist = generate_output_dist(inferred,labelmap,(pid1,pid2),topid[1:])
	if (group1 == group2) and curcount != w_eff.shape[1]:
		network = get_network(w_eff,labelmap,showid=True,showname=True,collapse=True,topid=topid)
	else:
		network = get_network(w_eff,labelmap,showid=True,showname=True,topid=topid)
	map_to_msec = lambda d: (d - datetime.datetime.utcfromtimestamp(0)).total_seconds() * 1000.0
	time_range = (datetime.datetime(2015,7,4),datetime.datetime(2015,10,27))
	outmap = newids
	print topid
	print outmap
	return jsonify(network=network, rate=json.dumps(rate_dist), events=json.dumps(events), keylist=outmap,stime=map_to_msec(time_range[0]), etime=map_to_msec(time_range[1]))

@app.route('/submit_data/', methods=["POST"])
def submit_data():
	global model
	data = request.json['data']
	labelmap = {d['lane']:d['label'] for d in data}

	model.load_data(data)
	w_eff, inferred, response = model.execute_toy()
	network = get_network(w_eff,labelmap)
	return jsonify(network=network, rate=json.dumps(inferred), response=json.dumps(response))

def load_data_topic(topic):
	global cand_query
	global pmap1
	global pmap2
	global nmap
	data = {
		"news_tweets":{},
		"news_articles":{},
		"public_tweets":{},
		"cand_tweets":{},
		"news_cand":{}
	}
	data_pickle = {}

	for key in data.keys():
		####
		fn = key 
		#if key == "news_articles":
		#	fn = key + '1'
		####
		with open('/Users/PauKung/hawkes_ex/'+fn+'_'+topic+'.pkl','rb') as outfile:
			dset = pickle.load(outfile) 
		if key == "cand_tweets":
			for tw in dset:
				for k in cand_query:
					if k in tw['tweet']['text'].lower() and cand_query[k] not in tw['entities']:
						tw['entities'].append(cand_query[k])
		data_pickle[key] = dset

	# run Hawkes model to infer links and intensities
	time_range = (datetime.datetime(2015,7,4),datetime.datetime(2015,10,27))
	time_scale = datetime.timedelta(hours=8)

	def add_data(data_pickle,key,person_map=None,dkey="entities",person_map2=None):
		if "tweets" in key and person_map is None:
			person_map = pmap1
		elif "tweets" not in key and person_map is None:
			person_map = pmap2
		postpend = False
		bidir = True
		if key == "cand_tweets":
			bidir = False
		if key == "public_tweets":
			postpend=True
		results = data_to_series(data_pickle[key],time_range,time_scale,person_map,key,postpend=postpend,bidir=bidir,key=dkey,pmap2=person_map2)
		return {"data":results[0],"tensor":results[1],"obj":results[2],"ref":np.sum(results[1],axis=2),"events":results[3],"extra":results[4]}

	def transform_events(objs,tweets=True):
		out = {key:{} for key in objs}
		for key in objs:
			tmp = {"dates":[],"sizes":[],"ids":[]}
			if tweets:
				tmp["tweet_ids"] = []
			else:
				tmp["urls"] = []
			for obj in objs[key]:
				tmp["ids"].append(obj["id"])
				tmp["dates"].append(obj["time"])
				tmp["sizes"].append(obj["sizes"])
				if tweets:
					tmp["tweet_ids"].append(obj["id"])
				else:
					tmp["urls"].append(obj["url"])
			out[key] = tmp
		return out

	for key in data_pickle:
		print key
		data[key] = add_data(data_pickle,key)
		if "tweets" not in key:
			data[key]["events"] = transform_events(data[key]["events"],False)
		else:
			data[key]["events"] = transform_events(data[key]["events"])
	for key in ["news_articles_org","news_tweets_org"]:
		query = '_'.join(key.split('_')[:-1])
		print query
		print pmap2
		if "tweets" not in key:
			data[key] = add_data(data_pickle,query,person_map=nmap,dkey="org",person_map2=pmap1)
		else:
			data[key] = add_data(data_pickle,query,person_map=nmap,dkey="org")
		if "tweets" not in key:
			data[key]["events"] = transform_events(data[key]["events"],False)
		else:
			data[key]["events"] = transform_events(data[key]["events"])

	del data_pickle
	return data

def get_network(w,labelmap,showid=False,showname=False,collapse=False,inv=False,topid=None):
	network = []
	if collapse:
		w_eff = w[:w.shape[0]/2,w.shape[1]/2:w.shape[1]]
	else:
		w_eff = w
	print collapse, w_eff.shape
	if inv:
		w_eff = w_eff.T
	for i in range(w_eff.shape[0]):
		for j in range(w_eff.shape[1]):
			if i == j:
				continue
			if topid:
				if not(i in topid and j in topid):
					continue
			if w_eff[i,j] > 0.001:
				if topid:
					ind_i = topid.index(i)
					ind_j = topid.index(j)
				else:
					ind_i,ind_j = i,j
				tmp = {'source':labelmap[i],'target':labelmap[j],'value':w_eff[i,j]}
				if showid:
					tmp['source'] = ind_i
					tmp['target'] = ind_j
				if showname:
					tmp['source_name'] = labelmap[i]
					tmp['target_name'] = labelmap[j]
				network.append(tmp)
	print network
	return network	

model = runHawkes(key="lane",value="value",time="start")
global_data = {}
global_data["abortion"] = load_data_topic("abortion")
global_data["mexico"] = load_data_topic("mexico")
global_data["immigration"] = load_data_topic("immigration")
global_data["gun"] = load_data_topic("gun")
global_data["benghazi"] = load_data_topic("benghazi")