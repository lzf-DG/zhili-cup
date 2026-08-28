import express from 'express';
import cors from 'cors';
import { exec, spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 静态文件服务：提供转换后的PPT图片
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Resolve executable helper: check env, common defaults, then PATH
function resolveExecutable(envName: string, binNames: string[], defaults: string[]): string | null {
  // 1) environment override
  const envPath = process.env[envName];
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 2) check common default locations
  for (const p of defaults) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }

  // 3) try to find in PATH using `which`
  try {
    for (const name of binNames) {
      const which = spawnSync('which', [name]);
      if (which && which.status === 0) {
        const found = which.stdout.toString().trim();
        if (found) return found;
      }
    }
  } catch {}

  return null;
}

// Platform-specific sensible defaults
const defaultSofficePaths = process.platform === 'win32'
  ? ['C:\\Program Files\\LibreOffice\\program\\soffice.exe']
  : process.platform === 'darwin'
    ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice']
    : ['/usr/bin/soffice', '/usr/local/bin/soffice'];

const defaultPdftoppmPaths = process.platform === 'win32'
  ? ['C:\\Program Files\\poppler\\bin\\pdftoppm.exe']
  : ['/opt/homebrew/bin/pdftoppm', '/usr/local/bin/pdftoppm', '/usr/bin/pdftoppm'];

const SOFFICE_PATH = resolveExecutable('SOFFICE_PATH', ['soffice'], defaultSofficePaths) || '';
const PDFTOPPM_PATH = resolveExecutable('PDFTOPPM_PATH', ['pdftoppm'], defaultPdftoppmPaths) || '';

// --------- Server-side PPTX parsing fallback (uses JSZip + fast-xml-parser) ---------
interface SlideImage {
  id: string;
  dataUrl: string;
}

interface SlideData {
  index: number;
  title: string;
  content: string;
  images: SlideImage[];
  notes?: string;
}

async function parsePptxBuffer(buffer: Buffer): Promise<SlideData[]> {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files);

  // Extract media files
  const mediaFiles: Record<string, string> = {};
  for (const p of files) {
    if (p.startsWith('ppt/media/') && !zip.files[p].dir) {
      const fileName = p.split('/').pop() || p;
      const content = await zip.files[p].async('base64');
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      mediaFiles[fileName] = `data:${mime};base64,${content}`;
    }
  }

  // Parse slide relationships to map rId -> media filename
  const relsMap: Record<string, Record<string, string>> = {};
  for (const p of files) {
    const m = p.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/i);
    if (m) {
      const slideNum = m[1];
      const xml = await zip.files[p].async('text');
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const obj = parser.parse(xml);
      const relationships = obj.Relationships?.Relationship || [];
      const map: Record<string, string> = {};
      const relArr = Array.isArray(relationships) ? relationships : [relationships];
      for (const rel of relArr) {
        const id = rel.Id || rel['Id'] || rel.id || rel['@_Id'] || rel['@id'];
        const target = rel.Target || rel['Target'] || rel.target || rel['@_Target'] || rel['@target'];
        if (id && target) {
          const fname = target.split('/').pop();
          if (fname && mediaFiles[fname]) map[id] = fname;
        }
      }
      relsMap[slideNum] = map;
    }
  }

  // Collect slide files
  const slideFiles = files.filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return na - nb;
    });

  const slides: SlideData[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const name = slideFiles[i];
    const slideNum = (i + 1).toString();
    const xml = await zip.files[name].async('text');
    // naive text extraction: find all <a:t>text</a:t>
    const textMatches = Array.from(xml.matchAll(/<a:t[^>]*?>([\s\S]*?)<\/a:t>/g));
    const texts = textMatches.map(m => (m[1] || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const title = texts[0] || `第 ${i + 1} 页`;
    const content = texts.slice(1).join('\n');

    // find blip r:embed occurrences
    const imageMatches = Array.from(xml.matchAll(/<a:blip[^>]*r:embed="([^"]+)"[^>]*>/g));
    const images: SlideImage[] = [];
    const seen = new Set<string>();
    for (const im of imageMatches) {
      const rid = im[1];
      const fname = relsMap[slideNum]?.[rid];
      if (fname && !seen.has(fname)) {
        seen.add(fname);
        images.push({ id: rid, dataUrl: mediaFiles[fname] });
      }
    }

    slides.push({ index: i + 1, title, content, images });
  }

  return slides;
}

// ------------------------------------------------------------------------------------

// 简单的multipart解析（不依赖multer）
function parseMultipart(buffer: Buffer, boundary: string): { filename: string; data: Buffer } | null {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const startIdx = buffer.indexOf(boundaryBuf);
  if (startIdx === -1) return null;
  
  const afterBoundary = buffer.slice(startIdx + boundaryBuf.length);
  const headerEnd = afterBoundary.indexOf('\r\n\r\n');
  if (headerEnd === -1) return null;
  
  const headers = afterBoundary.slice(0, headerEnd).toString();
  const filenameMatch = headers.match(/filename="([^"]+)"/);
  const filename = filenameMatch ? filenameMatch[1] : 'upload.pptx';
  
  const dataStart = headerEnd + 4;
  const endIdx = afterBoundary.indexOf(boundaryBuf, dataStart);
  const data = endIdx !== -1 
    ? afterBoundary.slice(dataStart, endIdx - 2) // -2 for trailing \r\n
    : afterBoundary.slice(dataStart);
  
  return { filename, data };
}

