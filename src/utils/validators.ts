import { UserFacingError } from './errors.js';
import { alliances, type Alliance } from '../types.js';

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateIgn(value: string): string {
  const ign = normalizeText(value);
  if (ign.length < 2 || ign.length > 32) {
    throw new UserFacingError('IGN must be between 2 and 32 characters.');
  }

  return ign;
}

export function validatePlayerId(value: string): string {
  const playerId = normalizeText(value);
  if (!/^\d{5,20}$/.test(playerId)) {
    throw new UserFacingError('Player ID must contain 5 to 20 digits.');
  }

  return playerId;
}

export function validateAlliance(value: string): Alliance {
  const normalized = normalizeText(value).toUpperCase();
  const found = alliances.find((alliance) => alliance.toUpperCase() === normalized);

  if (!found) {
    throw new UserFacingError('Alliance must be one of HEL, HLS, ZRO, MIT, or Visitor.');
  }

  return found;
}

export function validateBooleanChoice(value: boolean | string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(normalized)) {
    return true;
  }

  if (['no', 'n', 'false', '0'].includes(normalized)) {
    return false;
  }

  throw new UserFacingError('State 3220 must be Yes or No.');
}

export function validateCurrentState(value: string | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    return undefined;
  }

  if (!/^\d{3,5}$/.test(normalized)) {
    throw new UserFacingError('Current State must contain 3 to 5 digits.');
  }

  return normalized;
}

export function validateNotes(value: string | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : undefined;
}
