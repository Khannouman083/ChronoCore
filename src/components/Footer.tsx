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
    <footer className="fixed bottom-0 left-0 w-full z-50 flex flex-nowrap justify-between items-center px-2 sm:px-4 h-footer-height py-2 bg-surface-container-lowest border-t border-outline-variant select-none gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap custom-scrollbar">
      {/* Left section: Copyright */}
      <div className="flex flex-nowrap items-center gap-2 sm:gap-4 w-auto justify-start shrink-0">
        <span className="font-status-label text-status-label text-on-surface-variant hidden sm:inline">&copy; 2026 ChronoCore, All Rights Reserved</span>
        <span className="font-status-label text-[10px] text-on-surface-variant sm:hidden">&copy; '26 ChronoCore</span>
        <div className="h-3 w-[1px] bg-outline-variant"></div>
        <span className="font-status-label text-status-label text-on-surface">ISA: RV32IM</span>
        <div className="h-3 w-[1px] bg-outline-variant"></div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColorClass()}`}></div>
          <span className={`font-status-label text-[10px] sm:text-status-label font-bold ${getStatusTextColorClass()}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Center section: simulation metrics */}
      <div className="flex flex-nowrap items-center justify-center gap-3 sm:gap-6 w-auto shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-status-label text-[9px] sm:text-[10px] text-on-surface-variant">Cycle:</span>
          <span className="font-data-hex text-[10px] sm:text-data-hex text-primary-container">{currentCycle}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-status-label text-[9px] sm:text-[10px] text-on-surface-variant">PC:</span>
          <span className="font-data-hex text-[10px] sm:text-data-hex text-primary-container">
            0x{pc.toString(16).toUpperCase().padStart(8, "0")}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-status-label text-[9px] sm:text-[10px] text-on-surface-variant hidden sm:inline">INST:</span>
          <span className="font-data-hex text-[10px] sm:text-data-hex text-primary-container">{getInstName()}</span>
        </div>
      </div>

      {/* Right section: Links */}
      <div className="flex flex-nowrap items-center justify-center gap-4 sm:gap-6 w-auto shrink-0 pr-2">
        <a href="#" className="flex items-center gap-2 font-status-label text-status-label text-on-surface-variant hover:text-primary-container transition-colors">
          <FileText size={14} />
          <span className="hidden sm:inline">Docs</span>
        </a>
        <a href="https://github.com/NoumanKhan/chronocore" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-status-label">
          <span className="font-medium">GitHub</span>
        </a>
      </div>
    </footer>
  );
};
