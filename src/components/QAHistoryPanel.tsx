"use client";

import { useEffect, useState } from "react";

type QAItem = {
  questionId: string;
  question: string;
  answer: string;
  lessonTitle: string;
  blockIndex: number;
};

type QAHistoryPanelProps = {
  syllabusId: string;
  onClose?: () => void;
};

export function QAHistoryPanel({ syllabusId, onClose }: QAHistoryPanelProps) {
  const [items, setItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/syllabus/${syllabusId}/qa-history`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data ?? []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [syllabusId]);

  return (
    <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="px-4 py-3 font-semibold text-slate-200 bg-slate-800/80 flex justify-between items-center">
        <span>Q&A History</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Close
          </button>
        )}
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-400 text-sm">No questions yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.questionId}
                className="border-l-2 border-emerald-500/50 pl-4 py-2"
              >
                <p className="text-slate-400 text-xs mb-1">
                  {item.lessonTitle} - Block {item.blockIndex + 1}
                </p>
                <p className="text-slate-200 font-medium">{item.question}</p>
                <p className="text-slate-300 text-sm mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
