import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AnswerBoxProps {
  questionText: string;
  agentName: string;
  agentColor: string;
  onAnswer: (text: string) => void;
  disabled?: boolean;
}

// 评委提问时的专用回答框 - 点击录音模式（更适合桌面端）
export const AnswerBox: React.FC<AnswerBoxProps> = ({
  questionText,
  agentName,
  agentColor,
  onAnswer,
  disabled,
}) => {
  const [transcript, setTranscript] = useState('');

  const handleResult = useCallback((text: string) => {
    setTranscript(text);
    // 自动发送
    if (text.trim()) {
      setTimeout(() => {
        onAnswer(text.trim());
        setTranscript('');
      }, 500);
    }
  }, [onAnswer]);

  const { isSupported, isListening, error, toggleListening } = useSpeechRecognition(handleResult);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'absolute',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '480px',
        zIndex: 20,
      }}
    >
      {/* 问题引用 */}
      <div style={{
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px 14px 0 0',
        padding: '10px 16px',
        border: `1px solid ${agentColor}44`,
        borderBottom: 'none',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: agentColor,
            boxShadow: `0 0 8px ${agentColor}`,
          }} />
          <span style={{
            color: agentColor,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
          }}>
            {agentName} 提问
          </span>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13px',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {questionText}
        </p>
      </div>

      {/* 录音区域 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(16px)',
        borderRadius: '0 0 14px 14px',
        padding: '14px 16px',
        border: `1px solid ${agentColor}33`,
        borderTop: 'none',
      }}>
        {/* 错误提示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: '#FF5252',
              fontSize: '11px',
              textAlign: 'center',
              padding: '4px 8px',
              background: 'rgba(255,82,82,0.1)',
              borderRadius: '6px',
              width: '100%',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* 录音状态文字 */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FF5252',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FF5252',
              animation: 'blink-cursor 0.8s ease-in-out infinite',
            }} />
            录音中... 再次点击结束
          </motion.div>
        )}

        {transcript && !isListening && (
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            fontStyle: 'italic',
          }}>
            已识别: "{transcript}"
          </div>
        )}

        {/* 录音按钮区域 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* 大录音按钮 */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {isListening && (
              <>
                <div style={{
                  position: 'absolute',
                  inset: '-10px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,82,82,0.6)',
                  animation: 'pulse-ring 1.2s ease-out infinite',
                }} />
                <div style={{
                  position: 'absolute',
                  inset: '-6px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,82,82,0.3)',
                  animation: 'pulse-ring 1.2s ease-out infinite 0.4s',
                }} />
              </>
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => !disabled && toggleListening()}
              disabled={disabled}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                background: isListening
                  ? 'linear-gradient(135deg, #FF5252, #D32F2F)'
                  : `linear-gradient(135deg, ${agentColor}, ${agentColor}cc)`,
                color: '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isListening
                  ? '0 0 24px rgba(255,82,82,0.5)'
                  : `0 4px 16px ${agentColor}66`,
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {isListening ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </motion.button>
          </div>

          {/* 提示文字 */}
          <div style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            textAlign: 'center',
            maxWidth: '120px',
          }}>
            {isSupported 
              ? (isListening ? '点击停止' : '点击录音') 
              : '语音不可用'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
