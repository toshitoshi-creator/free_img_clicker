# GLDv2 の tar（ID 順に並んでいる）から Range リクエストで1枚だけ取り出す
import urllib.request,re,functools,sys,os,csv,json,random,concurrent.futures as cf
B='https://s3.amazonaws.com/google-landmark/train/images_%03d.tar'
def rng(t,a,b):
    r=urllib.request.Request(B%t,headers={'Range':f'bytes={a}-{b}'});return urllib.request.urlopen(r,timeout=60).read()
@functools.lru_cache(None)
def size(t):
    r=urllib.request.Request(B%t,method='HEAD');return int(urllib.request.urlopen(r,timeout=60).headers['Content-Length'])
def headers_in(t,off,n=65536):
    off-=off%512;d=rng(t,off,off+n-1);out=[]
    for i in range(0,len(d)-512,512):
        h=d[i:i+512]
        if h[257:262]==b'ustar':
            name=h[:100].split(b'\0')[0].decode();
            if name.endswith('.jpg'):
                sz=int(h[124:136].split(b'\0')[0].strip() or b'0',8);out.append((name.split('/')[-1][:-4],off+i,sz))
    return out
@functools.lru_cache(None)
def first(t): return headers_in(t,0,4096)[0][0]
def find_tar(i):
    t=min(499,int(i[:3],16)*500//4096)
    while t>0 and first(t)>i: t-=1
    while t<499 and first(t+1)<=i: t+=1
    return t
def fetch(i):
    t=find_tar(i);lo,hi=0,size(t)
    for _ in range(40):
        if hi-lo<300000: break
        mid=(lo+hi)//2;hs=headers_in(t,mid,1048576)
        if not hs: hi=mid;continue
        if hs[0][0]>i: hi=mid
        else: lo=mid
    off=lo
    end=hi+1100000
    while off<end:
        for name,o,sz in headers_in(t,off,1048576):
            if name==i: return rng(t,o+512,o+512+sz-1)
            if name>i: return None
        off+=1048576-4096
    return None
if __name__=='__main__':
    out,ids=sys.argv[1],sys.argv[2:]
    os.makedirs(out,exist_ok=True)
    def go(i):
        p=f'{out}/{i}.jpg'
        if os.path.exists(p): return i,True
        try:
            b=fetch(i)
            if b: open(p,'wb').write(b);return i,True
        except Exception as e: return i,repr(e)
        return i,False
    with cf.ThreadPoolExecutor(6) as ex:
        for r in ex.map(go,ids): print(*r)
