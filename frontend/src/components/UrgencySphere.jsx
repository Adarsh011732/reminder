import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

/**
 * Lightweight, optimized 3D Urgency Sphere
 * Uses cached Fibonacci sphere vertices and throttled projections
 * to maintain buttery-smooth frame rates without CPU heating.
 */
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
    canvas.width = size;
    canvas.height = size;

    // Base color determination
    let baseColor = { r: 240, g: 240, b: 245 };
    let speed = 0.016;

    if (isLoading || urgencyState === 'loading') {
      baseColor = { r: 240, g: 240, b: 245 };
      speed = 0.018;
    } else if (urgencyState === 'critical') {
      baseColor = { r: 239, g: 68, b: 68 };
      speed = 0.028;
    } else if (urgencyState === 'average') {
      baseColor = { r: 245, g: 158, b: 11 };
      speed = 0.02;
    } else if (urgencyState === 'good') {
      baseColor = { r: 52, g: 211, b: 153 };
      speed = 0.014;
    }

    // Pre-calculate 64 sphere coordinates (plenty for high-fidelity 3D aesthetic)
    const numPoints = 64;
    const points = [];
    const radius = 58;

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi)
      });
    }

    let angleX = 0;
    let angleY = 0;
    const centerX = size / 2;
    const centerY = size / 2;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      angleX += speed * 0.7;
      angleY += speed;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Subtle ambient radial glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 1.05);
      glowGrad.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.15)`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

      // Rotate and project points
      const fov = 150;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;
        const alpha = Math.max(0.15, Math.min(0.95, (z2 + radius) / (2 * radius)));

        ctx.beginPath();
        const dotRadius = Math.max(0.8, scale * 1.5);
        ctx.arc(projX, projY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.fill();
      }

      // Delicate orbital ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.16)`;
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
    <div className="rounded-2xl bw-card p-4 border-[#222226] flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 hover:border-[#383838]">
      
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
        <div className="py-1.5 px-3 rounded-xl bg-[#111114] border border-[#26262a] text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm">
          <span className={pipClass}></span>
          <span>{statusLabel}</span>
        </div>
      </div>

    </div>
  );
}
