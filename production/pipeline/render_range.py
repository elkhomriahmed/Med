import bpy, sys, json
OUT,a,b=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
bpy.ops.wm.open_mainfile(filepath=OUT+"/scene.blend")
F=json.load(open(OUT+"/faces.json")); sc=bpy.context.scene; FPS=sc.render.fps
def on_frame(scene,*x):
    t=(scene.frame_current-1)/FPS
    for n,seq in F.items():
        path=[p for s,p in seq if s<=t][-1]; img=bpy.data.images.load(path,check_existing=True)
        for nd in bpy.data.materials[n+"_facemat"].node_tree.nodes:
            if nd.type=='TEX_IMAGE': nd.image=img
bpy.app.handlers.frame_change_pre.append(on_frame)
sc.frame_start=a; sc.frame_end=b; sc.render.filepath=OUT+"/f_"
bpy.ops.render.render(animation=True)
