import { ChatMessage } from './types';
import { agents, getMockResponse } from './mockAgents';

// Host Agent 调度逻辑：根据对话阶段和内容选择下一个评委
const agentOrder = ['profWang', 'profLi', 'studentZhang'];

export function selectNextAgent(
  messages: ChatMessage[],
  lastAgentId: string | null
): string {
  const judgeMsgCount = messages.filter(m => m.role === 'judge').length;
  
  // 开场第一条消息，由王教授发起
  if (judgeMsgCount === 0) return 'profWang';
  
  // 如果上一轮是某个评委，切换到下一个（轮询 + 随机扰动）
  const lastIdx = agentOrder.indexOf(lastAgentId || 'profWang');
  
  // 简单策略：轮询，但偶尔随机
  if (Math.random() < 0.3) {
    // 30%概率随机选择
    const others = agentOrder.filter(id => id !== lastAgentId);
    return others[Math.floor(Math.random() * others.length)];
  }
  
  // 70%概率轮询到下一个
  return agentOrder[(lastIdx + 1) % agentOrder.length];
}

// 获取评委回复（统一入口，当前走Mock，后续切换API）
export async function getJudgeResponse(
  agentId: string,
  userMessage: string,
  _messages: ChatMessage[]
): Promise<{ agentId: string; content: string }> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const content = getMockResponse(agentId, userMessage);
  return { agentId, content };
}

// 获取评委信息
export function getAgentInfo(agentId: string) {
  return agents[agentId] || agents.profWang;
}

// 获取开场白
export function getOpeningMessage(): { agentId: string; content: string } {
  return {
    agentId: 'profWang',
    content: agents.profWang.greeting,
  };
}
