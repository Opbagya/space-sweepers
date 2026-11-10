import * as THREE from "three";
import { clearKeys } from "./input";

export const NOSE_OFFSET = 2.0; // Distance from Reviver center to capture arm tip
export const MOTHERCRAFT_DOCK_PORT = new THREE.Vector3(0, 0, 24); // Docking collar on Mothercraft
export const MOTHERCRAFT_RADIUS = 16.0;

// Earth & Orbital Metrics
export const EARTH_RADIUS = 20000;
export const EARTH_CENTER = new THREE.Vector3(0, -21400, -1200);

// Sub-120 km Atmospheric Entry Interface
export const REENTRY_ALTITUDE_THRESHOLD = 260;
export const DEFAULT_CORRIDOR_POS = new THREE.Vector3(0, -75, 120);
export const REENTRY_CORRIDOR_RADIUS = 65.0; // Challenging precision corridor (shrunk from 320!)
export const REENTRY_CORRIDOR_POS = DEFAULT_CORRIDOR_POS;

// Propulsion & Fuel Calibration
export const FUEL_CAPACITY = 100.0;
export const TRANS_ACCEL = 15.0; // Smooth comfortable arcade forward flight (not too fast)
export const BOOST_ACCEL = 28.0; // Boost surge when holding Shift (around previous regular speed)
export const ROT_ACCEL = 2.0;   // Smooth steering rate
export const TRANS_FUEL_RATE = 0.22; // Generous: easily cleans 3+ satellites
export const BOOST_FUEL_RATE = 0.55;
export const ROT_FUEL_RATE = 0.04;
export const RECHARGE_RATE = 250.0; // Instantaneous recharge (< 0.4s to 100%)

export const SUN_DIR = new THREE.Vector3(0.92, 0.35, 0.16).normalize();

export type Screen = "briefing" | "playing" | "paused" | "success" | "failed";

export interface DebrisTarget {
  id: string;
  name: string;
  type: "rocket_stage" | "defunct_sat" | "solar_wing" | "shrapnel_cluster" | "sensor_bus";
  description: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  angVel: THREE.Vector3;
  radius: number;
  massKg: number;
  captured: boolean;
  deorbited: boolean;
  burning: boolean;
  thrown: boolean;
  burnProgress: number; // 0 to 1 during atmospheric incineration
  screenPt: { x: number; y: number; on: boolean; dist: number };
}

export interface ScreenPt {
  x: number;
  y: number;
  on: boolean;
}

export const INITIAL_DEBRIS: Omit<DebrisTarget, "screenPt">[] = [
  {
    id: "deb-1",
    name: "ISRO EOS-04 (Radar Imaging Sat)",
    type: "defunct_sat",
    description: "Real-world Indian C-band synthetic aperture radar (SAR) satellite with deployable radial-rib antenna dish.",
    pos: new THREE.Vector3(26, 6, 68),
    vel: new THREE.Vector3(0.02, 0.01, 0.01),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0.04, 0.06, 0.02),
    radius: 3.6,
    massKg: 1710,
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
  },
  {
    id: "deb-2",
    name: "ISRO PSLV Spent 4th Stage (POEM)",
    type: "rocket_stage",
    description: "Depleted Polar Satellite Launch Vehicle 4th stage with dual liquid engines and experimental solar array platform.",
    pos: new THREE.Vector3(-28, 9, 88),
    vel: new THREE.Vector3(-0.02, 0.01, -0.01),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0.05, 0.02, 0.04),
    radius: 3.4,
    massKg: 1450,
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
  },
  {
    id: "deb-3",
    name: "CSS Tiangong / ISS Module Truss",
    type: "solar_wing",
    description: "Station structural truss module with carbon boom, photovoltaic array, and radiator fin.",
    pos: new THREE.Vector3(42, 12, 120),
    vel: new THREE.Vector3(0.02, -0.01, 0.02),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0.06, 0.03, 0.04),
    radius: 3.8,
    massKg: 890,
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
  },
  {
    id: "deb-4",
    name: "Pixxel Anand-1 Hyperspectral Bus",
    type: "shrapnel_cluster",
    description: "India's commercial hyperspectral Earth observation satellite bus with stuck solar wing.",
    pos: new THREE.Vector3(-36, -14, 150),
    vel: new THREE.Vector3(0.02, -0.02, 0.01),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0.08, 0.06, 0.05),
    radius: 2.6,
    massKg: 240,
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
  },
  {
    id: "deb-5",
    name: "IRNSS NavSat Transponder",
    type: "sensor_bus",
    description: "NavIC navigation satellite with solar arrays and atomic clock transponder.",
    pos: new THREE.Vector3(25, -16, 185),
    vel: new THREE.Vector3(-0.02, 0.02, -0.02),
    quat: new THREE.Quaternion(),
    angVel: new THREE.Vector3(0.03, 0.05, 0.03),
    radius: 3.0,
    massKg: 610,
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
  },
];

