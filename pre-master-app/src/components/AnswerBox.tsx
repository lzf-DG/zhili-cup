import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface AnswerBoxProps {
  questionText: string;
  agentName: string;
  agentColor: string;
  onAnswer: (text: string) => void;
  disabled?: boolean;
}

// 评委提问时的回答框 - 收起/展开双态
// 收起 = 停靠在底部操作栏上方，问题只显示最多2行预览 + 「展开全文」按钮（不占屏高）；
// 展开 = 全屏置顶弹层（createPortal 到 body，zIndex 200，高于所有图层），完整显示导师问题。
export const AnswerBox: React.FC<AnswerBoxProps> = ({
  questionText,
  agentName,
  agentColor,
  onAnswer,
  disabled,
}) => {
  const [transcript, setTranscript] = useState('');
  const [expanded, setExpanded] = useState(false);

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

  // 展开态按 Esc 可收起
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // 收起态预览：最多2行
  const preview = questionText.length > 56 ? questionText.slice(0, 56) + '…' : questionText;

  // ===== 展开态：全屏置顶弹层，完整显示导师问题 =====
  if (expanded) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* 遮罩：点击空白处收起 */}
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          style={{
            position: 'relative',
            width: 'min(92vw, 560px)',
            maxHeight: '76vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10,10,30,0.97)',
            borderRadius: '16px',
            border: `1px solid ${agentColor}66`,
            boxShadow: `0 0 60px ${agentColor}33, 0 20px 80px rgba(0,0,0,0.6)`,
            overflow: 'hidden',
          }}
        >
          {/* 标题栏 */}
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${agentColor}44`,
            background: `${agentColor}11`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: agentColor,
              boxShadow: `0 0 10px ${agentColor}`,
            }} />
            <span style={{
              color: agentColor,
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '1px',
            }}>
              {agentName} 提问
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.75)',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              收起
            </button>
          </div>

          {/* 完整问题 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 22px',
            color: 'rgba(255,255,255,0.92)',
            fontSize: '15px',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {questionText}
          </div>

          {/* 录音区域 */}
          <div style={{
            padding: '14px 18px',
            borderTop: `1px solid ${agentColor}33`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <MicControl
                size={52}
                color={agentColor}
                isListening={isListening}
                disabled={disabled}
                onToggle={toggleListening}
              />
              <div style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '11px',
                textAlign: 'center',
                maxWidth: '120px',
              }}>
                {isSupported ? (isListening ? '点击停止' : '点击录音') : '语音不可用'}
              </div>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px' }}>
              Esc / 点击空白处收起
            </div>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  }

  // ===== 收起态：停靠在底部操作栏上方 =====
  // zIndex 48 > PPT 展开卡片(40) 与遮罩(35)，但 < 底部操作栏(50)：
  // 展开PPT的同时发言框仍悬空可见，可边看投影边录音/回答。
  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 48,
      pointerEvents: 'none',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        // 可拖拽：PPT展开时悬空于投影上方，拖到角落避免遮挡幻灯片内容
        drag
        dragMomentum={false}
        dragElastic={0.08}
        whileDrag={{ scale: 1.02, zIndex: 60 }}
        title="拖动可调整位置"
        style={{
          pointerEvents: 'auto',
          width: 'min(90%, 480px)',
          cursor: 'grab',
        }}
      >
        {/* 问题引用 */}
        <div style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(12px)',
          borderRadius: '14px 14px 0 0',
          padding: '8px 14px',
          border: `1px solid ${agentColor}44`,
          borderBottom: 'none',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            {/* 拖拽抓手 */}
            <span style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '11px',
              letterSpacing: '1px',
              lineHeight: 1,
              userSelect: 'none',
            }}>
              ⠿
            </span>
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
            <span style={{ flex: 1 }} />
            <button
              onClick={() => setExpanded(true)}
              title="展开查看完整问题"
              style={{
                background: 'rgba(255,213,79,0.12)',
                border: '1px solid rgba(255,213,79,0.3)',
                color: '#FFD54F',
                borderRadius: '8px',
                padding: '2px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              展开全文
            </button>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            lineHeight: 1.5,
            margin: 0,
            // 收起态最多展示2行；完整问题点「展开全文」查看
            maxHeight: '39px',
            overflow: 'hidden',
          }}>
            {preview}
          </p>
        </div>

        {/* 录音区域 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: '0 0 14px 14px',
          padding: '10px 16px',
          border: `1px solid ${agentColor}33`,
          borderTop: 'none',
        }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MicControl
              size={48}
              color={agentColor}
              isListening={isListening}
              disabled={disabled}
              onToggle={toggleListening}
            />
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '11px',
              textAlign: 'center',
              maxWidth: '120px',
            }}>
              {isSupported ? (isListening ? '点击停止' : '点击录音') : '语音不可用'}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* 麦克风按钮（含录音脉冲动画；收起/展开两态共用） */
const MicControl: React.FC<{
  size: number;
  color: string;
  isListening: boolean;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ size, color, isListening, disabled, onToggle }) => (
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
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: 'none',
        background: isListening
          ? 'linear-gradient(135deg, #FF5252, #D32F2F)'
          : `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isListening
          ? '0 0 24px rgba(255,82,82,0.5)'
          : `0 4px 16px ${color}66`,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {isListening ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </motion.button>
  </div>
);
