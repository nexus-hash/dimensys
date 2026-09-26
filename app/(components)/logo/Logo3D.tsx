'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useHasMounted } from '../../(hooks)/useHasMounted';

// ── Cube geometry constants ───────────────────────────────────────────────────
const H  = 0.72;        // half-size of cube
const FS = H * 2;       // face size (= 1.44)
const EO = H + 0.004;   // face panel / edge offset

// ── Resolve a design token from app/globals.css at runtime ────────────────────
// Canvas2D and Three.js need real color strings (not CSS `var()`), so tokens
// are read from the computed style instead of being hardcoded here.
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// ── Paint the CPU-die circuit onto a canvas → Three.js texture ───────────────
function makeCPUTexture(): THREE.CanvasTexture {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const g = c.getContext('2d')!;

  // ── glass background ──
  g.clearRect(0, 0, N, N);
  g.fillStyle = 'rgba(100, 30, 0, 0.18)';
  g.fillRect(0, 0, N, N);

  // ── bus lines (5 H + 5 V) ──
  const busPos = [N * 0.38, N * 0.44, N * 0.50, N * 0.56, N * 0.62];
  g.strokeStyle = token('--logo-amber', 'orange');
  g.lineWidth = 2.5;
  g.globalAlpha = 0.78;
  busPos.forEach(p => {
    g.beginPath(); g.moveTo(6, p); g.lineTo(N - 6, p); g.stroke();
    g.beginPath(); g.moveTo(p, 6); g.lineTo(p, N - 6); g.stroke();
  });

  // ── 4 core blocks ──
  const PAD  = N * 0.07;
  const BSZ  = N * 0.31;
  const CORNERS = [
    [PAD,        PAD       ],
    [N-PAD-BSZ,  PAD       ],
    [PAD,        N-PAD-BSZ ],
    [N-PAD-BSZ,  N-PAD-BSZ ],
  ];

  CORNERS.forEach(([bx, by]) => {
    const cx = bx + BSZ / 2;
    const cy = by + BSZ / 2;

    // block fill
    g.globalAlpha = 0.28;
    g.fillStyle = token('--logo-face-right', 'orangered');
    g.fillRect(bx, by, BSZ, BSZ);

    // block outline
    g.globalAlpha = 1.0;
    g.strokeStyle = token('--brand', 'darkorange');
    g.lineWidth = 3.5;
    g.strokeRect(bx + 1, by + 1, BSZ - 2, BSZ - 2);

    // register-array lines (8 horizontal lines)
    g.globalAlpha = 0.62;
    g.strokeStyle = token('--logo-amber-light', 'orange');
    g.lineWidth = 2.0;
    const margin = BSZ * 0.10;
    for (let i = 0; i < 8; i++) {
      const ly = by + BSZ * 0.10 + i * (BSZ * 0.112);
      if (ly < by + BSZ - margin) {
        g.beginPath();
        g.moveTo(bx + margin, ly);
        g.lineTo(bx + BSZ - margin, ly);
        g.stroke();
      }
    }

    // hotspot glow
    g.globalAlpha = 1.0;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, BSZ * 0.20);
    grad.addColorStop(0.00, token('--logo-hotspot', 'white'));
    grad.addColorStop(0.30, 'rgba(255,200,80,0.90)');
    grad.addColorStop(0.70, 'rgba(255,80, 0, 0.30)');
    grad.addColorStop(1.00, 'rgba(255,80, 0, 0.00)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, BSZ * 0.20, 0, Math.PI * 2);
    g.fill();

    // solid white core dot
    g.fillStyle = token('--logo-hotspot', 'white');
    g.beginPath();
    g.arc(cx, cy, 7, 0, Math.PI * 2);
    g.fill();
  });

  // ── bus-crossing nodes (3×3 grid) ──
  g.fillStyle = token('--logo-amber-bright', 'gold');
  g.globalAlpha = 0.88;
  [N * 0.38, N * 0.50, N * 0.62].forEach(x =>
    [N * 0.38, N * 0.50, N * 0.62].forEach(y => {
      g.beginPath();
      g.arc(x, y, 5.5, 0, Math.PI * 2);
      g.fill();
    })
  );

  g.globalAlpha = 1.0;
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ── 6 face panels — one plane per face, front-side only ───────────────────────
// Using THREE.FrontSide means the back 3 faces (pointing away from camera) are
// automatically invisible — no depth-sorting chaos, no bleed-through.
function FacePanels({ tex }: { tex: THREE.CanvasTexture }) {
  const faces: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
    { pos: [0, 0,  EO], rot: [0, 0, 0] },                // front  +Z
    { pos: [0, 0, -EO], rot: [0, Math.PI, 0] },           // back   -Z
    { pos: [0,  EO, 0], rot: [-Math.PI / 2, 0, 0] },      // top    +Y
    { pos: [0, -EO, 0], rot: [Math.PI / 2, 0, 0] },       // bottom -Y
    { pos: [ EO, 0, 0], rot: [0,  Math.PI / 2, 0] },      // right  +X
    { pos: [-EO, 0, 0], rot: [0, -Math.PI / 2, 0] },      // left   -X
  ];

  return (
    <>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot}>
          <planeGeometry args={[FS, FS]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0.90}
            side={THREE.FrontSide}
          />
        </mesh>
      ))}
    </>
  );
}

