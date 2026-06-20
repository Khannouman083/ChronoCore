import React, { useRef, useEffect, useState } from "react";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { useChronoStore, baseSim } from "../store";
import { X, CornerDownRight, Play } from "lucide-react";

export const EditorTab: React.FC = () => {
  const {
    assemblyCode,
    setAssemblyCode,
    consoleLogs,
    clearConsoleLogs,
    breakpoints,
    toggleBreakpoint,
    pc,
    simulatorState,
    registers,
    updatedRegisters
  } = useChronoStore();

  const [activeBottomTab, setActiveBottomTab] = useState<"terminal" | "problems" | "watch">("terminal");
  const [terminalHeight, setTerminalHeight] = useState(224);
  const isDragging = useRef(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Find line number corresponding to current PC
  const getCurrentLineNumber = (): number | null => {
    const sim = baseSim;
    const meta = sim.instructionMetadataMap.get(pc);
    return meta ? meta.lineNum : null;
  };

  // Map line numbers to PC addresses (helper to toggle breakpoints on line click)
  const getPcFromLine = (lineNum: number): number | null => {
    const sim = baseSim;
    for (const [addr, meta] of sim.instructionMetadataMap.entries()) {
      if (meta.lineNum === lineNum) {
        return addr;
      }
    }
    // Fallback: estimate PC based on line offset if not compiled yet
    // In our simulator, each instruction starting at 0x00400000 corresponds to non-empty code lines
    return null;
  };

  // Handle editor mount
  const handleMouseDown = () => {
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const footerHeight = 40; // Approx footer height
    const newHeight = window.innerHeight - e.clientY - footerHeight;
    if (newHeight > 40 && newHeight < window.innerHeight * 0.7) {
      setTerminalHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register RISC-V assembly language with Monarch tokenizer
    if (!monaco.languages.getLanguages().some((l: any) => l.id === "riscv")) {
      monaco.languages.register({ id: "riscv", extensions: [".s", ".asm"], aliases: ["RISC-V", "riscv"] });

      monaco.languages.setMonarchTokensProvider("riscv", {
        tokenizer: {
          root: [
            // Comments
            [/#.*$/, "comment"],
            // Directives (e.g. .text, .data, .word, .asciz)
            [/\.(text|data|bss|section|globl|global|word|half|byte|asciz|ascii|string|space|align|set|equ)\b/, "directive"],
            // Label definitions (e.g. "main:")
            [/^[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/, "label"],
            // R-type + I-type instructions
            [/\b(add|sub|and|or|xor|sll|srl|sra|slt|sltu|mul|mulh|mulhsu|mulhu|div|divu|rem|remu|addi|andi|ori|xori|slti|sltiu|slli|srli|srai)\b/, "keyword.instruction"],
            // Load/Store
            [/\b(lw|lh|lb|lhu|lbu|sw|sh|sb)\b/, "keyword.memory"],
            // Branches + Jumps
            [/\b(beq|bne|blt|bge|bltu|bgeu|jal|jalr|bnez|beqz|blez|bgez|bltz|bgtz|bgt|ble|bgtu|bleu|j|call|tail|ret)\b/, "keyword.branch"],
            // Upper-immediate
            [/\b(lui|auipc)\b/, "keyword.upper"],
            // Pseudo instructions
            [/\b(li|la|mv|nop|neg|not|seqz|snez|sltz|sgtz)\b/, "keyword.pseudo"],
            // System instructions
            [/\b(ecall|ebreak)\b/, "keyword.system"],
            // Registers – ABI names
            [/\b(zero|ra|sp|gp|tp|fp|a[0-7]|s[0-9]|s1[01]|t[0-6])\b/, "register.abi"],
            // Registers – numeric (x0..x31)
            [/\bx([0-9]|[12][0-9]|3[01])\b/, "register.num"],
            // Hex immediates
            [/0x[0-9a-fA-F]+/, "number.hex"],
            // Decimal immediates (possibly signed)
            [/-?[0-9]+/, "number.dec"],
            // Strings
            [/"(?:[^"\\]|\\.)*"/, "string"],
            // Operators and punctuation
            [/[()\[\],]/, "delimiter"],
          ],
        },
      } as any);
    }

    // Define custom theme matching ChronoCore (surface: #0f131c)
    monaco.editor.defineTheme("chronocore-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment",           foreground: "526b70", fontStyle: "italic" },
        { token: "directive",         foreground: "BD93F9" }, // purple for directives
        { token: "label",             foreground: "FFB86C", fontStyle: "bold" }, // orange for labels
        { token: "keyword.instruction",foreground: "00E5FF", fontStyle: "bold" }, // cyan for ALU
        { token: "keyword.memory",    foreground: "50FA7B" }, // green for load/store
        { token: "keyword.branch",    foreground: "FF79C6" }, // pink for branches
        { token: "keyword.upper",     foreground: "8BE9FD" }, // light blue for lui/auipc
        { token: "keyword.pseudo",    foreground: "F1FA8C" }, // yellow for pseudos
        { token: "keyword.system",    foreground: "FF5555", fontStyle: "bold" }, // red for ecall
        { token: "register.abi",      foreground: "A8FF78" }, // bright green for ABI regs
        { token: "register.num",      foreground: "78FFD6" }, // teal for x0..x31
        { token: "number.hex",        foreground: "c3f5ff" },
        { token: "number.dec",        foreground: "c3f5ff" },
        { token: "string",            foreground: "00E87A" },
        { token: "delimiter",         foreground: "6272A4" },
      ],
      colors: {
        "editor.background": "#0f131c",
        "editor.foreground": "#dfe2ef",
        "editor.lineHighlightBackground": "#1c2029",
        "editorLineNumber.foreground": "#3b494c",
        "editorLineNumber.activeForeground": "#00e5ff",
        "editorGutter.background": "#0a0e17",
        "editorGutter.modifiedBackground": "#00daf3",
        "editorCursor.foreground": "#00E5FF",
        "editor.selectionBackground": "#00daf320",
        "editorBracketMatch.background": "#00daf310",
        "editorBracketMatch.border": "#00daf3",
      },
    });

    monaco.editor.setTheme("chronocore-theme");

    // Click listener to toggle breakpoints in the glyph margin
    editor.onMouseDown((e: any) => {
      if (e.target.type === 2) { // 2 corresponds to GlyphMargin
        const lineNum = e.target.position.lineNumber;
        
        // Find if this line has a compiled PC
        const pcAddr = getPcFromLine(lineNum);
        if (pcAddr !== null) {
          toggleBreakpoint(pcAddr);
        }
      }
    });
  };


  const currentLineNum = getCurrentLineNumber();

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const breakpointLines: number[] = [];
    const sim = baseSim;
    
    breakpoints.forEach(bpPc => {
      const meta = sim.instructionMetadataMap.get(bpPc);
      if (meta) {
        breakpointLines.push(meta.lineNum);
      }
    });

    const newDecorations: any[] = [];

    breakpointLines.forEach(line => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "breakpoint-dot-glyph",
        }
      });
    });

    if (currentLineNum !== null && simulatorState !== "idle") {
      newDecorations.push({
        range: new monaco.Range(currentLineNum, 1, currentLineNum, 1),
        options: {
          isWholeLine: true,
          className: "bg-primary-container/10",
          glyphMarginClassName: "active-line-glyph"
        }
      });
    }

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [breakpoints, currentLineNum, simulatorState]);

  useEffect(() => {
    const styleId = "monaco-breakpoint-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .breakpoint-dot-glyph {
          background: #FF0000 !important;
          border-radius: 50% !important;
          width: 8px !important;
          height: 8px !important;
          margin-left: 6px !important;
          margin-top: 5px !important;
          box-shadow: 0 0 8px rgba(255, 0, 0, 0.8) !important;
          cursor: pointer;
        }
        .active-line-glyph {
          border-left: 3px solid #00e5ff !important;
          margin-left: 12px !important;
          height: 100% !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-surface-container-lowest relative h-full overflow-hidden">
      <div className="h-8 bg-surface-container flex items-center px-4 justify-between border-b border-outline-variant/30 select-none">
        <div className="flex items-center gap-2">
          <span className="font-status-label text-status-label text-on-surface">main.s</span>
          <span className="text-[10px] text-on-surface-variant/40">RISC-V Assembly</span>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant font-status-label text-status-label">
          <span>Tab Size: 4</span>
          <span>UTF-8</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          height="100%"
          language="riscv"
          theme="chronocore-theme"
          value={assemblyCode}
          onChange={(val) => setAssemblyCode(val ?? "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "JetBrains Mono",
            lineHeight: 20,
            minimap: { enabled: false },
            glyphMargin: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      <div 
        className="h-1 bg-outline-variant/30 hover:bg-primary-container cursor-row-resize transition-colors flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-[2px] bg-outline-variant/50"></div>
      </div>

      <div style={{ height: terminalHeight }} className="flex flex-col bg-terminal-black">
        <div className="h-8 bg-surface-container-high border-b border-outline-variant/50 flex items-center px-4 gap-6 select-none">
          <button 
            onClick={() => setActiveBottomTab("terminal")}
            className={`font-status-label text-status-label h-full px-2 transition-colors ${activeBottomTab === "terminal" ? "text-primary-container border-b-2 border-primary-container" : "text-on-surface-variant/60 hover:text-on-surface"}`}>
            TERMINAL
          </button>
          <button 
            onClick={() => setActiveBottomTab("problems")}
            className={`font-status-label text-status-label h-full px-2 transition-colors flex items-center gap-1 ${activeBottomTab === "problems" ? "text-primary-container border-b-2 border-primary-container" : "text-on-surface-variant/60 hover:text-on-surface"}`}>
            PROBLEMS
            {consoleLogs.filter(l => l.type === "error").length > 0 && (
              <span className="bg-breakpoint-red text-white text-[9px] px-1 rounded-full">{consoleLogs.filter(l => l.type === "error").length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveBottomTab("watch")}
            className={`font-status-label text-status-label h-full px-2 transition-colors ${activeBottomTab === "watch" ? "text-primary-container border-b-2 border-primary-container" : "text-on-surface-variant/60 hover:text-on-surface"}`}>
            WATCH
          </button>
          
          <button 
            onClick={clearConsoleLogs}
            className="ml-auto text-on-surface-variant/40 hover:text-on-surface transition-colors"
            title="Clear Console"
          >
            <X size={14} />
          </button>
        </div>

        {/* Terminal Logs Display */}
        <div className="flex-1 overflow-y-auto p-4 font-code-editor text-[12px] text-on-surface-variant leading-relaxed custom-scrollbar selection:bg-primary-container/20">
          {activeBottomTab === "terminal" && (
            <>
              {consoleLogs.map((log, idx) => {
                let textColor = "text-on-surface-variant/80";
                if (log.type === "error") textColor = "text-breakpoint-red font-semibold";
                if (log.type === "success") textColor = "text-success-green font-semibold";
                
                return (
                  <div key={idx} className="flex gap-2 items-start py-0.5 border-b border-outline-variant/10">
                    <CornerDownRight size={10} className="mt-1.5 opacity-30 shrink-0 text-primary-container" />
                    <span className={textColor}>{log.text}</span>
                  </div>
                );
              })}
              
              {simulatorState === "idle" && (
                <div className="flex gap-2 items-center mt-2 text-primary-container animate-pulse">
                  <Play size={10} fill="currentColor" />
                  <span>Ready. Click run or step to begin simulation.</span>
                </div>
              )}
            </>
          )}

          {activeBottomTab === "problems" && (
            <>
              {consoleLogs.filter(l => l.type === "error").length === 0 ? (
                <div className="text-on-surface-variant/50 italic">No problems detected.</div>
              ) : (
                consoleLogs.filter(l => l.type === "error").map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start py-0.5 border-b border-outline-variant/10">
                    <X size={12} className="mt-1 shrink-0 text-breakpoint-red" />
                    <span className="text-breakpoint-red">{log.text}</span>
                  </div>
                ))
              )}
            </>
          )}

          {activeBottomTab === "watch" && (() => {
            const regABINames = [
              "zero","ra","sp","gp","tp","t0","t1","t2",
              "s0","s1","a0","a1","a2","a3","a4","a5",
              "a6","a7","s2","s3","s4","s5","s6","s7",
              "s8","s9","s10","s11","t3","t4","t5","t6"
            ];
            return (
              <div className="flex flex-col gap-3 w-full">
                {/* Metrics row */}
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30">
                    <span className="text-on-surface-variant/60 text-[10px] font-mono uppercase">PC</span>
                    <span className="font-mono text-primary-container text-[11px]">0x{pc.toString(16).toUpperCase().padStart(8,'0')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30">
                    <span className="text-on-surface-variant/60 text-[10px] font-mono uppercase">Cycle</span>
                    <span className="font-mono text-primary-container text-[11px]">{registers[0] !== undefined ? (Array.from(updatedRegisters).length > 0 || true ? baseSim.currentCycle : 0) : 0}</span>
                  </div>
                </div>
                {/* Register grid */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-1 overflow-y-auto" style={{maxHeight: "calc(100% - 48px)"}}>
                  {regABINames.map((name, i) => {
                    const val = registers[i] ?? 0;
                    const isUpdated = updatedRegisters.has(i);
                    return (
                      <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border transition-all ${isUpdated ? 'border-success-green/60 bg-success-green/5' : 'border-outline-variant/20 bg-surface-container/50'}`}>
                        <span className={`text-[9px] font-bold w-7 shrink-0 ${isUpdated ? 'text-success-green' : 'text-on-surface-variant/50'}`}>
                          x{i}
                        </span>
                        <span className={`text-[9px] w-8 shrink-0 ${isUpdated ? 'text-yellow-400' : 'text-on-surface-variant/40'}`}>
                          {name}
                        </span>
                        <span className={`text-[10px] ${isUpdated ? 'text-white' : 'text-on-surface-variant/70'}`}>
                          {(val >>> 0).toString(16).toUpperCase().padStart(8,'0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
