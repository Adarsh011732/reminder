import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, CheckCircle2, ArrowRight, RefreshCw, FileCode, Check, AlertCircle, Code, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';
import { safeExternalUrl } from '../utils/safeUrl';

export default function EmailParserModal({ isOpen, onClose, onTaskCreated, sampleEmails }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [extractedResult, setExtractedResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Gemini API Key config (session-scoped, never persisted to disk)
  const [geminiKey, setGeminiKey] = useState(() => {
    try {
      return sessionStorage.getItem('student_radar_gemini_key') || '';
    } catch {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleKeyChange = (val) => {
    setGeminiKey(val);
    try {
      if (val.trim()) {
        sessionStorage.setItem('student_radar_gemini_key', val.trim());
      } else {
        sessionStorage.removeItem('student_radar_gemini_key');
      }
    } catch {}
  };

  const loadTemplate = (email) => {
    if (!email) return;
    setSelectedTemplate(email.id || '');
    setSubject(email.subject || '');
    setSender(email.sender || '');
    setBody(email.body || '');
    setExtractedResult(null);
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (sampleEmails && sampleEmails.length > 0 && !subject) {
      loadTemplate(sampleEmails[0]);
    }
  }, [sampleEmails]);

  if (!isOpen) return null;

  const extractionHref = extractedResult ? safeExternalUrl(extractedResult.primary_link) : null;

  const handleParse = async (autoSave = false) => {
    if (!subject || !body) return;
    setIsParsing(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (geminiKey.trim()) {
        headers['x-gemini-key'] = geminiKey.trim();
      }

      const response = await apiFetch(`/api/deadlines/parse-raw?auto_save=${autoSave}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject,
          sender: sender || 'unknown@college.edu',
          body,
          sent_at: new Date().toISOString(),
          gemini_api_key: geminiKey.trim() || undefined
        })
      });

      if (!response.ok) {
        let detail = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          const detailVal = errJson && errJson.detail;
          if (detailVal) detail = typeof detailVal === 'string' ? detailVal : (detailVal.message || detail);
        } catch {}
        throw new Error(detail);
      }

      const data = await response.json();
      if (data && data.extracted) {
        setExtractedResult(data.extracted);
        if (autoSave && data.saved_task) {
          setSaveSuccess(true);
          onTaskCreated(data.saved_task);
        }
      } else {
        throw new Error(data?.detail || 'No extraction payload returned.');
      }
    } catch (err) {
      console.error('Extraction failed:', err);
      setErrorMessage(err.message || 'Unable to connect to AI parsing service. Please ensure backend is running.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0a0a0c] border border-[#26262a] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1c1c20] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-black font-bold flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Notice Extractor &amp; Simulator</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Dual-Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400">Google Gemini 1.5 Flash LLM with instant heuristic regex fallback</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1e] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Gemini API Key Configuration Accordion */}
          <div className="p-3.5 rounded-2xl bg-[#111114] border border-[#222226]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">Google Gemini API Key:</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${geminiKey ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-900 text-neutral-400'}`}>
                  {geminiKey ? 'Custom Key Set' : 'Using Server Default / Fallback'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showKeyInput ? 'Hide' : 'Configure Key'}</span>
                {showKeyInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showKeyInput && (
              <div className="mt-3 pt-3 border-t border-[#202024] space-y-2 animate-fade-in">
                <p className="text-[11px] text-neutral-400">
                  Enter your Google AI Studio key to test advanced LLM reasoning directly from your browser:
                </p>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="Paste AIzaSy... key (optional)"
                  className="w-full px-3.5 py-2 bg-[#09090b] border border-[#26262a] rounded-xl text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
                />
              </div>
            )}
          </div>

          {/* Preset Scenarios */}
          <div>
            <label className="block text-xs uppercase font-bold tracking-wider text-neutral-400 mb-2">
              Select Preset College Scenario:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sampleEmails?.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadTemplate(item)}
                  className={`p-2.5 text-left rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedTemplate === item.id
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-[#121216] border-[#222226] text-neutral-400 hover:text-white hover:border-[#383838]'
                  }`}
                >
                  <div className="truncate">{item.subject.split('-')[0].replace('CRITICAL: ', '')}</div>
                  <div className={`text-[10px] truncate mt-0.5 ${selectedTemplate === item.id ? 'text-neutral-700' : 'text-neutral-500'}`}>
                    {item.sender.split('<')[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Placement Drive Registration Form"
                className="w-full px-3.5 py-2.5 bg-[#121216] border border-[#26262a] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Sender Cell / Address</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Placement Cell <placement@college.edu>"
                className="w-full px-3.5 py-2.5 bg-[#121216] border border-[#26262a] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Raw Email Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste email text here..."
              className="w-full p-3.5 bg-[#121216] border border-[#26262a] rounded-xl text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white leading-relaxed"
            />
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleParse(false)}
                disabled={isParsing || !subject || !body}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#141418] hover:bg-[#202026] text-neutral-200 border border-[#2c2c34] hover:border-neutral-400 transition-all cursor-pointer disabled:opacity-50"
              >
                <Code className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isParsing ? 'Processing...' : 'Preview JSON Extraction'}</span>
              </button>

              <button
                onClick={() => handleParse(true)}
                disabled={isParsing || !subject || !body}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                <span>{isParsing ? 'Extracting...' : 'Extract & Add to Tracker'}</span>
              </button>
            </div>

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-slide-down">
                <Check className="w-4 h-4" />
                Task parsed and added to active board!
              </span>
            )}
          </div>

          {/* Extracted Result Inspector */}
          {extractedResult && (
            <div className="mt-4 p-4 rounded-2xl bg-[#09090b] border border-[#222226] space-y-3 animate-slide-down">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Schema Extraction Result</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Engine Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    extractedResult.is_ai
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-sky-950 text-sky-400 border-sky-800'
                  }`}>
                    {extractedResult.engine || (extractedResult.is_ai ? 'Google Gemini 1.5 Flash' : 'Heuristic Engine')}
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18181f] text-neutral-300 border border-[#303038]">
                    Confidence: {Math.round((extractedResult.confidence || 0.95) * 100)}%
                  </span>
                </div>
              </div>

              {/* Grid Values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-[#121216] rounded-xl border border-[#1f1f26]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Category</div>
                  <div className="font-bold text-white capitalize">{extractedResult.category}</div>
                </div>
                <div className="p-2.5 bg-[#121216] rounded-xl border border-[#1f1f26]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Detected Deadline</div>
                  <div className="font-bold text-white truncate">{extractedResult.deadline_text_raw || 'No date found'}</div>
                </div>
                <div className="p-2.5 bg-[#121216] rounded-xl border border-[#1f1f26]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Action Directive</div>
                  <div className="font-bold text-white truncate">{extractedResult.action_required}</div>
                </div>
              </div>

              {/* Action Link */}
              {extractionHref && (
                <div className="p-2.5 bg-[#121216] rounded-xl border border-[#1f1f26] text-xs flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Extracted Action Link:</span>
                  <a
                    href={extractionHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white underline font-mono truncate max-w-sm"
                  >
                    {extractedResult.primary_link}
                  </a>
                </div>
              )}

              {/* JSON code block */}
              <div className="pt-2">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">JSON Payload:</div>
                <pre className="p-3 bg-[#050505] rounded-xl text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-40 border border-[#1a1a20]">
                  {JSON.stringify(extractedResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
