import type { InstructionMetadata } from "./Simulator";

const REG_MAP: { [key: string]: number } = {
  zero: 0, ra: 1, sp: 2, gp: 3, tp: 4,
  t0: 5, t1: 6, t2: 7,
  s0: 8, fp: 8, s1: 9,
  a0: 10, a1: 11, a2: 12, a3: 13, a4: 14, a5: 15, a6: 16, a7: 17,
  s2: 18, s3: 19, s4: 20, s5: 21, s6: 22, s7: 23, s8: 24, s9: 25, s10: 26, s11: 27,
  t3: 28, t4: 29, t5: 30, t6: 31
};

function getReg(name: string): number {
  const clean = name.trim().toLowerCase();
  if (REG_MAP[clean] !== undefined) {
    return REG_MAP[clean];
  }
  if (clean.startsWith("x")) {
    const num = parseInt(clean.substring(1), 10);
    if (!isNaN(num) && num >= 0 && num <= 31) {
      return num;
    }
  }
  throw new Error(`Invalid register name: "${name}"`);
}

function parseImm(str: string): number {
  const clean = str.trim();
  if (clean.toLowerCase().startsWith("0x")) {
    return parseInt(clean, 16);
  }
  return parseInt(clean, 10);
}

// Instruction encoders
function encodeR(opcode: number, funct3: number, funct7: number, rd: number, rs1: number, rs2: number): number {
  return ((funct7 & 0x7F) << 25) | ((rs2 & 0x1F) << 20) | ((rs1 & 0x1F) << 15) | ((funct3 & 0x7) << 12) | ((rd & 0x1F) << 7) | (opcode & 0x7F);
}

function encodeI(opcode: number, funct3: number, rd: number, rs1: number, imm: number): number {
  return (((imm & 0xFFF) >>> 0) << 20) | ((rs1 & 0x1F) << 15) | ((funct3 & 0x7) << 12) | ((rd & 0x1F) << 7) | (opcode & 0x7F);
}

function encodeS(opcode: number, funct3: number, rs1: number, rs2: number, imm: number): number {
  const imm11_5 = (imm >> 5) & 0x7F;
  const imm4_0 = imm & 0x1F;
  return ((imm11_5 & 0x7F) << 25) | ((rs2 & 0x1F) << 20) | ((rs1 & 0x1F) << 15) | ((funct3 & 0x7) << 12) | ((imm4_0 & 0x1F) << 7) | (opcode & 0x7F);
}

function encodeB(opcode: number, funct3: number, rs1: number, rs2: number, imm: number): number {
  const b12 = (imm >> 12) & 1;
  const b11 = (imm >> 11) & 1;
  const b10_5 = (imm >> 5) & 0x3F;
  const b4_1 = (imm >> 1) & 0xF;
  return (b12 << 31) | (b10_5 << 25) | ((rs2 & 0x1F) << 20) | ((rs1 & 0x1F) << 15) | ((funct3 & 0x7) << 12) | (b4_1 << 8) | (b11 << 7) | (opcode & 0x7F);
}

function encodeU(opcode: number, rd: number, imm: number): number {
  return ((imm & 0xFFFFF000) >>> 0) | ((rd & 0x1F) << 7) | (opcode & 0x7F);
}

function encodeJ(opcode: number, rd: number, imm: number): number {
  const j20 = (imm >> 20) & 1;
  const j10_1 = (imm >> 1) & 0x3FF;
  const j11 = (imm >> 11) & 1;
  const j19_12 = (imm >> 12) & 0xFF;
  return (j20 << 31) | (j10_1 << 21) | (j11 << 20) | (j19_12 << 12) | ((rd & 0x1F) << 7) | (opcode & 0x7F);
}

export interface AssembleResult {
  success: boolean;
  errors: string[];
  textBytes: Uint8Array;
  dataBytes: Uint8Array;
  metadataMap: Map<number, InstructionMetadata>;
}

