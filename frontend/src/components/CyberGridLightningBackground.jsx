import React, { useRef, useEffect } from 'react';

/**
 * CyberGridLightningBackground
 * Matches the hero design in heroVideo.mp4:
 * - Deep dark futuristic cybernetic grid with perspective
 * - Flowing neon emerald & cyan glowing energy ribbons / sine waves
 * - Synchronized lightning flashes (starts dark, surges with lightning at ~1.5s, then pulses with energy)
 * - Lightweight 60 FPS Canvas 2D
 */
const CyberGridLightningBackground = ({ isLightningActive = false }) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let lightningIntensity = 0;
    let lightningCooldown = 40; // Starts dark, triggers after ~1.5s (90 frames at 60fps)

    const animate = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Handle lightning timing: starts dark, strikes around frame 90, then repeats with video loop
      lightningCooldown--;
      if (lightningCooldown <= 0) {
        // Lightning burst
        lightningIntensity = 1.0;
        lightningCooldown = 600; // ~10 seconds loop (matching video duration)
      }

      if (lightningIntensity > 0) {
        lightningIntensity *= 0.88; // Quick decay like real lightning
        if (lightningIntensity < 0.01) lightningIntensity = 0;
      }

      const activeFlash = Math.max(lightningIntensity, isLightningActive ? 0.8 : 0);

      // ─── 1. Cybernetic Grid ───
      const gridSize = 55;
      const gridAlpha = 0.05 + activeFlash * 0.15;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(0, 245, 155, ${gridAlpha})`;

      // Vertical lines
      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Grid intersections glowing dots
      const dotCount = Math.min(Math.floor((width * height) / 45000), 30);
      for (let i = 0; i < dotCount; i++) {
        const gx = ((i * 137.5) % width);
        const gy = ((i * 241.3) % height);
        const pulse = Math.sin(time * 2 + i) * 0.5 + 0.5;
        const radius = 1.5 + pulse * 1.5;
        
        ctx.beginPath();
        ctx.arc(gx, gy, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 
          ? `rgba(0, 245, 155, ${0.2 + pulse * 0.5 + activeFlash * 0.6})` 
          : `rgba(34, 230, 182, ${0.2 + pulse * 0.5 + activeFlash * 0.6})`;
        ctx.fill();
      }

      // ─── 2. Flowing Neon Energy Waves (from hero video) ───
      // Upper flowing wave
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      const grad1 = ctx.createLinearGradient(0, 0, width, height * 0.4);
      grad1.addColorStop(0, 'rgba(0, 245, 155, 0.05)');
      grad1.addColorStop(0.3, `rgba(0, 245, 155, ${0.35 + activeFlash * 0.4})`);
      grad1.addColorStop(0.7, `rgba(6, 182, 212, ${0.3 + activeFlash * 0.4})`);
      grad1.addColorStop(1, 'rgba(0, 245, 155, 0.05)');
      ctx.strokeStyle = grad1;

      for (let x = 0; x <= width; x += 15) {
        const y = height * 0.22 + 
          Math.sin(x * 0.003 + time * 1.2) * 50 + 
          Math.sin(x * 0.007 - time * 0.8) * 25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower flowing wave
      ctx.beginPath();
      ctx.lineWidth = 2;
      const grad2 = ctx.createLinearGradient(0, height * 0.5, width, height);
      grad2.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      grad2.addColorStop(0.4, `rgba(0, 245, 155, ${0.25 + activeFlash * 0.35})`);
      grad2.addColorStop(0.8, `rgba(6, 182, 212, ${0.2 + activeFlash * 0.35})`);
      grad2.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
      ctx.strokeStyle = grad2;

      for (let x = 0; x <= width; x += 15) {
        const y = height * 0.72 + 
          Math.sin(x * 0.004 - time * 1.0) * 45 + 
          Math.cos(x * 0.006 + time * 0.7) * 20;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ─── 3. Lightning Flash Glow ───
      if (activeFlash > 0.05) {
        const flashGrad = ctx.createRadialGradient(
          width * 0.65, height * 0.45, 10,
          width * 0.65, height * 0.45, width * 0.7
        );
        flashGrad.addColorStop(0, `rgba(0, 255, 160, ${activeFlash * 0.28})`);
        flashGrad.addColorStop(0.4, `rgba(6, 182, 212, ${activeFlash * 0.15})`);
        flashGrad.addColorStop(1, 'rgba(2, 9, 12, 0)');
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, width, height);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLightningActive]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default CyberGridLightningBackground;
