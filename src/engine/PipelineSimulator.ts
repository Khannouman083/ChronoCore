import { Simulator } from "./Simulator";
import type { StateSnapshot } from "./Simulator";

export interface PipelineStageState {
  pc: number;
  inst: number;
  valid: boolean;
  sourceLine: string;
  rd?: number;
  rs1?: number;
  rs2?: number;
  val1?: number;
  val2?: number;
  imm?: number;
  aluResult?: number;
  memResult?: number;
  opType?: string;
  isStall?: boolean;
  stallReason?: string;
}

export interface PipelineSnapshot extends StateSnapshot {
  stages: {
    IF: PipelineStageState;
    ID: PipelineStageState;
    EX: PipelineStageState;
    MEM: PipelineStageState;
    WB: PipelineStageState;
  };
  isStalled: boolean;
  pipelinePc: number;
}

export class PipelineSimulator extends Simulator {
  stages = {
    IF: this.createEmptyStage(),
    ID: this.createEmptyStage(),
    EX: this.createEmptyStage(),
    MEM: this.createEmptyStage(),
    WB: this.createEmptyStage(),
  };

  isStalled = false;
  pipelinePc = 0x00400000;
  activeForwarding = {
    memToExA: false,
    memToExB: false,
    wbToExA: false,
    wbToExB: false
  };

  createEmptyStage(): PipelineStageState {
    return {
      pc: 0,
      inst: 0,
      valid: false,
      sourceLine: "NOP",
    };
  }

  reset() {
    super.reset();
    this.stages = {
      IF: this.createEmptyStage(),
      ID: this.createEmptyStage(),
      EX: this.createEmptyStage(),
      MEM: this.createEmptyStage(),
      WB: this.createEmptyStage(),
    };
    this.isStalled = false;
    this.pipelinePc = 0x00400000;
    this.activeForwarding = {
      memToExA: false,
      memToExB: false,
      wbToExA: false,
      wbToExB: false
    };
  }

  // Override stepBackward to restore pipeline structures
  stepBackward(): boolean {
    const snap = this.history[this.history.length - 1] as PipelineSnapshot;
    if (!snap || snap.stages === undefined) {
      // Fallback to base
      return super.stepBackward();
    }
    
    // Base restore
    const success = super.stepBackward();
    if (success) {
      this.stages = JSON.parse(JSON.stringify(snap.stages));
      this.isStalled = snap.isStalled;
      this.pipelinePc = snap.pipelinePc;
      // Recompute forwarding indicators for UI
      this.evaluateForwardingForUI();
    }
    return success;
  }

  evaluateForwardingForUI() {
    this.activeForwarding = {
      memToExA: false,
      memToExB: false,
      wbToExA: false,
      wbToExB: false
    };

    if (!this.stages.EX.valid) return;

    const ex = this.stages.EX;
    const mem = this.stages.MEM;
    const wb = this.stages.WB;

    // Check RS1
    if (ex.rs1 !== undefined && ex.rs1 !== 0) {
      if (mem.valid && mem.rd === ex.rs1 && mem.rd !== 0) {
        this.activeForwarding.memToExA = true;
      } else if (wb.valid && wb.rd === ex.rs1 && wb.rd !== 0) {
        this.activeForwarding.wbToExA = true;
      }
    }

    // Check RS2
    if (ex.rs2 !== undefined && ex.rs2 !== 0) {
      if (mem.valid && mem.rd === ex.rs2 && mem.rd !== 0) {
        this.activeForwarding.memToExB = true;
      } else if (wb.valid && wb.rd === ex.rs2 && wb.rd !== 0) {
        this.activeForwarding.wbToExB = true;
      }
    }
  }

