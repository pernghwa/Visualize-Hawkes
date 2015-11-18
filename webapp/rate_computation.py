import sys,json,datetime
import warnings
from operator import itemgetter
warnings.filterwarnings('ignore')

sys.path.append('/Users/PauKung/anaconda/lib/python2.7/site-packages/pybasicbayes')

import numpy as np

import pyhawkes.models
reload(pyhawkes.models)
from pyhawkes.models import DiscreteTimeStandardHawkesModel, DiscreteTimeNetworkHawkesModelSpikeAndSlab, ContinuousTimeNetworkHawkesModel

from cvxopt import matrix, solvers

def compute_breakdown(model,ref=False,index=None,ks=None):
    if index is None:
        index = 0
    if not ref:
        _,F = model.data_list[index]
    else:
        F = model.F_ref
        
    if ks is None:
        ks = np.arange(model.K)

    if isinstance(ks, int):
        R = F.dot(model.weights[ks,:])
        return R

    elif isinstance(ks, np.ndarray):
        Rs, out = [], []
        for k in ks:
            Rs.append(F.dot(model.weights[k,:])[:,None])
            tmp = []
            for j in ks:
                tmp.append(F[:,model.B*j+1:model.B*(j+1)+1].dot(model.weights[k,model.B*j+1:model.B*(j+1)+1])[:,None])
            out.append(np.concatenate(tmp, axis=1)[:,None])
        tensor = np.concatenate(out, axis=1) 
        if ref:
            tensor += model.Tensor
        return np.concatenate(Rs, axis=1), tensor

    else:
        raise Exception("ks must be int or array of indices in 0..K-1")    

# sweep time series and output significant pairs+timestamps
def sweep_series(data,data_ref,source,source_ref=None,scale=1.0,cutoff=0.05,time_range=(datetime.datetime(2015,7,4),datetime.datetime(2015,10,27)),time_scale=datetime.timedelta(hours=8),dt_max=6,ref=True):
    # data: TxKxK tensor
    assert(len(data.shape)==3)
    def lookback(source,kid,ts,dt=dt_max):
        for i in range(dt+1):
            if ts-i < 0 or i>=dt:
                return 0
            if source[ts-i,kid] > 0:
                return ts-i
        return False
    def lookahead(source,kid,ts,dt=dt_max):
        for i in range(dt+1):
            if ts + i >= source.shape[0] or i>=dt:
                return 0
            if source[ts+i,kid] > 0:
                return ts+i
    out = {i:[] for i in range(data.shape[1])}
    if source_ref is not None:
        source_vec = np.sum(source_ref,axis=2)
    for t in range(data.shape[0]):
        for k1 in range(data.shape[1]):
            tmp = []
            for k2 in range(data.shape[2]):
                if source_ref is None:
                    if data[t,k1,k2] > cutoff and lookahead(source,k1,t,dt_max/3)>0 and k2 != k1:
                        d = (k2,t,scale*data[t,k1,k2])
                        tmp.append(d)
                    continue
                v = 0
                if lookahead(source_vec,k1,t,dt_max/3)>0 and k2 != k1 and ref:
                    v += data_ref[t,k1,k2]
                    if lookback(source_ref[:,k1,:],k2,t,dt_max)==0:
                        v = 0.1*v
                t1 = lookahead(source,k1,t,dt_max/2)
                if data[t,k1,k2] > cutoff and t1>0 and k2 != k1:
                    t2 = lookback(source,k2,t)
                    if t2==0 or t1-t2>=dt_max:
                        tv = 0.05*data[t,k1,k2]
                    else:
                        tv = data[t,k1,k2]
                    tv *= scale
                    v += tv 
                elif not lookahead(source,k1,t,dt_max/3) or k2 == k1:
                    v = 0
                if v > cutoff:
                    d = (k2,t,v)
                    tmp.append(d) # pair: (affecting_pid,time,influence)
            tmp_sorted = sorted(tmp,key=itemgetter(2),reverse=True)[:5]
            for pair in tmp_sorted:
                out[k1].append(pair)
    return out


def rate_for_mat(model,lamb=1.0):
    Rs = []
    W = np.ones(model.weights.shape)*(1/float(model.B))*lamb
    for k in np.arange(model.K):
        Rs.append(model.F_ref.dot(W[k,:])[:,None])
    return np.concatenate(Rs, axis=1)  

# convex optimization with specific mentions
# maximize w_k*ll(data|w_k) + w_m*ll(data|w_m)
# subject sum(w_k+w_m) = 1
def reweight_model(model,lamb=1.0):
    def ll_term1(model):
        S,F = model.data_list[0]
        R = model.compute_rate(0)
        return (S * np.log(R) - R*model.dt).sum()      
    def ll_term2(model):
        S,_ = model.data_list[0]
        R = rate_for_mat(model,lamb)
        return (S * np.log(R) - R*model.dt).sum()
    term1 = ll_term1(model)
    term2 = ll_term2(model)
    print term1,term2
    if term1 > 0:
        term1 *= -1
    if term2 > 0:
        term2 *= -1
    Q = 2*matrix([ [1*term2*-1, .5], [.5, 1*term1*-1] ])
    p = matrix([1.0, 1.0])
    G = matrix([[-1.0,0.0],[0.0,-1.0]])
    h = matrix([0.0,0.0])
    A = matrix([1.0, 1.0], (1,2))
    b = matrix(1.0)
    sol = solvers.qp(Q, p, G, h, A, b)
    return sol['x']

def calc_Fref(model,ref_tensor):
    Ftens = model.basis.convolve_with_basis(ref_tensor)
    F = Ftens.reshape((ref_tensor.shape[0], model.K * model.B))
    # Prepend a column of ones
    model.F_ref = np.concatenate((np.ones((ref_tensor.shape[0],1)), F), axis=1)
    model.Tensor = np.zeros((ref_tensor.shape[0],model.K,model.K))

def calc_Tensor(model,tensor,dims,tensor_cross=None):
    tmp = tensor
    S_col = np.sum(tmp,axis=0)
    count = 0
    for i in range(tmp.shape[1]):
        for j in range(tmp.shape[2]):
            if S_col[i,j] > 0:
                tmp[:,count,:] /= S_col[i,j]
        count += 1
    model.Tensor[:,dims[0]:dims[1],dims[0]:dims[1]] += tmp
    if tensor_cross is not None:
        tmp2 = tensor_cross
        S_col = np.sum(tmp2,axis=0)
        print S_col.shape,dims[0],dims[1],model.Tensor.shape
        count = 0
        for i in range(tmp2.shape[1]):
            for j in range(tmp2.shape[2]):
                if S_col[i,j] > 0:
                    tmp2[:,count,:] /= float(S_col[i,j])
            count += 1
        print S_col
        model.Tensor[:,dims[0]:dims[1],dims[1]:] += tmp2