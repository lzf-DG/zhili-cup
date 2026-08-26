# Pre大师·沉浸版

沉浸式答辩模拟Web应用 —— 动漫风固定背景 + 动态对话框 + 语音交互 + 多Agent评委系统。

## 功能特性

- 动漫风格教室背景，粒子飘浮动效
- 3个Agent评委（严格教授/温和教授/同学评委），各有独立人格和提问风格
- 对话框打字机效果，评委从上方弹入，用户从底部弹入
- 语音输入（Web Speech API）+ 文字输入双模式
- 右上角实时计时器，模拟答辩紧张感
- 评委头像呼吸光晕动画
- 答辩结束后生成结构化复盘报告
- 预留OpenAI兼容API接口，配置后可接入真实AI

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端同时启动）
npm run dev

# 或分别启动
npm run dev:client   # 前端 http://localhost:5173
npm run dev:server   # 后端 http://localhost:3001
```

## API配置

应用默认使用Mock模式（预设题库）。如需接入真实AI：

1. 点击欢迎页的「API 设置」按钮
2. 填入以下信息：
   - **API Base URL**: OpenAI兼容接口地址（如 `https://api.openai.com/v1`）
   - **API Key**: 你的API密钥
   - **模型**: 模型名称（如 `gpt-4o-mini`）
3. 保存后自动切换到真实AI模式

配置信息存储在浏览器localStorage中，不会上传到任何服务器。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vite + React + TypeScript |
| 状态管理 | Zustand |
| 动画 | Framer Motion |
| 语音识别 | Web Speech API |
| 后端 | Express.js |
| AI接口 | OpenAI兼容API（预留） |

## 多Agent架构

```
Host Agent（主持人）→ 调度评委轮询
  ├── 王教授（严格型）→ 关注逻辑漏洞、数据依据
  ├── 李教授（温和型）→ 关注创新点、研究意义
  └── 张同学（好奇型）→ 关注可理解性、实际意义
Evaluator Agent → 答辩结束后生成复盘报告
```

## 项目结构

```
pre-master-app/
├── src/
│   ├── components/     # UI组件
│   │   ├── Background.tsx    # 动漫风背景
│   │   ├── DialogBox.tsx     # 对话框（打字机效果）
│   │   ├── JudgeRow.tsx      # 评委席 + 呼吸光晕
│   │   ├── Timer.tsx         # 计时器
│   │   ├── MicButton.tsx     # 语音按钮
│   │   ├── TextInput.tsx     # 文字输入
│   │   ├── WelcomeScreen.tsx # 欢迎页
│   │   ├── SettingsModal.tsx # API设置
│   │   └── ReportView.tsx    # 复盘报告
│   ├── agents/         # 多Agent系统
│   │   ├── types.ts          # 类型定义
│   │   ├── mockAgents.ts     # Mock回复逻辑
│   │   ├── agentManager.ts   # Host调度逻辑
│   │   └── apiAgent.ts       # 真实API调用
│   ├── hooks/          # 自定义Hooks
│   ├── store/          # Zustand状态管理
│   └── styles/         # 全局样式
├── server/             # Express后端
│   └── index.ts
└── package.json
```

## 环境变量

无需额外环境变量。API配置通过应用内设置页面管理。

## License

MIT
