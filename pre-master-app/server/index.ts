import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// LibreOffice路径
const SOFFICE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
// Poppler pdftoppm路径
const PDFTOPPM_PATH = 'C:\\Users\\fannb\\AppData\\Local\\Microsoft\\WinGet\\Packages\\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\\poppler-25.07.0\\Library\\bin\\pdftoppm.exe';

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

// POST /api/chat - 评委回复接口（预留真实API调用）
app.post('/api/chat', async (req, res) => {
  const { agentId, userMessage, messages, apiConfig } = req.body;

  // 如果提供了API配置，调用真实API
  if (apiConfig?.baseUrl && apiConfig?.apiKey) {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `你是${agentId}评委，请针对学生的回答进行追问或点评。` },
            ...(messages || []).slice(-10).map((m: any) => ({
              role: m.role === 'judge' ? 'assistant' : 'user',
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      return res.json({ agentId, content: content || '（API调用失败）' });
    } catch (error) {
      console.error('API调用失败:', error);
    }
  }

  // Mock模式：返回模拟回复
  const mockResponses: Record<string, string[]> = {
    profWang: [
      '你这个数据的样本量是多少？有没有考虑过统计显著性的问题？',
      '你的实验设计中，控制变量是怎么设置的？',
      '这个结论是不是过于武断了？',
    ],
    profLi: [
      '你的研究出发点很有意思，能再展开讲讲吗？',
      '这个方案如果应用到其他领域，你觉得最大的挑战是什么？',
      '从长远来看，你觉得下一步应该怎么做？',
    ],
    studentZhang: [
      '我没太听懂那个技术细节，能用更简单的话解释一下吗？',
      '这个东西对我们日常生活有什么帮助吗？',
      '你的核心贡献用一句话概括是什么？',
    ],
  };

  const responses = mockResponses[agentId] || mockResponses.profWang;
  const randomIdx = Math.floor(Math.random() * responses.length);
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  res.json({ agentId, content: responses[randomIdx] });
});

// POST /api/report - 生成复盘报告（预留）
app.post('/api/report', async (req, res) => {
  const { messages, duration } = req.body;
  
  // Mock报告数据
  res.json({
    overallScore: 75,
    logicScore: 70,
    contentScore: 78,
    expressionScore: 80,
    timeScore: 72,
    totalMessages: messages?.length || 0,
    duration: duration || '00:00',
    highlights: ['汇报结构较为清晰', '能够针对评委问题进行回应', '展示了较好的专业素养'],
    improvements: ['建议在数据支撑方面做更充分的准备', '回答时可以更多使用具体案例', '注意控制每轮回答的时间'],
    dialogueSummary: [],
  });
});

app.listen(PORT, () => {
  console.log(`Pre大师后端服务运行在 http://localhost:${PORT}`);
});

// 保持进程运行（Node.js 24 ES Module 兼容）
process.stdin.resume();