// ── 12 glowing wire-frame edges ───────────────────────────────────────────────
function CubeEdges() {
  const T = 0.009;
  const edges: Array<{ p: [number, number, number]; s: [number, number, number] }> = [
    { p: [0,  H,  H], s: [H*2, T, T] }, { p: [0,  H, -H], s: [H*2, T, T] },
    { p: [-H, H,  0], s: [T, T, H*2] }, { p: [ H, H,  0], s: [T, T, H*2] },
    { p: [0, -H,  H], s: [H*2, T, T] }, { p: [0, -H, -H], s: [H*2, T, T] },
    { p: [-H,-H,  0], s: [T, T, H*2] }, { p: [ H,-H,  0], s: [T, T, H*2] },
    { p: [-H, 0,  H], s: [T, H*2, T] }, { p: [ H, 0,  H], s: [T, H*2, T] },
    { p: [-H, 0, -H], s: [T, H*2, T] }, { p: [ H, 0, -H], s: [T, H*2, T] },
  ];
  return (
    <>
      {edges.map((e, i) => (
        <mesh key={i} position={e.p}>
          <boxGeometry args={e.s} />
          <meshBasicMaterial color={token('--brand', 'darkorange')} />
        </mesh>
      ))}
    </>
  );
}

// ── Main 3D scene ─────────────────────────────────────────────────────────────
function CubeScene() {
  const tex = useMemo(() => makeCPUTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);

  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.004;
  });

  return (
    // Initial isometric tilt  (x: 24°, y: 45°)
    <group ref={ref} rotation={[0.42, 0.78, 0]}>
      {/* Translucent glass cube body — mostly opaque so back faces are blocked */}
      <mesh>
        <boxGeometry args={[FS, FS, FS]} />
        <meshStandardMaterial
          color={token('--logo-body', 'orangered')}
          emissive={token('--logo-emissive', 'red')}
          emissiveIntensity={0.40}
          transparent
          opacity={0.60}
          roughness={0.05}
          metalness={0}
          depthWrite={true}
          side={THREE.BackSide}   // renders the inner surfaces, not the outer
        />
      </mesh>

      {/* Wire-frame edges */}
      <CubeEdges />

      {/* Circuit panels on all 6 faces */}
      <FacePanels tex={tex} />

      {/* Warm inner glow */}
      <pointLight color={token('--brand', 'darkorange')} intensity={1.5} distance={3.5} decay={2} />
    </group>
  );
}

// ── Exported Logo3D component ─────────────────────────────────────────────────
interface Logo3DProps {
  size?: number;
  className?: string;
  disableNavigation?: boolean;
}

export default function Logo3D({
  size = 64,
  className = '',
  disableNavigation = false,
}: Logo3DProps) {
  const router = useRouter();
  const mounted = useHasMounted();
  const [isZoomed, setIsZoomed] = useState(false);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (clickTimer.current) clearTimeout(clickTimer.current); };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disableNavigation) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setIsZoomed(true);          // double-click → fullscreen
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        router.push('/');         // single-click → home
      }, 250);
    }
  };

  if (!mounted) {
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return (
    <>
      {/* ── Inline logo ───────────────────────────────────────────────────── */}
      <div
        style={{ width: size, height: size }}
        className={`relative select-none cursor-pointer ${className}`}
        onClick={handleClick}
      >
        <Canvas
          camera={{ position: [2.8, 2.4, 2.8], fov: 42 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[6, 9, 6]} intensity={1.0} />
          <CubeScene />
        </Canvas>
      </div>

      {/* ── Fullscreen zoom modal ─────────────────────────────────────────── */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[9999] backdrop-blur-xl bg-black/88 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-orange-500/30 text-white cursor-pointer transition-all duration-300 z-[10000]"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div
            className="w-[80vmin] h-[80vmin] max-w-[700px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Logo3D size={700} className="w-full h-full" disableNavigation />
          </div>
          <p className="absolute bottom-8 text-xs text-white/30 select-none pointer-events-none">
            Double-click to open · Single-click to go home · Click outside to close
          </p>
        </div>
      )}
    </>
  );
}
