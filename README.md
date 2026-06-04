# DiagramMaster

专业的在线制图工具，涵盖思维导图、流程图、UML图、ER图、网络架构图等多种图表类型。

## 功能特性

- 🧠 **思维导图** - 无限层级节点，一键布局，多主题切换
- 📐 **流程图** - 30+ 种形状，支持 UML/ER/网络架构
- ✏️ **自由绘图** - 画笔、荧光笔、橡皮擦
- 💾 **云端存储** - Supabase 数据库，数据永久保存
- 📁 **文件夹管理** - 按项目组织图表文档
- 🔐 **用户系统** - 注册/登录，数据隔离
- 📤 **多格式导出** - 支持 PNG、JSON 格式
- ⌨️ **快捷键** - Ctrl+S 保存、Ctrl+Z 撤销、Del 删除

## 技术栈

- **前端**: Next.js 16 + React + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **部署**: Vercel

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/diagrammaster.git
cd diagrammaster
npm install
```

### 2. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建免费项目
2. 在 SQL Editor 中执行 `supabase-schema.sql`
3. 复制 `.env.local.example` 为 `.env.local` 并填入你的 Supabase 密钥

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建

```bash
npm run build
npm start
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL |

## 项目结构

```
src/
├── app/
│   ├── api/           # API 路由
│   ├── auth/          # 认证页面
│   ├── dashboard/     # 仪表盘
│   └── editor/[id]/   # 图表编辑器
├── components/
│   ├── editor/        # 编辑器组件（画布引擎）
│   └── ui/            # UI 组件
└── lib/               # 工具库
```

## License

MIT