export class Assembler {
  static assemble(code: string): AssembleResult {
    const errors: string[] = [];
    const textBytes = new Uint8Array(4096);
    const dataBytes = new Uint8Array(65536);
    const metadataMap = new Map<number, InstructionMetadata>();

    // Intermediate pass structures
    let currentSection: "text" | "data" = "text";
    let textAddr = 0x00400000;
    let dataAddr = 0x10010000;

    const labels = new Map<string, number>();

    // Cleaned source lines
    interface SourceLine {
      original: string;
      lineNum: number;
      cleaned: string;
      section: "text" | "data";
      addr: number;
    }
    const sourceLines: SourceLine[] = [];

    // PASS 1: Identify Sections, Labels, and compute byte addresses
    const rawLines = code.split("\n");
    for (let i = 0; i < rawLines.length; i++) {
      const lineNum = i + 1;
      const line = rawLines[i];
      
      // Strip comments
      let clean = line.split("#")[0].trim();
      if (!clean) continue;

      // Handle directives
      if (clean.startsWith(".")) {
        const parts = clean.split(/\s+/);
        const directive = parts[0].toLowerCase();
        if (directive === ".text" || (directive === ".section" && parts[1] === ".text")) {
          currentSection = "text";
          continue;
        } else if (directive === ".data" || (directive === ".section" && parts[1] === ".data")) {
          currentSection = "data";
          continue;
        } else if (directive === ".globl" || directive === ".section") {
          continue; // Ignore global exports
        }
      }

      // Check for labels
      if (clean.includes(":")) {
        const colonIdx = clean.indexOf(":");
        const labelName = clean.substring(0, colonIdx).trim();
        clean = clean.substring(colonIdx + 1).trim();

        if (labelName) {
          if (labels.has(labelName)) {
            errors.push(`Line ${lineNum}: Duplicate label definition: "${labelName}"`);
          }
          const labelAddr = currentSection === "text" ? textAddr : dataAddr;
          labels.set(labelName, labelAddr);
        }

        if (!clean) {
          // Empty line except label
          continue;
        }
      }

      // Record line info with estimated addresses
      const addr = currentSection === "text" ? textAddr : dataAddr;
      
      sourceLines.push({
        original: line,
        lineNum,
        cleaned: clean,
        section: currentSection,
        addr
      });

      // Increment address counters
      if (currentSection === "text") {
        // Estimate size. Pseudo instructions like large 'li' might take 2 instructions (8 bytes).
        const parts = clean.split(/\s+/);
        const op = parts[0].toLowerCase();
        if (op === "li") {
          // Check imm
          const args = clean.substring(2).split(",");
          if (args.length >= 2) {
            try {
              const imm = parseImm(args[1]);
              if (imm < -2048 || imm > 2047) {
                // Expanded to LUI + ADDI
                textAddr += 8;
                continue;
              }
            } catch {
              // Parse error will be handled in Pass 2
            }
          }
        }
        textAddr += 4;
      } else {
        // Parse data allocations in Pass 1 to count spacing
        try {
          const parts = clean.split(/\s+/);
          const dir = parts[0].toLowerCase();
          const rest = clean.substring(parts[0].length).trim();
          
          if (dir === ".word") {
            const elms = rest.split(",");
            dataAddr += elms.length * 4;
          } else if (dir === ".half") {
            const elms = rest.split(",");
            dataAddr += elms.length * 2;
          } else if (dir === ".byte") {
            const elms = rest.split(",");
            dataAddr += elms.length;
          } else if (dir === ".asciz" || dir === ".ascii") {
            // Find string in quotes
            const strMatch = rest.match(/"([^"]*)"/);
            if (strMatch) {
              const len = strMatch[1].length;
              dataAddr += len + (dir === ".asciz" ? 1 : 0);
            }
          } else if (dir === ".space") {
            const size = parseImm(rest);
            dataAddr += size;
          }
        } catch (e: any) {
          errors.push(`Line ${lineNum}: Data directive error: ${e.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, textBytes, dataBytes, metadataMap };
    }

    // PASS 2: Encode instructions and write data
    for (const srcLine of sourceLines) {
      const { cleaned, lineNum, section, addr, original } = srcLine;

      if (section === "data") {
        const parts = cleaned.split(/\s+/);
        const directive = parts[0].toLowerCase();
        const rest = cleaned.substring(parts[0].length).trim();
        const offset = addr - 0x10010000;

        try {
          if (directive === ".word") {
            const values = rest.split(",").map(parseImm);
            for (let k = 0; k < values.length; k++) {
              const val = values[k];
              const idx = offset + k * 4;
              dataBytes[idx] = val & 0xFF;
              dataBytes[idx + 1] = (val >> 8) & 0xFF;
              dataBytes[idx + 2] = (val >> 16) & 0xFF;
              dataBytes[idx + 3] = (val >> 24) & 0xFF;
            }
          } else if (directive === ".half") {
            const values = rest.split(",").map(parseImm);
            for (let k = 0; k < values.length; k++) {
              const val = values[k];
              const idx = offset + k * 2;
              dataBytes[idx] = val & 0xFF;
              dataBytes[idx + 1] = (val >> 8) & 0xFF;
            }
          } else if (directive === ".byte") {
            const values = rest.split(",").map(parseImm);
            for (let k = 0; k < values.length; k++) {
              dataBytes[offset + k] = values[k] & 0xFF;
            }
          } else if (directive === ".asciz" || directive === ".ascii") {
            const strMatch = rest.match(/"([^"]*)"/);
            if (strMatch) {
              const content = strMatch[1];
              for (let k = 0; k < content.length; k++) {
                dataBytes[offset + k] = content.charCodeAt(k);
              }
              if (directive === ".asciz") {
                dataBytes[offset + content.length] = 0;
              }
            }
          } else if (directive === ".space") {
            const size = parseImm(rest);
            for (let k = 0; k < size; k++) {
              dataBytes[offset + k] = 0;
            }
          }
        } catch (err: any) {
          errors.push(`Line ${lineNum}: Error writing data: ${err.message}`);
        }
        continue;
      }

      // Parse code instructions
      const firstSpace = cleaned.search(/\s/);
      const op = (firstSpace === -1 ? cleaned : cleaned.substring(0, firstSpace)).trim().toLowerCase();
      const rest = (firstSpace === -1 ? "" : cleaned.substring(firstSpace)).trim();

      const args = rest ? rest.replace(/,/g, " ").trim().split(/\s+/) : [];
      let encodedWords: number[] = [];

      try {
        switch (op) {
          // --- R-Type ---
          case "add":
            encodedWords.push(encodeR(0x33, 0x0, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "sub":
            encodedWords.push(encodeR(0x33, 0x0, 0x20, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "sll":
            encodedWords.push(encodeR(0x33, 0x1, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "slt":
            encodedWords.push(encodeR(0x33, 0x2, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "sltu":
            encodedWords.push(encodeR(0x33, 0x3, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "xor":
            encodedWords.push(encodeR(0x33, 0x4, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "srl":
            encodedWords.push(encodeR(0x33, 0x5, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "sra":
            encodedWords.push(encodeR(0x33, 0x5, 0x20, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "or":
            encodedWords.push(encodeR(0x33, 0x6, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "and":
            encodedWords.push(encodeR(0x33, 0x7, 0x00, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;

          // --- I-Type ALU ---
          case "addi":
            encodedWords.push(encodeI(0x13, 0x0, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "slti":
            encodedWords.push(encodeI(0x13, 0x2, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "sltiu":
            encodedWords.push(encodeI(0x13, 0x3, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "xori":
            encodedWords.push(encodeI(0x13, 0x4, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "ori":
            encodedWords.push(encodeI(0x13, 0x6, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "andi":
            encodedWords.push(encodeI(0x13, 0x7, getReg(args[0]), getReg(args[1]), parseImm(args[2])));
            break;
          case "slli":
            encodedWords.push(encodeI(0x13, 0x1, getReg(args[0]), getReg(args[1]), parseImm(args[2]) & 0x1F));
            break;
          case "srli":
            encodedWords.push(encodeI(0x13, 0x5, getReg(args[0]), getReg(args[1]), (parseImm(args[2]) & 0x1F)));
            break;
          case "srai":
            encodedWords.push(encodeI(0x13, 0x5, getReg(args[0]), getReg(args[1]), (parseImm(args[2]) & 0x1F) | 0x400)); // set SRA imm bit
            break;

          // --- Loads ---
          case "lb":
          case "lh":
          case "lw":
          case "lbu":
          case "lhu": {
            const rd = getReg(args[0]);
            // Match offset(rs1)
            const match = args[1].match(/^([^\(]+)\((.+)\)$/);
            if (!match) throw new Error("Invalid load offset expression");
            const imm = parseImm(match[1]);
            const rs1 = getReg(match[2]);
            const f3 = op === "lb" ? 0 : op === "lh" ? 1 : op === "lw" ? 2 : op === "lbu" ? 4 : 5;
            encodedWords.push(encodeI(0x03, f3, rd, rs1, imm));
            break;
          }

          // --- Stores ---
          case "sb":
          case "sh":
          case "sw": {
            const rs2 = getReg(args[0]);
            const match = args[1].match(/^([^\(]+)\((.+)\)$/);
            if (!match) throw new Error("Invalid store offset expression");
            const imm = parseImm(match[1]);
            const rs1 = getReg(match[2]);
            const f3 = op === "sb" ? 0 : op === "sh" ? 1 : 2;
            encodedWords.push(encodeS(0x23, f3, rs1, rs2, imm));
            break;
          }

          // --- Branches ---
          case "beq":
          case "bne":
          case "blt":
          case "bge":
          case "bltu":
          case "bgeu": {
            const rs1 = getReg(args[0]);
            const rs2 = getReg(args[1]);
            const targetLabel = args[2];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            const f3 = op === "beq" ? 0 : op === "bne" ? 1 : op === "blt" ? 4 : op === "bge" ? 5 : op === "bltu" ? 6 : 7;
            encodedWords.push(encodeB(0x63, f3, rs1, rs2, offset));
            break;
          }

          // --- Jumps & Upper Imms ---
          case "jal": {
            let rd = 1; // Default to 'ra' if only target is specified
            let targetLabel = args[0];
            if (args.length >= 2) {
              rd = getReg(args[0]);
              targetLabel = args[1];
            }
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined jump label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeJ(0x6F, rd, offset));
            break;
          }
          case "jalr": {
            const rd = getReg(args[0]);
            const match = args[1].match(/^([^\(]+)\((.+)\)$/);
            if (match) {
              const imm = parseImm(match[1]);
              const rs1 = getReg(match[2]);
              encodedWords.push(encodeI(0x67, 0, rd, rs1, imm));
            } else if (args.length >= 3) {
              encodedWords.push(encodeI(0x67, 0, rd, getReg(args[1]), parseImm(args[2])));
            } else {
              throw new Error("Invalid jalr arguments");
            }
            break;
          }
          case "lui":
            encodedWords.push(encodeU(0x37, getReg(args[0]), parseImm(args[1])));
            break;
          case "auipc":
            encodedWords.push(encodeU(0x17, getReg(args[0]), parseImm(args[1])));
            break;

          // --- Pseudo Instructions ---
          case "li": {
            const rd = getReg(args[0]);
            const imm = parseImm(args[1]);
            if (imm >= -2048 && imm <= 2047) {
              encodedWords.push(encodeI(0x13, 0, rd, 0, imm)); // addi rd, x0, imm
            } else {
              // Expanded to LUI + ADDI
              const upper = (imm + 0x800) >>> 12;
              const lower = imm - (upper << 12);
              encodedWords.push(encodeU(0x37, rd, upper << 12)); // lui rd, upper
              encodedWords.push(encodeI(0x13, 0, rd, rd, lower)); // addi rd, rd, lower
            }
            break;
          }
          case "mv":
            encodedWords.push(encodeI(0x13, 0, getReg(args[0]), getReg(args[1]), 0)); // addi rd, rs1, 0
            break;
          case "nop":
            encodedWords.push(encodeI(0x13, 0, 0, 0, 0)); // addi x0, x0, 0
            break;
          case "ret":
            encodedWords.push(encodeI(0x67, 0, 0, 1, 0)); // jalr x0, x1, 0
            break;
          case "j": {
            const targetLabel = args[0];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined jump label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeJ(0x6F, 0, offset)); // jal x0, offset
            break;
          }
          case "bnez": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 1, rs, 0, offset)); // bne rs, x0, offset
            break;
          }
          case "beqz": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 0, rs, 0, offset)); // beq rs, x0, offset
            break;
          }
          // --- RV32M: Multiply/Divide ---
          case "mul":
            encodedWords.push(encodeR(0x33, 0x0, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "mulh":
            encodedWords.push(encodeR(0x33, 0x1, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "mulhsu":
            encodedWords.push(encodeR(0x33, 0x2, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "mulhu":
            encodedWords.push(encodeR(0x33, 0x3, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "div":
            encodedWords.push(encodeR(0x33, 0x4, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "divu":
            encodedWords.push(encodeR(0x33, 0x5, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "rem":
            encodedWords.push(encodeR(0x33, 0x6, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;
          case "remu":
            encodedWords.push(encodeR(0x33, 0x7, 0x01, getReg(args[0]), getReg(args[1]), getReg(args[2])));
            break;

          // --- System ---
          case "ecall":
            encodedWords.push(0x00000073); // ecall
            break;
          case "ebreak":
            encodedWords.push(0x00100073); // ebreak
            break;

          // --- Extra Pseudo-Instructions ---
          case "la": {
            // la rd, label  ->  auipc rd, offset[31:12]; addi rd, rd, offset[11:0]
            const rd = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            const upper = ((offset + 0x800) >>> 12) & 0xFFFFF;
            const lower = offset - (upper << 12);
            encodedWords.push(encodeU(0x17, rd, upper << 12)); // auipc
            encodedWords.push(encodeI(0x13, 0, rd, rd, lower)); // addi
            break;
          }
          case "call": {
            const targetLabel = args[0];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            const upper = ((offset + 0x800) >>> 12) & 0xFFFFF;
            const lower = offset - (upper << 12);
            encodedWords.push(encodeU(0x17, 1, upper << 12)); // auipc ra, upper
            encodedWords.push(encodeI(0x67, 0, 1, 1, lower));  // jalr ra, ra, lower
            break;
          }
          case "tail": {
            const targetLabel = args[0];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined label: "${targetLabel}"`);
            const offset = targetAddr - addr;
            const upper = ((offset + 0x800) >>> 12) & 0xFFFFF;
            const lower = offset - (upper << 12);
            encodedWords.push(encodeU(0x17, 6, upper << 12)); // auipc t1, upper
            encodedWords.push(encodeI(0x67, 0, 0, 6, lower));  // jalr x0, t1, lower
            break;
          }
          case "not":
            encodedWords.push(encodeI(0x13, 0x4, getReg(args[0]), getReg(args[1]), -1)); // xori rd, rs, -1
            break;
          case "neg":
            encodedWords.push(encodeR(0x33, 0x0, 0x20, getReg(args[0]), 0, getReg(args[1]))); // sub rd, x0, rs
            break;
          case "seqz":
            encodedWords.push(encodeI(0x13, 0x3, getReg(args[0]), getReg(args[1]), 1)); // sltiu rd, rs, 1
            break;
          case "snez":
            encodedWords.push(encodeR(0x33, 0x3, 0x00, getReg(args[0]), 0, getReg(args[1]))); // sltu rd, x0, rs
            break;
          case "sltz":
            encodedWords.push(encodeR(0x33, 0x2, 0x00, getReg(args[0]), getReg(args[1]), 0)); // slt rd, rs, x0
            break;
          case "sgtz":
            encodedWords.push(encodeR(0x33, 0x2, 0x00, getReg(args[0]), 0, getReg(args[1]))); // slt rd, x0, rs
            break;
          case "blez": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 5, 0, rs, offset)); // bge x0, rs, offset
            break;
          }
          case "bgez": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 5, rs, 0, offset)); // bge rs, x0, offset
            break;
          }
          case "bltz": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 4, rs, 0, offset)); // blt rs, x0, offset
            break;
          }
          case "bgtz": {
            const rs = getReg(args[0]);
            const targetLabel = args[1];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 4, 0, rs, offset)); // blt x0, rs, offset
            break;
          }
          case "bgt": {
            const rs1 = getReg(args[0]);
            const rs2 = getReg(args[1]);
            const targetLabel = args[2];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 4, rs2, rs1, offset)); // blt rs2, rs1, offset
            break;
          }
          case "ble": {
            const rs1 = getReg(args[0]);
            const rs2 = getReg(args[1]);
            const targetLabel = args[2];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 5, rs2, rs1, offset)); // bge rs2, rs1, offset
            break;
          }
          case "bgtu": {
            const rs1 = getReg(args[0]);
            const rs2 = getReg(args[1]);
            const targetLabel = args[2];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 6, rs2, rs1, offset)); // bltu rs2, rs1, offset
            break;
          }
          case "bleu": {
            const rs1 = getReg(args[0]);
            const rs2 = getReg(args[1]);
            const targetLabel = args[2];
            const targetAddr = labels.get(targetLabel);
            if (targetAddr === undefined) throw new Error(`Undefined branch target: "${targetLabel}"`);
            const offset = targetAddr - addr;
            encodedWords.push(encodeB(0x63, 7, rs2, rs1, offset)); // bgeu rs2, rs1, offset
            break;
          }
          default:
            throw new Error(`Unknown instruction mnemonic: "${op}"`);
        }
      } catch (err: any) {
        errors.push(`Line ${lineNum}: ${err.message}`);
        continue;
      }

      // Write compiled words into textSegment
      for (let k = 0; k < encodedWords.length; k++) {
        const word = encodedWords[k];
        const wordAddr = addr + k * 4;
        const offset = wordAddr - 0x00400000;
        
        textBytes[offset] = word & 0xFF;
        textBytes[offset + 1] = (word >> 8) & 0xFF;
        textBytes[offset + 2] = (word >> 16) & 0xFF;
        textBytes[offset + 3] = (word >> 24) & 0xFF;

        // Map word PC to original line info for highlight debugger
        metadataMap.set(wordAddr, {
          sourceLine: original,
          lineNum
        });
      }
    }

    return {
      success: errors.length === 0,
      errors,
      textBytes,
      dataBytes,
      metadataMap
    };
  }
}
