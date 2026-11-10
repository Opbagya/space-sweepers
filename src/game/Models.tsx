import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  NOSE_OFFSET,
  SUN_DIR,
  igniteDebrisAtmosphericBurn,
  sim,
  type DebrisTarget,
  MOTHERCRAFT_DOCK_PORT,
} from "./sim";
import {
  getFoil,
  getSolar,
  getGlow,
  getPlasmaFlame,
  getRocketFlameTrail,
  getReentryFlameTrail,
} from "./textures";

const hdr = (r: number, g: number, b: number) =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(r, g, b),
    toneMapped: false,
  });

export function useSpaceMaterials() {
  return useMemo(() => {
    const gold = getFoil("gold");
    const silver = getFoil("silver");
    const darkFoil = getFoil("dark");
    const solarDeep = getSolar("deep");

    return {
      gold: new THREE.MeshPhysicalMaterial({
        map: gold.map,
        bumpMap: gold.bump,
        bumpScale: 0.55,
        metalness: 0.86,
        roughness: 0.28,
        color: "#ffd982",
        clearcoat: 0.22,
        clearcoatRoughness: 0.25,
      }),
      silver: new THREE.MeshPhysicalMaterial({
        map: silver.map,
        bumpMap: silver.bump,
        bumpScale: 0.45,
        metalness: 0.88,
        roughness: 0.26,
        color: "#f0f4f8",
        clearcoat: 0.2,
      }),
      darkFoil: new THREE.MeshStandardMaterial({
        map: darkFoil.map,
        bumpMap: darkFoil.bump,
        bumpScale: 0.5,
        metalness: 0.72,
        roughness: 0.35,
        color: "#3a4150",
      }),
      ps4Thermal: new THREE.MeshPhysicalMaterial({
        color: "#a44636", // Authentic ISRO PS4 reddish-copper / burnt-terracotta thermal insulation
        metalness: 0.65,
        roughness: 0.32,
        clearcoat: 0.25,
      }),
      whiteChassis: new THREE.MeshStandardMaterial({
        color: "#e8edf2",
        metalness: 0.15,
        roughness: 0.38,
      }),
      titanium: new THREE.MeshStandardMaterial({
        color: "#b0b8c4",
        metalness: 0.78,
        roughness: 0.32,
      }),
      darkStructural: new THREE.MeshStandardMaterial({
        color: "#282d38",
        metalness: 0.72,
        roughness: 0.35,
      }),
      niobiumNozzle: new THREE.MeshStandardMaterial({
        color: "#4e4740",
        metalness: 0.8,
        roughness: 0.35,
      }),
      solarPanels: new THREE.MeshPhysicalMaterial({
        map: solarDeep,
        metalness: 0.5,
        roughness: 0.25,
        clearcoat: 0.45,
        clearcoatRoughness: 0.2,
      }),
      solarCyanPanels: new THREE.MeshPhysicalMaterial({
        map: solarDeep,
        metalness: 0.55,
        roughness: 0.26,
        clearcoat: 0.45,
      }),
      backsheet: new THREE.MeshStandardMaterial({
        color: "#2c3038",
        metalness: 0.2,
        roughness: 0.75,
      }),
      sensorLens: new THREE.MeshPhysicalMaterial({
        color: "#121b28",
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.85,
        ior: 1.55,
      }),
    };
  }, []);
}

export type SpaceMaterials = ReturnType<typeof useSpaceMaterials>;

