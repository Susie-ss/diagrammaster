"use client";

import Link from "next/link";
import { useAuth } from "@/components/ui/AuthProvider";
import { ArrowRight, Brain, Workflow, Pencil, Cloud, Share2, Layers } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden">
      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 16 16" className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            <span className="font-bold text-lg">DiagramMaster</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="h-9 px-4 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                进入工作台 <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-slate-300 hover:text-white transition-colors">登录</Link>
                <Link href="/auth/register" className="h-9 px-4 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors">免费注册</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 text-center px-6">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          专业的在线制图工具
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          涵盖思维导图、流程图、UML图、ER图、网络架构图，支持实时协作与云端存储
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link href={user ? "/dashboard" : "/auth/register"}
            className="h-12 px-8 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2">
            免费开始使用 <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/auth/login"
            className="h-12 px-8 border border-slate-600/50 hover:border-slate-500 rounded-xl font-medium transition-colors text-slate-300">
            已有账户
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "思维导图", desc: "无限层级，一键布局，支持多主题切换" },
            { icon: Workflow, title: "流程图", desc: "30+ 形状，UML/ER/网络架构全覆盖" },
            { icon: Pencil, title: "自由绘图", desc: "画笔、荧光笔、橡皮擦，随心创作" },
            { icon: Cloud, title: "云端存储", desc: "数据永久保存，随时随地访问" },
            { icon: Share2, title: "多格式导出", desc: "支持 PNG、JSON 格式导出" },
            { icon: Layers, title: "文件夹管理", desc: "按项目组织文档，管理更高效" },
          ].map((f, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        © 2024 DiagramMaster. All rights reserved.
      </footer>
    </div>
  );
}
