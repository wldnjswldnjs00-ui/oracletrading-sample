import { useEffect, useRef, useState } from 'react';

declare const THREE: any;

const TOTAL    = 12;
const SPACING  = 1.6;
const INTERVAL = 30000;

export default function CandleChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  // Track mobile breakpoint on resize
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof THREE === 'undefined') {
      console.warn('Oracle Trading: Three.js failed to load — 3D chart disabled');
      return;
    }

    const mobile = window.innerWidth < 768;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const fov  = mobile ? 60 : 45;
    const dist = mobile ? 22 : 18;
    const camera = new THREE.PerspectiveCamera(fov, canvas.offsetWidth / canvas.offsetHeight, 0.1, 200);
    camera.position.set(0, 1.5, dist);
    camera.lookAt(0, 1.8, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 10, 10);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    // Candles
    const candles: any[] = [];
    let lastClose = 0;
    const startX = -(TOTAL - 1) * SPACING / 2;

    function genPrice(idx: number) {
      const isLast    = idx === TOTAL - 1;
      const isPreLast = idx === TOTAL - 2;
      const open = lastClose;
      let close: number, high: number, low: number;

      if (isLast) {
        close = open + (1.8 + Math.random() * 0.8);
        high  = close + Math.random() * 0.2;
        low   = open  - Math.random() * 0.1;
      } else if (isPreLast) {
        close = open + (0.9 + Math.random() * 0.5);
        high  = close + Math.random() * 0.15;
        low   = open  - Math.random() * 0.08;
      } else {
        const bull = Math.random() > 0.42;
        if (bull) {
          close = open + (0.2 + Math.random() * 0.45);
          high  = close + Math.random() * 0.12;
          low   = open  - Math.random() * 0.06;
        } else {
          close = open - (0.08 + Math.random() * 0.22);
          high  = open  + Math.random() * 0.08;
          low   = close - Math.random() * 0.06;
        }
      }
      lastClose = close;
      return { open, close, high, low, bull: close >= open };
    }

    function spawnCandle(idx: number) {
      const p     = genPrice(idx);
      const xPos  = startX + idx * SPACING;
      const color = p.bull ? 0x16a34a : 0xdc2626;
      const bodyH = Math.max(0.06, Math.abs(p.close - p.open));
      const bodyY = (p.open + p.close) / 2;
      const grp   = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, bodyH, 0.65),
        new THREE.MeshPhongMaterial({ color, shininess: 120, specular: 0x222222 })
      );
      body.position.set(0, bodyY, 0);
      grp.add(body);

      const wTopH = Math.max(0.01, p.high - Math.max(p.open, p.close));
      if (wTopH > 0.01) {
        const wick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, wTopH, 8),
          new THREE.MeshPhongMaterial({ color })
        );
        wick.position.set(0, Math.max(p.open, p.close) + wTopH / 2, 0);
        grp.add(wick);
      }
      const wBotH = Math.max(0.01, Math.min(p.open, p.close) - p.low);
      if (wBotH > 0.01) {
        const wick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, wBotH, 8),
          new THREE.MeshPhongMaterial({ color })
        );
        wick.position.set(0, Math.min(p.open, p.close) - wBotH / 2, 0);
        grp.add(wick);
      }

      grp.position.set(xPos, 0, 0);
      grp.scale.set(1, 0.001, 1);
      grp.userData = { appearing: true, t: 0 };
      scene.add(grp);
      candles.push(grp);
    }

    let cidx = 0;
    let spawnTimer: ReturnType<typeof setTimeout>;
    function nextCandle() {
      if (cidx >= TOTAL) return;
      spawnCandle(cidx++);
      if (cidx < TOTAL) spawnTimer = setTimeout(nextCandle, INTERVAL);
    }
    spawnTimer = setTimeout(nextCandle, 600);

    // 360° spherical trackball rotation
    let isDrag = false, prevX = 0, prevY = 0;
    let rotY = 0, rotX = 0, targetRotY = 0, targetRotX = 0;
    const MAX_POLAR = Math.PI / 2 - 0.05; // ~85° — prevents camera flip

    function onPointerDown(x: number, y: number) { isDrag = true; prevX = x; prevY = y; }
    function onPointerUp() { isDrag = false; }
    function onPointerMove(x: number, y: number) {
      if (!isDrag) return;
      targetRotY += (x - prevX) * 0.006;
      targetRotX += (y - prevY) * 0.004;
      targetRotX  = Math.max(-MAX_POLAR, Math.min(MAX_POLAR, targetRotX));
      prevX = x; prevY = y;
    }

    const onMouseDown  = (e: MouseEvent) => onPointerDown(e.clientX, e.clientY);
    const onMouseUp    = () => onPointerUp();
    const onMouseMove  = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd   = () => onPointerUp();
    const onTouchMove  = (e: TouchEvent) => onPointerMove(e.touches[0].clientX, e.touches[0].clientY);

    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup',    onMouseUp);
    window.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    window.addEventListener('touchmove',  onTouchMove, { passive: true });

    function onResize() {
      if (!canvas) return;
      camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    }
    window.addEventListener('resize', onResize);

    // Render loop — spherical orbit
    let rafId: number;
    const lookAt = new THREE.Vector3(0, 1.8, 0);
    function animate() {
      rafId = requestAnimationFrame(animate);
      rotY += (targetRotY - rotY) * 0.1;
      rotX += (targetRotX - rotX) * 0.1;

      // Spherical coordinates for full 360° orbit
      camera.position.x = dist * Math.cos(rotX) * Math.sin(rotY);
      camera.position.z = dist * Math.cos(rotX) * Math.cos(rotY);
      camera.position.y = dist * Math.sin(rotX) + 1.8;
      camera.lookAt(lookAt);

      candles.forEach(grp => {
        if (grp.userData.appearing) {
          grp.userData.t += 0.04;
          const s    = Math.min(1, grp.userData.t);
          const ease = s < 0.5 ? 2 * s * s : -1 + (4 - 2 * s) * s;
          grp.scale.y = ease;
          if (ease >= 1) { grp.scale.y = 1; grp.userData.appearing = false; }
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(spawnTimer);
      canvas.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mouseup',    onMouseUp);
      window.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('resize',     onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <section
      aria-label="3D candlestick chart animation"
      style={{ width: '100%', height: isMobile ? '55vh' : '75vh', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />

      {/* Hero text + stats overlay */}
      <div style={{
        position: 'absolute', bottom: isMobile ? 16 : 60, left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none', width: '100%',
        padding: '0 24px',
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 64px)', fontWeight: 800,
          color: 'white', fontFamily: 'Playfair Display, Georgia, serif',
          lineHeight: 1.1, marginBottom: 10,
        }}>
          Master Your <span style={{ color: '#D4AF37' }}>Investment</span> Strategy
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 1.5vw, 13px)', color: 'rgba(255,255,255,0.65)',
          letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 20,
        }}>
          Professional tools for every trader
        </p>

        {/* Stats badges */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(12px, 3vw, 32px)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#D4AF37', fontSize: 15 }}>👥</span>
            <span className="notranslate" style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>50,000+</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>users worldwide</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#D4AF37', fontSize: 14 }}>✓</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>100% Free</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#D4AF37', fontSize: 14 }}>✓</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>No signup required</span>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 140, background: 'linear-gradient(transparent, #000)',
        pointerEvents: 'none',
      }} />
    </section>
  );
}
