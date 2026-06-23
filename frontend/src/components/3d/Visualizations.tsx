"use client";
import React, { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════
   3D PARTICLE CONSTELLATION CANVAS
   A floating, auto-rotating star field with depth using CSS/Canvas
════════════════════════════════════════════════════════════ */
export function ParticleConstellation({ count = 80 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    type Particle = {
      x: number; y: number; z: number;
      vx: number; vy: number; vz: number;
      r: number;
    };

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * W,
      y: (Math.random() - 0.5) * H,
      z: Math.random() * 600 - 300,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));

    const fov = 400;
    const cx = W / 2;
    const cy = H / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Sort by z for depth
      const projected = particles.map((p) => {
        const scale = fov / (fov + p.z + 300);
        const sx = p.x * scale + cx;
        const sy = p.y * scale + cy;
        const opacity = Math.max(0.05, Math.min(0.8, scale * 1.5));
        return { sx, sy, scale, opacity, p };
      }).sort((a, b) => a.scale - b.scale);

      // Draw connections
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].sx - projected[j].sx;
          const dy = projected[i].sy - projected[j].sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15 * projected[i].opacity;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(projected[i].sx, projected[i].sy);
            ctx.lineTo(projected[j].sx, projected[j].sy);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      projected.forEach(({ sx, sy, scale, opacity }) => {
        const radius = Math.max(0.5, scale * 2.5);
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 2);
        grad.addColorStop(0, `rgba(139,92,246,${opacity})`);
        grad.addColorStop(1, `rgba(99,102,241,0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Update positions
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        if (Math.abs(p.x) > W / 2 + 50) p.vx *= -1;
        if (Math.abs(p.y) > H / 2 + 50) p.vy *= -1;
        if (p.z > 300 || p.z < -300) p.vz *= -1;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

/* ════════════════════════════════════════════════════════════
   3D FLOATING ORB
   A CSS-animated glowing orb with 3D depth effect
════════════════════════════════════════════════════════════ */
export function FloatingOrb({
  size = 300,
  color = "violet",
  delay = 0,
  x = 0,
  y = 0,
  blur = 80,
}: {
  size?: number;
  color?: "violet" | "blue" | "indigo" | "cyan" | "rose";
  delay?: number;
  x?: number;
  y?: number;
  blur?: number;
}) {
  const colors = {
    violet: "radial-gradient(circle at 40% 40%, rgba(167,139,250,0.6), rgba(139,92,246,0.3) 50%, transparent 70%)",
    blue:   "radial-gradient(circle at 40% 40%, rgba(96,165,250,0.6), rgba(59,130,246,0.3) 50%, transparent 70%)",
    indigo: "radial-gradient(circle at 40% 40%, rgba(129,140,248,0.6), rgba(99,102,241,0.3) 50%, transparent 70%)",
    cyan:   "radial-gradient(circle at 40% 40%, rgba(103,232,249,0.5), rgba(6,182,212,0.25) 50%, transparent 70%)",
    rose:   "radial-gradient(circle at 40% 40%, rgba(251,113,133,0.5), rgba(244,63,94,0.25) 50%, transparent 70%)",
  };

  return (
    <div
      className="absolute pointer-events-none rounded-full will-change-transform"
      style={{
        width: size,
        height: size,
        left: `calc(50% + ${x}px - ${size / 2}px)`,
        top: `calc(50% + ${y}px - ${size / 2}px)`,
        background: colors[color],
        filter: `blur(${blur}px)`,
        animationName: "orbFloat",
        animationDuration: `${8 + delay}s`,
        animationDelay: `${delay}s`,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
        animationDirection: "alternate",
        transform: "translateZ(0)",
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════
   3D SCORE RING (SVG-based)
   Animated circular progress ring with 3D glow
════════════════════════════════════════════════════════════ */
export function ScoreRing3D({
  score,
  size = 80,
  strokeWidth = 7,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#3b82f6" :
    score >= 40 ? "#f59e0b" : "#f43f5e";

  const glowColor =
    score >= 80 ? "rgba(16,185,129,0.4)" :
    score >= 60 ? "rgba(59,130,246,0.4)" :
    score >= 40 ? "rgba(245,158,11,0.4)" : "rgba(244,63,94,0.4)";

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
        perspective: "200px",
        filter: `drop-shadow(0 0 8px ${glowColor})`,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotateX(5deg)", transition: "transform 0.3s ease" }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transformOrigin: "center",
            transform: "rotate(-90deg)",
            transformBox: "fill-box",
          }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.22}
          fontWeight="800"
          fontFamily="system-ui"
        >
          {score}%
        </text>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   3D BAR CHART (SVG-based)
   Animated 3D-perspective bar chart for score trends
════════════════════════════════════════════════════════════ */
export function BarChart3D({
  data,
}: {
  data: { label: string; value: number; count: number }[];
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (data.length === 0) return (
    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No trend data yet.</p>
  );

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartH = 160;
  const chartW = 100; // percentage-based
  const barW = Math.min(40, Math.floor(80 / data.length));
  const gap = data.length > 1 ? (100 - barW * data.length) / (data.length - 1) : 0;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: chartH + 40 }}>
      <svg
        viewBox={`0 0 100 ${chartH + 20}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: chartH + 40 }}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="barGradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="barGradMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1="0" y1={chartH - (pct / 100) * chartH}
            x2="100" y2={chartH - (pct / 100) * chartH}
            stroke="rgba(148,163,184,0.1)"
            strokeWidth="0.3"
          />
        ))}

        {data.map((d, i) => {
          const x = i * (barW + gap);
          const pct = d.value / maxVal;
          const barH = animated ? pct * chartH : 0;
          const y = chartH - barH;
          const grad = d.value >= 75 ? "url(#barGradHigh)" : d.value >= 55 ? "url(#barGradMid)" : "url(#barGrad)";

          return (
            <g key={d.label} filter="url(#barGlow)">
              {/* 3D side face */}
              <polygon
                points={`${x + barW},${y} ${x + barW + 3},${y - 3} ${x + barW + 3},${chartH - 3} ${x + barW},${chartH}`}
                fill="rgba(99,102,241,0.3)"
                style={{ transition: `all 1s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms` }}
              />
              {/* 3D top face */}
              <polygon
                points={`${x},${y} ${x + 3},${y - 3} ${x + barW + 3},${y - 3} ${x + barW},${y}`}
                fill="rgba(167,139,250,0.5)"
                style={{ transition: `all 1s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms` }}
              />
              {/* Main bar face */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="1"
                fill={grad}
                style={{ transition: `all 1s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms` }}
              />
              {/* Value label */}
              <text
                x={x + barW / 2}
                y={Math.max(y - 5, 6)}
                textAnchor="middle"
                fontSize="3.5"
                fill="rgba(148,163,184,0.8)"
                fontWeight="600"
              >
                {d.value}%
              </text>
              {/* Date label */}
              <text
                x={x + barW / 2}
                y={chartH + 8}
                textAnchor="middle"
                fontSize="3"
                fill="rgba(148,163,184,0.6)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   3D DONUT CHART
   Animated donut with 3D-perspective tilt for pipeline stats
════════════════════════════════════════════════════════════ */
export function DonutChart3D({
  segments,
  total,
  label,
}: {
  segments: { label: string; value: number; color: string; glowColor: string }[];
  total: number;
  label: string;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const innerR = 38;
  const fullCirc = 2 * Math.PI * r;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative + fraction) * 2 * Math.PI - Math.PI / 2;
    cumulative += fraction;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(startAngle);
    const yi1 = cy + innerR * Math.sin(startAngle);
    const xi2 = cx + innerR * Math.cos(endAngle);
    const yi2 = cy + innerR * Math.sin(endAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;

    const d = fraction > 0
      ? `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`
      : "";

    return { ...seg, fraction, d };
  });

  return (
    <div
      className="flex flex-col items-center"
      style={{ perspective: "600px" }}
    >
      <div style={{ transform: "rotateX(20deg)", transformStyle: "preserve-3d" }}>
        <svg
          width={size}
          height={size}
          style={{ filter: "drop-shadow(0 8px 24px rgba(99,102,241,0.25))" }}
        >
          <defs>
            {segments.map((seg) => (
              <radialGradient key={seg.label} id={`dgrad-${seg.label}`} cx="40%" cy="40%">
                <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
              </radialGradient>
            ))}
            <filter id="donutGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Placeholder ring when empty */}
          {total === 0 && (
            <circle
              cx={cx} cy={cy} r={(r + innerR) / 2}
              fill="none"
              stroke="rgba(148,163,184,0.1)"
              strokeWidth={r - innerR}
            />
          )}

          {arcs.map((arc) =>
            arc.fraction > 0 ? (
              <path
                key={arc.label}
                d={arc.d}
                fill={`url(#dgrad-${arc.label})`}
                filter="url(#donutGlow)"
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: animated ? "scale(1)" : "scale(0.4)",
                  opacity: animated ? 1 : 0,
                  transition: "transform 0.8s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease",
                }}
              />
            ) : null
          )}

          {/* Center label */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fontWeight="800" fill="currentColor">
            {total}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="5" fill="rgba(148,163,184,0.8)" fontWeight="600">
            {label}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label}: <span className="font-bold text-slate-700 dark:text-slate-200">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   3D STAT CARD
   A hoverable 3D-tilting stat card with glow
════════════════════════════════════════════════════════════ */
export function StatCard3D({
  icon: Icon,
  value,
  label,
  color = "blue",
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color?: "blue" | "violet" | "emerald" | "amber";
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = ((e.clientY - cy) / rect.height) * -20;
    const y = ((e.clientX - cx) / rect.width) * 20;
    setTilt({ x, y });
  };

  const colors = {
    blue:    { bg: "from-blue-500/10 to-blue-600/5",    border: "border-blue-500/20", glow: "rgba(59,130,246,0.3)",  icon: "text-blue-500" },
    violet:  { bg: "from-violet-500/10 to-violet-600/5", border: "border-violet-500/20", glow: "rgba(139,92,246,0.3)", icon: "text-violet-500" },
    emerald: { bg: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/20", glow: "rgba(16,185,129,0.3)", icon: "text-emerald-500" },
    amber:   { bg: "from-amber-500/10 to-amber-600/5",  border: "border-amber-500/20",  glow: "rgba(245,158,11,0.3)", icon: "text-amber-500" },
  };
  const c = colors[color];

  return (
    <div
      ref={ref}
      className={`relative bg-gradient-to-br ${c.bg} backdrop-blur-sm border ${c.border} rounded-2xl py-5 px-4 text-center cursor-default overflow-hidden group`}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
        transition: "transform 0.1s ease",
        boxShadow: `0 4px 24px ${c.glow}`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      {/* Shimmer highlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${50 + tilt.y * 2}% ${50 - tilt.x * 2}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
        }}
      />
      <Icon className={`w-5 h-5 ${c.icon} mb-2 mx-auto`} />
      <div className="text-2xl sm:text-3xl font-heading font-black text-foreground">{value}</div>
      <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   3D HORIZONTAL BAR (for pipeline funnel)
════════════════════════════════════════════════════════════ */
export function Bar3D({
  value,
  max,
  color,
  glowColor,
}: {
  value: number;
  max: number;
  color: string;
  glowColor: string;
}) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? (value / max) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div
      className="flex-1 h-5 rounded-full overflow-hidden relative"
      style={{
        background: "rgba(148,163,184,0.1)",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)",
        perspective: "300px",
      }}
    >
      {/* 3D bar body */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 2px 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.25)`,
          transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)",
          minWidth: value > 0 ? "8px" : "0",
        }}
      >
        {/* Shine top strip */}
        <div
          className="absolute top-0 left-0 right-0 h-1/3 rounded-full opacity-30"
          style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.6), transparent)" }}
        />
      </div>
    </div>
  );
}
