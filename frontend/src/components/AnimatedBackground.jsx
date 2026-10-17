import React, { useEffect, useRef } from 'react';

/**
 * High-performance, lightweight constellation background.
 * Optimized with squared-distance calculations and capped particle count
 * to maintain consistent 60+ FPS with near-zero CPU overhead.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: null, y: null, radius: 140 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    let nodes = [];
    const maxNodes = 36; // Capped for ultra-lightweight GPU footprint
    const maxDist = 120;
    const maxDistSq = maxDist * maxDist;

    const initNodes = () => {
      nodes = [];
      const count = Math.min(maxNodes, Math.floor((width * height) / 45000) + 18);

      for (let i = 0; i < count; i++) {
        const isSpecial = Math.random() < 0.2;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: isSpecial ? 2.0 : 1.2,
          baseAlpha: isSpecial ? 0.8 : 0.45,
          alpha: 0.5,
          pulseOffset: Math.random() * Math.PI * 2,
          isSpecial
        });
      }
    };

    initNodes();

    let tick = 0;

    const render = () => {
      tick += 0.015;

      // Deep true black background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // 1. Update and draw connecting lines
      ctx.lineWidth = 0.8;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        n1.x += n1.vx;
        n1.y += n1.vy;

        // Bounce at boundaries
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        n1.alpha = n1.baseAlpha + Math.sin(tick * 1.5 + n1.pulseOffset) * 0.15;

        // Mouse gentle pull
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = mouse.x - n1.x;
          const mdy = mouse.y - n1.y;
          const mDistSq = mdx * mdx + mdy * mdy;
          const mouseRadiusSq = mouse.radius * mouse.radius;

          if (mDistSq < mouseRadiusSq) {
            const mDist = Math.sqrt(mDistSq);
            const mAlpha = (1 - mDist / mouse.radius) * 0.4;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${mAlpha})`;
            ctx.stroke();

            const force = (1 - mDist / mouse.radius) * 0.15;
            n1.x += (mdx / mDist) * force;
            n1.y += (mdy / mDist) * force;
          }
        }

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.stroke();
          }
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
        ctx.fillStyle = n1.isSpecial
          ? `rgba(255, 255, 255, ${n1.alpha})`
          : `rgba(200, 200, 200, ${n1.alpha * 0.8})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
