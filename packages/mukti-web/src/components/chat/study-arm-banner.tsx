'use client';

import type { Conversation } from '@/types/conversation.types';

export function StudyArmBanner({ arm }: { arm: Conversation['studyArm'] }) {
  if (!arm) {
    return null;
  }
  return (
    <aside
      aria-label="Study arm"
      className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      This conversation uses the <strong>{arm.name}</strong> study arm, not Mukti&apos;s engine.
      Help controls are unavailable.
    </aside>
  );
}
