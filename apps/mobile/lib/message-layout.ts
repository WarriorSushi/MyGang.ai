const MAX_BUBBLE_WIDTH = 560;

export function getMessageBubbleMaxWidth(
  viewportWidth: number,
  isUser: boolean,
): number {
  const safeViewportWidth = Math.max(0, viewportWidth);
  const viewportRatio = isUser ? 0.8 : 0.78;
  return Math.min(safeViewportWidth * viewportRatio, MAX_BUBBLE_WIDTH);
}
