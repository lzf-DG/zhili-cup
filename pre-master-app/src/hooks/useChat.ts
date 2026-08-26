import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { selectNextAgent, getJudgeResponse, getAgentInfo, getOpeningMessage } from '../agents/agentManager';
import { resetMockState, generateMockReport } from '../agents/mockAgents';
import { callApi, isApiConfigured } from '../agents/apiAgent';
import { ChatMessage } from '../agents/types';
import { Slide } from '../utils/pptParser';

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

    // 发送开场白
    const opening = getOpeningMessage();
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
      // 选择下一个评委
      const allMessages = [...messages, userMsg];
      const nextAgentId = selectNextAgent(allMessages, lastAgentId);
      const agent = getAgentInfo(nextAgentId);

      // 获取回复（优先API，fallback到Mock）
      let response: { agentId: string; content: string } | null = null;
      
      if (isApiConfigured()) {
        response = await callApi(nextAgentId, text.trim(), allMessages);
      }
      
      if (!response) {
        response = await getJudgeResponse(nextAgentId, text.trim(), allMessages);
      }

      // 添加评委回复
      const judgeMsg: ChatMessage = {
        id: `msg-${Date.now()}-judge`,
        role: 'judge',
        agentId: response.agentId,
        agentName: agent.name,
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

  // 结束答辩，生成报告
  const endSession = useCallback(() => {
    stopTimer();
    setPhase('finished');

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const report = generateMockReport(messages, duration);
    setReport(report);
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
