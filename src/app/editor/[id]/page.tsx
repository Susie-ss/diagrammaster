"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/ui/AuthProvider";
import { DiagramEngine, PALETTE, DIMS, DEFS, MM_THEMES } from "@/components/editor/DiagramCanvas";
import type { DiagramNode, DiagramConn } from "@/components/editor/DiagramCanvas";
import {
  ArrowLeft, Save, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  Grid3X3, Magnet, Trash2, Copy, Scissors, ClipboardPaste,
  ChevronDown, Search, Share2, FileText, FolderOpen, Download,
  Printer, AlignLeft, AlignCenter, AlignRight,
  RotateCw, FlipHorizontal, FlipVertical, Layers,
  MousePointer, Hand, Type, Image, Settings, Plus, Minus,
  Pen, Eraser, PaintBucket, Palette, Pencil
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ShapeIcon from "@/components/editor/ShapeIcon";

interface Project { id: string; name: string; mode: string; diagram_data: any; }

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const projectId = params.id as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ieRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<DiagramEngine | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [engineVersion, setEngineVersion] = useState(0); // bump to trigger re-render when engine ref changes
  const [selNode, setSelNode] = useState<DiagramNode | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // Right panel state
  const [pText, setPText] = useState("");
  const [pFS, setPFS] = useState(13);
  const [pFF, setPFF] = useState("PingFang SC");
  const [pFC, setPFC] = useState("#1a1a2e");
  const [pFill, setPFill] = useState("#e0e7ff");
  const [pStroke, setPStroke] = useState("#4f46e5");
  const [pSW, setPSW] = useState(1.5);
  const [pLS, setPLS] = useState("solid");
  const [pCR, setPCR] = useState(0);
  const [pOpacity, setPOpacity] = useState(100);
  const [pX, setPX] = useState(0);
  const [pY, setPY] = useState(0);
  const [pW, setPW] = useState(140);
  const [pH, setPH] = useState(56);
  const [pBold, setPBold] = useState(false);
  const [pItalic, setPItalic] = useState(false);
  const [pUnder, setPUnder] = useState(false);
  const [pTA, setPTA] = useState("center");

  // Menu dropdown state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Panels
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [searchShapes, setSearchShapes] = useState("");

  // Free draw state
  const [fdSubTool, setFDSubTool] = useState("pencil"); // pointer | rectangle | line | pencil | text
  const [fdTool, setFDTool] = useState("pen");
  const [fdColor, setFDColor] = useState("#1e293b");
  const [fdWidth, setFDWidth] = useState(2);
  const [fdFill, setFDFill] = useState(false);
  const [fdEraser, setFDEraser] = useState(false);
  const [fdEraserSize, setFDEraserSize] = useState(24);
  const [fdMousePos, setFDMousePos] = useState<{x:number;y:number}|null>(null);

  // Toast
  const toast = useCallback((msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1500);
  }, []);

  // Right panel refresh
  const refP = useCallback((eng: DiagramEngine) => {
    if (eng.sel.size !== 1) {
      setSelNode(null); return;
    }
    const n = eng.gn([...eng.sel][0]);
    if (!n) { setSelNode(null); return; }
    setSelNode(n);
    setPText(n.text || ""); setPFS(n.fs || 13); setPFF(n.ff || "PingFang SC");
    setPFC(n.fc || "#1a1a2e"); setPFill(n.fill || "#e0e7ff"); setPStroke(n.stroke || "#4f46e5");
    setPSW(n.sw || 1.5); setPLS(n.ls || "solid"); setPCR(n.cr || 0);
    setPOpacity(n.opacity != null ? n.opacity : 100);
    setPX(Math.round(n.x)); setPY(Math.round(n.y));
    setPW(Math.round(n.width)); setPH(Math.round(n.height));
    setPBold(n.fb); setPItalic(n.fi); setPUnder(n.fu); setPTA(n.ta || "center");
  }, []);

  // Update selected node property
  const updSel = useCallback((key: string, value: any) => {
    const eng = engineRef.current;
    if (!eng || eng.sel.size !== 1) return;
    const n = eng.gn([...eng.sel][0]);
    if (!n) return;
    eng.pu();
    (n as any)[key] = value;
    eng.render();
    refP(eng);
  }, [refP]);

  // Save
  const save = useCallback(async (silent = false) => {
    if (!engineRef.current || !projectId) return;
    const eng = engineRef.current;
    const data = eng.getState();
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project?.name || "Untitled",
          diagram_data: data,
          mode: eng.mode,
        }),
      });
      if (!silent) toast("已保存");
    } catch { if (!silent) toast("保存失败"); }
    setSaving(false);
  }, [projectId, project, toast]);

  // Auto-save
  useEffect(() => {
    const t = setInterval(() => save(true), 10000);
    return () => clearInterval(t);
  }, [save]);

  // Init engine — assumes canvas & wrap are already mounted with dimensions > 0
  const initEngine = useCallback(async () => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      const proj = await res.json();
      setProject(proj);
      document.title = proj.name + " - DiagramMaster";

      const dpr = window.devicePixelRatio || 1;
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
      canvas.style.width = wrap.clientWidth + "px";
      canvas.style.height = wrap.clientHeight + "px";

      const eng = new DiagramEngine();
      eng.canvas = canvas;
      eng.ctx = canvas.getContext("2d")!;
      eng.onToast = toast;
      eng.wrapEl = wrap;  // 统一坐标系：hitN 使用 wrap rect，与页面 mouse handler 一致
      engineRef.current = eng;

      // Trigger re-render so toolbar picks up engine ref
      setEngineVersion(v => v + 1);

      // Load data
      if (proj.diagram_data && proj.diagram_data.nodes) {
        eng.load(proj.diagram_data);
      }

      // Init defaults
      if (eng.nodes.length === 0) {
        if (eng.mode === "mindmap") eng.initMM();
      } else if (eng.mode === "mindmap") {
        eng.layoutMM();
      }
      eng.render();
    } catch {
      toast("加载失败，请刷新重试");
    }
  }, [projectId, router, toast]);

  // Auth redirect & show editor when user is ready
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
    else if (!authLoading && user) setLoading(false);
  }, [user, authLoading, router]);

  // Init engine — called only when editor DOM is mounted and dimensions are ready
  useEffect(() => {
    if (loading || authLoading || !user) return;
    if (engineRef.current) return; // already initialized
    if (!wrapRef.current || !canvasRef.current) return;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      if (wrap.clientWidth === 0 || wrap.clientHeight === 0) {
        requestAnimationFrame(tryInit);
        return;
      }
      // Dimensions ready — init engine on canvas
      initEngine().catch(() => {});
    };

    // Small delay to let flex layout settle, then try
    const t0 = setTimeout(tryInit, 100);

    // Safety timeout: force-try after 5s even if dimensions seem 0
    const t1 = setTimeout(() => {
      if (!cancelled && !engineRef.current) {
        initEngine().catch(() => {});
      }
    }, 5000);

    return () => { cancelled = true; clearTimeout(t0); clearTimeout(t1); };
  }, [loading, authLoading, user, initEngine]);

  // Sync freedraw state to engine
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    e.freeDrawSubTool = fdSubTool;
    e.freeDrawTool = fdTool;
    e.freeDrawColor = fdColor;
    e.freeDrawWidth = fdWidth;
    e.freeDrawFill = fdFill;
    e.freeDrawEraser = fdEraser;
    e.eraserSize = fdEraserSize;
  }, [fdSubTool, fdTool, fdColor, fdWidth, fdFill, fdEraser, fdEraserSize]);

  // Resize & ResizeObserver
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current && width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = width * dpr;
          canvasRef.current.height = height * dpr;
          canvasRef.current.style.width = width + "px";
          canvasRef.current.style.height = height + "px";
          engineRef.current?.render();
        }
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Switch mode
  const switchMode = useCallback((m: string) => {
    const eng = engineRef.current;
    if (!eng) return;
    // 保存当前模式的平移/缩放状态
    eng.modeStates[eng.mode] = { panX: eng.panX, panY: eng.panY, zoom: eng.zoom };
    // 恢复目标模式的平移/缩放状态
    const saved = eng.modeStates[m];
    if (saved) {
      eng.panX = saved.panX; eng.panY = saved.panY; eng.zoom = saved.zoom;
    } else {
      eng.panX = 0; eng.panY = 0; eng.zoom = 1;
    }
    eng.mode = m; eng.sel.clear(); eng.selConn = null; eng.linking = null;
    if (m === "mindmap") {
      if (!eng.nodes.filter(n => n.isMM).length) eng.initMM();
      else { eng.layoutMM(); eng.applyMMTheme(); }
    }
    eng.render();
    refP(eng);
    setEngineVersion(v => v + 1);
  }, [refP]);

  // Toolbar handlers
  const handleUndo = () => { engineRef.current?.undo(); refP(engineRef.current!); };
  const handleRedo = () => { engineRef.current?.redo(); refP(engineRef.current!); };
  const handleZoomIn = () => { const e = engineRef.current; if (e) { e.zoom = Math.min(3, e.zoom * 1.15); e.render(); setEngineVersion(v => v + 1); } };
  const handleZoomOut = () => { const e = engineRef.current; if (e) { e.zoom = Math.max(0.1, e.zoom / 1.15); e.render(); setEngineVersion(v => v + 1); } };
  const handleFit = () => {
    const e = engineRef.current; if (!e || !wrapRef.current) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of e.nodes) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height); }
    if (!isFinite(minX)) return;
    const wr = wrapRef.current.getBoundingClientRect();
    const cw2 = maxX - minX + 120, ch2 = maxY - minY + 120;
    e.zoom = Math.min(wr.width / cw2, wr.height / ch2, 1.5);
    e.panX = (wr.width - cw2 * e.zoom) / 2 - minX * e.zoom + 60 * e.zoom;
    e.panY = (wr.height - ch2 * e.zoom) / 2 - minY * e.zoom + 60 * e.zoom;
    e.render();
  };
  const toggleGrid = () => { const e = engineRef.current; if (e) { e.showGrid = !e.showGrid; e.render(); } };
  const toggleSnap = () => { const e = engineRef.current; if (e) { e.snapping = !e.snapping; } };

  // Set mindmap theme
  const setTheme = useCallback((themeId: string) => {
    const e = engineRef.current; if (!e) return;
    e.theme = themeId;
    if (e.mode === "mindmap") e.applyMMTheme();
    e.render();
    setEngineVersion(v => v + 1);
  }, []);

  // Delete selection
  const delSel = () => {
    const e = engineRef.current; if (!e) return;
    if (!e.sel.size && !e.selConn) return;
    e.pu();
    if (e.selConn) { e.conns = e.conns.filter(c => c.id !== e.selConn!.id); e.selConn = null; }
    const delST = (pid: string) => { for (const ch of e.gc(pid)) delST(ch.id); e.nodes = e.nodes.filter(n => n.id !== pid && n.parentId !== pid); };
    for (const id of e.sel) delST(id);
    e.conns = e.conns.filter(c => !e.sel.has(c.fromId) && !e.sel.has(c.toId));
    e.sel.clear();
    if (e.mode === "mindmap") e.layoutMM();
    e.render(); refP(e); toast("已删除");
  };

  // Add shape
  const addShape = (type: string) => {
    const e = engineRef.current; if (!e || e.mode !== "flowchart") return;
    e.pu();
    const n = e.crFlowNode(type, 300 + Math.random() * 100, 200 + Math.random() * 100);
    e.nodes.push(n); e.selN(n.id);
    e.render(); refP(e); toast("已添加: " + n.text);
  };

  // Mouse handlers
  const handleCanvasMouseDown = useCallback((ev: React.MouseEvent) => {
    const e = engineRef.current; if (!e) return;

    // Middle mouse button pan
    if (ev.button === 1) {
      ev.preventDefault();
      e.panning = true;
      e.ds = { x: ev.clientX, y: ev.clientY, panX: e.panX, panY: e.panY };
      return;
    }

    // Right-click drag pan
    if (ev.button === 2) {
      ev.preventDefault();
      e.panning = true;
      e.ds = { x: ev.clientX, y: ev.clientY, panX: e.panX, panY: e.panY };
      return;
    }

    const r = wrapRef.current!.getBoundingClientRect();
    const cpx = (ev.clientX - r.left - e.panX) / e.zoom;
    const cpy = (ev.clientY - r.top - e.panY) / e.zoom;

    // Space+drag or right-click pan
    if (e.spaceDown) {
      e.panning = true;
      e.ds = { x: ev.clientX, y: ev.clientY, panX: e.panX, panY: e.panY };
      return;
    }

    // Free draw / eraser mode
    if (e.mode === "freedraw") {
      if (e.freeDrawEraser && e.freeDrawSubTool === "pencil") {
        e.pu();
        e.eraseAtPoint(cpx, cpy);
        e.render();
        return;
      }
      if (e.freeDrawSubTool === "pencil") {
        e.startFreeDraw(cpx, cpy);
        return;
      }
      if (e.freeDrawSubTool === "rectangle") {
        e.startRectDraw(cpx, cpy);
        return;
      }
      if (e.freeDrawSubTool === "line") {
        e.startLineDraw(cpx, cpy);
        return;
      }
      if (e.freeDrawSubTool === "text") {
        const n = e.addTextAt(cpx - 70, cpy - 20, "双击编辑");
        e.selN(n.id);
        refP(e);
        // Open inline edit
        if (ieRef.current && canvasRef.current) {
          ieRef.current.style.display = "block";
          ieRef.current.value = n.text || "";
          ieRef.current.style.left = (n.x * e.zoom + e.panX) + "px";
          ieRef.current.style.top = (n.y * e.zoom + e.panY) + "px";
          ieRef.current.style.width = Math.max(n.width * e.zoom, 80) + "px";
          ieRef.current.style.height = Math.max(n.height * e.zoom, 28) + "px";
          ieRef.current.style.fontSize = (n.fs * e.zoom) + "px";
          ieRef.current.focus();
          ieRef.current.select();
          ieRef.current.dataset.nodeId = n.id;
        }
        return;
      }
      if (e.freeDrawSubTool === "pointer") {
        // Hit test for node selection/drag
        const hn = e.hitN(ev.clientX, ev.clientY);
        if (hn) {
          const additive = ev.shiftKey || ev.metaKey;
          if (additive) {
            if (e.sel.has(hn.id)) e.sel.delete(hn.id);
            else e.sel.add(hn.id);
          } else if (!e.sel.has(hn.id)) {
            e.selN(hn.id);
          }
          // 记录点击起点：若当前节点已在多选中且多选 > 1，点击（非拖拽）时应收敛为单选
          if (e.sel.has(hn.id) && e.sel.size > 1) {
            e.clickStartX = ev.clientX; e.clickStartY = ev.clientY; e.clickStartNodeId = hn.id;
          }
          e.dragging = true;
          e.ds = {
            x: ev.clientX, y: ev.clientY,
            nodes: [...e.sel].map(id => e.gn(id)).filter(Boolean).map((n: any) => ({ id: n.id, x: n.x, y: n.y }))
          };
          e.pu();
          refP(e);
          e.render();
        } else {
          // Empty area → marquee select
          if (!(ev.shiftKey || ev.metaKey)) { e.sel.clear(); e.selConn = null; }
          e.startMarquee(cpx, cpy);
          refP(e);
        }
        return;
      }
      return;
    }

    // Hit test for node/conn
    const hn = e.hitN(ev.clientX, ev.clientY);
    if (hn) {
      // Linking
      if (e.linking && e.mode === "flowchart" && hn.id !== e.linking) {
        e.pu();
        e.conns.push(e.mkConn(e.linking, hn.id, e.linkStyle));
        e.linking = null; e.render(); toast("连线已创建");
        return;
      }
      if (e.linking) { e.linking = null; e.render(); return; }

      // Select and start drag
      const additive = ev.shiftKey || ev.metaKey;
      if (additive) {
        if (e.sel.has(hn.id)) e.sel.delete(hn.id);
        else e.sel.add(hn.id);
      } else if (!e.sel.has(hn.id)) {
        e.selN(hn.id);
      }
      // 记录点击起点：若当前节点已在多选中且多选 > 1，点击（非拖拽）时应收敛为单选
      if (e.sel.has(hn.id) && e.sel.size > 1) {
        e.clickStartX = ev.clientX; e.clickStartY = ev.clientY; e.clickStartNodeId = hn.id;
      }
      e.dragging = true;
      e.ds = {
        x: ev.clientX, y: ev.clientY,
        nodes: [...e.sel].map(id => e.gn(id)).filter(Boolean).map((n: any) => ({ id: n.id, x: n.x, y: n.y }))
      };
      e.pu();
      refP(e);
      e.render();
    } else {
      // Empty area → start marquee
      if (!(ev.shiftKey || ev.metaKey)) {
        e.sel.clear(); e.selConn = null;
      }
      e.startMarquee(cpx, cpy);
      refP(e);
    }
  }, [toast, refP]);

  const handleCanvasMouseMove = useCallback((ev: React.MouseEvent) => {
    const e = engineRef.current; if (!e) return;

    // Panning
    if (e.panning && e.ds) {
      e.panX = e.ds.panX + (ev.clientX - e.ds.x);
      e.panY = e.ds.panY + (ev.clientY - e.ds.y);
      e.render(); return;
    }

    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const cpx = (ev.clientX - r.left - e.panX) / e.zoom;
    const cpy = (ev.clientY - r.top - e.panY) / e.zoom;

    // Free draw eraser: continuous erase
    if (e.mode === "freedraw" && e.freeDrawEraser && e.freeDrawSubTool === "pencil" && ev.buttons === 1) {
      e.eraseAtPoint(cpx, cpy);
      e.render();
      setFDMousePos({ x: cpx, y: cpy });
      return;
    }

    // Free draw continue (pencil)
    if (e.drawing && e.mode === "freedraw" && e.freeDrawSubTool === "pencil") {
      e.continueFreeDraw(cpx, cpy);
      return;
    }

    // Rectangle continue
    if (e.drawingRect) {
      e.continueRectDraw(cpx, cpy);
      return;
    }

    // Line continue
    if (e.drawingLine) {
      e.continueLineDraw(cpx, cpy);
      return;
    }

    // Node dragging
    if (e.dragging && e.ds) {
      const dx = (ev.clientX - e.ds.x) / e.zoom;
      const dy = (ev.clientY - e.ds.y) / e.zoom;
      for (const dn of e.ds.nodes) {
        const n = e.gn(dn.id);
        if (!n) continue;
        const rx = dn.x + dx, ry = dn.y + dy;
        n.x = e.snapping ? Math.round(rx / e.gs) * e.gs : rx;
        n.y = e.snapping ? Math.round(ry / e.gs) * e.gs : ry;
      }
      e.render(); return;
    }

    // Marquee update
    if (e.marqueeActive) {
      e.updateMarquee(cpx, cpy);
      return;
    }
  }, []);

  const handleCanvasMouseUp = useCallback((ev: React.MouseEvent) => {
    const e = engineRef.current; if (!e) return;

    // End free draw
    if (e.drawing && e.mode === "freedraw") {
      e.endFreeDraw();
      return;
    }

    // End rect draw
    if (e.drawingRect) {
      e.endRectDraw();
      refP(e);
      return;
    }

    // End line draw
    if (e.drawingLine) {
      e.endLineDraw();
      return;
    }

    // End marquee
    if (e.marqueeActive) {
      e.endMarquee(ev.shiftKey || ev.metaKey);
      refP(e);
      return;
    }

    e.dragging = false; e.panning = false;
    // 纯点击（无拖拽）多选节点时，收敛为只选中被点击的单个节点
    if (e.clickStartNodeId && e.sel.size > 1) {
      const dist = Math.hypot(ev.clientX - e.clickStartX, ev.clientY - e.clickStartY);
      if (dist < 3) e.selN(e.clickStartNodeId);
    }
    e.clickStartNodeId = null; e.clickStartX = 0; e.clickStartY = 0;
    refP(e); e.render();
  }, [refP]);

  const handleWheel = useCallback((ev: React.WheelEvent) => {
    const e = engineRef.current; if (!e || !wrapRef.current) return;
    ev.preventDefault();
    const zf = ev.deltaY < 0 ? 1.08 : 1 / 1.08;
    const nz = e.zoom * zf;
    if (nz < 0.1 || nz > 3) return;
    const r = wrapRef.current.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    e.panX = mx - (mx - e.panX) * (nz / e.zoom);
    e.panY = my - (my - e.panY) * (nz / e.zoom);
    e.zoom = nz; e.render(); setEngineVersion(v => v + 1);
  }, []);

  const handleDblClick = useCallback((ev: React.MouseEvent) => {
    const e = engineRef.current; if (!e) return;
    const hn = e.hitN(ev.clientX, ev.clientY);
    if (hn && ieRef.current && canvasRef.current) {
      ieRef.current.style.display = "block";
      ieRef.current.value = hn.text || "";
      ieRef.current.style.left = (hn.x * e.zoom + e.panX) + "px";
      ieRef.current.style.top = (hn.y * e.zoom + e.panY) + "px";
      ieRef.current.style.width = Math.max(hn.width * e.zoom, 80) + "px";
      ieRef.current.style.height = Math.max(hn.height * e.zoom, 28) + "px";
      ieRef.current.style.fontSize = (hn.fs * e.zoom) + "px";
      ieRef.current.focus();
      ieRef.current.select();
      ieRef.current.dataset.nodeId = hn.id;
    } else if (e.mode === "flowchart") {
      const r = wrapRef.current!.getBoundingClientRect();
      const cx = (ev.clientX - r.left - e.panX) / e.zoom;
      const cy = (ev.clientY - r.top - e.panY) / e.zoom;
      e.pu();
      const n = e.crFlowNode("rounded-rect", cx, cy);
      e.nodes.push(n); e.selN(n.id); e.render(); refP(e);
      // Open inline edit
      if (ieRef.current) {
        ieRef.current.style.display = "block";
        ieRef.current.value = n.text || "";
        ieRef.current.style.left = (n.x * e.zoom + e.panX) + "px";
        ieRef.current.style.top = (n.y * e.zoom + e.panY) + "px";
        ieRef.current.style.width = Math.max(n.width * e.zoom, 80) + "px";
        ieRef.current.style.height = Math.max(n.height * e.zoom, 28) + "px";
        ieRef.current.focus(); ieRef.current.select();
        ieRef.current.dataset.nodeId = n.id;
      }
    }
  }, [refP]);

  // Inline edit blur
  const handleIEditBlur = useCallback(() => {
    const e = engineRef.current;
    if (!e || !ieRef.current) return;
    const nid = ieRef.current.dataset.nodeId;
    const n = nid ? e.gn(nid) : null;
    if (n && ieRef.current.value !== n.text) {
      e.pu();
      n.text = ieRef.current.value || "文本";
      if (e.mode === "mindmap") e.layoutMM();
      e.render(); refP(e);
    }
    ieRef.current.style.display = "none";
  }, [refP]);

  // Keyboard
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      const tag = (ev.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const m = ev.metaKey || ev.ctrlKey;
      if (m && ev.key === "s") { ev.preventDefault(); save(); return; }
      if (m && ev.key === "z") { ev.preventDefault(); handleUndo(); return; }
      if (m && (ev.key === "y" || (ev.key === "z" && ev.shiftKey))) { ev.preventDefault(); handleRedo(); return; }
      if ((ev.key === "Delete" || ev.key === "Backspace") && e && (e.sel.size > 0 || e.selConn)) { ev.preventDefault(); delSel(); return; }
      if (m && ev.key === "c" && e) { ev.preventDefault(); e.copy(); return; }
      if (m && ev.key === "x" && e) { ev.preventDefault(); e.cut(); return; }
      if (m && ev.key === "v" && e) { ev.preventDefault(); e.paste(); return; }
      if (m && ev.key === "e") { ev.preventDefault(); setShowExportModal(true); return; }
      if (ev.key === "Escape" && e) {
        e.linking = null; e.render();
        if (ieRef.current) ieRef.current.style.display = "none";
      }
      // Mindmap Tab/Enter shortcuts
      if (e && e.mode === "mindmap" && (ev.key === "Tab" || ev.key === "Enter")) {
        ev.preventDefault();
        if (ev.key === "Tab" && e.sel.size) {
          e.pu(); e.addMMChild([...e.sel][0]);
        } else if (ev.key === "Enter" && e.sel.size) {
          const n = e.gn([...e.sel][0]);
          if (n?.parentId) {
            e.pu(); const s = e.mkNode("mindmap", 0, 0, n.parentId);
            s.text = "同级节点"; e.nodes.push(s); e.layoutMM(); e.applyMMTheme(); e.selN(s.id); e.render();
          } else { e.pu(); e.mkMMRoot(200, e.nodes.filter(n2 => n2.isMM && !n2.parentId).length * 300 + 120); e.layoutMM(); e.render(); }
        }
      }
      // Space: enter pan mode (prevent page scroll)
      if (ev.key === " " && !ev.repeat) {
        if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
          ev.preventDefault();
          e?.setSpaceDown(true);
          setEngineVersion(v => v + 1);
        }
      }
      // Number keys: switch freedraw sub-tool (1-5)
      if (e && e.mode === "freedraw" && ["1","2","3","4","5"].includes(ev.key)) {
        const subTools = ["pointer","rectangle","line","pencil","text"] as const;
        const idx = parseInt(ev.key) - 1;
        if (idx >= 0 && idx < subTools.length) {
          setFDSubTool(subTools[idx]);
          if (subTools[idx] !== "pencil") setFDEraser(false);
        }
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === " ") {
        const e = engineRef.current;
        e?.setSpaceDown(false);
        setEngineVersion(v => v + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [save, handleUndo, handleRedo]);

  // Menu items
  type MenuItem = { label: string; action?: () => void; kd?: string; sep?: never } | { sep: true; label?: never; action?: never; kd?: never };
  const menuItems: Record<string, MenuItem[]> = {
    文件: [
      { label: "新建", action: () => router.push("/dashboard"), kd: "Ctrl+N" },
      { label: "保存", action: () => save(), kd: "Ctrl+S" },
      { label: "导出 PNG", action: () => engineRef.current?.exportPNG() },
      { label: "导出 JSON", action: () => engineRef.current?.exportJSON() },
      { sep: true },
      { label: "返回仪表盘", action: () => { save(true).then(() => router.push("/dashboard")); } },
    ],
    编辑: [
      { label: "撤销", action: handleUndo, kd: "Ctrl+Z" },
      { label: "重做", action: handleRedo, kd: "Ctrl+Y" },
      { sep: true },
      { label: "删除选中", action: delSel, kd: "Del" },
    ],
    插入: [
      { label: "矩形", action: () => addShape("rect") },
      { label: "圆角矩形", action: () => addShape("rounded-rect") },
      { label: "椭圆", action: () => addShape("ellipse") },
      { label: "菱形", action: () => addShape("diamond") },
      { label: "三角形", action: () => addShape("triangle") },
    ],
    查看: [
      { label: "放大", action: handleZoomIn, kd: "Ctrl+=" },
      { label: "缩小", action: handleZoomOut, kd: "Ctrl+-" },
      { label: "适应画布", action: handleFit },
      { label: "100%", action: () => { const e = engineRef.current; if (e) { e.zoom = 1; e.panX = 0; e.panY = 0; e.render(); setEngineVersion(v => v + 1); } } },
    ],
    帮助: [
      { label: "快捷键", action: () => toast("Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Y 重做 · Del 删除 · 滚轮缩放") },
      { label: "关于 DiagramMaster", action: () => toast("DiagramMaster v5.0 - 专业在线制图工具") },
    ],
  };

  // Shape categories
  const shapeCategories = [
    { id: "basic", name: "📐 基础形状", shapes: ["rect","rounded-rect","ellipse","diamond","triangle","hexagon","parallelogram","trapezoid","pentagon","star","cross","arrow-right","callout"] },
    { id: "flow", name: "🔄 流程图", shapes: ["cylinder","document","cloud","terminal","manual-input","off-page","preparation","delay"] },
    { id: "uml", name: "🔷 UML", shapes: ["uml-class","uml-interface","uml-note","actor","use-case","component","lifeline"] },
    { id: "er", name: "🗄️ ER图", shapes: ["er-entity","er-attr","er-relation","er-weak-entity"] },
    { id: "network", name: "🌐 网络", shapes: ["server","database2","router","firewall","cloud-aws","mobile","monitor"] },
  ];

  const shapeNames: Record<string,string> = { rect:"矩形","rounded-rect":"圆角矩形",ellipse:"椭圆",diamond:"菱形",triangle:"三角形",hexagon:"六边形",parallelogram:"平行四边形",trapezoid:"梯形",pentagon:"五边形",star:"五角星",cross:"十字形","arrow-right":"箭头",callout:"标注",cylinder:"数据库",document:"文档",cloud:"云形",terminal:"终止","manual-input":"手工输入","off-page":"页外引用",preparation:"准备",delay:"延迟","uml-class":"类","uml-interface":"接口","uml-note":"注释",actor:"参与者","use-case":"用例",component:"组件",lifeline:"生命线","er-entity":"实体","er-attr":"属性","er-relation":"关系","er-weak-entity":"弱实体",server:"服务器",database2:"数据库",router:"路由器",firewall:"防火墙","cloud-aws":"云",mobile:"手机",monitor:"显示器" };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full" /></div>;
  }

  const eng = engineRef.current;

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 overflow-hidden">
      {/* ===== MENU BAR ===== */}
      <div className="h-9 bg-gray-50 border-b border-gray-200 flex items-center px-3 shrink-0 z-50">
        <button onClick={() => router.push("/dashboard")} className="group flex items-center gap-2 mr-6">
          <div className="relative w-4 h-4">
            <Grid3X3 className="w-4 h-4 text-gray-500 absolute inset-0 transition-all duration-200 group-hover:opacity-0 group-hover:scale-75" />
            <ArrowLeft className="w-4 h-4 text-gray-700 absolute inset-0 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 scale-75" />
          </div>
          <span className="font-medium text-sm text-gray-900 max-w-[220px] truncate">{project?.name || "DiagramMaster"}</span>
        </button>

        <div className="flex items-center gap-0.5 text-xs text-gray-700">
          {Object.keys(menuItems).map(key => (
            <div key={key} className="relative">
              <button
                className={`px-2.5 py-1 hover:bg-gray-100 rounded flex items-center gap-1 transition-colors ${activeMenu === key ? "bg-gray-100 text-gray-900" : "text-gray-600"}`}
                onClick={() => setActiveMenu(activeMenu === key ? null : key)}
                onMouseEnter={() => activeMenu && setActiveMenu(key)}
              >
                {key}
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {activeMenu === key && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                  <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                    {menuItems[key].map((item, i) =>
                      "sep" in item && item.sep ? <div key={i} className="h-px bg-gray-200 my-1" /> :
                      <button key={i} onClick={() => { item.action?.(); setActiveMenu(null); }} className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                        <span>{item.label}</span>
                        {item.kd && <span className="text-gray-400 ml-4">{item.kd}</span>}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索命令..."
              className="bg-transparent border-none outline-none text-xs w-24 placeholder:text-gray-400"
            />
          </div>
          <button className="h-7 px-2.5 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5" />
            分享
          </button>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center px-3 gap-1 shrink-0">
        {/* File operations */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => router.push("/dashboard")} className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />新建
          </button>
          <button onClick={() => save()} disabled={saving} className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />{saving ? "保存中..." : "保存"}
          </button>
          <button onClick={() => engineRef.current?.exportPNG()} className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />导出
          </button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <button onClick={handleUndo} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="撤销 Ctrl+Z"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={handleRedo} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="重做 Ctrl+Y"><Redo2 className="w-3.5 h-3.5" /></button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Edit */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => engineRef.current?.cut()} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="剪切 Ctrl+X"><Scissors className="w-3.5 h-3.5" /></button>
          <button onClick={() => engineRef.current?.copy()} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="复制 Ctrl+C"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={() => engineRef.current?.paste()} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="粘贴 Ctrl+V"><ClipboardPaste className="w-3.5 h-3.5" /></button>
          <button onClick={delSel} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-500 hover:text-red-500" title="删除 Del"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Mode switch */}
        <div className="flex items-center gap-0.5">
          {(["mindmap","flowchart","freedraw"] as const).map(m => (
            <button key={m}
              onClick={() => switchMode(m)}
              className={`h-7 px-2.5 text-xs rounded transition-colors ${eng?.mode === m ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {m === "mindmap" ? "思维导图" : m === "flowchart" ? "流程图" : "自由绘图"}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Grid / Snap */}
        <div className="flex items-center gap-0.5">
          <button onClick={toggleGrid} className={`h-7 w-7 flex items-center justify-center rounded ${eng?.showGrid ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:bg-gray-100"}`} title="网格">
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleSnap} className={`h-7 w-7 flex items-center justify-center rounded ${eng?.snapping ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:bg-gray-100"}`} title="吸附">
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme colors — only show in mindmap mode */}
        {eng?.mode === "mindmap" && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="flex items-center gap-0.5">
              {Object.entries(MM_THEMES).map(([id, t]) => (
                <button key={id} onClick={() => setTheme(id)}
                  className="h-5 w-5 rounded-full border-2 transition-all hover:scale-110"
                  style={{ backgroundColor: t.strokes[0], borderColor: eng?.theme === id ? "#374151" : "transparent" }}
                  title={t.nameZh}
                />
              ))}
            </div>
          </>
        )}

        <Separator orientation="vertical" className="h-6 mx-1" />

        <button onClick={handleFit} className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="适应画布">
          <Maximize className="w-3.5 h-3.5" />
        </button>

        {/* Panel toggle + Zoom (right) */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className="h-7 px-1.5 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="切换左侧面板">
            {leftPanelOpen ? "◀" : "▶"}
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="h-7 px-1.5 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="切换右侧面板">
            {rightPanelOpen ? "▶" : "◀"}
          </button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-0.5 border border-gray-200 rounded px-1.5 py-0.5">
            <button onClick={handleZoomOut} className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"><ZoomOut className="w-3 h-3" /></button>
            <span className="text-xs font-medium min-w-[2.5rem] text-center cursor-pointer" onClick={() => { if (eng) { eng.zoom = 1; eng.panX = 0; eng.panY = 0; eng.render(); setEngineVersion(v => v + 1); } }}>
              {eng ? Math.round(eng.zoom * 100) + "%" : "100%"}
            </span>
            <button onClick={handleZoomIn} className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"><ZoomIn className="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      {/* ===== FREEDRAW SUB-TOOLBAR (only in freedraw mode) ===== */}
      {eng?.mode === "freedraw" && (
        <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 font-medium mr-1">工具</span>
          {([
            { id: "pointer", icon: MousePointer, label: "指针", num: "1" },
            { id: "rectangle", icon: "□", label: "矩形", num: "2" },
            { id: "line", icon: "╲", label: "直线", num: "3" },
            { id: "pencil", icon: Pen, label: "画笔", num: "4" },
            { id: "text", icon: Type, label: "文字", num: "5" },
          ] as const).map((t, i) => (
            <button key={t.id}
              onClick={() => { setFDSubTool(t.id); if (t.id !== "pencil") setFDEraser(false); }}
              className={`h-7 px-2.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                fdSubTool === t.id && !(t.id === "pencil" && fdEraser)
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              title={`${t.label} (${t.num})`}
            >
              {t.icon === MousePointer ? <t.icon className="w-3.5 h-3.5" /> :
               typeof t.icon === "string"
                 ? <span className="text-sm leading-none">{t.icon}</span>
                 : <t.icon className="w-3.5 h-3.5" />}
              <span>{t.label}</span>
              <span className={`text-[10px] ml-0.5 ${fdSubTool === t.id && !(t.id === "pencil" && fdEraser) ? "text-gray-300" : "text-gray-400"}`}>{t.num}</span>
            </button>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Eraser toggle (only relevant for pencil) */}
          {fdSubTool === "pencil" && (
            <button
              onClick={() => setFDEraser(!fdEraser)}
              className={`h-7 px-2 text-xs rounded transition-colors flex items-center gap-1 ${
                fdEraser ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
              title="橡皮擦"
            >
              <Eraser className="w-3.5 h-3.5" />
              橡皮擦
            </button>
          )}

          {(fdSubTool === "rectangle" || fdSubTool === "line" || fdSubTool === "pencil" || fdSubTool === "text") && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">描边</span>
                <input type="color" value={fdColor} onChange={e => setFDColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 p-0" />
                <span className="text-[10px] text-gray-400 ml-0.5">粗细</span>
                <input type="range" min={1} max={8} step={0.5} value={fdWidth}
                  onChange={e => setFDWidth(+e.target.value)}
                  className="w-16 h-1 accent-gray-900" />
                <span className="text-[10px] text-gray-500 w-5">{fdWidth}</span>
                {fdSubTool === "rectangle" && (
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer ml-1">
                    <input type="checkbox" checked={fdFill} onChange={e => setFDFill(e.target.checked)}
                      className="w-3 h-3 rounded accent-gray-900" />
                    填充
                  </label>
                )}
              </div>
            </>
          )}

          <span className="ml-auto text-[10px] text-gray-400">
            提示: 数字键 1-5 切换工具 · 空格拖拽画布 · 滚轮缩放
          </span>
        </div>
      )}

      {/* ===== MAIN ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanelOpen && eng?.mode === "freedraw" && (
          <div className="w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto shrink-0">
            <div className="p-3 space-y-3">
              {/* Pencil-only options */}
              {fdSubTool === "pencil" && (
                <>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100/50 border-b border-gray-200">画笔工具</div>
                    <div className="p-2 space-y-0.5">
                      {[
                        { id: "pen", icon: Pen, label: "钢笔", desc: "平滑线条" },
                        { id: "marker", icon: PaintBucket, label: "马克笔", desc: "粗线条" },
                        { id: "pencil", icon: Pencil, label: "铅笔", desc: "细线条" },
                      ].map(t => (
                        <button key={t.id}
                          onClick={() => { setFDTool(t.id); setFDEraser(false); }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded transition-colors ${fdTool === t.id && !fdEraser ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          <t.icon className="w-3.5 h-3.5" />
                          <div className="text-left">
                            <div>{t.label}</div>
                            <div className="text-[10px] text-gray-400">{t.desc}</div>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => setFDEraser(!fdEraser)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded transition-colors ${fdEraser ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <div className="text-left">
                          <div>橡皮擦</div>
                          <div className="text-[10px] text-gray-400">擦除线条</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100/50 border-b border-gray-200 flex items-center gap-1.5">
                      <Palette className="w-3 h-3" />颜色
                    </div>
                    <div className="p-2">
                      <div className="flex gap-1 mb-2">
                        <input type="color" value={fdColor} onChange={e => setFDColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5" />
                        <input value={fdColor} onChange={e => setFDColor(e.target.value)}
                          className="flex-1 h-8 bg-white border border-gray-300 rounded px-2 text-xs font-mono text-gray-900" />
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {["#1e293b","#475569","#64748b","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#78716c","#000000","#ffffff","#9ca3af"].map(c => (
                          <button key={c} onClick={() => setFDColor(c)}
                            className="w-6 h-6 rounded border transition-transform hover:scale-110"
                            style={{ backgroundColor: c, borderColor: fdColor === c ? "#374151" : "#d1d5db", borderWidth: fdColor === c ? 2 : 1 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg bg-white p-2.5">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      {fdEraser ? "橡皮擦大小" : "笔触粗细"}
                    </div>
                    <input type="range"
                      min={1} max={fdEraser ? 60 : 12} step={0.5}
                      value={fdEraser ? fdEraserSize : fdWidth}
                      onChange={e => fdEraser ? setFDEraserSize(+e.target.value) : setFDWidth(+e.target.value)}
                      className="w-full h-1 accent-gray-900 mb-1"
                    />
                    <div className="text-[10px] text-gray-500 text-right">
                      {fdEraser ? `${fdEraserSize}px` : `${fdWidth}px`}
                    </div>
                  </div>
                </>
              )}

              {/* Shape/Licne styling options */}
              {(fdSubTool === "rectangle" || fdSubTool === "line" || fdSubTool === "text") && (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100/50 border-b border-gray-200 flex items-center gap-1.5">
                    <Palette className="w-3 h-3" />{fdSubTool === "rectangle" ? "矩形样式" : fdSubTool === "line" ? "线条样式" : "文字样式"}
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={fdColor} onChange={e => setFDColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5" />
                      <input value={fdColor} onChange={e => setFDColor(e.target.value)}
                        className="flex-1 h-7 bg-white border border-gray-300 rounded px-2 text-xs font-mono text-gray-900" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 w-5">粗细</span>
                      <input type="range" min={1} max={8} step={0.5} value={fdWidth}
                        onChange={e => setFDWidth(+e.target.value)}
                        className="flex-1 h-1 accent-gray-900" />
                      <span className="text-[10px] text-gray-500 w-6 text-right">{fdWidth}px</span>
                    </div>
                    {fdSubTool === "rectangle" && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={fdFill} onChange={e => setFDFill(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-gray-900" />
                        填充半透明
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Pointer info */}
              {fdSubTool === "pointer" && (
                <div className="border border-gray-200 rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500 leading-relaxed">
                    <p className="font-medium text-gray-700 mb-1">指针工具</p>
                    <p>点击选择元素</p>
                    <p>拖拽移动元素</p>
                    <p>拖拽空白区域框选</p>
                    <p className="mt-1 text-[10px] text-gray-400">Shift+点击 多选 · 空格+拖拽 平移</p>
                  </div>
                </div>
              )}

              {/* Clear all */}
              <button
                onClick={() => {
                  const e2 = engineRef.current;
                  if (!e2) return;
                  e2.pu();
                  e2.paths = [];
                  e2.render();
                  toast("已清除所有手绘");
                }}
                className="w-full py-1.5 text-xs text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              >
                清除所有手绘
              </button>
            </div>
          </div>
        )}
        {leftPanelOpen && eng?.mode !== "freedraw" && (
          <div className="w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto shrink-0">
            <div className="p-3">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchShapes}
                  onChange={e => setSearchShapes(e.target.value)}
                  placeholder="搜索图形..."
                  className="w-full h-8 bg-white border border-gray-200 rounded-md pl-8 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                />
              </div>

              {eng?.mode === "mindmap" ? (
                /* Mindmap tools */
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100/50 border-b border-gray-200">思维导图工具</div>
                  <div className="p-2 space-y-0.5">
                    {[
                      { label: "添加子节点", kd: "Tab", action: () => { if (eng.sel.size) { eng.pu(); eng.addMMChild([...eng.sel][0]); } } },
                      { label: "添加同级节点", kd: "Enter", action: () => { if (eng.sel.size) { const n = eng.gn([...eng.sel][0]); if (n?.parentId) { eng.pu(); const s = eng.mkNode("mindmap", 0, 0, n.parentId); s.text = "同级节点"; eng.nodes.push(s); eng.layoutMM(); eng.applyMMTheme(); eng.selN(s.id); eng.render(); } else { eng.pu(); eng.mkMMRoot(200, eng.nodes.filter(n2 => n2.isMM && !n2.parentId).length * 300 + 120); eng.layoutMM(); eng.render(); } } } },
                      { label: "新建导图", action: () => { eng.pu(); eng.mkMMRoot(200, eng.nodes.filter(n => n.isMM && !n.parentId).length * 300 + 120); eng.layoutMM(); eng.render(); } },
                      { label: "删除节点", kd: "Del", action: delSel },
                    ].map((b, i) => (
                      <button key={i} onClick={b.action} className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">
                        <span>{b.label}</span>
                        {b.kd && <span className="text-gray-400 text-[10px]">{b.kd}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Shape categories accordion */
                <Accordion defaultValue={shapeCategories.map(c => c.id)} className="space-y-1.5">
                  {shapeCategories.map(cat => {
                    const filtered = cat.shapes.filter(s =>
                      !searchShapes || s.includes(searchShapes.toLowerCase()) || (shapeNames[s] || "").includes(searchShapes)
                    );
                    if (searchShapes && !filtered.length) return null;
                    return (
                      <AccordionItem key={cat.id} value={cat.id}>
                        <AccordionTrigger value={cat.id}>{cat.name}</AccordionTrigger>
                        <AccordionContent value={cat.id}>
                          <div className="grid grid-cols-2 gap-1">
                            {filtered.map(s => (
                              <button key={s}
                                onClick={() => { if (eng && eng.mode === "flowchart") addShape(s); else toast("请切换到流程图模式"); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded transition-colors text-left"
                              >
                                <ShapeIcon type={s} size={16} />
                                <span className="truncate">{shapeNames[s] || s}</span>
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          <div
            ref={wrapRef}
            className="flex-1 relative m-4 overflow-hidden bg-white border border-gray-300 shadow-sm"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleWheel}
            onDoubleClick={handleDblClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: eng?.panning ? "grabbing" : eng?.spaceDown ? "grab" : (eng?.mode === "freedraw" && eng?.freeDrawEraser ? "crosshair" : (eng?.mode === "freedraw" && eng?.freeDrawSubTool === "text" ? "text" : (eng?.mode === "freedraw" ? "crosshair" : eng?.linking ? "crosshair" : "default"))) }}
          >
            <canvas ref={canvasRef} className="absolute inset-0" />
            <input
              ref={ieRef}
              defaultValue=""
              onBlur={handleIEditBlur}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); } if (e.key === "Escape") { handleIEditBlur(); } }}
              className="absolute hidden border-2 border-gray-700 rounded px-2 py-0.5 text-sm outline-none bg-white shadow-lg z-50"
              style={{ fontFamily: "'PingFang SC',sans-serif" }}
            />
          </div>

          {/* Status Bar */}
          <div className="h-7 bg-gray-50 border-t border-gray-200 flex items-center px-3 text-xs text-gray-500 shrink-0">
            <span>准备就绪</span>
            <Separator orientation="vertical" className="h-4 mx-2" />
            <span>模式: {eng?.mode === "mindmap" ? "思维导图" : eng?.mode === "flowchart" ? "流程图" : `自由绘图 · ${fdSubTool === "pointer" ? "指针" : fdSubTool === "rectangle" ? "矩形" : fdSubTool === "line" ? "直线" : fdSubTool === "pencil" ? "画笔" : "文字"}`}</span>
            <span className="ml-auto text-gray-400">
              {eng ? `元素: ${eng.nodes.length} · 连线: ${eng.conns.length} · ${Math.round(eng.zoom * 100)}%` : ""}
            </span>
          </div>
        </div>

        {/* Right Panel */}
        {rightPanelOpen && selNode && (
          <div className="w-64 bg-gray-50 border-l border-gray-200 overflow-y-auto shrink-0">
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-900">属性面板</span>
              </div>

              {/* Text */}
              <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="text-xs font-medium text-gray-700 mb-2">文本</div>
                <input value={pText} onChange={e => { setPText(e.target.value); updSel("text", e.target.value); }}
                  className="w-full h-7 bg-white border border-gray-300 rounded px-2 text-xs text-gray-900 mb-2" />
                <div className="flex gap-1 mb-2">
                  <input type="number" value={pFS} onChange={e => { setPFS(+e.target.value); updSel("fs", +e.target.value); }} min={8} max={96}
                    className="w-12 h-7 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900" />
                  <select value={pFF} onChange={e => { setPFF(e.target.value); updSel("ff", e.target.value); }}
                    className="flex-1 h-7 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900">
                    <option value="PingFang SC">苹方</option><option value="Microsoft YaHei">微软雅黑</option>
                    <option value="Arial">Arial</option><option value="Georgia">Georgia</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  {["B","I","U"].map((s, i) => {
                    const keys = ["fb","fi","fu"]; const vals = [pBold, pItalic, pUnder]; const setters = [setPBold, setPItalic, setPUnder];
                    return <button key={s} onClick={() => { setters[i](!vals[i]); updSel(keys[i], !vals[i]); }}
                      className={`flex-1 h-6 text-xs rounded border ${vals[i] ? "border-gray-900 bg-gray-100 text-gray-900" : "border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
                      {s === "B" ? <b>B</b> : s === "I" ? <i>I</i> : <u>U</u>}
                    </button>;
                  })}
                </div>
              </div>

              {/* Position & Size */}
              <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="text-xs font-medium text-gray-700 mb-2">位置与大小</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { label: "X", val: pX, set: setPX, key: "x" },
                    { label: "Y", val: pY, set: setPY, key: "y" },
                    { label: "W", val: pW, set: setPW, key: "width" },
                    { label: "H", val: pH, set: setPH, key: "height" },
                  ] as const).map(row => (
                    <div key={row.label} className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 w-3">{row.label}</span>
                      <input type="number" value={row.val} onChange={e => { row.set(+e.target.value); updSel(row.key, +e.target.value); }}
                        className="flex-1 h-6 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="text-xs font-medium text-gray-700 mb-2">样式</div>
                <div className="flex gap-1 mb-2">
                  <input type="color" value={pFill} onChange={e => { setPFill(e.target.value); updSel("fill", e.target.value); }} className="w-7 h-7 rounded cursor-pointer border border-gray-300 p-0.5" title="填充颜色" />
                  <input type="color" value={pStroke} onChange={e => { setPStroke(e.target.value); updSel("stroke", e.target.value); }} className="w-7 h-7 rounded cursor-pointer border border-gray-300 p-0.5" title="描边颜色" />
                  <input type="number" value={pSW} onChange={e => { setPSW(+e.target.value); updSel("sw", +e.target.value); }} min={0} max={12} step={0.5}
                    className="w-10 h-7 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900" title="描边宽度" />
                </div>
                <div className="flex gap-1 mb-2">
                  <select value={pLS} onChange={e => { setPLS(e.target.value); updSel("ls", e.target.value); }}
                    className="flex-1 h-6 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900">
                    <option value="solid">实线</option><option value="dashed">虚线</option>
                    <option value="dotted">点线</option>
                  </select>
                  <input type="number" value={pCR} onChange={e => { setPCR(+e.target.value); updSel("cr", +e.target.value); }} min={0} max={60}
                    className="w-10 h-6 bg-white border border-gray-300 rounded px-1 text-xs text-gray-900" placeholder="圆角" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" value={pOpacity} onChange={e => { setPOpacity(+e.target.value); updSel("opacity", +e.target.value); }} min={0} max={100}
                    className="flex-1 h-1 accent-gray-900" />
                  <span className="text-[10px] text-gray-500 w-8 text-right">{pOpacity}%</span>
                </div>
              </div>

              {/* Quick color palette */}
              <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="text-xs font-medium text-gray-700 mb-2">快速配色</div>
                <div className="grid grid-cols-7 gap-1">
                  {PALETTE.slice(0, 21).map((c, i) => (
                    <button key={i}
                      onClick={() => { setPFill(c); updSel("fill", c); }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-medium z-[9999] shadow-lg border border-gray-700 transition-opacity duration-200 ${toastVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {toastMsg}
      </div>
    </div>
  );
}