/** The Sweeper-1 - Space Sweepers Orbital Interceptor & Harvester */
export function Reviver() {
  const mats = useSpaceMaterials();
  const root = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const captureArms = useRef<(THREE.Group | null)[]>([]);
  const plumeGroup = useRef<THREE.Group>(null);
  const rcsPort = useRef<THREE.Mesh>(null);
  const rcsStarboard = useRef<THREE.Mesh>(null);
  const rcsTop = useRef<THREE.Mesh>(null);
  const rcsBottom = useRef<THREE.Mesh>(null);
  const rcsRetro = useRef<THREE.Mesh>(null);
  const beaconMat = useMemo(() => hdr(2.2, 2.2, 2.5), []);
  const rocketFlameTex = useMemo(() => getRocketFlameTrail(), []);
  const glowTex = useMemo(() => getGlow(), []);

  // Aerodynamic flame ribbon geometry: top at (y=0, nozzle), extending down to (y=-4.5, needle tip)
  const plumeRibbonGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.55, 4.5);
    geo.translate(0, -2.25, 0);
    return geo;
  }, []);

  const spotTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 50);
    return obj;
  }, []);

  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;

    // Follow sim physics
    root.current.position.copy(sim.pos);
    root.current.quaternion.copy(sim.quat);

    // Orient solar arrays towards the Sun with safe angle unwrapping
    _v.copy(SUN_DIR).applyQuaternion(_q.copy(sim.quat).invert());
    const sunAngle = Math.atan2(_v.z, _v.y);
    const lerpRate = 1 - Math.exp(-3.0 * delta);

    if (leftWing.current) {
      const diff = Math.atan2(Math.sin(sunAngle - leftWing.current.rotation.x), Math.cos(sunAngle - leftWing.current.rotation.x));
      leftWing.current.rotation.x += diff * lerpRate;
    }
    if (rightWing.current) {
      const diff = Math.atan2(Math.sin(sunAngle - rightWing.current.rotation.x), Math.cos(sunAngle - rightWing.current.rotation.x));
      rightWing.current.rotation.x += diff * lerpRate;
    }

    // Animate Patented Compliant Capture Paddles
    // Free flight: streamlined resting angle (targetRot = 0.08)
    // In Range / Ready (< 35m): flares wide open like a petal array (targetRot = -0.58)
    // Grappled / Catching: folds inward snugly around the debris (targetRot = 0.72)
    const targetPaddleRot = sim.capturedDebrisId
      ? 0.72
      : (sim.canCapture || sim.captureArmState > 0.4)
      ? -0.58
      : 0.08;

    captureArms.current.forEach((arm) => {
      if (arm) {
        arm.rotation.x += (targetPaddleRot - arm.rotation.x) * (1 - Math.exp(-6.0 * delta));
      }
    });

    // Main Engine Volumetric Rocket Flame
    const isForward = (sim.thrustAmount > 0.05 || sim.boosting) && sim.fuel > 0;

    if (plumeGroup.current) {
      plumeGroup.current.visible = isForward;
      if (isForward) {
        const zScale = (sim.boosting ? 1.75 : 1.0) * (1.0 + (Math.random() - 0.5) * 0.08);
        const xyScale = sim.boosting ? 1.25 : 1.0;
        plumeGroup.current.scale.set(xyScale, xyScale, zScale);
      }
    }

    // 6-DOF RCS Cold-Gas Reaction Thrusters
    if (rcsPort.current) {
      rcsPort.current.visible = sim.steerAmount > 0.1 || sim.swayAmount > 0.1;
    }
    if (rcsStarboard.current) {
      rcsStarboard.current.visible = sim.steerAmount < -0.1 || sim.swayAmount < -0.1;
    }
    if (rcsTop.current) {
      rcsTop.current.visible = sim.heaveAmount < -0.1;
    }
    if (rcsBottom.current) {
      rcsBottom.current.visible = sim.heaveAmount > 0.1;
    }
    if (rcsRetro.current) {
      rcsRetro.current.visible = sim.thrustAmount < -0.05;
    }

    // Strobe navigation light
    const blink = Math.sin(clock.elapsedTime * 8) > 0.8 ? 1 : 0.05;
    beaconMat.color.setRGB(0 * blink, 3 * blink, 5 * blink);
  });

  return (
    <group ref={root}>
      {/* Central Hexagonal Avionics Bus */}
      <mesh material={mats.gold} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 2.2, 6]} />
      </mesh>

      {/* Forward Aft Deck */}
      <mesh material={mats.titanium} position={[0, 0, 1.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 0.08, 6]} />
      </mesh>
      {/* Rear Engine Bulkhead */}
      <mesh material={mats.darkStructural} position={[0, 0, -1.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 0.08, 6]} />
      </mesh>

      {/* Forward Optical Sensor & Lidar Pod */}
      <group position={[0, 0.65, 1.15]}>
        <mesh material={mats.whiteChassis}>
          <boxGeometry args={[0.42, 0.32, 0.35]} />
        </mesh>
        <mesh material={mats.sensorLens} position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 16]} />
        </mesh>
      </group>

      {/* High-Power Forward Inspection Spotlight & Docking Floodlights Array */}
      <primitive object={spotTarget} />
      <spotLight
        position={[0, 0, NOSE_OFFSET + 0.1]}
        target={spotTarget}
        intensity={32.0}
        angle={0.7}
        penumbra={0.45}
        distance={180}
        color="#edf5ff"
      />
      <pointLight
        position={[0, 0, NOSE_OFFSET + 0.6]}
        intensity={6.5}
        distance={65}
        color="#d8ebff"
      />

      {/* Dual High-Intensity Optical Headlamps on Sweeper Bow */}
      {[-0.55, 0.55].map((x, i) => (
        <group key={i} position={[x, 0.48, 1.25]}>
          <mesh material={mats.titanium}>
            <cylinderGeometry args={[0.08, 0.11, 0.12, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.065]}>
            <circleGeometry args={[0.075, 16]} />
            <meshBasicMaterial color={new THREE.Color(2.5, 2.8, 3.2)} />
          </mesh>
        </group>
      ))}

      {/* Main Docking / Grapple Collar Ring */}
      <mesh material={mats.silver} position={[0, 0, NOSE_OFFSET - 0.4]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.75, 0.08, 16, 32]} />
      </mesh>

      {/* Kinetic Capture System - 4 Compliant White Capture Paddles */}
      {[0, 1, 2, 3].map((idx) => {
        const angle = (idx / 4) * Math.PI * 2;
        return (
          <group key={idx} rotation={[0, 0, angle]}>
            <group
              position={[0, 0.72, NOSE_OFFSET - 0.35]}
              ref={(el) => (captureArms.current[idx] = el)}
            >
              {/* Base Hinge Pivot Bracket */}
              <mesh material={mats.titanium}>
                <boxGeometry args={[0.22, 0.16, 0.28]} />
              </mesh>

              {/* Main White Aerodynamic Compliant Capture Paddle (Visible aerospace white composite) */}
              <group position={[0, 0.08, 0.75]}>
                <mesh material={mats.whiteChassis} castShadow receiveShadow>
                  <boxGeometry args={[0.62, 0.08, 1.45]} />
                </mesh>

                {/* Inner Compliant Friction Grip Pad (High-traction polymer) */}
                <mesh material={mats.darkStructural} position={[0, -0.045, 0]}>
                  <boxGeometry args={[0.54, 0.02, 1.35]} />
                </mesh>

                {/* Compliant Magnetic Contact Strips */}
                <mesh material={mats.gold} position={[0, -0.052, 0.3]}>
                  <boxGeometry args={[0.42, 0.015, 0.35]} />
                </mesh>
                <mesh material={mats.gold} position={[0, -0.052, -0.3]}>
                  <boxGeometry args={[0.42, 0.015, 0.35]} />
                </mesh>

                {/* Curved Paddle Tip Contact Bumper */}
                <mesh material={mats.silver} position={[0, 0, 0.74]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.58, 16]} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}

      {/* Solar Arrays - Port & Starboard */}
      <group position={[-1.3, 0, 0]} ref={leftWing}>
        <mesh material={mats.titanium} position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        </mesh>
        <group position={[-1.7, 0, 0]}>
          <mesh material={mats.solarPanels} castShadow>
            <boxGeometry args={[2.2, 0.04, 1.2]} />
          </mesh>
        </group>
      </group>

      <group position={[1.3, 0, 0]} ref={rightWing}>
        <mesh material={mats.titanium} position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        </mesh>
        <group position={[1.7, 0, 0]}>
          <mesh material={mats.solarPanels} castShadow>
            <boxGeometry args={[2.2, 0.04, 1.2]} />
          </mesh>
        </group>
      </group>

      {/* High-efficiency Chemical / Ion Thruster Bell */}
      <mesh material={mats.niobiumNozzle} position={[0, 0, -1.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.42, 0.5, 16]} />
      </mesh>

      {/* Incandescent Nozzle Throat Emitter (Blazing Interior Glow) */}
      <mesh position={[0, 0, -1.33]}>
        <circleGeometry args={[0.19, 24]} />
        <meshBasicMaterial color={new THREE.Color(0.9, 0.96, 1.0)} />
      </mesh>

      {/* Aerodynamic High-Velocity Rocket Flame Tail (Tapers backward along -Z) */}
      <group ref={plumeGroup} position={[0, 0, -1.35]} visible={false}>
        {/* Crossed Jet Ribbon A (X-Z plane) */}
        <mesh geometry={plumeRibbonGeo} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            map={rocketFlameTex}
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Crossed Jet Ribbon B (Y-Z plane - perfectly perpendicular, straight back along -Z) */}
        <mesh geometry={plumeRibbonGeo} rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <meshBasicMaterial
            map={rocketFlameTex}
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Needle Mach Shock Diamond Core */}
        <mesh position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 3.2, 16]} />
          <meshBasicMaterial
            color={new THREE.Color(0.85, 0.95, 1.0)}
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Blazing Nozzle Exit Lens Flare */}
        <sprite position={[0, 0, -0.05]} scale={[1.1, 1.1, 1.1]}>
          <spriteMaterial
            map={glowTex}
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      </group>

      {/* 6-DOF RCS Cold-Gas Reaction Nozzles */}
      {/* Port Sway / Yaw RCS */}
      <mesh
        ref={rcsPort}
        position={[-1.25, 0, 0.6]}
        rotation={[0, 0, Math.PI / 2]}
        visible={false}
      >
        <coneGeometry args={[0.12, 0.5, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0.7, 0.88, 1.0)}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Starboard Sway / Yaw RCS */}
      <mesh
        ref={rcsStarboard}
        position={[1.25, 0, 0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        visible={false}
      >
        <coneGeometry args={[0.12, 0.5, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0.7, 0.88, 1.0)}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Dorsal Heave-Down RCS */}
      <mesh
        ref={rcsTop}
        position={[0, 1.25, 0.6]}
        rotation={[0, 0, 0]}
        visible={false}
      >
        <coneGeometry args={[0.12, 0.5, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0.7, 0.88, 1.0)}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ventral Heave-Up RCS */}
      <mesh
        ref={rcsBottom}
        position={[0, -1.25, 0.6]}
        rotation={[Math.PI, 0, 0]}
        visible={false}
      >
        <coneGeometry args={[0.12, 0.5, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0.7, 0.88, 1.0)}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Forward Retrograde / Brake RCS */}
      <mesh
        ref={rcsRetro}
        position={[0, 0, 1.3]}
        rotation={[0, 0, 0]}
        visible={false}
      >
        <coneGeometry args={[0.16, 0.6, 12]} />
        <meshBasicMaterial
          color={new THREE.Color(0.7, 0.88, 1.0)}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Navigation Beacon Light */}
      <mesh material={beaconMat} position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>
    </group>
  );
}

