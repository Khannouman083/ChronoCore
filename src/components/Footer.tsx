import React from "react";
import { useChronoStore, baseSim } from "../store";
import { FileText } from "lucide-react";

export const Footer: React.FC = () => {
  const {
    pc,
    currentCycle,
    simulatorState
  } = useChronoStore();

  const getInstName = (): string => {
    const sim = baseSim;
    const meta = sim.instructionMetadataMap.get(pc);
    if (meta) {
      const parts = meta.sourceLine.trim().split(/[\s,]+/);
      return parts[0].toUpperCase();
    }
    // Check if memory has something
    const word = sim.readWord(pc);
    if (word === 0) return "HALT";
    return "DECODING";
  };

  const getStatusColorClass = () => {
    switch (simulatorState) {
      case "running":
        return "bg-success-green pulse-running";
      case "paused":
        return "bg-hazard-orange shadow-[0_0_8px_#FF6D00]";
      case "error":
        return "bg-breakpoint-red shadow-[0_0_8px_#FF0000]";
      case "idle":
      default:
        return "bg-[#849396]";
    }
  };

  const getStatusText = () => {
    switch (simulatorState) {
      case "running":
        return "RUNNING";
      case "paused":
        return "PAUSED";
      case "error":
        return "ERROR";
      case "idle":
      default:
        return "READY";
    }
  };

  const getStatusTextColorClass = () => {
    switch (simulatorState) {
      case "running":
        return "text-success-green";
      case "paused":
        return "text-hazard-orange";
      case "error":
        return "text-breakpoint-red";
      case "idle":
      default:
        return "text-on-surface-variant";
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-4 h-footer-height bg-surface-container-lowest border-t border-outline-variant select-none">
      {/* Left section: Copyright */}
      <div className="flex items-center gap-4">
        <span className="font-status-label text-status-label text-on-surface-variant">&copy; 2026 ChronoCore, All Rights Reserved</span>
        <div className="h-3 w-[1px] bg-outline-variant"></div>
        <span className="font-status-label text-status-label text-on-surface">ISA: RV32IM</span>
        <div className="h-3 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColorClass()}`}></div>
          <span className={`font-status-label text-status-label font-bold ${getStatusTextColorClass()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Center section: simulation metrics */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-status-label text-[10px] text-on-surface-variant">Cycle:</span>
          <span className="font-data-hex text-data-hex text-primary-container">{currentCycle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-status-label text-[10px] text-on-surface-variant">PC:</span>
          <span className="font-data-hex text-data-hex text-primary-container">
            0x{pc.toString(16).toUpperCase().padStart(8, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-status-label text-[10px] text-on-surface-variant">INST:</span>
          <span className="font-data-hex text-data-hex text-primary-container">{getInstName()}</span>
        </div>
      </div>

      {/* Right section: Links */}
      <div className="flex items-center gap-6">
        <a href="#" className="flex items-center gap-2 font-status-label text-status-label text-on-surface-variant hover:text-primary-container transition-colors">
          <FileText size={14} />
          <span>Docs</span>
        </a>
        <a href="https://github.com/NoumanKhan/chronocore" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
          <span className="font-medium">GitHub</span>
        </a>
      </div>
    </footer>
  );
};
