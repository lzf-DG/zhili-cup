/**
 * 类型声明：pptx-parser（纯浏览器 PPTX 解析库）
 *
 * 该包没有自带类型定义（package.json 无 "types" 字段），
 * 且主入口 dist/index.js 是 webpack 打包的 UMD bundle，
 * 顶层即引用 window，只能在浏览器中动态 import。
 *
 * 这里仅声明解析所需的极小接口；完整的结构化类型
 * 在 src/utils/pptStructure.ts 中定义。
 */
declare module 'pptx-parser' {
  export interface PptxParseOptions {
    /** 将组合元素（group）展平为顶层元素 */
    flattenGroup?: boolean;
  }

  /** 将解析结果转换为 vf.js 场景 JSON（依赖已失效的 CDN，不使用） */
  export function vf(
    pptJson: unknown,
    options: { width: number; height: number }
  ): Promise<unknown>;

  /** 解析 .pptx 文件，返回结构化 JSON（pageSize / slides 等） */
  export default function parse(
    file: File,
    options?: PptxParseOptions
  ): Promise<unknown>;
}
