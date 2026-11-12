# Portfolio Roadmap: "The Machine"

**Concept:** a scroll-driven portfolio. Visitors arrive in a dark room at night with a CRT computer on a desk. As they scroll, the lamp clicks on, the monitor powers up, and the camera flies into the screen. Inside, a retro OS boots and shows the portfolio window by window: About, Projects, Skills, Contact. At the end the screen powers off and the camera pulls back out. It's the same idea as Mind of Akira (enter-with-sound gate, scroll as the only control, sound design), but with a computer instead of a vinyl record.

**Stack:** Vite + ES modules, Three.js for the 3D worlds, GSAP + ScrollTrigger for the scroll timeline, Lenis for smooth scrolling, and Web Audio for synthesized sound (no audio files). See `README.md` for how to run it and where things live.

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
- [x] 🤖 Imported content from the old site (github.com/sean259/Personal-Profile): name, bio, quote, spec sheet, U-ConvertIT, QuestGo, Next build, tech stack, hobbies, education with logos, contact links
- [x] 🤖 Added two new windows: OFF_THE_CLOCK.TXT (hobbies) and EDUCATION.LOG
- [x] 🤖 Ferrari image hung as an "AMA ITER." poster in the room; portrait in ABOUT_ME.TXT
- [ ] 🙋 QuestGo screenshot → save as `assets/questgo.jpg` (see the comment in the QuestGo window)
- [ ] 🙋 Optional: `assets/resume.pdf` and a LinkedIn link
- [x] 🤖 Removed `assets/cit.jpg` and the other unused school logos (the education chapter was cut)
- [ ] 🤖 Add or remove project windows (see "Adding a project" in README.md)

## Phase 1.5: The journey + game style ✅ DONE
- [x] 🤖 After the boot: title card → pixel Sean walks from home past his school milestones (2015 → 2020 → 2022) and a jeepney → arrives at CIT-U → door opens → iris-out
- [x] 🤖 Inside the computer is now a pixel game: dialog windows in a CIT-U hallway, Player Profile, Quests, Inventory, Side Quests, Levels Cleared, Save Point
- [x] 🤖 Realistic walk: 16-frame procedural sprite (knee bend, arm swing, natural bob, planted feet), parallax depth, drifting clouds, birds, swaying trees, idling jeepney, dawn-to-day light, swinging school doors
- [x] 🤖 Hallway walk between portfolio sections; every image/icon converted to the same pixel style
- [x] 🤖 Scroll shortened ~30% (knobs: `VH_PER_BEAT`, `WALK`, `HOLD` at the top of `js/main.js`)
- [x] 🤖 Switched from pixel art to an illustrated, realistic style: skeletal SVG character with real gait curves (`js/character.js`), illustrated Cebu street + CIT-U + hallway (`js/scenes.js`), smooth storybook content cards
- [x] 🤖 Slower walk (`WALK = 40` beats) so every step and detail can be seen
- [ ] 🤝 Tweak Sean's look (colours/shapes in `markup()` in `js/character.js`) or his gait (`GAIT` keyframes)
- [ ] 🤖 Optional: background chiptune music for the walk

## Phase 1.6: Real-time 3D + transitions ✅ DONE
- [x] 🤖 Rebuilt everything in Three.js: 3D room (real lamp light, shadows, CRT boot screen), 3D Cebu street (sky that changes from dawn to day, swaying trees, jeepney, waving CIT-U flag), 3D hallway with a labeled door per section
- [x] 🤖 Sean is a jointed 3D character (`js/sean3d.js`) driven by the gait curves; he turns toward the CIT-U doors and walks in
- [x] 🤖 Transitions: camera dives into the CRT, flash to the street, captions at each school, glass doors swing open, card reveals (blur, clip, contents one by one), CRT power-off
- [x] 🤖 Snapping (cards never stop half-open), chapter menu, progress bar, camera widens slightly when scrolling fast
- [ ] 🙋 Optional: a rigged, photoreal character from Mixamo (.glb). The skeleton code can drive it.

## Phase 1.7: Premium finish ✅ DONE
- [x] 🤖 Film-style finishing pass (`js/post.js`): soft glow, filmic color grade, grain, vignette, color fringing, lens warp during the camera dives
- [x] 🤖 Environment reflections, smooth foliage, softer exposure
- [x] 🤖 Editorial typography (Instrument Serif + Inter), frosted cards, cinema letterbox, custom cursor, loading counter, refined chapter nav
- [x] 🤖 `?lite` URL switch skips the finishing pass on weak devices
- [ ] 🤖 Auto-switch to lite mode when the frame rate drops

## Phase 1.8: The jeepney commute ✅ DONE
- [x] 🤖 New story: Sean steps out of his front door → through the gate → waits at the curb → jeepney pulls up (horn) → boards at the rear and sits with other passengers → rides past each school → "Para po!" → gets off → walks into CIT-U
- [x] 🤖 Jeepney with open windows, benches, passengers, a driver, spinning wheels, body sway and an engine sound that follows its speed
- [x] 🤖 Road signs grow to fit each school's full name; all 3D labels auto-shrink so text never overflows
- [x] 🤖 Pacing knob: `RIDE` at the top of `js/main.js`

