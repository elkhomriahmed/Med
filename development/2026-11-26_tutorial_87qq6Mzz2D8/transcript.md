# Transcript (Whisper small, word timestamps)

[0:00.00-0:03.40] If you clicked on this video, you probably know who Rick Clips is.
[0:03.78-0:07.20] His AI videos get at least a million views every day.
[0:07.50-0:11.96] And in this video, I'll show you how to make videos that come genuinely close to his quality.
[0:12.40-0:16.82] Before you write me off as another YouTube guru who promises Rick-level videos and delivers
[0:16.82-0:20.94] nothing close, let me show you the results. Here's a video I made myself.
[0:29.66-0:43.34] And here's a side-by-side comparison. I'll walk you through how I achieve this quality
[0:43.34-0:47.82] and how you can make these videos yourself. I've also built tools into the skill that let you
[0:47.82-0:51.36] shape the video exactly the way you want it. So stay until the end.
[0:51.84-0:55.60] So what's the real difference between my videos and everyone else's?
[0:55.96-0:59.66] Let's start with the characters. Most creators rely on character sheets,
[0:59.92-1:04.84] which are sets of pre-drawn poses of the character. Because of that, every movement is limited,
[1:05.16-1:07.26] and I'll show you exactly what that means shortly.
[1:07.80-1:13.18] Their characters are also usually a single flat color. The entire face is one solid fill,
[1:13.18-1:18.02] which is what makes it look flat. Now look at mine. The face is pure white,
[1:18.24-1:21.38] with cell shading on one side and a small highlight along the edge.
[1:21.82-1:25.70] That shading isn't fixed in one spot. It follows the light source in the scene.
[1:25.98-1:29.68] So if the light moves or the character turns, the shading moves with it.
[1:29.96-1:32.02] That's what keeps the character from looking flat.
[1:32.58-1:39.04] Next, expressions. Others use a fixed set of faces. One for happy, one for sad, one for angry,
[1:39.04-1:43.84] and that's it. This gives the character limited expressions, and it shows.
[1:44.50-1:49.42] My approach is different. I give Claude reference faces to work from, but it isn't restricted to
[1:49.42-1:54.48] them. Claude draws every expression based on what the character is feeling in that exact moment.
[1:54.90-1:59.52] It can even blend emotions, like slightly surprised and slightly worried at the same time,
[1:59.74-2:02.84] which produces expressions that don't exist in the references at all.
[2:03.20-2:08.08] When the emotion changes, the face doesn't snap from one expression to the next. It transitions
[2:08.08-2:13.54] across several frames. The eyebrows move first, and the mouth follows. If the eyes need to change
[2:13.54-2:18.94] shape, the switch is hidden inside a blink, and the head adds a small bounce so the change feels
[2:18.94-2:24.62] natural. Now, clothes and accessories. In most videos, the clothing either always faces the
[2:24.62-2:29.88] camera or flips abruptly from one angle to another when the character turns. Here's how I handle it.
[2:30.26-2:34.96] The body shape always faces the camera, but the clothing is drawn as if it's wrapped around a
[2:35.02-2:40.62] round invisible form underneath. When the character turns, the clothes turn with them. The stripes,
[2:41.00-2:46.38] buttons, tie, and pockets shift toward the side and compress near the edge, just like real clothing
[2:46.38-2:51.70] on a real body. The clothing is also lit by the same light as the rest of the scene. One side is
[2:51.70-2:56.48] slightly brighter, and the other slightly darker, with a soft sheen, a thin highlight along the
[2:56.48-3:00.94] edge where the light hits, and subtle fold lines where the fabric would bunch up. If something
[3:00.94-3:06.08] casts a shadow on the character, like a tree or a roof, that shadow falls across the clothing too.
[3:06.62-3:12.12] Accessories follow the same logic. Hats and hair are redrawn every frame to match the tilt of the
[3:12.12-3:17.04] head, so they lean and rotate with it, and they get their own highlights. When a character holds
[3:17.04-3:22.70] something, like a saw or a steering wheel, that object exists as a real 3D object in the scene,
[3:22.88-3:28.34] and the hands land on it and grip it. Then, character movement. Others use character sheets
[3:28.34-3:33.60] for movement as well, and that creates the same limitations. The character is almost always standing,
[3:33.98-3:37.48] the legs stay straight, and the only poses available are the ones that were drawn,
[3:37.88-3:43.52] so it can't convincingly meal, sit, crouch, or pick something up. My approach is built around
[3:43.52-3:49.02] how the arms, legs, and body are animated. Every character has an underlying 3D skeleton,
[3:49.40-3:56.44] with hips, chest, head, knees, elbows, hands, and feet. That skeleton moves through 3D space like
[3:56.44-4:01.36] a real body. The feet stay planted where they step, so there's no sliding. The knees and
[4:01.36-4:06.58] elbows bend the way real joints do, and the hands reach the actual objects they're interacting with.
[4:06.94-4:13.08] On top of that skeleton, the character is drawn in 2D, fresh, on every single frame. The body,
[4:13.42-4:19.70] arms, legs, clothing, face, and hat are all redrawn to match the pose for that exact frame.
[4:20.08-4:24.06] That means the character can do almost anything. Kneel down to cut the road,
[4:24.06-4:28.96] sit in a car with bent knees and hands on the wheel, jump, fall, or swing a hammer,
[4:29.28-4:36.06] all while still looking like a clean 2D cartoon. Next, backgrounds and objects. Other creators use
[4:36.06-4:41.00] 3D backgrounds too, but they're mostly flat colors with no texture and very simple shapes.
[4:41.50-4:47.32] In my videos, the whole world is real 3D, and Claude builds every single thing in it from code.
[4:47.32-4:53.94] Nothing is downloaded or pasted in. The road, the guardrails, the fields, the cars, the signs,
[4:54.24-4:57.90] the saw, even the coffee thermos. All of it is built from scratch.
[4:58.42-5:03.14] Because Claude builds each object part by part, every part can move on its own.
[5:03.56-5:09.60] Cardoors open to reveal a real interior, with seats, pedals, a dashboard, and thick door panels.
[5:10.16-5:15.14] The wheels turn. A guardrail bends when a car hits it. The saw's blade spins.
[5:15.78-5:21.14] Everything has texture too. The road has cracks and small stones. The seats have stitching.
[5:21.70-5:26.28] The sign has dirt and bolts on it, and the fields stretch all the way to the horizon.
[5:26.82-5:32.22] The world also reacts to the story. When he cuts the road, real grooves appear, along with sparks
[5:32.22-5:37.86] and dust. When a car crashes, the rail bends. The car gets dented and the camera shakes.
[5:38.62-5:43.88] Now, lighting. Most creators use flat lighting, where everything is equally bright and there
[5:43.88-5:49.60] barely any shadows. In my videos, there's a real sun in the sky, and everything gets its light from
[5:49.60-5:55.30] it. Objects cast real shadows on the ground, and clouds cast soft shadows that drift across the
[5:55.30-6:00.90] fields. Shiny objects like the cars, the saw, and the hard hat catch the light with small highlights.
[6:01.42-6:06.92] The scene also moves through time of day. Day turns into sunset, and sunset turns into a dark
[6:06.92-6:10.82] night, where the headlights light up the road and everything around them stays dark.
[6:10.82-6:16.12] Here's the key part. The characters are lit by that same sun. Their shading and
[6:16.12-6:20.62] highlights follow wherever the light is coming from, so they always look like they belong in the
[6:20.62-6:26.56] scene. Even at night, their faces stay white and clean instead of turning muddy gray. And if something
[6:26.56-6:32.40] casts a shadow on a character, like a tree or a roof, that shadow lands on them too. Finally,
[6:32.82-6:37.66] camera and sound effects. The camera always follows the story. Whenever the voice talks
[6:37.66-6:42.42] about an object or something the character is doing, the camera smoothly zooms in on it,
[6:42.60-6:47.42] like the saw cutting the road or the coffee spilling on the seat, and then eases back out.
[6:47.86-6:54.22] Every move is slow and smooth, with no sudden jumps. It also uses creative angles, right down at
[6:54.22-6:59.12] road level next to the grooves, high up looking down the highway, through the car's side window,
[6:59.42-7:04.68] and from the driver's own point of view. For sound, every effect is a real recording placed
[7:04.68-7:10.10] on the exact moment it happens on screen. You hear the saw when it cuts, cars driving past,
[7:10.48-7:14.48] the crunch when a car hits the rail, and the splash when the coffee goes everywhere.
[7:15.02-7:19.08] None of these sounds are generated by Claude. It downloads them straight from the internet,
[7:19.28-7:23.88] which is what makes them sound so realistic. The background music sits under the voice,
[7:24.18-7:27.10] loud enough to set the mood without covering what's being said.
[7:27.64-7:32.90] Now, when I have a video script, I plan every scene in full detail before anything gets made.
[7:32.90-7:38.28] That includes the camera moves, the angles, what each character does, and what happens on every
[7:38.28-7:43.56] line of the voice, because AI is only as smart as the person prompting it. If you want to skip
[7:43.56-7:48.28] the hard part and start making quality videos right away, the skill is available in my school
[7:48.28-7:53.26] community. It includes a guide on how to write your prompts so you get exactly the video you want.
[7:53.58-7:58.10] It also comes with two tools. The first is a camera editor, where you can change the camera
[7:58.10-8:02.64] moves and angles in your video. The second is a background music picker, where you watch the
[8:02.64-8:06.50] fully rendered video, try different tracks over it, and pick the one that fits best.
[8:06.94-8:11.88] And no, it's not free. I can't realistically help everyone who reaches out if it is,
[8:12.18-8:15.68] and I've put a lot of time and effort into getting it to this level of quality.
[8:16.06-8:19.74] That's all for today. Make sure to like and subscribe. See you in the next one!
