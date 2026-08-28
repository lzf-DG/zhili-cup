/**
 * 结构化 PPTX 解析
 *
 * 基于 `pptx-parser` 的 parse() 输出，将 .pptx 还原为带绝对定位的
 * 元素树（文本框 / 图片 / 形状），从而完整呈现幻灯片的布局、字体、
 * 颜色与层级，而不是只读取一张扁平渲染图。
 *
 * 坐标与单位约定（pptx-parser 已统一换算）：
 *   - position / size / pageSize 均为 px（96dpi）
 *   - fontSize.value 实际为「磅」（pt），CSS 中需 × 96/72
 *   - rotate 为角度（度），flipH / flipV 为布尔
 *   - 颜色：形状/文字为不带 `#` 的 6 位 hex（如 "FF0000"），
 *     页面背景为 tinycolor 的 "rgb(...)" 字符串 —— 由 toCssColor 统一处理
 *   - image.contentUrl 为 base64 data URL，可直接用于 <img src>
 */

export interface PxValue {
  value: number;
  unit?: string;
}

export interface PptxPosition {
  x?: PxValue;
  y?: PxValue;
}

export interface PptxSize {
  width?: PxValue;
  height?: PxValue;
}

export interface PptxTextRunStyle {
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  link?: string;
  bold?: boolean;
  italic?: boolean;
  fontFamily?: string;
  fontSize?: PxValue;
  baselineOffset?: unknown;
  horizontalAlign?: string;
  strikethrough?: boolean;
  underline?: boolean;
  alpha?: number;
  letterSpacing?: PxValue;
  lineSpacing?: PxValue;
}

export interface PptxTextRun {
  content?: string;
  style?: PptxTextRunStyle;
}

export interface PptxTextSpan {
  order?: number;
  textRun?: PptxTextRun;
  autoText?: unknown;
  listMarker?: unknown;
}

export interface PptxParagraph {
  textSpans?: PptxTextSpan[];
  paragraphProperty?: { alignment?: string; [k: string]: unknown };
}

export interface PptxTextBodyProperty {
  anchor?: string;
  wrap?: string;
  paddingTop?: PxValue;
  paddingRight?: PxValue;
  paddingBottom?: PxValue;
  paddingLeft?: PxValue;
  [k: string]: unknown;
}

export interface PptxText {
  paragraphs?: PptxParagraph[];
  bodyProperty?: PptxTextBodyProperty;
}

export interface PptxShape {
  shapeType?: string;
  adjustParams?: unknown[];
  pathData?: string;
  text?: PptxText;
}

export interface PptxImage {
  contentUrl?: string;
  name?: string;
  type?: string;
  cropProperties?: unknown;
}

export interface PptxFill {
  fillType?: string;
  solidFill?: string | null;
  gradientFill?: unknown;
  pictureFill?: unknown;
}

export interface PptxOutline {
  weight?: PxValue;
  outlineFill?: PptxFill;
  dashStyle?: string;
}

export interface PptxGroup {
  name?: string;
  children?: PptxElement[];
}

export interface PptxElement {
  order?: number;
  name?: string;
  position?: PptxPosition;
  size?: PptxSize;
  rotate?: number;
  flipH?: boolean;
  flipV?: boolean;
  shape?: PptxShape;
  image?: PptxImage;
  group?: PptxGroup;
  fill?: PptxFill;
  outline?: PptxOutline;
}

export interface PptxSlide {
  objectId?: string;
  pageType?: string;
  pageElements?: PptxElement[];
  pageProperties?: { pageBackgroundFill?: PptxFill };
}

export interface PptxStructure {
  pageSize: PptxSize;
  slides: PptxSlide[];
  title?: string;
}

/** pt → px（96dpi） */
export const PT_TO_PX = 96 / 72;

/**
 * 把 pptx-parser 的颜色值转成可用的 CSS 颜色字符串。
 * 兼容：6/8 位 hex（无 # 前缀）、rgb()/rgba()/hsl() 字符串、命名颜色。
 */
export function toCssColor(color: unknown): string | undefined {
  if (typeof color !== 'string') return undefined;
  const s = color.trim();
  if (!s) return undefined;
  if (s.startsWith('#')) return s;
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(s)) return s;
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s;
  if (/^[0-9a-fA-F]{8}$/.test(s)) return '#' + s;
  return s; // 命名颜色，如 "white" / "black" / "transparent"
}

/**
 * 解析 .pptx 文件，返回结构化 JSON。
 * 使用动态 import，避免 pptx-parser（浏览器专属 UMD bundle）在 SSR/构建时被执行。
 */
export async function parsePptxStructure(file: File): Promise<PptxStructure> {
  const { default: parse } = await import('pptx-parser');
  const raw = await parse(file, { flattenGroup: true });
  return raw as PptxStructure;
}
