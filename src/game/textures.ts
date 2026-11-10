import * as THREE from "three";

const cache = new Map<string, unknown>();
function memo<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as T;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Crinkled multi-layer insulation foil: color + bump maps from the same facets */
export function getFoil(tint: "gold" | "silver" | "dark") {
  return memo("foil-" + tint, () => {
    const S = 512;
    const [c, g] = canvas(S, S);
    const [bc, bg] = canvas(S, S);
    const hue = tint === "gold" ? 42 : tint === "silver" ? 210 : 220;
    const sat = tint === "gold" ? 80 : tint === "silver" ? 8 : 12;
    const light = tint === "dark" ? 22 : 52;
    
    g.fillStyle = `hsl(${hue},${sat}%,${light}%)`;
    g.fillRect(0, 0, S, S);
    bg.fillStyle = "#808080";
    bg.fillRect(0, 0, S, S);

    for (let i = 0; i < 220; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 8 + Math.random() * 36;
      const pts = [0, 1, 2].map(() => [
        x + (Math.random() - 0.5) * r * 2,
        y + (Math.random() - 0.5) * r * 2,
      ] as [number, number]) as [[number, number], [number, number], [number, number]];
      
      const l = light - 8 + Math.random() * 32;
      const bl = Math.floor(Math.random() * 255);
      
      g.fillStyle = `hsla(${hue + (Math.random() - 0.5) * 8},${sat}%,${l}%,0.6)`;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      g.lineTo(pts[1][0], pts[1][1]);
      g.lineTo(pts[2][0], pts[2][1]);
      g.closePath();
      g.fill();

      bg.fillStyle = `rgba(${bl},${bl},${bl},0.65)`;
      bg.beginPath();
      bg.moveTo(pts[0][0], pts[0][1]);
      bg.lineTo(pts[1][0], pts[1][1]);
      bg.lineTo(pts[2][0], pts[2][1]);
      bg.closePath();
      bg.fill();
    }

    // Grid seam lines
    g.strokeStyle = `hsla(${hue},${sat}%,20%,0.7)`;
    g.lineWidth = 2.5;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(0, (i * S) / 4);
      g.lineTo(S, (i * S) / 4);
      g.stroke();

      g.beginPath();
      g.moveTo((i * S) / 4, 0);
      g.lineTo((i * S) / 4, S);
      g.stroke();
    }

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;

    const bump = new THREE.CanvasTexture(bc);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;

    return { map, bump };
  });
}

/** Crystalline blue solar panel texture with busbars and anti-reflective coating */
export function getSolar(variant: "deep" | "cyan" | "gold") {
  return memo("solar-" + variant, () => {
    const S = 512;
    const [c, g] = canvas(S, S);
    g.fillStyle = "#1e2430";
    g.fillRect(0, 0, S, S);

    const n = 8;
    const cs = S / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const grd = g.createLinearGradient(i * cs, j * cs, (i + 1) * cs, (j + 1) * cs);
        const base: [number, number, number] =
          variant === "deep" ? [12, 28, 70] : variant === "cyan" ? [10, 55, 95] : [65, 45, 15];
        const v = (Math.random() - 0.5) * 16;
        
        grd.addColorStop(0, `rgb(${Math.max(0, base[0] + v)},${Math.max(0, base[1] + v)},${Math.max(0, base[2] + v)})`);
        grd.addColorStop(1, `rgb(${base[0] * 0.5},${base[1] * 0.5},${base[2] * 0.7})`);
        
        g.fillStyle = grd;
        g.fillRect(i * cs + 2, j * cs + 2, cs - 4, cs - 4);

        // Thin silver busbars
        g.strokeStyle = "rgba(220, 235, 255, 0.4)";
        g.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          g.beginPath();
          g.moveTo(i * cs + (k * cs) / 4, j * cs + 2);
          g.lineTo(i * cs + (k * cs) / 4, (j + 1) * cs - 2);
          g.stroke();
        }
      }
    }

    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  });
}

