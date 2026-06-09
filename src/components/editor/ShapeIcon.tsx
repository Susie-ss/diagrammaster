"use client";

interface ShapeIconProps {
  type: string;
  size?: number;
}

export default function ShapeIcon({ type, size = 16 }: ShapeIconProps) {
  const s = size;
  const hs = s / 2;
  const stroke = "#9ba5c0";
  const fill = "#ffffff";

  const renderShape = () => {
    switch (type) {
      case "rect":
        return <rect x="1" y="3" width={s - 2} height={s - 6} fill={fill} stroke={stroke} strokeWidth="1" rx="1" />;
      case "rounded-rect":
        return <rect x="1" y="3" width={s - 2} height={s - 6} fill={fill} stroke={stroke} strokeWidth="1" rx="3" />;
      case "ellipse":
        return <ellipse cx={hs} cy={hs} rx={hs - 2} ry={hs - 4} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "diamond":
        return <polygon points={`${hs},1 ${s-1},${hs} ${hs},${s-1} 1,${hs}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "triangle":
        return <polygon points={`${hs},1 ${s-1},${s-2} 1,${s-2}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "hexagon": {
        const off = s * 0.22;
        return <polygon points={`${off},1 ${s-off},1 ${s-1},${hs} ${s-off},${s-1} ${off},${s-1} 1,${hs}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "parallelogram": {
        const off = s * 0.2;
        return <polygon points={`${off},1 ${s-1},1 ${s-off},${s-1} 1,${s-1}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "trapezoid": {
        const off = s * 0.15;
        return <polygon points={`${off},1 ${s-off},1 ${s-1},${s-1} 1,${s-1}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "pentagon": {
        const pts = [];
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          pts.push(`${hs + (hs - 2) * Math.cos(a)},${hs + (hs - 2) * Math.sin(a)}`);
        }
        return <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "star": {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 ? s * 0.22 : s * 0.5;
          pts.push(`${hs + r * Math.cos(a)},${hs + r * Math.sin(a)}`);
        }
        return <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "cross":
        return (
          <g fill={fill} stroke={stroke} strokeWidth="1">
            <rect x={s * 0.35} y="1" width={s * 0.3} height={s - 2} />
            <rect x="1" y={s * 0.35} width={s - 2} height={s * 0.3} />
          </g>
        );
      case "arrow-right":
        return (
          <g>
            <rect x="1" y={s * 0.3} width={s * 0.6} height={s * 0.4} fill={fill} stroke={stroke} strokeWidth="1" />
            <polygon points={`${s * 0.6},${s * 0.15} ${s - 1},${hs} ${s * 0.6},${s * 0.85}`} fill={fill} stroke={stroke} strokeWidth="1" />
          </g>
        );
      case "callout":
        return (
          <g>
            <rect x="1" y="1" width={s - 2} height={s * 0.7} fill={fill} stroke={stroke} strokeWidth="1" rx="2" />
            <polygon points={`${s * 0.3},${s * 0.7} ${s * 0.5},${s - 1} ${s * 0.4},${s * 0.7}`} fill={fill} stroke={stroke} strokeWidth="1" />
          </g>
        );
      case "cylinder": {
        const ey = s * 0.12;
        return (
          <g fill={fill} stroke={stroke} strokeWidth="1">
            <path d={`M1,${ey} L1,${s - ey} A${hs - 1},${ey} 0 0,0 ${s - 1},${s - ey} L${s - 1},${ey}`} />
            <ellipse cx={hs} cy={ey} rx={hs - 1} ry={ey} />
          </g>
        );
      }
      case "document":
        return (
          <g>
            <polygon points={`1,1 ${s - 4},1 ${s - 1},4 ${s - 1},${s - 1} 1,${s - 1}`} fill={fill} stroke={stroke} strokeWidth="1" />
            <polygon points={`${s - 4},1 ${s - 4},4 ${s - 1},4`} fill={stroke} />
          </g>
        );
      case "cloud":
        return <ellipse cx={hs} cy={hs} rx={hs - 2} ry={hs - 4} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "terminal":
        return <rect x="1" y="3" width={s - 2} height={s - 6} fill={fill} stroke={stroke} strokeWidth="1" rx={hs - 3} />;
      case "manual-input":
        return <polygon points={`1,${s * 0.25} ${s - 1},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "off-page":
        return <polygon points={`1,1 ${s - 1},1 ${s - 1},${s * 0.7} ${hs},${s - 1} 1,${s * 0.7}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "preparation": {
        const off = s * 0.22;
        return <polygon points={`${off},1 ${s - off},1 ${s - 1},${hs} ${s - off},${s - 1} ${off},${s - 1} 1,${hs}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      }
      case "delay":
        return (
          <g>
            <rect x="1" y="1" width={s * 0.7} height={s - 2} fill={fill} stroke={stroke} strokeWidth="1" />
            <path d={`M${s * 0.7},1 A${s * 0.3},${(s - 2) / 2} 0 0,1 ${s * 0.7},${s - 1}`} fill="none" stroke={stroke} strokeWidth="1" />
          </g>
        );
      case "uml-class":
        return (
          <g>
            <rect x="1" y="1" width={s - 2} height={s - 2} fill={fill} stroke={stroke} strokeWidth="1" />
            <line x1="1" y1={s * 0.35} x2={s - 1} y2={s * 0.35} stroke={stroke} strokeWidth="0.5" />
            <line x1="1" y1={s * 0.6} x2={s - 1} y2={s * 0.6} stroke={stroke} strokeWidth="0.5" />
          </g>
        );
      case "uml-interface":
        return (
          <g>
            <rect x="1" y="1" width={s - 2} height={s - 2} fill={fill} stroke={stroke} strokeWidth="1" />
            <line x1="1" y1={s * 0.35} x2={s - 1} y2={s * 0.35} stroke={stroke} strokeWidth="0.5" />
            <circle cx={s * 0.7} cy={s * 0.7} r="2" fill="none" stroke={stroke} strokeWidth="0.5" />
          </g>
        );
      case "uml-note":
        return (
          <g>
            <polygon points={`1,1 ${s - 4},1 ${s - 1},4 ${s - 1},${s - 1} 1,${s - 1}`} fill={fill} stroke={stroke} strokeWidth="1" />
          </g>
        );
      case "actor":
        return (
          <g stroke={stroke} strokeWidth="1" fill="none">
            <circle cx={hs} cy={s * 0.25} r="2" />
            <line x1={hs} y1={s * 0.4} x2={hs} y2={s * 0.65} />
            <line x1={s * 0.3} y1={s * 0.5} x2={s * 0.7} y2={s * 0.5} />
            <line x1={hs} y1={s * 0.65} x2={s * 0.3} y2={s - 2} />
            <line x1={hs} y1={s * 0.65} x2={s * 0.7} y2={s - 2} />
          </g>
        );
      case "use-case":
        return <ellipse cx={hs} cy={hs} rx={hs - 2} ry={hs - 3} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "component":
        return (
          <g>
            <rect x="3" y="1" width={s - 4} height={s - 2} fill={fill} stroke={stroke} strokeWidth="1" />
            <rect x="1" y="3" width="3" height="3" fill={fill} stroke={stroke} strokeWidth="0.5" />
            <rect x="1" y={s - 6} width="3" height="3" fill={fill} stroke={stroke} strokeWidth="0.5" />
          </g>
        );
      case "lifeline":
        return (
          <g>
            <rect x={hs - 2} y="1" width="4" height={s * 0.3} fill={fill} stroke={stroke} strokeWidth="0.5" />
            <line x1={hs} y1={s * 0.3} x2={hs} y2={s - 1} stroke={stroke} strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        );
      case "er-entity":
        return <rect x="1" y="3" width={s - 2} height={s - 6} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "er-attr":
        return <ellipse cx={hs} cy={hs} rx={hs - 2} ry={hs - 4} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "er-relation":
        return <polygon points={`${hs},1 ${s-1},${hs} ${hs},${s-1} 1,${hs}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "er-weak-entity":
        return (
          <g>
            <rect x="1" y="3" width={s - 2} height={s - 6} fill="none" stroke={stroke} strokeWidth="1" />
            <rect x="2.5" y="4.5" width={s - 5} height={s - 9} fill={fill} stroke={stroke} strokeWidth="0.5" />
          </g>
        );
      case "server":
        return (
          <g>
            <rect x="1" y="2" width={s - 2} height={s * 0.3} fill={fill} stroke={stroke} strokeWidth="0.5" rx="1" />
            <rect x="1" y={s * 0.4} width={s - 2} height={s * 0.3} fill={fill} stroke={stroke} strokeWidth="0.5" rx="1" />
            <rect x="1" y={s * 0.75} width={s - 2} height={s * 0.2} fill={fill} stroke={stroke} strokeWidth="0.5" rx="1" />
          </g>
        );
      case "database2":
        return (
          <g fill={fill} stroke={stroke} strokeWidth="0.5">
            <ellipse cx={hs} cy="3" rx={hs - 2} ry="2" />
            <path d={`M1,3 L1,${s - 3}`} />
            <path d={`M${s - 1},3 L${s - 1},${s - 3}`} />
            <ellipse cx={hs} cy={s - 3} rx={hs - 2} ry="2" />
          </g>
        );
      case "router":
        return <rect x="1" y="3" width={s - 2} height={s - 6} fill={fill} stroke={stroke} strokeWidth="1" rx="2" />;
      case "firewall":
        return <polygon points={`1,${hs} ${hs},1 ${s-1},${hs} ${hs},${s-1}`} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "cloud-aws":
        return <ellipse cx={hs} cy={hs} rx={hs - 2} ry={hs - 4} fill={fill} stroke={stroke} strokeWidth="1" />;
      case "mobile":
        return <rect x={s * 0.25} y="1" width={s * 0.5} height={s - 2} fill={fill} stroke={stroke} strokeWidth="1" rx="2" />;
      case "monitor":
        return (
          <g>
            <rect x="1" y="1" width={s - 2} height={s * 0.7} fill={fill} stroke={stroke} strokeWidth="1" rx="1" />
            <line x1={hs} y1={s * 0.7} x2={hs} y2={s - 1} stroke={stroke} strokeWidth="0.5" />
            <line x1={s * 0.3} y1={s - 1} x2={s * 0.7} y2={s - 1} stroke={stroke} strokeWidth="0.5" />
          </g>
        );
      default:
        return <rect x="2" y="4" width={s - 4} height={s - 8} fill={fill} stroke={stroke} strokeWidth="1" rx="1" />;
    }
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0">
      {renderShape()}
    </svg>
  );
}
