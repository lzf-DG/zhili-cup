import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAgentInfo } from '../agents/agentManager';

interface DialogBoxProps {
  text: string;
  isUser: boolean;
  agentName?: string;
  agentId?: string;
  delay?: number;
}

// 云状对话框 - 侧边悬挂风格
export const DialogBox: React.FC<DialogBoxProps> = ({
  text,
  isUser,
  agentName,
  agentId,
  delay = 0,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  const agent = agentId ? getAgentInfo(agentId) : null;

  // 打字机效果 - 仅评委消息使用；用户自己的消息直接完整显示，避免逐字生长导致被顶出视口
  // 时间驱动 + 递归定时器：进度按「已过毫秒数」计算而非累加计数。定时器被浏览器节流
  // 或丢失时，下次触发会直接追平到完整文本，绝不会停在半句话上；delay 与打字定时器
  // 都在清理函数中一并清除，杜绝 StrictMode 双挂载/重渲染下残留定时器把显示冻结在中间。
  useEffect(() => {
    if (isUser) return;

    let cancelled = false;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let typeTimer: ReturnType<typeof setTimeout> | undefined;

    const startTyping = () => {
      const startTime = performance.now();
      const step = () => {
        if (cancelled) return;
        const count = Math.floor((performance.now() - startTime) / 12);
        if (count >= text.length) {
          setDisplayedText(text);
          setIsTypingDone(true);
          return;
        }
        setDisplayedText(text.slice(0, count + 1));
        typeTimer = setTimeout(step, 12);
      };
      step();
    };

    delayTimer = setTimeout(startTyping, delay);

    return () => {
      cancelled = true;
      if (delayTimer !== undefined) clearTimeout(delayTimer);
      if (typeTimer !== undefined) clearTimeout(typeTimer);
    };
  }, [text, delay, isUser]);

  if (isUser) {
    // 用户消息：底部居中，简洁风格
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delay / 1000 }}
        style={{
          alignSelf: 'center',
          maxWidth: '80%',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(255,213,79,0.9), rgba(255,143,0,0.9))',
          borderRadius: '20px',
          color: '#1a1a2e',
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: 1.6,
          boxShadow: '0 4px 20px rgba(255,213,79,0.3)',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </motion.div>
    );
  }

  // 评委消息：云状对话框，侧边悬挂
  return (
    <motion.div
      initial={{ opacity: 0, x: agentId === 'studentZhang' ? 40 : -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: delay / 1000 }}
      style={{
        display: 'flex',
        flexDirection: agentId === 'studentZhang' ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '6px 16px',
        maxWidth: '75%',
        alignSelf: agentId === 'studentZhang' ? 'flex-end' : 'flex-start',
      }}
    >
      {/* 角色标签 */}
      {agent && (
        <div style={{
          background: agent.avatarColor,
          color: '#fff',
          fontSize: '10px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '12px',
          whiteSpace: 'nowrap',
          marginTop: '8px',
          flexShrink: 0,
          letterSpacing: '1px',
          boxShadow: `0 2px 8px ${agent.avatarColor}66`,
        }}>
          {agent.name}
        </div>
      )}

      {/* 云状气泡 */}
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.92)',
        color: '#1a1a2e',
        padding: '14px 18px',
        borderRadius: '20px',
        fontSize: '14px',
        lineHeight: 1.7,
        maxWidth: '100%',
        wordBreak: 'break-word',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* 云朵装饰 - 顶部小圆 */}
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '20px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
        }} />
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '28px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
        }} />

        {displayedText}
        {!isTypingDone && (
          <span style={{
            display: 'inline-block',
            width: '2px',
            height: '14px',
            background: '#1a1a2e',
            marginLeft: '2px',
            verticalAlign: 'middle',
            animation: 'blink-cursor 0.8s step-end infinite',
          }} />
        )}
      </div>
    </motion.div>
  );
};
