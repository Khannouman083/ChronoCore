export interface StateSnapshot {
  pc: number;
  registers: Int32Array;
  memoryDeltas: { [addr: number]: number };
  currentCycle: number;
  instName: string;
  controlSignals: ControlSignals;
}

export interface ControlSignals {
  RegWrite: number;
  ALUSrc: number;
  ALUOp: string;
  MemRead: number;
  MemWrite: number;
  MemtoReg: number;
  Branch: number;
  Jump: number;
}

export type EcallOutput = { type: "print_int"; value: number } | { type: "print_string"; value: string } | { type: "exit"; code: number } | { type: "print_char"; value: string };


export interface InstructionMetadata {
  sourceLine: string;
  lineNum: number;
  label?: string;
}

export class Simulator {
  // Registers: 32 general purpose registers
  registers = new Int32Array(32);
  pc = 0x00400000;
  currentCycle = 0;
  
  // Memory Segments
  textSegment = new Uint8Array(4096);       // 0x00400000 - 0x00400FFF
  dataSegment = new Uint8Array(65536);      // 0x10010000 - 0x1001FFFF
  stackSegment = new Uint8Array(65536);     // 0x7FFF0000 - 0x7FFFFFFF (descending)
  
  // Mapping of PC to assembly instructions for debugging display
  instructionMetadataMap = new Map<number, InstructionMetadata>();
  
  // History buffer for time travel
  history: StateSnapshot[] = [];
  
  // Record changes in current step to build deltas
  currentMemoryDeltas: { [addr: number]: number } = {};
  
  // Control signals decoded in current step
  controlSignals: ControlSignals = this.getDefaultControlSignals();

  // Ecall output queue for the store to drain
  ecallOutputs: EcallOutput[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.registers.fill(0);
    this.registers[2] = 0x7FFFFFFC; // Set SP (x2) to top of stack
    this.pc = 0x00400000;
    this.currentCycle = 0;
    this.textSegment.fill(0);
    this.dataSegment.fill(0);
    this.stackSegment.fill(0);
    this.instructionMetadataMap.clear();
    this.history = [];
    this.currentMemoryDeltas = {};
    this.ecallOutputs = [];
    this.controlSignals = this.getDefaultControlSignals();
  }

  getDefaultControlSignals(): ControlSignals {
    return {
      RegWrite: 0,
      ALUSrc: 0,
      ALUOp: "ADD",
      MemRead: 0,
      MemWrite: 0,
      MemtoReg: 0,
      Branch: 0,
      Jump: 0,
    };
  }

  // Memory Helper Methods
  resolveMemory(addr: number): { array: Uint8Array; offset: number } | null {
    if (addr >= 0x00400000 && addr <= 0x00400fff) {
      return { array: this.textSegment, offset: addr - 0x00400000 };
    } else if (addr >= 0x10010000 && addr <= 0x1001ffff) {
      return { array: this.dataSegment, offset: addr - 0x10010000 };
    } else if (addr >= 0x7fff0000 && addr <= 0x7fffffff) {
      return { array: this.stackSegment, offset: addr - 0x7fff0000 };
    }
    return null;
  }

  readByte(addr: number): number {
    const mem = this.resolveMemory(addr);
    if (!mem) return 0;
    return mem.array[mem.offset];
  }

  readHalf(addr: number): number {
    const b0 = this.readByte(addr);
    const b1 = this.readByte(addr + 1);
    const val = b0 | (b1 << 8);
    // Sign extend 16-bit
    return (val << 16) >> 16;
  }

  readHalfUnsigned(addr: number): number {
    const b0 = this.readByte(addr);
    const b1 = this.readByte(addr + 1);
    return b0 | (b1 << 8);
  }

  readByteUnsigned(addr: number): number {
    return this.readByte(addr) & 0xFF;
  }