/** The Mothercraft - Orbital Operations Base & Refueling Hub */
export function Mothercraft() {
  const mats = useSpaceMaterials();
  const ringRef = useRef<THREE.Group>(null);
  const dockLightMat = useMemo(() => hdr(1.8, 1.6, 1.3), []);
  const ionGlowMat = useMemo(() => hdr(0.5, 2.4, 4.5), []);
  const amberBeaconMat = useMemo(() => hdr(3.5, 1.8, 0.4), []);

  useFrame((_, delta) => {
    // Slowly rotate the habitat module centrifuge
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.12 * delta;
    }
  });

  return (
    <group position={sim.mothercraftPos.toArray()}>
      {/* Main Central Station Hull - High-Precision 64-segment Smooth Cylinder */}
      <mesh material={mats.whiteChassis} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.5, 4.5, 28, 64]} />
      </mesh>

      {/* Concentric Structural Reinforcement Ribs along the Main Hull */}
      {[-11, -5.5, 0, 5.5, 11].map((z, idx) => (
        <mesh key={idx} material={mats.titanium} position={[0, 0, z]} rotation={[0, 0, 0]}>
          <torusGeometry args={[4.58, 0.12, 16, 64]} />
        </mesh>
      ))}

      {/* Aft Structural Fairing & Tapered Adapter (Eliminates the raw flat grey cut-off disk) */}
      <mesh material={mats.titanium} position={[0, 0, -15.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[3.8, 4.5, 3.0, 64]} />
      </mesh>

      {/* Aft Pressurized Aerodynamic Dome */}
      <mesh material={mats.whiteChassis} position={[0, 0, -17.0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <sphereGeometry args={[3.8, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Heavy Aft Propulsion Thrust Plate */}
      <mesh material={mats.darkStructural} position={[0, 0, -17.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 0.8, 64]} />
      </mesh>

      {/* Quad Orbital Station-Keeping Ion Thruster Cluster */}
      {[
        [-1.3, -1.3],
        [1.3, -1.3],
        [-1.3, 1.3],
        [1.3, 1.3],
      ].map(([x, y], idx) => (
        <group key={idx} position={[x, y, -17.8]}>
          {/* Engine Nozzle Bell */}
          <mesh material={mats.niobiumNozzle} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.55, 0.32, 0.9, 32]} />
          </mesh>
          {/* Luminous Xenon Ion Plasma Emitter Core */}
          <mesh material={ionGlowMat} position={[0, 0, -0.46]}>
            <circleGeometry args={[0.48, 24]} />
          </mesh>
        </group>
      ))}

      {/* Aft Secondary Cargo Berthing Port Collar with Beacons */}
      <mesh material={mats.silver} position={[0, 0, -18.2]}>
        <torusGeometry args={[1.5, 0.18, 16, 48]} />
      </mesh>
      <mesh material={amberBeaconMat} position={[0, 1.6, -18.2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
      </mesh>
      <mesh material={amberBeaconMat} position={[0, -1.6, -18.2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
      </mesh>

      {/* Forward Smooth Logistics Module */}
      <mesh material={mats.titanium} position={[0, 0, 16.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.2, 4.5, 5, 64]} />
      </mesh>

      {/* Forward Docking Extension Collar */}
      <mesh material={mats.whiteChassis} position={[0, 0, 20.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.5, 3.2, 3.5, 64]} />
      </mesh>

      {/* Docking Collar Bay (Where Reviver docks and refuels) */}
      <group position={MOTHERCRAFT_DOCK_PORT.toArray()}>
        <mesh material={mats.silver}>
          <torusGeometry args={[2.4, 0.28, 16, 64]} />
        </mesh>
        {/* Docking Corridor Beacon Lights */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} material={dockLightMat} position={[Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0.4]}>
              <sphereGeometry args={[0.12, 8, 8]} />
            </mesh>
          );
        })}
      </group>

      {/* Rotating Centrifuge Habitat Ring */}
      <group position={[0, 0, 0]} ref={ringRef}>
        <mesh material={mats.silver}>
          <torusGeometry args={[11, 0.75, 24, 64]} />
        </mesh>
        {/* Radial support spokes */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} material={mats.darkStructural} position={[Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0]} rotation={[0, 0, a + Math.PI / 2]}>
              <boxGeometry args={[0.3, 11, 0.3]} />
            </mesh>
          );
        })}
      </group>

      {/* High-Capacity Fuel Reserves (Propellant Depot Tanks) */}
      {[-2.8, 2.8].map((x, idx) => (
        <group key={idx} position={[x, 0, -6]}>
          <mesh material={mats.gold} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[1.3, 7, 16, 32]} />
          </mesh>
        </group>
      ))}

      {/* Massive Station Solar Arrays */}
      <group position={[-16, 0, -2]}>
        <mesh material={mats.solarCyanPanels} castShadow>
          <boxGeometry args={[18, 0.1, 4.2]} />
        </mesh>
      </group>
      <group position={[16, 0, -2]}>
        <mesh material={mats.solarCyanPanels} castShadow>
          <boxGeometry args={[18, 0.1, 4.2]} />
        </mesh>
      </group>

      {/* High-Gain Communications Dish */}
      <group position={[0, 5.8, 4]} rotation={[-0.4, 0, 0]}>
        <mesh material={mats.titanium}>
          <cylinderGeometry args={[0.08, 0.08, 1.8, 16]} />
        </mesh>
        <mesh material={mats.silver} position={[0, 0.9, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[1.8, 32, 24, 0, Math.PI * 2, 0, Math.PI / 3]} />
        </mesh>
      </group>
    </group>
  );
}

