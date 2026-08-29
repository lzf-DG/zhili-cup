import React, { useState, useRef, useLayoutEffect } from 'react';
import { Background } from './components/Background';
import { JudgeRow } from './components/JudgeRow';
import { DialogBox } from './components/DialogBox';
import { Timer } from './components/Timer';
import { MicButton } from './components/MicButton';
import { AnswerBox } from './components/AnswerBox';
import { TextInput } from './components/TextInput';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsModal } from './components/SettingsModal';
import { ReportView } from './components/ReportView';
import { PptViewer } from './components/PptViewer';
import { useChat } from './hooks/useChat';
import { useSessionStore } from './store/sessionStore';
import { getAgentInfo } from './agents/agentManager';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  // PPT投影收起状态：答辩问答时自动收起，把高度让给对话区（可随时手动展开）
  const [pptCollapsed, setPptCollapsed] = useState(false);
  const { messages, isLoading, phase, topic, startSession, sendMessage, endReport, endSession, restart } = useChat();
  const lastAgentId = useSessionStore((s) => s.lastAgentId);
  const clearMessages = useSessionStore((s) => s.clearMessages);
  const report = useSessionStore((s) => s.report);
  const slides = useSessionStore((s) => s.slides);
  const slideImages = useSessionStore((s) => s.slideImages);
  const pptFile = useSessionStore((s) => s.pptFile);
  // 对话区自动「吸底」：内容高度变化时（新消息 / 打字机效果逐字生长 / 回答框出现或隐藏
  // 导致容器变矮）都自动滚到底部，最新消息不会被顶出可视区；
  // 用户主动上滑查看历史时（离开底部 >24px）不再强制拉回
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useLayoutEffect(() => {
    const scroller = chatScrollRef.current;
    const content = chatContentRef.current;
    if (!scroller || !content) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  // 发送消息时强制重新吸底：新消息发出即完整出现在可视区底部，不会被顶出视口
  const handleSend = (text: string) => {
    stickToBottomRef.current = true;
    // 答辩问答时收起投影，把高度让给对话区：保证自己的回答和评委回复同屏可见
    if (phase !== 'reporting') setPptCollapsed(true);
    sendMessage(text);
  };

  // 获取最新评委信息（用于AnswerBox）
  const lastJudgeMsg = [...messages].reverse().find(m => m.role === 'judge');
  const lastJudgeAgent = lastJudgeMsg?.agentId ? getAgentInfo(lastJudgeMsg.agentId) : null;

  // 欢迎页
  if (phase === 'idle') {
    return (
      <>
        <WelcomeScreen
          onStart={(t, c, s, i, f) => {
            // 新一场答辩：投影默认展开
            setPptCollapsed(false);
            startSession(t, c, s, i, f);
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // 复盘报告生成中（API模式下异步生成）
  if (phase === 'finished' && !report) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/assets/report-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,213,79,0.3)',
          padding: '30px 44px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#FFD54F',
            margin: '0 auto 14px',
            animation: 'blink-cursor 1s ease-in-out infinite',
          }} />
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            letterSpacing: '2px',
            margin: 0,
          }}>
            正在生成复盘报告...
          </p>
        </div>
      </div>
    );
  }

  // 复盘报告页
  if (phase === 'finished' && report) {
    return <ReportView report={report} onRestart={restart} />;
  }

  // 主答辩界面 - 覆盖层布局（从0重构）
  // 核心：对话区是【固定上下边界的绝对定位带】，高度不随 PPT 展开/回答框出现而改变，
  // 因此消息永远不会被布局变化挤出可视区（修复「对话记录会消失」的根因——旧的 flex
  // 布局让对话区可伸缩，PPT 或回答框一出现就把它压扁，把历史消息顶出视口）。
  // PPT 与回答框为覆盖层：展开时允许遮挡评委席与对话区；底部操作栏始终可用。
  const hasPpt = !!(pptFile || slideImages.length > 0 || slides.length > 0);
  const judgeTop = hasPpt ? 52 : 8;
  const chatTop = hasPpt ? 148 : 100;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* 背景层 */}
      <Background topic={topic} />

      {/* PPT投影 - 覆盖层：收起=顶部细条；展开=大尺寸居中（可遮挡评委席与对话区） */}
      {hasPpt && (
        <PptViewer
          pptFile={pptFile}
          slideImages={slideImages}
          slides={slides}
          topic={topic}
          collapsed={pptCollapsed}
          onToggleCollapse={() => setPptCollapsed(v => !v)}
        />
      )}

      {/* 评委席 - 固定在顶部，PPT展开时被覆盖 */}
      <div style={{ position: 'absolute', top: judgeTop, left: 0, right: 0, zIndex: 20 }}>
        <JudgeRow activeAgentId={lastAgentId} />
      </div>

      {/* 计时器（组件自身 fixed 于右上角） */}
      <Timer />

      {/* 对话区域 - 固定上下边界的绝对定位带（高度稳定，消息不消失） */}
      <div
        ref={chatScrollRef}
        onScroll={handleChatScroll}
        style={{
          position: 'absolute',
          top: chatTop,
          bottom: '84px',
          left: 0,
          right: 0,
          overflowY: 'auto',
          padding: '10px 0',
          zIndex: 5,
        }}
      >
        <div ref={chatContentRef} style={{ display: 'flex', flexDirection: 'column' }}>
          {messages.map((msg) => (
            <DialogBox
              key={msg.id}
              text={msg.content}
              isUser={msg.role === 'user'}
              agentId={msg.agentId}
              agentName={msg.agentName}
            />
          ))}

          {/* Loading指示器 */}
          {isLoading && (
            <div style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#FFD54F',
                animation: 'blink-cursor 1s ease-in-out infinite',
              }} />
              评委思考中...
            </div>
          )}
        </div>
      </div>

      {/* 回答框 - 停靠在底栏上方（自身 fixed 居中）；展开时全屏置顶覆盖所有图层 */}
      {!isLoading && lastJudgeMsg && lastJudgeAgent && (
        <AnswerBox
          questionText={lastJudgeMsg.content}
          agentName={lastJudgeAgent.name}
          agentColor={lastJudgeAgent.avatarColor}
          onAnswer={handleSend}
        />
      )}

      {/* 底部操作栏 - 固定底部，始终可用（PPT展开时也保持可见） */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
        zIndex: 50,
      }}>
        {/* 麦克风按钮 - 自由发言模式 */}
        <MicButton onResult={handleSend} disabled={isLoading} />

        {/* 文字输入框 - 语音识别的fallback */}
        <div style={{ flex: 1, maxWidth: '440px' }}>
          <TextInput onSend={handleSend} disabled={isLoading} placeholder={phase === 'reporting' ? '输入你的汇报内容...' : '输入你的回答...'} />
        </div>

        {/* 清空对话 - 清除残留的对话记录（保留主题/PPT/计时） */}
        <button
          onClick={clearMessages}
          title="清空当前对话记录（保留主题、PPT与计时）"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.45)',
            padding: '8px 14px',
            borderRadius: '16px',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          清空对话
        </button>

        {/* 结束汇报（仅汇报阶段）/ 结束答辩（答辩阶段） */}
        {phase === 'reporting' ? (
          <button
            onClick={endReport}
            style={{
              background: 'linear-gradient(135deg, rgba(255,213,79,0.95), rgba(255,167,38,0.9))',
              border: '1px solid rgba(255,213,79,0.6)',
              color: '#3e2723',
              fontWeight: 600,
              padding: '8px 24px',
              borderRadius: '16px',
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 16px rgba(255,213,79,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            结束汇报
          </button>
        ) : (
          <button
            onClick={endSession}
            style={{
              background: 'transparent',
              border: '1px solid rgba(229,57,53,0.4)',
              color: 'rgba(229,57,53,0.8)',
              padding: '8px 20px',
              borderRadius: '16px',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(229,57,53,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            结束答辩
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
