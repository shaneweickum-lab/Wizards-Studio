import { useState, useEffect, useRef } from "react";
import { RUNES } from "../../constants/themes.js";

// ─── INTRO / SPLASH SCREEN ────────────────────────────────────────────────────
// Animated rune particle canvas → dissolve → title reveal → arc sweep → done.
// Shown once on first load. Calls onDone() when animation completes.

export default function AuthScreen({ onDone }) {
  const canvasRef  = useRef(null);
  const titleRef   = useRef(null);
  const animRef    = useRef(null);
  const runesRef   = useRef([]);

  const [phase,        setPhase]     = useState("runes"); // runes → dissolve → title → arc → done
  const [titleOpacity, setTitleOp]   = useState(0);
  const [titleScale,   setTitleSc]   = useState(0.88);
  const [subOpacity,   setSubOp]     = useState(0);
  const [arcProgress,  setArcProg]   = useState(0);
  const [dotVisible,   setDotVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;

    const count = 65;
    runesRef.current = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const r     = 70 + Math.random() * 230;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        glyph: RUNES[Math.floor(Math.random() * RUNES.length)],
        size: 13 + Math.random() * 22,
        opacity: 0,
        angle,
        orbitR: r,
        orbitSpeed: 0.004 + Math.random() * 0.007,
        color: ["#a78bfa","#f472b6","#34d399","#60a5fa","#fb923c","#fbbf24","#e8e4d9"][Math.floor(Math.random()*7)],
        phase: Math.random() * Math.PI * 2,
        dissolved: false,
      };
    });

    let t = 0;
    let dissolveStarted = false;
    let dissolveT = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#08080e";
      ctx.fillRect(0, 0, W, H);
      t += 1;

      if (t > 120 && !dissolveStarted) {
        dissolveStarted = true;
        setTimeout(() => setPhase("dissolve"), 0);
      }
      if (dissolveStarted) dissolveT += 1;

      let allDissolved = true;
      runesRef.current.forEach((rune, i) => {
        if (!dissolveStarted) {
          rune.opacity = Math.min(1, rune.opacity + 0.022);
          rune.angle  += rune.orbitSpeed;
          rune.x = cx + Math.cos(rune.angle) * rune.orbitR;
          rune.y = cy + Math.sin(rune.angle) * rune.orbitR;
          rune.y += Math.sin(t * 0.04 + rune.phase) * 0.45;
          allDissolved = false;
        } else {
          const delay = i * 2.8;
          if (dissolveT > delay) {
            rune.x      += (cx - rune.x) * 0.055;
            rune.y      += (cy - rune.y) * 0.055;
            rune.opacity = Math.max(0, rune.opacity - 0.022);
            rune.size   *= 0.988;
            if (rune.opacity <= 0) rune.dissolved = true;
          }
          if (!rune.dissolved) allDissolved = false;
        }

        if (rune.dissolved) return;
        ctx.save();
        ctx.globalAlpha  = rune.opacity;
        ctx.fillStyle    = rune.color;
        ctx.font         = `${rune.size}px serif`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor  = rune.color;
        ctx.shadowBlur   = rune.opacity * 14;
        ctx.fillText(rune.glyph, rune.x, rune.y);
        ctx.restore();
      });

      if (dissolveStarted && allDissolved) {
        cancelAnimationFrame(animRef.current);
        setTimeout(() => {
          setPhase("title");
          let op = 0, sc = 0.88;
          const ti = setInterval(() => {
            op = Math.min(1, op + 0.032);
            sc = Math.min(1, sc + 0.007);
            setTitleOp(op);
            setTitleSc(sc);
            if (op >= 1) {
              clearInterval(ti);
              setTimeout(() => {
                setSubOp(1);
                setTimeout(() => {
                  setPhase("arc");
                  let prog = 0;
                  const arcInt = setInterval(() => {
                    prog = Math.min(1, prog + 0.018);
                    setArcProg(prog);
                    if (prog >= 1) {
                      clearInterval(arcInt);
                      setDotVisible(true);
                      setTimeout(() => onDone(), 900);
                    }
                  }, 16);
                }, 500);
              }, 300);
            }
          }, 16);
        }, 80);
        return;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ARC_LEN = 1200;

  return (
    <div style={{ position:"fixed", inset:0, background:"#08080e", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>

      <canvas ref={canvasRef} style={{ position:"absolute", inset:0 }} />

      {(phase === "title" || phase === "arc" || phase === "done") && (
        <div style={{ position:"relative", zIndex:10, textAlign:"center", userSelect:"none" }}>

          {(phase === "arc" || phase === "done") && (
            <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%",
              overflow:"visible", pointerEvents:"none" }}
              viewBox="0 0 800 80">
              <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0"/>
                  <stop offset="40%"  stopColor="#f472b6" stopOpacity="1"/>
                  <stop offset="80%"  stopColor="#fbbf24" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
                </linearGradient>
                <filter id="arcGlow">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <path
                d="M -300,40 C -100,-60 200,-80 295,4"
                fill="none"
                stroke="url(#arcGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#arcGlow)"
                style={{
                  strokeDasharray: ARC_LEN,
                  strokeDashoffset: ARC_LEN * (1 - arcProgress),
                  transition:"none",
                }}
              />
              {arcProgress > 0.05 && arcProgress < 1 && (
                <circle r="4" fill="#ffffff" filter="url(#arcGlow)" style={{ opacity: 0.9 }}>
                  <animateMotion
                    dur="0.01s"
                    repeatCount="1"
                    path="M -300,40 C -100,-60 200,-80 295,4"
                    keyPoints={`${Math.max(0, arcProgress - 0.01)};${arcProgress}`}
                    keyTimes="0;1"
                    calcMode="linear"
                    fill="freeze"
                  />
                </circle>
              )}
            </svg>
          )}

          <div ref={titleRef} style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            transition:"none",
            position:"relative",
          }}>
            {dotVisible && (
              <div style={{
                position:"absolute",
                left:"23.5%", top:"-14px",
                width:7, height:7, borderRadius:"50%",
                background:"#ffffff",
                boxShadow:"0 0 8px 3px #a78bfa, 0 0 20px 6px #f472b633",
                animation:"dotPulse 0.6s ease-out forwards",
              }}/>
            )}

            <div style={{
              fontSize:"clamp(32px,5.5vw,68px)",
              color:"#e8e4d9",
              letterSpacing:"-1.5px",
              fontStyle:"italic",
              fontFamily:"Georgia,serif",
              textShadow:"0 0 40px rgba(167,139,250,0.5), 0 0 80px rgba(167,139,250,0.2)",
              marginBottom:10,
              lineHeight:1.15,
            }}>
              ⚗️ Wizards Studio
            </div>

            <div style={{
              opacity: subOpacity,
              transition:"opacity 0.8s ease",
              fontSize:"clamp(10px,1.3vw,13px)",
              color:"#5a5a7a",
              letterSpacing:5,
              fontFamily:"monospace",
              textTransform:"uppercase",
            }}>
              Words are spells. Your prompts should be too.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0%   { transform:scale(0); opacity:0; box-shadow:0 0 0px 0px #a78bfa; }
          50%  { transform:scale(1.8); opacity:1; box-shadow:0 0 16px 8px #a78bfa88; }
          100% { transform:scale(1); opacity:1; box-shadow:0 0 8px 3px #a78bfa, 0 0 20px 6px #f472b633; }
        }
      `}</style>
    </div>
  );
}
