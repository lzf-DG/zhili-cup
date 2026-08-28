import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

// 端点检测（静默多久算"说完"）：
// 浏览器内建端点检测只在 continuous=false 时生效（静默约 1s 即结束并定稿），
// 且时长不可配置。因此这里改用 continuous=true + 自定义静默计时：
// 每收到一次识别结果就重置计时，静默达到 SILENCE_TIMEOUT_MS 才结束并发送。
// 取内建时长（~1s）的 5 倍 ≈ 5s，允许回答中的自然停顿不被截断。
const SILENCE_TIMEOUT_MS = 5000;

// 单次识别会话的可变状态。挂在闭包/引用上，快速启停时新旧会话互不串扰。
interface RecognitionSession {
  recognition: any;
  accumulated: string; // 已定稿（isFinal）的文字
  interim: string;     // 当前未定稿的尾巴
  committed: boolean;  // 是否已把识别结果交付给 onResult（保证只交付一次）
}

export function useSpeechRecognition(
  onResult: (text: string) => void
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<RecognitionSession | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);

  // 保持 onResult 回调最新
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // 检测浏览器支持
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // 交付当前会话累积的文字（定稿 + 未定稿尾巴），只交付一次
  const commitPending = useCallback((session: RecognitionSession) => {
    if (session.committed) return;
    session.committed = true;
    const text = (session.accumulated + session.interim).trim();
    if (text) onResultRef.current(text);
  }, []);

  const stopRecognition = useCallback((session: RecognitionSession) => {
    try {
      session.recognition.stop();
    } catch (e) {
      // 忽略
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognition) {
      setError('浏览器不支持语音识别');
      return;
    }

    // 丢弃并停止旧会话（其残留文字不再发送）
    if (sessionRef.current) {
      sessionRef.current.committed = true;
      clearSilenceTimer();
      try {
        sessionRef.current.recognition.abort();
      } catch (e) {
        // 忽略
      }
      sessionRef.current = null;
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;      // 连续模式：何时结束由下方静默计时决定
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const session: RecognitionSession = {
      recognition,
      accumulated: '',
      interim: '',
      committed: false,
    };

    // 静默 SILENCE_TIMEOUT_MS 后结束：交付文字并停止识别
    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (sessionRef.current !== session) return;
        commitPending(session);
        stopRecognition(session);
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // 连续模式下，短停顿会让浏览器逐句定稿（多次 isFinal），
      // 这里只累积、不立即发送，等静默计时走完再统一交付
      if (finalTranscript) session.accumulated += finalTranscript;
      if (interimTranscript) {
        session.interim = interimTranscript;
      } else if (finalTranscript) {
        session.interim = ''; // 上一段已定稿并入 accumulated，未定稿尾巴清空
      }

      // 每有新识别结果（仍在说话）就重置静默计时
      armSilenceTimer();
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      let errorMsg = '语音识别失败';

      switch (event.error) {
        case 'not-allowed':
          errorMsg = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
          break;
        case 'no-speech':
          errorMsg = '未检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMsg = '未找到麦克风设备';
          break;
        case 'network':
          errorMsg = '网络连接失败，请检查网络';
          break;
        default:
          errorMsg = `语音识别错误: ${event.error}`;
      }

      setError(errorMsg);
      setIsListening(false);
      // 已识别的残留文字由 onend 兜底交付
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      // 兜底：会话以任何方式结束（手动停止/错误/浏览器自行结束）时，
      // 交付尚未发送的识别文字；会话已被替换则不再交付
      if (sessionRef.current === session) {
        commitPending(session);
        sessionRef.current = null;
      }
    };

    sessionRef.current = session;

    try {
      recognition.start();
    } catch (err) {
      console.error('启动语音识别失败:', err);
      setError('启动语音识别失败');
      setIsListening(false);
      sessionRef.current = null;
    }
  }, [isSupported, SpeechRecognition, clearSilenceTimer, commitPending, stopRecognition]);

  const stopListening = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    clearSilenceTimer();
    // 手动停止：立即交付已识别文字（含未定稿尾巴），不再等待静默
    commitPending(session);
    stopRecognition(session);
    sessionRef.current = null;
    setIsListening(false);
  }, [clearSilenceTimer, commitPending, stopRecognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 组件卸载：丢弃当前会话（不发送），释放麦克风，并防止静默计时器在卸载后触发
  useEffect(() => () => {
    clearSilenceTimer();
    const session = sessionRef.current;
    if (session) {
      session.committed = true; // 阻止 onend 的兜底交付
      try {
        session.recognition.abort();
      } catch (e) {
        // 忽略
      }
      sessionRef.current = null;
    }
  }, [clearSilenceTimer]);

  return {
    isListening,
    isSupported,
    transcript: '',
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
