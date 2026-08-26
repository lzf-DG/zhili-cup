import JSZip from 'jszip';

export interface SlideImage {
  id: string;
  dataUrl: string; // base64 data URL
  width?: number;
  height?: number;
}

export interface Slide {
  index: number;
  title: string;
  content: string;
  images: SlideImage[]; // 幻灯片中的图片
  notes?: string;
}

/**
 * 解析 .pptx 文件，提取每页幻灯片的文本内容和图片
 * .pptx 本质是 ZIP 文件，内部包含 XML 格式的幻灯片数据
 */
export async function parsePptx(file: File): Promise<Slide[]> {
  const zip = await JSZip.loadAsync(file);
  const slides: Slide[] = [];

  // 获取所有媒体文件（图片）
  const mediaFiles: Record<string, string> = {};
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (path.startsWith('ppt/media/') && !zipEntry.dir) {
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const mimeType = getMimeType(ext);
      const blob = await zipEntry.async('blob');
      const dataUrl = await blobToDataUrl(blob, mimeType);
      // 提取文件名作为key
      const fileName = path.split('/').pop() || path;
      mediaFiles[fileName] = dataUrl;
    }
  }

  // 获取幻灯片关系文件（用于映射rId到图片）
  const relsFiles: Record<string, Record<string, string>> = {};
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(path)) {
      const relsContent = await zipEntry.async('text');
      const slideNum = path.match(/slide(\d+)/)?.[1];
      if (slideNum) {
        relsFiles[slideNum] = parseRelsXml(relsContent, mediaFiles);
      }
    }
  }

  // 获取幻灯片文件列表 (ppt/slides/slide1.xml, slide2.xml, ...)
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const fileName = slideFiles[i];
    const slideNum = (i + 1).toString();
    const xmlContent = await zip.files[fileName].async('text');
    const rels = relsFiles[slideNum] || {};
    const slide = parseSlideXml(xmlContent, i + 1, rels);
    slides.push(slide);
  }

  return slides;
}

/**
 * 从幻灯片 XML 中提取文本内容和图片引用
 */
function parseSlideXml(xml: string, index: number, rels: Record<string, string>): Slide {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // 提取所有文本节点 (a:t 标签)
  const textNodes = doc.getElementsByTagName('a:t');
  const allTexts: string[] = [];

  for (let i = 0; i < textNodes.length; i++) {
    const text = textNodes[i].textContent?.trim();
    if (text) {
      allTexts.push(text);
    }
  }

  // 提取图片引用 (p:blip 标签中的 r:embed 属性)
  const blipNodes = doc.getElementsByTagName('p:blip');
  const images: SlideImage[] = [];
  const seenImages = new Set<string>();

  for (let i = 0; i < blipNodes.length; i++) {
    const embedAttr = blipNodes[i].getAttribute('r:embed') || 
                      blipNodes[i].getAttribute('embed');
    if (embedAttr && rels[embedAttr] && !seenImages.has(rels[embedAttr])) {
      seenImages.add(rels[embedAttr]);
      images.push({
        id: embedAttr,
        dataUrl: rels[embedAttr],
      });
    }
  }

  // 第一个文本块通常是标题
  const title = allTexts[0] || `第 ${index} 页`;
  // 其余为内容
  const content = allTexts.slice(1).join('\n');

  return {
    index,
    title,
    content,
    images,
  };
}

/**
 * 解析关系文件，映射 rId 到图片 data URL
 */
function parseRelsXml(xml: string, mediaFiles: Record<string, string>): Record<string, string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const relationships = doc.getElementsByTagName('Relationship');
  const result: Record<string, string> = {};

  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    const id = rel.getAttribute('Id') || '';
    const target = rel.getAttribute('Target') || '';
    
    // 提取文件名
    const fileName = target.split('/').pop() || target;
    
    // 如果是图片引用，映射到 data URL
    if (mediaFiles[fileName]) {
      result[id] = mediaFiles[fileName];
    }
  }

  return result;
}

/**
 * 根据扩展名获取 MIME 类型
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'emf': 'image/emf',
    'wmf': 'image/wmf',
  };
  return mimeTypes[ext] || 'image/png';
}

/**
 * 将 Blob 转换为 Data URL
 */
function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将PPT内容转为纯文本摘要（用于投影预览）
 */
export function slidesToText(slides: Slide[]): string {
  return slides
    .map(s => `[第${s.index}页] ${s.title}${s.content ? '\n' + s.content : ''}`)
    .join('\n\n');
}
