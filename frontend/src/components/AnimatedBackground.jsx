import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = {
      x: null,
      y: null,
      radius: 170
    };

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

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    let nodes = [];
    const initNodes = () => {
      nodes = [];
      const count = Math.floor(Math.min(width, height) / 10) + 35;

      for (let i = 0; i < count; i++) {
        const isSpecial = Math.random() < 0.15;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.65,
          vy: (Math.random() - 0.5) * 0.65,
          radius: isSpecial ? Math.random() * 2.2 + 1.8 : Math.random() * 1.5 + 1.0,
          baseAlpha: isSpecial ? 0.9 : Math.random() * 0.4 + 0.4,
          alpha: 0.6,
          pulseSpeed: Math.random() * 0.03 + 0.015,
          pulseOffset: Math.random() * Math.PI * 2,
          isSpecial
        });
      }
    };

    initNodes();

    let tick = 0;

    const render = () => {
      tick += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Pure deep true black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Subtle monochromatic depth gradient in center
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        40,
        width * 0.5,
        height * 0.4,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, 'rgba(16, 16, 16, 0.7)');
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const maxDist = 145;

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        n1.x += n1.vx;
        n1.y += n1.vy;

        // Bounce from walls
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        // Pulsating alpha
        n1.alpha = n1.baseAlpha + Math.sin(tick * 2 + n1.pulseOffset) * 0.2;
        if (n1.alpha < 0.2) n1.alpha = 0.2;

        // Mouse interaction (interactivity)
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = mouse.x - n1.x;
          const mdy = mouse.y - n1.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mDist < mouse.radius) {
            const mAlpha = (1 - mDist / mouse.radius) * 0.7;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${mAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Gentle pull towards cursor
            const force = (1 - mDist / mouse.radius) * 0.25;
            n1.x += (mdx / mDist) * force;
            n1.y += (mdy / mDist) * force;
          }
        }

        // Draw glowing particle node
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${n1.alpha})`;
        ctx.shadowBlur = n1.isSpecial ? 10 : 5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Connect near nodes with crisp, visible monochrome lines
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            const lineAlpha = (1 - dist / maxDist) * 0.35;
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = lineAlpha > 0.2 ? 1.0 : 0.7;
            ctx.stroke();
          }
        }
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
      className="fixed inset-0 pointer-events-none z-0 opacity-100 transition-opacity duration-700"
    />
  );
}