/** Individual Space Debris / Target */
export function DebrisItem({ target }: { target: DebrisTarget }) {
  const mats = useSpaceMaterials();
  const root = useRef<THREE.Group>(null);
  const plasmaRef = useRef<THREE.Mesh>(null);
  const beaconMat = useMemo(() => hdr(1.6, 2.4, 3.2), []);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;

    // Periodic telemetry beacon pulse for authentic orbital visibility
    const blink = Math.sin(clock.elapsedTime * 4.5 + target.id.charCodeAt(0)) > 0.65 ? 1.0 : 0.08;
    beaconMat.color.setRGB(1.6 * blink, 2.4 * blink, 3.2 * blink);

    if (target.captured) {
      // Attached rigidly to Reviver's bow
      const forwardOffset = new THREE.Vector3(0, 0, NOSE_OFFSET + target.radius * 0.9);
      forwardOffset.applyQuaternion(sim.quat);
      target.pos.copy(sim.pos).add(forwardOffset);
      target.quat.copy(sim.quat);
    } else if (target.deorbited || target.burning) {
      // In atmospheric re-entry burn-up sequence
      target.burnProgress = Math.min(1.0, target.burnProgress + delta * 0.18); // ~5.5s burning descent
      target.vel.y -= 14.0 * delta; // Accelerate downward into the atmosphere
      target.pos.addScaledVector(target.vel, delta);

      // Shrink and disintegrate debris core
      const debrisScale = Math.max(0.001, 1.0 - target.burnProgress * 0.85);
      root.current.scale.set(debrisScale, debrisScale, debrisScale);

      if (target.burnProgress >= 1.0) {
        root.current.visible = false;
      }
    } else {
      // Natural tumbling orbit / thrown trajectory
      target.pos.addScaledVector(target.vel, delta);
      const ang = target.angVel.length() * delta;
      if (ang > 1e-6) {
        const axis = target.angVel.clone().normalize();
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, ang);
        target.quat.multiply(dq);
      }

      // Check if debris crossed the disposal zone interface plane
      if (!target.burning && !target.deorbited) {
        const dx = target.pos.x - sim.corridorPos.x;
        const dz = target.pos.z - sim.corridorPos.z;
        const horizDist = Math.hypot(dx, dz);
        const yDist = target.pos.y - sim.corridorPos.y;

        const insideCorridor = horizDist <= (sim.corridorRadius + target.radius * 2.5);
        const crossedPlane = yDist <= 3.0;

        if (insideCorridor && crossedPlane) {
          igniteDebrisAtmosphericBurn(target);
        }
      }
    }

    root.current.position.copy(target.pos);
    root.current.quaternion.copy(target.quat);
  });

  return (
    <group ref={root} visible={target.burnProgress < 1.0}>
      {/* 1. ISRO PSLV SPENT 4TH STAGE (POEM PLATFORM) */}
      {target.type === "rocket_stage" && (
        <group>
          {/* Main Propellant Tank Casing: Authentic ISRO Maroon-Copper Thermal Insulation */}
          <mesh material={mats.ps4Thermal} castShadow>
            <cylinderGeometry args={[1.4, 1.4, 5.2, 32]} />
          </mesh>
          {/* Equipment Bay Avionics Ring: High-Visibility White & Titanium Bands */}
          <mesh material={mats.whiteChassis} position={[0, 2.3, 0]}>
            <cylinderGeometry args={[1.42, 1.42, 0.6, 32]} />
          </mesh>
          <mesh material={mats.titanium} position={[0, -2.7, 0]}>
            <cylinderGeometry args={[1.42, 1.55, 1.2, 32, 1, true]} />
          </mesh>
          {/* Dual ISRO PS4 Gimbaled Liquid Rocket Engines */}
          {[-0.45, 0.45].map((x, i) => (
            <group key={i} position={[x, -3.2, 0]}>
              <mesh material={mats.niobiumNozzle} rotation={[Math.PI, 0, 0]}>
                <cylinderGeometry args={[0.38, 0.16, 0.8, 16]} />
              </mesh>
              <mesh position={[0, -0.4, 0]}>
                <circleGeometry args={[0.35, 16]} />
                <meshBasicMaterial color={new THREE.Color(0.2, 0.22, 0.25)} />
              </mesh>
            </group>
          ))}
          {/* Helium Pressurization Spheres */}
          {[-0.9, 0.9].map((x, i) => (
            <mesh key={i} material={mats.silver} position={[x, -0.6, 0.8]}>
              <sphereGeometry args={[0.34, 16, 16]} />
            </mesh>
          ))}
          {/* POEM Experimental Solar Panel Platform */}
          <group position={[0, 1.8, 0]}>
            <mesh material={mats.solarCyanPanels} position={[1.65, 0, 0]} rotation={[0, 0.2, 0]}>
              <boxGeometry args={[1.8, 0.04, 1.2]} />
            </mesh>
            <mesh material={mats.solarCyanPanels} position={[-1.65, 0, 0]} rotation={[0, -0.2, 0]}>
              <boxGeometry args={[1.8, 0.04, 1.2]} />
            </mesh>
          </group>
          {/* Telemetry Beacon Strobe & Proximity Light */}
          <mesh position={[0, 2.7, 0]} material={beaconMat}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <pointLight position={[0, 2.7, 0]} intensity={1.8} distance={18} color="#38bdf8" />
        </group>
      )}

      {/* 2. ISRO EOS-04 (RADAR IMAGING SATELLITE - RISAT CLASS) */}
      {target.type === "defunct_sat" && (
        <group>
          {/* Main Spacecraft Bus - Gold Kapton MLI Thermal Foil */}
          <mesh material={mats.gold} castShadow>
            <boxGeometry args={[1.8, 1.7, 2.4]} />
          </mesh>

          {/* High-Resolution Earth Observation Optical / Radar Payload Baffle */}
          <mesh material={mats.whiteChassis} position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.48, 0.35, 24]} />
          </mesh>
          <mesh material={mats.sensorLens} position={[0, 0, 1.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.05, 24]} />
          </mesh>

          {/* Iconic ISRO C-Band Deployable Parabolic Radial-Rib Radar Antenna Dish */}
          <group position={[0, 1.35, 0]} rotation={[-0.35, 0, 0]}>
            {/* Parabolic Antenna Dish Mesh */}
            <mesh material={mats.gold}>
              <sphereGeometry args={[1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
            </mesh>
            {/* Feed Horn Tripod Tower */}
            <mesh material={mats.titanium} position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.4, 8]} />
            </mesh>
            <mesh material={mats.silver} position={[0, 1.45, 0]}>
              <coneGeometry args={[0.16, 0.28, 12]} />
            </mesh>
          </group>

          {/* Dual Articulated High-Efficiency Solar Array Wings */}
          {[-1, 1].map((dir, idx) => (
            <group key={idx} position={[dir * 1.05, -0.1, 0]}>
              {/* Alpha Gimbal Hinge */}
              <mesh material={mats.titanium} position={[dir * 0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
              </mesh>
              {/* Photovoltaic Solar Panels */}
              <mesh material={mats.solarCyanPanels} position={[dir * 2.1, 0, 0]} rotation={[0.15, 0, 0]} castShadow>
                <boxGeometry args={[3.2, 0.06, 1.35]} />
              </mesh>
            </group>
          ))}

          {/* Star Tracker Optical Baffles (Attitude Sensors) */}
          <mesh material={mats.titanium} position={[0.7, -0.85, 0.6]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.05, 0.25, 12]} />
          </mesh>
          <mesh material={mats.titanium} position={[-0.7, -0.85, 0.6]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.05, 0.25, 12]} />
          </mesh>

          {/* Telemetry Beacon Strobe & Proximity Light */}
          <mesh position={[0, 2.8, 0]} material={beaconMat}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <pointLight position={[0, 2.8, 0]} intensity={1.8} distance={18} color="#38bdf8" />
        </group>
      )}

      {/* 3. CSS TIANGONG / ISS HABITAT TRUSS MODULE */}
      {target.type === "solar_wing" && (
        <group>
          {/* Pressurized Habitat Cylinder */}
          <mesh material={mats.whiteChassis} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 3.4, 32]} />
          </mesh>
          {/* APAS / CBM Berthing Collar */}
          <mesh material={mats.silver} position={[0, 0, 1.75]}>
            <torusGeometry args={[0.85, 0.12, 12, 32]} />
          </mesh>
          {/* Integrated Carbon Structural Truss Boom */}
          <mesh material={mats.titanium} position={[1.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 2.4, 8]} />
          </mesh>
          {/* Massive Station Solar Array Dynamic Wing */}
          <mesh material={mats.solarCyanPanels} position={[3.6, 0, 0]} castShadow>
            <boxGeometry args={[4.2, 0.06, 1.8]} />
          </mesh>
          {/* Thermal Radiator Heat Rejector Fin */}
          <mesh material={mats.silver} position={[-1.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[2.0, 0.04, 1.4]} />
          </mesh>
          {/* Station Beacon Strobe & Proximity Light */}
          <mesh position={[0, 1.35, 1.7]} material={beaconMat}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <pointLight position={[0, 1.35, 1.7]} intensity={1.8} distance={18} color="#38bdf8" />
        </group>
      )}

      {/* 4. PIXXEL ANAND-1 HYPERSPECTRAL BUS */}
      {target.type === "shrapnel_cluster" && (
        <group>
          <mesh material={mats.gold} castShadow>
            <boxGeometry args={[1.2, 1.1, 1.6]} />
          </mesh>
          {/* Multi-spectral Optical Camera Barrel */}
          <mesh material={mats.whiteChassis} position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.35, 0.3, 16]} />
          </mesh>
          <mesh material={mats.sensorLens} position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
          </mesh>
          {/* Deployable Solar Panel */}
          <mesh material={mats.solarCyanPanels} position={[1.4, 0, 0]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[1.6, 0.04, 1.0]} />
          </mesh>
          {/* Microsat Telemetry Beacon Strobe & Proximity Light */}
          <mesh position={[0, 0.65, 0]} material={beaconMat}>
            <sphereGeometry args={[0.08, 12, 12]} />
          </mesh>
          <pointLight position={[0, 0.65, 0]} intensity={1.6} distance={15} color="#38bdf8" />
        </group>
      )}

      {/* 5. IRNSS NAVIC SATELLITE TRANSPONDER */}
      {target.type === "sensor_bus" && (
        <group>
          {/* Main Spacecraft Bus: High-Albedo Gold Kapton MLI Thermal Blanket with Silver Collar */}
          <mesh material={mats.gold} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 2.2, 24]} />
          </mesh>
          <mesh material={mats.silver} position={[0, 1.12, 0]}>
            <cylinderGeometry args={[1.12, 1.12, 0.08, 24]} />
          </mesh>
          <mesh material={mats.silver} position={[0, -1.12, 0]}>
            <cylinderGeometry args={[1.12, 1.12, 0.08, 24]} />
          </mesh>
          {/* Payload Module Equipment Box */}
          <mesh material={mats.whiteChassis} position={[0, 0, 0.6]}>
            <boxGeometry args={[0.85, 0.85, 0.85]} />
          </mesh>
          {/* Helical Navigation Antennas with Titanium Mast & Gold Coils */}
          {[-0.4, 0.4].map((x, i) => (
            <group key={i} position={[x, 1.25, 0]}>
              <mesh material={mats.whiteChassis} position={[0, -0.1, 0]}>
                <cylinderGeometry args={[0.08, 0.1, 0.2, 12]} />
              </mesh>
              <mesh material={mats.gold} position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
              </mesh>
            </group>
          ))}
          {/* Active Navigation Telemetry Beacon & Proximity Light */}
          <mesh position={[0, 1.85, 0]} material={beaconMat}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
          <pointLight position={[0, 1.85, 0]} intensity={2.2} distance={20} color="#60a5fa" />
          {/* Dual Solar Wings */}
          {[-1, 1].map((dir, idx) => (
            <group key={idx} position={[dir * 1.05, 0, 0]}>
              <mesh material={mats.titanium} position={[dir * 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
              </mesh>
              <mesh material={mats.solarCyanPanels} position={[dir * 1.5, 0, 0]} castShadow>
                <boxGeometry args={[2.4, 0.05, 1.1]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

    </group>
  );
}

const V_UP = new THREE.Vector3(0, 1, 0);

/** Dedicated World-Space Atmospheric Re-entry Fire Plume & Hypersonic Shockwave */
export function DebrisReentryFire({ target }: { target: DebrisTarget }) {
  const root = useRef<THREE.Group>(null);
  const reentryTex = useMemo(() => getReentryFlameTrail(), []);
  const plasmaTex = useMemo(() => getPlasmaFlame(), []);

  // Aerodynamic ribbon: top at (y=0, debris), extending backwards down to (y=-1, wake)
  const ribbonGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, -0.5, 0);
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!root.current) return;
    const isBurning = (target.burning || target.deorbited) && target.burnProgress < 1.0;
    root.current.visible = isBurning;
    if (!isBurning) return;

    // Follow debris position
    root.current.position.copy(target.pos);

    // Aerodynamic alignment: +Y points along velocity (oncoming air), -Y along wake
    const velLen = target.vel.length();
    if (velLen > 0.05) {
      const velDir = target.vel.clone().normalize();
      root.current.quaternion.setFromUnitVectors(V_UP, velDir);
    }

    // Dynamic fire scale: 18m to 36m long roaring flame tail
    const p = target.burnProgress;
    const flameLen = 18.0 + p * 22.0;
    const jitter = 1.0 + Math.sin(clock.elapsedTime * 32.0) * 0.08;
    const flameWidth = target.radius * (2.8 + p * 2.0) * jitter;

    root.current.scale.set(flameWidth, flameLen, flameWidth);
  });

  return (
    <group ref={root} visible={false}>
      {/* 1. Hypersonic Bow Shock Plasma Cap (Facing oncoming airflow at +Y) */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshBasicMaterial
          color={new THREE.Color(4.0, 3.2, 1.2)}
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Crossed Trailing Re-entry Flame Ribbons (Shooting backwards along -Y) */}
      {/* Ribbon A: X-Y plane */}
      <mesh geometry={ribbonGeo}>
        <meshBasicMaterial
          map={reentryTex}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Ribbon B: Z-Y plane */}
      <mesh geometry={ribbonGeo} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial
          map={reentryTex}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Incandescent Conical Plasma Wake */}
      <mesh position={[0, -0.38, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.38, 0.76, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(3.5, 1.2, 0.2)}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Blinding Atmospheric Re-entry Core Flare */}
      <sprite position={[0, 0, 0]} scale={[1.4, 1.4, 1.4]}>
        <spriteMaterial
          map={plasmaTex}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

/** Render all space debris objects */
export function DebrisField() {
  return (
    <group>
      {sim.debris.map((target) => (
        <DebrisItem key={target.id} target={target} />
      ))}
      {sim.debris.map((target) => (
        <DebrisReentryFire key={`fire-${target.id}`} target={target} />
      ))}
    </group>
  );
}