  readWord(addr: number): number {
    const b0 = this.readByte(addr);
    const b1 = this.readByte(addr + 1);
    const b2 = this.readByte(addr + 2);
    const b3 = this.readByte(addr + 3);
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  writeByte(addr: number, value: number) {
    const mem = this.resolveMemory(addr);
    if (!mem) return;
    
    // Save delta if we haven't recorded it for this step
    if (this.currentMemoryDeltas[addr] === undefined) {
      this.currentMemoryDeltas[addr] = mem.array[mem.offset];
    }
    
    mem.array[mem.offset] = value & 0xFF;
  }

  writeWord(addr: number, value: number) {
    this.writeByte(addr, value & 0xFF);
    this.writeByte(addr + 1, (value >> 8) & 0xFF);
    this.writeByte(addr + 2, (value >> 16) & 0xFF);
    this.writeByte(addr + 3, (value >> 24) & 0xFF);
  }

  writeHalf(addr: number, value: number) {
    this.writeByte(addr, value & 0xFF);
    this.writeByte(addr + 1, (value >> 8) & 0xFF);
  }

  // Get current active instruction assembly name
  getCurrentInstructionName(): string {
    const meta = this.instructionMetadataMap.get(this.pc);
    if (meta) {
      return meta.sourceLine.trim().split(/[\s,]+/)[0].toUpperCase();
    }
    return "NOP";
  }

  // Decodes control signals and execution properties
  decodeInstruction(inst: number) {
    const opcode = inst & 0x7F;
    const funct3 = (inst >> 12) & 0x7;
    const funct7 = (inst >> 25) & 0x7F;

    const signals = this.getDefaultControlSignals();

    switch (opcode) {
      case 0x33: // R-type
        signals.RegWrite = 1;
        signals.ALUSrc = 0;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.MemtoReg = 0;
        signals.Branch = 0;
        if (funct7 === 0x01) {
          // RV32M
          const mname = ["MUL","MULH","MULHSU","MULHU","DIV","DIVU","REM","REMU"][funct3] || "MUL";
          signals.ALUOp = mname;
        } else if (funct3 === 0x0) {
          signals.ALUOp = funct7 === 0x20 ? "SUB" : "ADD";
        } else if (funct3 === 0x1) {
          signals.ALUOp = "SLL";
        } else if (funct3 === 0x2) {
          signals.ALUOp = "SLT";
        } else if (funct3 === 0x3) {
          signals.ALUOp = "SLTU";
        } else if (funct3 === 0x4) {
          signals.ALUOp = "XOR";
        } else if (funct3 === 0x5) {
          signals.ALUOp = funct7 === 0x20 ? "SRA" : "SRL";
        } else if (funct3 === 0x6) {
          signals.ALUOp = "OR";
        } else if (funct3 === 0x7) {
          signals.ALUOp = "AND";
        }
        break;

      case 0x13: // I-type ALU
        signals.RegWrite = 1;
        signals.ALUSrc = 1;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.MemtoReg = 0;
        signals.Branch = 0;
        if (funct3 === 0x0) {
          signals.ALUOp = "ADD"; // ADDI
        } else if (funct3 === 0x2) {
          signals.ALUOp = "SLT";
        } else if (funct3 === 0x3) {
          signals.ALUOp = "SLTU";
        } else if (funct3 === 0x4) {
          signals.ALUOp = "XOR";
        } else if (funct3 === 0x6) {
          signals.ALUOp = "OR";
        } else if (funct3 === 0x7) {
          signals.ALUOp = "AND";
        } else if (funct3 === 0x1) {
          signals.ALUOp = "SLL";
        } else if (funct3 === 0x5) {
          signals.ALUOp = (funct7 >> 5) === 0x1 ? "SRA" : "SRL";
        }
        break;

      case 0x03: // Load
        signals.RegWrite = 1;
        signals.ALUSrc = 1;
        signals.MemRead = 1;
        signals.MemWrite = 0;
        signals.MemtoReg = 1;
        signals.Branch = 0;
        signals.ALUOp = "ADD"; // Add offset
        break;

      case 0x23: // Store
        signals.RegWrite = 0;
        signals.ALUSrc = 1;
        signals.MemRead = 0;
        signals.MemWrite = 1;
        signals.Branch = 0;
        signals.ALUOp = "ADD"; // Add offset
        break;

      case 0x63: // Branch
        signals.RegWrite = 0;
        signals.ALUSrc = 0;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.Branch = 1;
        signals.ALUOp = "SUB"; // Compare registers
        break;

      case 0x6F: // JAL
        signals.RegWrite = 1;
        signals.ALUSrc = 0;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.Branch = 0;
        signals.Jump = 1;
        signals.ALUOp = "ADD";
        break;

      case 0x67: // JALR
        signals.RegWrite = 1;
        signals.ALUSrc = 1;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.Branch = 0;
        signals.Jump = 1;
        signals.ALUOp = "ADD";
        break;

      case 0x37: // LUI
        signals.RegWrite = 1;
        signals.ALUSrc = 1;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.Branch = 0;
        signals.ALUOp = "LUI";
        break;

      case 0x17: // AUIPC
        signals.RegWrite = 1;
        signals.ALUSrc = 1;
        signals.MemRead = 0;
        signals.MemWrite = 0;
        signals.Branch = 0;
        signals.ALUOp = "AUIPC";
        break;
    }

    this.controlSignals = signals;
  }

  // Create state snapshot before executing a step
  takeSnapshot(): StateSnapshot {
    return {
      pc: this.pc,
      registers: new Int32Array(this.registers),
      memoryDeltas: { ...this.currentMemoryDeltas },
      currentCycle: this.currentCycle,
      instName: this.getCurrentInstructionName(),
      controlSignals: { ...this.controlSignals },
    };
  }

  // Restore state from snapshot (Step Back)
  stepBackward(): boolean {
    if (this.history.length === 0) return false;
    
    const snapshot = this.history.pop()!;
    
    // Restore PC, registers, cycle count, control signals
    this.pc = snapshot.pc;
    this.registers.set(snapshot.registers);
    this.currentCycle = snapshot.currentCycle;
    this.controlSignals = snapshot.controlSignals;

    // Restore memory from deltas
    for (const [addrStr, val] of Object.entries(snapshot.memoryDeltas)) {
      const addr = parseInt(addrStr, 10);
      const mem = this.resolveMemory(addr);
      if (mem) {
        mem.array[mem.offset] = val;
      }
    }

    return true;
  }

  // Execute single cycle/step of base simulator
  stepForward(): boolean {
    // Read instruction
    const inst = this.readWord(this.pc);
    
    // If instruction is 0, consider it NOP or end of program (if past loaded instructions)
    if (inst === 0 && !this.instructionMetadataMap.has(this.pc)) {
      return false;
    }

    // Decode signals
    this.decodeInstruction(inst);
    
    // Reset delta collection for this step
    this.currentMemoryDeltas = {};
    
    // Capture snapshot for history
    const snapshot = this.takeSnapshot();
    this.history.push(snapshot);

    const opcode = inst & 0x7F;
    const rd = (inst >> 7) & 0x1F;
    const funct3 = (inst >> 12) & 0x7;
    const rs1 = (inst >> 15) & 0x1F;
    const rs2 = (inst >> 20) & 0x1F;
    const funct7 = (inst >> 25) & 0x7F;

    // Sign extend helpers
    const getImmI = () => (inst >> 20); // 12-bit signed
    const getImmS = () => (((inst >> 25) << 5) | ((inst >> 7) & 0x1F)) << 20 >> 20;
    const getImmB = () => {
      const b12 = (inst >> 31) & 1;
      const b11 = (inst >> 7) & 1;
      const b10_5 = (inst >> 25) & 0x3F;
      const b4_1 = (inst >> 8) & 0xF;
      const val = (b12 << 12) | (b11 << 11) | (b10_5 << 5) | (b4_1 << 1);
      return (val << 19) >> 19; // Sign extend from 12th bit
    };
    const getImmU = () => inst & 0xFFFFF000;
    const getImmJ = () => {
      const j20 = (inst >> 31) & 1;
      const j19_12 = (inst >> 12) & 0xFF;
      const j11 = (inst >> 20) & 1;
      const j10_1 = (inst >> 21) & 0x3FF;
      const val = (j20 << 20) | (j19_12 << 12) | (j11 << 11) | (j10_1 << 1);
      return (val << 11) >> 11; // Sign extend from 20th bit
    };

    let nextPc = this.pc + 4;
    let regWriteVal = 0;
    let writeToReg = false;

    // Execute Instruction
    switch (opcode) {
      case 0x37: // LUI
        regWriteVal = getImmU();
        writeToReg = true;
        break;

      case 0x17: // AUIPC
        regWriteVal = this.pc + getImmU();
        writeToReg = true;
        break;

      case 0x6F: // JAL
        regWriteVal = this.pc + 4;
        writeToReg = true;
        nextPc = this.pc + getImmJ();
        break;

      case 0x67: // JALR
        regWriteVal = this.pc + 4;
        writeToReg = true;
        nextPc = (this.registers[rs1] + getImmI()) & ~1;
        break;

      case 0x63: { // Branch (BEQ, BNE, BLT, BGE, BLTU, BGEU)
        const val1 = this.registers[rs1];
        const val2 = this.registers[rs2];
        let branchTaken = false;
        
        switch (funct3) {
          case 0: branchTaken = val1 === val2; break; // BEQ
          case 1: branchTaken = val1 !== val2; break; // BNE
          case 4: branchTaken = val1 < val2; break;   // BLT
          case 5: branchTaken = val1 >= val2; break;  // BGE
          case 6: branchTaken = (val1 >>> 0) < (val2 >>> 0); break;   // BLTU
          case 7: branchTaken = (val1 >>> 0) >= (val2 >>> 0); break;  // BGEU
        }
        
        if (branchTaken) {
          nextPc = this.pc + getImmB();
        }
        break;
      }

      case 0x03: { // Load (LB, LH, LW, LBU, LHU)
        const addr = this.registers[rs1] + getImmI();
        writeToReg = true;
        
        switch (funct3) {
          case 0: regWriteVal = (this.readByte(addr) << 24) >> 24; break; // LB
          case 1: regWriteVal = this.readHalf(addr); break;              // LH
          case 2: regWriteVal = this.readWord(addr); break;              // LW
          case 4: regWriteVal = this.readByteUnsigned(addr); break;      // LBU
          case 5: regWriteVal = this.readHalfUnsigned(addr); break;      // LHU
        }
        break;
      }

      case 0x23: { // Store (SB, SH, SW)
        const addr = this.registers[rs1] + getImmS();
        const val = this.registers[rs2];
        
        switch (funct3) {
          case 0: this.writeByte(addr, val & 0xFF); break; // SB
          case 1: this.writeHalf(addr, val & 0xFFFF); break; // SH
          case 2: this.writeWord(addr, val); break;        // SW
        }
        break;
      }

      case 0x13: { // ALU Imm (ADDI, SLTI, SLTIU, XORI, ORI, ANDI, SLLI, SRLI, SRAI)
        const val1 = this.registers[rs1];
        const imm = getImmI();
        writeToReg = true;
        
        switch (funct3) {
          case 0: regWriteVal = val1 + imm; break; // ADDI
          case 2: regWriteVal = val1 < imm ? 1 : 0; break; // SLTI
          case 3: regWriteVal = (val1 >>> 0) < (imm >>> 0) ? 1 : 0; break; // SLTIU
          case 4: regWriteVal = val1 ^ imm; break; // XORI
          case 6: regWriteVal = val1 | imm; break; // ORI
          case 7: regWriteVal = val1 & imm; break; // ANDI
          case 1: regWriteVal = val1 << (imm & 0x1F); break; // SLLI
          case 5: {
            const shamt = imm & 0x1F;
            const isSra = (imm >> 5) === 0x20 || funct7 === 0x20;
            regWriteVal = isSra ? (val1 >> shamt) : (val1 >>> shamt);
            break;
          }
        }
        break;
      }

      case 0x33: { // R-type ALU (ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR, AND) + RV32M
        const val1 = this.registers[rs1];
        const val2 = this.registers[rs2];
        writeToReg = true;
        
        if (funct7 === 0x01) {
          // RV32M multiply/divide
          switch (funct3) {
            case 0: regWriteVal = Math.imul(val1, val2); break; // MUL (lower 32)
            case 1: { // MULH (signed * signed, upper 32)
              const a = BigInt(val1 | 0);
              const b = BigInt(val2 | 0);
              regWriteVal = Number((a * b) >> 32n) | 0;
              break;
            }
            case 2: { // MULHSU (signed * unsigned, upper 32)
              const a = BigInt(val1 | 0);
              const b = BigInt(val2 >>> 0);
              regWriteVal = Number((a * b) >> 32n) | 0;
              break;
            }
            case 3: { // MULHU (unsigned * unsigned, upper 32)
              const a = BigInt(val1 >>> 0);
              const b = BigInt(val2 >>> 0);
              regWriteVal = Number((a * b) >> 32n) | 0;
              break;
            }
            case 4: // DIV
              regWriteVal = val2 === 0 ? -1 : (val1 / val2) | 0;
              break;
            case 5: // DIVU
              regWriteVal = val2 === 0 ? -1 : ((val1 >>> 0) / (val2 >>> 0)) | 0;
              break;
            case 6: // REM
              regWriteVal = val2 === 0 ? val1 : (val1 % val2) | 0;
              break;
            case 7: // REMU
              regWriteVal = val2 === 0 ? val1 : ((val1 >>> 0) % (val2 >>> 0)) | 0;
              break;
          }
        } else {
          switch (funct3) {
            case 0: regWriteVal = funct7 === 0x20 ? (val1 - val2) : (val1 + val2); break; // ADD/SUB
            case 1: regWriteVal = val1 << (val2 & 0x1F); break; // SLL
            case 2: regWriteVal = val1 < val2 ? 1 : 0; break; // SLT
            case 3: regWriteVal = (val1 >>> 0) < (val2 >>> 0) ? 1 : 0; break; // SLTU
            case 4: regWriteVal = val1 ^ val2; break; // XOR
            case 5: regWriteVal = funct7 === 0x20 ? (val1 >> (val2 & 0x1F)) : (val1 >>> (val2 & 0x1F)); break; // SRL/SRA
            case 6: regWriteVal = val1 | val2; break; // OR
            case 7: regWriteVal = val1 & val2; break; // AND
          }
        }
        break;
      }

      case 0x73: { // SYSTEM (ecall / ebreak)
        const syscall = funct3 === 0 && rs1 === 0 && rd === 0;
        if (syscall) {
          const code = inst >>> 20; // bit 20 distinguishes ecall (0) vs ebreak (1)
          if (code === 0) {
            // ECALL: dispatch based on a7 (x17) -- MARS/SPIKE ABI
            const a7 = this.registers[17];
            const a0 = this.registers[10];
            const a1 = this.registers[11];
            switch (a7) {
              case 1: // print_int
                this.ecallOutputs.push({ type: "print_int", value: a0 });
                break;
              case 4: { // print_string
                let str = "";
                let addr = a0;
                let ch: number;
                while ((ch = this.readByte(addr++)) !== 0 && str.length < 1024) {
                  str += String.fromCharCode(ch);
                }
                this.ecallOutputs.push({ type: "print_string", value: str });
                break;
              }
              case 11: // print_char
                this.ecallOutputs.push({ type: "print_char", value: String.fromCharCode(a0) });
                break;
              case 10: // exit
              case 93: // exit2
                this.ecallOutputs.push({ type: "exit", code: a0 });
                // Signal program end by returning false on next step
                // Set PC past any loaded instruction to halt
                nextPc = 0x00400000 + 0xFFF0;
                break;
              case 34: // print_hex
                this.ecallOutputs.push({ type: "print_string", value: "0x" + (a0 >>> 0).toString(16).toUpperCase().padStart(8, "0") });
                break;
              case 35: // print_binary
                this.ecallOutputs.push({ type: "print_string", value: "0b" + (a0 >>> 0).toString(2).padStart(32, "0") });
                break;
              case 36: // print_unsigned
                this.ecallOutputs.push({ type: "print_int", value: a0 >>> 0 });
                break;
              case 2: // print_float (unsupported, show "<float>")
                this.ecallOutputs.push({ type: "print_string", value: `<float a0=${a0}>` });
                break;
              default:
                this.ecallOutputs.push({ type: "print_string", value: `[ecall ${a7}: a0=${a0}, a1=${a1}]` });
            }
          } else {
            // ebreak — just push a notification
            this.ecallOutputs.push({ type: "print_string", value: `[EBREAK at PC=0x${this.pc.toString(16).toUpperCase().padStart(8,"0")}]` });
          }
        }
        break;
      }
    } // end switch (opcode)

    if (writeToReg && rd !== 0) {
      this.registers[rd] = regWriteVal;
    }

    // Keep register 0 as constant 0
    this.registers[0] = 0;

    this.pc = nextPc;
    this.currentCycle++;
    
    return true;
  }
}
