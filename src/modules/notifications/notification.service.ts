import { Notification } from './notification.model.js';
import { logger } from '../../config/logger.js';
import { emailProvider } from '../../integrations/email/index.js';
import { User } from '../users/user.model.js';

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sendEmail?: boolean;
}) {
  try {
    await Notification.create({
      user: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
    });

    if (input.sendEmail) {
      const user = await User.findById(input.userId);
      if (user?.email) {
        await emailProvider.send({
          to: user.email,
          subject: input.title,
          text: input.body,
        });
      }
    }
  } catch (err) {
    logger.error({ err, input }, 'Failed to create notification');
  }
}