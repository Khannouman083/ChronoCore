import React, { useState } from "react";
import { useChronoStore, baseSim } from "../store";
import { Search, FileText, Database, Layers } from "lucide-react";

export const MemoryTab: React.FC = () => {
  const { memoryVersion, pc } = useChronoStore();
  const [searchAddrStr, setSearchAddrStr] = useState("");
  const [format, setFormat] = useState<"hex" | "dec" | "bin">("hex");
  const [jumpedAddr, setJumpedAddr] = useState<number | null>(null);
  const [visibleSegment, setVisibleSegment] = useState<"text" | "data" | "stack">("text");

  const sim = baseSim;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clean = searchAddrStr.trim().toLowerCase();
      let addr = 0;
      if (clean.startsWith("0x")) {
        addr = parseInt(clean, 16);
      } else {
        addr = parseInt(clean, 10);
      }
      
      if (!isNaN(addr)) {
        // Align to 16 bytes
        setJumpedAddr(addr - (addr % 16));
      }
    } catch {
      // Ignore invalid search
    }
  };

  const getFormattedWord = (word: number): string => {
    switch (format) {
      case "dec":
        return word.toString(10);
      case "bin":
        return (word >>> 0).toString(2).padStart(32, "0");
      case "hex":
      default:
        return (word >>> 0).toString(16).toUpperCase().padStart(8, "0");
    }
  };

  const getRowAscii = (addr: number): string => {
    let result = "";
    for (let i = 0; i < 16; i++) {
      const b = sim.readByte(addr + i);
      if (b >= 32 && b <= 126) {
        result += String.fromCharCode(b);
      } else {
        result += ".";
      }
    }
    return result;
  };

  // Helper to render a segment table
  const renderSegmentTable = (start: number, end: number) => {
    const rows = [];
    // Render 8 rows around jumped address if it falls in range, otherwise first 8 rows
    let renderStart = start;
    if (jumpedAddr !== null && jumpedAddr >= start && jumpedAddr < end) {
      renderStart = Math.max(start, jumpedAddr - 32);
    }
    
    // Limit to 10 rows to fit layout nicely
    const limit = Math.min(end, renderStart + 16 * 10);

    for (let addr = renderStart; addr < limit; addr += 16) {
      const w0 = sim.readWord(addr);
      const w1 = sim.readWord(addr + 4);
      const w2 = sim.readWord(addr + 8);
      const w3 = sim.readWord(addr + 12);
      
      const isPcRow = pc >= addr && pc < addr + 16;
      const isJumpTarget = jumpedAddr === addr;

      rows.push(
        <tr 
          key={addr} 
          className={`border-b border-outline-variant/10 hover:bg-surface-container/60 transition-colors group ${
            isPcRow ? "bg-primary-container/5 border-l-2 border-l-primary-container" : ""
          } ${isJumpTarget ? "bg-success-green/5 border-l-2 border-l-success-green" : ""}`}
        >
          <td className={`py-2.5 px-4 border-r border-outline-variant/20 font-bold select-none ${
            isPcRow ? "text-primary-container font-extrabold" : "text-outline/70"
          }`}>
            0x{addr.toString(16).toUpperCase().padStart(8, "0")}
          </td>
          
          <td className="py-2.5 px-4 font-mono">
            <div className="flex gap-4 flex-wrap">
              <span className={`transition-colors ${isPcRow && pc === addr ? "text-primary-container font-bold" : "text-on-surface-variant group-hover:text-primary-container"}`}>
                {getFormattedWord(w0)}
              </span>
              <span className={`transition-colors ${isPcRow && pc === addr + 4 ? "text-primary-container font-bold" : "text-on-surface-variant group-hover:text-primary-container"}`}>
                {getFormattedWord(w1)}
              </span>
              <span className={`transition-colors ${isPcRow && pc === addr + 8 ? "text-primary-container font-bold" : "text-on-surface-variant group-hover:text-primary-container"}`}>
                {getFormattedWord(w2)}
              </span>
              <span className={`transition-colors ${isPcRow && pc === addr + 12 ? "text-primary-container font-bold" : "text-on-surface-variant group-hover:text-primary-container"}`}>
                {getFormattedWord(w3)}
              </span>
            </div>
          </td>
          
          <td className="py-2.5 px-4 text-on-surface-variant/40 font-mono text-[11px] select-none tracking-widest">
            {getRowAscii(addr)}
          </td>
        </tr>
      );
    }

    return (
      <div className="border border-outline-variant/30 rounded-lg bg-surface-container-lowest overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse font-data-hex text-[12px] min-w-[600px]">
          <thead className="bg-surface-container-high text-on-surface-variant/70 select-none">
            <tr className="border-b border-outline-variant/20">
              <th className="py-2 px-4 border-r border-outline-variant/20 w-32">Address</th>
              <th className="py-2 px-4">Values (+0, +4, +8, +C)</th>
              <th className="py-2 px-4 w-40">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div key={memoryVersion} className="flex-1 overflow-hidden flex flex-col bg-background h-full">
      {/* Contextual Toolbar */}
      <div className="min-h-12 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-y-2 px-3 md:px-6 py-2 bg-surface-container-lowest select-none">
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          {/* Jump to address */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <span className="font-status-label text-[10px] text-outline uppercase tracking-wider font-bold hidden sm:block">
              Jump to Address
            </span>
            <div className="relative">
              <input 
                className="bg-surface-container-low border-b border-outline focus:border-primary-container focus:outline-none px-2 py-1 font-data-hex text-data-hex text-primary-container w-28 md:w-36 transition-all rounded-sm text-[12px]" 
                placeholder="0x10010000" 
                type="text"
                value={searchAddrStr}
                onChange={(e) => setSearchAddrStr(e.target.value)}
              />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 text-outline hover:text-primary-container transition-colors">
                <Search size={12} />
              </button>
            </div>
          </form>
          
          <div className="h-6 w-px bg-outline-variant/30 hidden sm:block"></div>

          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="font-status-label text-[10px] text-outline uppercase tracking-wider font-bold hidden sm:block">
              Format
            </span>
            <select 
              className="bg-transparent border-none font-nav-item text-nav-item text-on-surface focus:ring-0 cursor-pointer text-[13px] font-semibold"
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <option value="hex" className="bg-surface-container-high">Hex</option>
              <option value="dec" className="bg-surface-container-high">Dec</option>
              <option value="bin" className="bg-surface-container-high">Bin</option>
            </select>
          </div>

          <div className="h-6 w-px bg-outline-variant/30 hidden sm:block"></div>

          {/* Segment selection buttons */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-md border border-outline-variant/20">
            <button
              onClick={() => setVisibleSegment("text")}
              className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${visibleSegment === "text" ? "bg-primary-container text-on-primary-container" : "text-outline hover:text-on-surface"}`}
            >
              .text
            </button>
            <button
              onClick={() => setVisibleSegment("data")}
              className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${visibleSegment === "data" ? "bg-hazard-orange text-black" : "text-outline hover:text-on-surface"}`}
            >
              .data
            </button>
            <button
              onClick={() => setVisibleSegment("stack")}
              className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${visibleSegment === "stack" ? "bg-success-green text-black" : "text-outline hover:text-on-surface"}`}
            >
              Stack
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-green animate-pulse"></div>
            <span className="font-status-label text-[10px] text-success-green font-bold">SYNCED</span>
          </div>
        </div>
      </div>

      {/* Memory Grid View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6">
        <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
          
          {/* Text Memory Section */}
          {visibleSegment === "text" && (
            <section>
              <div className="flex items-center justify-between mb-3 select-none">
                <h2 className="font-headline-sm text-sm text-on-surface flex items-center gap-2 font-bold uppercase tracking-wider">
                  <FileText size={16} className="text-primary-container" />
                  Text Segment (.text)
                </h2>
                <span className="font-status-label text-[10px] text-outline">Range: 0x00400000 - 0x00400FFF</span>
              </div>
              {renderSegmentTable(0x00400000, 0x00401000)}
            </section>
          )}

          {/* Data Memory Section */}
          {visibleSegment === "data" && (
            <section>
              <div className="flex items-center justify-between mb-3 select-none">
                <h2 className="font-headline-sm text-sm text-on-surface flex items-center gap-2 font-bold uppercase tracking-wider">
                  <Database size={16} className="text-hazard-orange" />
                  Data Segment (.data)
                </h2>
                <span className="font-status-label text-[10px] text-outline">Range: 0x10010000 - 0x1001FFFF</span>
              </div>
              {renderSegmentTable(0x10010000, 0x10020000)}
            </section>
          )}

          {/* Stack Section */}
          {visibleSegment === "stack" && (
            <section>
              <div className="flex items-center justify-between mb-3 select-none">
                <h2 className="font-headline-sm text-sm text-on-surface flex items-center gap-2 font-bold uppercase tracking-wider">
                  <Layers size={16} className="text-success-green" />
                  Stack Segment
                </h2>
                <span className="font-status-label text-[10px] text-outline">Range: 0x7FFFFFFF (Descending)</span>
              </div>
              {renderSegmentTable(0x7FFF0000, 0x80000000)}
            </section>
          )}

        </div>
      </div>
    </div>
  );
};
