"use client";

import ReactMarkdown from "react-markdown";

type ContentBlockProps = Readonly<{
  content: string;
  blockNumber: number;
  blockId: string;
  auditPassed?: boolean | null;
  read?: boolean;
  onReadToggle?: (blockId: string, read: boolean) => void | Promise<void>;
}>;

export function ContentBlock({
  content,
  blockNumber,
  blockId,
  auditPassed,
  read = false,
  onReadToggle,
}: ContentBlockProps) {
  async function handleToggle() {
    if (!onReadToggle) return;
    const newRead = !read;
    await onReadToggle(blockId, newRead);
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">Block {blockNumber}</span>
        <div className="flex items-center gap-3">
          {onReadToggle && (
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={read}
                onChange={handleToggle}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-400 text-xs">Read</span>
            </label>
          )}
          {auditPassed === true && (
            <span className="text-emerald-400 text-xs">Verified</span>
          )}
          {auditPassed === false && (
            <span className="text-amber-400 text-xs">Review suggested</span>
          )}
        </div>
      </div>
      <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-slate-100">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
