"use client";

import ReactMarkdown from "react-markdown";

type ContentBlockProps = {
  content: string;
  blockIndex: number;
  onAudit?: (blockId: string) => void;
  blockId?: string;
  auditPassed?: boolean | null;
};

export function ContentBlock({
  content,
  blockIndex,
  onAudit,
  blockId,
  auditPassed,
}: ContentBlockProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">Block {blockIndex + 1}</span>
        {onAudit && blockId && (
          <div className="flex items-center gap-2">
            {auditPassed === true && (
              <span className="text-emerald-400 text-xs">Verified</span>
            )}
            {auditPassed === false && (
              <span className="text-amber-400 text-xs">Review suggested</span>
            )}
            <button
              onClick={() => onAudit(blockId)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Verify
            </button>
          </div>
        )}
      </div>
      <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-slate-100">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
