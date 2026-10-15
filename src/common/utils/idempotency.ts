import mongoose from 'mongoose';

const idempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    scope: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    response: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencySchema);

export async function withIdempotency<T>(
  key: string | undefined,
  scope: string,
  userId: string | undefined,
  fn: () => Promise<T>,
): Promise<{ data: T; replayed: boolean }> {
  if (!key) {
    return { data: await fn(), replayed: false };
  }

  const existing = await IdempotencyKey.findOne({ key, scope });
  if (existing) {
    if (existing.status === 'completed') {
      return { data: existing.response as T, replayed: true };
    }
    if (existing.status === 'pending') {
      throw new Error('Request is already being processed');
    }
  }

  await IdempotencyKey.create({
    key,
    scope,
    userId,
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  try {
    const data = await fn();
    await IdempotencyKey.updateOne(
      { key, scope },
      { status: 'completed', response: data },
    );
    return { data, replayed: false };
  } catch (err) {
    await IdempotencyKey.updateOne({ key, scope }, { status: 'failed' });
    throw err;
  }
}