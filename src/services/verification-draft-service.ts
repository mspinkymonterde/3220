import { prisma } from '../db.js';
import type { Alliance } from '../types.js';

const draftPrefix = 'verification_draft:';

export interface VerificationDraft {
  alliance?: Alliance;
  inState3220?: boolean;
}

function draftKey(userId: string): string {
  return `${draftPrefix}${userId}`;
}

export async function saveVerificationDraft(userId: string, draft: VerificationDraft): Promise<VerificationDraft> {
  const existing = await loadVerificationDraft(userId);
  const next = {
    ...existing,
    ...draft,
  };

  await prisma.botSetting.upsert({
    where: { key: draftKey(userId) },
    create: { key: draftKey(userId), value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });

  return next;
}

export async function loadVerificationDraft(userId: string): Promise<VerificationDraft | null> {
  const record = await prisma.botSetting.findUnique({ where: { key: draftKey(userId) } });
  if (!record) {
    return null;
  }

  try {
    return JSON.parse(record.value) as VerificationDraft;
  } catch {
    return null;
  }
}

export async function clearVerificationDraft(userId: string): Promise<void> {
  await prisma.botSetting.deleteMany({ where: { key: draftKey(userId) } });
}
