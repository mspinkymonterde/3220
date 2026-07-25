import type { GuildMember } from 'discord.js';
import { config } from '../config.js';

export function hasModeratorAccess(member: GuildMember | null): boolean {
  if (!member) {
    return false;
  }

  if (member.guild.ownerId === member.id) {
    return true;
  }

  return [...config.ownerRoleIds, ...config.moderatorRoleIds].some((roleId) => member.roles.cache.has(roleId));
}
