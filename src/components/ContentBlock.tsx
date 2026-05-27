"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdownForRender } from "@/lib/markdown/normalize";
import { QASidebar } from "@/components/QASidebar";

type ContentBlockProps = Readonly<{
  content: string;
  blockNumber: number;
  title?: string | null;
  blockId: string;
  auditPassed?: boolean | null;
  read?: boolean;
  onReadToggle?: (blockId: string, read: boolean) => void | Promise<void>;
}>;

export function ContentBlock({
  content,
  blockNumber,
  title,
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
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 mb-6 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            {title ? (
              <h2 className="text-slate-100 font-medium">{title}</h2>
            ) : null}
            <span className="text-slate-400 text-sm">Block {blockNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            {auditPassed === true && (
              <span className="text-emerald-400 text-xs">Verified</span>
            )}
            {auditPassed === false && (
              <span className="text-amber-400 text-xs">Review suggested</span>
            )}
          </div>
        </div>
        <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-table:text-slate-300 prose-th:text-slate-200 prose-td:border-slate-600 prose-th:border-slate-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {normalizeMarkdownForRender(content)}
          </ReactMarkdown>
        </div>
        {onReadToggle && (
          <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
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
          </div>
        )}
      </div>
      <QASidebar contentBlockId={blockId} />
    </div>
  );
}
