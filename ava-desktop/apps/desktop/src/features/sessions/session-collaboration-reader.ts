/**
 * Session collaboration reader stub.
 *
 * The session.collaboration.* host methods have no ava-core equivalent and were
 * removed. This stub keeps SessionHoverCard renderable; it immediately reports
 * the collaboration summary as unavailable.
 */
export function observeSessionCollaboration({
  onUnavailable,
}: {
  sessionId: string;
  isVisible: () => boolean;
  onSummary: (summary: any) => void;
  onUnavailable: () => void;
}): () => void {
  onUnavailable();
  return () => {};
}
