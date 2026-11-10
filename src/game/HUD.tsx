import { useEffect, useRef, useState } from "react";
import {
  FUEL_CAPACITY,
  releaseCapturedDebris,
  sim,
  triggerCapture,
  undock,
} from "./sim";
import { touch } from "./input";
import { audio } from "./audio";
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Flame,
  Gauge,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";

export function useTick(hz: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((t) => t + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

export function HUD() {
  useTick(14);

  const fuelPct = Math.max(0, Math.min(100, (sim.fuel / FUEL_CAPACITY) * 100));
  const returnFuelPct = Math.max(5, Math.min(95, sim.fuelNeededToReturn));
  const currentTarget = sim.debris.find((d) => d.id === sim.captureTargetId);
  const carriedDebris = sim.debris.find((d) => d.id === sim.capturedDebrisId);

  const isLowFuel = sim.fuel <= sim.fuelNeededToReturn + 3 && !sim.docked;
  const isDocked = sim.docked;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 font-hud select-none">
      {/* --- TOP FLIGHT TELEMETRY BAR --- */}
      <div className="flex items-start justify-between gap-4">
        {/* Space Sweepers Mission Readout */}
        <div className="pointer-events-auto flex flex-col gap-1.5 rounded-xl telemetry-panel px-4 py-2.5 text-zinc-100 shadow-xl border border-white/10">
          <div className="flex items-center gap-2 text-[10px] font-mono-tech tracking-[0.2em] text-zinc-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-zinc-200">SPACE SWEEPERS</span>
            <span className="text-zinc-600">/</span>
            <span>SECTOR 7 ORBITAL SALVAGE</span>
          </div>

          <div className="mt-0.5 flex items-baseline gap-4 text-xs font-mono-tech">
            <div>
              <span className="text-[10px] text-zinc-500">SPEED </span>
              <span className="font-semibold text-zinc-100">{sim.vel.length().toFixed(1)} M/S</span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500">CLEARED </span>
              <span className="font-semibold text-zinc-100">{sim.clearedCount}/{sim.totalDebris}</span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500">HULL </span>
              <span className="text-zinc-200">{sim.hull.toFixed(0)}%</span>
            </div>

            <div className="hidden sm:block">
              <span className="text-[10px] text-zinc-500">DEPOT </span>
              <span className="text-zinc-200">{isDocked ? "DOCKED" : `${sim.distToMothercraft.toFixed(0)}M`}</span>
            </div>

            <div className="hidden sm:block">
              <span className="text-[10px] text-zinc-500">DISPOSAL </span>
              <span className={sim.inReentryCorridor ? "text-amber-400 font-bold" : "text-zinc-200"}>
                {sim.distToCorridor.toFixed(0)}M
              </span>
            </div>
          </div>
        </div>

        {/* Center Flight Status Flash */}
        {sim.flashTimer > 0 && (
          <div className="hidden md:flex flex-col items-center">
            <div className="rounded-md telemetry-panel-elevated px-4 py-2 border border-zinc-700/60 shadow-xl">
              <span className="text-xs font-mono-tech tracking-[0.16em] text-zinc-200 font-medium">
                {sim.flashMessage}
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Spacer (Ensures zero collision with Camera/Music/Menu buttons!) */}
        <div className="w-32 hidden sm:block" />
      </div>

      {/* --- FLOATING 3D RETICLES (CLEAN & NON-OVERLAPPING) --- */}
      {/* Mothercraft Base Marker */}
      {sim.mothercraftScreen.on && sim.mothercraftScreen.y < 0.82 && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          style={{
            left: `${sim.mothercraftScreen.x * 100}%`,
            top: `${sim.mothercraftScreen.y * 100}%`,
          }}
        >
          <div className="flex flex-col items-center opacity-75">
            <div className="h-4 w-4 rounded-sm border border-zinc-400/50 bg-black/50 flex items-center justify-center text-[8px] font-mono-tech text-zinc-300">
              DEPOT
            </div>
            <span className="mt-0.5 text-[8px] font-mono-tech text-zinc-400">
              {sim.distToMothercraft.toFixed(0)}M
            </span>
          </div>
        </div>
      )}

      {/* Atmospheric Entry Corridor Reticle */}
      {sim.corridorScreen.on && sim.corridorScreen.y < 0.82 && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          style={{
            left: `${sim.corridorScreen.x * 100}%`,
            top: `${sim.corridorScreen.y * 100}%`,
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className={`px-2 py-0.5 rounded text-[8px] font-mono-tech tracking-wider border ${
                sim.inReentryCorridor
                  ? "border-amber-400 bg-amber-950/70 text-amber-200 font-bold"
                  : "border-zinc-700 bg-black/60 text-zinc-400"
              }`}
            >
              DISPOSAL ZONE
            </div>
            <span className="mt-0.5 text-[8px] font-mono-tech text-zinc-400">
              {sim.distToCorridor.toFixed(0)}M
            </span>
          </div>
        </div>
      )}

      {/* Debris Target Reticles (Clean White Diamond Reticle - Non-distracting) */}
      {sim.debris
        .filter((d) => !d.deorbited && !d.captured && d.screenPt.on && d.screenPt.y < 0.78 && d.screenPt.y > 0.08)
        .map((deb) => {
          const isTarget = deb.id === sim.captureTargetId;

          return (
            <div
              key={deb.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
              style={{
                left: `${deb.screenPt.x * 100}%`,
                top: `${deb.screenPt.y * 100}%`,
              }}
            >
              {isTarget ? (
                /* Classic White Target Diamond Reticle */
                <div className="flex flex-col items-center scale-105 opacity-90 transition-transform duration-75">
                  <div className="h-3.5 w-3.5 rotate-45 border border-white bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                  <span className="mt-1 text-[9px] font-mono-tech tracking-wider text-zinc-200 bg-black/75 px-2 py-0.5 rounded border border-white/15 shadow-sm backdrop-blur-sm">
                    {deb.name} ({deb.screenPt.dist.toFixed(0)}M)
                  </span>
                </div>
              ) : (
                /* Subtle dim marker for non-targeted debris */
                <div className="h-2 w-2 rotate-45 border border-zinc-600 bg-black/40 opacity-30" />
              )}
            </div>
          );
        })}

      {/* --- RIGHT-SIDE COMPACT APPROACH SCOPE (ULTRA-SLIM, NON-INTRUSIVE) --- */}
      {sim.dockingRadar.active && !isDocked && (
        <div className="pointer-events-auto absolute right-4 sm:right-6 top-16 w-44 sm:w-48 rounded-xl border border-white/15 bg-[#090d14]/90 p-2.5 shadow-xl transition-all duration-200">
          {/* Header: Target Name & Alignment */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[9px] font-mono-tech">
            <span className="font-bold text-zinc-200 truncate max-w-[95px]">
              {sim.dockingRadar.targetName}
            </span>
            <span
              className={`font-bold px-1 py-0.2 rounded text-[8px] ${
                sim.dockingRadar.alignPct > 80
                  ? "text-emerald-400 bg-emerald-950/60"
                  : "text-amber-400 bg-amber-950/60"
              }`}
            >
              {sim.dockingRadar.alignPct.toFixed(0)}%
            </span>
          </div>

          {/* Compact Vector Boresight Scope */}
          <div className="relative my-2 h-18 w-full rounded-lg border border-white/10 bg-black/70 flex items-center justify-center overflow-hidden">
            {/* Crosshair Grid */}
            <div className="absolute inset-x-0 h-px bg-white/15" />
            <div className="absolute inset-y-0 w-px bg-white/15" />
            <div className="absolute h-12 w-12 rounded-full border border-white/10" />
            <div className="absolute h-5 w-5 rounded-full border border-emerald-400/30" />

            {/* Target Pip */}
            {(() => {
              const scale = 2.4;
              const px = Math.max(-28, Math.min(28, (sim.dockingRadar.offsetX || 0) * scale));
              const py = Math.max(-28, Math.min(28, -(sim.dockingRadar.offsetY || 0) * scale));
              const isCentered = Math.hypot(px, py) < 6;

              return (
                <div
                  className="absolute flex items-center justify-center transition-all duration-75"
                  style={{
                    left: `calc(50% + ${px}px)`,
                    top: `calc(50% + ${py}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`h-2.5 w-2.5 rotate-45 border ${
                      isCentered
                        ? "border-emerald-400 bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : "border-amber-400 bg-amber-500/80 shadow-[0_0_5px_#fbbf24]"
                    }`}
                  />
                </div>
              );
            })()}
          </div>

          {/* Compact Telemetry Strip */}
          <div className="flex items-center justify-between text-[8px] font-mono-tech text-zinc-400">
            <span>
              <strong className="text-white text-[9px]">{sim.dockingRadar.range.toFixed(1)}m</strong>
            </span>
            <span>
              <strong className={sim.dockingRadar.relSpeed > 3.0 ? "text-red-400" : "text-zinc-200"}>
                {sim.dockingRadar.relSpeed.toFixed(1)} m/s
              </strong>
            </span>
          </div>

          {/* In-Range Prompt Indicator (Sleek badge, no massive button) */}
          {sim.dockingRadar.range <= 4.2 && (
            <div className="mt-1.5 text-center rounded bg-emerald-500/25 border border-emerald-400/50 py-0.5 text-[8px] font-mono-tech text-emerald-300 font-bold animate-pulse">
              [F] TO CAPTURE
            </div>
          )}
        </div>
      )}

      {/* --- LOW FUEL WARNING BANNER (ONLY WHEN CRITICAL) --- */}
      <div className="flex flex-col items-center gap-2">
        {!isDocked && isLowFuel && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-amber-950/80 border border-amber-500/50 px-4 py-2 text-xs font-mono-tech tracking-wider text-amber-200 shadow-xl">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>LOW DELTA-V · RETURN TO MOTHERCRAFT FOR RECHARGE</span>
          </div>
        )}
      </div>

      {/* --- MINIMALIST SLIM TELEMETRY BAR (NO CLUTTER / NO INSTRUCTIONS) --- */}
      <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-lg telemetry-panel px-4 py-2.5 shadow-2xl border border-white/10 max-w-4xl mx-auto w-full">
        {/* Tracked Target Spec */}
        <div className="flex items-center gap-2 min-w-0 max-w-[240px]">
          <Crosshair size={14} className="text-zinc-400 shrink-0" />
          <div className="truncate">
            <div className="text-xs font-semibold text-zinc-100 truncate">
              {sim.capturedDebrisId
                ? carriedDebris?.name
                : currentTarget
                ? currentTarget.name
                : "ALL TARGETS CLEARED"}
            </div>
            <div className="text-[10px] font-mono-tech text-zinc-400">
              {sim.capturedDebrisId ? (
                <span className="text-amber-400">TOWING TO RE-ENTRY</span>
              ) : currentTarget ? (
                `${sim.pos.distanceTo(currentTarget.pos).toFixed(0)}M`
              ) : (
                "SORTIE COMPLETE"
              )}
            </div>
          </div>
        </div>

        {/* Slim Precision Fuel Bar */}
        <div className="flex flex-1 max-w-md items-center gap-3">
          <span className="text-[10px] font-mono-tech tracking-wider text-zinc-400 shrink-0">
            ΔV
          </span>

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-950 border border-white/10">
            {/* Dynamic Return Fuel Threshold Marker */}
            <div
              className="absolute inset-y-0 left-0 bg-amber-500/20 border-r border-amber-400/90 z-10 transition-all duration-100"
              style={{ width: `${returnFuelPct}%` }}
            />

            {/* Current Propellant Fill */}
            <div
              className={`h-full transition-all duration-75 ${
                isDocked
                  ? "bg-emerald-400"
                  : isLowFuel
                  ? "bg-amber-500"
                  : "bg-zinc-200"
              }`}
              style={{ width: `${fuelPct}%` }}
            />
          </div>

          <span
            className={`text-[11px] font-mono-tech font-semibold shrink-0 ${
              isLowFuel ? "text-amber-400" : "text-zinc-200"
            }`}
          >
            {fuelPct.toFixed(0)}%
          </span>
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          {isDocked ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                undock();
              }}
              className="rounded bg-white hover:bg-zinc-200 text-black font-bold px-3.5 py-1.5 text-xs tracking-wider transition active:scale-95 shadow-md"
            >
              LAUNCH
            </button>
          ) : sim.capturedDebrisId ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                releaseCapturedDebris(sim.inReentryCorridor);
              }}
              className="rounded bg-amber-500 hover:bg-amber-400 text-black font-bold px-3.5 py-1.5 text-xs tracking-wider transition active:scale-95 shadow-md font-mono-tech"
            >
              {sim.inReentryCorridor ? "DE-ORBIT [SPACE]" : "THROW DEBRIS [F / SPACE]"}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                triggerCapture();
              }}
              disabled={!sim.canCapture}
              className={`rounded px-3.5 py-1.5 text-xs font-bold tracking-wider transition active:scale-95 font-mono-tech ${
                sim.canCapture
                  ? "bg-white text-black hover:bg-zinc-200 shadow-md"
                  : "bg-zinc-900 border border-white/10 text-zinc-600 cursor-not-allowed"
              }`}
            >
              PICKUP [F]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Intuitive virtual touch controls for mobile (Flight Stick + Actions) */
export function TouchControls() {
  const stickRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  // Single intuitive flight stick: Vertical = Forward/Reverse, Horizontal = Steer Left/Right
  const handlePointer = (e: React.PointerEvent) => {
    if (!stickRef.current) return;
    const r = stickRef.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = -(e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    setKnob({ x, y });
    touch.steer = x;
    touch.thrust = y;
  };

  const endPointer = () => {
    setKnob({ x: 0, y: 0 });
    touch.steer = 0;
    touch.thrust = 0;
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 flex items-end justify-between px-6 pointer-events-none sm:hidden">
      {/* Flight Stick: Vertical = Forward/Reverse, Horizontal = Steer */}
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <div
          ref={stickRef}
          className="relative h-28 w-28 touch-none rounded-full border border-white/20 bg-black/70 backdrop-blur-md shadow-2xl"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={(e) => e.buttons && handlePointer(e)}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <div
            className="absolute h-10 w-10 rounded-full bg-white/40 border border-white/70 shadow-md"
            style={{
              left: `calc(50% + ${knob.x * 36}px - 20px)`,
              top: `calc(50% - ${knob.y * 36}px - 20px)`,
            }}
          />
        </div>
        <span className="text-[10px] font-mono-tech tracking-wider text-zinc-300">
          THROTTLE · STEER
        </span>
      </div>

      {/* Action Buttons Column */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          onPointerDown={() => (touch.boost = true)}
          onPointerUp={() => (touch.boost = false)}
          className="h-11 w-14 rounded-md border border-white/20 bg-black/70 text-[11px] font-mono-tech font-bold text-amber-300 active:bg-amber-400 active:text-black shadow-lg"
        >
          NITRO
        </button>

        {sim.docked ? (
          <button
            onClick={undock}
            className="h-11 w-14 rounded-md bg-white text-black text-[11px] font-mono-tech font-bold active:scale-95 shadow-lg"
          >
            LAUNCH
          </button>
        ) : (
          <button
            onClick={sim.inReentryCorridor ? () => releaseCapturedDebris(true) : triggerCapture}
            className={`h-11 w-14 rounded-md text-[11px] font-mono-tech font-bold active:scale-95 shadow-lg ${
              sim.inReentryCorridor
                ? "bg-amber-400 text-black animate-pulse"
                : sim.capturedDebrisId
                ? "bg-zinc-200 text-black"
                : sim.canCapture
                ? "bg-emerald-400 text-black animate-pulse"
                : "bg-zinc-800 text-zinc-400 border border-white/20"
            }`}
          >
            {sim.inReentryCorridor ? "DEORB" : sim.capturedDebrisId ? "DROP" : "PICKUP"}
          </button>
        )}
      </div>
    </div>
  );
}
