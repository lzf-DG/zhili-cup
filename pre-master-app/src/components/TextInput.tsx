import React, { useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// 文字输入框（语音识别的fallback）
export const TextInput: React.FC<TextInputProps> = ({ onSend, disabled, placeholder }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        borderRadius: '25px',
        padding: '6px 6px 6px 18px',
        border: '1px solid rgba(255,213,79,0.2)',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || '输入你的回答...'}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontSize: '14px',
          fontFamily: 'var(--font-main)',
        }}
      />

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: 'none',
          background: text.trim()
            ? 'linear-gradient(135deg, #FFD54F, #FF8F00)'
            : 'rgba(255,255,255,0.1)',
          color: text.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        {/* 发送箭头 */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </motion.button>
    </motion.div>
  );
};
