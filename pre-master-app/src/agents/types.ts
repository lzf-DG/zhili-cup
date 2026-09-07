// Agent类型定义

export interface Agent {
  id: string;
  name: string;
  title: string;
  personality: string;
  systemPrompt: string;
  greeting: string;
  avatarColor: string;
}

export interface ChatMessage {
  id: string;
  role: 'judge' | 'user' | 'system';
  agentId?: string;
  agentName?: string;
  content: string;
  timestamp: number;
}

export type SessionPhase = 'idle' | 'welcome' | 'reporting' | 'presenting' | 'finished';

// 会话模式：答辩（含评委问答）/ 汇报（纯展示预演，无问答环节）
export type SessionMode = 'defense' | 'report';

export interface ReportData {
  overallScore: number;
  logicScore: number;
  contentScore: number;
  expressionScore: number;
  timeScore: number;
  totalMessages: number;
  duration: string;
  highlights: string[];
  improvements: string[];
  dialogueSummary: { agentName: string; question: string; userResponse: string; feedback: string }[];
}

// 汇报模式评价：基于语音/文字转写内容分析表达质量（无问答环节）
// 五维度：内容准确性 / 内容完整度 / 逻辑连贯性 / 表达清晰度 / 语言感染力
export interface ReportModeData {
  overallScore: number;
  accuracyScore: number; // 内容准确性：与主题/PPT内容的贴合、术语运用、跑题程度
  completenessScore: number; // 内容完整度：开场-主体-收尾结构是否齐全、PPT要点覆盖
  coherenceScore: number; // 逻辑连贯性：逻辑连接词、结构组织、前后呼应
  clarityScore: number; // 表达清晰度：填充词、句子冗长、表述精炼
  engagementScore: number; // 语言感染力：举例、数据引用、设问互动、开场收尾
  // 各维度文字点评（各1-2句）
  accuracyComment: string;
  completenessComment: string;
  coherenceComment: string;
  clarityComment: string;
  engagementComment: string;
  duration: string;
  totalMessages: number;
  // 总体评语（2-3句）
  summary: string;
  highlights: string[];
  improvements: string[];
}
