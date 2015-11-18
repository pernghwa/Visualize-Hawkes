import sys,json

sys.path.append('/Users/PauKung/anaconda/lib/python2.7/site-packages/pybasicbayes')

import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import roc_auc_score

import pyhawkes.models
reload(pyhawkes.models)
from pyhawkes.models import DiscreteTimeStandardHawkesModel, DiscreteTimeNetworkHawkesModelSpikeAndSlab, ContinuousTimeNetworkHawkesModel

from rate_computation import *

np.random.seed(0)
fpath = "/Users/PauKung/hawkes_demo/webapp/static/data/"

class runModel(object):

    def __init__(self,key="key",value="value"):
        self.key = key
        self.value = value

    # accepts an iterator of JSON data instances
    def load_data(self,items):
        self.data = []
        self.labels = []
        for item in items:
            self.data.append(item)
            self.labels.append(item[self.key])

    def execute(self):
        raise NotImplementedError('abstract class, need implementation')

class runHawkes(runModel):

    def __init__(self,key="key",value="value",time="time",K=3):
        super(self.__class__,self).__init__(key,value)
        self.time = time
        self.K = K

    def load_data(self,items,mode="discrete"):
        super(runHawkes,self).load_data(items)
        self.T = 30#max(map(lambda d:d[self.time],items))
        if mode == 'discrete':
            tmp = [[0 for j in range(self.K)] for i in range(self.T)]
            for item in self.data:
                print item, item[self.time], item[self.key], self.value, self.T
                tmp[item[self.time]][item[self.key]] += item[self.value]
            self.data = np.array(tmp).astype(int)
        elif mode == 'continuous':
            tmp = [item[self.time] for item in items]
            self.data = np.array(tmp)
            self.labels = np.array([item[self.key] for item in items])

    def compute_rate(self,model,mode,dt_max=3):
        assert(mode == "discrete" or mode == "continuous", "mode has to be either discrete or continuous")
        if mode == "discrete":
            F = model.basis.convolve_with_basis(self.data)
            rate = np.zeros((self.T,self.K))
            H = model.weight_model.W_effective[:,:,None] * model.impulse_model.g
            H = np.transpose(H, [2,0,1])
            for k2 in xrange(self.K):
                rate[:,k2] += np.tensordot(F, H[:,:,k2], axes=([2,1], [0,1]))
        else:
            t = np.concatenate([np.arange(0, self.T, step=1.0), [self.T]])
            t = np.arange(0,self.T,step=1.0)
            rate = np.zeros((t.size, self.K))
            for k in xrange(self.K):
                deltas = t[:,None]-self.data[None,:]
                t_deltas, n_deltas = np.where((deltas>0) & (deltas < dt_max))
                senders = self.labels[n_deltas]
                rate[t_deltas, k] = model.impulse_model.impulse(deltas[t_deltas, n_deltas],senders,k)

        return rate

    # assumes data already transformed into either discretized bins or one big
    # array of continuous timestamps
    # run Gibbs sampling inference and output matplotlib images
    def execute_toy(self,mode="discrete",dt_max=3,N_samples=1000,network_priors={"p": 1.0, "allow_self_connections": False}):
        #np.random.seed(0)
        if mode == 'discrete':
            test_model1 = DiscreteTimeNetworkHawkesModelSpikeAndSlab(K=self.K, dt_max=dt_max,
                        network_hypers=network_priors)
            test_model1.add_data(self.data)
            test_model1.initialize_with_standard_model(None)
        elif mode == 'continuous':
            test_model = ContinuousTimeNetworkHawkesModel(self.K, dt_max=dt_max,
                                                            network_hypers=network_hypers)
            test_model.add_data(self.data,self.labels)

        ###########################################################
        # Fit the test model with Gibbs sampling
        ###########################################################
        samples = []
        lps = []
        #for itr in xrange(N_samples):
        #    test_model1.resample_model()
        #    lps.append(test_model1.log_probability())
        #    samples.append(test_model1.copy_sample())

        test_model = DiscreteTimeStandardHawkesModel(K=self.K, dt_max=dt_max, allow_self_connections= False)
        #test_model.initialize_with_gibbs_model(test_model1)
        test_model.add_data(self.data)
        test_model.fit_with_bfgs()

        impulse =  test_model1.impulse_model.impulses
        responses = {}
        #for i in range(3):
        #    responses[str(i)] = []
        #    for j in range(3):
        #        responses[str(i)].append({"key":"response: process "+str(i)+" to "+str(j),"values":[{"x":idx,"y":k} for idx,k in enumerate(impulse[:,i,j])]})
        #    with open('/Users/PauKung/hawkes_demo/webapp/static/data/response'+str(i)+'.json','w') as outfile:
        #        json.dump({"out":responses[str(i)]},outfile)
        # calculate convolved basis
        rr = test_model.basis.convolve_with_basis(np.ones((dt_max*2,self.K)))
        impulse = np.sum(rr, axis=2)
        impulse[dt_max:,:] = 0
        for i in range(3):
            responses[str(i)] = {"key":"response: process "+str(i),"values":[{"x":idx,"y":k} for idx,k in enumerate(impulse[:,i])]}
            with open('/Users/PauKung/hawkes_demo/webapp/static/data/response'+str(i)+'.json','w') as outfile:
                json.dump({"out":responses[str(i)]},outfile)

        rates = test_model.compute_rate()#self.compute_rate(test_model,mode,dt_max)
        inferred_rate = {}
        S,F = test_model.data_list[0]
        print F
        for i in range(3):
            inferred_rate[str(i)] = []
            inferred_rate[str(i)].append({"key":"background",
                "values":[[j,test_model.bias[i]] for j in range(self.T)]})
                #"values":[[j,test_model1.bias_model.lambda0[i]] for j in range(self.T)]})
        for i in range(3):
            inferred_rate[str(i)].append({"key":"influence: process"+str(i),
                "values":[[idx,j-test_model.bias[i]] for idx,j in enumerate(rates[:,i])]})
            with open('/Users/PauKung/hawkes_demo/webapp/static/data/infer'+str(i)+'.json','w') as outfile:
                json.dump({"out":inferred_rate[str(i)]},outfile)
        # output response function diagram (K x K timeseries)
        #plt.subplot(3,3,1)
        #for i in range(3):
        #    for j in range(3):
        #        plt.subplot(3,3,3*i+(j+1))
        #        plt.plot(np.arange(4),impulse[:,i,j],color="#377eb8", lw=2)
        #plt.savefig(fpath+"response_fun.png",transparent=True)
        # output background bias diagram (K x 1 timeseries)
        #plt.subplot(3,1,1)
        #for i in range(3):
        #    plt.subplot(3,1,i+1)
        #    plt.plot(np.arange(4),[test_model.bias_model.lambda0[i] for j in range(4)],color="#333333",lw=2)
        #plt.savefig(fpath+"bias.png",transparent=True)
        # output inferred rate diagram (K x 1 timeseries)
        #test_figure, test_handles = test_model.plot(color="#e41a1c", T_slice=(0,self.T))
        #plt.savefig(fpath+"inferred_rate.png",transparent=True)
        print test_model.W
        return test_model.W, inferred_rate, responses

    def execute_voice(self,ref,count_pair,tensor1,tensor2=None,tensor_cross=None,mode="discrete",dt_max=5,N_samples=1000,rescale=1.0,thres=0.05):
        model = DiscreteTimeStandardHawkesModel(K=self.K, dt_max=dt_max)
        print self.data.shape
        model.add_data(self.data)
        calc_Fref(model,ref)
        calc_Tensor(model,tensor1,(0,count_pair[0]),tensor_cross)
        if count_pair[0] != count_pair[1]:
            assert(tensor2 is not None)
            calc_Tensor(model,tensor2,(count_pair[0],count_pair[1]))
        
        model.fit_with_bfgs()
        sol = reweight_model(model,0.1)
        scale = sol[0]/sum(sol)
        scale *= rescale

        rate,rate_dist = compute_breakdown(model)
        rate_ref,rate_dist_ref = compute_breakdown(model,ref=True)
        #rate_pairs = sweep_series(rate_dist,rate_dist_ref,self.data,cutoff=0.05)
        rate_pairs = sweep_series(rate_dist,rate_dist_ref,self.data,model.Tensor,scale,cutoff=thres,ref=True)
        test_rate_dist = [[[0 for kk in range(self.data.shape[0])] for m in range(self.data.shape[1])] for k in range(self.data.shape[1])]
        for k in rate_pairs:
            for item in rate_pairs[k]:
                test_rate_dist[k][item[0]][item[1]] = item[2]
        
        cpair = count_pair
        if count_pair[0] == count_pair[1]:
            cpair = (0,count_pair[1])
        topid = [t+cpair[0] for t in np.argsort(np.sum(rate,axis=0)[cpair[0]:cpair[1]])[::-1]]
        
        return model.W, test_rate_dist, topid