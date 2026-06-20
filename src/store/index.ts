import { create } from "zustand";
import { Simulator } from "../engine/Simulator";
import type { ControlSignals } from "../engine/Simulator";
import { Assembler } from "../engine/Assembler";

// Instantiate engines statically
export const baseSim = new Simulator();

const DEFAULT_ASM = `.section .data
msg:      .asciz "Sum = "
newline:  .asciz "\\n"

.section .text
.globl main

main:
    # Compute sum of 1..10 and print it
    li   t0, 10       # upper bound
    li   s0, 0        # accumulator

loop:
    add  s0, s0, t0   # s0 += t0
    addi t0, t0, -1   # t0--
    bnez t0, loop

    # Print label string
    li   a7, 4        # syscall: print_string
    la   a0, msg
    ecall

    # Print the sum
    li   a7, 1        # syscall: print_int
    mv   a0, s0
    ecall

    # Print newline
    li   a7, 4
    la   a0, newline
    ecall

    # Exit
    li   a7, 10
    li   a0, 0
    ecall
`;

interface ConsoleLine {
  text: string;
  type: "info" | "error" | "success";
}

interface ChronoState {
  // Navigation & Layout
  isLandingPage: boolean;
  activeTab: "editor" | "cpu" | "memory" | "datapath" | "pipeline" | "processor";
  
  // Code Editor State
  assemblyCode: string;
  breakpoints: Set<number>;
  
  // Simulator Sync State
  simulatorState: "idle" | "running" | "paused" | "error";
  currentCycle: number;
  pc: number;
  registers: number[];
  controlSignals: ControlSignals;
  consoleLogs: ConsoleLine[];
  updatedRegisters: Set<number>;
  
  // Performance optimizations
  memoryVersion: number;
  runIntervalId: number | null;
  runSpeedMs: number;

  // Actions
  setLandingPage: (val: boolean) => void;
  setActiveTab: (tab: "editor" | "cpu" | "memory" | "datapath" | "pipeline" | "processor") => void;
  setAssemblyCode: (code: string) => void;
  toggleBreakpoint: (pc: number) => void;
  writeConsoleLog: (text: string, type?: "info" | "error" | "success") => void;
  clearConsoleLogs: () => void;
  
  compileAndLoad: () => boolean;
  stepForward: () => boolean;
  stepBackward: () => boolean;
  run: () => void;
  pause: () => void;
  reset: () => void;
  setRunSpeedMs: (speed: number) => void;
}

