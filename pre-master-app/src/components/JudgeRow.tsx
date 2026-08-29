import React from 'react';
import { getAgentInfo } from '../agents/agentManager';

interface JudgeRowProps {
  activeAgentId: string | null;
}

// 评委席：文字头像 + 呼吸光晕
export const JudgeRow: React.FC<JudgeRowProps> = ({ activeAgentId }) => {
  const judgeIds = ['profWang', 'profLi', 'studentZhang'];
  const avatarImages: Record<string, string> = {
    profWang: '/assets/prof-wang.png',
    profLi: '/assets/prof-li.png',
    studentZhang: '/assets/student-zhang.png',
  };

  return (
    <div style={{
      display: 'flex',
      gap: '30px',
      justifyContent: 'center',
      padding: '8px 0 4px',
      flexShrink: 0,
      zIndex: 2,
    }}>
      {judgeIds.map((id) => {
        const agent = getAgentInfo(id);
        const isActive = activeAgentId === id;

        return (
          <div
            key={id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {/* 头像 */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: isActive ? `3px solid ${agent.avatarColor}` : '3px solid rgba(255,255,255,0.15)',
                boxShadow: isActive
                  ? `0 0 20px ${agent.avatarColor}88, 0 0 40px ${agent.avatarColor}44`
                  : '0 2px 10px rgba(0,0,0,0.3)',
                animation: isActive ? 'breathe-glow 2s ease-in-out infinite' : 'none',
                transition: 'all 0.4s ease',
              }}
            >
              <img
                src={avatarImages[id]}
                alt={agent.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // 图片加载失败时显示文字头像
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${agent.avatarColor};color:#fff;font-size:24px;font-weight:700">${agent.name.charAt(0)}</div>`;
                }}
              />
            </div>

            {/* 名字标签 */}
            <span style={{
              fontSize: '11px',
              color: isActive ? '#FFD54F' : 'rgba(255,255,255,0.5)',
              fontWeight: isActive ? 700 : 400,
              transition: 'all 0.3s ease',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              letterSpacing: '1px',
            }}>
              {agent.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