export const sim = {
  screen: "briefing" as Screen,
  runId: 0,

  // Player Vehicle (Reviver Servicer)
  pos: new THREE.Vector3(0, 0, 24),
  vel: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  angVel: new THREE.Vector3(),
  thrustWorld: new THREE.Vector3(),
  thrustRot: new THREE.Vector3(),
  thrustAmount: 0,
  steerAmount: 0,
  swayAmount: 0,
  heaveAmount: 0,
  rollAmount: 0,

  // Systems
  fuel: FUEL_CAPACITY,
  hull: 100,
  time: 0,
  damp: true,
  view: 1, // 0: Cockpit/Sensor, 1: Third-person Chase, 2: Mothercraft Base Cam
  boosting: false,
  invertPitch: false, // Standard: W = nose down (-1), S = nose up (+1)
  sensitivity: 1.0,   // Control rate multiplier (0.5x to 2.0x)
  particlesHigh: true,// Enhanced thruster vapor and particles

  // Briefing Camera Mode (Reversible: Satellite Orbit View or Mothership Base View)
  briefingViewMode: "satellite" as "satellite" | "mothership",
  briefingTargetSatId: "deb-2" as string,

  // Mothercraft & Docking
  mothercraftPos: new THREE.Vector3(0, 0, 0),
  mothercraftQuat: new THREE.Quaternion(),
  docked: true, // Starts attached to Mothercraft
  dockCooldown: 0, // Prevents instant re-docking loop!
  recharging: false,
  rechargeProgress: 0,
  distToMothercraft: 0,
  fuelNeededToReturn: 8, // Dynamic return marker calculation
  bingoWarning: false,

  // Soft Robotic Capture System
  captureArmState: 0, // 0: retracted, 1: fully gripping
  capturedDebrisId: null as string | null,
  captureTargetId: "deb-1" as string | null,
  canCapture: false,

  // Dynamic Atmospheric Disposal Corridor
  corridorPos: DEFAULT_CORRIDOR_POS.clone(),
  corridorRadius: REENTRY_CORRIDOR_RADIUS,
  inReentryCorridor: false,
  distToCorridor: 0,
  deorbitReady: false,

  // Real-Time Optical Docking / Approach Radar (Right-side HUD)
  dockingRadar: {
    active: false,
    targetName: "",
    range: 999,
    relSpeed: 0,
    alignPct: 0,
    inEnvelope: false,
    collisionHazard: false,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
  },

  // Debris List
  debris: [] as DebrisTarget[],
  clearedCount: 0,
  totalDebris: 5,

  // Mission Log & Events
  flashMessage: "DOCKED AT MOTHERCRAFT · PRESS [SPACE] OR CLICK LAUNCH",
  flashTimer: 4.0,
  failReason: "",
  score: {
    total: 0,
    debrisBonus: 0,
    precisionBonus: 0,
    fuelBonus: 0,
    timeBonus: 0,
  },

  // HUD Tracking Projection
  mothercraftScreen: { x: 0.5, y: 0.5, on: false, dist: 0 },
  corridorScreen: { x: 0.5, y: 0.5, on: false, dist: 0 },
};

