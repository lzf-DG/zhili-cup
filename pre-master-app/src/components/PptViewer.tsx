import React, { useState, useEffect, useCallback } from 'react';
import { Slide } from '../utils/pptParser';
import { usePptxStructure, StructuralSlide } from './PptStructuralViewer';

interface PptViewerProps {
  pptFile?: File | null;
  slideImages?: string[];
  slides?: Slide[];
  topic?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// PPT投影查看器 - 覆盖层设计
// 收起 = 顶部细长「展开」条；展开 = 全屏暗化遮罩 + 大尺寸投影卡（可遮挡评委席与对话区）。
// 翻页交互：悬浮 ◀/▶ 箭头、左右点击区、键盘 ←/→（输入框聚焦时不触发）、底部翻页栏。
// 渲染优先级：结构化解析（pptx-parser）→ 高清图片 → Canvas文本回退。
export const PptViewer: React.FC<PptViewerProps> = ({ pptFile, slideImages, slides, topic, collapsed, onToggleCollapse }) => {
  const [currentPage, setCurrentPage] = useState(0);

  // 结构化解析（pptx-parser），失败时自动回退到图片/文本模式
  const { structure, loading: structuralLoading } = usePptxStructure(pptFile ?? undefined);

  const hasImages = slideImages && slideImages.length > 0;
  const hasSlides = slides && slides.length > 0;
  const structuralSlides = structure?.slides ?? [];
  const useStructural = !!pptFile && (structuralLoading || structuralSlides.length > 0);

  let totalPages = 0;
  if (useStructural) {
    totalPages = structuralLoading ? 1 : structuralSlides.length;
  } else if (hasImages) {
    totalPages = slideImages!.length;
  } else if (hasSlides) {
    totalPages = slides!.length;
  } else {
    return null;
  }

  const goPrev = useCallback(() => setCurrentPage(p => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setCurrentPage(p => Math.min(totalPages - 1, p + 1)), [totalPages]);

  // 键盘翻页：← / →（仅投影展开且页数>1时监听；输入框/文本域聚焦时不触发，避免打断打字）
  useEffect(() => {
    if (collapsed || totalPages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, totalPages, goPrev, goNext]);

  // 收起状态：顶部细长「展开」条，把高度让给对话区
  if (collapsed) {
    return (
      <div style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(56%, 680px)',
        boxSizing: 'border-box',
        zIndex: 45,
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '7px 14px',
            background: 'rgba(8,8,25,0.85)',
            border: '1px dashed rgba(255,213,79,0.4)',
            borderRadius: '10px',
            color: '#FFD54F',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
          title="展开PPT投影"
        >
          <span>▶</span>
          <span>展开投影</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
            {topic || '答辩演示'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{currentPage + 1} / {totalPages}</span>
        </button>
      </div>
    );
  }

  // ===== 展开状态 =====
  // 投影卡宽度受视口双重约束：不超过 92vw；16:9 下高度不超过 78vh（卡片含标题栏/翻页栏）。
  // 底部操作栏 zIndex 50 高于本遮罩 35/卡片 40，保持始终可用。
  const arrows = totalPages > 1 && !structuralLoading ? (
    <>
      {/* 左侧翻页区（点击整条或中央箭头均翻上一页） */}
      <div
        onClick={goPrev}
        title="上一页 (←)"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '24%',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentPage === 0 ? 'default' : 'w-resize',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={currentPage === 0}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '2px solid rgba(255,213,79,0.5)',
            background: 'rgba(8,8,25,0.6)',
            color: currentPage === 0 ? 'rgba(255,255,255,0.22)' : '#FFD54F',
            backdropFilter: 'blur(4px)',
            fontSize: '18px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === 0 ? 'default' : 'pointer',
            boxShadow: currentPage === 0 ? 'none' : '0 0 18px rgba(255,213,79,0.3)',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 0) e.currentTarget.style.transform = 'scale(1.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ◀
        </button>
      </div>

      {/* 右侧翻页区（点击整条或中央箭头均翻下一页） */}
      <div
        onClick={goNext}
        title="下一页 (→)"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '24%',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: currentPage === totalPages - 1 ? 'default' : 'e-resize',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={currentPage === totalPages - 1}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '2px solid rgba(255,213,79,0.5)',
            background: 'rgba(8,8,25,0.6)',
            color: currentPage === totalPages - 1 ? 'rgba(255,255,255,0.22)' : '#FFD54F',
            backdropFilter: 'blur(4px)',
            fontSize: '18px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
            boxShadow: currentPage === totalPages - 1 ? 'none' : '0 0 18px rgba(255,213,79,0.3)',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages - 1) e.currentTarget.style.transform = 'scale(1.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ▶
        </button>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* 全屏暗化遮罩：点击空白处收起投影 */}
      <div
        onClick={onToggleCollapse}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 35,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          cursor: 'zoom-out',
        }}
      />

