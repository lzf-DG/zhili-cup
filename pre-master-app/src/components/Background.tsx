import React from 'react';

interface BackgroundProps {
  topic?: string;
}

// 动漫教室背景 + 樱花花瓣
export const Background: React.FC<BackgroundProps> = ({ topic }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      backgroundImage: 'url(/assets/classroom-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>

      {/* 樱花花瓣飘动 */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: '50% 0 50% 50%',
            background: `rgba(255, ${180 + Math.random() * 40}, ${190 + Math.random() * 40}, ${0.3 + Math.random() * 0.3})`,
            left: `${Math.random() * 100}%`,
            top: `${-10 + Math.random() * 20}%`,
            animation: `float-particle ${5 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      {/* 底部渐变遮罩 - 让对话框区域更清晰 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};
