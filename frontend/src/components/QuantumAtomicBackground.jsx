import React, { useRef, useEffect, useCallback } from 'react';

/**
 * QuantumAtomicBackground — Premium Connected-Dots / Constellation Network
 * Inspired by NVIDIA's particle mesh background.
 * Pure Canvas 2D — lightweight, performant, no Three.js required.
 * 
 * Performance optimizations:
 *  - Spatial grid partitioning for O(n) connection checks (vs O(n²))
 *  - Pre-rendered glow sprites via OffscreenCanvas (avoids per-frame gradient creation)
 *  - Batched line drawing with single beginPath per connection pass
 *  - Squared-distance checks to avoid Math.sqrt where possible
 */
const QuantumAtomicBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null });
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const glowCacheRef = useRef({ green: null, cyan: null });

  /* ─── Pre-render glow sprite to offscreen canvas ─── */
  const createGlowSprite = useCallback((r, g, b, size) => {
    const s = size * 2;
    const offscreen = document.createElement('canvas');
    offscreen.width = s;
    offscreen.height = s;
    const octx = offscreen.getContext('2d');
    const grad = octx.createRadialGradient(size, size, 0, size, size, size);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.28)`);
    grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.08)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, s, s);
    return offscreen;
  }, []);

  /* ─── Create particles ─── */
  const createParticles = useCallback((width, height) => {
    // 70 particles gives an identical constellation look with a 4x reduction in distance checks
    const count = Math.min(Math.floor((width * height) / 18000), 75);
    const particles = [];

    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (0.12 + depth * 0.22),
        vy: (Math.random() - 0.5) * (0.12 + depth * 0.22),
        radius: 0.8 + depth * 1.6,
        baseOpacity: 0.3 + depth * 0.4,
        depth,
        isGreen: Math.random() > 0.3,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });

    // Pre-render glow sprites (once)
    const GLOW_SIZE = 24;
    glowCacheRef.current.green = createGlowSprite(0, 210, 106, GLOW_SIZE);
    glowCacheRef.current.cyan = createGlowSprite(6, 182, 212, GLOW_SIZE);

    /* ─── Resize with capped DPR (prevents 4K fill-rate choking) ─── */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const rect = canvas.getBoundingClientRect();
      dimensionsRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    /* ─── Mouse tracking ─── */
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    /* ─── Config ─── */
    const CONNECTION_DIST = 140;
    const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
    const MOUSE_RADIUS = 180;
    const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
    const MOUSE_ATTRACT = 0.00006;
    const CELL_SIZE = CONNECTION_DIST;

    /* ─── Spatial Grid helpers ─── */
    const buildGrid = (particles, w, h) => {
      const cols = Math.ceil(w / CELL_SIZE) + 1;
      const rows = Math.ceil(h / CELL_SIZE) + 1;
      const grid = new Array(cols * rows);
      for (let i = 0; i < grid.length; i++) grid[i] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
          grid[cy * cols + cx].push(i);
        }
      }
      return { grid, cols, rows };
    };

    let isVisible = true;

    /* ─── Optimized Animation loop ─── */
    const animate = () => {
      if (!isVisible) {
        animFrameRef.current = null;
        return;
      }

      const { width, height } = dimensionsRef.current;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const len = particles.length;

      /* Update positions */
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;

        if (mouse.x !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < MOUSE_RADIUS_SQ && dSq > 1) {
            p.vx += dx * MOUSE_ATTRACT;
            p.vy += dy * MOUSE_ATTRACT;
          }
        }

        p.vx *= 0.998;
        p.vy *= 0.998;

        const speedSq = p.vx * p.vx + p.vy * p.vy;
        if (speedSq < 0.002) {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
        }
      }

      /* ─── Build spatial grid ─── */
      const { grid, cols, rows } = buildGrid(particles, width, height);

      /* ─── Draw connections: BATCHED INTO A SINGLE STROKE PASS ─── */
      ctx.beginPath();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(0, 245, 155, 0.16)';

      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const cellIdx = cy * cols + cx;
          const cell = grid[cellIdx];
          if (cell.length === 0) continue;

          // Check this cell + 4 neighbors
          const neighbors = [
            cellIdx,
            cx + 1 < cols ? cellIdx + 1 : -1,
            cy + 1 < rows ? cellIdx + cols : -1,
            cx + 1 < cols && cy + 1 < rows ? cellIdx + cols + 1 : -1,
            cx - 1 >= 0 && cy + 1 < rows ? cellIdx + cols - 1 : -1,
          ];

          for (let ni = 0; ni < neighbors.length; ni++) {
            const nIdx = neighbors[ni];
            if (nIdx < 0) continue;
            const neighbor = grid[nIdx];
            if (!neighbor || neighbor.length === 0) continue;

            for (let a = 0; a < cell.length; a++) {
              const pi = cell[a];
              const pa = particles[pi];
              const jStart = nIdx === cellIdx ? a + 1 : 0;

              for (let b = jStart; b < neighbor.length; b++) {
                const pj = neighbor[b];
                const pb = particles[pj];
                const dx = pa.x - pb.x;
                const dy = pa.y - pb.y;
                const dSq = dx * dx + dy * dy;

                if (dSq < CONNECTION_DIST_SQ) {
                  ctx.moveTo(pa.x, pa.y);
                  ctx.lineTo(pb.x, pb.y);
                }
              }
            }
          }
        }
      }
      ctx.stroke(); // Single draw call for all connection lines!

      /* ─── Mouse connections: BATCHED (cyan) ─── */
      if (mouse.x !== null && mouse.y !== null) {
        ctx.beginPath();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        for (let i = 0; i < len; i++) {
          const p = particles[i];
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dSq = dx * dx + dy * dy;

          if (dSq < MOUSE_RADIUS_SQ) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
          }
        }
        ctx.stroke();

        // Subtle mouse glow
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 45);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 45, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      /* ─── Draw particles with cached glow sprites ─── */
      const greenGlow = glowCacheRef.current.green;
      const cyanGlow = glowCacheRef.current.cyan;

      for (let i = 0; i < len; i++) {
        const p = particles[i];
        const sprite = p.isGreen ? greenGlow : cyanGlow;
        const glowSize = p.radius * 4;
        ctx.globalAlpha = p.baseOpacity;
        ctx.drawImage(sprite, p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);
      }

      // Batch all green dots in one draw call
      ctx.fillStyle = 'rgb(0, 210, 106)';
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        if (p.isGreen) {
          ctx.moveTo(p.x + p.radius, p.y);
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Batch all cyan dots in one draw call
      ctx.fillStyle = 'rgb(6, 182, 212)';
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        if (!p.isGreen) {
          ctx.moveTo(p.x + p.radius, p.y);
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    /* ─── Pause when hero section is scrolled offscreen ─── */
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible && !animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }, { threshold: 0.05 });

    observer.observe(canvas);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [createParticles, createGlowSprite]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};

export default QuantumAtomicBackground;
