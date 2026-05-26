/** First block per lesson is always auto-audited; others only if they look fact-heavy. */
export function shouldAutoAudit(blockIndex: number, content: string): boolean {
  if (blockIndex === 0) return true;

  const factualPattern =
    /\b\d{4}\b|\b\d+%\b|\b\d+\.\d+\b|\b(study|studies|research|medical|disease|treatment|theorem|proved|according to|evidence|clinical|trial)\b/i;

  return factualPattern.test(content);
}
