import bpy, sys, json, os
OUT,a,b=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
bpy.ops.wm.open_mainfile(filepath=OUT+"/scene.blend")
sc=bpy.context.scene; FPS=sc.render.fps
if os.path.exists(OUT+"/swaps.json"):
    SW=json.load(open(OUT+"/swaps.json"))
else:   # older format: per-character face timelines
    F=json.load(open(OUT+"/faces.json")); SW={n+"_facemat":seq for n,seq in F.items()}
def on_frame(scene,*x):
    t=(scene.frame_current-1)/FPS
    for mn,seq in SW.items():
        p=[q for s,q in seq if s<=t]; p=p[-1] if p else seq[0][1]
        img=bpy.data.images.load(p,check_existing=True)
        for nd in bpy.data.materials[mn].node_tree.nodes:
            if nd.type=='TEX_IMAGE': nd.image=img
bpy.app.handlers.frame_change_pre.append(on_frame)
sc.frame_start=a; sc.frame_end=b; sc.render.filepath=OUT+"/f_"
if sc.get("passes"):   # style v8: colour + depth/actor pass + light shadow map + matrices, per frame
    sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); import passes
    st=passes.setup(sc)
    for f in range(a,b+1):
        sc.frame_set(f); sc.render.filepath=f"{OUT}/f_{f:04d}.png"; bpy.ops.render.render(write_still=True)
        passes.render_depth(sc,st,f"{OUT}/d_{f:04d}.png")
        lc=passes.render_shadowmap(sc,st,f"{OUT}/s_{f:04d}.png")
        passes.matrices(sc,lc,f"{OUT}/m_{f:04d}.json")
else:
    bpy.ops.render.render(animation=True)