  stepForward(): boolean {
    // Check if there are instructions active in the pipeline or to be fetched
    const hasActiveInstructions = 
      this.stages.IF.valid || 
      this.stages.ID.valid || 
      this.stages.EX.valid || 
      this.stages.MEM.valid || 
      this.stages.WB.valid ||
      (this.readWord(this.pipelinePc) !== 0 || this.instructionMetadataMap.has(this.pipelinePc));

    if (!hasActiveInstructions) {
      return false;
    }

    // Record memory deltas for backward step
    this.currentMemoryDeltas = {};

    // Save pipeline state before execution
    const snapshot: PipelineSnapshot = {
      pc: this.pc,
      registers: new Int32Array(this.registers),
      memoryDeltas: { ...this.currentMemoryDeltas },
      currentCycle: this.currentCycle,
      instName: this.stages.EX.valid ? this.stages.EX.sourceLine.trim().split(/[\s,]+/)[0].toUpperCase() : "NOP",
      controlSignals: { ...this.controlSignals },
      stages: JSON.parse(JSON.stringify(this.stages)),
      isStalled: this.isStalled,
      pipelinePc: this.pipelinePc
    };

    this.history.push(snapshot);

    // --- PIPELINE STAGES EXECUTION (Reverse order) ---
    
    // 1. WRITE BACK (WB)
    const wb = this.stages.WB;
    if (wb.valid && wb.rd !== undefined && wb.rd !== 0) {
      const regValue = (wb.opType === "LOAD") ? (wb.memResult ?? 0) : (wb.aluResult ?? 0);
      this.registers[wb.rd] = regValue;
    }
    // Const register x0 = 0
    this.registers[0] = 0;

    // 2. MEMORY ACCESS (MEM)
    const mem = this.stages.MEM;
    let nextWb = this.createEmptyStage();
    if (mem.valid) {
      nextWb = { ...mem };
      if (mem.opType === "LOAD" && mem.aluResult !== undefined) {
        nextWb.memResult = this.readWord(mem.aluResult);
      } else if (mem.opType === "STORE" && mem.aluResult !== undefined && mem.val2 !== undefined) {
        this.writeWord(mem.aluResult, mem.val2);
      }
    }

    // 3. EXECUTE (EX)
    const ex = this.stages.EX;
    let nextMem = this.createEmptyStage();
    let branchTaken = false;
    let branchTarget = 0;

    if (ex.valid) {
      nextMem = { ...ex };
      
      // Forwarding Logic
      let operandA = ex.val1 ?? 0;
      let operandB = ex.val2 ?? 0;

      // Forward A
      if (this.stages.MEM.valid && this.stages.MEM.rd === ex.rs1 && this.stages.MEM.rd !== 0) {
        operandA = this.stages.MEM.aluResult ?? 0; // Forward from MEM stage
      } else if (this.stages.WB.valid && this.stages.WB.rd === ex.rs1 && this.stages.WB.rd !== 0) {
        operandA = (this.stages.WB.opType === "LOAD") ? (this.stages.WB.memResult ?? 0) : (this.stages.WB.aluResult ?? 0); // Forward from WB
      }

      // Forward B
      if (this.stages.MEM.valid && this.stages.MEM.rd === ex.rs2 && this.stages.MEM.rd !== 0) {
        operandB = this.stages.MEM.aluResult ?? 0;
      } else if (this.stages.WB.valid && this.stages.WB.rd === ex.rs2 && this.stages.WB.rd !== 0) {
        operandB = (this.stages.WB.opType === "LOAD") ? (this.stages.WB.memResult ?? 0) : (this.stages.WB.aluResult ?? 0);
      }

      // ALU Source Selector
      const aluIn2 = (ex.imm !== undefined && ex.opType !== "BRANCH" && ex.opType !== "R-TYPE") ? ex.imm : operandB;

      // ALU Execution
      let result = 0;
      const op = ex.sourceLine.trim().split(/[\s,]+/)[0].toLowerCase();

      switch (op) {
        case "add": case "addi": case "lw": case "sw": case "lb": case "lh": case "sb": case "sh": case "lbu": case "lhu":
          result = operandA + aluIn2;
          break;
        case "sub":
          result = operandA - aluIn2;
          break;
        case "and": case "andi":
          result = operandA & aluIn2;
          break;
        case "or": case "ori":
          result = operandA | aluIn2;
          break;
        case "xor": case "xori":
          result = operandA ^ aluIn2;
          break;
        case "sll": case "slli":
          result = operandA << (aluIn2 & 0x1F);
          break;
        case "srl": case "srli":
          result = operandA >>> (aluIn2 & 0x1F);
          break;
        case "sra": case "srai":
          result = operandA >> (aluIn2 & 0x1F);
          break;
        case "slt": case "slti":
          result = operandA < aluIn2 ? 1 : 0;
          break;
        case "sltu": case "sltiu":
          result = (operandA >>> 0) < (aluIn2 >>> 0) ? 1 : 0;
          break;
        case "lui":
          result = ex.imm ?? 0;
          break;
        case "auipc":
          result = ex.pc + (ex.imm ?? 0);
          break;
        case "jal": case "jalr":
          result = ex.pc + 4;
          branchTaken = true;
          branchTarget = op === "jal" ? (ex.pc + (ex.imm ?? 0)) : ((operandA + (ex.imm ?? 0)) & ~1);
          break;
        
        // Branches
        case "beq": branchTaken = operandA === operandB; break;
        case "bne": branchTaken = operandA !== operandB; break;
        case "blt": branchTaken = operandA < operandB; break;
        case "bge": branchTaken = operandA >= operandB; break;
        case "bltu": branchTaken = (operandA >>> 0) < (operandB >>> 0); break;
        case "bgeu": branchTaken = (operandA >>> 0) >= (operandB >>> 0); break;
      }

      if (ex.opType === "BRANCH" && branchTaken) {
        branchTarget = ex.pc + (ex.imm ?? 0);
      }

      nextMem.aluResult = result;
      nextMem.val2 = operandB; // Store value (if STORE)
    }

    // 4. INSTRUCTION DECODE (ID)
    const id = this.stages.ID;
    let nextEx = this.createEmptyStage();
    this.isStalled = false;

    if (id.valid) {
      const inst = id.inst;
      const opcode = inst & 0x7F;
      const rd = (inst >> 7) & 0x1F;
      // const funct3 = (inst >> 12) & 0x7;
      // const funct7 = (inst >> 25) & 0x7F;
      const rs1 = (inst >> 15) & 0x1F;
      const rs2 = (inst >> 20) & 0x1F;

      // Extract immediate based on instruction type
      let imm = 0;
      let opType = "ALU";

      switch (opcode) {
        case 0x37: // LUI
          imm = inst & 0xFFFFF000;
          opType = "LUI";
          break;
        case 0x17: // AUIPC
          imm = inst & 0xFFFFF000;
          opType = "AUIPC";
          break;
        case 0x6F: { // JAL
          const j20 = (inst >> 31) & 1;
          const j10_1 = (inst >> 21) & 0x3FF;
          const j11 = (inst >> 20) & 1;
          const j19_12 = (inst >> 12) & 0xFF;
          const val = (j20 << 20) | (j19_12 << 12) | (j11 << 11) | (j10_1 << 1);
          imm = (val << 11) >> 11;
          opType = "JUMP";
          break;
        }
        case 0x67: // JALR
          imm = (inst >> 20);
          opType = "JUMP";
          break;
        case 0x63: { // Branch
          const b12 = (inst >> 31) & 1;
          const b11 = (inst >> 7) & 1;
          const b10_5 = (inst >> 25) & 0x3F;
          const b4_1 = (inst >> 8) & 0xF;
          const val = (b12 << 12) | (b11 << 11) | (b10_5 << 5) | (b4_1 << 1);
          imm = (val << 19) >> 19;
          opType = "BRANCH";
          break;
        }
        case 0x03: // Load
          imm = (inst >> 20);
          opType = "LOAD";
          break;
        case 0x23: // Store
          imm = (((inst >> 25) << 5) | ((inst >> 7) & 0x1F)) << 20 >> 20;
          opType = "STORE";
          break;
        case 0x13: // I-type ALU
          imm = (inst >> 20);
          opType = "I-TYPE";
          break;
        case 0x33: // R-type ALU
          opType = "R-TYPE";
          break;
      }

      // HAZARD DETECTION UNIT (Load-Use Hazard)
      let hazardDetected = false;
      if (this.stages.EX.valid && this.stages.EX.opType === "LOAD" && this.stages.EX.rd === rs1 && rs1 !== 0) {
        hazardDetected = true;
      }
      if (this.stages.EX.valid && this.stages.EX.opType === "LOAD" && this.stages.EX.rd === rs2 && rs2 !== 0 && opType !== "I-TYPE" && opType !== "LOAD" && opType !== "LUI" && opType !== "AUIPC") {
        hazardDetected = true;
      }

      if (hazardDetected) {
        // Stall the pipeline: NOP in EX, hold ID and IF stages
        this.isStalled = true;
        nextEx = this.createEmptyStage();
        nextEx.isStall = true;
        nextEx.stallReason = `Load-Use Hazard: x${this.stages.EX.rd} depends on memory load`;
      } else {
        // Normal decode
        nextEx = {
          pc: id.pc,
          inst: id.inst,
          valid: true,
          sourceLine: id.sourceLine,
          rd,
          rs1,
          rs2,
          val1: this.registers[rs1],
          val2: this.registers[rs2],
          imm,
          opType
        };
      }
    }

    // 5. INSTRUCTION FETCH (IF)
    const iff = this.stages.IF;
    let nextId = this.createEmptyStage();

    if (this.isStalled) {
      // Hold ID and IF stages
      nextId = { ...id };
      // Do not fetch new instruction in IF, keep it the same
    } else {
      if (iff.valid) {
        nextId = { ...iff };
      }
    }

    // Fetch next instruction if not stalled
    if (!this.isStalled) {
      const inst = this.readWord(this.pipelinePc);
      const meta = this.instructionMetadataMap.get(this.pipelinePc);
      
      if (inst !== 0 || meta !== undefined) {
        this.stages.IF = {
          pc: this.pipelinePc,
          inst,
          valid: true,
          sourceLine: meta?.sourceLine ?? "nop"
        };
        this.pipelinePc += 4;
      } else {
        this.stages.IF = this.createEmptyStage();
      }
    }

    // Apply advanced state updates (Pipeline Shift)
    this.stages.ID = nextId;
    this.stages.EX = nextEx;
    this.stages.MEM = nextMem;
    this.stages.WB = nextWb;

    // Handle Branch/Jump flushes in pipeline
    if (branchTaken) {
      // Flush IF, ID and EX stages (insert bubble)
      this.stages.IF = this.createEmptyStage();
      this.stages.ID = this.createEmptyStage();
      this.stages.EX = this.createEmptyStage();
      this.pipelinePc = branchTarget;
    }

    // Update global PC to represent active instruction in execution (or decode)
    if (this.stages.EX.valid) {
      this.pc = this.stages.EX.pc;
    } else if (this.stages.ID.valid) {
      this.pc = this.stages.ID.pc;
    } else if (this.stages.IF.valid) {
      this.pc = this.stages.IF.pc;
    } else {
      this.pc = this.pipelinePc;
    }

    // Sync decoded control signals of EX stage for UI datapath overlay
    if (this.stages.EX.valid && this.stages.EX.inst) {
      this.decodeInstruction(this.stages.EX.inst);
    } else {
      this.controlSignals = this.getDefaultControlSignals();
    }

    this.currentCycle++;
    this.evaluateForwardingForUI();

    return true;
  }
}
