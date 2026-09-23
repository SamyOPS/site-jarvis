"use client";

import { useEffect, useRef } from "react";

// Flux animé en arrière-plan du footer : un shader WebGL (pas de dépendance,
// ~un triangle plein écran + un fragment shader). Le motif est un bruit fbm
// « domain-warped » : les couches se déforment les unes les autres, ce qui donne
// des nappes qui s'écoulent lentement plutôt qu'un dégradé qui pulse.
//
// Sobriété et coût maîtrisés :
//  - rendu à 55 % de la résolution CSS puis étiré (le motif est diffus, la perte
//    est invisible et le coût par pixel est divisé par ~3) ;
//  - la boucle d'animation ne tourne QUE lorsque le footer est à l'écran ;
//  - `prefers-reduced-motion` → une seule image, figée ;
//  - sans WebGL, le canvas reste vide et le footer garde son fond uni.
//
// Deux encres, comme le pied de page qui l'accueille : le flux est peint en
// clair sur le fond noir, en sombre sur le fond beige. Les couleurs passent en
// uniformes plutôt que par deux shaders — c'est le même motif, seul le nuancier
// change.

type ShaderVariant = "dark" | "light";

type Tone = {
  trough: [number, number, number];
  crest: [number, number, number];
  glow: [number, number, number];
  /** Densite d'ensemble du flux. */
  ink: number;
  /**
   * Hauteur, en vh, dont le flux deborde AU-DESSUS du footer.
   *
   * Sombre : 55vh. Le flux mord sur la FAQ, elle-meme noire, et ce
   * chevauchement EST la jointure entre les deux sections.
   *
   * Clair : aucun. Le pied de page clair termine des pages composees sur blanc
   * — offres d'emploi, pages legales. Une encre sombre debordant de 55vh y
   * poserait un voile sur les cartes d'offres, qu'on lirait comme un defaut de
   * rendu et non comme une transition. Le flux reste chez lui.
   */
  overlapVh: number;
  /**
   * Part haute du canvas dissoute lorsque le debordement n'y suffit pas.
   *
   * Sans debordement, le flux s'arreterait net au bord superieur du footer.
   * Ce plancher lui donne de quoi s'eteindre a l'interieur meme du footer.
   */
  minFade: number;
};

/**
 * Nuanciers du flux, accordes aux deux encres du pied de page.
 *
 * `dark` : bleu froid dans les creux, blanc dans les cretes — le flux eclaire
 * le fond noir. `light` : le meme bleu, assombri, vers un noir d'encre dans les
 * cretes — le flux marque le fond beige.
 */
