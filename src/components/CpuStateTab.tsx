import React from "react";
import { useChronoStore } from "../store";

const REGISTER_NAMES = [
  "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
  "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
  "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
  "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"
];

export const CpuStateTab: React.FC = () => {
  const {
    pc,
    registers,
    controlSignals,
    updatedRegisters
  } = useChronoStore();

  const formatHex32 = (val: number): string => {
    // Treat as unsigned 32-bit
    const unsignedVal = val >>> 0;
    return "0x" + unsignedVal.toString(16).toUpperCase().padStart(8, "0");
  };

  const getNextPc = (): string => {
    // If a branch/jump signal is active, we don't know for sure unless we simulate.
    // For simple display, let's show PC + 4 or calculate it.
    return formatHex32(pc + 4);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-panel-gap bg-secondary-container lg:h-full h-auto lg:overflow-hidden overflow-y-auto p-3">
      {/* Left panel: Register Grid */}
      <section className="flex-[3] bg-surface p-4 flex flex-col gap-4 overflow-hidden border border-outline-variant/30 rounded-xl">
        <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-primary-container rounded-sm"></span>
            <h2 className="font-headline-sm text-sm uppercase tracking-wider font-bold">Register File</h2>
          </div>
          <span className="font-status-label text-[10px] text-on-surface-variant/60">ISA: RV32I | 32 GPRs</span>
        </div>

        {/* 
          minmax(140px, 1fr): 140px guarantees "0x00000000" (10 monospace chars × ~12px + 16px padding)
          always fits on one line without clipping. 
        */}
        <div className="grid gap-2 flex-grow overflow-y-auto custom-scrollbar pr-1"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
        >
          {registers.map((value, idx) => {
            const isUpdated = updatedRegisters.has(idx);
            const alias = REGISTER_NAMES[idx];
            
            return (
              <div 
                key={`${idx}-${value}`}
                className={`border rounded px-3 py-2 flex flex-col gap-1 hover:border-primary-container/60 transition-colors cursor-default relative bg-surface-container-lowest/20 ${
                  isUpdated ? "register-update border-success-green/40" : "border-outline-variant/40"
                }`}
              >
                {/* Header row: register index + ABI name */}
                <div className="flex items-center justify-between">
                  <span className="font-status-label text-[10px] text-primary-container font-bold">
                    x{idx}
                  </span>
                  <span className="font-status-label text-[10px] text-on-surface-variant/70">
                    {alias}
                  </span>
                </div>

                {/* Value row: full hex value, never truncated */}
                <span
                  className={`font-data-hex text-[11px] leading-none whitespace-nowrap ${
                    isUpdated ? "text-success-green font-bold" : "text-on-surface/90"
                  }`}
                >
                  {formatHex32(value)}
                </span>

                {isUpdated && (
                  <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-success-green animate-ping" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Right panel: PC & Control Signals */}
      <section className="flex-[2] flex flex-col gap-3 lg:overflow-hidden overflow-visible lg:h-full h-auto">
        {/* PC Module */}
        <div className="bg-surface-container-high p-4 flex flex-col gap-1.5 relative overflow-hidden border border-outline-variant/30 rounded-xl select-none">
          <div className="flex items-center justify-between">
            <p className="font-status-label text-[10px] uppercase text-primary-container tracking-wider font-bold">
              Program Counter
            </p>
            <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse shadow-[0_0_8px_#00E87A]" />
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-data-hex text-2xl lg:text-3xl text-on-surface font-bold tracking-tighter">
              {formatHex32(pc)}
            </span>
            <span className="font-status-label text-[10px] text-success-green tracking-tight">
              NEXT: {getNextPc()}
            </span>
          </div>
        </div>

        {/* Control Signals Table */}
        <div className="bg-surface lg:flex-grow p-4 flex flex-col gap-4 lg:overflow-hidden overflow-visible border border-outline-variant/30 rounded-xl lg:h-full h-auto">
          <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 select-none">
            <span className="w-2 h-4 bg-hazard-orange rounded-sm"></span>
            <h2 className="font-headline-sm text-sm uppercase tracking-wider font-bold">Control Signals</h2>
          </div>
          
          <div className="lg:flex-grow lg:overflow-y-auto overflow-visible custom-scrollbar">
            <table className="w-full text-left font-data-hex text-data-hex">
              <thead>
                <tr className="text-on-surface-variant/60 border-b border-outline-variant/20 select-none">
                  <th className="py-2 font-status-label text-[10px]">SIGNAL</th>
                  <th className="py-2 font-status-label text-[10px] text-right">VALUE</th>
                  <th className="py-2 font-status-label text-[10px] text-center">BUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-[11px]">
                {Object.entries(controlSignals).map(([signalName, signalValue]) => {
                  const isHigh = signalValue !== 0 && signalValue !== "ADD" && signalValue !== "SUB" && signalValue !== "";
                  const isStringVal = typeof signalValue === "string";
                  const displayValue = isStringVal ? signalValue : (signalValue ? "HIGH (1)" : "LOW (0)");
                  const indicatorColor = isHigh || isStringVal ? "bg-success-green shadow-[0_0_8px_#00E87A]" : "bg-outline/30";

                  return (
                    <tr key={signalName} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-2.5 text-on-surface font-medium">{signalName}</td>
                      <td className={`py-2.5 text-right font-bold ${isHigh || isStringVal ? "text-success-green" : "text-on-surface-variant/50"}`}>
                        {displayValue}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`w-2 h-2 rounded-full inline-block ${indicatorColor}`}></span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
