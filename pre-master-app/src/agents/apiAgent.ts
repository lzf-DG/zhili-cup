// 真实API调用模块
// 当用户配置了API Key后，使用此模块替代mockAgents中的调用
// 所有请求经本地后端代理（/api），避免浏览器直连第三方API的CORS问题与密钥暴露

import { ChatMessage, ReportData } from './types';
import { agents } from './mockAgents';

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 答辩上下文：用于让评委了解主题与PPT内容
export interface DefenseContext {
  topic?: string;
  pptContent?: string;
}

function getApiConfig(): ApiConfig | null {
  const baseUrl = localStorage.getItem('api_base_url');
  const apiKey = localStorage.getItem('api_key');
  const model = localStorage.getItem('api_model') || 'gpt-4o-mini';

  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, model };
}

// 构建System Prompt（注入评委人格 + 答辩主题 + PPT内容）
function buildSystemPrompt(agentId: string, context?: DefenseContext): string {
  const agent = agents[agentId];
  if (!agent) return '';

  let prompt = agent.systemPrompt;
  prompt += '\n\n当前是答辩模拟场景，你需要作为评委对学生进行提问和点评。';

  if (context?.topic) {
    prompt += `\n\n学生答辩主题：「${context.topic}」。`;
  }

  if (context?.pptContent) {
    prompt += `\n\n学生PPT内容摘要：\n${context.pptContent.slice(0, 3000)}`;
    prompt += '\n\n请基于PPT内容提问，追问数据依据、方法细节、逻辑漏洞等，不要问与汇报内容无关的泛泛问题。';
  }

  prompt += '\n请保持你的角色特点，回复简洁有力。';
  return prompt;
}

// 调用OpenAI兼容API（经本地后端代理转发）
export async function callApi(
  agentId: string,
  messages: ChatMessage[],
  context?: DefenseContext
): Promise<{ agentId: string; content: string } | null> {
  const config = getApiConfig();
  if (!config) return null;

  try {
    // 构建消息历史（只保留最近10条，最后一条即用户本次回答，无需重复追加）
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role === 'judge' ? 'assistant' as const : m.role === 'user' ? 'user' as const : 'system' as const,
      content: m.content,
    }));

    const payload = [
      { role: 'system' as const, content: buildSystemPrompt(agentId, context) },
      ...recentMessages,
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, messages: payload, apiConfig: config }),
    });

    if (!response.ok) {
      console.error('API调用失败:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.content;

    if (!content) return null;

    return { agentId, content };
  } catch (error) {
    console.error('API调用异常:', error);
    return null;
  }
}

// 解析API返回的报告JSON（容错：剥离markdown代码块、只取首个JSON对象）
function parseReportJson(
  content: string,
  totalMessages: number,
  duration: string
): ReportData | null {
  let jsonStr = content.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();

  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const obj = JSON.parse(jsonStr.slice(start, end + 1));

    const clampScore = (v: unknown, fallback: number): number =>
      typeof v === 'number' && isFinite(v)
        ? Math.round(Math.max(0, Math.min(100, v)))
        : fallback;

    const toStringArray = (v: unknown, fallback: string[]): string[] =>
      Array.isArray(v) && v.length > 0 ? v.map(String) : fallback;

    const dialogueSummary = Array.isArray(obj.dialogueSummary)
      ? obj.dialogueSummary.map((s: any) => ({
          agentName: String(s?.agentName || '评委'),
          question: String(s?.question || ''),
          userResponse: String(s?.userResponse || '（未回答）'),
          feedback: String(s?.feedback || ''),
        }))
      : [];

    return {
      overallScore: clampScore(obj.overallScore, 75),
      logicScore: clampScore(obj.logicScore, 70),
      contentScore: clampScore(obj.contentScore, 75),
      expressionScore: clampScore(obj.expressionScore, 75),
      timeScore: clampScore(obj.timeScore, 75),
      totalMessages,
      duration,
      highlights: toStringArray(obj.highlights, ['汇报结构较为清晰', '能够针对评委问题进行回应']),
      improvements: toStringArray(obj.improvements, ['建议在数据支撑方面做更充分的准备', '回答时可以更多使用具体案例']),
      dialogueSummary,
    };
  } catch {
    return null;
  }
}

// 生成复盘报告（调用API，经本地后端代理转发）
export async function generateReportViaApi(
  messages: ChatMessage[],
  duration: string
): Promise<ReportData | null> {
  const config = getApiConfig();
  if (!config) return null;

  const dialogueText = messages
    .map(m => `[${m.agentName || '用户'}]: ${m.content}`)
    .join('\n');

  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialogueText, duration, apiConfig: config }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.content;

    if (!content) return null;

    return parseReportJson(content, messages.length, duration);
  } catch {
    return null;
  }
}

// 检查API是否已配置
export function isApiConfigured(): boolean {
  return getApiConfig() !== null;
}
