# Journey of Sean

Sean Lorico's portfolio: a scroll-driven 3D story. A CRT in a dark room boots up, the camera dives into the screen, and Sean commutes by jeepney from home to CIT-U. Each portfolio chapter appears on something he holds: his ID, a notebook, a laptop, the classroom window and his phone.

Built with [Three.js](https://threejs.org) (3D), [GSAP](https://gsap.com) + ScrollTrigger (scroll timeline), [Lenis](https://lenis.darkroom.engineering) (smooth scroll) and Web Audio (all sounds are synthesized), bundled with [Vite](https://vite.dev).

## Run it

Needs Node.js 18 or newer.

```bash
npm install      # once
npm run dev      # local dev server with hot reload → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm run lint     # check the code for mistakes
```

Opening `index.html` directly from disk no longer works. Use `npm run dev`.

Add `?lite` to the URL to skip the film-grain post-processing on slow devices.

## Where to edit things

| What | Where |
|---|---|
| Bio, projects, skills, hobbies, contact links | `index.html` (one `<article class="win">` per chapter) |
| Images | `src/assets/` (reference them as `/src/assets/name.jpg`) |
| Colours and fonts | `:root` in `src/styles/base.css` |
| Scroll length and pacing | `src/config.js` (`VH_PER_BEAT`, `RIDE`, `HOLD`) |
| Order and timing of scenes | `src/story/timeline.js` |
| What happens in each scene, frame by frame | `src/story/stages/` (`room`, `street`, `corridor`, `classroom`) |
| How each 3D world is built | `src/three/world/` |
| Sean's look and walk | `src/three/sean.js` |
| Sounds | `src/audio/sound.js` |

### Adding a project

Copy one of the `<article class="win proj" id="proj-N">` blocks in `index.html` and give it a new `id`. To place it in the notebook, add its id to `SURF_OF` in `src/story/surfaces.js` and to `BEATS` in `src/story/timeline.js` (copy the `proj-2` entry).

## Project structure

```
index.html              page markup and all portfolio content
src/
  main.js               entry point: wires everything together
  config.js             pacing knobs and environment flags
  utils.js              tiny DOM/math helpers
  audio/sound.js        synthesized sound effects
  story/
    state.js            values the timeline animates (S), loaded worlds (W)
    timeline.js         the master GSAP timeline
    scroll.js           Lenis, scroll → timeline, snapping
    frame.js            per-frame loop: choose scene, damp camera, render
    stages/*.js         per-scene animation + camera shots
    zoom.js             first-person dive into a prop
    surfaces.js         chapter cards pinned onto 3D props (CSS matrix3d)
    paths.js            Sean's walking paths
    renderer.js         WebGL renderer + camera
    worlds.js           builds all worlds after fonts load
  three/
    world/*.js          room, street, corridor, classroom (+ shared helpers)
    sean.js             the jointed 3D character and gait
    post.js             bloom, colour grade, grain, lens warp
  ui/                   intro gate, HUD, custom cursor
  styles/               CSS, one file per section (see index.css for order)
```

## Deploy

Any static host works. The build output is the `dist/` folder.

- **Vercel / Netlify:** import the repo. Build command `npm run build`, output directory `dist`.
- **GitHub Pages:** build, then publish `dist/` (for example with the `actions/deploy-pages` workflow).
