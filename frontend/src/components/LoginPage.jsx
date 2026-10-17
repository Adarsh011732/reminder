import React, { useState } from 'react';
import StickAnimation from './StickAnimation';
import { Mail, Key, Sparkles, HelpCircle, ArrowRight, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

const PRESETS = [
  { id: 'gmail', label: 'Gmail / Workspace', server: 'imap.gmail.com', port: 993, placeholder: 'rollno@college.edu or name@gmail.com' },
  { id: 'outlook', label: 'Outlook / Office 365', server: 'outlook.office365.com', port: 993, placeholder: 'student@college.edu' },
  { id: 'custom', label: 'College IMAP', server: 'mail.college.edu', port: 993, placeholder: 'student@college.ac.in' },
];

export default function LoginPage({ onLoginSuccess, onGuestLogin }) {
  const [activePreset, setActivePreset] = useState('gmail');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [imapServer, setImapServer] = useState('imap.gmail.com');
  const [port, setPort] = useState(993);
  const [daysToScan, setDaysToScan] = useState(30);

  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const handlePresetChange = (presetId) => {
    setActivePreset(presetId);
    const p = PRESETS.find(x => x.id === presetId);
    if (p) {
      setImapServer(p.server);
      setPort(p.port);
    }
    setErrorMsg(null);
  };

  const handleConnectAndLogin = async (e) => {
    e.preventDefault();
    if (!email || !appPassword) {
      setErrorMsg('Please enter both your college email address and 16-character App Password.');
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);

    try {
      // 1. Instant credential validation via lightweight test (~300ms)
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

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}. Please ensure backend is running.`);
        }
      }

      if (res.ok && data.success) {
        const userData = {
          email: email.trim(),
          app_password: appPassword.trim(),
          imap_server: imapServer.trim(),
          port: Number(port),
          days: Number(daysToScan),
          connectedAt: new Date().toISOString()
        };
        localStorage.setItem('student_radar_user', JSON.stringify(userData));
        
        // Instant login transition
        onLoginSuccess(userData);

        // 2. Trigger mailbox scan asynchronously in background (academic filtered)
        const storedKey = (localStorage.getItem('student_radar_gemini_key') || '').trim();
        const scanHeaders = { 'Content-Type': 'application/json' };
        if (storedKey) {
          scanHeaders['x-gemini-key'] = storedKey;
        }

        apiFetch('/api/mailbox/fetch-real-emails', {
          method: 'POST',
          headers: scanHeaders,
          body: JSON.stringify({
            email: email.trim(),
            app_password: appPassword.trim(),
            imap_server: imapServer.trim(),
            port: Number(port),
            max_emails: 15,
            days: Number(daysToScan),
            search_query: 'ALL',
            gemini_api_key: storedKey || undefined
          })
        }).catch((scanErr) => console.error('Background mailbox sync error:', scanErr));

      } else {
        const msg = data?.detail?.message || data?.message || (data?.detail && typeof data.detail === 'string' ? data.detail : null) || 'Authentication failed. Please check your App Password or 2-Step Verification settings.';
        setErrorMsg(msg);
      }
    } catch (err) {
      setErrorMsg(`Connection error: ${err.message || 'Unable to reach backend service.'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDemoMode = () => {
    const demoUser = {
      email: 'student.demo@college.edu',
      app_password: '',
      imap_server: 'imap.gmail.com',
      port: 993,
      isDemo: true,
      connectedAt: new Date().toISOString()
    };
    localStorage.setItem('student_radar_user', JSON.stringify(demoUser));
    onGuestLogin(demoUser);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10 bg-black/80">
      
      {/* Main Expansive Monochrome Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-[#09090b] border border-[#222226] shadow-2xl overflow-hidden animate-fade-in relative z-10">
        
        {/* Left Side: Branding & Storyline */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-[#000000] border-b lg:border-b-0 lg:border-r border-[#1a1a1e] flex flex-col justify-between">
          
          <div>
            {/* Header / Brand */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white uppercase font-sans">
                  DEADLINE<span className="text-neutral-500">RADAR</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-white text-black">
                  PRO
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Autonomous College Notice &amp; Academic Deadline Radar
            </p>
          </div>

          {/* Interactive Storyline Animation */}
          <div className="my-6 py-2 flex items-center justify-center">
            <StickAnimation />
          </div>

          <div className="text-[11px] text-neutral-500 text-center">
            Privacy First &bull; Local Session Only
          </div>

        </div>

        {/* Right Side: Form Action Center */}
        <div className="lg:col-span-7 p-8 sm:p-10 bg-[#09090b] flex flex-col justify-center">
          
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1c1c20]">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Connect College Mailbox</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Scans official college circulars and extracts action dates</p>
              </div>
              <button
                type="button"
                onClick={handleDemoMode}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#141418] hover:bg-white hover:text-black text-neutral-300 border border-[#26262a] transition-all cursor-pointer flex items-center gap-1.5"
                title="Explore dashboard with mock data"
              >
                <span>Instant Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Provider Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                    activePreset === p.id
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#101014] text-neutral-400 border-[#202024] hover:border-[#38383e] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleConnectAndLogin} className="space-y-4">
              
              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  College / Student Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={PRESETS.find(p => p.id === activePreset)?.placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-[#101014] border border-[#222226] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors font-sans"
                  />
                </div>
              </div>

              {/* App Password with Show/Hide */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    16-Character App Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to get App Password?</span>
                  </button>
                </div>

                <div className="relative flex items-center">
                  <Key className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="abcd efgh ijkl mnop"
                    className="w-full pl-10 pr-10 py-3 bg-[#101014] border border-[#222226] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors font-mono tracking-wider"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Scan Time Horizon Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Mailbox Scan Horizon
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">Academic notices only</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: 'Last 7 Days' },
                    { days: 15, label: 'Last 15 Days' },
                    { days: 30, label: 'Last 30 Days (Recommended)' }
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setDaysToScan(option.days)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-center truncate ${
                        daysToScan === option.days
                          ? 'bg-[#1c1c22] text-white border-neutral-400 font-semibold'
                          : 'bg-[#101014] text-neutral-400 border-[#202024] hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom IMAP Settings (If custom preset selected) */}
              {activePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-slide-down">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">IMAP Server</label>
                    <input
                      type="text"
                      value={imapServer}
                      onChange={(e) => setImapServer(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101014] border border-[#222226] rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101014] border border-[#222226] rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* Help Box Guide */}
              {showHelp && (
                <div className="p-4 rounded-xl bg-[#101014] border border-[#242428] text-xs space-y-2 text-neutral-300 animate-slide-down">
                  <div className="flex items-center justify-between pb-1 border-b border-[#1e1e24]">
                    <p className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Google App Password Guide (30 Seconds):</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowHelp(false)}
                      className="text-neutral-400 hover:text-white text-xs"
                    >
                      &times;
                    </button>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-neutral-400">
                    <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-white underline font-semibold">myaccount.google.com/apppasswords</a> (ensure 2-Step Verification is active).</li>
                    <li>Type App Name: <code>Deadline Tracker</code> and click <b>Create</b>.</li>
                    <li>Copy the generated 16-character code and paste it directly above.</li>
                    <li className="text-neutral-500">Note: Your real Gmail password is never shared or stored.</li>
                  </ol>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 animate-slide-down">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Connecting & Verifying...' : 'Connect Mailbox & Launch Radar'}</span>
                </button>
              </div>

              {/* Footer Privacy Assurance */}
              <div className="pt-1 text-center">
                <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-neutral-400" />
                  <span>Only official academic circulars are ingested &bull; Zero spam</span>
                </p>
              </div>

            </form>
          </div>

        </div>

      </div>

    </div>
  );
}

