import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, CheckCircle2, ArrowRight, RefreshCw, FileCode, Check, AlertCircle, Code } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

export default function EmailParserModal({ isOpen, onClose, onTaskCreated, sampleEmails }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [extractedResult, setExtractedResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadTemplate = (email) => {
    if (!email) return;
    setSelectedTemplate(email.id || '');
    setSubject(email.subject || '');
    setSender(email.sender || '');
    setBody(email.body || '');
    setExtractedResult(null);
    setSaveSuccess(false);
  };

  useEffect(() => {
    if (sampleEmails && sampleEmails.length > 0 && !subject) {
      loadTemplate(sampleEmails[0]);
    }
  }, [sampleEmails]);

  if (!isOpen) return null;

  const handleParse = async (autoSave = false) => {
    if (!subject || !body) return;
    setIsParsing(true);
    setSaveSuccess(false);

    try {
      const response = await apiFetch(`/api/deadlines/parse-raw?auto_save=${autoSave}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          sender: sender || 'unknown@college.edu',
          body,
          sent_at: new Date().toISOString()
        })
      });

      const data = await response.json();
      setExtractedResult(data.extracted);

      if (autoSave && data.saved_task) {
        setSaveSuccess(true);
        onTaskCreated(data.saved_task);
      }
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0a0a0a] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-black font-bold flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">AI Email Parsing Playground</h2>
              <p className="text-xs text-neutral-400">Simulate unstructured email ingestion & verified JSON schema extraction</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1a1a1a] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
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
                      : 'bg-[#121212] border-[#222222] text-neutral-400 hover:text-white hover:border-[#383838]'
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
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Sender Cell / Address</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Placement Cell <placement@college.edu>"
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Raw Email Body</label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste email text here..."
              className="w-full p-3.5 bg-[#121212] border border-[#262626] rounded-xl text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white leading-relaxed"
            />
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleParse(false)}
                disabled={isParsing || !subject || !body}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#141414] hover:bg-[#202020] text-neutral-200 border border-[#2c2c2c] hover:border-neutral-400 transition-all cursor-pointer disabled:opacity-50"
              >
                <Code className="w-3.5 h-3.5 text-neutral-400" />
                <span>Preview JSON Extraction</span>
              </button>

              <button
                onClick={() => handleParse(true)}
                disabled={isParsing || !subject || !body}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                <span>Extract & Add to Tracker</span>
              </button>
            </div>

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-slide-down">
                <Check className="w-4 h-4" />
                Task parsed and added to active board!
              </span>
            )}
          </div>

          {/* Extracted JSON Inspector */}
          {extractedResult && (
            <div className="mt-4 p-4 rounded-xl bg-[#050505] border border-[#222222] space-y-3 animate-slide-down">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">AI Schema Extraction Result</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181818] text-neutral-300 border border-[#303030]">
                  Confidence: {Math.round(extractedResult.confidence * 100)}%
                </span>
              </div>

              {/* Grid Values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-[#101010] rounded-lg border border-[#1f1f1f]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Category</div>
                  <div className="font-bold text-white capitalize">{extractedResult.category}</div>
                </div>
                <div className="p-2.5 bg-[#101010] rounded-lg border border-[#1f1f1f]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Detected Deadline</div>
                  <div className="font-bold text-white truncate">{extractedResult.deadline_text_raw || 'No date found'}</div>
                </div>
                <div className="p-2.5 bg-[#101010] rounded-lg border border-[#1f1f1f]">
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">Action Required</div>
                  <div className="font-bold text-white truncate">{extractedResult.action_required}</div>
                </div>
              </div>

              {/* Action Link */}
              {extractedResult.primary_link && (
                <div className="p-2.5 bg-[#101010] rounded-lg border border-[#1f1f1f] text-xs flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Extracted Action Link:</span>
                  <a
                    href={extractedResult.primary_link}
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
                <pre className="p-3 bg-[#000000] rounded-lg text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-40 border border-[#1a1a1a]">
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
