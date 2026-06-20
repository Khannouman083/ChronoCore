import { Assembler } from "./src/engine/Assembler";

const CODE = `.text
addi s1 x0 15
`;

const res = Assembler.assemble(CODE);
console.log("Success:", res.success);
if (!res.success) {
    console.log("Errors:", res.errors);
} else {
    console.log("Compiled words:", res.metadataMap.size);
}
