import React, { useState } from "react";
import { useChronoStore } from "../store";
import {
  RotateCcw, 
  ArrowLeft, 
  Square, 
  Play, 
  Pause, 
  ArrowRight, 
  Zap, 
  Layers,
  Menu,
  X
} from "lucide-react";

export const Header: React.FC = () => {
  const {
    simulatorState,
    compileAndLoad,
    stepForward,
    stepBackward,
    run,
    pause,
    reset,
    isLandingPage,
    setLandingPage
  } = useChronoStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleRun = () => {
    if (simulatorState === "running") {
      pause();
    } else {
      run();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 w-full h-header-height bg-surface-container border-b border-outline-variant z-50 fixed top-0 left-0">
      <div className="flex items-center gap-8 w-1/3">
        <div 
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={() => setLandingPage(true)}
        >
          <Layers className="text-primary-container text-2xl group-hover:scale-105 transition-transform" />
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors hidden sm:block">
            ChronoCore
          </h1>
        </div>
      </div>

      {isLandingPage ? (
        <>
          <nav className="flex-grow hidden md:flex justify-center items-center gap-8">
            <a 
              href="#features" 
              className="font-nav-item text-nav-item text-on-surface-variant hover:text-primary-container transition-colors duration-200 tracking-wide font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-300"
            >
              Features
            </a>
            <a 
              href="#guide" 
              className="font-nav-item text-nav-item text-on-surface-variant hover:text-primary-container transition-colors duration-200 tracking-wide font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-300"
            >
              How It Works
            </a>
            <a 
              href="#specs" 
              className="font-nav-item text-nav-item text-on-surface-variant hover:text-primary-container transition-colors duration-200 tracking-wide font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-300"
            >
              ISA Specs
            </a>
            <a 
              href="https://github.com/NoumanKhan/chronocore" 
              target="_blank" 
              rel="noreferrer" 
              className="font-nav-item text-nav-item text-on-surface-variant hover:text-primary-container transition-colors duration-200 tracking-wide font-medium relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary-container hover:after:w-full after:transition-all after:duration-300"
            >
              GitHub
            </a>
          </nav>
          
          {mobileMenuOpen && (
            <div className="absolute top-header-height left-0 w-full bg-surface-container border-b border-outline-variant shadow-lg py-4 px-6 flex flex-col gap-4 md:hidden">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-on-surface font-medium hover:text-primary-container">Features</a>
              <a href="#guide" onClick={() => setMobileMenuOpen(false)} className="text-on-surface font-medium hover:text-primary-container">How It Works</a>
              <a href="#specs" onClick={() => setMobileMenuOpen(false)} className="text-on-surface font-medium hover:text-primary-container">ISA Specs</a>
              <a href="https://github.com/NoumanKhan/chronocore" target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)} className="text-on-surface font-medium hover:text-primary-container">GitHub</a>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex justify-center items-center">
          <div className="flex items-center gap-1 bg-surface-container-lowest/50 rounded-lg p-0.5 border border-outline-variant/30">
            <button 
              onClick={reset}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container rounded transition-colors"
              title="Reset Simulation"
              aria-label="Reset simulation"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={stepBackward}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container rounded transition-colors"
              title="Step Back"
              aria-label="Step back simulation"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              onClick={pause}
              disabled={simulatorState !== "running"}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                simulatorState === "running" ? "text-hazard-orange hover:bg-hazard-orange/10" : "text-on-surface-variant/40"
              }`}
              title="Stop Simulation"
              aria-label="Pause simulation"
            >
              <Square size={14} fill="currentColor" />
            </button>
            <button 
              onClick={toggleRun}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                simulatorState === "running" 
                  ? "bg-hazard-orange text-white shadow-[0_0_10px_rgba(255,109,0,0.3)]" 
                  : "bg-primary-container text-on-primary shadow-[0_0_10px_rgba(0,229,255,0.3)] hover:brightness-110"
              }`}
              title={simulatorState === "running" ? "Pause" : "Run"}
              aria-label={simulatorState === "running" ? "Pause simulation" : "Run simulation"}
            >
              {simulatorState === "running" ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button 
              onClick={stepForward}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container rounded transition-colors"
              title="Step Forward"
              aria-label="Step forward simulation"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="w-1/3 flex justify-end items-center gap-4">
        {isLandingPage && (
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-on-surface-variant hover:text-primary-container p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        )}
        {!isLandingPage && (
          <button 
            onClick={compileAndLoad}
            className="bg-primary-container text-on-primary font-bold px-3 py-1.5 md:px-4 rounded-lg text-nav-item hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
            aria-label="Compile and load firmware"
          >
            <Zap size={16} fill="currentColor" />
            <span className="hidden md:inline">Compile &amp; Load</span>
          </button>
        )}
        
        {isLandingPage && (
          <button 
            onClick={() => setLandingPage(false)}
            className="hidden sm:block bg-primary-container text-terminal-black font-nav-item text-nav-item px-5 py-2 rounded-full font-bold hover:bg-primary transition-all duration-300 hover:scale-[1.05] active:scale-[0.98] glow-hover shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            Launch Simulator
          </button>
        )}
      </div>
    </header>
  );
};
