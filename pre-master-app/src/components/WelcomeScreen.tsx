import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePptx, slidesToText, Slide } from '../utils/pptParser';

interface WelcomeScreenProps {
  onStart: (topic: string, pptContent: string, slides: Slide[], slideImages: string[], pptFile: File | null) => void;
  onOpenSettings: () => void;
}

// 水墨武侠风欢迎页 + 主题/PPT输入
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onOpenSettings }) => {
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [topic, setTopic] = useState('');
  const [pptContent, setPptContent] = useState('');
  const [pptFileName, setPptFileName] = useState('');
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [parsingPpt, setParsingPpt] = useState(false);
  const [parseError, setParseError] = useState('');
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [convertingPpt, setConvertingPpt] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPptFileName(file.name);
    setPptFile(file);
    setParseError('');
    setParsingPpt(true);
    setSlideImages([]);

    try {
      if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        // 1. JSZip解析文本内容（用于AI理解）
        let parsedSlides: Slide[] = [];
        try {
          parsedSlides = await parsePptx(file);
          setSlides(parsedSlides);
          setPptContent(slidesToText(parsedSlides));
          if (parsedSlides.length === 0) {
            setParseError('未能从PPT中提取到内容');
          }
        } catch (parseErr) {
          console.warn('PPT文本解析失败（不影响图片转换）:', parseErr);
          setPptContent(`[文件: ${file.name}]`);
          // 不return，继续后端图片转换
        }

        // 2. 后端转换为高清图片（LibreOffice + pdftoppm）
        // 使用相对路径，经 vite 代理转发到后端，避免硬编码端口
        setConvertingPpt(true);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/convert-ppt', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.slides) && data.slides.length > 0) {
              // 文本回退模式（未装 LibreOffice/pdftoppm）：
              // 后端只提取了每页文本 + 第一张内嵌图，无法整页成像。
              // 不设置 slideImages，让 PptViewer 改用已解析的文本 slides 渲染真实内容。
              if (parsedSlides.length === 0) {
                setSlides(data.slides);
                setPptContent(slidesToText(data.slides));
              }
              console.log(`PPT进入文本回退模式: ${data.totalPages}页`);
            } else {
              // 高清模式（LibreOffice 已就绪）：images 为整页渲染的 PNG
              const images = data.images.map((img: any) => img.url);
              setSlideImages(images);
              console.log(`PPT转换成功: ${data.totalPages}页（高清图片）`);
            }
          } else {
            const errData = await response.json();
            console.warn('PPT图片转换失败:', errData.error);
            setParseError(`PPT转换失败: ${errData.error || '请确保已安装LibreOffice'}`);
          }
        } catch (convertErr: any) {
          console.warn('PPT图片转换失败:', convertErr);
          setParseError('PPT转换失败: 后端服务可能未启动');
        } finally {
          setConvertingPpt(false);
        }
      } else {
        // 非PPTX文件，回退到文本读取
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            setPptContent(text.slice(0, 2000));
          } else {
            setPptContent(`[文件: ${file.name}] ${Math.round(file.size / 1024)}KB`);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error('未知错误:', err);
      setParseError('上传失败，请重试');
    } finally {
      setParsingPpt(false);
    }
  };

  const handleStart = () => {
    if (topic.trim()) {
      onStart(topic.trim(), pptContent, slides, slideImages, pptFile);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* 水墨背景 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/assets/ink-wash-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.7)',
      }} />

      {/* 墨色渐变叠加 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* 内容层 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <AnimatePresence mode="wait">
          {step === 'intro' ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8 }}
              style={{ textAlign: 'center' }}
            >
              {/* 水墨风标题 */}
              <h1 style={{
                fontSize: 'clamp(36px, 8vw, 64px)',
                fontWeight: 700,
                color: '#FFD54F',
                textShadow: '0 0 40px rgba(255,213,79,0.4), 0 2px 4px rgba(0,0,0,0.8)',
                marginBottom: '8px',
                letterSpacing: '8px',
                fontFamily: '"Noto Sans SC", serif',
              }}>
                Pre大师
              </h1>
              <p style={{
                fontSize: 'clamp(14px, 3vw, 20px)',
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '4px',
                marginBottom: '40px',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>
                论道台 · 沉浸答辩
              </p>

              {/* 武侠风描述 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  maxWidth: '360px',
                  margin: '0 auto 40px',
                  padding: '20px 24px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,213,79,0.2)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <p style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  fontStyle: 'italic',
                }}>
                  "三堂会审，问道求真。<br/>
                  三位评委各执己见，<br/>
                  唯有以真才实学，方能动人心魄。"
                </p>
              </motion.div>

              {/* 开始按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep('setup')}
                style={{
                  padding: '16px 56px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1a1a2e',
                  background: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
                  border: 'none',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(255,213,79,0.3)',
                  letterSpacing: '4px',
                }}
              >
                踏入论道台
              </motion.button>

              {/* 设置按钮 */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onOpenSettings}
                style={{
                  display: 'block',
                  margin: '20px auto 0',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.5)',
                  padding: '8px 24px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  letterSpacing: '2px',
                }}
              >
                API 设置
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
              style={{
                width: '100%',
                maxWidth: '440px',
              }}
            >
              {/* 返回按钮 */}
              <button
                onClick={() => setStep('intro')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  padding: '4px 0',
                }}
              >
                ← 返回
              </button>

              <h2 style={{
                color: '#FFD54F',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '8px',
                letterSpacing: '4px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}>
                设定论题
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                marginBottom: '24px',
              }}>
                输入你的答辩主题，上传PPT将投影至黑板
              </p>

              {/* 主题输入 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  letterSpacing: '2px',
                }}>
                  答辩主题
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：基于深度学习的图像识别研究"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,213,79,0.3)',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    fontFamily: 'var(--font-main)',
                    backdropFilter: 'blur(8px)',
                  }}
                />
              </div>

              {/* PPT上传 */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  letterSpacing: '2px',
                }}>
                  上传PPT（可选）
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px dashed ${pptFileName ? 'rgba(76,175,80,0.5)' : 'rgba(255,213,79,0.3)'}`,
                    background: 'rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: pptFileName ? '#81C784' : 'rgba(255,255,255,0.5)',
                    fontSize: '14px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  {parsingPpt ? '解析中...' : convertingPpt ? '转换为高清图片中...' : (pptFileName || '点击上传 .pptx 文件')}
                  {convertingPpt && (
                    <span style={{ color: '#FFD54F', fontSize: '11px', marginLeft: '4px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                      ⏳ 转换中
                    </span>
                  )}
                  {slideImages.length > 0 && !parsingPpt && !convertingPpt && (
                    <span style={{ color: '#81C784', fontSize: '11px', marginLeft: '4px' }}>
                      ✅ {slideImages.length}页高清就绪
                    </span>
                  )}
                  {slides.length > 0 && slideImages.length === 0 && !parsingPpt && !convertingPpt && (
                    <span style={{ color: '#81C784', fontSize: '11px', marginLeft: '4px' }}>
                      ({slides.length}页)
                    </span>
                  )}
                  <input
                    type="file"
                    accept=".pptx,.pdf,.ppt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {parseError && (
                  <p style={{ color: '#EF5350', fontSize: '11px', marginTop: '6px' }}>
                    {parseError}
                  </p>
                )}
              </div>

              {/* 开始答辩按钮 */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={!topic.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: topic.trim() ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
                  background: topic.trim()
                    ? 'linear-gradient(135deg, #FFD54F, #FF8F00)'
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: topic.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: topic.trim() ? '0 8px 32px rgba(255,213,79,0.3)' : 'none',
                  letterSpacing: '4px',
                  transition: 'all 0.3s ease',
                }}
              >
                开 始 答 辩
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
