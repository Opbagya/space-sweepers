import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { SUN_DIR } from "./sim";
import { Earth, EarthFallback, ReentryCorridorMarker } from "./Earth";
import { DebrisField, Mothercraft, Reviver } from "./Models";
import { FlightEffects } from "./FlightEffects";
import { SimLoop } from "./SimLoop";

export function SpaceScene() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 4, -14], fov: 60, near: 0.2, far: 50000 }}
        dpr={[1, 1.25]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          powerPreference: "high-performance",
          depth: true,
        }}
      >
        {/* Deep Cosmic Starfield */}
        <Stars
          radius={1200}
          depth={80}
          count={7000}
          factor={4}
          saturation={0.35}
          fade
          speed={0.4}
        />

        {/* Primary Sun Directional Light (Direct Crisp Illumination) */}
        <directionalLight
          position={[SUN_DIR.x * 220, SUN_DIR.y * 220, SUN_DIR.z * 220]}
          intensity={4.2}
        />

        {/* Secondary Soft Fill Light (Atmospheric Sun Scatter Fill) */}
        <directionalLight
          position={[-SUN_DIR.x * 180, -SUN_DIR.y * 90, -SUN_DIR.z * 180]}
          intensity={1.75}
          color="#a0c6ed"
        />

        {/* Low Earth Orbit Albedo Bounce (Sky: Starlight, Ground: Earth Cyan-Blue Albedo) */}
        <hemisphereLight
          args={["#e2f0ff", "#365373", 1.25]}
        />

        {/* Balanced Cosmic Ambient Fill - Ensures Clear Silhouette and Surface Detail in Deep Shadow */}
        <ambientLight intensity={0.85} color="#9ab8dc" />

        {/* Photorealistic Earth with Custom Atmospheric Shader */}
        <Suspense fallback={<EarthFallback />}>
          <Earth />
        </Suspense>

        {/* Atmospheric Reentry Disposal Gate Interface */}
        <ReentryCorridorMarker />

        {/* Orbital Mothercraft Base Hub */}
        <Mothercraft />

        {/* Reviver Active Debris Removal Servicer */}
        <Reviver />

        {/* Space Debris Targets (Upper Stages, Defunct Sats, Adapters) */}
        <DebrisField />

        {/* Motion Streaks, RCS Plumes, and Atmospheric Plasma Effects */}
        <FlightEffects />

        {/* High-Precision Physics, Camera Inertia & Controls Loop */}
        <SimLoop />

        {/* Soft Aerospace Post-Processing: Gentle Bloom & Filmic Vignette */}
        <EffectComposer multisampling={0} autoClear={false}>
          <Bloom
            luminanceThreshold={0.82}
            luminanceSmoothing={0.3}
            intensity={0.55}
            radius={0.5}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.16} darkness={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
