import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportData } from '../agents/types';

interface ReportViewProps {
  report: ReportData;
  onRestart: () => void;
}

// 可折叠板块组件
const CollapsibleSection: React.FC<{
  title: string;
  icon: string;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, color, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{
      marginBottom: '12px',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `1px solid ${color}33`,
      background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            color: color,
            letterSpacing: '1px',
          }}>
            {title}
          </span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 16px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 评分条组件
const ScoreBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{label}</span>
      <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{score}</span>
    </div>
    <div style={{
      height: '6px',
      borderRadius: '3px',
      background: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          height: '100%',
          borderRadius: '3px',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        }}
      />
    </div>
  </div>
);

export const ReportView: React.FC<ReportViewProps> = ({ report, onRestart }) => {
  const scoreColor = (score: number) => {
    if (score >= 80) return '#66BB6A';
    if (score >= 60) return '#FFD54F';
    return '#EF5350';
  };

  const overallColor = scoreColor(report.overallScore);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* 激励风背景 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/assets/report-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1,
      }} />

      {/* 内容 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '480px',
        margin: '0 auto',
        padding: '30px 16px 40px',
      }}>
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '24px' }}
        >
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#FFD54F',
            marginBottom: '6px',
            letterSpacing: '4px',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            答辩复盘报告
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            letterSpacing: '2px',
          }}>
            时长 {report.duration} · 共 {report.totalMessages} 条消息
          </p>
        </motion.div>

        {/* 总分卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '24px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '20px',
            border: `1px solid ${overallColor}44`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{
            fontSize: '52px',
            fontWeight: 700,
            color: overallColor,
            lineHeight: 1,
            textShadow: `0 0 30px ${overallColor}44`,
          }}>
            {report.overallScore}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            marginTop: '8px',
            letterSpacing: '2px',
          }}>
            综合评分
          </div>
        </motion.div>

        {/* 分项评分 - 默认展开 */}
        <CollapsibleSection
          title="分项评分"
          icon="📊"
          color="#90CAF9"
          defaultOpen={true}
        >
          <ScoreBar label="逻辑连贯性" score={report.logicScore} color={scoreColor(report.logicScore)} />
          <ScoreBar label="内容完整度" score={report.contentScore} color={scoreColor(report.contentScore)} />
          <ScoreBar label="表达质量" score={report.expressionScore} color={scoreColor(report.expressionScore)} />
          <ScoreBar label="时间管理" score={report.timeScore} color={scoreColor(report.timeScore)} />
        </CollapsibleSection>

        {/* 亮点 - 默认展开 */}
        <CollapsibleSection
          title="表现亮点"
          icon="✨"
          color="#66BB6A"
          defaultOpen={true}
        >
          {report.highlights.map((h, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 0',
              borderBottom: i < report.highlights.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{
                color: '#66BB6A',
                fontSize: '14px',
                fontWeight: 700,
                flexShrink: 0,
                marginTop: '2px',
              }}>
                +
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '13px',
                lineHeight: 1.6,
              }}>
                {h}
              </span>
            </div>
          ))}
        </CollapsibleSection>

        {/* 改进建议 - 默认展开，每条可展开详情 */}
        <CollapsibleSection
          title="改进建议"
          icon="💡"
          color="#FFD54F"
          defaultOpen={true}
        >
          {report.improvements.map((imp, i) => (
            <ImprovementItem key={i} index={i + 1} text={imp} />
          ))}
        </CollapsibleSection>

        {/* 问答回顾 */}
        {report.dialogueSummary.length > 0 && (
          <CollapsibleSection
            title="问答回顾"
            icon="💬"
            color="#CE93D8"
          >
            {report.dialogueSummary.map((item, i) => (
              <div key={i} style={{
                padding: '10px 0',
                borderBottom: i < report.dialogueSummary.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{
                  color: '#FFD54F',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '4px',
                  letterSpacing: '1px',
                }}>
                  {item.agentName} 提问
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '12px',
                  marginBottom: '4px',
                  lineHeight: 1.5,
                }}>
                  Q: {item.question}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  marginBottom: '4px',
                  lineHeight: 1.5,
                }}>
                  A: {item.userResponse}
                </div>
                <div style={{
                  color: 'rgba(206,147,216,0.8)',
                  fontSize: '11px',
                  fontStyle: 'italic',
                }}>
                  {item.feedback}
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* 重新开始按钮 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a1a2e',
            background: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            marginTop: '20px',
            letterSpacing: '4px',
            boxShadow: '0 8px 24px rgba(255,213,79,0.3)',
          }}
        >
          再 来 一 次
        </motion.button>
      </div>
    </div>
  );
};

// 改进建议条目 - 可展开详情
const ImprovementItem: React.FC<{ index: number; text: string }> = ({ index, text }) => {
  const [expanded, setExpanded] = useState(false);

  // 为每条建议生成具体的行动建议
  const actionTips: Record<number, string> = {
    1: '建议在正式答辩前准备3-5个关键数据点，用具体数字支撑论点，避免泛泛而谈。',
    2: '尝试用"问题-方案-效果"的三段式结构来组织回答，让逻辑更清晰。',
    3: '每轮回答控制在30-60秒，先说结论再展开，避免冗长铺垫。',
    4: '提前准备一份Q&A清单，针对可能的追问准备标准回答模板。',
  };

  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          fontFamily: 'var(--font-main)',
        }}
      >
        <span style={{
          background: 'rgba(255,213,79,0.15)',
          color: '#FFD54F',
          fontSize: '11px',
          fontWeight: 700,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}>
          {index}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13px',
          lineHeight: 1.6,
          flex: 1,
        }}>
          {text}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '10px',
            flexShrink: 0,
            marginTop: '4px',
          }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginLeft: '32px',
              marginTop: '8px',
              padding: '10px 12px',
              background: 'rgba(255,213,79,0.08)',
              borderRadius: '8px',
              borderLeft: '3px solid rgba(255,213,79,0.3)',
            }}>
              <div style={{
                color: '#FFD54F',
                fontSize: '10px',
                fontWeight: 700,
                marginBottom: '4px',
                letterSpacing: '1px',
              }}>
                行动建议
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {actionTips[index] || '建议针对性地加强此方面的准备。'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
