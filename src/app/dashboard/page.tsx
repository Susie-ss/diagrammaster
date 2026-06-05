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
    await apiCall("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: selectedFolder }),
    });
    setNewFolderName(""); setShowNewFolder(false);
    fetchData();
  };

  const deleteFolder = async (id: string) => {
    await apiCall(`/api/folders/${id}`, { method: "DELETE" }).catch(() => {});
    if (selectedFolder === id) setSelectedFolder(null);
    setContextMenu(null);
    fetchData();
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
    await apiCall(`/api/projects/${id}`, { method: "DELETE" });
    setContextMenu(null);
    fetchData();
  };

  const renameItem = async (type: "folder"|"project", id: string) => {
    const name = prompt("新名称：");
    if (!name) return;
    if (type === "folder") {
      await apiCall(`/api/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } else {
      await apiCall(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    setContextMenu(null);
    fetchData();
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-6 gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-indigo-400 font-bold text-lg mr-4">
          <svg viewBox="0 0 16 16" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
            <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
          </svg>
          DiagramMaster
        </Link>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索项目..."
            className="w-64 h-9 bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <User className="w-4 h-4" />
          <span>{user?.username}</span>
          <button onClick={signOut} className="p-2 hover:bg-slate-800 rounded-lg transition-colors" title="退出登录">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
          <div className="p-4">
            <button
              onClick={() => { setSelectedFolder(null); setShowNewFolder(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedFolder ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800/50"}`}
            >
              <Home className="w-4 h-4" /> 全部项目
            </button>
          </div>

          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">文件夹</span>
            <button onClick={() => { setShowNewFolder(true); setNewFolderName(""); }} className="p-1 hover:bg-slate-800 rounded-md transition-colors">
              <Plus className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {filteredFolders.map(f => (
              <button
                key={f.id}
                onClick={() => { setSelectedFolder(f.id); setContextMenu(null); }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: f.id }); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${selectedFolder === f.id ? "bg-indigo-500/20 text-indigo-400" : "text-slate-300 hover:bg-slate-800/50"}`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800">
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
            <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-1 text-sm">
              <button onClick={() => setSelectedFolder(null)} className="text-slate-400 hover:text-white transition-colors">全部</button>
              {folderPath.map(f => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <button onClick={() => setSelectedFolder(f.id)} className="text-slate-300 hover:text-white transition-colors">{f.name}</button>
                </span>
              ))}
              <button onClick={() => deleteFolder(selectedFolder)} className="ml-auto text-red-400 hover:text-red-300 text-xs p-1">删除此文件夹</button>
            </div>
          )}

          {showNewFolder && (
            <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                placeholder="文件夹名称"
                className="h-9 bg-slate-800 border border-slate-700 rounded-lg px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-48"
              />
              <button onClick={createFolder} className="h-9 px-3 bg-indigo-500 rounded-lg text-sm">创建</button>
              <button onClick={() => setShowNewFolder(false)} className="h-9 px-3 text-sm text-slate-400">取消</button>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || "文件夹" : "所有项目"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{filteredProjects.length} 个项目</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => createProject("flowchart")} className="h-9 px-4 border border-slate-700 hover:border-slate-600 rounded-lg text-sm text-slate-300 transition-colors">📐 流程图</button>
                <button onClick={() => createProject("mindmap")} className="h-9 px-4 border border-slate-700 hover:border-slate-600 rounded-lg text-sm text-slate-300 transition-colors">🧠 思维导图</button>
                <button onClick={() => createProject("freedraw")} className="h-9 px-4 border border-slate-700 hover:border-slate-600 rounded-lg text-sm text-slate-300 transition-colors">✏️ 自由绘图</button>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-20">
                <Grid3X3 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">暂无项目</p>
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
                    className="bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl p-5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg">
                        {p.mode === "mindmap" ? "🧠" : p.mode === "flowchart" ? "📐" : "✏️"}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setContextMenu({ x: 0, y: 0, type: "project", id: p.id }); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded-md transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    <h3 className="font-medium text-white text-sm mb-1 truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
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
            className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: Math.min(contextMenu.x, typeof window !== "undefined" ? window.innerWidth - 180 : 0), top: contextMenu.y }}
            onClick={() => setContextMenu(null)}
          >
            {contextMenu.type === "project" && (
              <>
                <Link href={`/editor/${contextMenu.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
                  <FileText className="w-4 h-4" /> 打开
                </Link>
                <button onClick={() => renameItem("project", contextMenu.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
                  <Edit3 className="w-4 h-4" /> 重命名
                </button>
              </>
            )}
            {contextMenu.type === "folder" && (
              <button onClick={() => renameItem("folder", contextMenu.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
                <Edit3 className="w-4 h-4" /> 重命名
              </button>
            )}
            <button
              onClick={() => contextMenu.type === "project" ? deleteProject(contextMenu.id) : deleteFolder(contextMenu.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" /> 删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