// 执行命令的辅助函数（spawn + shell:false 直接执行，避免cmd.exe引号问题）
function execCommand(cmd: string, args: string[], timeout = 120000): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[exec] ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { timeout, windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    proc.stdout.on('data', () => {}); // consume stdout to prevent blocking
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} failed (exit ${code}): ${stderr}`));
    });
    proc.on('error', (err) => reject(new Error(`${cmd} error: ${err.message}`)));
  });
}

// POST /api/convert-ppt - PPT→PDF→逐页PNG
app.post('/api/convert-ppt', async (req, res) => {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  
  if (!boundaryMatch) {
    return res.status(400).json({ error: '无效的请求格式' });
  }
  
  const boundary = boundaryMatch[1];
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    const parsed = parseMultipart(buffer, boundary);
    
    if (!parsed) {
      return res.status(400).json({ error: '未找到上传文件' });
    }
    
    const { filename, data } = parsed;
    const sessionId = `ppt_${Date.now()}`;
    const workDir = path.join(uploadsDir, sessionId);
    const tempPptx = path.join(workDir, 'input.pptx');
    const tempPdf = path.join(workDir, 'input.pdf');
    
    try {
      fs.mkdirSync(workDir, { recursive: true });
      fs.writeFileSync(tempPptx, data);
      
      console.log(`[转换] 步骤1: PPT → PDF (LibreOffice)`);

      // 如果 LibreOffice 和 pdftoppm 可用，则走原来的二进制流程，生成 PNG
      if (SOFFICE_PATH && PDFTOPPM_PATH) {
        // 步骤1: LibreOffice 将 PPT 转为 PDF
        const userInstallDir = path.join(workDir, 'lo_profile');
        fs.mkdirSync(userInstallDir, { recursive: true });
        await execCommand(SOFFICE_PATH, [
          '--headless', '--norestore',
          `-env:UserInstallation=file:///${userInstallDir.replace(/\\/g, '/')}`,
          '--convert-to', 'pdf',
          '--outdir', workDir, tempPptx
        ]);

        if (!fs.existsSync(tempPdf)) {
          throw new Error('LibreOffice未生成PDF文件');
        }

        console.log(`[转换] 步骤2: PDF → 逐页PNG (pdftoppm)`);
        // 步骤2: pdftoppm 将 PDF 每页转为高清 PNG
        const pngPrefix = path.join(workDir, 'slide');
        await execCommand(PDFTOPPM_PATH, [
          '-png', '-r', '150',  // 150 DPI 高清
          '-scale-to', '1280',  // 宽度1280px
          tempPdf, pngPrefix
        ]);
      } else {
        // 回退：在服务器端使用 JSZip 解析 .pptx，提取每页文本与内嵌图片（data URL）
        console.log('[转换] 二进制工具未就绪，使用 JSZip 服务器端解析回退');

        const slides = await parsePptxBuffer(data);

        // 将内嵌图片写入 uploads 目录并构建 slideImages URL（优先使用嵌入图片）
        const images: string[] = [];
        fs.mkdirSync(workDir, { recursive: true });
        slides.forEach((s, i) => {
          if (s.images && s.images.length > 0) {
            // 取第一张图片作为幻灯片预览（保持与前端 slideImages 用法兼容）
            const img = s.images[0];
            const base64 = img.dataUrl.split(',')[1] || '';
            const ext = img.dataUrl.match(/data:image\/(.+);base64/)?.[1] || 'png';
            const fname = `slide_${i + 1}.${ext}`;
            const outPath = path.join(workDir, fname);
            fs.writeFileSync(outPath, base64, 'base64');
            images.push(`/uploads/${sessionId}/${fname}`);
          } else {
            images.push('');
          }
        });

        // 保存文本 slides JSON 以供前端使用
        const slidesJson = path.join(workDir, 'slides.json');
        fs.writeFileSync(slidesJson, JSON.stringify(slides, null, 2));

        const resp = {
          success: true,
          totalPages: slides.length,
          images: images.map((url, i) => ({ index: i, url })),
          slides,
        };

        // 清理上传的 pptx（保留解析结果）
        try { fs.unlinkSync(tempPptx); } catch {}
        try { fs.unlinkSync(tempPdf); } catch {}

        return res.json(resp);
      }
      
      // 读取生成的 PNG 文件
      const imageFiles = fs.readdirSync(workDir)
        .filter(f => f.startsWith('slide') && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
      
      if (imageFiles.length === 0) {
        throw new Error('pdftoppm未生成图片');
      }
      
      console.log(`[转换] 完成！共 ${imageFiles.length} 页`);
      
      // 返回图片URL列表
      const images = imageFiles.map((f, i) => ({
        index: i,
        url: `/uploads/${sessionId}/${f}`,
      }));
      
      // 清理临时文件（保留PNG）
      try { fs.unlinkSync(tempPptx); } catch {}
      try { fs.unlinkSync(tempPdf); } catch {}
      
      res.json({ success: true, totalPages: images.length, images });
    } catch (err: any) {
      console.error('[转换] 失败:', err.message);
      try { fs.unlinkSync(tempPptx); } catch {}
      try { fs.unlinkSync(tempPdf); } catch {}
      res.status(500).json({ error: err.message || 'PPT转换失败' });
    }
  });
});

