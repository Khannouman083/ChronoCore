import React, { useState, useRef, useCallback, useEffect } from "react";
import { useChronoStore, baseSim } from "../store";
import { ZoomIn, ZoomOut, RotateCcw, Settings } from "lucide-react";

// ─── Formatting Helpers ───────────────────────────────────────────────────────
const h8 = (n: number) => "0x" + (n >>> 0).toString(16).padStart(8, "0");
const bin = (n: number, bits = 5) => (n >>> 0).toString(2).padStart(bits, "0");

// ─── Value Flash Hook ─────────────────────────────────────────────────────────
function useFlashValue(value: any) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return { value, flash };
}

// ─── Path Routing (Orthogonal / Rectangular) ──────────────────────────────────
type Pt = { x: number; y: number };
const orthoPath = (source: Pt, target: Pt, waypoints?: Pt[]) => {
  if (waypoints && waypoints.length > 0) {
    let d = `M ${source.x},${source.y}`;
    for (const wp of waypoints) d += ` L ${wp.x},${wp.y}`;
    d += ` L ${target.x},${target.y}`;
    return d;
  }
  // Default step path (go right half way, then up/down, then right)
  if (target.x > source.x) {
    const midX = source.x + (target.x - source.x) / 2;
    return `M ${source.x},${source.y} L ${midX},${source.y} L ${midX},${target.y} L ${target.x},${target.y}`;
  } else {
    // Feedback loop (go up/down and around)
    const midY = source.y > target.y ? target.y - 40 : source.y + 100;
    return `M ${source.x},${source.y} L ${source.x + 20},${source.y} L ${source.x + 20},${midY} L ${target.x - 20},${midY} L ${target.x - 20},${target.y} L ${target.x},${target.y}`;
  }
};

// ─── Wire Component ───────────────────────────────────────────────────────────
interface WireProps {
  source: Pt;
  target: Pt;
  waypoints?: Pt[];
  active?: boolean;
  color?: string;
  dashed?: boolean;
  dataLabel?: string;
}
const Wire: React.FC<WireProps> = ({ source, target, waypoints, active, color = "#4b5563", dashed, dataLabel }) => {
  const strokeColor = active ? color : "#374151"; 
  const strokeWidth = active ? 2 : 1.5;
  const pathD = orthoPath(source, target, waypoints);
  
  // Calculate a good spot for the label (roughly middle of the path)
  // For standard step paths, the middle segment is vertical, so we put it near the first horizontal segment's end.
  const labelX = waypoints ? waypoints[0].x : (target.x > source.x ? source.x + (target.x - source.x)/2 : source.x + 20);
  const labelY = waypoints ? waypoints[0].y - 6 : source.y - 6;

  const arrowId = `arrow-${color.replace("#", "")}`;

  return (
    <g>
      {active && (
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={strokeWidth + 4} opacity={0.2} />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "5,5" : undefined}
        markerEnd={`url(#${arrowId})`}
      />
      {active && dataLabel && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect x={-2} y={-10} width={dataLabel.length * 5.5 + 4} height={14} fill="#0f172a" rx={2} opacity={0.8} />
          <text x={0} y={0} fill={color} fontSize={9} fontFamily="monospace" fontWeight="bold">{dataLabel}</text>
        </g>
      )}
    </g>
  );
};

// ─── Node Component ───────────────────────────────────────────────────────────
interface Port {
  id: string;
  label?: string;
  type: "in" | "out";
  fIdx: number;
  color?: string;
}

interface NodeProps {
  id: string;
  x: number;
  y: number;
  width?: number;
  title: string;
  fields: { label: string; value: string | number }[];
  inPorts: Port[];
  outPorts: Port[];
  active?: boolean;
}

