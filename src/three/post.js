/* ==========================================================
   POST-PROCESSING — the "premium film" finish.
   Scene → HDR multisampled target → bloom (bright pass + blur)
   → composite: chromatic aberration, lens warp, bloom, ACES tone
   map, colour grade, vignette, film grain → screen.

   const post = Post.create(renderer);
   post.setSize(w, h);
   post.render(scene, camera, { warp, bloom, time });
   ========================================================== */
import * as T from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const BRIGHT = `
  uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(c * smoothstep(threshold, threshold + 0.6, l), 1.0);
  }`;

const BLUR = `
  uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
  void main(){
    vec3 s = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
    s += texture2D(tDiffuse, vUv + dir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(tDiffuse, vUv - dir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(tDiffuse, vUv + dir * 3.2307692308).rgb * 0.0702702703;
    s += texture2D(tDiffuse, vUv - dir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s, 1.0);
  }`;

const COMPOSITE = `
  uniform sampler2D tScene; uniform sampler2D tBloom;
  uniform vec2 res; uniform float time, bloom, warp, exposure, grain, vignette;
  varying vec2 vUv;
  vec3 aces(vec3 x){ const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 c = vUv - 0.5;
    float r2 = dot(c, c);
    vec2 uv = 0.5 + c * (1.0 - warp * 0.35 + warp * r2 * 1.4);          // lens warp (dives)
    vec2 ab = c * (0.0016 + warp * 0.012) * (0.5 + r2 * 2.5);            // chromatic fringe
    vec3 col = vec3(texture2D(tScene, uv + ab).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ab).b);
    col += texture2D(tBloom, uv).rgb * bloom;
    col = aces(col * exposure);
    // grade: soft cinematic contrast, lifted cool blacks, warm highlights
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, 0.94);
    col = col + vec3(0.016, 0.014, 0.026) * (1.0 - l);
    col *= mix(vec3(0.985, 0.995, 1.02), vec3(1.035, 1.0, 0.95), smoothstep(0.25, 0.9, l));
    vec2 vc = c * vec2(res.x / res.y, 1.0);
    col *= 1.0 - vignette * smoothstep(0.35, 1.05, length(vc) * 1.15);
    col = pow(col, vec3(1.0 / 2.2));
    col += (hash(vUv * res + fract(time * 7.13) * 91.7) - 0.5) * grain;
    gl_FragColor = vec4(col, 1.0);
  }`;

function create(renderer) {
  const isGL2 = renderer.capabilities.isWebGL2;
  const type = isGL2 ? T.HalfFloatType : T.UnsignedByteType;
  // 24-bit depth (the default multisampled depth is only 16-bit → z-fighting on glass set into walls)
  let depthTexture;
  if (isGL2) { depthTexture = new T.DepthTexture(2, 2); depthTexture.type = T.UnsignedIntType; }
  const main = new T.WebGLRenderTarget(2, 2, { type, samples: isGL2 ? 4 : 0, depthTexture });
  const a = new T.WebGLRenderTarget(2, 2, { type });
  const b = new T.WebGLRenderTarget(2, 2, { type });
  const quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const qScene = new T.Scene(); qScene.add(quad);
  const shader = (frag, uniforms) => new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const bright = shader(BRIGHT, { tDiffuse: { value: null }, threshold: { value: 0.85 } });
  const blur = shader(BLUR, { tDiffuse: { value: null }, dir: { value: new T.Vector2() } });
  const comp = shader(COMPOSITE, {
    tScene: { value: main.texture }, tBloom: { value: a.texture }, res: { value: new T.Vector2() },
    time: { value: 0 }, bloom: { value: 0.55 }, warp: { value: 0 }, exposure: { value: 1.0 }, grain: { value: 0.035 }, vignette: { value: 0.42 }
  });
  const size = new T.Vector2();
  let bw = 1, bh = 1;

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(qScene, quadCam);
  }

  return {
    uniforms: comp.uniforms,
    setSize() {
      renderer.getDrawingBufferSize(size);
      main.setSize(size.x, size.y);
      bw = Math.max(1, Math.round(size.x / 4)); bh = Math.max(1, Math.round(size.y / 4));
      a.setSize(bw, bh); b.setSize(bw, bh);
      comp.uniforms.res.value.copy(size);
    },
    render(scene, camera, o = {}) {
      renderer.setRenderTarget(main);
      renderer.render(scene, camera);
      bright.uniforms.tDiffuse.value = main.texture; pass(bright, a);
      for (const r of [1, 2.2]) {
        blur.uniforms.tDiffuse.value = a.texture; blur.uniforms.dir.value.set(r / bw, 0); pass(blur, b);
        blur.uniforms.tDiffuse.value = b.texture; blur.uniforms.dir.value.set(0, r / bh); pass(blur, a);
      }
      const u = comp.uniforms;
      u.time.value = o.time || 0;
      u.warp.value = o.warp || 0;
      if (o.bloom != null) u.bloom.value = o.bloom;
      if (o.exposure != null) u.exposure.value = o.exposure;
      if (o.vignette != null) u.vignette.value = o.vignette;
      pass(comp, null);
    }
  };
}

export const Post = { create };
