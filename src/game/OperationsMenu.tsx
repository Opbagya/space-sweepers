import { useState } from "react";
import {
  ExternalLink,
  Flame,
  Home,
  Music,
  Play,
  RotateCcw,
  Sliders,
  Volume2,
  X,
  Zap,
  Radio,
  Compass,
} from "lucide-react";
import { audio } from "./audio";
import { emergencyDock, returnToMainMenu, sim } from "./sim";

interface OperationsMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function OperationsMenu({ onResume, onRestart }: OperationsMenuProps) {
  const [musicOn, setMusicOn] = useState(audio.musicVolume > 0.05);
  const [sfxOn, setSfxOn] = useState(audio.sfxVolume > 0.05);
  const [invertPitch, setInvertPitch] = useState(sim.invertPitch);
  const [dampOn, setDampOn] = useState(sim.damp);

  const handleMusicToggle = () => {
    const next = !musicOn;
    setMusicOn(next);
    audio.setMusicVolume(next ? 0.35 : 0);
  };

  const handleSfxToggle = () => {
    const next = !sfxOn;
    setSfxOn(next);
    audio.setSfxVolume(next ? 0.75 : 0);
  };

  const handleInvertPitchToggle = () => {
    const next = !invertPitch;
    setInvertPitch(next);
    sim.invertPitch = next;
    sim.flashMessage = next ? "PITCH INVERTED: W = DOWN, S = UP" : "PITCH STANDARD: W = UP, S = DOWN";
    sim.flashTimer = 2.5;
  };

  const handleDampToggle = () => {
    const next = !dampOn;
    setDampOn(next);
    sim.damp = next;
    sim.flashMessage = next ? "RCS ROTATIONAL DAMPER: ENGAGED" : "RCS ROTATIONAL DAMPER: MANUAL DRIFT";
    sim.flashTimer = 2.5;
  };

  const handleEmergencyDock = () => {
    emergencyDock();
    onResume();
  };

