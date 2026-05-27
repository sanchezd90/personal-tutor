export function blockAnchorId(blockIndex: number): string {
  return `block-${blockIndex + 1}`;
}

export function lessonBlockHref(lessonId: string, blockIndex: number): string {
  return `/lesson/${lessonId}#${blockAnchorId(blockIndex)}`;
}

export function parseBlockIndexFromHash(hash: string): number | null {
  const match = /^block-(\d+)$/.exec(hash.replace(/^#/, ""));
  if (!match) return null;
  const blockNumber = Number.parseInt(match[1], 10);
  if (Number.isNaN(blockNumber) || blockNumber < 1) return null;
  return blockNumber - 1;
}
