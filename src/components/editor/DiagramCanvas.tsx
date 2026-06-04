"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

// ======================== TYPES ========================
export interface DiagramNode {
  id: string; type: string; x: number; y: number; width: number; height: number;
  fill: string; stroke: string; sw: number; ls: string; cr: number; opacity: number;
  text: string; fs: number; ff: string; fb: boolean; fi: boolean; fu: boolean; fc: string; ta: string;
  parentId: string | null; collapsed: boolean; rot: number; isMM: boolean; isSw: boolean;
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
const THEMES: Record<string,{fill:string;stroke:string;text:string;cc:string[]}> = {
  indigo:{fill:"#e0e7ff",stroke:"#4f46e5",text:"#312e81",cc:["#e0e7ff","#dbeafe","#d1fae5","#fef3c7","#fce7f3","#e0f2fe","#ede9fe"]},
  emerald:{fill:"#d1fae5",stroke:"#059669",text:"#064e3b",cc:["#d1fae5","#dbeafe","#e0e7ff","#fef3c7","#fce7f3","#e0f2fe","#ede9fe"]},
  amber:{fill:"#fef3c7",stroke:"#d97706",text:"#78350f",cc:["#fef3c7","#ffedd5","#fce7f3","#e0e7ff","#d1fae5","#dbeafe","#ede9fe"]},
  red:{fill:"#fecaca",stroke:"#dc2626",text:"#7f1d1d",cc:["#fecaca","#fed7aa","#fef3c7","#d1fae5","#dbeafe","#e0e7ff","#fce7f3"]},
  violet:{fill:"#ede9fe",stroke:"#7c3aed",text:"#4c1d95",cc:["#ede9fe","#e0e7ff","#fce7f3","#d1fae5","#fef3c7","#dbeafe","#e0f2fe"]},
  cyan:{fill:"#cffafe",stroke:"#0891b2",text:"#164e63",cc:["#cffafe","#e0f2fe","#ede9fe","#fef3c7","#fce7f3","#d1fae5","#e0e7ff"]},
  pink:{fill:"#fce7f3",stroke:"#db2777",text:"#831843",cc:["#fce7f3","#ede9fe","#dbeafe","#d1fae5","#fef3c7","#ffe4e6","#e0e7ff"]},
  slate:{fill:"#e2e8f0",stroke:"#475569",text:"#1e293b",cc:["#e2e8f0","#cbd5c1","#d1fae5","#fef3c7","#fce7f3","#e0e7ff","#cffafe"]}
};

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

const DEFS: Record<string,{fill:string;stroke:string}> = {
  rect:{fill:"#e0e7ff",stroke:"#4f46e5"},"rounded-rect":{fill:"#d1fae5",stroke:"#059669"},
  diamond:{fill:"#fef3c7",stroke:"#d97706"},ellipse:{fill:"#fce7f3",stroke:"#db2777"},
  parallelogram:{fill:"#ede9fe",stroke:"#7c3aed"},trapezoid:{fill:"#fef3c7",stroke:"#d97706"},
  pentagon:{fill:"#e0f2fe",stroke:"#0891b2"},triangle:{fill:"#ede9fe",stroke:"#7c3aed"},
  hexagon:{fill:"#f0fdf4",stroke:"#16a34a"},star:{fill:"#fef3c7",stroke:"#d97706"},
  cross:{fill:"#fce7f3",stroke:"#db2777"},"arrow-right":{fill:"#dbeafe",stroke:"#2563eb"},
  callout:{fill:"#fef9c3",stroke:"#ca8a04"},cylinder:{fill:"#dbeafe",stroke:"#2563eb"},
  document:{fill:"#f3f4f6",stroke:"#6b7280"},cloud:{fill:"#e0f2fe",stroke:"#0891b2"},
  terminal:{fill:"#d1fae5",stroke:"#059669"},"manual-input":{fill:"#fef3c7",stroke:"#d97706"},
  "off-page":{fill:"#ede9fe",stroke:"#7c3aed"},preparation:{fill:"#fce7f3",stroke:"#db2777"},
  delay:{fill:"#e0f2fe",stroke:"#0891b2"},"swimlane-h":{fill:"#f0fdf4",stroke:"#16a34a"},
  "swimlane-v":{fill:"#fef2f2",stroke:"#dc2626"},"group-box":{fill:"transparent",stroke:"#9ca3af"},
  "uml-class":{fill:"#faf5ff",stroke:"#7c3aed"},"uml-interface":{fill:"#ecfeff",stroke:"#0891b2"},
  "uml-note":{fill:"#fef9c3",stroke:"#ca8a04"},actor:{fill:"transparent",stroke:"#475569"},
  "use-case":{fill:"#fce7f3",stroke:"#db2777"},component:{fill:"#e0e7ff",stroke:"#4f46e5"},
  lifeline:{fill:"#e0e7ff",stroke:"#4f46e5"},"er-entity":{fill:"#dbeafe",stroke:"#2563eb"},
  "er-attr":{fill:"#fce7f3",stroke:"#db2777"},"er-relation":{fill:"#fef3c7",stroke:"#d97706"},
  "er-weak-entity":{fill:"#dbeafe",stroke:"#2563eb"},server:{fill:"#e0e7ff",stroke:"#4f46e5"},
  database2:{fill:"#dbeafe",stroke:"#2563eb"},router:{fill:"#e0f2fe",stroke:"#0891b2"},
  firewall:{fill:"#fecaca",stroke:"#dc2626"},"cloud-aws":{fill:"#fef3c7",stroke:"#d97706"},
  mobile:{fill:"#e0e7ff",stroke:"#4f46e5"},monitor:{fill:"#e0e7ff",stroke:"#4f46e5"}
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
  theme = "indigo"; snapping = true; gs = 20; showGrid = true;
  undos: any[] = []; redos: any[] = [];
  dragging = false; resizing = false; drawing = false; panning = false;
  ds: any = null; rh: string | null = null;
  editNode: DiagramNode | null = null; curPath: DiagramPath | null = null;
  spaceDown = false; marqueeMode = "contain"; marqueeBox: any = null;
  fmtBrush: any = null; fmtBrushOn = false;
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
    const d = DEFS[type] || { fill: "#e0e7ff", stroke: "#4f46e5" };
    return {
      id: gid(), type, x, y, width: w, height: h, fill: d.fill, stroke: d.stroke,
      sw: 1.5, ls: "solid", cr: type === "rounded-rect" ? 10 : 0, opacity: 100,
      text: TEXT_DEFS[type] || "文本", fs: 13, ff: "PingFang SC",
      fb: type === "mindmap", fi: false, fu: false, fc: "#1a1a2e", ta: "center",
      parentId: pid || null, collapsed: false, rot: 0, isMM: type === "mindmap",
      isSw: type.startsWith("swimlane")
    };
  }

