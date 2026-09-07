import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportModeData } from '../agents/types';

interface ReportModeEndProps {
  report: ReportModeData;
  topic: string;
  onRestart: () => void;
}

// 可折叠板块组件（与 ReportView 同款视觉）
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

// 评分条组件（与 ReportView 同款）
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

// 汇报模式结束页：展示表达质量评价（准确性/完整度/连贯性/清晰度/感染力）
export const ReportModeEnd: React.FC<ReportModeEndProps> = ({ report, topic, onRestart }) => {
  const scoreColor = (score: number) => {
    if (score >= 80) return '#66BB6A';
    if (score >= 60) return '#FFD54F';
    return '#EF5350';
  };

  const overallColor = scoreColor(report.overallScore);
  const isEmpty = report.overallScore === 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* 背景 */}
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
            汇报表达评价
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            letterSpacing: '2px',
          }}>
            展示时长 {report.duration}
            {topic && ` · 「${topic}」`}
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

        {/* 总体评语 */}
        {report.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              marginBottom: '16px',
              padding: '14px 16px',
              background: 'rgba(255,213,79,0.06)',
              borderRadius: '12px',
              borderLeft: '3px solid rgba(255,213,79,0.4)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13px',
              lineHeight: 1.8,
            }}
          >
            {report.summary}
          </motion.div>
        )}

        {/* 五维度评分 - 默认展开 */}
        <CollapsibleSection
          title="五维度评分"
          icon="📊"
          color="#90CAF9"
          defaultOpen={true}
        >
          <ScoreBar label="内容准确性" score={report.accuracyScore} color={scoreColor(report.accuracyScore)} />
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            lineHeight: 1.6,
            margin: '-4px 0 12px',
            paddingLeft: '2px',
          }}>
            {report.accuracyComment}
          </div>
          <ScoreBar label="内容完整度" score={report.completenessScore} color={scoreColor(report.completenessScore)} />
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            lineHeight: 1.6,
            margin: '-4px 0 12px',
            paddingLeft: '2px',
          }}>
            {report.completenessComment}
          </div>
          <ScoreBar label="逻辑连贯性" score={report.coherenceScore} color={scoreColor(report.coherenceScore)} />
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            lineHeight: 1.6,
            margin: '-4px 0 12px',
            paddingLeft: '2px',
          }}>
            {report.coherenceComment}
          </div>
          <ScoreBar label="表达清晰度" score={report.clarityScore} color={scoreColor(report.clarityScore)} />
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            lineHeight: 1.6,
            margin: '-4px 0 12px',
            paddingLeft: '2px',
          }}>
            {report.clarityComment}
          </div>
          <ScoreBar label="语言感染力" score={report.engagementScore} color={scoreColor(report.engagementScore)} />
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            lineHeight: 1.6,
            margin: '-4px 0 0',
            paddingLeft: '2px',
          }}>
            {report.engagementComment}
          </div>
        </CollapsibleSection>

        {/* 亮点 - 默认展开 */}
        {report.highlights.length > 0 && (
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
        )}

        {/* 改进建议 - 默认展开 */}
        {report.improvements.length > 0 && (
          <CollapsibleSection
            title="改进建议"
            icon="💡"
            color="#FFD54F"
            defaultOpen={true}
          >
            {report.improvements.map((imp, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 0',
                borderBottom: i < report.improvements.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
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
                  {i + 1}
                </span>
                <span style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  flex: 1,
                }}>
                  {imp}
                </span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* 空状态提示：未采集到汇报内容 */}
        {isEmpty && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '12px',
            borderRadius: '12px',
            background: 'rgba(239,83,80,0.08)',
            border: '1px solid rgba(239,83,80,0.25)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: '12px',
            lineHeight: 1.7,
          }}>
            🎙️ 提示：本次未检测到发言内容。使用麦克风朗读汇报，或在下方的文字输入框中逐段输入汇报内容，即可获得基于转写文本的清晰度、准确性与连贯性分析。
          </div>
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
