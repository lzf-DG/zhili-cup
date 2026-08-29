import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { validateApiConfig } from '../agents/apiAgent';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 保存/验证状态：idle 初始 | testing 验证中 | success 配置成功 | error 配置失败
type SaveStatus = 'idle' | 'testing' | 'success' | 'error';

// API配置弹窗
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('api_base_url') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('api_model') || 'gpt-4o-mini');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  // 保存配置：写入localStorage后，实际发一次最小请求验证密钥是否有效
  const handleSave = async () => {
    const trimmedUrl = baseUrl.trim();
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim() || 'gpt-4o-mini';
    if (!trimmedUrl || !trimmedKey || status === 'testing') return;

    localStorage.setItem('api_base_url', trimmedUrl);
    localStorage.setItem('api_key', trimmedKey);
    localStorage.setItem('api_model', trimmedModel);

    setStatus('testing');
    setStatusMsg('正在验证配置...');
    const result = await validateApiConfig({ baseUrl: trimmedUrl, apiKey: trimmedKey, model: trimmedModel });
    if (result.ok) {
      setStatus('success');
      setStatusMsg(result.message);
      // 验证通过，短暂展示成功后自动关闭
      setTimeout(onClose, 1400);
    } else {
      // 验证失败：保持弹窗打开，展示原因便于修改
      setStatus('error');
      setStatusMsg(result.message);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('api_base_url');
    localStorage.removeItem('api_key');
    localStorage.removeItem('api_model');
    setBaseUrl('');
    setApiKey('');
    setModel('gpt-4o-mini');
    setStatus('idle');
    setStatusMsg('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a237e, #283593)',
          borderRadius: '20px',
          padding: '30px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255,213,79,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{
          color: '#FFD54F',
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          API 配置
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          配置后可接入真实AI，未配置则使用Mock模式
        </p>

        {/* Base URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            API Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,213,79,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,213,79,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Model */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
            模型
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,213,79,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* 验证状态提示：验证中 / 配置成功 / 配置失败及原因 */}
        <p style={{
          minHeight: '16px',
          margin: '0 0 12px',
          textAlign: 'center',
          fontSize: '12px',
          lineHeight: 1.5,
          color:
            status === 'success' ? '#81C784'
            : status === 'error' ? '#EF5350'
            : status === 'testing' ? 'rgba(255,213,79,0.9)'
            : 'transparent',
        }}>
          {status === 'success' && `✓ ${statusMsg}`}
          {status === 'error' && `✗ ${statusMsg}`}
          {status === 'testing' && `⏳ ${statusMsg}`}
          {status === 'idle' && ' '}
        </p>

        {/* 按钮组 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            清除配置
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'testing' || !baseUrl.trim() || !apiKey.trim()}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: status === 'success'
                ? 'linear-gradient(135deg, #43A047, #2E7D32)'
                : 'linear-gradient(135deg, #FFD54F, #FF8F00)',
              color: status === 'success' ? '#fff' : '#1a237e',
              fontSize: '14px',
              fontWeight: 700,
              cursor: status === 'testing' ? 'wait' : 'pointer',
              opacity: status === 'testing' || !baseUrl.trim() || !apiKey.trim() ? 0.6 : 1,
              transition: 'all 0.3s ease',
            }}
          >
            {status === 'testing' ? '验证中...' : status === 'success' ? '配置成功 ✓' : '保存配置'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
