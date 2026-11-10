import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sim } from "./sim";
import { getGlow, getPlasmaFlame } from "./textures";

const STREAK_COUNT = 180;
const DUST_COUNT = 120;
const THRUST_COUNT = 36;
const EMBER_COUNT = 60;

export function FlightEffects() {
  const glowTex = useMemo(() => getGlow(), []);
  const plasmaTex = useMemo(() => getPlasmaFlame(), []);

  // 1. Dynamic Velocity Streaks (Line Segments that elongate along velocity vector)
  const streakGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(STREAK_COUNT * 6); // 2 vertices per line
    const colors = new Float32Array(STREAK_COUNT * 6);

    for (let i = 0; i < STREAK_COUNT; i++) {
      const x = (Math.random() - 0.5) * 160;
      const y = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;

      // Head
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      // Tail (initially at same spot)
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z - 0.5;

      // Color (White/Cyan soft gradient)
      colors[i * 6 + 0] = 0.8;
      colors[i * 6 + 1] = 0.9;
      colors[i * 6 + 2] = 1.0;
      colors[i * 6 + 3] = 0.3;
      colors[i * 6 + 4] = 0.5;
      colors[i * 6 + 5] = 0.8;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // 2. Ambient Space Dust Bokeh
  const dustGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  // 3. Dynamic Reviver Engine Exhaust Sparks (shooting backward out of thruster bell)
  const thrustGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(THRUST_COUNT * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);
  const thrustVels = useRef<Float32Array>(new Float32Array(THRUST_COUNT * 3));
  const thrustLives = useRef<Float32Array>(new Float32Array(THRUST_COUNT));

  // 4. Dynamic Atmospheric Re-entry Fire Embers for burning debris
  const emberGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(EMBER_COUNT * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);
  const emberVels = useRef<Float32Array>(new Float32Array(EMBER_COUNT * 3));
  const emberLives = useRef<Float32Array>(new Float32Array(EMBER_COUNT));

  const streakLines = useRef<THREE.LineSegments>(null);
  const dustPoints = useRef<THREE.Points>(null);
  const thrustPoints = useRef<THREE.Points>(null);
  const emberPoints = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (!streakLines.current) return;

    const posAttr = streakGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const speed = sim.vel.length();
    const isMoving = speed > 0.8 || sim.boosting;

    streakLines.current.visible = isMoving;

    if (isMoving) {
      const moveFactor = sim.boosting ? 1.5 : 1.0;
      const moveX = sim.vel.x * moveFactor;
      const moveY = sim.vel.y * moveFactor;
      const moveZ = sim.vel.z * moveFactor;

      const trailLen = Math.min(10.0, Math.max(0.4, speed * 0.16));
      const invSpeed = 1 / Math.max(speed, 0.001);
      const dirX = sim.vel.x * invSpeed;
      const dirY = sim.vel.y * invSpeed;
      const dirZ = sim.vel.z * invSpeed;

      for (let i = 0; i < STREAK_COUNT; i++) {
        const idx = i * 6;
        arr[idx + 0] -= moveX * delta;
        arr[idx + 1] -= moveY * delta;
        arr[idx + 2] -= moveZ * delta;

        // Wrap around vehicle position
        const relX = arr[idx + 0] - sim.pos.x;
        const relY = arr[idx + 1] - sim.pos.y;
        const relZ = arr[idx + 2] - sim.pos.z;

        if (Math.abs(relX) > 70) arr[idx + 0] = sim.pos.x - Math.sign(relX) * 70;
        if (Math.abs(relY) > 70) arr[idx + 1] = sim.pos.y - Math.sign(relY) * 70;
        if (Math.abs(relZ) > 70) arr[idx + 2] = sim.pos.z - Math.sign(relZ) * 70;

        // Tail follows head along true velocity vector
        arr[idx + 3] = arr[idx + 0] - dirX * trailLen;
        arr[idx + 4] = arr[idx + 1] - dirY * trailLen;
        arr[idx + 5] = arr[idx + 2] - dirZ * trailLen;
      }
      posAttr.needsUpdate = true;
    }

    // Dust particles drift slowly
    if (dustPoints.current) {
      const dAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      const dArr = dAttr.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        const idx = i * 3;
        dArr[idx + 0] -= sim.vel.x * delta * 0.4;
        dArr[idx + 1] -= sim.vel.y * delta * 0.4;
        dArr[idx + 2] -= sim.vel.z * delta * 0.4;

        const dx = dArr[idx + 0] - sim.pos.x;
        const dy = dArr[idx + 1] - sim.pos.y;
        const dz = dArr[idx + 2] - sim.pos.z;

        if (Math.abs(dx) > 40) dArr[idx + 0] = sim.pos.x - Math.sign(dx) * 40;
        if (Math.abs(dy) > 40) dArr[idx + 1] = sim.pos.y - Math.sign(dy) * 40;
        if (Math.abs(dz) > 40) dArr[idx + 2] = sim.pos.z - Math.sign(dz) * 40;
      }
      dAttr.needsUpdate = true;
    }

    // 3. Dynamic Reviver Engine Exhaust Sparks
    const isForward = (sim.thrustAmount > 0.05 || sim.boosting) && sim.fuel > 0;
    if (thrustPoints.current) {
      const tPos = (thrustGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const tVel = thrustVels.current;
      const tLife = thrustLives.current;

      thrustPoints.current.visible = isForward;

      if (isForward) {
        // Nozzle position in world space
        const nozzleOffset = new THREE.Vector3(0, 0, -1.35).applyQuaternion(sim.quat);
        const nozzlePos = sim.pos.clone().add(nozzleOffset);
        const rearDir = new THREE.Vector3(0, 0, -1).applyQuaternion(sim.quat);
        const exhaustSpeed = sim.boosting ? 55.0 : 38.0;

        for (let i = 0; i < THRUST_COUNT; i++) {
          const idx = i * 3;
          tLife[i] -= delta * 5.5;

          if (tLife[i] <= 0) {
            // Respawn at nozzle exit with slight radial dispersion
            tLife[i] = 0.15 + Math.random() * 0.15;
            tPos[idx + 0] = nozzlePos.x + (Math.random() - 0.5) * 0.15;
            tPos[idx + 1] = nozzlePos.y + (Math.random() - 0.5) * 0.15;
            tPos[idx + 2] = nozzlePos.z + (Math.random() - 0.5) * 0.15;

            // Exhaust velocity vector
            const spread = (Math.random() - 0.5) * 2.5;
            const spreadY = (Math.random() - 0.5) * 2.5;
            tVel[idx + 0] = rearDir.x * exhaustSpeed + spread;
            tVel[idx + 1] = rearDir.y * exhaustSpeed + spreadY;
            tVel[idx + 2] = rearDir.z * exhaustSpeed + spread;
          } else {
            // Advance particle
            tPos[idx + 0] += tVel[idx + 0] * delta;
            tPos[idx + 1] += tVel[idx + 1] * delta;
            tPos[idx + 2] += tVel[idx + 2] * delta;
          }
        }
        (thrustGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 4. Dynamic Atmospheric Re-entry Fire Embers for burning debris
    const burningDebris = sim.debris.filter((d) => (d.burning || d.deorbited) && d.burnProgress < 1.0);
    if (emberPoints.current) {
      emberPoints.current.visible = burningDebris.length > 0;

      if (burningDebris.length > 0) {
        const ePos = (emberGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const eVel = emberVels.current;
        const eLife = emberLives.current;

        for (let i = 0; i < EMBER_COUNT; i++) {
          const idx = i * 3;
          eLife[i] -= delta * 2.2;

          if (eLife[i] <= 0) {
            // Pick a burning debris target to emit from
            const target = burningDebris[i % burningDebris.length];
            eLife[i] = 0.35 + Math.random() * 0.45;

            // Spawn at target position with radial dispersion
            ePos[idx + 0] = target.pos.x + (Math.random() - 0.5) * target.radius * 1.5;
            ePos[idx + 1] = target.pos.y + (Math.random() - 0.5) * target.radius * 1.5;
            ePos[idx + 2] = target.pos.z + (Math.random() - 0.5) * target.radius * 1.5;

            // Trailing wake velocity (opposite to target velocity)
            const wakeSpeed = 8.0 + Math.random() * 14.0;
            const velNorm = target.vel.clone().normalize();
            eVel[idx + 0] = -velNorm.x * wakeSpeed + (Math.random() - 0.5) * 4.0;
            eVel[idx + 1] = -velNorm.y * wakeSpeed + (Math.random() - 0.5) * 4.0;
            eVel[idx + 2] = -velNorm.z * wakeSpeed + (Math.random() - 0.5) * 4.0;
          } else {
            ePos[idx + 0] += eVel[idx + 0] * delta;
            ePos[idx + 1] += eVel[idx + 1] * delta;
            ePos[idx + 2] += eVel[idx + 2] * delta;
          }
        }
        (emberGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* 3D Velocity Motion Streaks */}
      <lineSegments ref={streakLines} geometry={streakGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={sim.boosting ? 0.65 : sim.vel.length() > 5 ? 0.35 : 0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Micro-Meteoroid Space Dust */}
      <points ref={dustPoints} geometry={dustGeo}>
        <pointsMaterial
          size={0.65}
          map={glowTex}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color={new THREE.Color(0.7, 0.85, 1.0)}
        />
      </points>

      {/* Engine Thruster Exhaust Sparks */}
      <points ref={thrustPoints} geometry={thrustGeo}>
        <pointsMaterial
          size={sim.boosting ? 0.95 : 0.65}
          map={glowTex}
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color={new THREE.Color(0.75, 0.92, 1.0)}
        />
      </points>

      {/* Atmospheric Re-entry Fire Embers */}
      <points ref={emberPoints} geometry={emberGeo}>
        <pointsMaterial
          size={1.6}
          map={plasmaTex}
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color={new THREE.Color(1.0, 0.6, 0.15)}
        />
      </points>
    </group>
  );
}