export const useChronoStore = create<ChronoState>((set, get) => ({
  isLandingPage: true,
  activeTab: "editor",
  assemblyCode: DEFAULT_ASM,
  breakpoints: new Set<number>(),
  
  simulatorState: "idle",
  currentCycle: 0,
  pc: 0x00400000,
  registers: Array(32).fill(0),
  controlSignals: baseSim.controlSignals,
  consoleLogs: [
    { text: "[System Initialized] Running ChronoCore v4.2.0 (RV32I Core)", type: "info" }
  ],
  updatedRegisters: new Set<number>(),
  
  memoryVersion: 0,
  runIntervalId: null,
  runSpeedMs: 300, // default 300ms per step

  setLandingPage: (val) => set({ isLandingPage: val }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setAssemblyCode: (code) => set({ assemblyCode: code }),
  
  toggleBreakpoint: (pc) => {
    const next = new Set(get().breakpoints);
    if (next.has(pc)) {
      next.delete(pc);
    } else {
      next.add(pc);
    }
    set({ breakpoints: next });
  },

  writeConsoleLog: (text, type = "info") => {
    set(state => ({
      consoleLogs: [...state.consoleLogs, { text, type }]
    }));
  },

  clearConsoleLogs: () => set({ consoleLogs: [] }),

  compileAndLoad: () => {
    get().pause();
    const code = get().assemblyCode;
    
    get().writeConsoleLog("AS      main.s -o main.o");
    get().writeConsoleLog("LD      main.o -o firmware.elf");
    get().writeConsoleLog("OBJCOPY firmware.elf -O binary firmware.bin");

    const result = Assembler.assemble(code);
    if (!result.success) {
      get().writeConsoleLog("Assembly compilation FAILED!", "error");
      result.errors.forEach(err => get().writeConsoleLog(err, "error"));
      set({ simulatorState: "error" });
      return false;
    }

    // Load binary into engine memory buffers
    baseSim.reset();
    baseSim.textSegment.set(result.textBytes);
    baseSim.dataSegment.set(result.dataBytes);
    baseSim.instructionMetadataMap = result.metadataMap;
    baseSim.pc = 0x00400000;

    const count = Array.from(result.metadataMap.values()).length;
    get().writeConsoleLog(`Build Success: Output ${count * 4} bytes generated.`, "success");
    get().writeConsoleLog("Status: Firmware loaded at 0x00400000. Entry point: 0x00400000.", "info");

    set({
      simulatorState: "idle",
      currentCycle: 0,
      pc: 0x00400000,
      registers: Array(32).fill(0),
      controlSignals: baseSim.controlSignals,
      updatedRegisters: new Set(),
      memoryVersion: get().memoryVersion + 1
    });

    return true;
  },

  stepForward: () => {
    const sim = baseSim;
    
    // Save previous register state to compute diff
    const prevRegs = Array.from(sim.registers);

    const success = sim.stepForward();
    if (!success) {
      get().writeConsoleLog("Simulation finished or reached end of file.", "info");
      get().pause();
      return false;
    }

    // Identify which registers updated
    const nextRegs = Array.from(sim.registers);
    const updated = new Set<number>();
    for (let i = 0; i < 32; i++) {
      if (prevRegs[i] !== nextRegs[i]) {
        updated.add(i);
      }
    }

    set({
      currentCycle: sim.currentCycle,
      pc: sim.pc,
      registers: nextRegs,
      controlSignals: { ...sim.controlSignals },
      updatedRegisters: updated,
      memoryVersion: get().memoryVersion + 1
    });

    // Drain ecall outputs into console
    let didExit = false;
    for (const output of sim.ecallOutputs) {
      if (output.type === "print_int") {
        get().writeConsoleLog(String(output.value), "success");
      } else if (output.type === "print_string") {
        get().writeConsoleLog(output.value, "success");
      } else if (output.type === "print_char") {
        get().writeConsoleLog(output.value, "success");
      } else if (output.type === "exit") {
        get().writeConsoleLog(`Program exited with code ${output.code}.`, "info");
        didExit = true;
      }
    }
    sim.ecallOutputs = [];

    // Check breakpoints
    if (get().breakpoints.has(sim.pc)) {
      get().writeConsoleLog(`Breakpoint reached at PC ${"0x" + sim.pc.toString(16).padStart(8, "0")}`, "info");
      get().pause();
    }

    if (didExit) {
      set({ simulatorState: "paused" });
      get().pause();
    }

    return true;
  },
  stepBackward: () => {
    const sim = baseSim;

    const prevRegs = Array.from(sim.registers);
    const success = sim.stepBackward();
    if (!success) {
      get().writeConsoleLog("No state history left to step backward.", "info");
      return false;
    }

    const nextRegs = Array.from(sim.registers);
    const updated = new Set<number>();
    for (let i = 0; i < 32; i++) {
      if (prevRegs[i] !== nextRegs[i]) {
        updated.add(i);
      }
    }

    set({
      currentCycle: sim.currentCycle,
      pc: sim.pc,
      registers: nextRegs,
      controlSignals: { ...sim.controlSignals },
      updatedRegisters: updated,
      memoryVersion: get().memoryVersion + 1
    });

    return true;
  },

  run: () => {
    if (get().simulatorState === "running") return;
    
    set({ simulatorState: "running" });
    get().writeConsoleLog("Simulation Running...", "info");

    const runStep = () => {
      const state = get().simulatorState;
      if (state !== "running") return;

      const success = get().stepForward();
      if (!success) {
        set({ simulatorState: "paused" });
        return;
      }

      const id = setTimeout(runStep, get().runSpeedMs);
      set({ runIntervalId: id as any });
    };

    const id = setTimeout(runStep, get().runSpeedMs);
    set({ runIntervalId: id as any });
  },

  pause: () => {
    const id = get().runIntervalId;
    if (id !== null) {
      clearTimeout(id);
      set({ runIntervalId: null });
    }
    if (get().simulatorState === "running") {
      set({ simulatorState: "paused" });
      get().writeConsoleLog("Simulation Paused.", "info");
    }
  },

  reset: () => {
    get().pause();
    baseSim.reset();
    
    // Reload compiled bytes if any
    const code = get().assemblyCode;
    const res = Assembler.assemble(code);
    if (res.success) {
      baseSim.textSegment.set(res.textBytes);
      baseSim.dataSegment.set(res.dataBytes);
      baseSim.instructionMetadataMap = res.metadataMap;
      baseSim.pc = 0x00400000;
    }

    set({
      simulatorState: "idle",
      currentCycle: 0,
      pc: 0x00400000,
      registers: Array(32).fill(0),
      controlSignals: baseSim.controlSignals,
      updatedRegisters: new Set(),
      memoryVersion: get().memoryVersion + 1
    });

    get().writeConsoleLog("Simulation reset. PC set to 0x00400000.", "info");
  },

  setRunSpeedMs: (speed) => set({ runSpeedMs: speed })
}));
