import cv2, numpy as np, sys
def post(src,dst,shaft=0.6,bloom=1.0):
    im=cv2.imread(src).astype(np.float32)/255; h,w=im.shape[:2]
    sm=cv2.resize(im,(w//4,h//4),interpolation=cv2.INTER_AREA); g=sm.mean(-1); hs,ws=g.shape   # effects at 1/4 res
    m=np.clip((g-0.88)*8,0,1); acc=np.zeros_like(m); dx,dy=-0.014*ws,0.022*hs
    for i in range(1,30):
        acc+=cv2.warpAffine(m,np.float32([[1,0,dx*i],[0,1,dy*i]]),(ws,hs))*(1-i/30)
    acc=cv2.GaussianBlur(acc/9,(0,0),2.5)
    br=np.clip(sm-0.9,0,None); bl=cv2.GaussianBlur(br,(0,0),ws*0.02)*bloom+cv2.GaussianBlur(br,(0,0),ws*0.006)*0.5*bloom
    add=acc[...,None]*np.array([0.75,0.9,1.0])*shaft+bl
    im+=cv2.resize(add.astype(np.float32),(w,h),interpolation=cv2.INTER_LINEAR)
    yy,xx=np.mgrid[0:h,0:w]; r=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2); im*=(1-0.22*np.clip(r-0.5,0,1))[...,None]
    cv2.imwrite(dst,(np.clip(im,0,1)*255).astype(np.uint8))
if __name__=="__main__": post(sys.argv[1],sys.argv[2])
