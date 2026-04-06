import { useEffect, useRef } from 'react';

declare const THREE: any;

const TOTAL    = 12;
const SPACING  = 1.6;
const INTERVAL = 30000; // 1 candle per 30 seconds

export default function CandleChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof THREE === 'undefined') return;

    const canvas = canvasRef.current;
    const isMobile = window.innerWidth < 768;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const fov = isMobile ? 60 : 45;
    const camera = new THREE.PerspectiveCamera(fov, canvas.offsetWidth / canvas.offsetHeight, 0.1, 200);
    camera.position.set(0, 1.5, isMobile ? 22 : 18);
    camera.lookAt(0, 1.8, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 10, 10);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    // State
    const candles: any[] = [];
    let lastClose = 0;
    const startX = -(TOTAL - 1) * SPACING / 2;

    // Price generator
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

    // Spawn candle mesh
    function spawnCandle(idx: number) {
      const p     = genPrice(idx);
      const xPos  = startX + idx * SPACING;
      const color = p.bull ? 0x16a34a : 0xdc2626;

      const bodyH = Math.max(0.06, Math.abs(p.close - p.open));
      const bodyY = (p.open + p.close) / 2;

      const grp = new THREE.Group();

      // Body
      const bGeo = new THREE.BoxGeometry(0.65, bodyH, 0.65);
      const bMat = new THREE.MeshPhongMaterial({ color, shininess: 120, specular: 0x222222 });
      const body = new THREE.Mesh(bGeo, bMat);
      body.position.set(0, bodyY, 0);
      grp.add(body);

      // Top wick
      const wTopH = Math.max(0.01, p.high - Math.max(p.open, p.close));
      if (wTopH > 0.01) {
        const wGeo = new THREE.CylinderGeometry(0.055, 0.055, wTopH, 8);
        const wick = new THREE.Mesh(wGeo, new THREE.MeshPhongMaterial({ color }));
        wick.position.set(0, Math.max(p.open, p.close) + wTopH / 2, 0);
        grp.add(wick);
      }
      // Bottom wick
      const wBotH = Math.max(0.01, Math.min(p.open, p.close) - p.low);
      if (wBotH > 0.01) {
        const wGeo = new THREE.CylinderGeometry(0.055, 0.055, wBotH, 8);
        const wick = new THREE.Mesh(wGeo, new THREE.MeshPhongMaterial({ color }));
        wick.position.set(0, Math.min(p.open, p.close) - wBotH / 2, 0);
        grp.add(wick);
      }

      grp.position.set(xPos, 0, 0);
      grp.scale.set(1, 0.001, 1);
      grp.userData = { appearing: true, t: 0 };

      scene.add(grp);
      candles.push(grp);
    }

    // Spawn sequence
    let cidx = 0;
    let spawnTimer: ReturnType<typeof setTimeout>;
    function nextCandle() {
      if (cidx >= TOTAL) return;
      spawnCandle(cidx++);
      if (cidx < TOTAL) spawnTimer = setTimeout(nextCandle, INTERVAL);
    }
    spawnTimer = setTimeout(nextCandle, 600);

    // Mouse / touch drag
    let isDrag = false, prevX = 0, prevY = 0;
    let rotY = 0, rotX = 0, targetRotY = 0, targetRotX = 0;

    function onPointerDown(x: number, y: number) { isDrag = true; prevX = x; prevY = y; }
    function onPointerUp() { isDrag = false; }
    function onPointerMove(x: number, y: number) {
      if (!isDrag) return;
      targetRotY += (x - prevX) * 0.006;
      targetRotX += (y - prevY) * 0.004;
      targetRotX  = Math.max(-0.6, Math.min(0.6, targetRotX));
      prevX = x; prevY = y;
    }

    const onMouseDown  = (e: MouseEvent)  => onPointerDown(e.clientX, e.clientY);
    const onMouseUp    = ()               => onPointerUp();
    const onMouseMove  = (e: MouseEvent)  => onPointerMove(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent)  => onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd   = ()               => onPointerUp();
    const onTouchMove  = (e: TouchEvent)  => onPointerMove(e.touches[0].clientX, e.touches[0].clientY);

    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup',    onMouseUp);
    window.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd);
    window.addEventListener('touchmove',  onTouchMove, { passive: true });

    // Resize
    function onResize() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // Render loop
    let rafId: number;
    const dist = isMobile ? 22 : 18;
    function animate() {
      rafId = requestAnimationFrame(animate);
      rotY += (targetRotY - rotY) * 0.1;
      rotX += (targetRotX - rotX) * 0.1;
      camera.position.x = Math.sin(rotY) * dist;
      camera.position.z = Math.cos(rotY) * dist;
      camera.position.y = 1.5 + rotX * 6;
      camera.lookAt(0, 1.8, 0);

      candles.forEach(grp => {
        if (grp.userData.appearing) {
          grp.userData.t += 0.04;
          const s = Math.min(1, grp.userData.t);
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

  const isMobileHeight = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <section style={{ width: '100%', height: isMobileHeight ? '60vh' : '100vh', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />

      {/* Hero text overlay */}
      <div style={{
        position: 'absolute', bottom: 70, left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none', width: '100%',
        padding: '0 24px',
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 64px)', fontWeight: 800,
          color: 'white', fontFamily: 'Playfair Display, Georgia, serif',
          lineHeight: 1.1, marginBottom: 12,
        }}>
          Master Your <span style={{ color: '#D4AF37' }}>Investment</span> Strategy
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 1.5vw, 13px)', color: 'rgba(255,255,255,0.4)',
          letterSpacing: '2px', textTransform: 'uppercase',
        }}>
          Professional tools for every trader
        </p>
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
