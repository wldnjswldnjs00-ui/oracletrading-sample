import { useEffect, useRef, useState } from 'react';

declare const THREE: any;

const TOTAL    = 20;
const SPACING  = 1.6;
const INTERVAL = 30000;

export default function CandleChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

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

    // Camera — closer for bigger candles, FOV tuned per device
    const fov  = mobile ? 60 : 50;
    const dist = mobile ? 14 : 10;
    const camY = 3;
    const camera = new THREE.PerspectiveCamera(fov, canvas.offsetWidth / canvas.offsetHeight, 0.1, 200);
    camera.position.set(0, camY, dist);
    camera.lookAt(0, camY, 0);

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
    let lastClose = 0.3; // start slightly above 0 so first bear can't go negative
    const startX = -(TOTAL - 1) * SPACING / 2;

    function genPrice(idx: number) {
      const isLast  = idx === TOTAL - 1;
      const isPre1  = idx === TOTAL - 2;
      const isPre2  = idx === TOTAL - 3;
      const open    = lastClose;
      let close: number, high: number, low: number;

      if (isLast) {
        // 장대 양봉 피날레
        close = open + (4.5 + Math.random() * 1.0);
        high  = close + Math.random() * 0.3;
        low   = Math.max(0.05, open - Math.random() * 0.1);
      } else if (isPre1) {
        close = open + (1.5 + Math.random() * 0.6);
        high  = close + Math.random() * 0.2;
        low   = Math.max(0.05, open - Math.random() * 0.1);
      } else if (isPre2) {
        close = open + (0.7 + Math.random() * 0.4);
        high  = close + Math.random() * 0.15;
        low   = Math.max(0.05, open - Math.random() * 0.08);
      } else {
        const bull = Math.random() > 0.42;
        if (bull) {
          close = open + (0.15 + Math.random() * 0.3);
          high  = close + Math.random() * 0.1;
          low   = Math.max(0.05, open - Math.random() * 0.05);
        } else {
          // 음봉: close 절대 0 아래로 안 내려감
          close = Math.max(0.1, open - (0.06 + Math.random() * 0.18));
          high  = open + Math.random() * 0.07;
          low   = Math.max(0.05, close - Math.random() * 0.05);
        }
      }

      lastClose = Math.max(0.05, close);
      return {
        open,
        close: lastClose,
        high:  Math.max(lastClose, high),
        low:   Math.max(0.05, low),
        bull:  lastClose >= open,
      };
    }

    function spawnCandle(idx: number) {
      const p     = genPrice(idx);
      const xPos  = startX + idx * SPACING;
      const color = p.bull ? 0x16a34a : 0xdc2626;
      const bodyH = Math.max(0.08, Math.abs(p.close - p.open));
      const bodyY = (p.open + p.close) / 2;
      const grp   = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, bodyH, 0.7),
        new THREE.MeshPhongMaterial({ color, shininess: 120, specular: 0x222222 })
      );
      body.position.set(0, bodyY, 0);
      grp.add(body);

      const wTopH = Math.max(0.01, p.high - Math.max(p.open, p.close));
      if (wTopH > 0.01) {
        const wick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, wTopH, 8),
          new THREE.MeshPhongMaterial({ color })
        );
        wick.position.set(0, Math.max(p.open, p.close) + wTopH / 2, 0);
        grp.add(wick);
      }
      const wBotH = Math.max(0.01, Math.min(p.open, p.close) - p.low);
      if (wBotH > 0.01) {
        const wick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, wBotH, 8),
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
    const MAX_POLAR = Math.PI / 2 - 0.05;

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

    // Render loop — spherical orbit + camera tracks price growth
    let rafId: number;
    const lookAt = new THREE.Vector3(0, camY, 0);
    function animate() {
      rafId = requestAnimationFrame(animate);
      rotY += (targetRotY - rotY) * 0.1;
      rotX += (targetRotX - rotX) * 0.1;

      // Smoothly raise camera as candles grow taller
      const targetY = Math.max(camY, lastClose * 0.5);
      lookAt.y += (targetY - lookAt.y) * 0.02;

      camera.position.x = dist * Math.cos(rotX) * Math.sin(rotY);
      camera.position.z = dist * Math.cos(rotX) * Math.cos(rotY);
      camera.position.y = dist * Math.sin(rotX) + lookAt.y;
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
      style={{ width: '100%', height: isMobile ? '50vh' : '70vh', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 60, background: 'linear-gradient(transparent, #000)',
        pointerEvents: 'none',
      }} />
    </section>
  );
}
