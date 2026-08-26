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

export function useSpeechRecognition(
  onResult: (text: string) => void
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);

  // 保持 onResult 回调最新
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // 检测浏览器支持
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognition) {
      setError('浏览器不支持语音识别');
      return;
    }

    // 停止之前的实例
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 忽略
      }
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

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

      if (finalTranscript) {
        onResultRef.current(finalTranscript);
      }
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
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error('启动语音识别失败:', err);
      setError('启动语音识别失败');
      setIsListening(false);
    }
  }, [isSupported, SpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 忽略
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
