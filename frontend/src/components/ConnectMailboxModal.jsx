import React, { useState } from 'react';
import { X, Mail, Key, Server, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, Sparkles, Inbox, Check } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

const PRESETS = [
  { id: 'gmail', label: 'Gmail / Google Workspace', server: 'imap.gmail.com', port: 993, placeholder: 'yourname@gmail.com' },
  { id: 'outlook', label: 'Outlook / Office 365', server: 'outlook.office365.com', port: 993, placeholder: 'student@college.edu' },
  { id: 'custom', label: 'Custom College IMAP', server: 'mail.college.edu', port: 993, placeholder: 'rollno@college.ac.in' },
];

export default function ConnectMailboxModal({ isOpen, onClose, onSyncComplete }) {
  const [activePreset, setActivePreset] = useState('gmail');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [imapServer, setImapServer] = useState('imap.gmail.com');
  const [port, setPort] = useState(993);
  const [maxEmails, setMaxEmails] = useState(30);
  const [scanDays, setScanDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState('ALL');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  if (!isOpen) return null;

  const handlePresetChange = (presetId) => {
    setActivePreset(presetId);
    const p = PRESETS.find(x => x.id === presetId);
    if (p) {
      setImapServer(p.server);
      setPort(p.port);
    }
    setTestResult(null);
    setScanResult(null);
  };

  const handleTestConnection = async () => {
    if (!email || !appPassword) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await apiFetch('/api/mailbox/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          app_password: appPassword.trim(),
          imap_server: imapServer.trim(),
          port: Number(port)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: 'Authentication successful! Connected to mailbox.' });
      } else {
        setTestResult({
          success: false,
          message: data.detail?.message || 'Connection failed. Please verify credentials.',
          hint: data.detail?.hint
        });
      }
    } catch (err) {
      setTestResult({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchRealEmails = async () => {
    if (!email || !appPassword) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await apiFetch('/api/mailbox/fetch-real-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          app_password: appPassword.trim(),
          imap_server: imapServer.trim(),
          port: Number(port),
          max_emails: Number(maxEmails),
          days: Number(scanDays),
          search_query: searchQuery
        })
      });

      const data = await res.json();
      if (res.ok) {
        setScanResult({ success: true, ...data });
        if (onSyncComplete) onSyncComplete();
      } else {
        setScanResult({
          success: false,
          message: data.detail?.message || 'Failed to scan mailbox.'
        });
      }
    } catch (err) {
      setScanResult({ success: false, message: `Scan error: ${err.message}` });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-black font-bold flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Connect Real College Mailbox</h2>
              <p className="text-xs text-neutral-400">Scan actual emails via secure IMAP SSL and extract deadlines directly</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Provider Preset Buttons */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
              Select Mail Service:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                    activePreset === p.id
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-[#121212] text-neutral-400 border-[#222222] hover:border-[#383838] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. adarsh@college.edu or name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  App Password / Mail Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>How to generate a Gmail App Password?</span>
                </button>
              </div>

              <div className="relative">
                <Key className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="16-character Google App Password (e.g. abcd efgh ijkl mnop)"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all font-mono"
                />
              </div>
            </div>

            {/* Help Accordion for Gmail */}
            {showHelp && (
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-xs space-y-2 text-neutral-300 animate-slide-down">
                <h4 className="font-bold text-white uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  30-Second Google App Password Guide:
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-neutral-400">
                  <li>Visit your Google Account settings: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-white underline">myaccount.google.com/security</a></li>
                  <li>Ensure <b>2-Step Verification</b> is turned ON.</li>
                  <li>Search for <b>"App Passwords"</b> in Google Account search.</li>
                  <li>Type an app name (e.g. <i>Deadline Tracker</i>) and click <b>Generate</b>.</li>
                  <li>Copy the 16-character code and paste it into the password box above.</li>
                </ol>
                <p className="text-[10px] text-neutral-500 italic">
                  Note: Your password is used only for direct IMAP connection and never stored insecurely.
                </p>
              </div>
            )}

            {/* Advanced IMAP Config & Timeframe */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">IMAP Server</label>
                <input
                  type="text"
                  value={imapServer}
                  onChange={(e) => setImapServer(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Port (SSL)</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Time Window</label>
                <select
                  value={scanDays}
                  onChange={(e) => setScanDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value={30}>Last 30 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={7}>Last 7 Days</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={0}>All Recent</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Max Emails</label>
                <select
                  value={maxEmails}
                  onChange={(e) => setMaxEmails(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value={15}>15 emails</option>
                  <option value={30}>30 emails</option>
                  <option value={50}>50 emails</option>
                  <option value={100}>100 emails</option>
                </select>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !email || !appPassword}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#171717] hover:bg-[#222222] text-neutral-200 border border-[#2c2c2c] hover:border-neutral-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleFetchRealEmails}
              disabled={isScanning || !email || !appPassword}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Mailbox with AI...' : 'Scan & Extract Real Deadlines'}</span>
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-slide-down ${
              testResult.success
                ? 'bg-[#0f1f14] border-[#1b4324] text-emerald-300'
                : 'bg-[#210f0f] border-[#431b1b] text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.hint && <p className="text-[11px] text-neutral-400">{testResult.hint}</p>}
              </div>
            </div>
          )}

          {/* Scan Results Summary */}
          {scanResult && (
            <div className="p-4 rounded-xl bg-[#111111] border border-[#262626] space-y-3 animate-slide-down">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Mailbox Scan Complete</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-bold">
                  {scanResult.actionable_found} Actionable Deadlines Added
                </span>
              </div>

              <p className="text-xs text-neutral-300">{scanResult.message}</p>

              {scanResult.processed_items && scanResult.processed_items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1f1f1f] max-h-48 overflow-y-auto pr-1">
                  <div className="text-[10px] uppercase font-bold text-neutral-500">Scanned Emails:</div>
                  {scanResult.processed_items.map((item, idx) => (
                    <div key={idx} className="p-2 bg-[#0a0a0a] rounded-lg border border-[#1f1f1f] text-xs flex items-center justify-between gap-2">
                      <div className="truncate flex-1">
                        <div className="font-medium text-white truncate">{item.subject}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{item.sender}</div>
                      </div>
                      {item.is_actionable ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                          Deadline Extracted
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-neutral-500 shrink-0">
                          No Deadline
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
