// 真实API调用预留接口
// 当用户配置了API Key后，使用此模块替代mockAgents中的调用

import { ChatMessage } from './types';
import { agents } from './mockAgents';

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getApiConfig(): ApiConfig | null {
  const baseUrl = localStorage.getItem('api_base_url');
  const apiKey = localStorage.getItem('api_key');
  const model = localStorage.getItem('api_model') || 'gpt-4o-mini';
  
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, model };
}

// 构建System Prompt
function buildSystemPrompt(agentId: string, history: ChatMessage[]): string {
  const agent = agents[agentId];
  if (!agent) return '';
  
  let prompt = agent.systemPrompt;
  prompt += '\n\n当前是答辩模拟场景，你需要作为评委对学生进行提问和点评。';
  prompt += '\n请保持你的角色特点，回复简洁有力。';
  
  return prompt;
}

// 调用OpenAI兼容API
export async function callApi(
  agentId: string,
  userMessage: string,
  messages: ChatMessage[]
): Promise<{ agentId: string; content: string } | null> {
  const config = getApiConfig();
  if (!config) return null;

  try {
    // 构建消息历史（只保留最近10条）
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role === 'judge' ? 'assistant' as const : m.role === 'user' ? 'user' as const : 'system' as const,
      content: m.content,
    }));

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(agentId, messages) },
          ...recentMessages,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('API调用失败:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;
    
    return { agentId, content };
  } catch (error) {
    console.error('API调用异常:', error);
    return null;
  }
}

// 生成复盘报告（调用API）
export async function generateReportViaApi(
  messages: ChatMessage[],
  duration: string
): Promise<string | null> {
  const config = getApiConfig();
  if (!config) return null;

  const dialogueText = messages
    .map(m => `[${m.agentName || '用户'}]: ${m.content}`)
    .join('\n');

  const prompt = `请根据以下答辩模拟对话记录，生成一份结构化的复盘报告。
报告需要包含：
1. 总体评分（0-100）
2. 逻辑连贯性评分
3. 内容完整度评分
4. 表达质量评分
5. 时间管理评分
6. 亮点（3条）
7. 改进建议（4条）
8. 每轮问答的简要点评

对话记录：
${dialogueText}

答辩时长：${duration}

请以JSON格式返回。`;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: '你是一位答辩模拟评估专家，擅长分析学生的答辩表现并给出专业评价。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// 检查API是否已配置
export function isApiConfigured(): boolean {
  return getApiConfig() !== null;
}
