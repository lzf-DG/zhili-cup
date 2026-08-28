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

  // 开始新答辩会话
  const startSession = useCallback((newTopic: string, newPptContent: string, newSlides: Slide[], newSlideImages: string[], newPptFile: File | null) => {
    resetAll();
    resetMockState();
    useSessionStore.getState().setTopic(newTopic);
    useSessionStore.getState().setPptContent(newPptContent);
    useSessionStore.getState().setSlides(newSlides);
    useSessionStore.getState().setSlideImages(newSlideImages);
    useSessionStore.getState().setPptFile(newPptFile);
    setPhase('presenting');
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

  // 发送用户消息并获取评委回复
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
    setIsLoading(true);

    try {
      // 选择下一个评委（会话延续优先：默认同一评委继续，一对一深聊）
      const allMessages = [...messages, userMsg];
      const nextAgentId = selectNextAgent(allMessages, lastAgentId, text.trim());
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
        response = await getJudgeResponse(nextAgentId, text.trim(), allMessages, isHandoff);
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
  }, [messages, lastAgentId, isLoading, addMessage, setIsLoading, setLastAgentId]);

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
    endSession,
    restart,
  };
}
