export const alliances = ['HEL', 'HLS', 'ZRO', 'MIT', 'Visitor'] as const;
export type Alliance = (typeof alliances)[number];

export const verificationStatuses = [
  'Draft',
  'Pending',
  'AutoApproved',
  'Approved',
  'Denied',
  'DuplicateRejected',
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export interface VerificationInput {
  ign: string;
  playerId: string;
  alliance: Alliance;
  inState3220: boolean;
  currentState?: string | undefined;
  notes?: string | undefined;
}