export function resetSim() {
  clearKeys();
  sim.runId++;
  sim.screen = "briefing";
  sim.pos.copy(MOTHERCRAFT_DOCK_PORT);
  sim.vel.set(0, 0, 0);
  sim.quat.identity();
  sim.angVel.set(0, 0, 0);
  sim.thrustWorld.set(0, 0, 0);
  sim.thrustRot.set(0, 0, 0);
  sim.thrustAmount = 0;
  sim.steerAmount = 0;
  sim.swayAmount = 0;
  sim.heaveAmount = 0;
  sim.rollAmount = 0;

  sim.fuel = FUEL_CAPACITY;
  sim.hull = 100;
  sim.time = 0;
  sim.damp = true;
  sim.view = 1;
  sim.boosting = false;

  sim.docked = true;
  sim.dockCooldown = 0;
  sim.recharging = false;
  sim.rechargeProgress = 0;
  sim.distToMothercraft = 0;
  sim.fuelNeededToReturn = 8;
  sim.bingoWarning = false;

  sim.captureArmState = 0;
  sim.capturedDebrisId = null;
  sim.captureTargetId = "deb-1";
  sim.canCapture = false;

  sim.inReentryCorridor = false;
  sim.deorbitReady = false;
  sim.clearedCount = 0;

  sim.debris = INITIAL_DEBRIS.map((d) => ({
    ...d,
    pos: d.pos.clone(),
    vel: d.vel.clone(),
    quat: d.quat.clone(),
    angVel: d.angVel.clone(),
    captured: false,
    deorbited: false,
    burning: false,
    thrown: false,
    burnProgress: 0,
    screenPt: { x: 0.5, y: 0.5, on: false, dist: 0 },
  }));

  randomizeCorridor();

  sim.flashMessage = "DOCKED AT MOTHERCRAFT · PRESS [SPACE] OR CLICK LAUNCH";
  sim.flashTimer = 5.0;
  sim.score = {
    total: 0,
    debrisBonus: 0,
    precisionBonus: 0,
    fuelBonus: 0,
    timeBonus: 0,
  };
}

export function randomizeCorridor() {
  // Move disposal zone to distinct, challenging orbital entry coordinates
  const angle = (Math.random() * 0.8 + 0.1) * Math.PI * 2;
  const dist = 110 + Math.random() * 70;
  const alt = -65 - Math.random() * 35;
  sim.corridorPos.set(
    Math.cos(angle) * dist * 0.85,
    alt,
    Math.sin(angle) * dist * 0.85 + 75,
  );
  sim.corridorRadius = 65.0;
  sim.distToCorridor = sim.pos.distanceTo(sim.corridorPos);
}

export function setBriefingViewMode(mode: "satellite" | "mothership", satId?: string) {
  sim.briefingViewMode = mode;
  if (satId) sim.briefingTargetSatId = satId;
}

/** Undock from Mothercraft - cleanly moves player forward and starts flight */
export function undock() {
  if (!sim.docked) return;
  sim.docked = false;
  sim.recharging = false;
  sim.dockCooldown = 5.0; // 5-second cooldown so you CANNOT accidentally re-dock immediately!
  
  // Position ship cleanly 25 meters forward outside the docking collar
  sim.pos.copy(MOTHERCRAFT_DOCK_PORT).add(new THREE.Vector3(0, 0, 25));
  sim.quat.identity();
  // Neutral station-keeping: zero initial velocity, zero auto-boost until player thrusts
  sim.vel.set(0, 0, 0);
  sim.thrustAmount = 0;
  sim.boosting = false;
  
  sim.flashMessage = "REVIVER DETACHED · USE [↑ / R] FORWARD THRUST";
  sim.flashTimer = 3.5;
}

/** Trigger Soft Robotic Capture mechanism */
export function triggerCapture() {
  if (sim.capturedDebrisId) {
    // Release debris
    releaseCapturedDebris(false);
    return;
  }

  // Toggle compliant soft-robotic capture paddles
  const willDeploy = sim.captureArmState <= 0.05;
  sim.captureArmState = willDeploy ? 1.0 : 0.0;

  // Find nearest valid debris target
  const available = sim.debris.filter((d) => !d.deorbited && !d.captured);
  let closest: DebrisTarget | null = null;
  let minDist = Infinity;

  for (const d of available) {
    const dist = sim.pos.distanceTo(d.pos);
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }

  // If within grapple reach (<= 4.2m) and deploying, immediately lock onto target
  if (willDeploy && closest && minDist <= 4.2) {
    closest.captured = true;
    sim.capturedDebrisId = closest.id;
    sim.captureArmState = 1.0;
    sim.flashMessage = `GRAPPLED: ${closest.name.toUpperCase()} · FLY TO DISPOSAL ZONE`;
    sim.flashTimer = 4.0;
    audio.grappleLock();
  } else if (willDeploy && closest && minDist <= 25.0) {
    sim.flashMessage = `PADDLES ARMED · APPROACH TARGET TO SECURE (RANGE: ${minDist.toFixed(1)}M)`;
    sim.flashTimer = 2.5;
  } else if (willDeploy) {
    sim.flashMessage = `PADDLES DEPLOYED & ARMED`;
    sim.flashTimer = 2.0;
  } else {
    sim.flashMessage = `PADDLES RETRACTED · STREAMLINED`;
    sim.flashTimer = 2.0;
  }
}