  const handleReturnToWebpage = () => {
    returnToMainMenu();
    audio.stopMusic();
    audio.setHiss(0);
    audio.setRoar(0);
    audio.suspend(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl p-4 sm:p-6 lg:p-8 font-hud select-none overflow-y-auto">
      {/* Spacious Aerospace Command Deck Console */}
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl rounded-3xl border border-zinc-700/80 bg-gradient-to-b from-[#151a24]/98 via-[#0e121a]/98 to-[#090b10]/98 p-6 sm:p-8 lg:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.06)] text-zinc-100 overflow-hidden ring-1 ring-white/10 my-auto">
        
        {/* Subtle Cockpit Grid Background Accent */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        {/* --- HEADER BAR --- */}
        <div className="relative flex items-center justify-between border-b border-zinc-700/70 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div>
              <div className="text-[11px] font-mono-tech tracking-[0.25em] text-emerald-400 font-semibold uppercase">
                SPACE SWEEPERS // FLIGHT OPERATIONS TERMINAL
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Sortie Command & Cockpit Settings
              </h2>
            </div>
          </div>

          <button
            onClick={onResume}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-mono-tech text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-700/80 transition shadow-sm"
            title="Resume Flight (Esc)"
          >
            <span>RESUME</span>
            <span className="rounded bg-zinc-900 border border-zinc-750 px-1.5 py-0.5 text-[10px] text-zinc-400">ESC</span>
            <X size={15} className="ml-0.5" />
          </button>
        </div>

        {/* --- SPACIOUS 2-COLUMN COMMAND DECK --- */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mt-6">
          
          {/* LEFT COLUMN: Mission Status & Flight Actions (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Mission Telemetry Section */}
            <div>
              <div className="text-[10px] font-mono-tech tracking-widest text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                <Radio size={12} className="text-emerald-400" />
                <span>Sortie Telemetry</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Cleared Target Progress */}
                <div className="rounded-2xl bg-zinc-800/60 p-3.5 border border-zinc-700/70 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-mono-tech text-zinc-400 uppercase tracking-wider">Cleared</span>
                  <div className="mt-1 font-mono-tech text-xl font-bold text-white">
                    {sim.clearedCount} <span className="text-xs text-zinc-500">/ {sim.totalDebris}</span>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${(sim.clearedCount / sim.totalDebris) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Propellant Delta-V */}
                <div className="rounded-2xl bg-zinc-800/60 p-3.5 border border-zinc-700/70 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-mono-tech text-zinc-400 uppercase tracking-wider">Propellant ΔV</span>
                  <div className={`mt-1 font-mono-tech text-xl font-bold ${sim.fuel < 20 ? "text-amber-400" : "text-emerald-400"}`}>
                    {sim.fuel.toFixed(0)}<span className="text-xs text-zinc-400">%</span>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-zinc-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${sim.fuel < 20 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${sim.fuel}%` }}
                    />
                  </div>
                </div>

                {/* Depot Distance */}
                <div className="rounded-2xl bg-zinc-800/60 p-3.5 border border-zinc-700/70 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-mono-tech text-zinc-400 uppercase tracking-wider">Depot Base</span>
                  <div className="mt-1 font-mono-tech text-xl font-bold text-zinc-100 truncate">
                    {sim.docked ? "DOCKED" : `${sim.distToMothercraft.toFixed(0)}M`}
                  </div>
                  <div className="mt-2 text-[9px] font-mono-tech text-zinc-500">
                    {sim.docked ? "SECURED" : "ORBITAL"}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onResume}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-white hover:bg-zinc-200 py-3.5 px-5 text-sm font-bold text-zinc-950 transition active:scale-98 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                <Play size={16} fill="currentColor" />
                <span>Resume sortie flight</span>
                <span className="text-[11px] font-mono-tech font-normal text-zinc-700 bg-zinc-300 px-2 py-0.5 rounded ml-1">
                  ESC
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleEmergencyDock}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700/80 hover:border-zinc-500 py-3 text-xs font-mono-tech text-zinc-200 transition active:scale-98 shadow-sm"
                >
                  <Zap size={14} className="text-amber-400" />
                  <span>Dock at depot</span>
                </button>

                <button
                  onClick={onRestart}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700/80 hover:border-zinc-500 py-3 text-xs font-mono-tech text-zinc-200 transition active:scale-98 shadow-sm"
                >
                  <RotateCcw size={14} className="text-zinc-400" />
                  <span>Restart sortie</span>
                </button>
              </div>
            </div>

            {/* Subsystem Toggles */}
            <div>
              <div className="text-[10px] font-mono-tech tracking-widest text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                <Sliders size={12} className="text-zinc-400" />
                <span>Avionics Subsystems</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleMusicToggle}
                  className="flex items-center justify-between rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-750/70 p-3 text-xs transition"
                >
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Music size={14} className="text-zinc-400" />
                    <span>Score Audio</span>
                  </span>
                  <span className={`text-[10px] font-mono-tech px-2.5 py-1 rounded-md font-semibold ${musicOn ? "bg-white/15 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                    {musicOn ? "ON" : "MUTED"}
                  </span>
                </button>

                <button
                  onClick={handleDampToggle}
                  className="flex items-center justify-between rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-750/70 p-3 text-xs transition"
                >
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Compass size={14} className="text-emerald-400" />
                    <span>RCS Damper</span>
                  </span>
                  <span className={`text-[10px] font-mono-tech px-2.5 py-1 rounded-md font-semibold ${dampOn ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-500"}`}>
                    {dampOn ? "ACTIVE" : "DRIFT"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Spacious Flight & ADR Controls Reference (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="rounded-2xl border border-zinc-700/80 bg-zinc-800/40 p-5 sm:p-6 flex-1 flex flex-col justify-between shadow-inner">
              
              <div>
                <div className="flex items-center justify-between border-b border-zinc-700/60 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono-tech tracking-[0.2em] text-zinc-400 uppercase font-semibold">
                      COCKPIT FLIGHT AVIONICS
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      6-DOF Control & ADR Grapple Reference
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono-tech text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    REVIVER V1
                  </span>
                </div>

                <div className="divide-y divide-zinc-700/40 text-xs font-mono-tech">
                  
                  {/* Row 1: Forward Thrust / Reverse */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium">Forward Surge & Reverse</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Main chemical thruster or retro braking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">↑</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">↓</kbd>
                      <span className="text-zinc-600 text-[10px]">or</span>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white shadow-sm">R</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white shadow-sm">Ctrl</kbd>
                    </div>
                  </div>

                  {/* Row 2: Pitch Attitude */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium">Pitch Attitude (Nose Up / Down)</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Elevation gimbal rotation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">W</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">S</kbd>
                    </div>
                  </div>

                  {/* Row 3: Yaw Lateral Steering */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium">Yaw Steering (Turn Left / Right)</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Azimuth alignment with target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">A</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">D</kbd>
                      <span className="text-zinc-600 text-[10px]">or</span>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white shadow-sm">←</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white shadow-sm">→</kbd>
                    </div>
                  </div>

                  {/* Row 4: Roll CCW / CW */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium">Roll Spin (Axial Tilt)</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Match rotational rate of tumbling debris</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">Q</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">E</kbd>
                    </div>
                  </div>

                  {/* Row 5: Heave Up / Down */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-200 font-medium">Vertical Heave (Translate Up / Down)</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Dorsal and ventral translation thrusters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">Space</kbd>
                      <kbd className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-white shadow-sm">C</kbd>
                    </div>
                  </div>

                  {/* Row 6: Nitro Hyperdrive Boost */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-semibold">Hyperdrive Nitro Surge</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Hold for maximum forward acceleration</span>
                    </div>
                    <kbd className="rounded-md border border-amber-500/50 bg-amber-950/40 px-3 py-1 text-xs text-amber-200 font-bold shadow-sm">
                      Shift (Hold)
                    </kbd>
                  </div>

                  {/* Row 7: Soft-Robotic Grapple */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-emerald-300 font-semibold">Soft-Robotic Capture Paddles</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Deploy paddles / secure target at range</span>
                    </div>
                    <kbd className="rounded-md border border-emerald-500/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-200 font-bold shadow-sm">
                      F
                    </kbd>
                  </div>

                  {/* Row 8: De-Orbit Burn */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-semibold">Atmospheric De-Orbit Burn</span>
                      <span className="block text-[10px] text-zinc-500 font-sans">Release captured debris inside disposal corridor</span>
                    </div>
                    <kbd className="rounded-md border border-amber-500/50 bg-amber-950/40 px-3 py-1 text-xs text-amber-200 font-bold shadow-sm">
                      Space (in Zone)
                    </kbd>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>

        {/* --- SPACIOUS FOOTER --- */}
        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-700/70 pt-5 gap-3 text-xs">
          <button
            onClick={handleReturnToWebpage}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition font-mono-tech text-xs rounded-lg px-3 py-1.5 hover:bg-zinc-800/60"
          >
            <Home size={14} />
            <span>Return to Title Screen</span>
          </button>

          <div className="flex items-center gap-2 text-zinc-500 font-mono-tech text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span>SPACE SWEEPERS V1.0 · ORBITAL SALVAGE OPS</span>
          </div>
        </div>

      </div>
    </div>
  );
}
