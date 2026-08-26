// 生成包含真实图片的模拟PPT文件
const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();

pptx.title = '基于深度学习的图像识别研究';
pptx.author = '张三';

// 图片路径
const assetsDir = path.join(__dirname, '..', 'public', 'assets');
const imgBg = path.join(assetsDir, 'ppt-bg.png');
const imgModel = path.join(assetsDir, 'ppt-model.png');
const imgResults = path.join(assetsDir, 'ppt-results.png');
const imgConclusion = path.join(assetsDir, 'ppt-conclusion.png');

// 第1页：封面
const slide1 = pptx.addSlide();
slide1.background = { color: '1A1A2E' };
slide1.addText('基于深度学习的图像识别研究', {
  x: 0.5, y: 1.2, w: 9, h: 1.5,
  fontSize: 36, bold: true, color: 'FFD54F',
  align: 'center', fontFace: 'Microsoft YaHei'
});
slide1.addText('—— ResNet-50 + Attention 机制', {
  x: 1, y: 2.7, w: 8, h: 0.8,
  fontSize: 18, color: 'FFFFFF',
  align: 'center', fontFace: 'Microsoft YaHei'
});
slide1.addText('答辩人：张三\n指导教师：李教授\n2026年8月', {
  x: 1.5, y: 4.5, w: 7, h: 1.5,
  fontSize: 16, color: 'AAAAAA',
  align: 'center', fontFace: 'Microsoft YaHei',
  lineSpacingMultiple: 1.6
});

// 第2页：研究背景（带对比图）
const slide2 = pptx.addSlide();
slide2.background = { color: '16213E' };
slide2.addText('研究背景', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 28, bold: true, color: 'FFD54F',
  fontFace: 'Microsoft YaHei'
});
slide2.addImage({
  path: imgBg,
  x: 0.5, y: 1.2, w: 9, h: 3.2
});
slide2.addText([
  { text: '图像识别是计算机视觉的核心任务\n', options: { fontSize: 13, color: 'FFFFFF', breakLine: true } },
  { text: '传统方法依赖手工特征提取，泛化能力有限\n', options: { fontSize: 12, color: 'CCCCCC' } },
  { text: '深度学习通过端到端学习自动提取特征', options: { fontSize: 12, color: 'CCCCCC' } }
], {
  x: 0.8, y: 4.6, w: 8.5, h: 1.2,
  fontFace: 'Microsoft YaHei', lineSpacingMultiple: 1.4
});

// 第3页：研究方法（带模型架构图）
const slide3 = pptx.addSlide();
slide3.background = { color: '16213E' };
slide3.addText('研究方法', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 28, bold: true, color: 'FFD54F',
  fontFace: 'Microsoft YaHei'
});
slide3.addImage({
  path: imgModel,
  x: 0.5, y: 1.2, w: 9, h: 2.8
});
slide3.addText([
  { text: '模型架构：ResNet-50 + CBAM Attention\n', options: { fontSize: 13, color: 'FFFFFF', breakLine: true } },
  { text: '数据集：ImageNet + 自建数据集 (10万张)\n', options: { fontSize: 12, color: 'CCCCCC' } },
  { text: '训练策略：迁移学习 + 数据增强\n', options: { fontSize: 12, color: 'CCCCCC' } },
  { text: '评估指标：Accuracy / Precision / Recall / F1', options: { fontSize: 12, color: 'CCCCCC' } }
], {
  x: 0.8, y: 4.2, w: 8.5, h: 1.6,
  fontFace: 'Microsoft YaHei', lineSpacingMultiple: 1.4
});

// 第4页：实验结果（带结果图表）
const slide4 = pptx.addSlide();
slide4.background = { color: '16213E' };
slide4.addText('实验结果', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 28, bold: true, color: 'FFD54F',
  fontFace: 'Microsoft YaHei'
});
slide4.addImage({
  path: imgResults,
  x: 0.5, y: 1.2, w: 9, h: 2.8
});
slide4.addText([
  { text: 'Top-1 准确率：94.7%（提升 3.2%）    Top-5：99.1%\n', options: { fontSize: 13, color: '66BB6A', breakLine: true } },
  { text: '推理速度：45ms/张（GPU）    参数量：25.6M', options: { fontSize: 12, color: 'CCCCCC' } }
], {
  x: 0.8, y: 4.2, w: 8.5, h: 1.2,
  fontFace: 'Microsoft YaHei', lineSpacingMultiple: 1.4
});

// 第5页：总结与展望（带展望图）
const slide5 = pptx.addSlide();
slide5.background = { color: '16213E' };
slide5.addText('总结与展望', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 28, bold: true, color: 'FFD54F',
  fontFace: 'Microsoft YaHei'
});
slide5.addImage({
  path: imgConclusion,
  x: 0.5, y: 1.2, w: 9, h: 2.5
});
slide5.addText([
  { text: '融合 Attention 的改进 ResNet 架构，达到 SOTA 水平\n', options: { fontSize: 13, color: 'FFFFFF', breakLine: true } },
  { text: '未来方向：轻量化部署 · 多模态融合 · 视频理解\n', options: { fontSize: 12, color: 'CCCCCC' } },
  { text: '应用前景：医疗影像 · 自动驾驶 · 安防监控', options: { fontSize: 12, color: 'CCCCCC' } }
], {
  x: 0.8, y: 4.0, w: 8.5, h: 1.6,
  fontFace: 'Microsoft YaHei', lineSpacingMultiple: 1.4
});

// 保存
const outputPath = path.join(assetsDir, 'test-presentation.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('模拟PPT已生成:', outputPath);
}).catch(err => {
  console.error('生成失败:', err);
});
