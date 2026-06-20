import { Assembler } from "./src/engine/Assembler";
import { Simulator } from "./src/engine/Simulator";

// Replicate the default ASM
const code = `.section .data
msg:      .asciz "Sum = "
newline:  .asciz "\\n"

.section .text
.globl main

main:
    li   t0, 10
    li   s0, 0

loop:
    add  s0, s0, t0
    addi t0, t0, -1
    bnez t0, loop

    li   a7, 4
    la   a0, msg
    ecall

    li   a7, 1
    mv   a0, s0
    ecall

    li   a7, 4
    la   a0, newline
    ecall

    li   a7, 10
    li   a0, 0
    ecall`;

const result = Assembler.assemble(code);
console.log("Assemble success:", result.success);
if (!result.success) { console.error("Errors:", result.errors); process.exit(1); }

const sim = new Simulator();
sim.textSegment.set(result.textBytes);
sim.dataSegment.set(result.dataBytes);
sim.instructionMetadataMap = result.metadataMap;
sim.pc = 0x00400000;

let maxSteps = 500;
let output = "";
while (maxSteps-- > 0) {
  const ok = sim.stepForward();
  for (const o of sim.ecallOutputs) {
    if (o.type === "print_int") output += String(o.value);
    else if (o.type === "print_string") output += o.value;
    else if (o.type === "print_char") output += o.value;
    else if (o.type === "exit") { console.log("EXIT code:", o.code); maxSteps = 0; }
  }
  sim.ecallOutputs = [];
  if (!ok) break;
}

console.log("Output:", JSON.stringify(output));
