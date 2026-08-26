import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// API配置弹窗
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('api_base_url') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('api_model') || 'gpt-4o-mini');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (baseUrl && apiKey) {
      localStorage.setItem('api_base_url', baseUrl);
      localStorage.setItem('api_key', apiKey);
      localStorage.setItem('api_model', model);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('api_base_url');
    localStorage.removeItem('api_key');
    localStorage.removeItem('api_model');
    setBaseUrl('');
    setApiKey('');
    setModel('gpt-4o-mini');
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
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: saved
                ? 'linear-gradient(135deg, #43A047, #2E7D32)'
                : 'linear-gradient(135deg, #FFD54F, #FF8F00)',
              color: saved ? '#fff' : '#1a237e',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {saved ? '已保存 ✓' : '保存配置'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
