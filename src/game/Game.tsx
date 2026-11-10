import { useEffect, useState } from "react";
import { audio } from "./audio";
import { attachKeyboard, clearKeys } from "./input";
import { resetSim, sim, undock, triggerCapture, releaseCapturedDebris, returnToMainMenu } from "./sim";
import { SpaceScene } from "./Scene";
import { HUD, TouchControls, useTick } from "./HUD";
import { LandingPage } from "./LandingPage";
import { OperationsMenu } from "./OperationsMenu";
import {
  Camera,
  ExternalLink,
  Home,
  Menu,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  VolumeX,
} from "lucide-react";

export function Game() {
  useTick(8);
  const [, setRun] = useState(0);
  const [isTouch, setTouch] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  const toggleMusic = () => {
    audio.init();
    audio.music(!musicOn);
    setMusicOn(!musicOn);
  };

  const togglePause = () => {
    if (sim.screen === "playing") {
      sim.screen = "paused";
      audio.setHiss(0);
      audio.setRoar(0);
      audio.suspend(true);
    } else if (sim.screen === "paused") {
      sim.screen = "playing";
      audio.suspend(false);
    }
  };

  const cycleView = () => {
    sim.view = (sim.view + 1) % 3;
    audio.beep(1200, 0.05);
  };

  const startMission = () => {
    clearKeys();
    audio.init();
    audio.setHiss(0);
    audio.setRoar(0);
    audio.suspend(false);
    resetSim();
    undock(); // Immediately undock so the user enters flight with zero delay!
    setRun((r) => r + 1);
    sim.screen = "playing";
    sim.view = 1;
    sim.thrustAmount = 0;
    sim.boosting = false;
    sim.vel.set(0, 0, 0);
    audio.music(musicOn);
    audio.voice("Sortie active. Systems ready.");
  };

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);

    return attachKeyboard((code) => {
      if (code === "KeyP" || code === "Escape") togglePause();

      // Instant retry from Mission Failed screen
      if (sim.screen === "failed" && (code === "KeyR" || code === "Enter" || code === "Space")) {
        startMission();
        return;
      }

      if (sim.screen !== "playing") return;

      // Cycle Camera View (V)
      if (code === "KeyV") cycleView();

      // RCS Rotational Damper Toggle (X)
      if (code === "KeyX") {
        sim.damp = !sim.damp;
        audio.beep(sim.damp ? 1100 : 700, 0.08);
        sim.flashMessage = sim.damp
          ? "RCS ROTATIONAL DAMPER: ENGAGED"
          : "RCS ROTATIONAL DAMPER: MANUAL DRIFT";
        sim.flashTimer = 2.5;
        return;
      }

      // Soft-Robotic Capture & Throw: F (Dedicated Robotic Pickup / Throw Key!)
      if (code === "KeyF") {
        if (sim.canCapture && !sim.capturedDebrisId) {
          triggerCapture();
          audio.grappleLock();
        } else if (sim.capturedDebrisId) {
          releaseCapturedDebris(sim.inReentryCorridor);
        }
        return;
      }

      // Space / Enter: Undock from Base, or Throw / Atmospheric De-Orbit Burn
      if (code === "Space" || code === "Enter") {
        if (sim.docked) {
          undock();
          audio.thud(60, 0.35, 0.6);
          audio.voice("Reviver detached. Orbit cleanup sortie active.");
        } else if (sim.capturedDebrisId) {
          releaseCapturedDebris(sim.inReentryCorridor);
        }
      }

      // Forward thrusters (R, Up) while docked launches craft
      if (sim.docked && (code === "KeyR" || code === "ArrowUp")) {
        undock();
        audio.thud(60, 0.35, 0.6);
        audio.voice("Reviver detached. Orbit cleanup sortie active.");
      }
    });
  }, []);

  useEffect(() => {
    return () => audio.stopMusic();
  }, []);

  const s = sim.screen;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#050609] select-none font-hud text-zinc-100">
      {/* 3D WebGL Space Scene */}
      <SpaceScene />

      {/* Real-time Telemetry HUD */}
      {(s === "playing" || s === "paused") && <HUD />}

      {/* Top Utility Controls */}
      {s === "playing" && (
        <div className="fixed right-4 top-4 z-30 flex items-center gap-2">
          <button
            onClick={cycleView}
            title="Cycle Camera View (V)"
            className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-black/50 text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition backdrop-blur-md"
          >
            <Camera size={14} />
          </button>

          <button
            onClick={toggleMusic}
            title={musicOn ? "Mute Ambient Score" : "Play Ambient Score"}
            className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-black/50 text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition backdrop-blur-md"
          >
            {musicOn ? <Music2 size={14} /> : <VolumeX size={14} />}
          </button>

          <button
            onClick={togglePause}
            title="Flight Operations & Settings Menu (ESC / P)"
            className="flex h-8 items-center gap-1.5 px-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition backdrop-blur-md text-xs font-mono-tech tracking-wider font-semibold"
          >
            <Menu size={13} />
            <span>MENU (ESC)</span>
          </button>
        </div>
      )}

      {/* Mobile Virtual Sticks */}
      {s === "playing" && isTouch && <TouchControls />}

      {/* Space Sweepers Title & Mission Briefing */}
      {s === "briefing" && <LandingPage onStart={startMission} />}

      {/* Full-featured Flight Operations & Settings Menu (ESC button) */}
      {s === "paused" && (
        <OperationsMenu
          onResume={togglePause}
          onRestart={startMission}
        />
      )}

      {/* Mission Complete Victory Screen */}
      {s === "success" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-[#090b10] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-2 text-[11px] font-mono-tech tracking-[0.25em] text-emerald-400 uppercase">
              <span>Sortie Complete</span>
              <span className="text-zinc-600">•</span>
              <span>All Debris De-orbited</span>
            </div>

            <h2 className="mt-2 font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">
              ORBIT SUSTAINABILITY ACHIEVED
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Every targeted space debris object was secured via Sweeper-1&apos;s compliant kinetic capture arms and guided into the atmospheric re-entry corridor, incinerating cleanly in the upper mesosphere over Point Nemo.
            </p>

            {/* Scorecard */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] font-mono-tech text-zinc-500 uppercase tracking-wider">CLEARED</div>
                <div className="font-mono-tech text-lg font-bold text-zinc-100">
                  {sim.clearedCount} / {sim.totalDebris}
                </div>
              </div>

              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] font-mono-tech text-zinc-500 uppercase tracking-wider">REMAINING ΔV</div>
                <div className="font-mono-tech text-lg font-bold text-zinc-100">
                  {sim.fuel.toFixed(1)}%
                </div>
              </div>

              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] font-mono-tech text-zinc-500 uppercase tracking-wider">FLIGHT TIME</div>
                <div className="font-mono-tech text-lg font-bold text-zinc-100">
                  {Math.floor(sim.time / 60)}:
                  {Math.floor(sim.time % 60)
                    .toString()
                    .padStart(2, "0")}
                </div>
              </div>

              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] font-mono-tech text-zinc-500 uppercase tracking-wider">TOTAL SCORE</div>
                <div className="font-mono-tech text-lg font-bold text-zinc-100">
                  {sim.score.total}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08] pt-6">
              <button
                onClick={startMission}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 px-6 py-2.5 text-xs font-bold tracking-wider text-zinc-950 transition shadow-lg active:scale-98"
              >
                <span>DEPLOY NEXT SORTIE</span>
                <Play size={13} fill="currentColor" />
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    returnToMainMenu();
                    audio.stopMusic();
                    setRun((r) => r + 1);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-2.5 text-xs font-mono-tech tracking-wider text-zinc-300 transition"
                >
                  RETURN TO TITLE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mission Failed Screen (Prevents game from getting stuck!) */}
      {s === "failed" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 font-hud select-none">
          <div className="relative w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#0b0c10]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono-tech tracking-[0.25em] text-red-400 uppercase">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span>SORTIE COMPROMISED</span>
              <span className="text-zinc-600">•</span>
              <span>MISSION FAILED</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              HULL INTEGRITY BREACHED
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans font-light">
              {sim.failReason || "Spacecraft sustained catastrophic orbital impact. In Low Earth Orbit, high-velocity collisions fracture spacecraft chassis without soft-robotic paddle deployment."}
            </p>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs font-mono-tech text-zinc-300">
              <span className="text-emerald-400 font-bold">ADR Flight Protocol:</span> Deploy soft-robotic capture paddles with <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded border border-white/20">[F]</span> before touching target. Compliant paddles safely absorb contact and secure the debris.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
              <button
                onClick={() => {
                  returnToMainMenu();
                  audio.stopMusic();
                  setRun((r) => r + 1);
                }}
                className="w-full sm:w-auto rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-2.5 text-xs font-mono-tech text-zinc-300 transition"
              >
                Return to homepage
              </button>

              <button
                onClick={startMission}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-white hover:bg-zinc-100 px-6 py-2.5 text-xs font-bold text-zinc-950 transition shadow-lg active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Retry sortie (Space / R)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
