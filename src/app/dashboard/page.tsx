"use client";

import { useAuth } from "@/components/ui/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Plus, Folder, FileText, MoreHorizontal, Trash2, Edit3, LogOut, Grid3X3, Search, ChevronRight, Home, User } from "lucide-react";
import Link from "next/link";

interface Folder {
  id: string; name: string; parent_id: string | null;
  created_at: string; updated_at: string;
}

interface Project {
  id: string; folder_id: string | null; name: string; mode: string;
  diagram_data: any; thumbnail: string | null;
  created_at: string; updated_at: string;
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading, configured } = useAuth();
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{x: number; y: number; type: "folder"|"project"; id: string} | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{type: "folder"|"project"; id: string; currentName: string; currentFolderId: string | null} | null>(null);
  const [renameFormName, setRenameFormName] = useState("");
  const [renameFormFolder, setRenameFormFolder] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        fetch("/api/folders"),
        fetch("/api/projects"),
      ]);
      if (fRes.ok) setFolders(await fRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && configured) router.push("/auth/login");
    else if (user) fetchData();
    else if (!configured) setLoading(false);
  }, [user, authLoading, router, fetchData, configured]);

  const apiCall = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "请求失败");
    }
    return res.json();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    // Optimistic: add to local state immediately
    const tempId = "temp_" + Date.now();
    const newFolder: any = { id: tempId, name, parent_id: selectedFolder || null };
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName(""); setShowNewFolder(false);
    try {
      const data = await apiCall("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_id: selectedFolder }),
      });
      // Replace temp with real
      setFolders(prev => prev.map(f => f.id === tempId ? data : f));
    } catch {
      // Rollback
      setFolders(prev => prev.filter(f => f.id !== tempId));
    }
  };

  const deleteFolder = async (id: string) => {
    setContextMenu(null);
    // Optimistic: remove from local state immediately
    const prevFolders = folders;
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolder === id) setSelectedFolder(null);
    try {
      await apiCall(`/api/folders/${id}`, { method: "DELETE" });
    } catch {
      // Rollback
      setFolders(prevFolders);
    }
  };

  const createProject = async (mode: string = "flowchart") => {
    const data = await apiCall("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "未命名图表",
        folder_id: selectedFolder,
        mode,
      }),
    });
    if (data?.id) router.push(`/editor/${data.id}`);
  };

  const deleteProject = async (id: string) => {
    setContextMenu(null);
    // Optimistic: remove from local state immediately
    const prevProjects = projects;
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await apiCall(`/api/projects/${id}`, { method: "DELETE" });
    } catch {
      // Rollback
      setProjects(prevProjects);
    }
  };

  const renameItem = async (type: "folder"|"project", id: string) => {
    const item = type === "project"
      ? projects.find(p => p.id === id)
      : folders.find(f => f.id === id);
    if (!item) return;
    setContextMenu(null);
    setRenameTarget({
      type,
      id,
      currentName: item.name,
      currentFolderId: type === "project" ? (item as Project).folder_id : null,
    });
    setRenameFormName(item.name);
    setRenameFormFolder(type === "project" ? (item as Project).folder_id : null);
    setShowRenameModal(true);
  };

  const handleRenameConfirm = async () => {
    const t = renameTarget;
    if (!t || !renameFormName.trim()) return;
    const newName = renameFormName.trim();
    const newFolderId = t.type === "project" ? renameFormFolder : undefined;

    // Optimistic: update local state immediately
    if (t.type === "project") {
      setProjects(prev => prev.map(p => p.id === t.id ? { ...p, name: newName, folder_id: newFolderId ?? p.folder_id } : p));
    } else {
      setFolders(prev => prev.map(f => f.id === t.id ? { ...f, name: newName } : f));
    }
    setShowRenameModal(false);
    setRenameTarget(null);

    const body: any = { name: newName };
    if (t.type === "project") body.folder_id = newFolderId;
    try {
      const data = await apiCall(`/api/${t.type === "folder" ? "folders" : "projects"}/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // Apply server response to ensure consistency
      if (t.type === "project") {
        setProjects(prev => prev.map(p => p.id === t.id ? { ...p, name: data.name, folder_id: data.folder_id } : p));
      } else {
        setFolders(prev => prev.map(f => f.id === t.id ? { ...f, name: data.name } : f));
      }
    } catch {
      // Rollback: re-fetch to restore correct state
      fetchData();
    }
  };

  const filteredFolders = folders.filter(f => {
    if (selectedFolder) return f.parent_id === selectedFolder;
    return f.parent_id === null;
  });

  const filteredProjects = projects.filter(p => {
    if (selectedFolder) return p.folder_id === selectedFolder;
    if (searchQuery) return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const getFolderPath = (folderId: string | null): { id: string; name: string }[] => {
    const path: { id: string; name: string }[] = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = folders.find(f => f.id === current!.parent_id);
    }
    return path;
  };

  const folderPath = getFolderPath(selectedFolder);
  const modeLabels: Record<string, string> = { mindmap: "🧠 思维导图", flowchart: "📐 流程图", freedraw: "✏️ 自由绘图" };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-gray-200 bg-white backdrop-blur flex items-center px-6 gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-indigo-500 font-bold text-lg mr-4">
          <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
            <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
          </svg>
          DiagramMaster
        </Link>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索项目..."
            className="w-64 h-9 bg-white border border-gray-300 rounded-lg pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>{user?.username}</span>
          <button onClick={signOut} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="退出登录">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
          <div className="p-4">
            <button
              onClick={() => { setSelectedFolder(null); setShowNewFolder(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedFolder ? "bg-indigo-50 text-indigo-500" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <Home className="w-4 h-4" /> 全部项目
            </button>
          </div>

          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">文件夹</span>
            <button onClick={() => { setShowNewFolder(true); setNewFolderName(""); }} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
              <Plus className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {filteredFolders.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFolder(f.id); setContextMenu(null); setShowNewFolder(false); }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: f.id }); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${selectedFolder === f.id ? "bg-indigo-50 text-indigo-500" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            {showNewFolder && (
              <div className="flex items-center gap-1 px-2 py-1">
                <Folder className="w-4 h-4 shrink-0 text-gray-400 ml-1" />
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createFolder();
                    if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                  }}
                  placeholder="文件夹名称"
                  onBlur={() => { if (!newFolderName.trim()) setShowNewFolder(false); }}
                  className="flex-1 h-7 bg-white border border-gray-300 rounded-md px-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => createProject()}
              className="w-full flex items-center justify-center gap-2 h-10 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 新建项目
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {selectedFolder && (
            <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-1 text-sm">
              <button onClick={() => setSelectedFolder(null)} className="text-gray-500 hover:text-gray-900 transition-colors">全部</button>
              {folderPath.map(f => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <button onClick={() => setSelectedFolder(f.id)} className="text-gray-600 hover:text-gray-900 transition-colors">{f.name}</button>
                </span>
              ))}
              <button onClick={() => deleteFolder(selectedFolder)} className="ml-auto text-red-500 hover:text-red-600 text-xs p-1">删除此文件夹</button>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || "文件夹" : "所有项目"}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">{filteredProjects.length} 个项目</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => createProject("flowchart")} className="h-9 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors">📐 流程图</button>
                <button onClick={() => createProject("mindmap")} className="h-9 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors">🧠 思维导图</button>
                <button onClick={() => createProject("freedraw")} className="h-9 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors">✏️ 自由绘图</button>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-20">
                <Grid3X3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">暂无项目</p>
                <button onClick={() => createProject()} className="h-10 px-6 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> 创建第一个项目
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/editor/${p.id}`)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "project", id: p.id }); }}
                    className="bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md rounded-xl p-5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                        {p.mode === "mindmap" ? "🧠" : p.mode === "flowchart" ? "📐" : "✏️"}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ x: rect.left, y: rect.bottom + 4, type: "project", id: p.id });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-md transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{modeLabels[p.mode] || p.mode}</span>
                      <span>·</span>
                      <span>{new Date(p.updated_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: Math.min(contextMenu.x, typeof window !== "undefined" ? window.innerWidth - 180 : 0), top: Math.min(contextMenu.y, typeof window !== "undefined" ? window.innerHeight - 160 : 0) }}
            onClick={() => setContextMenu(null)}
          >
            {contextMenu.type === "project" && (
              <>
                <Link href={`/editor/${contextMenu.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <FileText className="w-4 h-4" /> 打开
                </Link>
                <button onClick={() => renameItem("project", contextMenu.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Edit3 className="w-4 h-4" /> 重命名
                </button>
              </>
            )}
            {contextMenu.type === "folder" && (
              <button onClick={() => renameItem("folder", contextMenu.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <Edit3 className="w-4 h-4" /> 重命名
              </button>
            )}
            <button
              onClick={() => contextMenu.type === "project" ? deleteProject(contextMenu.id) : deleteFolder(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> 删除
            </button>
          </div>
        </>
      )}

      {/* Rename Modal */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowRenameModal(false); setRenameTarget(null); }} />
          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[400px] max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {renameTarget.type === "project" ? "重命名项目" : "重命名文件夹"}
              </h2>
              <button
                onClick={() => { setShowRenameModal(false); setRenameTarget(null); }}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 1L13 13M13 1L1 13"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {renameTarget.type === "project" ? "项目名称" : "文件夹名称"}
                  <span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={renameFormName}
                  onChange={(e) => setRenameFormName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && renameFormName.trim()) handleRenameConfirm(); }}
                  placeholder={renameTarget.type === "project" ? "输入项目名称" : "输入文件夹名称"}
                  className="w-full h-10 px-3.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  autoFocus
                />
              </div>

              {/* Folder selector — only for projects */}
              {renameTarget.type === "project" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    文件夹
                    <span className="text-gray-400 font-normal ml-1">（可选）</span>
                  </label>
                  <select
                    value={renameFormFolder || ""}
                    onChange={(e) => setRenameFormFolder(e.target.value || null)}
                    className="w-full h-10 px-3.5 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "36px" }}
                  >
                    <option value="">— 根目录 —</option>
                    {folders
                      .filter(f => f.id !== renameTarget.id)
                      .map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => { setShowRenameModal(false); setRenameTarget(null); }}
                className="h-9 px-4 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRenameConfirm}
                disabled={!renameFormName.trim()}
                className="h-9 px-5 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