const NodeBlock: React.FC<NodeProps> = ({ x, y, width = 160, title, fields, inPorts, outPorts, active }) => {
  const height = 40 + fields.length * 16 + Math.max(0, (Math.max(inPorts.length, outPorts.length) * 20 - fields.length * 16));
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Node Body - Dark Theme */}
      <rect x={0} y={0} width={width} height={height} rx={6} fill="#0f172a" stroke={active ? "#3b82f6" : "#1e293b"} strokeWidth={active ? 2 : 1.5} filter="url(#shadow)" />
      
      {/* Title */}
      <text x={12} y={22} fill="#f8fafc" fontSize={11} fontWeight="bold" fontFamily="Inter, sans-serif">{title}</text>

      {/* Fields */}
      {fields.map((f, i) => {
        const { flash } = useFlashValue(f.value);
        return (
          <g key={i} transform={`translate(12, ${44 + i * 16})`}>
            <text x={0} y={0} fill="#94a3b8" fontSize={9} fontFamily="monospace">{f.label}</text>
            <rect x={width - 26 - String(f.value).length * 5.5} y={-8} width={String(f.value).length * 5.5 + 4} height={12} fill={flash ? "#3b82f6" : "transparent"} opacity={0.3} rx={2} />
            <text x={width - 24} y={0} textAnchor="end" fill={flash ? "#ffffff" : "#cbd5e1"} fontSize={9} fontFamily="monospace" style={{ transition: "fill 0.3s" }}>{f.value}</text>
          </g>
        );
      })}

      {/* Input Ports */}
      {inPorts.map(p => (
        <g key={p.id} transform={`translate(0, ${40 + p.fIdx * 16})`}>
          <circle cx={0} cy={0} r={4} fill="#0f172a" stroke={p.color || "#4b5563"} strokeWidth={2} />
          <circle cx={0} cy={0} r={1.5} fill={p.color || "#4b5563"} />
          {p.label && <text x={8} y={3} fill="#64748b" fontSize={8} fontFamily="monospace">{p.label}</text>}
        </g>
      ))}

      {/* Output Ports */}
      {outPorts.map(p => (
        <g key={p.id} transform={`translate(${width}, ${40 + p.fIdx * 16})`}>
          <circle cx={0} cy={0} r={4} fill="#0f172a" stroke={p.color || "#10b981"} strokeWidth={2} />
          <circle cx={0} cy={0} r={1.5} fill={p.color || "#10b981"} />
          {p.label && <text x={-8} y={3} textAnchor="end" fill="#64748b" fontSize={8} fontFamily="monospace">{p.label}</text>}
        </g>
      ))}
    </g>
  );
};