## Phase 1.9: Slow scroll + chapter spreads ✅ DONE
- [x] 🤖 Slower, heavier scrolling (`VH_PER_BEAT = 15`, Lenis `lerp 0.045` / `wheelMultiplier 0.55`, scrub 1.8)
- [x] 🤖 Each section is an editorial spread: chapter rail (number, serif title, progress line) + content laid out to fit one screen
- [x] 🤖 Zoom-to-fit, so no section ever needs an inner scrollbar (desktop and mobile)
- [x] 🤖 Ambient motion: glass sheen, slow zoom on screenshots, floating icons, drifting light on placeholders

## Phase 2.0: The classroom story ✅ DONE
- [x] 🤖 Hallway replaced by a 3D CIT-U classroom (desks, classmates, whiteboard, sunny windows)
- [x] 🤖 Sean walks in and sits → lifts his ID (Profile) → pulls his notebook over and opens it, turning a page per project (Quests) → opens his backpack (Inventory) → daydreams out the window (Side quests) → checks his phone (Save point: GitHub / Facebook / Gmail app icons)
- [x] 🤖 Each chapter has its own card transition (rise from ID, page flip, slide out of the bag, dreamy blur, phone raise)
- [x] 🤖 Levels Cleared removed; the jeepney ride covers the schools

## Phase 2.1: First-person close-ups ✅ DONE
- [x] 🤖 Each chapter dives from Sean's eyes into the prop (same lens warp as the CRT dive): ID → Profile, notebook (pages turn as you scroll) → Quests, backpack → Inventory, window → Side quests, phone → Save point
- [x] 🤖 Pulls back out between chapters; the 3D ID and phone have real faces (CIT-U badge, lock screen with app icons)

## Phase 2.2: Content on the props ✅ DONE
- [x] 🤖 New flow: CIT-U doors → corridor (stops, checks ID = Profile) → walks into CpE 301 → sits → notebook → laptop from the bag → window → phone
- [x] 🤖 On desktop each chapter is mapped onto its 3D object (CSS homography, updated every frame): printed on the ID badge, written on the notebook pages, on the laptop screen, on the window glass, on the phone screen. It stays attached as the camera dives in and pulls out.
- [x] 🤖 Smoother dives (eased twice, camera rolls to face each surface), ink fades between notebook pages; phones keep floating cards

## Phase 2.3: ID, phone & chapter transitions ✅ DONE
- [x] 🤖 ID twirls on the lanyard as he lifts it; the profile prints onto the badge top-to-bottom with a holographic shimmer (hidden while the badge faces away)
- [x] 🤖 Phone: content fits the 3D screen inside the bezel, held by the base (thumb off the screen), glass glare, screen wakes from black and unlocks with a swipe-up, items pop in one by one
- [x] 🤖 Cinematic chapter title band (number + kicker + serif title, gold rule) sweeps across between every chapter, with a whoosh

## Phase 2.4: ID swing + phone home screen ✅ DONE
- [x] 🤖 Removed the gold chapter title bands
- [x] 🤖 ID: he grabs it and flips it upright; it swings from its clip while the profile shows (camera frames the resting badge so the swing reads)
- [x] 🤖 Phone: a static home screen (clock, profile widget, GitHub / Facebook / Gmail app icons, email dock) on the same wallpaper as the 3D phone

## Phase 2.5: Polish pass ✅ DONE
- [x] 🤖 Phone held by its bottom edge (hand off the screen)
- [x] 🤖 Smoother zooms: one continuous curved glide eased at both ends, damped camera, never clips through Sean's head
- [x] 🤖 Orange tabby cat on the desk (breathing, tail flicks, ear twitches)
- [x] 🤖 Title is now "Journey of Sean" (intro screen + street title card)
- [x] 🤖 Chapters styled after their objects: premium ID badge (chip, barcode), notebook (tape, handwritten notes), laptop (desktop app window), window (handwritten daydream)

## Phase 2.6: Codebase cleanup ✅ DONE
- [x] 🤖 Moved to Vite: npm packages instead of CDN scripts, ES modules instead of globals, hashed and cached assets, hot reload while editing
- [x] 🤖 Split the 960-line `main.js` and 784-line `world3d.js` into focused modules (one per scene, timeline, scroll, HUD and so on), split the stylesheet by section, removed dead CSS and unused images
- [x] 🤖 ESLint (`npm run lint`), README with the project map

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
- [x] 🤖 Put the project under git and write a README
- [ ] 🙋 Create a GitHub repo and push (I can run the commands once you're logged in with `gh`)
- [ ] 🤝 Deploy free on **Netlify**, **Vercel** or **GitHub Pages** (static site, no server needed)
- [ ] 🙋 Optional: buy a domain (`yourname.com`) and point it at the host
- [ ] 🙋 Share it: LinkedIn, Instagram reel of the scroll, Awwwards / Godly / One Page Love submissions

---


How to run the site and where to edit things: see `README.md`.
