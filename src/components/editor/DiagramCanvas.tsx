"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

// ======================== TYPES ========================
export interface DiagramNode {
  id: string; type: string; x: number; y: number; width: number; height: number;
  fill: string; stroke: string; sw: number; ls: string; cr: number; opacity: number;
  text: string; fs: number; ff: string; fb: boolean; fi: boolean; fu: boolean; fc: string; ta: string;
  parentId: string | null; collapsed: boolean; rot: number; isMM: boolean; isSw: boolean; isFD: boolean;
}

export interface DiagramConn {
  id: string; fromId: string; toId: string; style: string; stroke: string;
  sw: number; ls: string; arrowEnd: boolean; label: string;
}

export interface DiagramPath {
  id: string; tool: string; color: string; width: number; pts: { x: number; y: number }[];
}

export interface DiagramState {
  nodes: DiagramNode[]; conns: DiagramConn[]; paths: DiagramPath[];
  mode: string;
}

// ======================== CONSTANTS ========================
const PALETTE = ["#ffffff","#f3f4f6","#e5e7eb","#d1d5db","#fecaca","#fed7aa","#fef3c7","#d1fae5","#bfdbfe","#ddd6fe","#fbcfe8","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#b91c1c","#c2410c","#a16207","#15803d","#1d4ed8","#6d28d9","#be185d","#1a1a2e","#374151","#4b5563"];
// ——— 思维导图主题系统 ———
// 每个主题定义：7 层深度的填充/描边/文字色 + 连线色 + 网格色
const MM_THEMES: Record<string, {
  name: string; nameZh: string;
  fills: string[]; strokes: string[]; texts: string[];
  connStroke: string; gridColor: string;
}> = {
  "sky": {
    name: "Sky", nameZh: "天空蓝",
    fills: ["#e8f0fe","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#4a90d9","#9ba5c0","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#0f172a","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#9ba5c0", gridColor: "#e8ecf4",
  },
  "indigo": {
    name: "Indigo", nameZh: "靛青紫",
    fills: ["#ede9fe","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#7c3aed","#a78bfa","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#2e1065","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#a78bfa", gridColor: "#f0eeff",
  },
  "emerald": {
    name: "Emerald", nameZh: "翡翠绿",
    fills: ["#ecfdf5","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#10b981","#6ee7b7","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#022c22","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#6ee7b7", gridColor: "#ecf6f0",
  },
  "amber": {
    name: "Amber", nameZh: "琥珀橙",
    fills: ["#fff7ed","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#f59e0b","#fbbf24","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#431407","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#fbbf24", gridColor: "#faf5ec",
  },
  "rose": {
    name: "Rose", nameZh: "玫瑰粉",
    fills: ["#fff1f2","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#f43f5e","#fda4af","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#4c0519","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#fda4af", gridColor: "#fdf0f0",
  },
  "violet": {
    name: "Violet", nameZh: "紫罗兰",
    fills: ["#f5f3ff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#8b5cf6","#c4b5fd","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#2e1065","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#c4b5fd", gridColor: "#f2efff",
  },
  "slate": {
    name: "Slate", nameZh: "岩石灰",
    fills: ["#f1f5f9","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],
    strokes: ["#64748b","#94a3b8","#bcc3d8","#ccd2e5","#ccd2e5","#ccd2e5","#ccd2e5"],
    texts: ["#020617","#1e293b","#334155","#334155","#334155","#334155","#334155"],
    connStroke: "#94a3b8", gridColor: "#eef0f4",
  },
};

// ——— 参考图样式：白底 + 浅蓝灰描边 ———
const NODE_STROKE = "#9ba5c0";  // 浅蓝灰描边
const NODE_FILL = "#ffffff";    // 白色填充
const NODE_TEXT = "#1e293b";    // 深色文字（slate-800，清晰可读）
const CONN_STROKE = "#9ba5c0";  // 连线颜色
const CONN_LABEL_TEXT = "#6b7280"; // 连线标签文字

const DIMS: Record<string,[number,number]> = {
  rect:[140,56],"rounded-rect":[140,56],diamond:[130,76],ellipse:[130,64],
  parallelogram:[140,56],trapezoid:[130,60],pentagon:[110,90],triangle:[100,78],
  hexagon:[120,56],star:[70,70],cross:[70,70],"arrow-right":[130,52],callout:[140,70],
  cylinder:[120,80],document:[130,90],cloud:[150,88],terminal:[150,52],
  "manual-input":[130,60],"off-page":[120,70],preparation:[130,56],delay:[130,56],
  "swimlane-h":[500,250],"swimlane-v":[250,500],"group-box":[400,300],
  "uml-class":[180,100],"uml-interface":[160,70],"uml-note":[150,80],
  actor:[44,70],"use-case":[140,66],component:[160,90],lifeline:[80,120],
  "er-entity":[160,56],"er-attr":[130,56],"er-relation":[130,70],"er-weak-entity":[160,60],
  server:[120,80],database:[100,80],router:[120,80],firewall:[100,80],
  "cloud-aws":[150,88],mobile:[60,100],monitor:[140,80],mindmap:[120,36]
};

// 所有图形统一使用白底+浅蓝灰描边
const DEFS: Record<string,{fill:string;stroke:string}> = {
  rect:{fill:NODE_FILL,stroke:NODE_STROKE},
  "rounded-rect":{fill:NODE_FILL,stroke:NODE_STROKE},
  diamond:{fill:NODE_FILL,stroke:NODE_STROKE},
  ellipse:{fill:NODE_FILL,stroke:NODE_STROKE},
  parallelogram:{fill:NODE_FILL,stroke:NODE_STROKE},
  trapezoid:{fill:NODE_FILL,stroke:NODE_STROKE},
  pentagon:{fill:NODE_FILL,stroke:NODE_STROKE},
  triangle:{fill:NODE_FILL,stroke:NODE_STROKE},
  hexagon:{fill:NODE_FILL,stroke:NODE_STROKE},
  star:{fill:NODE_FILL,stroke:NODE_STROKE},
  cross:{fill:NODE_FILL,stroke:NODE_STROKE},
  "arrow-right":{fill:NODE_FILL,stroke:NODE_STROKE},
  callout:{fill:NODE_FILL,stroke:NODE_STROKE},
  cylinder:{fill:NODE_FILL,stroke:NODE_STROKE},
  document:{fill:NODE_FILL,stroke:NODE_STROKE},
  cloud:{fill:NODE_FILL,stroke:NODE_STROKE},
  terminal:{fill:NODE_FILL,stroke:NODE_STROKE},
  "manual-input":{fill:NODE_FILL,stroke:NODE_STROKE},
  "off-page":{fill:NODE_FILL,stroke:NODE_STROKE},
  preparation:{fill:NODE_FILL,stroke:NODE_STROKE},
  delay:{fill:NODE_FILL,stroke:NODE_STROKE},
  "swimlane-h":{fill:"#f8f9fc",stroke:NODE_STROKE},
  "swimlane-v":{fill:"#f8f9fc",stroke:NODE_STROKE},
  "group-box":{fill:"transparent",stroke:"#c8cfe0"},
  "uml-class":{fill:NODE_FILL,stroke:NODE_STROKE},
  "uml-interface":{fill:NODE_FILL,stroke:NODE_STROKE},
  "uml-note":{fill:"#fffde7",stroke:NODE_STROKE},
  actor:{fill:"transparent",stroke:NODE_STROKE},
  "use-case":{fill:NODE_FILL,stroke:NODE_STROKE},
  component:{fill:NODE_FILL,stroke:NODE_STROKE},
  lifeline:{fill:NODE_FILL,stroke:NODE_STROKE},
  "er-entity":{fill:NODE_FILL,stroke:NODE_STROKE},
  "er-attr":{fill:NODE_FILL,stroke:NODE_STROKE},
  "er-relation":{fill:NODE_FILL,stroke:NODE_STROKE},
  "er-weak-entity":{fill:NODE_FILL,stroke:NODE_STROKE},
  server:{fill:NODE_FILL,stroke:NODE_STROKE},
  database2:{fill:NODE_FILL,stroke:NODE_STROKE},
  router:{fill:NODE_FILL,stroke:NODE_STROKE},
  firewall:{fill:NODE_FILL,stroke:NODE_STROKE},
  "cloud-aws":{fill:NODE_FILL,stroke:NODE_STROKE},
  mobile:{fill:NODE_FILL,stroke:NODE_STROKE},
  monitor:{fill:NODE_FILL,stroke:NODE_STROKE}
};

const TEXT_DEFS: Record<string,string> = {
  diamond:"判断",ellipse:"开始/结束","swimlane-h":"泳道","swimlane-v":"泳道","group-box":"分组",
  actor:"Actor",terminal:"开始/结束","uml-class":"ClassName\n──────\n属性\n方法","uml-interface":"«接口»\n方法",
  "uml-note":"注释",server:"服务器",database2:"数据库",router:"路由器",firewall:"防火墙",
  mobile:"移动端",monitor:"计算机",cloud:"Cloud","cloud-aws":"AWS Cloud",
  "er-entity":"Entity","er-attr":"attribute","er-relation":"关系",lifeline:":Object",
  "use-case":"用例",component:"Component"
};

// ======================== CANVAS UTILS ========================
function rrP(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w/2, h/2);
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}

let _nid = 1;
function gid() { return "n" + (_nid++); }

function toCv(mx: number, my: number, el: HTMLElement, zoom: number, panX: number, panY: number) {
  const r = el.getBoundingClientRect();
  return { x: (mx - r.left - panX) / zoom, y: (my - r.top - panY) / zoom };
}

// ======================== ENGINE ========================
export class DiagramEngine {
  nodes: DiagramNode[] = [];
  conns: DiagramConn[] = [];
  paths: DiagramPath[] = [];
  mode = "flowchart";
  zoom = 1; panX = 0; panY = 0;
  sel = new Set<string>(); selConn: DiagramConn | null = null;
  hover: string | null = null; linking: string | null = null; linkStyle = "orthogonal";
  theme = "sky"; snapping = true; gs = 20; showGrid = true;
  undos: any[] = []; redos: any[] = [];
  dragging = false; resizing = false; drawing = false; panning = false;
  ds: any = null; rh: string | null = null;
  editNode: DiagramNode | null = null; curPath: DiagramPath | null = null;
  spaceDown = false;
  marqueeMode = "partial"; marqueeActive = false; marqueeStart: {x:number;y:number} | null = null; marqueeEnd: {x:number;y:number} | null = null;
  fmtBrush: any = null; fmtBrushOn = false;
  // Free draw
  freeDrawSubTool = "pencil"; freeDrawTool = "pen"; freeDrawColor = "#1e293b"; freeDrawWidth = 2; freeDrawEraser = false; freeDrawFill = false; eraserSize = 24;
  drawingRect = false; drawingLine = false;
  rectStart: {x:number;y:number} | null = null; rectPreview: {x:number;y:number;w:number;h:number} | null = null;
  lineStart: {x:number;y:number} | null = null; linePreview: {sx:number;sy:number;ex:number;ey:number} | null = null;
  canvas: HTMLCanvasElement | null = null; ctx: CanvasRenderingContext2D | null = null;
  onToast?: (msg: string) => void;
  onStateChange?: (state: DiagramState) => void;

  load(data: DiagramState) {
    this.nodes = data.nodes || [];
    this.conns = data.conns || [];
    this.paths = data.paths || [];
    this.mode = data.mode || "flowchart";
    this.sel.clear(); this.selConn = null;
  }

  getState(): DiagramState {
    return { nodes: this.nodes, conns: this.conns, paths: this.paths, mode: this.mode };
  }

  // Undo
  pu() {
    this.undos.push(JSON.parse(JSON.stringify({ nodes: this.nodes, conns: this.conns, paths: this.paths })));
    if (this.undos.length > 80) this.undos.shift();
    this.redos = [];
  }
  undo() { if (!this.undos.length) return; this.redos.push(this.snap()); this.apply(this.undos.pop()!); this.sel.clear(); this.render(); }
  redo() { if (!this.redos.length) return; this.undos.push(this.snap()); this.apply(this.redos.pop()!); this.sel.clear(); this.render(); }
  snap() { return JSON.parse(JSON.stringify({ nodes: this.nodes, conns: this.conns, paths: this.paths })); }
  apply(p: any) { this.nodes = p.nodes; this.conns = p.conns; this.paths = p.paths; }

  // Node helpers
  gn(id: string) { return this.nodes.find(n => n.id === id); }
  gc(pid: string) { return this.nodes.filter(n => n.parentId === pid); }

  mkNode(type: string, x: number, y: number, pid: string | null): DiagramNode {
    const [w, h] = DIMS[type] || [140, 56];
    const d = DEFS[type] || { fill: NODE_FILL, stroke: NODE_STROKE };
    // rounded-rect 圆角更大，接近参考图的圆角矩形
    const cornerRadius = type === "rounded-rect" || type === "terminal" ? 16 : (type === "mindmap" ? 8 : 2);
    return {
      id: gid(), type, x, y, width: w, height: h, fill: d.fill, stroke: d.stroke,
      sw: 1.5, ls: "solid", cr: cornerRadius, opacity: 100,
      text: TEXT_DEFS[type] || "文本", fs: 13, ff: "PingFang SC",
      fb: type === "mindmap", fi: false, fu: false, fc: NODE_TEXT, ta: "center",
      parentId: pid || null, collapsed: false, rot: 0, isMM: type === "mindmap",
      isSw: type.startsWith("swimlane"),
      isFD: false
    };
  }

  // Hit testing
  hitN(mx: number, my: number): DiagramNode | null {
    const p = toCv(mx, my, this.canvas!, this.zoom, this.panX, this.panY);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (this.mode === "freedraw" && !n.isFD) continue;
      if (this.mode === "mindmap" && !n.isMM) continue;
      if (this.mode === "flowchart" && (n.isMM || n.isFD)) continue;
      if (this.htN(n, p.x, p.y)) return n;
    }
    return null;
  }
  htN(n: DiagramNode, px: number, py: number): boolean {
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    const hw = n.width / 2, hh = n.height / 2;
    switch (n.type) {
      case "ellipse": case "use-case": case "er-attr":
        return ((px - cx) ** 2) / (hw ** 2) + ((py - cy) ** 2) / (hh ** 2) <= 1;
      case "diamond": case "er-relation": {
        const dx = Math.abs(px - cx), dy = Math.abs(py - cy);
        return dx / hw + dy / hh <= 1;
      }
      case "triangle":
        if (py < n.y || py > n.y + n.height) return false;
        return Math.abs(px - cx) <= (hw * (n.y + n.height - py) / n.height) * 1.05;
      default:
        return px >= n.x && px <= n.x + n.width && py >= n.y && py <= n.y + n.height;
    }
  }

  // Connection points
  cpPts(n: DiagramNode) {
    const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
    return [
      { p: "top", x: cx, y: n.y }, { p: "bottom", x: cx, y: n.y + n.height },
      { p: "left", x: n.x, y: cy }, { p: "right", x: n.x + n.width, y: cy }
    ];
  }
  clCPt(n: DiagramNode, px: number, py: number) {
    const pts = this.cpPts(n); let b = pts[0], bd = Infinity;
    for (const p of pts) { const d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; b = p; } }
    return b;
  }

  // ======================== RENDERING ========================
  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;

    // Save original state so we can fully restore after rendering
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    // 背景填充白色
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);

    // Save DPR-scaled base state for pan/zoom apply + restore later
    ctx.save();

    // Grid — 主题色网格
    if (this.showGrid && this.zoom > 0.25) {
      const t = MM_THEMES[this.theme] || MM_THEMES.sky;
      const gs = this.gs * this.zoom;
      const sx = ((this.panX % gs) + gs) % gs, sy = ((this.panY % gs) + gs) % gs;
      ctx.strokeStyle = t.gridColor; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let x = sx; x < cw; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
      for (let y = sy; y < ch; y += gs) { ctx.moveTo(0, y); ctx.lineTo(cw, y); }
      ctx.stroke();
    }

    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw connections — only in flowchart mode
    if (this.mode === "flowchart") this.drawConns();

    // Mindmap parent→child curved connections
    if (this.mode === "mindmap") this.drawMMConns();

    // Draw nodes — each mode renders only its own nodes
    for (const n of this.nodes) {
      if (this.mode === "freedraw" && !n.isFD) continue;
      if (this.mode === "mindmap" && !n.isMM) continue;
      if (this.mode === "flowchart" && (n.isMM || n.isFD)) continue;
      this.drawNode(n);
    }

    // Linking preview
    if (this.linking && this.mode === "flowchart") {
      const fn = this.gn(this.linking);
      if (fn) {
        ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath();
        ctx.moveTo(fn.x + fn.width / 2, fn.y);
        ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // Draw free draw paths — only in freedraw mode
    if (this.mode === "freedraw") {
      for (const path of this.paths) this.drawPath(path);
      // Draw in-progress path
      if (this.drawing && this.curPath) this.drawPath(this.curPath);
    }

    // Marquee selection box
    if (this.marqueeActive && this.marqueeStart && this.marqueeEnd) {
      const x = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
      const y = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
      const w = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
      const h = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);
      ctx.setLineDash([]);
      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(59,130,246,0.08)";
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    }

    // Rectangle preview (freedraw sub-tool) — only in freedraw mode
    if (this.mode === "freedraw" && this.drawingRect && this.rectPreview) {
      ctx.setLineDash([]);
      ctx.strokeStyle = this.freeDrawColor; ctx.lineWidth = this.freeDrawWidth;
      ctx.fillStyle = this.freeDrawFill ? (this.freeDrawColor + "18") : "transparent";
      const rp = this.rectPreview;
      if (rp.w < 0) { rp.x += rp.w; rp.w = -rp.w; }
      if (rp.h < 0) { rp.y += rp.h; rp.h = -rp.h; }
      ctx.beginPath(); rrP(ctx, rp.x, rp.y, rp.w, rp.h, 0); ctx.fill(); ctx.stroke();
    }

    // Line preview (freedraw sub-tool) — only in freedraw mode
    if (this.mode === "freedraw" && this.drawingLine && this.linePreview) {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = this.freeDrawColor; ctx.lineWidth = this.freeDrawWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.linePreview.sx, this.linePreview.sy);
      ctx.lineTo(this.linePreview.ex, this.linePreview.ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Eraser cursor preview
    if (this.mode === "freedraw" && this.freeDrawEraser) {
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(239,68,68,0.1)";
    }

    // Restore: undo pan+zoom → back to DPR-scaled base
    ctx.restore();
    // Restore: undo DPR scale → back to original clean state
    ctx.restore();
  }

  drawPath(path: DiagramPath) {
    const ctx = this.ctx!;
    if (!path.pts || path.pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(path.pts[0].x, path.pts[0].y);
    for (let i = 1; i < path.pts.length; i++) {
      ctx.lineTo(path.pts[i].x, path.pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawConns() {
    const ctx = this.ctx!;
    for (const c of this.conns) {
      const f = this.gn(c.fromId), t = this.gn(c.toId);
      if (!f || !t) continue;
      const fp = this.clCPt(f, t.x + t.width / 2, t.y + t.height / 2);
      const tp = this.clCPt(t, fp.x, fp.y);

      const strokeColor = c.stroke || CONN_STROKE;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = c.sw || 1.5;

      // 虚线样式
      if (c.ls === "dashed") {
        ctx.setLineDash([8, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      if (c.style === "curved") {
        // 曲线：贝塞尔曲线，弧度自然
        const dx = tp.x - fp.x, dy = tp.y - fp.y;
        const cpx1 = fp.x + dx * 0.25, cpy1 = fp.y;
        const cpx2 = tp.x - dx * 0.25, cpy2 = tp.y;
        ctx.moveTo(fp.x, fp.y);
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, tp.x, tp.y);
      } else {
        // 折线：直角转弯
        const mx = (fp.x + tp.x) / 2;
        ctx.moveTo(fp.x, fp.y); ctx.lineTo(mx, fp.y); ctx.lineTo(mx, tp.y); ctx.lineTo(tp.x, tp.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow — 参考图：实心小三角，颜色同连线
      if (c.style !== "no-arrow") {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        // 计算箭头方向（基于最后一段）
        const a = Math.atan2(tp.y - fp.y, tp.x - fp.x);
        const sz = 8;
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x - sz * Math.cos(a - Math.PI / 7), tp.y - sz * Math.sin(a - Math.PI / 7));
        ctx.lineTo(tp.x - sz * Math.cos(a + Math.PI / 7), tp.y - sz * Math.sin(a + Math.PI / 7));
        ctx.closePath(); ctx.fill();
      }

      // Label — 参考图样式：无边框、深灰文字、小字
      if (c.label) {
        const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2 - 10;
        ctx.font = '11px "PingFang SC",sans-serif';
        ctx.fillStyle = CONN_LABEL_TEXT;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(c.label, mx, my);
      }
    }
  }

  drawNode(n: DiagramNode) {
    const ctx = this.ctx!;
    ctx.save();
    const sel = this.sel.has(n.id);

    // 选中时蓝紫色描边+加粗；非选中时使用节点描边色
    const sc = sel ? "#5b6cf2" : (n.stroke || NODE_STROKE);
    const slw = sel ? 2 : (n.sw || 1.5);
    const fill = n.fill && n.fill !== "transparent" ? n.fill : null;
    const x = n.x, y = n.y, w = n.width, h = n.height;
    const cx = x + w / 2, cy = y + h / 2;

    // 选中时给图形加一个淡蓝色光晕
    if (sel) {
      ctx.shadowColor = "rgba(99,102,241,0.25)";
      ctx.shadowBlur = 8;
    }

    if (fill) ctx.fillStyle = fill;
    ctx.strokeStyle = sc; ctx.lineWidth = slw;

    switch (n.type) {
      case "ellipse": case "use-case": case "er-attr":
        ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (fill) ctx.fill(); ctx.stroke(); break;
      case "diamond": case "er-relation":
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(x + w, cy);
        ctx.lineTo(cx, y + h); ctx.lineTo(x, cy); ctx.closePath();
        if (fill) ctx.fill(); ctx.stroke(); break;
      case "triangle":
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
        if (fill) ctx.fill(); ctx.stroke(); break;
      case "star": {
        const pts: {x:number;y:number}[] = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI/2 + (i * Math.PI / 5);
          const r = i % 2 ? Math.min(w, h) * 0.22 : Math.min(w, h) * 0.5;
          pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
        }
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < 10; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath(); if (fill) ctx.fill(); ctx.stroke(); break;
      }
      case "cylinder": {
        const ex = w / 2, ey = h * 0.12;
        const ty = y + ey, by = y + h - ey;
        ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x, by);
        ctx.ellipse(cx, by, ex, ey, 0, Math.PI, 0);
        ctx.lineTo(x + w, ty); ctx.ellipse(cx, ty, ex, ey, 0, Math.PI, 2 * Math.PI); ctx.closePath();
        if (fill) ctx.fill(); ctx.stroke(); break;
      }
      case "terminal":
        ctx.beginPath(); rrP(ctx, x, y, w, h, h / 2);
        if (fill) ctx.fill(); ctx.stroke(); break;
      case "hexagon": case "preparation": {
        const off = w * 0.22;
        ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + w - off, y);
        ctx.lineTo(x + w, cy); ctx.lineTo(x + w - off, y + h);
        ctx.lineTo(x + off, y + h); ctx.lineTo(x, cy); ctx.closePath();
        if (fill) ctx.fill(); ctx.stroke(); break;
      }
      default: {
        // 矩形：直角；rounded-rect：大圆角（接近参考图）；mindmap：小圆角
        const rx = n.cr != null ? n.cr : (n.type === "rounded-rect" ? 16 : n.type === "mindmap" ? 8 : 2);
        ctx.beginPath(); rrP(ctx, x, y, w, h, rx);
        if (fill) ctx.fill(); ctx.stroke();
      }
    }

    // 清除光晕
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;

    // Text — 参考图：深色文字，字体适中，清晰可读
    const noTxt = ["actor", "server", "router", "monitor", "mobile", "swimlane-h", "swimlane-v", "group-box", "uml-class", "uml-interface", "lifeline", "component"];
    if (!noTxt.includes(n.type)) {
      const fsa: string[] = [];
      if (n.fb) fsa.push("bold");
      if (n.fi) fsa.push("italic");
      ctx.font = fsa.join(" ") + " " + (n.fs || 13) + 'px "' + (n.ff || "PingFang SC") + '",sans-serif';
      ctx.fillStyle = n.fc || NODE_TEXT;
      ctx.textAlign = n.ta === "left" ? "left" : n.ta === "right" ? "right" : "center";
      ctx.textBaseline = "middle";
      const txX = n.ta === "left" ? x + 8 : n.ta === "right" ? x + w - 8 : cx;
      const txt = n.text || "";
      // Simple text wrapping
      const lines: string[] = []; let curl = "";
      const mw = w - 16;
      for (const ch of txt) {
        if (ch === "\n") { lines.push(curl); curl = ""; }
        else if (ctx.measureText(curl + ch).width > mw && curl.length > 0) { lines.push(curl); curl = ch; }
        else curl += ch;
      }
      if (curl) lines.push(curl);
      if (!lines.length) lines.push("");
      const lh = (n.fs || 13) * 1.6;
      let ty = cy - (lines.length * lh) / 2 + lh / 2;
      for (const l of lines) { ctx.fillText(l, txX, ty); ty += lh; }
    }

    // Selection handles — 白底蓝边的小方块
    if (sel && !this.dragging) {
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#374151"; ctx.lineWidth = 1.5;
      const hs = [
        { x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h },
        { x: cx, y }, { x: cx, y: y + h }, { x, y: cy }, { x: x + w, y: cy }
      ];
      for (const hh of hs) { ctx.beginPath(); ctx.rect(hh.x - 4, hh.y - 4, 8, 8); ctx.fill(); ctx.stroke(); }
    }

    ctx.restore();
  }

  // ======================== MINDMAP ========================
  stH(nid: string): number {
    const ch = this.gc(nid);
    if (!ch.length) return 50;
    let t = 0;
    for (const c of ch) t += c.collapsed ? 50 : Math.max(50, this.stH(c.id));
    return t + (ch.length - 1) * 12;
  }
  layoutMM() {
    const roots = this.nodes.filter(n => n.isMM && !n.parentId);
    if (!roots.length) return;
    let sy = 120;
    for (const r of roots) { r.x = 200; r.y = sy; this.layoutST(r.id, r.x + 160, r.y); sy += Math.max(this.stH(r.id), 150) + 80; }
  }
  layoutST(pid: string, sx: number, py: number) {
    const ch = this.gc(pid);
    if (!ch.length) return;
    const gy = 44, cw2 = 120;
    let y = py - (ch.length * 36 + (ch.length - 1) * gy) / 2 + 18;
    for (const c of ch) {
      c.x = sx; c.y = y; c.width = cw2; c.height = 36;
      if (!c.collapsed && this.gc(c.id).length) this.layoutST(c.id, sx + 150, y + 18);
      y += 36 + gy;
    }
  }
  mkMMRoot(x: number, y: number) {
    const r = this.mkNode("mindmap", x || 200, y || 120, null);
    r.text = "中心主题";
    this.nodes.push(r);
    const labels = ["分支 1", "分支 2", "分支 3"];
    for (let i = 0; i < 3; i++) {
      const c = this.mkNode("mindmap", 0, 0, r.id);
      c.text = labels[i];
      this.nodes.push(c);
    }
    this.applyMMTheme();
    return r;
  }
  initMM() { this.mkMMRoot(200, 120); this.layoutMM(); }

  addMMChild(pid: string) {
    const p = this.gn(pid);
    if (!p) return;
    const c = this.mkNode("mindmap", 0, 0, pid);
    c.text = "子节点";
    this.nodes.push(c); this.layoutMM();
    this.applyMMTheme();
    this.selN(c.id); this.render();
  }
  selN(id: string) { this.sel.clear(); this.sel.add(id); this.selConn = null; }

  // Mindmap depth: root=0, child=1, grandchild=2, ...
  getMMDepth(nid: string): number {
    let d = 0; let n = this.gn(nid);
    while (n?.parentId) { d++; n = this.gn(n.parentId); }
    return d;
  }

  // Draw curved connections between mindmap parent→child
  drawMMConns() {
    const ctx = this.ctx!;
    const t = MM_THEMES[this.theme] || MM_THEMES.sky;
    for (const n of this.nodes) {
      if (!n.isMM || !n.parentId) continue;
      const p = this.gn(n.parentId);
      if (!p || p.collapsed) continue;

      const sx = p.x + p.width + 1;
      const sy = p.y + p.height / 2;
      const ex = n.x - 1;
      const ey = n.y + n.height / 2;
      const mx = (sx + ex) / 2;

      const depth = this.getMMDepth(n.id);
      const lvl = Math.min(depth, t.strokes.length - 1);
      const connColor = depth === 0 ? t.strokes[0] : t.connStroke;

      ctx.strokeStyle = connColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(mx, sy, mx, ey, ex, ey);
      ctx.stroke();
    }
  }

  // Apply theme colors to all mindmap nodes by depth
  applyMMTheme() {
    const t = MM_THEMES[this.theme] || MM_THEMES.sky;
    for (const n of this.nodes) {
      if (!n.isMM) continue;
      const depth = Math.min(this.getMMDepth(n.id), t.fills.length - 1);
      n.fill = t.fills[depth];
      n.stroke = t.strokes[depth];
      n.fc = t.texts[depth];
      n.fs = depth === 0 ? 15 : 13;
      n.fb = depth === 0;
      n.cr = 8;
    }
  }

  // Flow node
  crFlowNode(type: string, x: number, y: number): DiagramNode {
    const d = DEFS[type] || { fill: NODE_FILL, stroke: NODE_STROKE };
    const [w, h] = DIMS[type] || [140, 56];
    const cr = type === "rounded-rect" || type === "terminal" ? 16 : (type === "mindmap" ? 8 : 2);
    return {
      id: gid(), type, x: x - w / 2, y: y - h / 2, width: w, height: h,
      fill: d.fill, stroke: d.stroke, sw: 1.5, ls: "solid",
      cr, opacity: 100,
      text: TEXT_DEFS[type] || "文本", fs: 13, ff: "PingFang SC",
      fb: false, fi: false, fu: false, fc: NODE_TEXT, ta: "center",
      parentId: null, collapsed: false, rot: 0, isMM: false,
      isSw: type.startsWith("swimlane"),
      isFD: false
    };
  }
  mkConn(fromId: string, toId: string, style: string): DiagramConn {
    return {
      id: gid(), fromId, toId, style, stroke: CONN_STROKE, sw: 1.5,
      ls: style === "implements" || style === "dashed" ? "dashed" : "solid",
      arrowEnd: !(style === "no-arrow"), label: ""
    };
  }

  // Export
  exportPNG() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.nodes) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height); }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const pad = 40, w2 = maxX - minX + pad * 2, h2 = maxY - minY + pad * 2;
    const off = document.createElement("canvas"); off.width = w2 * 2; off.height = h2 * 2;
    const oc = off.getContext("2d")!; oc.scale(2, 2);
    oc.fillStyle = "#fff"; oc.fillRect(0, 0, w2, h2);
    oc.save(); oc.translate(-minX + pad, -minY + pad);
    for (const n of this.nodes) {
      if (n.fill && n.fill !== "transparent") oc.fillStyle = n.fill;
      const rx = n.cr != null ? n.cr : (n.type === "rounded-rect" ? 16 : 2);
      oc.beginPath(); rrP(oc, n.x, n.y, n.width, n.height, rx); oc.fill();
      oc.strokeStyle = n.stroke || NODE_STROKE; oc.lineWidth = n.sw || 1.5; oc.stroke();
      oc.font = (n.fb ? "bold " : "") + (n.fi ? "italic " : "") + (n.fs || 13) + 'px "' + (n.ff || "PingFang SC") + '",sans-serif';
      oc.fillStyle = n.fc || NODE_TEXT; oc.textAlign = "center"; oc.textBaseline = "middle";
      oc.fillText(n.text || "", n.x + n.width / 2, n.y + n.height / 2);
    }
    oc.restore();
    const a = document.createElement("a");
    a.download = "diagram-" + new Date().toISOString().slice(0, 10) + ".png";
    a.href = off.toDataURL("image/png"); a.click();
    this.onToast?.("PNG 已导出 (2x高清)");
  }
  exportJSON() {
    const d = { version: "5.0", mode: this.mode, nodes: this.nodes, conns: this.conns, paths: this.paths, theme: this.theme };
    const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "diagram-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); this.onToast?.("JSON 已导出");
  }

  // ======================== FREE DRAW ========================
  startFreeDraw(px: number, py: number) {
    this.pu();
    this.drawing = true;
    this.curPath = {
      id: gid(), tool: this.freeDrawTool, color: this.freeDrawColor, width: this.freeDrawWidth,
      pts: [{ x: px, y: py }]
    };
  }
  continueFreeDraw(px: number, py: number) {
    if (!this.drawing || !this.curPath) return;
    this.curPath.pts.push({ x: px, y: py });
    this.render();
  }
  endFreeDraw() {
    if (!this.drawing || !this.curPath) return;
    // Don't save single-point paths
    if (this.curPath.pts.length < 2) { this.drawing = false; this.curPath = null; this.render(); return; }
    this.paths.push(this.curPath);
    this.drawing = false; this.curPath = null;
    this.render();
  }

  // ======================== ERASER ========================
  eraseAtPoint(px: number, py: number) {
    const r = this.eraserSize;
    // Check paths
    this.paths = this.paths.filter(path => {
      for (const pt of path.pts) {
        const dx = pt.x - px, dy = pt.y - py;
        if (dx * dx + dy * dy < r * r) return false;
      }
      return true;
    });
    // Also check current path
    if (this.curPath) {
      let keep = true;
      for (const pt of this.curPath.pts) {
        const dx = pt.x - px, dy = pt.y - py;
        if (dx * dx + dy * dy < r * r) { keep = false; break; }
      }
      if (!keep) { this.curPath = null; this.drawing = false; }
    }
  }

  // ======================== RECTANGLE DRAW (freedraw sub-tool) ========================
  startRectDraw(px: number, py: number) {
    this.drawingRect = true;
    this.rectStart = { x: px, y: py };
    this.rectPreview = { x: px, y: py, w: 0, h: 0 };
  }
  continueRectDraw(px: number, py: number) {
    if (!this.drawingRect || !this.rectStart) return;
    this.rectPreview = {
      x: Math.min(this.rectStart.x, px),
      y: Math.min(this.rectStart.y, py),
      w: Math.abs(px - this.rectStart.x),
      h: Math.abs(py - this.rectStart.y)
    };
    this.render();
  }
  endRectDraw() {
    if (!this.drawingRect || !this.rectPreview) { this.drawingRect = false; this.rectStart = null; this.rectPreview = null; return; }
    this.drawingRect = false;
    if (this.rectPreview.w > 4 && this.rectPreview.h > 4) {
      this.pu();
      const n: DiagramNode = {
        id: gid(), type: "rect",
        x: this.rectPreview.x, y: this.rectPreview.y, width: this.rectPreview.w, height: this.rectPreview.h,
        fill: this.freeDrawFill ? (this.freeDrawColor + "18") : "transparent", stroke: this.freeDrawColor, sw: this.freeDrawWidth,
        ls: "solid", cr: 0, opacity: 100,
        text: "", fs: 13, ff: "PingFang SC", fb: false, fi: false, fu: false, fc: NODE_TEXT, ta: "center",
        parentId: null, collapsed: false, rot: 0, isMM: false, isSw: false, isFD: true
      };
      this.nodes.push(n);
    }
    this.rectStart = null; this.rectPreview = null; this.render();
  }

  // ======================== LINE DRAW (freedraw sub-tool) ========================
  startLineDraw(px: number, py: number) {
    this.drawingLine = true;
    this.lineStart = { x: px, y: py };
    this.linePreview = { sx: px, sy: py, ex: px, ey: py };
  }
  continueLineDraw(px: number, py: number) {
    if (!this.drawingLine || !this.lineStart) return;
    this.linePreview = { sx: this.lineStart.x, sy: this.lineStart.y, ex: px, ey: py };
    this.render();
  }
  endLineDraw() {
    if (!this.drawingLine || !this.lineStart || !this.linePreview) { this.drawingLine = false; this.lineStart = null; this.linePreview = null; return; }
    this.drawingLine = false;
    const dist = Math.hypot(this.linePreview.ex - this.lineStart.x, this.linePreview.ey - this.lineStart.y);
    if (dist > 4) {
      this.pu();
      this.paths.push({
        id: gid(), tool: "line", color: this.freeDrawColor, width: this.freeDrawWidth,
        pts: [{ x: this.lineStart.x, y: this.lineStart.y }, { x: this.linePreview.ex, y: this.linePreview.ey }]
      });
    }
    this.lineStart = null; this.linePreview = null; this.render();
  }

  // ======================== TEXT ADD (freedraw sub-tool) ========================
  addTextAt(px: number, py: number, text: string): DiagramNode {
    this.pu();
    const n: DiagramNode = {
      id: gid(), type: "rect",
      x: px, y: py, width: 140, height: 40,
      fill: "transparent", stroke: "transparent", sw: 0, ls: "solid", cr: 0, opacity: 100,
      text: text || "双击编辑", fs: 16, ff: "PingFang SC", fb: false, fi: false, fu: false, fc: this.freeDrawColor, ta: "left",
      parentId: null, collapsed: false, rot: 0, isMM: false, isSw: false, isFD: true
    };
    this.nodes.push(n);
    this.render();
    return n;
  }

  // ======================== MARQUEE SELECTION ========================
  startMarquee(px: number, py: number) {
    this.marqueeActive = true;
    this.marqueeStart = { x: px, y: py };
    this.marqueeEnd = { x: px, y: py };
    this.render();
  }
  updateMarquee(px: number, py: number) {
    if (!this.marqueeActive) return;
    this.marqueeEnd = { x: px, y: py };
    this.render();
  }
  endMarquee(additive: boolean) {
    if (!this.marqueeActive || !this.marqueeStart || !this.marqueeEnd) return;
    const x1 = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
    const y1 = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
    const x2 = Math.max(this.marqueeStart.x, this.marqueeEnd.x);
    const y2 = Math.max(this.marqueeStart.y, this.marqueeEnd.y);
    const boxW = x2 - x1, boxH = y2 - y1;
    // Tiny box = single click on empty space, clear selection
    if (boxW < 4 && boxH < 4) {
      if (!additive) { this.sel.clear(); this.selConn = null; }
      this.marqueeActive = false; this.marqueeStart = null; this.marqueeEnd = null;
      this.render();
      return;
    }
    if (!additive) { this.sel.clear(); this.selConn = null; }
    for (const n of this.nodes) {
      if (n.isMM && this.mode !== "mindmap") continue;
      if (!n.isMM && this.mode === "mindmap") continue;
      if (this.marqueeMode === "contain") {
        // Must fully contain
        if (n.x >= x1 && n.y >= y1 && n.x + n.width <= x2 && n.y + n.height <= y2) {
          this.sel.add(n.id);
        }
      } else {
        // Partial overlap
        if (n.x < x2 && n.x + n.width > x1 && n.y < y2 && n.y + n.height > y1) {
          this.sel.add(n.id);
        }
      }
    }
    this.marqueeActive = false; this.marqueeStart = null; this.marqueeEnd = null;
    this.render();
  }

  // Space down handling
  setSpaceDown(down: boolean) {
    this.spaceDown = down;
  }
}

export { PALETTE, MM_THEMES, DIMS, DEFS };