// ─── Main Datapath Component ──────────────────────────────────────────────────
export const DatapathTab: React.FC = () => {
  const { pc, registers, controlSignals, simulatorState } = useChronoStore();
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 20, y: 50 });
  const dragging = useRef(false);
  const ds = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      // Diagram is approx 2000px wide. Leave some padding.
      setZoom(Math.max(0.2, Math.min(1, (width - 40) / 2000)));
    }
  }, []);

  const sim = baseSim;
  const inst = sim.readWord(pc);
  const opcode = inst & 0x7F;
  const rd = (inst >> 7) & 0x1F;
  const funct3 = (inst >> 12) & 0x7;
  const rs1 = (inst >> 15) & 0x1F;
  const rs2 = (inst >> 20) & 0x1F;
  
  // Extract immediates
  const immI = inst >> 20;
  const immS = ((inst >> 25) << 5) | ((inst >> 7) & 0x1F);
  const immB = (((inst >> 31) & 1) << 12) | (((inst >> 7) & 1) << 11) | (((inst >> 25) & 0x3F) << 5) | (((inst >> 8) & 0xF) << 1);
  const immJ = (((inst >> 31) & 1) << 20) | (((inst >> 12) & 0xFF) << 12) | (((inst >> 20) & 1) << 11) | (((inst >> 21) & 0x3FF) << 1);
  const isJal = opcode === 0x6F;
  const isJalr = opcode === 0x67;
  const isBranch = opcode === 0x63;
  const isStore = opcode === 0x23;

  const immGen = isStore ? immS : isBranch ? immB : isJal ? immJ : immI;
  const rs1Val = registers[rs1] ?? 0;
  const rs2Val = registers[rs2] ?? 0;
  const isActive = simulatorState !== "idle";

  const { RegWrite = 0, ALUSrc = 0, ALUOp = "ADD", MemRead = 0, MemWrite = 0, MemtoReg = 0, Branch = 0, Jump = 0 } = controlSignals as any;

  // ALU & Branch Logic
  const aluB = ALUSrc ? immGen : rs2Val;
  let aluRes = rs1Val + aluB;
  if (ALUOp === "SUB") aluRes = rs1Val - aluB;
  else if (ALUOp === "AND") aluRes = rs1Val & aluB;
  else if (ALUOp === "OR") aluRes = rs1Val | aluB;
  else if (ALUOp === "XOR") aluRes = rs1Val ^ aluB;
  else if (ALUOp === "SLT") aluRes = rs1Val < aluB ? 1 : 0;
  
  const aluZero = aluRes === 0 ? 1 : 0;
  const branchTarget = pc + ((immB << 19) >> 19);
  const jumpTarget = isJalr ? (rs1Val + immGen) & ~1 : pc + ((immJ << 11) >> 11);
  const bTaken = (Branch && aluZero) || Jump;
  const nextPc = bTaken ? (Jump && isJalr ? jumpTarget : branchTarget) : pc + 4;

  const memReadData = sim.readWord(aluRes);
  const wbData = MemtoReg ? memReadData : aluRes;

  // Component Positions (Orthogonal Layout)
  const lay = {
    ADD4: { x: 80, y: 50, w: 90 },
    PC: { x: 80, y: 200, w: 140 },
    IMEM: { x: 80, y: 400, w: 160 },
    
    ADD_BR: { x: 340, y: 100, w: 120 },
    IMM_GEN: { x: 340, y: 550, w: 140 },
    
    JUMP_CTRL: { x: 600, y: 40, w: 140 },
    MUX_PC: { x: 600, y: 220, w: 110 },
    CTRL: { x: 600, y: 400, w: 150 },
    
    REG: { x: 860, y: 260, w: 180 },
    ALU_CTRL: { x: 860, y: 580, w: 140 },
    
    MUX_ALU: { x: 1140, y: 400, w: 110 },
    ALU: { x: 1320, y: 280, w: 140 },
    
    DMEM: { x: 1540, y: 350, w: 160 },
    MUX_WB: { x: 1780, y: 350, w: 110 },
  };

  // Interaction handlers
  const onMD = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    ds.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);
  const onMM = useCallback((e: React.MouseEvent) => {
    if (dragging.current) setPan({ x: ds.current.px + e.clientX - ds.current.mx, y: ds.current.py + e.clientY - ds.current.my });
  }, []);
  const onMU = useCallback(() => { dragging.current = false; }, []);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const getPort = (nodeName: keyof typeof lay, portType: "in"|"out", fIdx: number) => {
    const n = lay[nodeName];
    return { x: portType === "in" ? n.x : n.x + n.w, y: n.y + 40 + fIdx * 16 };
  };

  // Colors for dark theme
  const C_DATA = "#00E5FF"; // cyan
  const C_CTRL = "#BD93F9"; // purple
  const C_ADDR = "#FFB86C"; // orange
  const C_BR = "#50FA7B";   // green

  const ArrowDefs = () => (
    <defs>
      {[C_DATA, C_CTRL, C_ADDR, C_BR].map(c => {
        const id = `arrow-${c.replace("#", "")}`;
        return (
          <marker key={id} id={id} markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={c} />
          </marker>
        );
      })}
    </defs>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#06090f] overflow-hidden select-none font-sans relative">
      {/* ── Toolbar ── */}
      <div className="absolute top-4 right-4 bg-[#0f172a] shadow-xl rounded-lg p-2 flex items-center gap-2 z-10 border border-[#1e293b]">
        <button onClick={() => setZoom(z => z + 0.1)} className="p-1.5 hover:bg-[#1e293b] rounded text-[#94a3b8] transition-colors"><ZoomIn size={18}/></button>
        <button onClick={() => setZoom(z => z - 0.1)} className="p-1.5 hover:bg-[#1e293b] rounded text-[#94a3b8] transition-colors"><ZoomOut size={18}/></button>
        <button onClick={() => { setZoom(0.85); setPan({x:50,y:50}); }} className="p-1.5 hover:bg-[#1e293b] rounded text-[#94a3b8] transition-colors"><RotateCcw size={18}/></button>
        <div className="w-px h-6 bg-[#1e293b] mx-1"></div>
        <button className="p-1.5 hover:bg-[#1e293b] rounded text-[#94a3b8] transition-colors"><Settings size={18}/></button>
      </div>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="flex-1 overflow-hidden" onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWheel} style={{ cursor: dragging.current ? "grabbing" : "grab" }}>
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: 3000, height: 1500 }}>
          <svg width={3000} height={1500} style={{ overflow: "visible" }}>
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1.5" fill="#1e293b" />
              </pattern>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.4" floodColor="#000" />
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <ArrowDefs />

            {/* ═══════════════════════════════════════════════════════════
                WIRES (Orthogonal Routing)
            ═══════════════════════════════════════════════════════════ */}
            
            {/* PC to IMEM (Address Bus) */}
            <Wire source={getPort("PC", "out", 0)} target={getPort("IMEM", "in", 0)} active={isActive} color={C_ADDR} dataLabel={h8(pc)}
              waypoints={[
                { x: 260, y: getPort("PC", "out", 0).y },
                { x: 260, y: getPort("IMEM", "in", 0).y }
              ]} />
            
            {/* PC to +4 Adder */}
            <Wire source={getPort("PC", "out", 0)} target={getPort("ADD4", "in", 0)} active={isActive} color={C_DATA} 
              waypoints={[
                { x: 260, y: getPort("PC", "out", 0).y },
                { x: 260, y: 30 },
                { x: 40, y: 30 },
                { x: 40, y: getPort("ADD4", "in", 0).y }
              ]} />
            
            {/* PC to Branch Adder */}
            <Wire source={getPort("PC", "out", 0)} target={getPort("ADD_BR", "in", 0)} active={isActive && (isBranch || isJal)} color={C_DATA} dataLabel={h8(pc)}
              waypoints={[
                { x: 260, y: getPort("PC", "out", 0).y },
                { x: 260, y: getPort("ADD_BR", "in", 0).y }
              ]} />
            
            {/* +4 to MUX_PC */}
            <Wire source={getPort("ADD4", "out", 0)} target={getPort("MUX_PC", "in", 0)} active={isActive && !bTaken} color={C_DATA} dataLabel={h8(pc+4)}
              waypoints={[
                { x: 500, y: getPort("ADD4", "out", 0).y },
                { x: 500, y: getPort("MUX_PC", "in", 0).y }
              ]} />
            
            {/* IMEM to IMM GEN */}
            <Wire source={getPort("IMEM", "out", 1)} target={getPort("IMM_GEN", "in", 0)} active={isActive} color={C_DATA} dataLabel={h8(inst)}
              waypoints={[
                { x: 280, y: getPort("IMEM", "out", 1).y },
                { x: 280, y: getPort("IMM_GEN", "in", 0).y }
              ]} />
              
            {/* IMEM to CTRL */}
            <Wire source={getPort("IMEM", "out", 1)} target={getPort("CTRL", "in", 0)} active={isActive} color={C_DATA}
              waypoints={[
                { x: 300, y: getPort("IMEM", "out", 1).y },
                { x: 300, y: getPort("CTRL", "in", 0).y }
              ]} />
              
            {/* IMEM to REG */}
            <Wire source={getPort("IMEM", "out", 1)} target={getPort("REG", "in", 0)} active={isActive} color={C_DATA}
              waypoints={[
                { x: 320, y: getPort("IMEM", "out", 1).y },
                { x: 320, y: 20 },
                { x: 800, y: 20 },
                { x: 800, y: getPort("REG", "in", 0).y }
              ]} />

            {/* IMM GEN to Branch Adder */}
            <Wire source={getPort("IMM_GEN", "out", 0)} target={getPort("ADD_BR", "in", 0)} active={isActive && (isBranch || isJal)} color={C_DATA} dataLabel={h8(immGen)}
              waypoints={[
                { x: 520, y: getPort("IMM_GEN", "out", 0).y },
                { x: 520, y: getPort("ADD_BR", "in", 0).y }
              ]} />
              
            {/* IMM GEN to ALU MUX */}
            <Wire source={getPort("IMM_GEN", "out", 0)} target={getPort("MUX_ALU", "in", 1)} active={isActive && ALUSrc === 1} color={C_DATA} dataLabel={h8(immGen)}
              waypoints={[
                { x: 540, y: getPort("IMM_GEN", "out", 0).y },
                { x: 540, y: 720 },
                { x: 1080, y: 720 },
                { x: 1080, y: getPort("MUX_ALU", "in", 1).y }
              ]} />

            {/* Branch Adder to MUX_PC */}
            <Wire source={getPort("ADD_BR", "out", 0)} target={getPort("MUX_PC", "in", 1)} active={isActive && bTaken} color={C_BR} dataLabel={h8(branchTarget)}
              waypoints={[
                { x: 560, y: getPort("ADD_BR", "out", 0).y },
                { x: 560, y: getPort("MUX_PC", "in", 1).y }
              ]} />

            {/* MUX_PC to PC (Feedback Loop) */}
            <Wire source={getPort("MUX_PC", "out", 0)} target={getPort("PC", "in", 1)} active={isActive} color={C_DATA} dataLabel={h8(nextPc)}
              waypoints={[
                { x: 730, y: getPort("MUX_PC", "out", 0).y },
                { x: 730, y: 10 },
                { x: 30, y: 10 },
                { x: 30, y: getPort("PC", "in", 1).y }
              ]} />

            {/* REG to ALU (A) */}
            <Wire source={getPort("REG", "out", 0)} target={getPort("ALU", "in", 0)} active={isActive} color={C_DATA} dataLabel={h8(rs1Val)}
              waypoints={[
                { x: 1060, y: getPort("REG", "out", 0).y },
                { x: 1060, y: getPort("ALU", "in", 0).y }
              ]} />
              
            {/* REG to ALU MUX (B) */}
            <Wire source={getPort("REG", "out", 1)} target={getPort("MUX_ALU", "in", 0)} active={isActive && ALUSrc === 0} color={C_DATA} dataLabel={h8(rs2Val)}
              waypoints={[
                { x: 1100, y: getPort("REG", "out", 1).y },
                { x: 1100, y: getPort("MUX_ALU", "in", 0).y }
              ]} />
              
            {/* REG to DMEM (Write Data) */}
            <Wire source={getPort("REG", "out", 1)} target={getPort("DMEM", "in", 1)} active={isActive && MemWrite === 1} color={C_DATA} dataLabel={h8(rs2Val)}
              waypoints={[
                { x: 1100, y: getPort("REG", "out", 1).y },
                { x: 1100, y: 520 },
                { x: 1480, y: 520 },
                { x: 1480, y: getPort("DMEM", "in", 1).y }
              ]} />

            {/* ALU MUX to ALU */}
            <Wire source={getPort("MUX_ALU", "out", 0)} target={getPort("ALU", "in", 1)} active={isActive} color={C_DATA} dataLabel={h8(aluB)}
              waypoints={[
                { x: 1280, y: getPort("MUX_ALU", "out", 0).y },
                { x: 1280, y: getPort("ALU", "in", 1).y }
              ]} />

            {/* ALU to DMEM */}
            <Wire source={getPort("ALU", "out", 2)} target={getPort("DMEM", "in", 0)} active={isActive && (MemRead===1 || MemWrite===1)} color={C_ADDR} dataLabel={h8(aluRes)}
              waypoints={[
                { x: 1500, y: getPort("ALU", "out", 2).y },
                { x: 1500, y: getPort("DMEM", "in", 0).y }
              ]} />
              
            {/* ALU to WB MUX */}
            <Wire source={getPort("ALU", "out", 2)} target={getPort("MUX_WB", "in", 0)} active={isActive && MemtoReg === 0} color={C_DATA} dataLabel={h8(aluRes)}
              waypoints={[
                { x: 1500, y: getPort("ALU", "out", 2).y },
                { x: 1500, y: 300 },
                { x: 1740, y: 300 },
                { x: 1740, y: getPort("MUX_WB", "in", 0).y }
              ]} />
            
            {/* DMEM to WB MUX */}
            <Wire source={getPort("DMEM", "out", 2)} target={getPort("MUX_WB", "in", 1)} active={isActive && MemtoReg === 1} color={C_DATA} dataLabel={h8(memReadData)}
              waypoints={[
                { x: 1720, y: getPort("DMEM", "out", 2).y },
                { x: 1720, y: getPort("MUX_WB", "in", 1).y }
              ]} />
            
            {/* WB MUX to REG (Write Back Feedback Loop) */}
            <Wire source={getPort("MUX_WB", "out", 0)} target={getPort("REG", "in", 2)} active={isActive && RegWrite === 1} color={C_DATA} dataLabel={h8(wbData)}
              waypoints={[
                { x: 1920, y: getPort("MUX_WB", "out", 0).y },
                { x: 1920, y: 760 },
                { x: 820, y: 760 },
                { x: 820, y: getPort("REG", "in", 2).y }
              ]} />

            {/* CTRL Signals (Dashed) */}
            <Wire source={getPort("CTRL", "out", 1)} target={getPort("MUX_PC", "in", 2)} active={isActive && Branch===1} color={C_CTRL} dashed dataLabel="Branch"
              waypoints={[{ x: 780, y: getPort("CTRL", "out", 1).y }, { x: 780, y: 190 }, { x: 580, y: 190 }, { x: 580, y: getPort("MUX_PC", "in", 2).y }]} />
              
            <Wire source={getPort("CTRL", "out", 3)} target={getPort("MUX_WB", "in", 2)} active={isActive && MemtoReg===1} color={C_CTRL} dashed dataLabel="MemtoReg"
              waypoints={[{ x: 780, y: getPort("CTRL", "out", 3).y }, { x: 780, y: 740 }, { x: 1760, y: 740 }, { x: 1760, y: getPort("MUX_WB", "in", 2).y }]} />
              
            <Wire source={getPort("CTRL", "out", 5)} target={getPort("DMEM", "in", 4)} active={isActive && MemWrite===1} color={C_CTRL} dashed dataLabel="MemWrite"
              waypoints={[{ x: 790, y: getPort("CTRL", "out", 5).y }, { x: 790, y: 220 }, { x: 1520, y: 220 }, { x: 1520, y: getPort("DMEM", "in", 4).y }]} />
              
            <Wire source={getPort("CTRL", "out", 2)} target={getPort("DMEM", "in", 3)} active={isActive && MemRead===1} color={C_CTRL} dashed dataLabel="MemRead"
              waypoints={[{ x: 790, y: getPort("CTRL", "out", 2).y }, { x: 790, y: 220 }, { x: 1520, y: 220 }, { x: 1520, y: getPort("DMEM", "in", 3).y }]} />
              
            <Wire source={getPort("CTRL", "out", 6)} target={getPort("MUX_ALU", "in", 2)} active={isActive && ALUSrc===1} color={C_CTRL} dashed dataLabel="ALUSrc"
              waypoints={[{ x: 800, y: getPort("CTRL", "out", 6).y }, { x: 800, y: 700 }, { x: 1120, y: 700 }, { x: 1120, y: getPort("MUX_ALU", "in", 2).y }]} />
              
            <Wire source={getPort("CTRL", "out", 4)} target={getPort("ALU_CTRL", "in", 0)} active={isActive} color={C_CTRL} dashed dataLabel="ALUOp"
              waypoints={[{ x: 810, y: getPort("CTRL", "out", 4).y }, { x: 810, y: getPort("ALU_CTRL", "in", 0).y }]} />
              
            <Wire source={getPort("CTRL", "out", 7)} target={getPort("REG", "in", 3)} active={isActive && RegWrite===1} color={C_CTRL} dashed dataLabel="RegWrite"
              waypoints={[{ x: 820, y: getPort("CTRL", "out", 7).y }, { x: 820, y: getPort("REG", "in", 3).y }]} />
            
            {/* ALU CTRL to ALU */}
            <Wire source={getPort("ALU_CTRL", "out", 2)} target={getPort("ALU", "in", 4)} active={isActive} color={C_CTRL} dashed dataLabel={ALUOp}
              waypoints={[{ x: 1040, y: getPort("ALU_CTRL", "out", 2).y }, { x: 1040, y: 200 }, { x: 1300, y: 200 }, { x: 1300, y: getPort("ALU", "in", 4).y }]} />


            {/* ═══════════════════════════════════════════════════════════
                NODES
            ═══════════════════════════════════════════════════════════ */}
            <NodeBlock {...lay.ADD4} id="add4" title="+ 4" active={isActive}
              fields={[{ label: "Input:", value: "4" }]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.PC} id="pc" title="PC" active={isActive}
              fields={[
                { label: "Current:", value: h8(pc) },
                { label: "Next:", value: h8(nextPc) },
                { label: "PCWrite:", value: "1" }
              ]}
              inPorts={[{ id: "i1", fIdx: 1, type: "in", color: C_DATA }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_ADDR }]}
            />

            <NodeBlock {...lay.IMEM} id="imem" title="Instruction Memory" active={isActive}
              fields={[
                { label: "Address:", value: h8(pc) },
                { label: "Output:", value: h8(inst) },
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_ADDR }]}
              outPorts={[
                { id: "o1", fIdx: 1, type: "out", color: C_DATA }
              ]}
            />

            <NodeBlock {...lay.ADD_BR} id="add_br" title="Branch Adder" active={isActive && (isBranch || isJal)}
              fields={[{ label: "Target:", value: h8(branchTarget) }]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_BR }]}
            />

            <NodeBlock {...lay.IMM_GEN} id="imm" title="Immediate Gen" active={isActive}
              fields={[{ label: "Immediate:", value: h8(immGen) }]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.JUMP_CTRL} id="jc" title="Jump Control" active={isActive && (isBranch || isJal || isJalr)}
              fields={[
                { label: "Zero:", value: aluZero },
                { label: "Jump:", value: Jump }
              ]}
              inPorts={[]}
              outPorts={[]}
            />

            <NodeBlock {...lay.MUX_PC} id="mux_pc" title="MUX (PC Src)" active={isActive}
              fields={[
                { label: "In 0:", value: h8(pc+4).slice(-4) },
                { label: "In 1:", value: h8(branchTarget).slice(-4) },
                { label: "Sel:", value: bTaken ? "1" : "0" }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }, { id: "i2", fIdx: 1, type: "in", color: C_DATA }, { id: "c1", fIdx: 2, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.CTRL} id="ctrl" title="Control Unit" active={isActive}
              fields={[
                { label: "Opcode:", value: bin(opcode, 7) },
                { label: "Branch:", value: Branch },
                { label: "MemRead:", value: MemRead },
                { label: "MemtoReg:", value: MemtoReg },
                { label: "ALUOp:", value: ALUOp },
                { label: "MemWrite:", value: MemWrite },
                { label: "ALUSrc:", value: ALUSrc },
                { label: "RegWrite:", value: RegWrite }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }]}
              outPorts={Array.from({length:8}).map((_,i) => ({ id: `o${i}`, fIdx: i, type: "out", color: C_CTRL }))}
            />

            <NodeBlock {...lay.REG} id="reg" title="Register File" active={isActive}
              fields={[
                { label: `R1 (x${rs1}):`, value: h8(rs1Val) },
                { label: `R2 (x${rs2}):`, value: h8(rs2Val) },
                { label: `WR (x${rd}):`, value: RegWrite ? h8(wbData) : "-" },
                { label: "RegWrite:", value: RegWrite }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }, { id: "i2", fIdx: 2, type: "in", color: C_DATA }, { id: "c1", fIdx: 3, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }, { id: "o2", fIdx: 1, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.ALU_CTRL} id="alu_ctrl" title="ALU Control" active={isActive}
              fields={[
                { label: "ALUOp:", value: ALUOp },
                { label: "Funct3:", value: bin(funct3, 3) },
                { label: "Control:", value: ALUOp }
              ]}
              inPorts={[{ id: "c1", fIdx: 0, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 2, type: "out", color: C_CTRL }]}
            />

            <NodeBlock {...lay.MUX_ALU} id="mux_alu" title="MUX (ALU Src)" active={isActive}
              fields={[
                { label: "In 0:", value: h8(rs2Val).slice(-4) },
                { label: "In 1:", value: h8(immGen).slice(-4) },
                { label: "Sel:", value: ALUSrc }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }, { id: "i2", fIdx: 1, type: "in", color: C_DATA }, { id: "c1", fIdx: 2, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.ALU} id="alu" title="ALU" active={isActive}
              fields={[
                { label: "A:", value: h8(rs1Val).slice(-4) },
                { label: "B:", value: h8(aluB).slice(-4) },
                { label: "Result:", value: h8(aluRes) },
                { label: "Zero:", value: aluZero },
                { label: "Control:", value: ALUOp }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }, { id: "i2", fIdx: 1, type: "in", color: C_DATA }, { id: "c1", fIdx: 4, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 2, type: "out", color: C_ADDR }, { id: "o2", fIdx: 3, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.DMEM} id="dmem" title="Data Memory" active={isActive && (MemRead===1 || MemWrite===1)}
              fields={[
                { label: "Address:", value: h8(aluRes) },
                { label: "WriteData:", value: h8(rs2Val) },
                { label: "ReadData:", value: h8(memReadData) },
                { label: "MemRead:", value: MemRead },
                { label: "MemWrite:", value: MemWrite }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_ADDR }, { id: "i2", fIdx: 1, type: "in", color: C_DATA }, { id: "c1", fIdx: 3, type: "in", color: C_CTRL }, { id: "c2", fIdx: 4, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 2, type: "out", color: C_DATA }]}
            />

            <NodeBlock {...lay.MUX_WB} id="mux_wb" title="MUX (MemToReg)" active={isActive}
              fields={[
                { label: "In 0:", value: h8(aluRes).slice(-4) },
                { label: "In 1:", value: h8(memReadData).slice(-4) },
                { label: "Sel:", value: MemtoReg }
              ]}
              inPorts={[{ id: "i1", fIdx: 0, type: "in", color: C_DATA }, { id: "i2", fIdx: 1, type: "in", color: C_DATA }, { id: "c1", fIdx: 2, type: "in", color: C_CTRL }]}
              outPorts={[{ id: "o1", fIdx: 0, type: "out", color: C_DATA }]}
            />

          </svg>
        </div>
      </div>
    </div>
  );
};
