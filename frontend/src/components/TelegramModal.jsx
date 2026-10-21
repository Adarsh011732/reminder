import React, { useState } from 'react';
import { X, Send, Copy, Check, Smartphone, Key, User, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

export default function TelegramModal({ isOpen, onClose, lastDispatchedAlert, sampleTaskId }) {
  // Bot credentials live in session storage only (cleared when the tab closes)
  const [botToken, setBotToken] = useState(() => sessionStorage.getItem('tg_bot_token') || '');
  const [chatId, setChatId] = useState(() => sessionStorage.getItem('tg_chat_id') || '');
  const [isSending, setIsSending] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState(null);

  if (!isOpen) return null;

  const handleSaveAndTestLiveAlert = async () => {
    setIsSending(true);
    setDispatchStatus(null);

    if (botToken) sessionStorage.setItem('tg_bot_token', botToken.trim());
    if (chatId) sessionStorage.setItem('tg_chat_id', chatId.trim());
    try { localStorage.removeItem('tg_bot_token'); localStorage.removeItem('tg_chat_id'); } catch {}

    try {
      const res = await apiFetch('/api/telegram/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: sampleTaskId || 1,
          bot_token: botToken.trim() || undefined,
          chat_id: chatId.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.live_dispatched) {
          setDispatchStatus({ success: true, message: '🚀 Live notification successfully pushed to your Telegram app!' });
        } else if (botToken && chatId && data.telegram_api_result?.error) {
          setDispatchStatus({ success: false, message: `Telegram Error: ${data.telegram_api_result.error}` });
        } else {
          setDispatchStatus({ success: true, message: 'Simulated alert preview generated below!' });
        }
      } else {
        setDispatchStatus({ success: false, message: 'Failed to trigger Telegram alert.' });
      }
    } catch (err) {
      setDispatchStatus({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-[#262626] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-black font-bold">
              <Send className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Telegram Push Bot Alerts</h2>
              <p className="text-xs text-neutral-400">Receive instant mobile reminders for critical college deadlines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Quick Setup Guide */}
          <div className="p-4 rounded-2xl bg-[#121212] border border-[#262626] space-y-2 text-xs text-neutral-300">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-white" />
              <span>How to receive live push alerts on your phone:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-neutral-400">
              <li>Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-white underline font-mono">@BotFather</a>.</li>
              <li>Send <code>/newbot</code> to get your unique <b>Bot Token</b>.</li>
              <li>Start a chat with your new bot and get your <b>Chat ID</b> (via <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-white underline font-mono">@userinfobot</a>).</li>
              <li>Paste them below and click <b>Send Live Test Push</b>!</li>
            </ol>
          </div>

          {/* Credentials Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Telegram Bot Token
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Telegram Chat ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. 987654321"
                  className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Test Status Banner */}
          {dispatchStatus && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-slide-down ${
              dispatchStatus.success
                ? 'bg-[#0f1f14] border-[#1b4324] text-emerald-300'
                : 'bg-[#210f0f] border-[#431b1b] text-rose-300'
            }`}>
              {dispatchStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <p className="font-semibold">{dispatchStatus.message}</p>
            </div>
          )}

          {/* Alert Preview */}
          {lastDispatchedAlert && (
            <div>
              <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Message Formatting Preview:</div>
              <pre className="p-3.5 bg-[#000000] rounded-xl text-xs font-mono text-neutral-200 whitespace-pre-wrap border border-[#222222]">
                {lastDispatchedAlert}
              </pre>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1c1c1c] flex items-center justify-between bg-[#000000]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleSaveAndTestLiveAlert}
            disabled={isSending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50 shadow-md"
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Dispatching Push...' : 'Send Live Test Alert'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
