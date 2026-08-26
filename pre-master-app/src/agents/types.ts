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

export type SessionPhase = 'idle' | 'welcome' | 'presenting' | 'finished';

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
