# Portfolio Roadmap: "The Machine"

**Concept:** a scroll-driven portfolio. Visitors arrive in a dark room at night with a CRT computer on a desk. As they scroll, the lamp clicks on, the monitor powers up, and the camera flies into the screen. Inside, a retro OS boots and shows the portfolio window by window: About, Projects, Skills, Contact. At the end the screen powers off and the camera pulls back out. It's the same idea as Mind of Akira (enter-with-sound gate, scroll as the only control, sound design), but with a computer instead of a vinyl record.

**Stack:** plain HTML/CSS/JS (no build step), GSAP + ScrollTrigger for the scroll timeline, Lenis for smooth scrolling, an inline SVG room (stays sharp at any zoom), and Web Audio for synthesized sound (no audio files).

**Legend:** 🤖 = Claude can do it · 🙋 = only you can do it · 🤝 = together

---

## Phase 0: Foundation ✅ DONE
- [x] 🤖 Project structure: `index.html`, `css/style.css`, `js/main.js`
- [x] 🤖 Intro gate (big name, "Power on with/without sound", mini computer icon)
- [x] 🤖 Illustrated room: window with rain and moon, desk, CRT, lamp, plant, mug, shelf, poster, real-time wall clock
- [x] 🤖 Scroll timeline: lamp on → monitor on → zoom into screen → boot → hero → about → 4 projects → skills → contact → power off → zoom out → outro
- [x] 🤖 Synthesized sound: rain, CRT hum, lamp click, power-on thunk, key ticks, window blips, shutdown
- [x] 🤖 HUD (chapter label, progress %, sound toggle), OS taskbar with live clock
- [x] 🤖 Responsive layout (tested at 1600×900 and 390×844 in a headless browser)

## Phase 1: Make it yours (content) ← YOU ARE HERE
- [ ] 🙋 Replace every "YOUR NAME" / "Your City" / placeholder sentence in `index.html`
- [ ] 🙋 Choose 3–5 real projects. For each: title, year, role, 1–2 sentence story, tags, link
- [ ] 🙋 Export a screenshot per project (1600×1200 JPG/WebP) into `assets/` and uncomment the `<img>` in each `.preview`
- [ ] 🙋 Real email and social links, plus `assets/resume.pdf`
- [ ] 🤝 Rewrite your About text: send me rough notes and I'll tighten them
- [ ] 🤖 Add or remove project windows: the timeline picks up any `.win.proj` automatically

## Phase 2: Make the room yours (personalization)
- [ ] 🤝 Swap room props for things that represent you (guitar, game console, posters of your work, a cat on the desk)
- [ ] 🤖 Change the poster to show your logo or your best project
- [ ] 🤖 Pick a palette: phosphor green (current), amber CRT, or a blue Akira-style accent
- [ ] 🤖 Easter eggs: clickable sticky note, typing in the terminal, a hidden "secret.exe" window

## Phase 3: Motion and sound polish
- [ ] 🤖 Tune the pacing (`VH_PER_BEAT` in `main.js` sets the overall scroll length)
- [ ] 🤖 Typewriter effect for boot lines, glitch transitions between windows
- [ ] 🤖 Optional snapping so each window "rests" in the center
- [ ] 🤝 Optional: replace synthesized sounds with real recordings (keyboard, CRT whine, lo-fi music bed). You source the files, I wire them up
- [ ] 🤖 Clickable chapter menu in the HUD (jump to WORK, CONTACT)

## Phase 4: Optional 3D upgrade (bigger lift)
- [ ] 🙋 Model (or download a CC0) 3D room and CRT in Blender, then export `.glb`
- [ ] 🤖 Rebuild the room in Three.js with real lighting. The same GSAP timeline drives the 3D camera, and the OS is projected onto the monitor mesh
- Note: this looks impressive but costs load time and mobile performance. Do it only after Phases 1–3 feel finished.

## Phase 5: Quality pass
- [ ] 🤖 Accessibility: a "skip the experience" link that shows a plain, readable version of all content; keyboard focus order; reduced-motion mode
- [ ] 🤖 SEO and sharing: real `<title>`, meta description, Open Graph image (screenshot of the room), favicon
- [ ] 🤖 Performance: self-host fonts, compress images, lazy-load project previews
- [ ] 🤝 Test on real devices: iPhone Safari, Android Chrome, a slow laptop. You test, I fix what you report

## Phase 6: Launch
- [ ] 🤖 Put the project under git and write a README
- [ ] 🙋 Create a GitHub repo and push (I can run the commands once you're logged in with `gh`)
- [ ] 🤝 Deploy free on **Netlify**, **Vercel** or **GitHub Pages** (static site, no server needed)
- [ ] 🙋 Optional: buy a domain (`yourname.com`) and point it at the host
- [ ] 🙋 Share it: LinkedIn, Instagram reel of the scroll, Awwwards / Godly / One Page Love submissions

---

## Where to edit things
| What | Where |
|---|---|
| Name, text, projects, links | `index.html` (sections marked `EDIT`) |
| Colors and fonts | top of `css/style.css` (`:root`) |
| Scroll length / pacing | `VH_PER_BEAT` in `js/main.js` |
| Order and timing of scenes | "MASTER TIMELINE" section in `js/main.js` |
| Room drawing | the `<svg>` in `index.html` (1600×900 coordinate space) |
| Sounds | `Sound` module at the top of `js/main.js` |

## Run it locally
Open `index.html` directly in a browser, or for a proper local server:
```
npx serve .
```
