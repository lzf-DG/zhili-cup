import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { selectNextAgent, getJudgeResponse, getAgentInfo, getOpeningMessage } from '../agents/agentManager';
import { resetMockState, generateMockReport } from '../agents/mockAgents';
import { callApi, generateReportViaApi, isApiConfigured } from '../agents/apiAgent';
import { ChatMessage } from '../agents/types';
import { Slide } from '../utils/pptParser';

// 秒数格式化为 mm:ss
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function useChat() {
  const {
    messages,
    addMessage,
    lastAgentId,
    setLastAgentId,
    isLoading,
    setIsLoading,
    phase,
    setPhase,
    startTimer,
    stopTimer,
    elapsedSeconds,
    setReport,
    topic,
    pptContent,
    resetAll,
  } = useSessionStore();

  // 开始新答辩会话（从汇报阶段开始：学生先汇报，评委按「结束汇报」后才反馈）
  const startSession = useCallback((newTopic: string, newPptContent: string, newSlides: Slide[], newSlideImages: string[], newPptFile: File | null) => {
    resetAll();
    resetMockState();
    useSessionStore.getState().setTopic(newTopic);
    useSessionStore.getState().setPptContent(newPptContent);
    useSessionStore.getState().setSlides(newSlides);
    useSessionStore.getState().setSlideImages(newSlideImages);
    useSessionStore.getState().setPptFile(newPptFile);
    setPhase('reporting');
    startTimer();

    // 发送开场白（注入答辩主题）
    const opening = getOpeningMessage(newTopic);
    const agent = getAgentInfo(opening.agentId);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'judge',
      agentId: opening.agentId,
      agentName: agent.name,
      content: opening.content,
      timestamp: Date.now(),
    };
    addMessage(msg);
    setLastAgentId(opening.agentId);
  }, [resetAll, setPhase, startTimer, addMessage, setLastAgentId]);

  // 请求评委回复（共用路径：选择评委 → 优先API → Mock兜底 → 追加回复）
  // userText：供 Mock 基于内容追问；结束汇报反馈时传完整汇报文本
  const requestJudgeReply = useCallback(async (allMessages: ChatMessage[], userText: string) => {
    setIsLoading(true);
    try {
      // 选择下一个评委（会话延续优先：默认同一评委继续，一对一深聊）
      const nextAgentId = selectNextAgent(allMessages, lastAgentId, userText);
      // 是否为换人进场（新评委应开新提问线，而非点评上一位评委的问答）
      const isHandoff = lastAgentId !== null && nextAgentId !== lastAgentId;

      // 获取回复（优先API，fallback到Mock）
      let response: { agentId: string; content: string } | null = null;

      // 注入答辩上下文（主题 + PPT内容），让评委围绕汇报提问
      const { topic: currentTopic, pptContent: currentPptContent } = useSessionStore.getState();
      const context = { topic: currentTopic, pptContent: currentPptContent };

      if (isApiConfigured()) {
        response = await callApi(nextAgentId, allMessages, context);
      }

      if (!response) {
        response = await getJudgeResponse(nextAgentId, userText, allMessages, isHandoff);
      }

      // 添加评委回复（以实际应答的评委为准）
      const respAgent = getAgentInfo(response.agentId);
      const judgeMsg: ChatMessage = {
        id: `msg-${Date.now()}-judge`,
        role: 'judge',
        agentId: response.agentId,
        agentName: respAgent.name,
        content: response.content,
        timestamp: Date.now(),
      };
      addMessage(judgeMsg);
      setLastAgentId(response.agentId);
    } catch (error) {
      console.error('获取回复失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lastAgentId, addMessage, setIsLoading, setLastAgentId]);

  // 发送用户消息：
  // - 汇报阶段：只记录汇报内容（可分多次发言），评委不即时评价，等「结束汇报」
  // - 答辩阶段：保持现状，每轮发言后立即回复
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // 汇报阶段：不触发评委反馈
    if (useSessionStore.getState().phase === 'reporting') return;

    await requestJudgeReply([...messages, userMsg], text.trim());
  }, [messages, isLoading, addMessage, requestJudgeReply]);

  // 结束汇报：切换到答辩阶段，评委基于汇报内容给出第一轮反馈
  const endReport = useCallback(async () => {
    const state = useSessionStore.getState();
    if (state.phase !== 'reporting' || state.isLoading) return;
    setPhase('presenting');

    // 汇总汇报内容（学生可能分多次发言）；无内容时评委直接开始提问
    const reportText = state.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('')
      .trim();

    await requestJudgeReply(state.messages, reportText);
  }, [setPhase, requestJudgeReply]);

  // 结束答辩，生成报告（API模式下先尝试真实AI评估，失败则回退Mock）
  const endSession = useCallback(async () => {
    stopTimer();
    setPhase('finished');

    const duration = formatDuration(elapsedSeconds);

    if (isApiConfigured()) {
      const apiReport = await generateReportViaApi(messages, duration);
      if (apiReport) {
        setReport(apiReport);
        return;
      }
      console.warn('API报告生成失败，回退到Mock报告');
    }

    setReport(generateMockReport(messages, duration));
  }, [stopTimer, setPhase, elapsedSeconds, messages, setReport]);

  // 重新开始
  const restart = useCallback(() => {
    resetAll();
    setPhase('idle');
  }, [resetAll, setPhase]);

  return {
    messages,
    isLoading,
    phase,
    topic,
    pptContent,
    startSession,
    sendMessage,
    endReport,
    endSession,
    restart,
  };
}
