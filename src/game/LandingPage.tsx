import { useState, useEffect } from "react";
import { setBriefingViewMode, sim } from "./sim";
import { audio } from "./audio";
import {
  ArrowRight,
  Compass,
  Crosshair,
  Flame,
  Gamepad2,
  Radio,
  RotateCcw,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
  Play,
  Layers,
  ChevronRight,
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

const SALVAGE_TARGETS = [
  {
    id: "deb-1",
    callsign: "TARGET-01",
    name: "ISRO EOS-04 (RISAT RADAR)",
    type: "C-Band Synthetic Aperture Radar Array",
    mass: "1,710 KG",
    alt: "529 KM",
    spin: "0.42 RAD/S",
    status: "CRITICAL HAZARD",
    tagColor: "text-amber-300 border-amber-400/30 bg-amber-400/10",
    desc: "Derelict radar imaging satellite with deployable 3.6m parabolic antenna dish in an unstable orbital decay corridor.",
  },
  {
    id: "deb-2",
    callsign: "TARGET-02",
    name: "PSLV 4TH STAGE (POEM BOOSTER)",
    type: "Depleted Liquid Upper Stage & Solar Platform",
    mass: "1,450 KG",
    alt: "460 KM",
    spin: "0.26 RAD/S",
    status: "HEAVY STAGE",
    tagColor: "text-red-300 border-red-400/30 bg-red-400/10",
    desc: "Spent 4th-stage rocket body with dual liquid rocket nozzles and pressurant spheres. Poses severe hypervelocity impact risk.",
  },
  {
    id: "deb-3",
    callsign: "TARGET-03",
    name: "TIANGONG / ISS HABITAT TRUSS",
    type: "Pressurized Module & Photovoltaic Wing",
    mass: "890 KG",
    alt: "415 KM",
    spin: "0.68 RAD/S",
    status: "STATION TRUSS",
    tagColor: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10",
    desc: "Pressurized habitat module with APAS docking collar, carbon truss framework, and high-aspect solar array fragment.",
  },
  {
    id: "deb-4",
    callsign: "TARGET-04",
    name: "ANAND-1 HYPERSPECTRAL BUS",
    type: "Commercial Multispectral Earth Imager",
    mass: "420 KG",
    alt: "380 KM",
    spin: "0.85 RAD/S",
    status: "RAPID TUMBLE",
    tagColor: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
    desc: "Micro-satellite bus with high-resolution optical telescope barrel and deployed solar wing tumbling across orbital lanes.",
  },
  {
    id: "deb-5",
    callsign: "TARGET-05",
    name: "NAVIC TRANSPONDER SATELLITE",
    type: "Regional Navigation Constellation Transponder",
    mass: "640 KG",
    alt: "440 KM",
    spin: "0.38 RAD/S",
    status: "ORBITAL DERELICT",
    tagColor: "text-blue-300 border-blue-400/30 bg-blue-400/10",
    desc: "Navigation bus covered in gold Kapton thermal insulation with dual helical transponder antennas and solar array wings.",
  },
];

export function LandingPage({ onStart }: LandingPageProps) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [selectedSat, setSelectedSat] = useState(0);
  const [viewMode, setViewMode] = useState<"satellite" | "mothership">(sim.briefingViewMode || "satellite");
  const [soundOn, setSoundOn] = useState(audio.musicVolume > 0.05);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.setMusicVolume(next ? 0.35 : 0);
    audio.setSfxVolume(next ? 0.75 : 0);
  };

  const handleToggleView = (mode: "satellite" | "mothership") => {
    setViewMode(mode);
    setBriefingViewMode(mode, SALVAGE_TARGETS[selectedSat]?.id);
    audio.beep(900, 0.03);
  };

  const handleSelectSat = (idx: number) => {
    setSelectedSat(idx);
    setViewMode("satellite");
    setBriefingViewMode("satellite", SALVAGE_TARGETS[idx]?.id);
    audio.beep(1100, 0.04);
  };

  const handleLaunch = () => {
    audio.beep(1400, 0.08);
    audio.init();
    onStart();
  };

  // Keyboard shortcut: Press Enter or Space to immediately launch sortie
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "Space") && !controlsOpen) {
        e.preventDefault();
        handleLaunch();
      } else if (e.code === "KeyC") {
        setControlsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controlsOpen]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-8 md:p-10 font-hud text-zinc-100 select-none overflow-y-auto pointer-events-auto bg-gradient-to-t from-black/80 via-transparent to-black/60">
      
      {/* --- TOP AAA GAME TITLE NAVIGATION BAR --- */}
      <header className="flex items-center justify-between gap-4 w-full border-b border-white/10 pb-4">
        {/* Brand Logo & Military Callsign */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/10 border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.25)]">
            <Crosshair size={18} className="text-emerald-400 animate-pulse" />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-[0.18em] text-white uppercase drop-shadow">
                SPACE SWEEPERS
              </span>
              <span className="text-[10px] font-mono-tech tracking-widest text-emerald-400 uppercase font-semibold hidden sm:inline-block">
                ORBITAL SALVAGE OPS
              </span>
            </div>
            <div className="text-[9px] font-mono-tech tracking-[0.25em] text-zinc-400 uppercase">
              SECTOR 07 // LOW EARTH ORBIT (420 KM)
            </div>
          </div>
        </div>

        {/* Top-Right Mission Readiness & Sound Controls */}
        <div className="flex items-center gap-3">
          {/* Audio Comms Toggle */}
          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 px-3 py-1.5 text-xs font-mono-tech text-zinc-300 transition backdrop-blur-md"
            title="Toggle Flight Comms Audio"
          >
            {soundOn ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-zinc-500" />}
            <span className="hidden sm:inline">{soundOn ? "COMMS ON" : "MUTED"}</span>
          </button>

          {/* Flight Controls Button */}
          <button
            onClick={() => setControlsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 px-3.5 py-1.5 text-xs font-mono-tech text-zinc-200 transition backdrop-blur-md shadow-sm"
          >
            <Gamepad2 size={14} className="text-amber-400" />
            <span>FLIGHT MANUAL</span>
            <kbd className="hidden md:inline rounded bg-white/10 border border-white/10 px-1 py-0.2 text-[9px] text-zinc-400 ml-1">C</kbd>
          </button>

          {/* Quick Launch Button */}
          <button
            onClick={handleLaunch}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold px-4 py-1.5 text-xs transition active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.35)]"
          >
            <Play size={12} fill="currentColor" />
            <span>LAUNCH</span>
          </button>
        </div>
      </header>

      {/* --- MAIN HERO & MISSION DECK (AAA SPLIT LAYOUT) --- */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        
        {/* LEFT COLUMN: Cinematic Game Title & Launch Action Deck (7 Cols) */}
        <div className="lg:col-span-7 max-w-2xl space-y-6">
          
          {/* Tactical Status Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs text-emerald-300 backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono-tech tracking-[0.2em] text-[10px] uppercase font-bold">
              KINETIC HARVEST PROTOCOL // AUTHORIZED
            </span>
          </div>

          {/* Hero AAA Title */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] text-white uppercase drop-shadow-2xl">
              SPACE<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400">
                SWEEPERS
              </span>
            </h1>
            <div className="font-mono-tech text-xs sm:text-sm tracking-[0.3em] text-zinc-400 uppercase pt-1">
              ORBITAL SALVAGE & KINETIC INTERCEPTION
            </div>
          </div>

          {/* Atmospheric Lore Synopsis */}
          <p className="max-w-xl text-sm sm:text-base leading-relaxed text-zinc-300 font-sans font-normal drop-shadow">
            Over 7,000 tons of decaying rocket stages and explosive defunct satellites threaten Earth&apos;s orbital commons. Take the flight stick of the <strong className="text-white font-semibold">Sweeper-1 Harvester</strong>: execute 6-DOF zero-g burns, match hypervelocity tumble, deploy compliant magnetic capture paddles, and steer dead space junk into atmospheric cremation over Point Nemo.
          </p>

          {/* Grand AAA CTA Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Primary Launch Sortie Button */}
            <button
              onClick={handleLaunch}
              className="group relative flex items-center gap-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:from-emerald-300 hover:to-teal-300 px-8 py-4 text-base font-black tracking-wider text-zinc-950 transition-all duration-200 active:scale-95 shadow-[0_0_35px_rgba(52,211,153,0.45)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)]"
            >
              <Play size={18} fill="currentColor" className="transition-transform group-hover:scale-110" />
              <span>LAUNCH SORTIE</span>
              <span className="rounded-lg bg-zinc-950/20 px-2 py-0.5 text-xs font-mono-tech font-bold text-zinc-900 border border-zinc-950/20">
                ENTER ↵
              </span>
            </button>

            {/* Flight Manual Button */}
            <button
              onClick={() => setControlsOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/20 bg-zinc-900/60 hover:bg-zinc-800/80 px-6 py-4 text-xs font-mono-tech tracking-wider text-zinc-200 transition backdrop-blur-xl shadow-lg"
            >
              <Gamepad2 size={16} className="text-amber-400" />
              <span>COCKPIT MANUAL</span>
            </button>
          </div>

          {/* Technical Craft Specification Badges */}
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-xs font-mono-tech text-zinc-400">
            <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05]">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-500">CRAFT</span>
              <span className="font-bold text-zinc-200">SWEEPER-1 INTERCEPTOR</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05]">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-500">PROPULSION</span>
              <span className="font-bold text-zinc-200">NIOBIUM ION-CHEMICAL</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05]">
              <span className="block text-[9px] uppercase tracking-wider text-zinc-500">GRAPPLE</span>
              <span className="font-bold text-emerald-400">4-PETAL COMPLIANT</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tactical 3D Target Recon & Live Camera Switcher (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          
          {/* Header Strip with 3D Camera Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono-tech tracking-wider text-zinc-400">
            <div className="flex items-center gap-2">
              <Radio size={13} className="text-emerald-400 animate-pulse" />
              <span className="font-bold text-zinc-300">TACTICAL RADAR INTEL</span>
            </div>

            {/* 3D Camera Switcher */}
            <div className="flex items-center rounded-xl bg-zinc-900/80 p-1 border border-white/10 backdrop-blur-xl shadow-sm">
              <button
                onClick={() => handleToggleView("satellite")}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono-tech transition flex items-center gap-1.5 ${
                  viewMode === "satellite"
                    ? "bg-white text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🛰️ TARGET CAM</span>
              </button>
              <button
                onClick={() => handleToggleView("mothership")}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono-tech transition flex items-center gap-1.5 ${
                  viewMode === "mothership"
                    ? "bg-white text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>🛸 DEPOT BASE</span>
              </button>
            </div>
          </div>

          {/* Interactive Target Dossier Cards */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {SALVAGE_TARGETS.map((sat, idx) => {
              const isSelected = selectedSat === idx;
              return (
                <div
                  key={sat.id}
                  onClick={() => handleSelectSat(idx)}
                  className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl p-3.5 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-emerald-400/60 bg-zinc-900/90 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400/30 scale-[1.01]"
                      : "border-white/10 bg-zinc-900/50 hover:border-white/25 hover:bg-zinc-800/60"
                  }`}
                >
                  {/* Active target scanner line */}
                  {isSelected && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-tech font-bold text-zinc-400">
                          {sat.callsign}
                        </span>
                        <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                          {sat.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono-tech mt-0.5">
                        {sat.type}
                      </div>
                    </div>

                    <span className={`text-[9px] font-mono-tech px-2 py-0.5 rounded-full border ${sat.tagColor}`}>
                      {sat.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-300 leading-relaxed font-sans font-light">
                    {sat.desc}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[10px] font-mono-tech text-zinc-400">
                    <span className="text-zinc-400">MASS: <strong className="text-zinc-200">{sat.mass}</strong></span>
                    <span>ALT: <strong className="text-zinc-200">{sat.alt}</strong></span>
                    <span>TUMBLE: <strong className="text-zinc-200">{sat.spin}</strong></span>
                    {isSelected && viewMode === "satellite" ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                        ● 3D TRACKING
                      </span>
                    ) : (
                      <span className="text-zinc-500 group-hover:text-zinc-300 flex items-center gap-0.5">
                        TRACK <ChevronRight size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-mono-tech text-zinc-500 text-right px-1">
            Click any dossier to engage live 3D orbital camera tracking
          </div>
        </div>
      </div>

      {/* --- BOTTOM GAME FEATURES TRIAD & FOOTER --- */}
      <div className="border-t border-white/10 pt-5 space-y-4">
        
        {/* AAA Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400">
              <Zap size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono-tech">
                6-DOF NEWTONIAN INERTIA
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-light leading-snug">
                True zero-g orbital physics with RCS cold-gas translation, attitude drift, and nitro surge.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md flex items-start gap-3">
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-cyan-400">
              <Crosshair size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono-tech">
                COMPLIANT KINETIC CAPTURE
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-light leading-snug">
                Patented soft-robotic capture petals that flex and secure multi-ton spinning derelicts.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-amber-400">
              <Flame size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white uppercase tracking-wider font-mono-tech">
                POINT NEMO DE-ORBIT BURN
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-light leading-snug">
                Ferry captured junk into the upper mesosphere for safe hypersonic atmospheric incineration.
              </p>
            </div>
          </div>
        </div>

        {/* Clean AAA Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-mono-tech pt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400">SPACE SWEEPERS</span>
            <span>•</span>
            <span>AAA ORBITAL SALVAGE SIMULATOR</span>
            <span>•</span>
            <span>BUILD V1.0.4</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>RENDER ENGINE: THREE.JS · WEBGL</span>
            <span>•</span>
            <span>SINGLE-PLAYER CAMPAIGN</span>
          </div>
        </footer>
      </div>

      {/* --- COCKPIT FLIGHT MANUAL MODAL --- */}
      {controlsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 text-zinc-100 shadow-2xl ring-1 ring-white/10">
            
            <button
              onClick={() => setControlsOpen(false)}
              className="absolute right-5 top-5 rounded-full border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono-tech tracking-[0.2em] text-emerald-400 uppercase font-semibold">
                SWEEPER-1 COCKPIT MANUAL
              </span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              Flight Avionics & Capture Controls
            </h3>
            
            <p className="text-xs text-zinc-400 mt-1 mb-5 font-sans font-light">
              Full 6-DOF RCS attitude control, velocity vectors, and kinetic paddle grapple bindings.
            </p>

            <div className="space-y-2 text-xs font-mono-tech">
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Forward Thrust / Surge</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">↑ or R</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Retrograde Brake / Reverse</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">↓ or Ctrl</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Pitch Attitude (Nose Up / Down)</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">W / S</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Yaw Steering (Turn Left / Right)</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">A / D (or ← / →)</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Roll (Axial Tilt CCW / CW)</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">Q / E</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Vertical Heave (Translate Up / Down)</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">Space / C</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-amber-500/30 bg-amber-950/20">
                <span className="text-amber-300 font-semibold">Hyperdrive Nitro Boost</span>
                <kbd className="rounded-md border border-amber-500/50 bg-amber-950/50 px-3 py-1 text-xs text-amber-200 font-bold">Shift (Hold)</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-emerald-500/30 bg-emerald-950/20">
                <span className="text-emerald-300 font-semibold">Deploy / Grapple Capture Paddles</span>
                <kbd className="rounded-md border border-emerald-500/50 bg-emerald-950/50 px-3 py-1 text-xs text-emerald-200 font-bold">F</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-amber-500/30 bg-amber-950/20">
                <span className="text-amber-300 font-semibold">Atmospheric De-Orbit Burn</span>
                <kbd className="rounded-md border border-amber-500/50 bg-amber-950/50 px-3 py-1 text-xs text-amber-200 font-bold">Space (in Zone)</kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-800/70 p-2.5 border border-zinc-700/60">
                <span className="text-zinc-300">Pause / Cockpit Operations Menu</span>
                <kbd className="rounded-md border border-zinc-600 bg-zinc-850 px-2.5 py-1 text-xs text-white">ESC</kbd>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t border-zinc-800 pt-4">
              <button
                onClick={() => setControlsOpen(false)}
                className="rounded-xl bg-white hover:bg-zinc-200 px-6 py-2 text-xs font-bold text-zinc-950 transition active:scale-95 shadow-md"
              >
                CLOSE MANUAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
