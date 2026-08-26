import { create } from 'zustand';
import { ChatMessage, SessionPhase, ReportData } from '../agents/types';
import { Slide } from '../utils/pptParser';

interface SessionState {
  // 阶段
  phase: SessionPhase;
  setPhase: (phase: SessionPhase) => void;
  
  // 答辩主题
  topic: string;
  setTopic: (topic: string) => void;
  
  // PPT内容（文本摘要）
  pptContent: string;
  setPptContent: (content: string) => void;
  
  // PPT幻灯片数组（文本提取）
  slides: Slide[];
  setSlides: (slides: Slide[]) => void;
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  
  // PPT幻灯片图片（LibreOffice转换）
  slideImages: string[]; // 每页的图片URL
  setSlideImages: (images: string[]) => void;
  
  // 原始PPT文件（用于pptxjs渲染）
  pptFile: File | null;
  setPptFile: (file: File | null) => void;
  
  // 对话消息
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  
  // 当前活跃评委
  lastAgentId: string | null;
  setLastAgentId: (id: string) => void;
  
  // 是否正在等待AI回复
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // 计时器
  elapsedSeconds: number;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  
  // 复盘报告
  report: ReportData | null;
  setReport: (report: ReportData) => void;
  
  // 重置全部状态
  resetAll: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useSessionStore = create<SessionState>((set) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),

  topic: '',
  setTopic: (topic) => set({ topic }),

  pptContent: '',
  setPptContent: (content) => set({ pptContent: content }),

  slides: [],
  setSlides: (slides) => set({ slides }),
  currentSlide: 0,
  setCurrentSlide: (index) => set({ currentSlide: index }),
  slideImages: [],
  setSlideImages: (images) => set({ slideImages: images }),
  pptFile: null,
  setPptFile: (file) => set({ pptFile: file }),

  messages: [],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  lastAgentId: null,
  setLastAgentId: (id) => set({ lastAgentId: id }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  elapsedSeconds: 0,
  startTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
  },
  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },
  resetTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ elapsedSeconds: 0 });
  },

  report: null,
  setReport: (report) => set({ report }),

  resetAll: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      phase: 'idle',
      messages: [],
      lastAgentId: null,
      isLoading: false,
      elapsedSeconds: 0,
      report: null,
      slides: [],
      currentSlide: 0,
      slideImages: [],
      pptFile: null,
    });
  },
}));
