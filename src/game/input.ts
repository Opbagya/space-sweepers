const keys = new Set<string>();

export const touch = {
  thrust: 0,
  steer: 0,
  pitch: 0,
  boost: false,
};

export function clearKeys() {
  keys.clear();
  touch.thrust = 0;
  touch.steer = 0;
  touch.pitch = 0;
  touch.boost = false;
}

const GAME_KEYS = new Set([
  "Space",
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyC",
  "KeyR",
  "KeyF",
  "KeyX",
  "KeyV",
  "KeyP",
  "Escape",
]);

export type KeyHandler = (code: string, event: KeyboardEvent) => void;

export function attachKeyboard(onSpecial?: KeyHandler) {
  const down = (e: KeyboardEvent) => {
    // Never allow Command/Meta to trigger browser exits
    if (e.metaKey || e.code === "MetaLeft" || e.code === "MetaRight") {
      if (e.code !== "KeyR" && e.code !== "KeyI") {
        e.preventDefault();
      }
    }

    // Prevent default on game keys so page does not scroll or trigger browser shortcuts
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }

    if (!e.repeat && onSpecial) {
      onSpecial(e.code, e);
    }
    keys.add(e.code);
  };

  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  const blur = () => {
    clearKeys();
  };

  window.addEventListener("keydown", down, { passive: false });
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);

  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    clearKeys();
  };
}

const k = (code: string) => (keys.has(code) ? 1 : 0);
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export interface Axes {
  surge: number;   // +1 forward (ArrowUp, R), -1 reverse (ArrowDown, Ctrl)
  sway: number;    // -1 left (ArrowLeft, A), +1 right (ArrowRight, D)
  heave: number;   // +1 up (Space), -1 down (C)
  pitch: number;   // -1 nose down (W), +1 nose up (S)
  yaw: number;     // -1 turn left (A, ArrowLeft), +1 turn right (D, ArrowRight)
  roll: number;    // -1 roll CCW (Q), +1 roll CW (E)
  boost: boolean;  // Nitro / Hyperdrive (Shift hold)
  action: boolean; // Launch / Undock / De-orbit (Space or Enter)
}

export function readAxes(): Axes {
  // 1. SURGE (Forward / Reverse) - Direct from Aule Space:
  // Forward: ArrowUp or R (+1)
  // Reverse: ArrowDown or Control (-1)
  const fwd = k("ArrowUp") + k("KeyR");
  const rev = k("ArrowDown") + k("ControlLeft") + k("ControlRight");
  const surge = clamp(fwd - rev + touch.thrust);

  // 2. SWAY (Strafe Left / Right): A / ArrowLeft (-1) vs D / ArrowRight (+1)
  const sway = clamp(k("ArrowRight") + k("KeyD") - (k("ArrowLeft") + k("KeyA")) + touch.steer);

  // 3. HEAVE (Up / Down): Space (+1) / C (-1)
  const heave = clamp(k("Space") - k("KeyC"));

  // 4. PITCH: W = Nose Up (+1), S = Nose Down (-1)
  const pitch = clamp(k("KeyW") - k("KeyS") + touch.pitch);

  // 5. YAW: A = Turn Left (-1), D = Turn Right (+1) (or Arrow keys)
  const yaw = clamp(k("KeyD") + k("ArrowRight") - (k("KeyA") + k("ArrowLeft")) + touch.steer);

  // 6. ROLL: Q = Roll Left (-1), E = Roll Right (+1)
  const roll = clamp(k("KeyE") - k("KeyQ"));

  // 7. BOOST: Shift (Hold)
  const boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || touch.boost;

  // 8. ACTION: Space or Enter
  const action = keys.has("Space") || keys.has("Enter");

  return { surge, sway, heave, pitch, yaw, roll, boost, action };
}
