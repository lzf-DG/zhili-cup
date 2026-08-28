import React, { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  parsePptxStructure,
  toCssColor,
  PT_TO_PX,
} from '../utils/pptStructure';
import type {
  PptxElement,
  PptxSize,
  PptxSlide,
  PptxStructure,
  PptxText,
} from '../utils/pptStructure';

/* ================= 结构化解析 Hook ================= */

export interface UsePptxStructureResult {
  structure: PptxStructure | null;
  loading: boolean;
  error: string | null;
}

/**
 * 解析 .pptx 为结构化 JSON。解析失败时返回 null（供调用方回退到图片/文本模式）。
 */
export function usePptxStructure(file?: File): UsePptxStructureResult {
  const [structure, setStructure] = useState<PptxStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setStructure(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const s = await parsePptxStructure(file);
        if (cancelled) return;
        if (!s || !Array.isArray(s.slides) || s.slides.length === 0) {
          throw new Error('未解析到幻灯片结构');
        }
        setStructure(s);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[usePptxStructure] 结构化解析失败，回退图片/文本模式:', err);
        setStructure(null);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  return { structure, loading, error };
}

/* ================= 结构化幻灯片渲染 ================= */

interface StructuralSlideProps {
  slide: PptxSlide;
  pageSize: PptxSize;
}

/**
 * 单页结构化幻灯片：以页面实际宽高为基准，用绝对定位的元素
 * （文本框 / 图片 / 形状）在 HTML 中还原 PPT 布局，并按容器宽度缩放。
 */
export const StructuralSlide: React.FC<StructuralSlideProps> = ({ slide, pageSize }) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  const pw = pageSize.width?.value ?? 960;
  const ph = pageSize.height?.value ?? 540;

  // 测量容器宽度，计算缩放比例（元素坐标为页面内 px，需 × scale 映射到容器）
  useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0 && pw > 0) setScale(w / pw);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pw]);

  const bg = toCssColor(slide.pageProperties?.pageBackgroundFill?.solidFill) ?? '#ffffff';
  const elements = slide.pageElements ?? [];

  return (
    <div
      ref={surfaceRef}
      style={{
        width: '100%',
        aspectRatio: `${pw} / ${ph}`,
        position: 'relative',
        background: bg,
        overflow: 'hidden',
      }}
    >
      {scale > 0 &&
        elements.map((el, i) => <ElementView key={i} el={el} scale={scale} />)}
    </div>
  );
};

/* ================= 单个元素渲染 ================= */

const ElementView: React.FC<{ el: PptxElement; scale: number }> = ({ el, scale }) => {
  const left = (el.position?.x?.value ?? 0) * scale;
  const top = (el.position?.y?.value ?? 0) * scale;
  const width = (el.size?.width?.value ?? 0) * scale;
  const height = (el.size?.height?.value ?? 0) * scale;

  const base: CSSProperties = {
    position: 'absolute',
    left,
    top,
    width,
    height,
    zIndex: el.order ?? 0,
    transform: buildTransform(el),
    transformOrigin: 'center center',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  };

  // 图片
  if (el.image?.contentUrl) {
    return (
      <img
        src={el.image.contentUrl}
        alt={el.image.name ?? ''}
        draggable={false}
        style={{ ...base, objectFit: 'fill', display: 'block' }}
      />
    );
  }

  // 形状（含文本框）
  if (el.shape) {
    const text = el.shape.text;
    const shapeStyle: CSSProperties = {
      ...base,
      ...fillStyle(el),
      ...outlineStyle(el, scale),
      borderRadius: shapeRadius(el, scale),
      overflow: 'hidden',
    };

    if (text && (text.paragraphs?.length ?? 0) > 0) {
      return (
        <div style={{ ...shapeStyle, ...textBoxStyle(text, scale) }}>
          {renderText(text, scale)}
        </div>
      );
    }
    return <div style={shapeStyle} />;
  }

  // 无形状/图片但有填充的纯色块
  const fill = fillStyle(el);
  if (fill.backgroundColor) {
    return <div style={{ ...base, ...fill }} />;
  }

  return null;
};

/* ================= 样式辅助函数 ================= */

