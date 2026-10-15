import { User, type IUser } from './user.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { revokeAllForUser } from '../auth/auth.service.js';

export async function getById(id: string): Promise<IUser> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<IUser, 'firstName' | 'lastName' | 'phone' | 'avatarUrl'>>,
): Promise<IUser> {
  // Note: role, isEmailVerified, isActive, passwordHash cannot be updated here.
  const allowed: Record<string, unknown> = {};
  if (updates.firstName !== undefined) allowed.firstName = updates.firstName;
  if (updates.lastName !== undefined) allowed.lastName = updates.lastName;
  if (updates.phone !== undefined) allowed.phone = updates.phone;
  if (updates.avatarUrl !== undefined) allowed.avatarUrl = updates.avatarUrl;

  const user = await User.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function deactivateAccount(id: string): Promise<void> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');
  user.isActive = false;
  user.deactivatedAt = new Date();
  await user.save();
  await revokeAllForUser(id);
}

export async function reactivateAccount(id: string): Promise<IUser> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('User not found');
  user.isActive = true;
  user.deactivatedAt = undefined;
  await user.save();
  return user;
}