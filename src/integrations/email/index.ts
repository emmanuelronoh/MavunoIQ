import { getEnv } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  name: string;
  isDemo: boolean;
  send(msg: EmailMessage): Promise<void>;
}

class DemoEmailProvider implements EmailProvider {
  name = 'demo';
  isDemo = true;
  async send(msg: EmailMessage) {
    logger.info(
      { to: msg.to, subject: msg.subject, preview: msg.text.slice(0, 120) },
      '[DemoEmail] Email would be sent here',
    );
  }
}

class ResendEmailProvider implements EmailProvider {
  name = 'resend';
  isDemo = false;
  constructor(private apiKey: string, private from: string) {}
  async send(msg: EmailMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error({ status: res.status, errText }, 'Resend email failed');
      throw new Error('Email provider failed');
    }
  }
}

function createEmailProvider(): EmailProvider {
  const env = getEnv();
  const provider = (env.EMAIL_PROVIDER || 'demo').toLowerCase();
  if (provider === 'resend' && env.EMAIL_API_KEY) {
    return new ResendEmailProvider(env.EMAIL_API_KEY, env.EMAIL_FROM);
  }
  return new DemoEmailProvider();
}

export const emailProvider: EmailProvider = createEmailProvider();