"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/ui/AuthProvider";
import { DiagramEngine, PALETTE, DIMS, DEFS, THEMES } from "@/components/editor/DiagramCanvas";
import type { DiagramNode, DiagramConn } from "@/components/editor/DiagramCanvas";
import { ArrowLeft, Save, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Grid3X3, Magnet, Trash2, Copy, Scissors } from "lucide-react";

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

  // Init engine
  const initEngine = useCallback(async () => {
    if (!canvasRef.current || !wrapRef.current || !projectId) return;

    // Fetch project
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) { router.push("/dashboard"); return; }
    const proj = await res.json();
    setProject(proj);
    document.title = proj.name + " - DiagramMaster";

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;

    const eng = new DiagramEngine();
    eng.canvas = canvas;
    eng.ctx = canvas.getContext("2d")!;
    eng.onToast = toast;
    engineRef.current = eng;

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
    setLoading(false);
  }, [projectId, router, toast]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
    else if (user) initEngine();
  }, [user, authLoading, router, initEngine]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (!canvasRef.current || !wrapRef.current) return;
      canvasRef.current.width = wrapRef.current.clientWidth;
      canvasRef.current.height = wrapRef.current.clientHeight;
      engineRef.current?.render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Switch mode
  const switchMode = useCallback((m: string) => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.mode = m; eng.sel.clear(); eng.selConn = null; eng.linking = null;
    if (m === "mindmap") {
      if (!eng.nodes.filter(n => n.isMM).length) eng.initMM();
      else eng.layoutMM();
    }
    eng.render();
    refP(eng);
  }, [refP]);

  // Toolbar handlers
  const handleUndo = () => { engineRef.current?.undo(); refP(engineRef.current!); };
  const handleRedo = () => { engineRef.current?.redo(); refP(engineRef.current!); };
  const handleZoomIn = () => { const e = engineRef.current; if (e) { e.zoom = Math.min(3, e.zoom * 1.15); e.render(); } };
  const handleZoomOut = () => { const e = engineRef.current; if (e) { e.zoom = Math.max(0.1, e.zoom / 1.15); e.render(); } };
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

    if (ev.button === 1) {
      ev.preventDefault();
      e.panning = true;
      e.ds = { x: ev.clientX, y: ev.clientY, panX: e.panX, panY: e.panY };
      return;
    }

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

      e.selN(hn.id);
      e.dragging = true;
      e.ds = {
        x: ev.clientX, y: ev.clientY,
        nodes: [...e.sel].map(id => e.gn(id)).filter(Boolean).map((n: any) => ({ id: n.id, x: n.x, y: n.y }))
      };
      e.pu();
      refP(e);
    } else {
      e.sel.clear(); e.selConn = null; refP(e); e.render();
    }
  }, [toast, refP]);

  const handleCanvasMouseMove = useCallback((ev: React.MouseEvent) => {
    const e = engineRef.current; if (!e) return;
    if (e.panning && e.ds) {
      e.panX = e.ds.panX + (ev.clientX - e.ds.x);
      e.panY = e.ds.panY + (ev.clientY - e.ds.y);
      e.render(); return;
    }
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
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    const e = engineRef.current; if (!e) return;
    e.dragging = false; e.panning = false;
    if (e.mode === "mindmap") e.layoutMM();
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
    e.zoom = nz; e.render();
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
      if (m && ev.key === "e") { ev.preventDefault(); setShowExportModal(true); return; }
      if (ev.key === "Escape" && e) {
        e.linking = null; e.render();
        if (ieRef.current) ieRef.current.style.display = "none";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      { label: "100%", action: () => { const e = engineRef.current; if (e) { e.zoom = 1; e.panX = 0; e.panY = 0; e.render(); } } },
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
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  const eng = engineRef.current;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* ===== MENU BAR ===== */}
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-3 gap-0 shrink-0 z-50">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs mr-3 hover:text-indigo-300">
          <ArrowLeft className="w-3.5 h-3.5" />
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
          DiagramMaster
        </button>

        {Object.keys(menuItems).map(key => (
          <div key={key} className="relative">
            <button
              className={`h-7 px-2.5 text-xs rounded hover:bg-slate-800 transition-colors ${activeMenu === key ? "bg-slate-800 text-white" : "text-slate-400"}`}
              onClick={() => setActiveMenu(activeMenu === key ? null : key)}
              onMouseEnter={() => activeMenu && setActiveMenu(key)}
            >
              {key}
            </button>
            {activeMenu === key && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                <div className="absolute top-full left-0 mt-0.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                  {menuItems[key].map((item, i) =>
                    "sep" in item && item.sep ? <div key={i} className="h-px bg-slate-700 my-1" /> :
                    <button key={i} onClick={() => { item.action?.(); setActiveMenu(null); }} className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">
                      <span>{item.label}</span>
                      {item.kd && <span className="text-slate-500 ml-4">{item.kd}</span>}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        <div className="flex-1" />
        <span className="text-xs text-slate-500">{project?.name || "无标题"}</span>
        <span className="text-[10px] text-slate-600 mx-2">
          {eng ? `${eng.nodes.length} 元素 · ${eng.conns.length} 连线 · ${Math.round(eng.zoom * 100)}%` : ""}
        </span>
        <button onClick={() => save()} disabled={saving} className="h-7 px-2.5 bg-indigo-500 hover:bg-indigo-600 rounded text-xs flex items-center gap-1 disabled:opacity-50">
          <Save className="w-3 h-3" /> {saving ? "..." : "保存"}
        </button>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="h-10 bg-slate-900/80 border-b border-slate-800 flex items-center px-3 gap-1 shrink-0 overflow-x-auto">
        {/* Mode */}
        {(["mindmap","flowchart","freedraw"] as const).map(m => (
          <button key={m}
            onClick={() => switchMode(m)}
            className={`h-7 px-3 text-xs rounded transition-colors ${eng?.mode === m ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}
          >
            {m === "mindmap" ? "🧠 思维导图" : m === "flowchart" ? "📐 流程图" : "✏️ 自由绘图"}
          </button>
        ))}
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={handleUndo} className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400" title="撤销"><Undo2 className="w-3.5 h-3.5" /></button>
        <button onClick={handleRedo} className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400" title="重做"><Redo2 className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={handleZoomIn} className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400" title="放大"><ZoomIn className="w-3.5 h-3.5" /></button>
        <span className="text-xs text-slate-500 min-w-[40px] text-center cursor-pointer" onClick={() => { if (eng) { eng.zoom = 1; eng.panX = 0; eng.panY = 0; eng.render(); } }}>{eng ? Math.round(eng.zoom * 100) + "%" : "100%"}</span>
        <button onClick={handleZoomOut} className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400" title="缩小"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={handleFit} className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400" title="适应画布"><Maximize className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={toggleGrid} className={`h-7 w-7 flex items-center justify-center rounded ${eng?.showGrid ? "bg-slate-700 text-indigo-400" : "text-slate-500 hover:bg-slate-800"}`} title="网格"><Grid3X3 className="w-3.5 h-3.5" /></button>
        <button onClick={toggleSnap} className={`h-7 w-7 flex items-center justify-center rounded ${eng?.snapping ? "bg-slate-700 text-indigo-400" : "text-slate-500 hover:bg-slate-800"}`} title="吸附"><Magnet className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-slate-700 mx-1" />
        <button onClick={delSel} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800">{leftPanelOpen ? "◀ 收起" : "▶ 展开"}</button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800">{rightPanelOpen ? "收起 ▶" : "展开 ◀"}</button>
        </div>
      </div>

      {/* ===== MAIN ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {leftPanelOpen && eng?.mode !== "freedraw" && (
          <div className="w-52 bg-slate-900/50 border-r border-slate-800 overflow-y-auto shrink-0">
            <div className="p-2">
              <input
                value={searchShapes}
                onChange={e => setSearchShapes(e.target.value)}
                placeholder="搜索图形..."
                className="w-full h-8 bg-slate-800 border border-slate-700 rounded-lg px-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 mb-2"
              />
              {eng?.mode === "mindmap" ? (
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 text-xs font-medium text-slate-400 bg-slate-800/50">🧠 思维导图工具</div>
                  <div className="p-2 space-y-1">
                    {[
                      { label: "添加子节点", kd: "Tab", action: () => { if (eng.sel.size) { eng.pu(); eng.addMMChild([...eng.sel][0]); } } },
                      { label: "添同级节点", kd: "Enter", action: () => { if (eng.sel.size) { const n = eng.gn([...eng.sel][0]); if (n?.parentId) { eng.pu(); const t = THEMES[eng.theme]; const s = eng.mkNode("mindmap", 0, 0, n.parentId); s.text = "同级节点"; const sibs = eng.gc(n.parentId); s.fill = t.cc[sibs.length % t.cc.length]; s.stroke = t.stroke; s.fc = t.text; eng.nodes.push(s); eng.layoutMM(); eng.selN(s.id); eng.render(); } else eng.initMM(); } } },
                      { label: "新建导图", action: () => { eng.pu(); eng.mkMMRoot(200, eng.nodes.filter(n => n.isMM && !n.parentId).length * 300 + 120); eng.layoutMM(); eng.render(); } },
                      { label: "删除节点", kd: "Del", action: delSel },
                    ].map((b, i) => (
                      <button key={i} onClick={b.action} className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded">
                        <span>{b.label}</span>
                        {b.kd && <span className="text-slate-600">{b.kd}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                shapeCategories.map(cat => (
                  <div key={cat.id} className="border border-slate-700 rounded-lg overflow-hidden mb-1.5">
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50">{cat.name}</div>
                    <div className="p-1.5 grid grid-cols-2 gap-1">
                      {cat.shapes.filter(s => !searchShapes || s.includes(searchShapes.toLowerCase()) || (shapeNames[s]||"").includes(searchShapes)).map(s => (
                        <button key={s} onClick={() => { if (eng && eng.mode === "flowchart") addShape(s); else toast("请切换到流程图模式"); }}
                          className="flex items-center gap-1 px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white rounded transition-colors"
                        >
                          <span className="w-5 h-3 flex items-center justify-center text-[10px]">⬜</span>
                          {shapeNames[s] || s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div ref={wrapRef} className="flex-1 relative overflow-hidden bg-slate-950"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDblClick}
          style={{ cursor: eng?.linking ? "crosshair" : (eng?.spaceDown ? "grab" : "default") }}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />
          <input
            ref={ieRef}
            defaultValue=""
            onBlur={handleIEditBlur}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); } if (e.key === "Escape") { handleIEditBlur(); } }}
            className="absolute hidden border-2 border-indigo-500 rounded px-2 py-0.5 text-sm outline-none bg-white/95 shadow-lg z-50"
            style={{ fontFamily: "'PingFang SC',sans-serif" }}
          />
        </div>

        {/* Right Panel */}
        {rightPanelOpen && selNode && (
          <div className="w-56 bg-slate-900/50 border-l border-slate-800 overflow-y-auto shrink-0 p-2 space-y-2">
            <div className="border border-slate-700 rounded-lg p-2">
              <div className="text-[10px] font-semibold text-slate-500 mb-2">📝 文本</div>
              <input value={pText} onChange={e => { setPText(e.target.value); updSel("text", e.target.value); }}
                className="w-full h-7 bg-slate-800 border border-slate-700 rounded px-2 text-xs text-white mb-1.5" />
              <div className="flex gap-1 mb-1.5">
                <input type="number" value={pFS} onChange={e => { setPFS(+e.target.value); updSel("fs", +e.target.value); }} min={8} max={96}
                  className="w-12 h-7 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white" />
                <select value={pFF} onChange={e => { setPFF(e.target.value); updSel("ff", e.target.value); }}
                  className="flex-1 h-7 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white">
                  <option value="PingFang SC">苹方</option><option value="Microsoft YaHei">微软雅黑</option>
                  <option value="Arial">Arial</option><option value="Georgia">Georgia</option>
                </select>
              </div>
              <div className="flex gap-1">
                {["B","I","U"].map((s, i) => {
                  const keys = ["fb","fi","fu"]; const vals = [pBold, pItalic, pUnder]; const setters = [setPBold, setPItalic, setPUnder];
                  return <button key={s} onClick={() => { setters[i](!vals[i]); updSel(keys[i], !vals[i]); }}
                    className={`flex-1 h-6 text-xs rounded border ${vals[i] ? "border-indigo-500 bg-indigo-500/20 text-indigo-400" : "border-slate-700 text-slate-500"}`}>
                    {s === "B" ? <b>B</b> : s === "I" ? <i>I</i> : <u>U</u>}
                  </button>;
                })}
              </div>
            </div>

            <div className="border border-slate-700 rounded-lg p-2">
              <div className="text-[10px] font-semibold text-slate-500 mb-2">🎨 填充与边框</div>
              <div className="flex gap-1 mb-1.5">
                <input type="color" value={pFill} onChange={e => { setPFill(e.target.value); updSel("fill", e.target.value); }} className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent" />
                <input type="color" value={pStroke} onChange={e => { setPStroke(e.target.value); updSel("stroke", e.target.value); }} className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent" />
                <input type="number" value={pSW} onChange={e => { setPSW(+e.target.value); updSel("sw", +e.target.value); }} min={0} max={12} step={0.5}
                  className="w-10 h-7 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white" />
              </div>
              <div className="flex gap-1 mb-1.5">
                <select value={pLS} onChange={e => { setPLS(e.target.value); updSel("ls", e.target.value); }}
                  className="flex-1 h-6 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white">
                  <option value="solid">实线</option><option value="dashed">虚线</option>
                  <option value="dotted">点线</option>
                </select>
                <input type="number" value={pCR} onChange={e => { setPCR(+e.target.value); updSel("cr", +e.target.value); }} min={0} max={60}
                  className="w-10 h-6 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white" placeholder="圆角" />
              </div>
              <input type="range" value={pOpacity} onChange={e => { setPOpacity(+e.target.value); updSel("opacity", +e.target.value); }} min={0} max={100}
                className="w-full h-1" />
              <div className="text-[10px] text-slate-500 text-right">{pOpacity}%</div>
            </div>

            <div className="border border-slate-700 rounded-lg p-2">
              <div className="text-[10px] font-semibold text-slate-500 mb-2">📏 位置与大小</div>
              <div className="grid grid-cols-2 gap-1 mb-1">
                {([
                { label: "X", val: pX, set: setPX, key: "x" },
                { label: "Y", val: pY, set: setPY, key: "y" },
                { label: "W", val: pW, set: setPW, key: "width" },
                { label: "H", val: pH, set: setPH, key: "height" },
              ] as const).map(row => (
                <div key={row.label} className="flex items-center gap-0.5">
                  <span className="text-[10px] text-slate-500 w-3">{row.label}</span>
                  <input type="number" value={row.val} onChange={e => { row.set(+e.target.value); updSel(row.key, +e.target.value); }}
                    className="flex-1 h-6 bg-slate-800 border border-slate-700 rounded px-1 text-xs text-white" />
                </div>
              ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-medium z-[9999] shadow-lg border border-slate-700 transition-opacity duration-200 ${toastVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {toastMsg}
      </div>
    </div>
  );
}