// POST /api/chat - 评委回复接口（代理转发到用户配置的第三方API）
// 前端在未配置API时使用本地Mock，不会走到此端点
app.post('/api/chat', async (req, res) => {
  const { agentId, messages, apiConfig } = req.body;

  if (!apiConfig?.baseUrl || !apiConfig?.apiKey) {
    return res.status(503).json({ error: 'API未配置，请在设置中填写API信息' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '缺少对话内容' });
  }

  try {
    console.log(`[chat] 调用第三方API (${apiConfig.model || 'default'})，评委: ${agentId}`);
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-4o-mini',
        messages: messages.slice(-12),
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('第三方API返回错误:', response.status);
      return res.status(502).json({ error: `第三方API错误 ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'API返回内容为空' });
    }
    return res.json({ content });
  } catch (error) {
    console.error('API调用失败:', error);
    return res.status(500).json({ error: 'API调用异常' });
  }
});

// POST /api/report - 生成复盘报告（代理转发到用户配置的第三方API）
app.post('/api/report', async (req, res) => {
  const { dialogueText, duration, apiConfig } = req.body;

  if (!apiConfig?.baseUrl || !apiConfig?.apiKey) {
    return res.status(503).json({ error: 'API未配置，请在设置中填写API信息' });
  }

  const prompt = `请根据以下答辩模拟对话记录，生成一份结构化的复盘报告。
报告需要包含：
1. 总体评分（0-100）
2. 逻辑连贯性评分
3. 内容完整度评分
4. 表达质量评分
5. 时间管理评分
6. 亮点（3条）
7. 改进建议（4条）
8. 每轮问答的简要点评

对话记录：
${dialogueText}

答辩时长：${duration}

请以JSON格式返回（不要包含markdown代码块），字段如下：
{
  "overallScore": 0-100整数,
  "logicScore": 0-100整数,
  "contentScore": 0-100整数,
  "expressionScore": 0-100整数,
  "timeScore": 0-100整数,
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "improvements": ["建议1", "建议2", "建议3", "建议4"],
  "dialogueSummary": [
    {"agentName": "评委姓名", "question": "问题", "userResponse": "学生回答", "feedback": "点评"}
  ]
}`;

  try {
    console.log('[report] 调用第三方API生成复盘报告');
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是一位答辩模拟评估专家，擅长分析学生的答辩表现并给出专业评价。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error('第三方API返回错误:', response.status);
      return res.status(502).json({ error: `第三方API错误 ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'API返回内容为空' });
    }
    return res.json({ content });
  } catch (error) {
    console.error('报告生成失败:', error);
    return res.status(500).json({ error: '报告生成异常' });
  }
});

app.listen(PORT, () => {
  console.log(`Pre大师后端服务运行在 http://localhost:${PORT}`);
});

// 保持进程运行（Node.js 24 ES Module 兼容）
process.stdin.resume();