/** Trigger roaring atmospheric re-entry burn when debris crosses the disposal zone plane */
export function igniteDebrisAtmosphericBurn(target: DebrisTarget) {
  if (target.burning || target.deorbited) return;
  target.deorbited = true;
  target.burning = true;
  target.burnProgress = 0.01;

  // Hypersonic pull down into the dense atmosphere
  target.vel.y = Math.min(-22.0, target.vel.y - 14.0);

  sim.clearedCount++;
  sim.score.debrisBonus += 1500;
  sim.score.total += 1500;

  // Select next available target
  const nextTarget = sim.debris.find((d) => !d.deorbited && !d.burning && d.id !== target.id);
  sim.captureTargetId = nextTarget ? nextTarget.id : null;

  sim.flashMessage = `🔥 ATMOSPHERIC INCINERATION: ${target.name.toUpperCase()} CROSSING RE-ENTRY INTERFACE`;
  sim.flashTimer = 4.0;
  audio.disintegrationExplosion();

  // Move next corridor to a new orbital entry window
  randomizeCorridor();

  if (sim.clearedCount >= sim.totalDebris) {
    setTimeout(() => {
      sim.screen = "success";
    }, 4500);
  }
}

/** Release grappled debris (normal release or de-orbit atmospheric burn) */
export function releaseCapturedDebris(isDeorbit: boolean) {
  if (!sim.capturedDebrisId) return;
  const target = sim.debris.find((d) => d.id === sim.capturedDebrisId);
  if (target) {
    target.captured = false;
    target.thrown = true;

    // Release throws debris forcefully along the player's craft aim
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(sim.quat);
    target.vel.copy(sim.vel).addScaledVector(fwd, 26.0);
    target.angVel.set(
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6
    );

    // Check if thrown already at or below the disposal zone plane
    const horizDist = Math.hypot(target.pos.x - sim.corridorPos.x, target.pos.z - sim.corridorPos.z);
    const atOrBelowPlane = target.pos.y <= sim.corridorPos.y + 2.0;
    const insideCorridor = horizDist <= (sim.corridorRadius + target.radius * 2.0);

    if (isDeorbit || (insideCorridor && atOrBelowPlane)) {
      igniteDebrisAtmosphericBurn(target);
    } else {
      sim.flashMessage = `${target.name.toUpperCase()} THROWN TOWARDS DISPOSAL ZONE · FLAMES IGNITE AT INTERFACE PLANE`;
      sim.flashTimer = 3.5;
    }
  }
  sim.capturedDebrisId = null;
  sim.captureArmState = 0.0;
}

/** Emergency Dock at Mothercraft Depot */
export function emergencyDock() {
  if (sim.capturedDebrisId) {
    releaseCapturedDebris(false);
  }
  sim.docked = true;
  sim.recharging = false;
  sim.fuel = FUEL_CAPACITY;
  sim.hull = 100;
  sim.pos.copy(MOTHERCRAFT_DOCK_PORT);
  sim.vel.set(0, 0, 0);
  sim.angVel.set(0, 0, 0);
  sim.quat.identity();
  sim.flashMessage = "EMERGENCY DOCK: CRAFT SECURED AT MOTHERCRAFT · REFUEL COMPLETE";
  sim.flashTimer = 4.0;
}

/** Return to Main Landing Webpage */
export function returnToMainMenu() {
  if (sim.capturedDebrisId) {
    releaseCapturedDebris(false);
  }
  sim.screen = "briefing";
  sim.docked = true;
  sim.recharging = false;
  sim.fuel = FUEL_CAPACITY;
  sim.pos.copy(MOTHERCRAFT_DOCK_PORT);
  sim.vel.set(0, 0, 0);
  sim.angVel.set(0, 0, 0);
  sim.quat.identity();
}