function buildTransform(el: PptxElement): string {
  const parts: string[] = [];
  if (el.rotate) parts.push(`rotate(${el.rotate}deg)`);
  if (el.flipH) parts.push('scaleX(-1)');
  if (el.flipV) parts.push('scaleY(-1)');
  return parts.length ? parts.join(' ') : 'none';
}

function fillStyle(el: PptxElement): CSSProperties {
  const c = toCssColor(el.fill?.solidFill);
  const ft = (el.fill?.fillType ?? '').toUpperCase();
  if (c && ft !== 'NO_FILL' && ft !== 'NONE') {
    return { backgroundColor: c };
  }
  return {};
}

function outlineStyle(el: PptxElement, scale: number): CSSProperties {
  const w = (el.outline?.weight?.value ?? 0) * scale;
  if (!w) return {};
  const c = toCssColor(el.outline?.outlineFill?.solidFill) ?? '#000000';
  const style: CSSProperties = { border: `${w}px solid ${c}` };
  if (el.outline?.dashStyle && el.outline.dashStyle.toUpperCase() !== 'SOLID') {
    style.borderStyle = 'dashed';
  }
  return style;
}

function shapeRadius(el: PptxElement, scale: number): number | string {
  const t = (el.shape?.shapeType ?? '').toLowerCase();
  if (t === 'ellipse' || t === 'oval' || t === 'circle' || t === 'ellipseribbon') {
    return '50%';
  }
  if (t === 'roundrect' || t === 'roundrectangle' || t === 'roundrect2' || t === 'round2') {
    return Math.max(1, 8 * scale);
  }
  return 0;
}

function textBoxStyle(text: PptxText, scale: number): CSSProperties {
  const bp = text.bodyProperty ?? {};
  const pt = (bp.paddingTop?.value ?? 0) * scale;
  const pr = (bp.paddingRight?.value ?? 0) * scale;
  const pb = (bp.paddingBottom?.value ?? 0) * scale;
  const pl = (bp.paddingLeft?.value ?? 0) * scale;

  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: mapAnchor(bp.anchor),
    padding: `${pt}px ${pr}px ${pb}px ${pl}px`,
    fontSize: 18 * PT_TO_PX * scale, // 兜底正文字号（绝大多数 run 自带 fontSize）
    lineHeight: 1.2,
    textAlign: 'left',
  };
}

function renderText(text: PptxText, scale: number): ReactNode {
  const paragraphs = text.paragraphs ?? [];
  return paragraphs.map((p, pi) => {
    const align = mapAlign(p.paragraphProperty?.alignment);
    const spans = p.textSpans ?? [];
    return (
      <div key={pi} style={{ textAlign: align, minHeight: '1em' }}>
        {spans.map((span, si) => {
          const tr = span.textRun;
          if (!tr) return null;
          const st = tr.style ?? {};
          const deco: string[] = [];
          if (st.underline) deco.push('underline');
          if (st.strikethrough) deco.push('line-through');
          return (
            <span
              key={si}
              style={{
                fontFamily: st.fontFamily,
                fontSize: st.fontSize ? st.fontSize.value * PT_TO_PX * scale : undefined,
                fontWeight: st.bold ? 700 : 400,
                fontStyle: st.italic ? 'italic' : 'normal',
                color: toCssColor(st.foregroundColor),
                backgroundColor: toCssColor(st.backgroundColor),
                textDecoration: deco.length ? deco.join(' ') : undefined,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {tr.content ?? ''}
            </span>
          );
        })}
      </div>
    );
  });
}

function mapAnchor(anchor?: string): CSSProperties['justifyContent'] {
  const a = (anchor ?? '').toUpperCase();
  if (a === 'MIDDLE' || a === 'CTR' || a === 'CENTER') return 'center';
  if (a === 'BOTTOM') return 'flex-end';
  return 'flex-start';
}

function mapAlign(alignment?: string): CSSProperties['textAlign'] {
  const a = (alignment ?? '').toUpperCase();
  if (a === 'CENTER' || a === 'CTR') return 'center';
  if (a === 'END' || a === 'RIGHT') return 'right';
  if (a === 'JUSTIFY' || a === 'JUST' || a === 'DIST') return 'justify';
  return 'left';
}
