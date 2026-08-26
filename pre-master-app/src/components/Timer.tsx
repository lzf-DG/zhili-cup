import React from 'react';
import { useSessionStore } from '../store/sessionStore';

// 右上角计时器
export const Timer: React.FC = () => {
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isOvertime = elapsedSeconds > 600;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      padding: '8px 16px',
      borderRadius: '20px',
      border: `1px solid ${isOvertime ? 'rgba(229,57,53,0.6)' : 'rgba(255,213,79,0.3)'}`,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isOvertime ? '#E53935' : '#FFD54F'} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>

      <span style={{
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 700,
        color: isOvertime ? '#E53935' : '#FFD54F',
        letterSpacing: '2px',
      }}>
        {display}
      </span>
    </div>
  );
};
