import React, { useState, useRef, useEffect } from 'react';
import { Background } from './components/Background';
import { JudgeRow } from './components/JudgeRow';
import { DialogBox } from './components/DialogBox';
import { Timer } from './components/Timer';
import { MicButton } from './components/MicButton';
import { AnswerBox } from './components/AnswerBox';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsModal } from './components/SettingsModal';
import { ReportView } from './components/ReportView';
import { PptViewer } from './components/PptViewer';
import { useChat } from './hooks/useChat';
import { useSessionStore } from './store/sessionStore';
import { getAgentInfo } from './agents/agentManager';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const { messages, isLoading, phase, topic, pptContent, startSession, sendMessage, endSession, restart } = useChat();
  const lastAgentId = useSessionStore((s) => s.lastAgentId);
  const report = useSessionStore((s) => s.report);
  const slides = useSessionStore((s) => s.slides);
  const slideImages = useSessionStore((s) => s.slideImages);
  const pptFile = useSessionStore((s) => s.pptFile);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 获取最新评委信息（用于AnswerBox）
  const lastJudgeMsg = [...messages].reverse().find(m => m.role === 'judge');
  const lastJudgeAgent = lastJudgeMsg?.agentId ? getAgentInfo(lastJudgeMsg.agentId) : null;

  // 欢迎页
  if (phase === 'idle') {
    return (
      <>
        <WelcomeScreen
          onStart={startSession}
          onOpenSettings={() => setShowSettings(true)}
        />
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  // 复盘报告页
  if (phase === 'finished' && report) {
    return <ReportView report={report} onRestart={restart} />;
  }

  // 主答辩界面
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* 背景层 */}
      <Background topic={topic} />

      {/* PPT投影 */}
      {(pptFile || slideImages.length > 0 || slides.length > 0) && (
        <PptViewer pptFile={pptFile} slideImages={slideImages} slides={slides} topic={topic} />
      )}

      {/* 评委席 */}
      <JudgeRow activeAgentId={lastAgentId} />

      {/* 计时器 */}
      <Timer />

      {/* 对话区域 */}
      <div style={{
        position: 'absolute',
        top: '52%',
        left: 0,
        right: 0,
        bottom: '160px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '10px 0',
        zIndex: 5,
      }}>
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

        <div ref={chatEndRef} />
      </div>

      {/* 回答框 - 评委提问后显示（纯录音模式） */}
      {!isLoading && lastJudgeMsg && lastJudgeAgent && (
        <AnswerBox
          questionText={lastJudgeMsg.content}
          agentName={lastJudgeAgent.name}
          agentColor={lastJudgeAgent.avatarColor}
          onAnswer={sendMessage}
        />
      )}

      {/* 底部操作栏 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '10px 16px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
        zIndex: 10,
      }}>
        {/* 麦克风按钮 - 自由发言模式 */}
        <MicButton onResult={sendMessage} disabled={isLoading} />

        {/* 结束按钮 */}
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
      </div>
    </div>
  );
}

export default App;
