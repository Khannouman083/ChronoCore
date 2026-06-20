import React, { useEffect, useRef } from "react";
import { useChronoStore } from "./store";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { Footer } from "./components/Footer";
import { EditorTab } from "./components/EditorTab";
import { CpuStateTab } from "./components/CpuStateTab";
import { MemoryTab } from "./components/MemoryTab";
import { DatapathTab } from "./components/DatapathTab";
import { PipelineTab } from "./components/PipelineTab";
import { ProcessorTab } from "./components/ProcessorTab";
import { 
  Play, 
  BookOpen, 
  Activity, 
  GitBranch, 
  Database, 
  Sliders,
  Terminal,
  Cpu,
  History,
  Sparkles,
  MessageSquare,
  Globe,
  Code,
  ShieldCheck
} from "lucide-react";

const App: React.FC = () => {
  const { 
    isLandingPage, 
    setLandingPage, 
    activeTab, 
    compileAndLoad 
  } = useChronoStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compile and load default program on mount
  useEffect(() => {
    compileAndLoad();
  }, []);

  // Chip substrate/circuit grid animated canvas background
  useEffect(() => {
    if (!isLandingPage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface Trace {
      points: { x: number; y: number }[];
      pulses: { progress: number; speed: number; size: number; color: string }[];
      width: number;
    }

    const traces: Trace[] = [];

    const getPointOnPath = (points: { x: number; y: number }[], progress: number) => {
      if (points.length < 2) return { x: 0, y: 0 };
      const lengths: number[] = [];
      let totalLength = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        lengths.push(len);
        totalLength += len;
      }

      if (totalLength === 0) return points[0];

      const targetDist = progress * totalLength;
      let accumulatedDist = 0;

      for (let i = 0; i < lengths.length; i++) {
        if (accumulatedDist + lengths[i] >= targetDist) {
          const segProgress = (targetDist - accumulatedDist) / lengths[i];
          const start = points[i];
          const end = points[i + 1];
          return {
            x: start.x + (end.x - start.x) * segProgress,
            y: start.y + (end.y - start.y) * segProgress,
          };
        }
        accumulatedDist += lengths[i];
      }
      return points[points.length - 1];
    };

    const generateTraces = () => {
      traces.length = 0;
      const gridSize = 50;
      const cols = Math.ceil(width / gridSize);
      const rows = Math.ceil(height / gridSize);

      const count = Math.min(30, Math.max(12, Math.floor((width * height) / 50000)));
      for (let i = 0; i < count; i++) {
        const startCol = Math.floor(Math.random() * (cols - 2)) + 1;
        const startRow = Math.floor(Math.random() * (rows - 2)) + 1;
        const startX = startCol * gridSize;
        const startY = startRow * gridSize;

        const points = [{ x: startX, y: startY }];
        let currX = startX;
        let currY = startY;

        const segments = Math.floor(Math.random() * 2) + 2; // 2 or 3 segments
        let lastDir = Math.random() > 0.5 ? "H" : "V";

        for (let s = 0; s < segments; s++) {
          const len = (Math.floor(Math.random() * 3) + 2) * gridSize;
          if (lastDir === "H") {
            const dirX = Math.random() > 0.5 ? 1 : -1;
            currX += dirX * len;
            lastDir = "V";
          } else {
            const dirY = Math.random() > 0.5 ? 1 : -1;
            currY += dirY * len;
            lastDir = "H";
          }
          currX = Math.max(gridSize, Math.min(width - gridSize, currX));
          currY = Math.max(gridSize, Math.min(height - gridSize, currY));
          points.push({ x: currX, y: currY });
        }

        const pulsesList = [];
        const pulseCount = Math.floor(Math.random() * 2) + 1;
        for (let p = 0; p < pulseCount; p++) {
          pulsesList.push({
            progress: Math.random(),
            speed: 0.001 + Math.random() * 0.0015,
            size: Math.random() * 1.5 + 1.2,
            color: Math.random() > 0.5 ? "#00e5ff" : (Math.random() > 0.4 ? "#00e87a" : "#FF6D00"),
          });
        }

        traces.push({
          points,
          pulses: pulsesList,
          width: Math.random() > 0.75 ? 1.5 : 0.8,
        });
      }
    };

    generateTraces();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      generateTraces();
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      // Sleek background with trail effect
      ctx.fillStyle = "rgba(15, 19, 28, 0.15)";
      ctx.fillRect(0, 0, width, height);

      // Draw light substrate grid
      ctx.strokeStyle = "rgba(132, 147, 150, 0.012)";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw subtle CPU package shape in center
      const chipSize = Math.min(300, width * 0.7);
      const cx = width / 2;
      const cy = height / 2;
      
      ctx.strokeStyle = "rgba(0, 229, 255, 0.03)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.015)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - chipSize / 2 - 12, cy - chipSize / 2 - 12, chipSize + 24, chipSize + 24);

      // Draw CPU pins
      const pinCount = 10;
      const pinSpacing = chipSize / (pinCount + 1);
      ctx.fillStyle = "rgba(132, 147, 150, 0.04)";
      for (let p = 1; p <= pinCount; p++) {
        const offset = -chipSize / 2 + p * pinSpacing;
        ctx.fillRect(cx + offset - 2, cy - chipSize / 2 - 6, 4, 6);
        ctx.fillRect(cx + offset - 2, cy + chipSize / 2, 4, 6);
        ctx.fillRect(cx - chipSize / 2 - 6, cy + offset - 2, 6, 4);
        ctx.fillRect(cx + chipSize / 2, cy + offset - 2, 6, 4);
      }

      // Draw traces and their pulsing signals
      traces.forEach((trace) => {
        // Draw copper trace line
        ctx.beginPath();
        ctx.moveTo(trace.points[0].x, trace.points[0].y);
        for (let i = 1; i < trace.points.length; i++) {
          ctx.lineTo(trace.points[i].x, trace.points[i].y);
        }
        ctx.strokeStyle = "rgba(59, 73, 76, 0.12)";
        ctx.lineWidth = trace.width;
        ctx.stroke();

        // Draw start junction pad
        ctx.beginPath();
        ctx.arc(trace.points[0].x, trace.points[0].y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 73, 76, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
        ctx.stroke();

        // Draw end junction pad
        const lastPt = trace.points[trace.points.length - 1];
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 73, 76, 0.3)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
        ctx.stroke();

        // Update and draw pulses
        trace.pulses.forEach((pulse) => {
          pulse.progress += pulse.speed;
          if (pulse.progress > 1) {
            pulse.progress = 0;
            pulse.color = Math.random() > 0.5 ? "#00e5ff" : (Math.random() > 0.4 ? "#00e87a" : "#FF6D00");
          }

          const pos = getPointOnPath(trace.points, pulse.progress);

          // Render glowing pulse tail
          ctx.beginPath();
          const tailCount = 6;
          for (let t = 0; t < tailCount; t++) {
            const tailProgress = Math.max(0, pulse.progress - t * 0.007);
            const tailPos = getPointOnPath(trace.points, tailProgress);
            const alpha = (1 - t / tailCount) * 0.5;
            ctx.strokeStyle = pulse.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = pulse.size;
            if (t === 0) {
              ctx.moveTo(tailPos.x, tailPos.y);
            } else {
              ctx.lineTo(tailPos.x, tailPos.y);
            }
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Draw head dot
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulse.size, 0, Math.PI * 2);
          ctx.fillStyle = pulse.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = pulse.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isLandingPage]);

  if (isLandingPage) {
    return (
      <div className="bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container relative">
        <Header />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-header-height overflow-hidden select-none">
          <div className="absolute inset-0 w-full h-full pointer-events-none -z-20">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,19,28,0.95)_100%)] pointer-events-none -z-10"></div>
          
          <div className="relative z-10 text-center max-w-4xl px-6 md:px-4 flex flex-col items-center mt-12">
            <h1 className="font-headline-lg text-5xl sm:text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white to-secondary font-bold mb-4 tracking-tight fade-in-up text-glow">
              ChronoCore
            </h1>
            <p className="font-headline-sm text-lg sm:text-xl md:text-2xl text-primary-container mb-6 fade-in-up delay-100 drop-shadow-md">
              The Ultimate Time-Travel Debugger for RISC-V.
            </p>
            <p className="text-on-surface-variant max-w-2xl mx-auto mb-10 text-base md:text-lg fade-in-up delay-200">
              Visualize every cycle, trace every register, and debug complex pipelines with cycle-accurate timing and dynamic hazard resolution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up delay-300 mb-16">
              <button 
                onClick={() => setLandingPage(false)}
                className="bg-primary-container text-terminal-black font-nav-item text-nav-item px-8 py-3 rounded-full font-bold hover:bg-primary transition-all duration-300 glow-hover flex items-center gap-2 justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] animate-pulse"
              >
                <Play size={16} fill="currentColor" /> Launch Simulator
              </button>
              <a 
                href="#features" 
                className="border border-outline text-on-surface bg-surface/50 backdrop-blur-sm font-nav-item text-nav-item px-8 py-3 rounded-full font-semibold hover:bg-surface-variant transition-colors duration-200 flex items-center gap-2 justify-center"
              >
                <BookOpen size={16} /> Read Docs
              </a>
            </div>

            {/* Live System Status */}
            <div className="hidden md:flex flex-wrap justify-center gap-6 fade-in-up delay-300 bg-surface-container-high/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-8 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success-green animate-pulse shadow-[0_0_8px_rgba(0,232,122,0.6)]"></div>
                <span className="font-status-label text-[10px] text-on-surface-variant">
                  ACTIVE CORE: <span className="text-on-surface">RV32I</span>
                </span>
              </div>
              <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-6">
                <Activity size={12} className="text-on-surface-variant" />
                <span className="font-status-label text-[10px] text-on-surface-variant">
                  LATENCY: <span className="text-on-surface">14ms</span>
                </span>
              </div>
              <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-6">
                <span className="font-status-label text-[10px] text-on-surface-variant">
                  STATUS: <span className="text-success-green font-bold">ONLINE</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-28 bg-surface-container-low border-t border-outline-variant/40 relative overflow-hidden select-none">
          <div className="absolute inset-0 scanlines pointer-events-none z-0"></div>
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
            <div className="text-center mb-20">
              <span className="font-status-label text-[11px] tracking-widest text-primary-container uppercase bg-surface-container-high/50 px-4 py-1.5 rounded-full border border-outline-variant/30">Instrumentation Core</span>
              <h2 className="font-headline-lg text-4xl md:text-5xl text-on-surface font-bold mt-4 mb-3">Precision Instrumentation</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-base">Built for computer architects who demand micro-level visibility and precise register tracking.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-surface border border-outline-variant/40 p-8 rounded-2xl hover:border-primary-container hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] transition-all duration-300 group flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mb-6 border border-outline-variant group-hover:border-primary-container shrink-0 transition-colors">
                  <GitBranch className="text-primary-container text-xl" />
                </div>
                <h3 className="font-headline-sm text-lg text-on-surface mb-3 font-semibold group-hover:text-primary-container transition-colors">Pipeline Visualization</h3>
                <p className="text-on-surface-variant font-code-editor text-[12px] leading-relaxed mb-6">
                  Track instructions through Fetch, Decode, Execute, Memory, and Writeback stages with cycle-accurate timing and dynamic stall resolution.
                </p>
                <ul className="mt-auto space-y-2.5 text-[11px] text-on-surface-variant font-status-label select-none">
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Visual hazard detection</li>
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Forwarding path highlights</li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-surface border border-outline-variant/40 p-8 rounded-2xl hover:border-primary-container hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] transition-all duration-300 group flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-success-green/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mb-6 border border-outline-variant group-hover:border-primary-container shrink-0 transition-colors">
                  <Database className="text-primary-container text-xl" />
                </div>
                <h3 className="font-headline-sm text-lg text-on-surface mb-3 font-semibold group-hover:text-primary-container transition-colors">Memory Tracing</h3>
                <p className="text-on-surface-variant font-code-editor text-[12px] leading-relaxed mb-6">
                  Inspect raw hexdumps, monitor memory-mapped I/O, watch addresses, and trace stack values in Hex, Decimal, or Binary base configurations.
                </p>
                <ul className="mt-auto space-y-2.5 text-[11px] text-on-surface-variant font-status-label select-none">
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Jump to address search</li>
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Live memory synchronization</li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="bg-surface border border-outline-variant/40 p-8 rounded-2xl hover:border-primary-container hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] transition-all duration-300 group flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-hazard-orange/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center mb-6 border border-outline-variant group-hover:border-primary-container shrink-0 transition-colors">
                  <Sliders className="text-primary-container text-xl" />
                </div>
                <h3 className="font-headline-sm text-lg text-on-surface mb-3 font-semibold group-hover:text-primary-container transition-colors">Time-Travel Debugging</h3>
                <p className="text-on-surface-variant font-code-editor text-[12px] leading-relaxed mb-6">
                  Reverse execution at any clock step! Pop states back to undo registers, memory changes, and visual datapaths instantly.
                </p>
                <ul className="mt-auto space-y-2.5 text-[11px] text-on-surface-variant font-status-label select-none">
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Cycle state histories</li>
                  <li className="flex items-center gap-2"><span className="text-success-green">✓</span> Forward & Backward stepping</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (Guide) Section */}
        <section id="guide" className="py-28 bg-surface border-t border-outline-variant/40 relative overflow-hidden select-none">
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
            <div className="text-center mb-20">
              <span className="font-status-label text-[11px] tracking-widest text-success-green uppercase bg-success-green/10 px-4 py-1.5 rounded-full border border-success-green/20">Execution Guide</span>
              <h2 className="font-headline-lg text-4xl md:text-5xl text-on-surface font-bold mt-4 mb-3">How ChronoCore Works</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-base">Write, compile, execute, and step backward using our core execution sequence.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Steps */}
              <div className="lg:col-span-5 space-y-8">
                {/* Step 1 */}
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/50 flex items-center justify-center font-status-label text-[14px] text-primary-container font-bold shrink-0 group-hover:border-primary-container transition-all">
                    01
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-bold mb-1.5 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Code size={16} className="text-primary-container" />
                      Write Assembly
                    </h3>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed">
                      Use our custom editor to write standard RV32IM assembly with labels and memory directives. Supports real-time error logs and watch registers.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/50 flex items-center justify-center font-status-label text-[14px] text-primary-container font-bold shrink-0 group-hover:border-primary-container transition-all">
                    02
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-bold mb-1.5 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Terminal size={16} className="text-primary-container" />
                      Compile &amp; Load
                    </h3>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed">
                      Assemble the instructions on-the-fly. The custom compiler generates machine binary code and loads it directly into instruction memory addresses.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/50 flex items-center justify-center font-status-label text-[14px] text-primary-container font-bold shrink-0 group-hover:border-primary-container transition-all">
                    03
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-bold mb-1.5 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Cpu size={16} className="text-primary-container" />
                      Trace Datapath
                    </h3>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed">
                      Step cycle-by-cycle or run continuously. Watch multiplexers select values, registers update with writebacks, and memory segments sync instantly.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/50 flex items-center justify-center font-status-label text-[14px] text-primary-container font-bold shrink-0 group-hover:border-primary-container transition-all">
                    04
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-bold mb-1.5 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <History size={16} className="text-primary-container" />
                      Temporal Undo
                    </h3>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed">
                      Need to trace back a register value? The simulator maintains a state history buffer, allowing you to step backward to correct logical hazards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Mockup Panel */}
              <div className="lg:col-span-7 bg-[#0a0e17] rounded-2xl border border-outline-variant/40 shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden font-code-editor text-[12px]">
                {/* Editor Header */}
                <div className="bg-[#131924] px-4 py-3 flex items-center justify-between border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-breakpoint-red/80"></div>
                    <div className="w-3 h-3 rounded-full bg-hazard-orange/80"></div>
                    <div className="w-3 h-3 rounded-full bg-success-green/80"></div>
                    <span className="text-[11px] text-on-surface-variant ml-3 font-status-label">fibonacci.s</span>
                  </div>
                  <div className="text-[10px] text-on-surface-variant/40 font-status-label uppercase tracking-wider">
                    RISC-V Assembly Editor
                  </div>
                </div>

                {/* Editor Body */}
                <div className="p-6 overflow-x-auto text-left select-text selection:bg-primary-container/20">
                  <div className="flex gap-4">
                    {/* Line numbers */}
                    <div className="text-on-surface-variant/20 text-right select-none font-status-label w-5">
                      1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10<br/>11<br/>12<br/>13<br/>14<br/>15<br/>16
                    </div>
                    {/* Code lines */}
                    <div className="flex-1 text-[#bac9cc] leading-5 whitespace-pre">
                      <span className="text-[#a78bfa]">.data</span>{"\n"}
                      <span className="text-[#38bdf8]">n:</span>     <span className="text-[#a78bfa]">.word</span> <span className="text-[#facc15]">10</span>                     <span className="text-[#64748b]"># Compute 10th Fib number</span>{"\n"}
                      {"\n"}
                      <span className="text-[#a78bfa]">.text</span>{"\n"}
                      <span className="text-[#38bdf8]">main:</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">li</span>    <span className="text-[#4ade80]">a0</span>, <span className="text-[#facc15]">10</span>                     <span className="text-[#64748b]"># Load loop counter</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">li</span>    <span className="text-[#4ade80]">t0</span>, <span className="text-[#facc15]">0</span>                      <span className="text-[#64748b]"># F(0) = 0</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">li</span>    <span className="text-[#4ade80]">t1</span>, <span className="text-[#facc15]">1</span>                      <span className="text-[#64748b]"># F(1) = 1</span>{"\n"}
                      <span className="text-[#38bdf8]">loop:</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">add</span>   <span className="text-[#4ade80]">t2</span>, <span className="text-[#4ade80]">t0</span>, <span className="text-[#4ade80]">t1</span>                 <span className="text-[#64748b]"># F(i) = F(i-1) + F(i-2)</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">mv</span>    <span className="text-[#4ade80]">t0</span>, <span className="text-[#4ade80]">t1</span>                      <span className="text-[#64748b]"># Update state</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">mv</span>    <span className="text-[#4ade80]">t1</span>, <span className="text-[#4ade80]">t2</span>                      <span className="text-[#64748b]"># Update state</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">addi</span>  <span className="text-[#4ade80]">a0</span>, <span className="text-[#4ade80]">a0</span>, <span className="text-[#facc15]">-1</span>                 <span className="text-[#64748b]"># Decrement count</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#00e5ff] font-semibold">bnez</span>  <span className="text-[#4ade80]">a0</span>, <span className="text-[#38bdf8]">loop</span>                   <span className="text-[#64748b]"># Continue loop</span>{"\n"}
                      {"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#f43f5e] font-semibold">li</span>    <span className="text-[#4ade80]">a7</span>, <span className="text-[#facc15]">10</span>                      <span className="text-[#64748b]"># Halt syscall code</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#f43f5e] font-semibold">ecall</span>                                <span className="text-[#64748b]"># Transfer to OS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ISA Specs Section */}
        <section id="specs" className="py-28 bg-surface-container-low border-t border-outline-variant/40 relative overflow-hidden select-none">
          <div className="absolute inset-0 scanlines pointer-events-none z-0"></div>
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
            <div className="text-center mb-20">
              <span className="font-status-label text-[11px] tracking-widest text-[#FF6D00] uppercase bg-hazard-orange/10 px-4 py-1.5 rounded-full border border-hazard-orange/20">Instruction Specs</span>
              <h2 className="font-headline-lg text-4xl md:text-5xl text-on-surface font-bold mt-4 mb-3">RISC-V ISA Core Specifications</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-base">Explore the fully compliant simulation engine capabilities built into ChronoCore.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Panel 1 */}
              <div className="bg-[#121620] border border-outline-variant/30 rounded-2xl p-6 hover:border-[#00e5ff]/40 transition-colors">
                <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center mb-4 border border-outline-variant/30">
                  <Cpu className="text-[#00e5ff]" size={20} />
                </div>
                <h3 className="font-headline-sm text-base text-on-surface font-bold mb-2">RV32I Base Set</h3>
                <p className="text-on-surface-variant text-[12px] leading-relaxed mb-4">
                  Full implementation of the standard 32-bit base integer instruction set.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-status-label text-[#00e5ff]">
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">ADD/SUB</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">SLT/SLTU</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">LW/SW</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">BRANCHES</span>
                </div>
              </div>

              {/* Panel 2 */}
              <div className="bg-[#121620] border border-outline-variant/30 rounded-2xl p-6 hover:border-[#00e87a]/40 transition-colors">
                <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center mb-4 border border-outline-variant/30">
                  <Sparkles className="text-[#00e87a]" size={20} />
                </div>
                <h3 className="font-headline-sm text-base text-on-surface font-bold mb-2">RV32M Extension</h3>
                <p className="text-on-surface-variant text-[12px] leading-relaxed mb-4">
                  Hardware multiplier and divider simulation for high-performance math routines.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-status-label text-[#00e87a]">
                  <span className="bg-[#00e87a]/10 px-2 py-0.5 rounded border border-[#00e87a]/20">MUL/MULH</span>
                  <span className="bg-[#00e87a]/10 px-2 py-0.5 rounded border border-[#00e87a]/20">MULHSU/MULHU</span>
                  <span className="bg-[#00e87a]/10 px-2 py-0.5 rounded border border-[#00e87a]/20">DIV/DIVU</span>
                  <span className="bg-[#00e87a]/10 px-2 py-0.5 rounded border border-[#00e87a]/20">REM/REMU</span>
                </div>
              </div>

              {/* Panel 3 */}
              <div className="bg-[#121620] border border-outline-variant/30 rounded-2xl p-6 hover:border-[#FF6D00]/40 transition-colors">
                <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center mb-4 border border-outline-variant/30">
                  <Terminal className="text-[#FF6D00]" size={20} />
                </div>
                <h3 className="font-headline-sm text-base text-on-surface font-bold mb-2">Environment Calls</h3>
                <p className="text-on-surface-variant text-[12px] leading-relaxed mb-4">
                  ECALL software interrupt handler mapped to a virtual terminal output console.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-status-label text-[#FF6D00]">
                  <span className="bg-[#FF6D00]/10 px-2 py-0.5 rounded border border-[#FF6D00]/20">PRINT INT (1)</span>
                  <span className="bg-[#FF6D00]/10 px-2 py-0.5 rounded border border-[#FF6D00]/20">PRINT STR (4)</span>
                  <span className="bg-[#FF6D00]/10 px-2 py-0.5 rounded border border-[#FF6D00]/20">READ CHAR (12)</span>
                  <span className="bg-[#FF6D00]/10 px-2 py-0.5 rounded border border-[#FF6D00]/20">HALT (10/93)</span>
                </div>
              </div>

              {/* Panel 4 */}
              <div className="bg-[#121620] border border-outline-variant/30 rounded-2xl p-6 hover:border-[#00e5ff]/40 transition-colors">
                <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center mb-4 border border-outline-variant/30">
                  <History className="text-[#00e5ff]" size={20} />
                </div>
                <h3 className="font-headline-sm text-base text-on-surface font-bold mb-2">Temporal Buffer</h3>
                <p className="text-on-surface-variant text-[12px] leading-relaxed mb-4">
                  Stack-based state recording tracking RAM writes and register value edits.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-status-label text-[#00e5ff]">
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">1000 STATE DEPTH</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">MEMORY ROLLBACK</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">REG SNAPSHOTS</span>
                  <span className="bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">PLAYBACK CONTROLS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Footer */}
        <footer className="bg-[#0a0e17] border-t border-outline-variant/30 py-16 select-none relative z-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
              {/* Col 1 */}
              <div className="lg:col-span-5 flex flex-col items-start text-left">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded bg-primary-container flex items-center justify-center text-terminal-black font-extrabold text-[12px]">C</div>
                  <h3 className="font-headline-lg text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-container font-bold tracking-tight">ChronoCore</h3>
                </div>
                <p className="text-on-surface-variant text-[12px] leading-relaxed max-w-sm mb-6">
                  A cycle-accurate educational simulation platform designed for hardware-software interface analysis, instruction pipeline diagnostics, and RISC-V debugging.
                </p>
                {/* Social links */}
                <div className="flex gap-4">
                  <a href="https://github.com/NoumanKhan/chronocore" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/40 flex items-center justify-center hover:border-primary-container hover:text-primary-container transition-all text-on-surface-variant hover:scale-105 active:scale-95" title="GitHub">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/40 flex items-center justify-center hover:border-primary-container hover:text-primary-container transition-all text-on-surface-variant hover:scale-105 active:scale-95" title="Twitter">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/40 flex items-center justify-center hover:border-primary-container hover:text-primary-container transition-all text-on-surface-variant hover:scale-105 active:scale-95" title="Discord">
                    <MessageSquare size={15} />
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-surface border border-outline-variant/40 flex items-center justify-center hover:border-primary-container hover:text-primary-container transition-all text-on-surface-variant hover:scale-105 active:scale-95" title="Website">
                    <Globe size={15} />
                  </a>
                </div>
              </div>

              {/* Col 2 */}
              <div className="lg:col-span-2 flex flex-col items-start text-left">
                <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-widest mb-4 font-status-label">Architecture</h4>
                <ul className="space-y-2.5 text-[12px] text-on-surface-variant">
                  <li><a href="#specs" className="hover:text-primary-container transition-colors">RV32IM Base Core</a></li>
                  <li><a href="#features" className="hover:text-primary-container transition-colors">Visual Datapath</a></li>
                  <li><a href="#guide" className="hover:text-primary-container transition-colors">Temporal State Buffer</a></li>
                  <li><a href="#guide" className="hover:text-primary-container transition-colors">Terminal OS Syscalls</a></li>
                </ul>
              </div>

              {/* Col 3 */}
              <div className="lg:col-span-2 flex flex-col items-start text-left">
                <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-widest mb-4 font-status-label">Quick Links</h4>
                <ul className="space-y-2.5 text-[12px] text-on-surface-variant">
                  <li><a href="#features" className="hover:text-primary-container transition-colors">Core Features</a></li>
                  <li><a href="#guide" className="hover:text-primary-container transition-colors">Interactive Guide</a></li>
                  <li><a href="#specs" className="hover:text-primary-container transition-colors">Supported Opcodes</a></li>
                  <li><button onClick={() => setLandingPage(false)} className="hover:text-primary-container transition-colors text-left">Launch Core</button></li>
                </ul>
              </div>

              {/* Col 4 */}
              <div className="lg:col-span-3 flex flex-col items-start text-left">
                <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-widest mb-4 font-status-label">Open Source</h4>
                <p className="text-on-surface-variant text-[12px] leading-relaxed mb-4">
                  ChronoCore is open-source. Help make simulator assembly tracking better.
                </p>
                <a 
                  href="https://github.com/NoumanKhan/chronocore" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-outline-variant/50 hover:border-primary-container/80 text-[11px] font-status-label px-3.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:text-primary-container transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>Star on GitHub</span>
                </a>
              </div>
            </div>

            {/* Bottom line */}
            <div className="pt-8 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="font-status-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
                © 2026 ChronoCore. MIT License. Developed for Educational ISA Simulation.
              </span>
              <div className="flex flex-wrap gap-4 text-[10px] text-on-surface-variant/40 font-status-label">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={11} className="text-success-green" />
                  <span>CORE INTEGRITY CONFIRMED</span>
                </div>
                <span>|</span>
                <span>BUILD: v2.4.0-stable</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-hidden h-screen flex flex-col relative pt-header-height pb-footer-height pl-16 lg:pl-sidebar-width">
      <Header />
      <LeftSidebar />

      {/* Main Content Working Area */}
      <main className="flex-1 overflow-hidden relative p-3">
        {activeTab === "editor" && <EditorTab />}
        {activeTab === "cpu" && <CpuStateTab />}
        {activeTab === "memory" && <MemoryTab />}
        {activeTab === "datapath" && <DatapathTab />}
        {activeTab === "pipeline" && <PipelineTab />}
        {activeTab === "processor" && <ProcessorTab />}
      </main>

      <Footer />
    </div>
  );
};

export default App;