      {/* 大尺寸投影卡（覆盖评委席与对话区） */}
      <div style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, calc(78vh * 16 / 9))',
        zIndex: 40,
        boxSizing: 'border-box',
      }}>
        <div style={{
          background: 'rgba(8,8,25,0.97)',
          borderRadius: '14px',
          border: '2px solid rgba(255,213,79,0.35)',
          overflow: 'hidden',
          boxShadow: '0 0 80px rgba(255,213,79,0.18), 0 8px 60px rgba(0,0,0,0.5)',
        }}>
          {/* 顶部标题栏 */}
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255,213,79,0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,213,79,0.06)',
          }}>
            <span style={{
              color: '#FFD54F',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '55%',
            }}>
              {topic || '答辩演示'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>
                {structuralLoading ? '解析中…' : `${currentPage + 1} / ${totalPages}`}
              </span>
              {totalPages > 1 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '1px' }}>
                  ← → 翻页
                </span>
              )}
              <button
                onClick={onToggleCollapse}
                title="收起投影，让对话区更宽敞"
                style={{
                  background: 'rgba(255,213,79,0.12)',
                  border: '1px solid rgba(255,213,79,0.25)',
                  color: '#FFD54F',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  lineHeight: '18px',
                  transition: 'all 0.2s ease',
                }}
              >
                收起 ▲
              </button>
            </div>
          </div>

          {/* 幻灯片内容（左右翻页区 + 悬浮箭头） */}
          <div style={{
            position: 'relative',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
          }}>
            {useStructural ? (
              structuralLoading ? (
                <LoadingPlaceholder />
              ) : structuralSlides.length > 0 ? (
                /* ===== 结构化渲染模式（容器变宽即自动放大，无需改缩放逻辑） ===== */
                <StructuralSlide
                  slide={structuralSlides[Math.min(currentPage, structuralSlides.length - 1)]}
                  pageSize={structure!.pageSize}
                />
              ) : null
            ) : hasImages ? (
              /* ===== 高清图片模式 ===== */
              <img
                src={slideImages![currentPage]}
                alt={`幻灯片 ${currentPage + 1}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '76vh',
                  objectFit: 'contain',
                  display: 'block',
                }}
                onError={(e) => {
                  console.error('图片加载失败:', slideImages![currentPage]);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : hasSlides ? (
              /* ===== Canvas文本回退模式 ===== */
              <SlideCanvas slide={slides![currentPage]} total={slides!.length} />
            ) : null}

            {arrows}
          </div>

          {/* 底部翻页栏 */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 14px',
              borderTop: '1px solid rgba(255,213,79,0.15)',
              background: 'rgba(255,213,79,0.03)',
            }}>
              <button
                onClick={goPrev}
                disabled={currentPage === 0}
                style={{
                  background: currentPage === 0 ? 'transparent' : 'rgba(255,213,79,0.15)',
                  border: '1px solid rgba(255,213,79,0.25)',
                  color: currentPage === 0 ? 'rgba(255,255,255,0.2)' : '#FFD54F',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === 0 ? 'default' : 'pointer',
                }}
              >
                ◀ 上一页
              </button>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: Math.min(totalPages, 20) }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    style={{
                      width: totalPages > 10 ? '5px' : '7px',
                      height: totalPages > 10 ? '5px' : '7px',
                      borderRadius: '50%',
                      background: i === currentPage ? '#FFD54F' : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={currentPage === totalPages - 1}
                style={{
                  background: currentPage === totalPages - 1 ? 'transparent' : 'rgba(255,213,79,0.15)',
                  border: '1px solid rgba(255,213,79,0.25)',
                  color: currentPage === totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#FFD54F',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
                }}
              >
                下一页 ▶
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* 结构化解析加载占位 */
const LoadingPlaceholder: React.FC = () => (
  <div style={{
    width: '100%',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'rgba(0,0,0,0.45)',
    fontSize: '13px',
  }}>
    <span style={{
      width: '14px',
      height: '14px',
      border: '2px solid rgba(0,0,0,0.12)',
      borderTopColor: '#FF8F00',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }} />
    正在解析 PPT 结构…
  </div>
);

/* Canvas文本回退组件 */
const SlideCanvas: React.FC<{ slide: Slide; total: number }> = ({ slide, total }) => {
  return (
    <div style={{
      width: '100%',
      minHeight: '280px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 页码 */}
      <div style={{
        textAlign: 'right',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '12px',
        marginBottom: '8px',
      }}>
        {slide.index} / {total}
      </div>

      {/* 标题 */}
      <h3 style={{
        color: '#FFD54F',
        fontSize: '22px',
        fontWeight: 700,
        margin: '0 0 12px 0',
        borderBottom: '2px solid rgba(255,213,79,0.3)',
        paddingBottom: '8px',
      }}>
        {slide.title}
      </h3>

      {/* 内容 */}
      <div style={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: '14px',
        lineHeight: 1.8,
        flex: 1,
        whiteSpace: 'pre-wrap',
      }}>
        {slide.content}
      </div>

      {/* 图片 */}
      {slide.images.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
          flexWrap: 'wrap',
        }}>
          {slide.images.map((img, i) => (
            <img
              key={i}
              src={img.dataUrl}
              alt=""
              style={{
                maxWidth: '200px',
                maxHeight: '120px',
                borderRadius: '6px',
                objectFit: 'contain',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
