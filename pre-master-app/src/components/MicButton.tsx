import React from 'react';
import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MicButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

// 语音输入按钮 - 点击模式（更适合桌面端）
export const MicButton: React.FC<MicButtonProps> = ({ onResult, disabled }) => {
  const { isListening, isSupported, error, toggleListening } = useSpeechRecognition(onResult);

  if (!isSupported) {
    return (
      <div style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '11px',
        textAlign: 'center',
      }}>
        语音不可用
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      {/* 错误提示 */}
      {error && (
        <div style={{
          color: '#FF5252',
          fontSize: '10px',
          textAlign: 'center',
          maxWidth: '150px',
        }}>
          {error}
        </div>
      )}

      <div style={{ position: 'relative', display: 'inline-flex' }}>
        {/* 脉冲环 */}
        {isListening && (
          <>
            <div style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 109, 0, 0.6)',
              animation: 'pulse-ring 1.5s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 109, 0, 0.4)',
              animation: 'pulse-ring 1.5s ease-out infinite 0.5s',
            }} />
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => !disabled && toggleListening()}
          disabled={disabled}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none',
            background: isListening
              ? 'linear-gradient(135deg, #FF8F00, #E53935)'
              : 'linear-gradient(135deg, #FFD54F, #FF8F00)',
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isListening
              ? '0 0 20px rgba(255, 143, 0, 0.6)'
              : '0 4px 15px rgba(255, 213, 79, 0.4)',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.3s ease',
          }}
        >
          {/* 麦克风图标 */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </motion.button>
      </div>

      {/* 状态文字 */}
      <div style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '11px',
      }}>
        {isListening ? '点击停止' : '点击录音'}
      </div>
    </div>
  );
};