/** High-intensity glowing flare sprite */
export function getGlow() {
  return memo("glow", () => {
    const [c, g] = canvas(128, 128);
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255, 255, 255, 1)");
    grd.addColorStop(0.18, "rgba(100, 220, 255, 0.9)");
    grd.addColorStop(0.45, "rgba(0, 160, 255, 0.3)");
    grd.addColorStop(1, "rgba(0, 80, 255, 0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  });
}

/** Re-entry fiery plasma flame particle */
export function getPlasmaFlame() {
  return memo("plasmaFlame", () => {
    const [c, g] = canvas(128, 128);
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255, 255, 230, 1)");
    grd.addColorStop(0.2, "rgba(255, 180, 30, 0.95)");
    grd.addColorStop(0.5, "rgba(255, 60, 0, 0.5)");
    grd.addColorStop(0.85, "rgba(180, 20, 0, 0.15)");
    grd.addColorStop(1, "rgba(60, 0, 0, 0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  });
}

/** Tapered supersonic rocket flame jet ribbon (electric cyan & white core) */
export function getRocketFlameTrail() {
  return memo("rocketFlameTrail", () => {
    const [c, g] = canvas(128, 512);
    // Vertical gradient: full intensity at nozzle (top, y=0), fading to needle tip (bottom, y=512)
    const grd = g.createLinearGradient(64, 0, 64, 512);
    grd.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grd.addColorStop(0.08, "rgba(210, 245, 255, 0.95)");
    grd.addColorStop(0.35, "rgba(50, 190, 255, 0.85)");
    grd.addColorStop(0.7, "rgba(20, 100, 255, 0.4)");
    grd.addColorStop(1, "rgba(10, 40, 200, 0.0)");

    // Draw aerodynamic tapered jet profile
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(44, 0);
    g.quadraticCurveTo(34, 180, 56, 420);
    g.lineTo(64, 512);
    g.lineTo(72, 420);
    g.quadraticCurveTo(94, 180, 84, 0);
    g.closePath();
    g.fill();

    // Hot central shock core
    const coreGrd = g.createLinearGradient(64, 0, 64, 280);
    coreGrd.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    coreGrd.addColorStop(0.4, "rgba(240, 250, 255, 0.9)");
    coreGrd.addColorStop(1, "rgba(150, 230, 255, 0.0)");
    g.fillStyle = coreGrd;
    g.beginPath();
    g.moveTo(56, 0);
    g.lineTo(60, 280);
    g.lineTo(68, 280);
    g.lineTo(72, 0);
    g.closePath();
    g.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Massive atmospheric re-entry fire wake ribbon (incandescent yellow/orange/crimson) */
export function getReentryFlameTrail() {
  return memo("reentryFlameTrail", () => {
    const [c, g] = canvas(256, 1024);
    // Vertical gradient: white/yellow bow shock at top (y=0) to smoky red wake at bottom (y=1024)
    const grd = g.createLinearGradient(128, 0, 128, 1024);
    grd.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grd.addColorStop(0.06, "rgba(255, 235, 140, 0.98)");
    grd.addColorStop(0.25, "rgba(255, 130, 20, 0.9)");
    grd.addColorStop(0.55, "rgba(235, 50, 10, 0.65)");
    grd.addColorStop(0.85, "rgba(160, 20, 10, 0.25)");
    grd.addColorStop(1, "rgba(60, 10, 10, 0.0)");

    // Fluid aerodynamic wake outline
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(70, 0);
    g.quadraticCurveTo(40, 350, 90, 800);
    g.lineTo(128, 1024);
    g.lineTo(166, 800);
    g.quadraticCurveTo(216, 350, 186, 0);
    g.closePath();
    g.fill();

    // Hot incandescent white center spine
    const spineGrd = g.createLinearGradient(128, 0, 128, 500);
    spineGrd.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    spineGrd.addColorStop(0.2, "rgba(255, 250, 200, 0.95)");
    spineGrd.addColorStop(0.6, "rgba(255, 180, 50, 0.6)");
    spineGrd.addColorStop(1, "rgba(255, 100, 20, 0.0)");
    g.fillStyle = spineGrd;
    g.beginPath();
    g.moveTo(110, 0);
    g.lineTo(120, 500);
    g.lineTo(136, 500);
    g.lineTo(146, 0);
    g.closePath();
    g.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}