  // Hit testing
  hitN(mx: number, my: number): DiagramNode | null {
    const p = toCv(mx, my, this.canvas!, this.zoom, this.panX, this.panY);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (n.isMM && this.mode !== "mindmap") continue;
      if (!n.isMM && this.mode === "mindmap") continue;
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
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();

    // Grid
    if (this.showGrid && this.zoom > 0.25) {
      const gs = this.gs * this.zoom;
      const sx = ((this.panX % gs) + gs) % gs, sy = ((this.panY % gs) + gs) % gs;
      ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 0.5; ctx.beginPath();
      for (let x = sx; x < this.canvas.width; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); }
      for (let y = sy; y < this.canvas.height; y += gs) { ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); }
      ctx.stroke();
    }

    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Draw connections
    this.drawConns();

    // Draw nodes
    for (const n of this.nodes) {
      if (n.isMM && this.mode !== "mindmap") continue;
      if (!n.isMM && this.mode === "mindmap") continue;
      this.drawNode(n);
    }

    // Linking preview
    if (this.linking && this.mode === "flowchart") {
      const fn = this.gn(this.linking);
      if (fn) {
        const p = toCv(0, 0, this.canvas!, this.zoom, this.panX, this.panY);
        ctx.strokeStyle = "#4f46e5"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath();
        ctx.moveTo(fn.x + fn.width / 2, fn.y);
        ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  drawConns() {
    const ctx = this.ctx!;
    for (const c of this.conns) {
      const f = this.gn(c.fromId), t = this.gn(c.toId);
      if (!f || !t) continue;
      const fp = this.clCPt(f, t.x + t.width / 2, t.y + t.height / 2);
      const tp = this.clCPt(t, fp.x, fp.y);
      ctx.strokeStyle = c.stroke || "#6b7280"; ctx.lineWidth = c.sw || 1.5;
      ctx.beginPath();
      if (c.style === "curved") {
        const cpx = (fp.x + tp.x) / 2, cpy = Math.min(fp.y, tp.y) - 40;
        ctx.moveTo(fp.x, fp.y); ctx.quadraticCurveTo(cpx, cpy, tp.x, tp.y);
      } else {
        const mx = (fp.x + tp.x) / 2;
        ctx.moveTo(fp.x, fp.y); ctx.lineTo(mx, fp.y); ctx.lineTo(mx, tp.y); ctx.lineTo(tp.x, tp.y);
      }
      ctx.stroke();

      // Arrow
      if (c.style !== "no-arrow") {
        ctx.fillStyle = c.stroke || "#6b7280"; ctx.beginPath();
        const a = Math.atan2(tp.y - fp.y, tp.x - fp.x);
        const sz = 9;
        ctx.moveTo(tp.x, tp.y);
        ctx.lineTo(tp.x - sz * Math.cos(a - Math.PI / 6), tp.y - sz * Math.sin(a - Math.PI / 6));
        ctx.lineTo(tp.x - sz * Math.cos(a + Math.PI / 6), tp.y - sz * Math.sin(a + Math.PI / 6));
        ctx.closePath(); ctx.fill();
      }

      // Label
      if (c.label) {
        const mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2;
        ctx.font = '12px "PingFang SC",sans-serif';
        const tw = ctx.measureText(c.label).width + 8;
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.fillRect(mx - tw / 2, my - 9, tw, 18);
        ctx.fillStyle = "#374151"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(c.label, mx, my);
      }
    }
  }

  drawNode(n: DiagramNode) {
    const ctx = this.ctx!;
    ctx.save();
    const sel = this.sel.has(n.id);
    const sc = sel ? "#4f46e5" : (n.stroke || "#6b7280");
    const slw = sel ? 2.5 : (n.sw || 1.5);
    const fill = n.fill && n.fill !== "transparent" ? n.fill : null;
    const x = n.x, y = n.y, w = n.width, h = n.height;
    const cx = x + w / 2, cy = y + h / 2;

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
        const rx = n.cr != null ? n.cr : (n.type === "rounded-rect" || n.type === "mindmap" ? 8 : 2);
        ctx.beginPath(); rrP(ctx, x, y, w, h, rx);
        if (fill) ctx.fill(); ctx.stroke();
      }
    }

    // Text
    const noTxt = ["actor", "server", "router", "monitor", "mobile", "swimlane-h", "swimlane-v", "group-box", "uml-class", "uml-interface", "lifeline", "component"];
    if (!noTxt.includes(n.type)) {
      const fsa: string[] = [];
      if (n.fb) fsa.push("bold");
      if (n.fi) fsa.push("italic");
      ctx.font = fsa.join(" ") + " " + (n.fs || 13) + 'px "' + (n.ff || "PingFang SC") + '",sans-serif';
      ctx.fillStyle = n.fc || "#1a1a2e";
      ctx.textAlign = n.ta === "left" ? "left" : n.ta === "right" ? "right" : "center";
      ctx.textBaseline = "middle";
      const txX = n.ta === "left" ? x + 8 : n.ta === "right" ? x + w - 8 : cx;
      const txt = n.text || "";
      // Simple text wrapping
      const lines: string[] = []; let curl = "";
      const mw = w - 12;
      for (const ch of txt) {
        if (ch === "\n") { lines.push(curl); curl = ""; }
        else if (ctx.measureText(curl + ch).width > mw && curl.length > 0) { lines.push(curl); curl = ch; }
        else curl += ch;
      }
      if (curl) lines.push(curl);
      if (!lines.length) lines.push("");
      const lh = (n.fs || 13) * 1.5;
      let ty = cy - (lines.length * lh) / 2 + lh / 2;
      for (const l of lines) { ctx.fillText(l, txX, ty); ty += lh; }
    }

    // Selection handles
    if (sel && !this.dragging) {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#4f46e5"; ctx.lineWidth = 1.5;
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
    const t = THEMES[this.theme];
    const r = this.mkNode("mindmap", x || 200, y || 120, null);
    r.text = "中心主题"; r.fill = t.fill; r.stroke = t.stroke; r.fc = t.text; r.fs = 15;
    this.nodes.push(r);
    const labels = ["分支 1", "分支 2", "分支 3"];
    for (let i = 0; i < 3; i++) {
      const c = this.mkNode("mindmap", 0, 0, r.id);
      c.text = labels[i]; c.fill = t.cc[i]; c.stroke = t.stroke; c.fc = t.text;
      this.nodes.push(c);
    }
    return r;
  }
  initMM() { this.mkMMRoot(200, 120); this.layoutMM(); }

  addMMChild(pid: string) {
    const p = this.gn(pid);
    if (!p) return;
    const t = THEMES[this.theme];
    const c = this.mkNode("mindmap", 0, 0, pid);
    c.text = "子节点";
    const sibs = this.gc(pid);
    c.fill = t.cc[sibs.length % t.cc.length]; c.stroke = t.stroke; c.fc = t.text;
    this.nodes.push(c); this.layoutMM();
    this.selN(c.id); this.render();
  }
  selN(id: string) { this.sel.clear(); this.sel.add(id); this.selConn = null; }

  // Flow node
  crFlowNode(type: string, x: number, y: number): DiagramNode {
    const d = DEFS[type] || { fill: "#e0e7ff", stroke: "#4f46e5" };
    const [w, h] = DIMS[type] || [140, 56];
    return {
      id: gid(), type, x: x - w / 2, y: y - h / 2, width: w, height: h,
      fill: d.fill, stroke: d.stroke, sw: 1.5, ls: "solid",
      cr: type === "rounded-rect" ? 10 : 0, opacity: 100,
      text: TEXT_DEFS[type] || "文本", fs: 13, ff: "PingFang SC",
      fb: false, fi: false, fu: false, fc: "#1a1a2e", ta: "center",
      parentId: null, collapsed: false, rot: 0, isMM: false,
      isSw: type.startsWith("swimlane")
    };
  }
  mkConn(fromId: string, toId: string, style: string): DiagramConn {
    return {
      id: gid(), fromId, toId, style, stroke: "#6b7280", sw: 1.5,
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
      const rx = n.cr != null ? n.cr : 2;
      oc.beginPath(); rrP(oc, n.x, n.y, n.width, n.height, rx); oc.fill();
      oc.strokeStyle = n.stroke; oc.lineWidth = n.sw; oc.stroke();
      oc.font = (n.fb ? "bold " : "") + (n.fi ? "italic " : "") + (n.fs || 13) + 'px "' + (n.ff || "PingFang SC") + '",sans-serif';
      oc.fillStyle = n.fc || "#1a1a2e"; oc.textAlign = "center"; oc.textBaseline = "middle";
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
}

export { PALETTE, THEMES, DIMS, DEFS };
