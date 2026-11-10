import bpy, sys, os, time, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from toon import *
from sets import cottage
import characters as ch
OUT=sys.argv[-1]; SHOT=os.environ.get("SHOT","wide"); ENGINE=os.environ.get("ENGINE","CYCLES"); SAMPLES=int(os.environ.get("SAMPLES","48"))
sc=reset(pct=int(os.environ.get("PCT","50")))
if SHOT=="wide": cam,tgt=camera(sc,(1.25,-2.9,1.4),(-0.05,0.45,1.15),lens=34,fstop=5.6,focus=3.4)
else: cam,tgt=camera(sc,(0.55,-1.35,1.5),(-0.45,0.25,1.45),lens=40,fstop=2.8,focus=1.75)
cottage.build(); cottage.lights()
k=ch.keeper((-0.45,0.25,0),yaw=math.radians(-25),face=os.environ.get("KF","smug"),
    arms=[[(0.06,0,-0.05),(0.13,-0.03,-0.28),(0.16,-0.06,-0.5)],[(0.06,0,-0.05),(0.2,-0.05,-0.2),(0.34,-0.1,-0.02)]])
e=ch.engineer((0.5,0.65,0),yaw=math.radians(-40),face=os.environ.get("EF","happy"),
    arms=[[(0.05,-0.02,-0.04),(0.16,-0.12,-0.12),(0.3,-0.25,0.08)],[(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.11,-0.04,-0.5)]])
D_=bpy.data.collections
freestyle(sc,sets=[D_["set"]],chars=[D_["chars"]],set_thick=float(os.environ.get("SLINE","2.6")),char_thick=float(os.environ.get("CLINE","5.0")))
render_settings(sc,ENGINE,SAMPLES,exposure=float(os.environ.get("EXPO","-0.3")))
sc.render.filepath=OUT+".raw.png"; t=time.time(); bpy.ops.render.render(write_still=True); print("RENDERED",round(time.time()-t,1))
post(OUT+".raw.png",OUT+".png",bloom=float(os.environ.get('BLOOM','0.35')),sat=float(os.environ.get('SAT','1.3')))
