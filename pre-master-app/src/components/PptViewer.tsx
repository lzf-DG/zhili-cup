import React, { useState } from 'react';
import { Slide } from '../utils/pptParser';
import { usePptxStructure, StructuralSlide } from './PptStructuralViewer';

interface PptViewerProps {
  pptFile?: File | null;
  slideImages?: string[];
  slides?: Slide[];
  topic?: string;
}

// PPT投影查看器 - 优先结构化渲染，回退高清图片，再回退Canvas文本
export const PptViewer: React.FC<PptViewerProps> = ({ pptFile, slideImages, slides, topic }) => {
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

  const goPrev = () => setCurrentPage(p => Math.max(0, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages - 1, p + 1));

  return (
    <div style={{
      position: 'absolute',
      top: '2%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '58%',
      maxWidth: '720px',
      zIndex: 100,
    }}>
      {/* 投影框 */}
      <div style={{
        background: 'rgba(8,8,25,0.95)',
        borderRadius: '12px',
        border: '2px solid rgba(255,213,79,0.3)',
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(255,213,79,0.15), 0 0 120px rgba(255,213,79,0.05)',
        backdropFilter: 'blur(4px)',
      }}>
        {/* 顶部标题栏 */}
        <div style={{
          padding: '6px 14px',
          borderBottom: '1px solid rgba(255,213,79,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,213,79,0.05)',
        }}>
          <span style={{
            color: '#FFD54F',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '60%',
          }}>
            {topic || '答辩演示'}
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {structuralLoading ? '解析中…' : `${currentPage + 1} / ${totalPages}`}
          </span>
        </div>

        {/* 幻灯片内容 */}
        <div style={{
          padding: '0',
          background: '#fff',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
        }}>
          {useStructural ? (
            structuralLoading ? (
              <LoadingPlaceholder />
            ) : structuralSlides.length > 0 ? (
              /* ===== 结构化渲染模式 ===== */
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
                maxHeight: '480px',
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
        </div>

        {/* 翻页控制 */}
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
