import React from 'react';

interface LogoSVGProps {
  size?: number;
  className?: string;
}

export default function LogoSVG({ size = 48, className = '' }: LogoSVGProps) {
  // Unique IDs per instance (avoids filter/clipPath conflicts when multiple logos on page)
  const id = React.useId().replace(/:/g, '_');

  // ── Isometric cube vertices in 200×200 viewBox ──────────────────────────────
  // Camera equiv: position [2.8, 2.4, 2.8] fov 42 → 45° azimuth, ~30° elevation
  //   top    = apex vertex
  //   r      = right vertex
  //   f      = front (closest) vertex
  //   l      = left vertex
  //   br,bl  = bottom-right, bottom-left
  //   bot    = bottom vertex
  const V = {
    top: [100, 15],
    r:   [162, 51],
    f:   [100, 87],
    l:   [38,  51],
    br:  [162, 121],
    bl:  [38,  121],
    bot: [100, 157],
  };

  const topPts  = `${V.top} ${V.r} ${V.f} ${V.l}`;
  const rPts    = `${V.r} ${V.f} ${V.bot} ${V.br}`;
  const lPts    = `${V.l} ${V.f} ${V.bot} ${V.bl}`;

  // ── Transform matrices — map [0,1]² → screen face polygon ───────────────────
  // SVG matrix(a,b,c,d,e,f): x' = ax+cy+e,  y' = bx+dy+f
  //
  // Top face:   (0,0)→top(100,15)  (1,0)→r(162,51)  (0,1)→l(38,51)
  const mTop   = 'matrix(62,36,-62,36,100,15)';
  // Right face: (0,0)→f(100,87)    (1,0)→r(162,51)  (0,1)→bot(100,157)
  const mRight = 'matrix(62,-36,0,70,100,87)';
  // Left face:  (0,0)→l(38,51)     (1,0)→f(100,87)  (0,1)→bl(38,121)
  const mLeft  = 'matrix(62,36,0,70,38,51)';

  // ── Design tokens (app/globals.css) ─────────────────────────────────────────
  const OC = 'var(--brand)';        // orange
  const OL = 'var(--logo-amber)';   // amber
  const OW = 'var(--logo-hotspot)'; // white hotspot

  // Block centres in [0,1]² (SVG y-down)
  const BLK = [
    [0.22, 0.22], [0.78, 0.22],   // top row
    [0.22, 0.78], [0.78, 0.78],   // bottom row
  ];
  const BH = 0.165;  // block half-size

  // Bus line positions (5 lines in the centre gap region)
  const busV = [0.42, 0.46, 0.50, 0.54, 0.58];

  // Register-array lines relative to block centre (6 lines)
  const regDY = [-0.095, -0.057, -0.019, 0.019, 0.057, 0.095];

  // Bus-crossing node positions (3×3)
  const nodeV = [0.42, 0.50, 0.58];

  // ── CPU die pattern — drawn in [0,1]² normalised face space ─────────────────
  // vector-effect="non-scaling-stroke" keeps px stroke width constant regardless
  // of the parent matrix transform, so strokes are always crisp at any display size.
  const CPUPattern = () => (
    <g>
      {/* Horizontal bus lines */}
      {busV.map((y, i) => (
        <line key={`hb${i}`}
          x1="0.01" y1={y} x2="0.99" y2={y}
          stroke={OL} strokeWidth="0.9"
          vectorEffect="non-scaling-stroke" opacity="0.78"
        />
      ))}
      {/* Vertical bus lines */}
      {busV.map((x, i) => (
        <line key={`vb${i}`}
          x1={x} y1="0.01" x2={x} y2="0.99"
          stroke={OL} strokeWidth="0.9"
          vectorEffect="non-scaling-stroke" opacity="0.78"
        />
      ))}

      {/* Core blocks */}
      {BLK.map(([cx, cy], i) => (
        <g key={`blk${i}`}>
          {/* Block fill + outline */}
          <rect
            x={cx - BH} y={cy - BH}
            width={BH * 2} height={BH * 2}
            fill={OC} fillOpacity="0.28"
            stroke={OC} strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Register array lines */}
          {regDY.map((dy, j) => (
            <line key={`r${i}${j}`}
              x1={cx - BH + 0.022} y1={cy + dy}
              x2={cx + BH - 0.022} y2={cy + dy}
              stroke={OL} strokeWidth="0.55"
              vectorEffect="non-scaling-stroke" opacity="0.65"
            />
          ))}
          {/* Hotspot glow rings */}
          <circle cx={cx} cy={cy} r="0.065" fill={OC} opacity="0.22" />
          <circle cx={cx} cy={cy} r="0.038" fill={OW} opacity="0.95" />
        </g>
      ))}

      {/* Bus crossing nodes */}
      {nodeV.flatMap((x, i) =>
        nodeV.map((y, j) => (
          <circle key={`n${i}${j}`}
            cx={x} cy={y} r="0.019"
            fill={OL} opacity="0.9"
          />
        ))
      )}
    </g>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dimensys logo"
      role="img"
    >
      <defs>
        {/* Soft glow */}
        <filter id={`glow_${id}`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Brighter glow for edges */}
        <filter id={`eglow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip paths — one per face */}
        <clipPath id={`cp_top_${id}`}><polygon points={topPts} /></clipPath>
        <clipPath id={`cp_r_${id}`}><polygon points={rPts} /></clipPath>
        <clipPath id={`cp_l_${id}`}><polygon points={lPts} /></clipPath>
      </defs>

      {/* ── Face base fills (transparent glass tones) ── */}
      <polygon points={topPts} fill={OC} fillOpacity="0.16" />
      <polygon points={rPts}   fill="var(--logo-face-right)" fillOpacity="0.21" />
      <polygon points={lPts}   fill="var(--logo-face-left)" fillOpacity="0.16" />

      {/* ── CPU die patterns (clipped & glowing) ── */}
      <g clipPath={`url(#cp_top_${id})`} transform={mTop}   filter={`url(#glow_${id})`}>
        <CPUPattern />
      </g>
      <g clipPath={`url(#cp_r_${id})`}   transform={mRight} filter={`url(#glow_${id})`}>
        <CPUPattern />
      </g>
      <g clipPath={`url(#cp_l_${id})`}   transform={mLeft}  filter={`url(#glow_${id})`}>
        <CPUPattern />
      </g>

      {/* ── Glowing wire-frame edges ── */}
      <g stroke={OC} strokeWidth="1.8" fill="none"
         strokeLinejoin="round" filter={`url(#eglow_${id})`}>
        {/* Top face outline */}
        <polygon points={topPts} />
        {/* Three vertical edges */}
        <line x1="100" y1="87"  x2="100" y2="157" />
        <line x1="162" y1="51"  x2="162" y2="121" />
        <line x1="38"  y1="51"  x2="38"  y2="121" />
        {/* Bottom two edges */}
        <line x1="100" y1="157" x2="162" y2="121" />
        <line x1="100" y1="157" x2="38"  y2="121" />
      </g>
    </svg>
  );
}