const TONES: Record<ShaderVariant, Tone> = {
  dark: {
    trough: [0.55, 0.62, 0.8],
    crest: [1, 1, 1],
    glow: [1, 1, 1],
    ink: 1,
    overlapVh: 55,
    // Zero : le debordement fournit deja toute la dissolution necessaire, et un
    // plancher modifierait le rendu de /decouvrir sur les footers tres hauts.
    minFade: 0,
  },
  light: {
    trough: [0.38, 0.46, 0.66],
    crest: [0.09, 0.1, 0.12],
    glow: [0.05, 0.05, 0.07],
    ink: 0.8,
    overlapVh: 0,
    minFade: 0.3,
  },
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
// Part haute du canvas (0 → 1) qui déborde sur la FAQ : le flux s'y dissout.
uniform float uFade;
// Curseur, en pixels de rendu (origine en bas à gauche, comme gl_FragCoord),
// et sa présence (0 → 1) pour que le halo naisse et meure en fondu.
uniform vec2 uMouse;
uniform float uMouseK;
// Nuancier : couleur des creux, des crêtes, et cible du halo au survol.
uniform vec3 uTrough;
uniform vec3 uCrest;
uniform vec3 uGlow;
// Densité d'ensemble du flux. Une encre sombre sur fond clair pèse plus lourd
// à opacité égale qu'une encre claire sur fond noir : on l'allège.
uniform float uInk;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime * 0.045;

  // Halo du curseur : gaussienne douce, dans le même espace que le motif.
  vec2 mp = (uMouse / uRes) * vec2(uRes.x / uRes.y, 1.0);
  float md = distance(p, mp);
  float glow = uMouseK * exp(-md * md * 5.5);

  // Le flux ne fait pas que s'éclairer : il est légèrement repoussé par le
  // curseur, ce qui donne l'impression qu'on le déplace en le survolant.
  p += ((p - mp) / max(md, 1e-4)) * glow * 0.07;

  // Fréquences basses : de larges nappes plutôt qu'un grain serré.
  vec2 q = vec2(fbm(p * 0.9 + vec2(t, 0.0)), fbm(p * 0.9 + vec2(3.2, -t)));
  vec2 r = vec2(
    fbm(p * 1.1 + 2.0 * q + vec2(1.7, 9.2) + 0.35 * t),
    fbm(p * 1.1 + 2.0 * q + vec2(8.3, 2.8) - 0.28 * t)
  );
  float f = fbm(p * 0.85 + 2.2 * r);

  float flow = smoothstep(0.22, 0.88, f);

  // Nappe froide dans les creux, encre pleine dans les crêtes ; le halo tire
  // encore la zone survolée vers cette encre.
  vec3 tint = mix(uTrough, uCrest, flow);
  tint = mix(tint, uGlow, glow * 0.7);

  // Opacité : le canvas est transparent là où il n'y a pas de flux, sinon il
  // masquerait le bas de la FAQ sur laquelle il déborde.
  float a = flow * 0.5 * uInk;

  // Éclairage : on amplifie le flux existant sous le curseur, et on ajoute une
  // lueur ténue pour que le halo se devine même là où le flux est absent.
  a *= 1.0 + glow * 2.4;
  a += glow * 0.09 * (0.4 + flow);

  // Dissolution vers le haut, sur toute la zone de débordement : c'est ce qui
  // fait la jointure entre les deux sections.
  a *= smoothstep(1.0, 1.0 - uFade, uv.y);

  // Léger retrait latéral pour ne pas border l'écran d'un liseré.
  a *= 0.72 + 0.28 * smoothstep(1.2, 0.3, length(vec2((uv.x - 0.5) * 1.3, (uv.y - 0.5) * 0.7)));

  // Alpha prémultiplié (attribut de contexte par défaut).
  a = clamp(a, 0.0, 1.0);
  gl_FragColor = vec4(tint * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function FooterShader({
  variant = "dark",
}: {
  variant?: ShaderVariant;
}) {
  const tone = TONES[variant];
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const { overlapVh, minFade, ...ink } = TONES[variant];

    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl || gl.isContextLost()) return; // le footer garde son fond uni

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Un seul triangle qui déborde de l'écran : moins de sommets qu'un quad.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Fusion en alpha prémultiplié : le flux s'ajoute au fond sans l'effacer.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uFade = gl.getUniformLocation(prog, "uFade");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uMouseK = gl.getUniformLocation(prog, "uMouseK");

    // Le nuancier ne bouge pas d'une image a l'autre : on le pose une fois.
    gl.uniform3fv(gl.getUniformLocation(prog, "uTrough"), ink.trough);
    gl.uniform3fv(gl.getUniformLocation(prog, "uCrest"), ink.crest);
    gl.uniform3fv(gl.getUniformLocation(prog, "uGlow"), ink.glow);
    gl.uniform1f(gl.getUniformLocation(prog, "uInk"), ink.ink);

    const SCALE = 0.55; // résolution de rendu, relative à la taille CSS
    let fade = 0.4; // part haute du canvas qui déborde sur la section du dessus
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      // Le débordement est exprimé en vh : on en déduit la fraction de canvas à
      // dissoudre, quelle que soit la hauteur du footer. Sans débordement, le
      // plancher de la variante prend le relais.
      const overlapPx = (window.innerHeight * overlapVh) / 100;
      fade = Math.min(
        0.85,
        Math.max(minFade, overlapPx / Math.max(1, canvas.clientHeight)),
      );
    };

    // Curseur : cible (posée par l'événement) et valeur affichée, qui la
    // rattrape à chaque image. Ce lissage évite un halo qui saute d'un point à
    // l'autre et donne au flux l'inertie d'une matière.
    const target = { x: 0, y: 0, k: 0 };
    const cur = { x: 0, y: 0, k: 0 };

    const draw = (time: number) => {
      resize();
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      cur.k += (target.k - cur.k) * 0.08;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uFade, fade);
      gl.uniform2f(uMouse, cur.x, cur.y);
      gl.uniform1f(uMouseK, cur.k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Une première passe tout de suite : le buffer est dimensionné et effacé
    // dès le montage. Sans cela, un canvas jamais dessiné garde son buffer par
    // défaut (300×150) au contenu indéfini, que le compositeur peut afficher en
    // blanc par-dessus tout le footer.
    draw(0);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      // Une frame de délai : au premier passage, la mise en page n'est pas
      // toujours faite et le canvas mesurerait 0 (image figée restée vide).
      const once = requestAnimationFrame(() => draw(0));
      const onResizeStatic = () => draw(0);
      window.addEventListener("resize", onResizeStatic);
      return () => {
        cancelAnimationFrame(once);
        window.removeEventListener("resize", onResizeStatic);
      };
    }

    // La boucle ne tourne que quand le footer est visible.
    let raf = 0;
    let start = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !raf) raf = requestAnimationFrame(loop);
      if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(canvas);

    const onResize = () => {
      if (!raf) draw(0); // maintient l'image nette même à l'arrêt
    };
    window.addEventListener("resize", onResize);

    // Le canvas est en `pointer-events-none` (il ne doit rien intercepter) :
    // on écoute donc la fenêtre et on ramène la position dans son repère. Le
    // survol de la zone de débordement, sur la FAQ, allume donc aussi le flux.
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const onPointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      target.k = inside ? 1 : 0;
      if (!inside) return;
      // Repère du shader : pixels de rendu, origine en bas à gauche.
      target.x = ((e.clientX - r.left) / r.width) * canvas.width;
      target.y = (1 - (e.clientY - r.top) / r.height) * canvas.height;
      // Premier survol : on place le halo sans le faire glisser depuis (0,0).
      if (cur.k < 0.01) {
        cur.x = target.x;
        cur.y = target.y;
      }
    };
    const onPointerLeave = () => {
      target.k = 0;
    };

    if (finePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (raf) cancelAnimationFrame(raf);
      // Surtout ne pas appeler `WEBGL_lose_context` ici : un contexte perdu est
      // rendu tel quel au montage suivant (React monte deux fois en dev, et une
      // navigation client remonte le composant), les shaders ne compileraient
      // plus et le canvas resterait un buffer 300×150 jamais dessiné — donc
      // blanc. Le contexte est libéré avec le canvas par le ramasse-miettes.
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        top: `-${tone.overlapVh}vh`,
        height: `calc(100% + ${tone.overlapVh}vh)`,
      }}
      className="pointer-events-none absolute left-0 w-full"
    />
  );
}
