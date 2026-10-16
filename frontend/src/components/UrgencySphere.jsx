import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

export default function UrgencySphere({
  urgencyState = 'loading',
  criticalCount = 0,
  approachingCount = 0,
  isLoading = false
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const size = 180;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Color definitions
    let baseColor = { r: 240, g: 240, b: 245 }; // Default sleek monochrome white/ice
    let speed = 0.018;

    if (isLoading || urgencyState === 'loading') {
      baseColor = { r: 240, g: 240, b: 245 }; // Monochrome neutral scanning
      speed = 0.02;
    } else if (urgencyState === 'critical') {
      baseColor = { r: 239, g: 68, b: 68 }; // Red (Critical <48h)
      speed = 0.035;
    } else if (urgencyState === 'average') {
      baseColor = { r: 245, g: 158, b: 11 }; // Yellow / Amber (Approaching)
      speed = 0.022;
    } else if (urgencyState === 'good') {
      baseColor = { r: 52, g: 211, b: 153 }; // Calm Emerald
      speed = 0.015;
    }

    // Generate points on sphere using Fibonacci sphere algorithm
    const numPoints = 160;
    const points = [];
    const radius = 62;

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      angleX += speed * 0.7;
      angleY += speed;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const centerX = size / 2;
      const centerY = size / 2;

      // Draw subtle ambient radial glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 1.1);
      glowGrad.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.2)`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

      // Rotate, project, and sort points by Z depth
      const projected = points.map((p) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;

        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        // Perspective projection
        const fov = 160;
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;
        const alpha = Math.max(0.15, Math.min(1, (z2 + radius) / (2 * radius)));

        return { x: projX, y: projY, z: z2, scale, alpha };
      });

      // Sort points so back dots are drawn first
      projected.sort((a, b) => a.z - b.z);

      // Render dots
      projected.forEach((p) => {
        ctx.beginPath();
        const dotRadius = Math.max(0.8, p.scale * 1.8);
        ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${p.alpha})`;
        ctx.fill();
      });

      // Outer delicate orbital ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.18)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [urgencyState, isLoading]);

  const isActuallyLoading = isLoading || urgencyState === 'loading';

  const statusLabel = isActuallyLoading
    ? 'Syncing Radar...'
    : urgencyState === 'critical'
    ? `${criticalCount} Urgent Deadline${criticalCount > 1 ? 's' : ''}`
    : urgencyState === 'average'
    ? `${approachingCount} Approaching`
    : 'All Clear';

  const pipClass = isActuallyLoading
    ? 'w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse'
    : urgencyState === 'critical'
    ? 'w-2 h-2 rounded-full pip-red'
    : urgencyState === 'average'
    ? 'w-2 h-2 rounded-full pip-yellow'
    : 'w-2 h-2 rounded-full pip-green';

  return (
    <div className="rounded-2xl bw-card p-4 border-[#222222] flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 hover:border-[#383838]">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 z-10 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-neutral-400">
          <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
          <span>Radar Status</span>
        </div>
        <span className={pipClass}></span>
      </div>

      {/* 3D Dot Sphere Canvas */}
      <div className="relative my-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{ width: '180px', height: '180px' }}
          className="cursor-pointer"
        />
      </div>

      {/* Status Badge */}
      <div className="z-10 w-full mt-1">
        <div className="py-1.5 px-3 rounded-xl bg-[#111111] border border-[#262626] text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm">
          <span className={pipClass}></span>
          <span>{statusLabel}</span>
        </div>
      </div>

    </div>
  );
}
