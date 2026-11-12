import json,sys,os
S=sys.argv[1]; V=os.path.dirname(os.path.abspath(__file__))
segs=[f"{S}/v1/seg/{s}" for s in ("A1","A2","B","C")]
sfx=[]
for d in segs: sfx+=json.load(open(d+"/sfx.json"))
cuts=[29.0,34.65,46.4]
sfx+=[("shutter",t-0.02,0.9) for t in cuts]
json.dump({"segments":segs,"words":f"{S}/v1/words.json","voice":f"{S}/v1/vo_fast.wav","sfx":sfx,"flashes":cuts,
           "music":"/home/user/Med/production/library/music/cartoon_funny_quirky_5min.mp3","music_gain":0.10,"music_dip":33.6,
           "out":f"{V}/lighthouse_mercury_final.mp4","tmp":f"{S}/v1/finish"},open(f"{S}/v1/finish.json","w"),indent=1)
print(len(sfx),"sound events")
