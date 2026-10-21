import React from 'react';
import { ShieldAlert, ExternalLink, Check, Clock, AlertTriangle } from 'lucide-react';
import { safeExternalUrl } from '../utils/safeUrl';

export default function MandatoryDirectivesSection({ mandatoryTasks = [], onAction }) {
  if (!mandatoryTasks || mandatoryTasks.length === 0) return null;

  return (
    <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-[#0d0d0d] border-2 border-white/20 shadow-2xl relative overflow-hidden">
      
      {/* Background Warning Mesh */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white text-black font-black flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                Mandatory College Compliance Directives
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 uppercase tracking-wider">
                Required for Hall Ticket / Exams
              </span>
            </div>
            <p className="text-xs text-neutral-400">Official college notices requiring mandatory 100% completion by all students</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-neutral-400 px-3 py-1 rounded-lg bg-[#161616] border border-[#282828] self-start sm:self-auto">
          {mandatoryTasks.length} Active Directive{mandatoryTasks.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid of Mandatory Directives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {mandatoryTasks.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-xl bg-[#050505] border border-[#262626] hover:border-white/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400">
                  <span className="w-2 h-2 rounded-full pip-red"></span>
                  <span>MANDATORY ACTION</span>
                </span>
                {task.deadline_text_raw && (
                  <span className="text-[11px] font-mono text-neutral-300 bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                    Due: {task.deadline_text_raw}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-white mb-1.5 leading-snug">
                {task.title}
              </h4>
              <p className="text-xs text-neutral-300 font-medium mb-3">
                {task.action_required}
              </p>
            </div>

            <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between gap-2 mt-auto">
              {safeExternalUrl(task.primary_link) ? (
                <a
                  href={safeExternalUrl(task.primary_link)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-sm"
                >
                  <span>Open Official Form</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-neutral-500 italic">Check ERP portal</span>
              )}

              <button
                onClick={() => onAction(task.id, 'done')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#141414] hover:bg-white hover:text-black text-neutral-200 border border-[#2a2a2a] transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Submitted</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
