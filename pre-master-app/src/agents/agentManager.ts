import { ChatMessage } from './types';
import { agents, getMockResponse, isClarifyingQuestion } from './mockAgents';

// Host Agent 调度逻辑：会话延续优先，支持一对一深聊
const agentOrder = ['profWang', 'profLi', 'studentZhang'];

// 同一评委连续主导多少轮后交接给下一位（模拟另一位评委插话提问）
const MAX_CONSECUTIVE_ROUNDS = 3;

// 用户点名了某位其他评委（如「王教授，你觉得…」）→ 交接给该评委
function findAddressedAgent(text: string, excludeId: string | null): string | null {
  if (!text) return null;
  for (const id of agentOrder) {
    if (id === excludeId) continue;
    const agent = agents[id];
    if (agent && text.includes(agent.name)) return id;
  }
  return null;
}

// 统计末尾连续由某评委主导的轮数（消息严格交替 judge/user，从尾部数连续的同评委 judge 消息）
function countTrailingStreak(messages: ChatMessage[], agentId: string): number {
  let streak = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'judge') continue;
    if (m.agentId === agentId) streak++;
    else break;
  }
  return streak;
}

export function selectNextAgent(
  messages: ChatMessage[],
  lastAgentId: string | null,
  userMessage?: string
): string {
  const judgeMsgCount = messages.filter(m => m.role === 'judge').length;

  // 开场第一条消息，由王教授发起
  if (judgeMsgCount === 0 || !lastAgentId) return 'profWang';

  // 1) 用户点名了另一位评委 → 交接给被点名的评委
  const addressed = findAddressedAgent(userMessage || '', lastAgentId);
  if (addressed) return addressed;

  // 2) 用户在反问 / 向当前评委求澄清 → 同一评委继续应答，保证一对一交互
  if (isClarifyingQuestion(userMessage || '')) return lastAgentId;

  // 3) 同一评委已连续主导 MAX_CONSECUTIVE_ROUNDS 轮 → 轮询到下一位（新评委开新提问线）
  if (countTrailingStreak(messages, lastAgentId) >= MAX_CONSECUTIVE_ROUNDS) {
    const idx = agentOrder.indexOf(lastAgentId);
    return agentOrder[(idx + 1) % agentOrder.length];
  }

  // 4) 默认：同一评委继续回应学生上一轮，形成一对一深聊
  return lastAgentId;
}

// 获取评委回复（统一入口，当前走Mock，后续切换API）
export async function getJudgeResponse(
  agentId: string,
  userMessage: string,
  _messages: ChatMessage[],
  isHandoff = false,
  isReportEvaluation = false,
  topic?: string
): Promise<{ agentId: string; content: string }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  const content = getMockResponse(agentId, userMessage, isHandoff, isReportEvaluation, topic);
  return { agentId, content };
}

// 获取评委信息
export function getAgentInfo(agentId: string) {
  return agents[agentId] || agents.profWang;
}

// 获取开场白（注入答辩主题，让评委围绕主题开场）
export function getOpeningMessage(topic?: string): { agentId: string; content: string } {
  const greeting = agents.profWang.greeting;
  return {
    agentId: 'profWang',
    content: topic?.trim()
      ? `本次答辩主题：「${topic.trim()}」。${greeting}`
      : greeting,
  };
}
