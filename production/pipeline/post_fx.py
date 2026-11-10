import cv2, numpy as np, sys
def post(src,dst,shaft=0.6,bloom=1.0):
    im=cv2.imread(src).astype(np.float32)/255; g=im.mean(-1); h,w=g.shape
    m=np.clip((g-0.88)*8,0,1); acc=np.zeros_like(m); dx,dy=-0.014*w,0.022*h
    for i in range(1,30):
        acc+=cv2.warpAffine(m,np.float32([[1,0,dx*i],[0,1,dy*i]]),(w,h))*(1-i/30)
    acc=cv2.GaussianBlur(acc/9,(0,0),10); im+=acc[...,None]*np.array([0.75,0.9,1.0])*shaft
    br=np.clip(im-0.9,0,None); im+=cv2.GaussianBlur(br,(0,0),w*0.02)*bloom+cv2.GaussianBlur(br,(0,0),w*0.006)*0.5*bloom
    yy,xx=np.mgrid[0:h,0:w]; r=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2); im*=(1-0.22*np.clip(r-0.5,0,1))[...,None]
    cv2.imwrite(dst,(np.clip(im,0,1)*255).astype(np.uint8))
if __name__=="__main__": post(sys.argv[1],sys.argv[2])
