import { getEnv } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/errors/AppError.js';
import crypto from 'node:crypto';

export interface STKPushRequest {
  phone: string;
  amountCents: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
}

export interface STKPushResult {
  provider: string;
  isDemo: boolean;
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface CallbackResult {
  merchantRequestId?: string;
  checkoutRequestId?: string;
  resultCode: number;
  resultDesc: string;
  amountCents?: number;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  isDemo: boolean;
  initiateSTKPush(req: STKPushRequest): Promise<STKPushResult>;
  parseCallback(body: unknown): CallbackResult;
}

class DemoPaymentProvider implements PaymentProvider {
  name = 'demo';
  isDemo = true;
  async initiateSTKPush(req: STKPushRequest): Promise<STKPushResult> {
    const id = 'demo-' + crypto.randomBytes(6).toString('hex');
    logger.info(
      { phone: req.phone, amountCents: req.amountCents, ref: req.accountReference },
      '[DemoPayment] STK push simulated',
    );
    return {
      provider: 'demo',
      isDemo: true,
      merchantRequestId: 'demo-mr-' + id,
      checkoutRequestId: 'demo-cr-' + id,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing (DEMO)',
      customerMessage: 'DEMO: Enter your M-Pesa PIN to complete payment',
    };
  }

  parseCallback(body: unknown): CallbackResult {
    const b = body as { Body?: { stkCallback?: Record<string, unknown> } };
    const cb = b.Body?.stkCallback ?? {};
    return {
      merchantRequestId: cb.MerchantRequestID as string | undefined,
      checkoutRequestId: cb.CheckoutRequestID as string | undefined,
      resultCode: Number(cb.ResultCode ?? 0),
      resultDesc: (cb.ResultDesc as string) ?? 'Demo callback',
      raw: cb,
    };
  }
}

class MpesaPaymentProvider implements PaymentProvider {
  name = 'mpesa';
  isDemo = false;
  constructor(
    private env: 'sandbox' | 'production',
    private consumerKey: string,
    private consumerSecret: string,
    private shortcode: string,
    private passkey: string,
    private callbackUrl: string,
  ) {}

  private baseUrl() {
    return this.env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw AppError.provider('M-Pesa auth failed');
    const json = (await res.json()) as { access_token: string };
    return json.access_token;
  }

  async initiateSTKPush(req: STKPushRequest): Promise<STKPushResult> {
    const token = await this.getAccessToken();
    const ts = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${ts}`).toString('base64');
    const amount = Math.max(1, Math.ceil(req.amountCents / 100));

    const res = await fetch(`${this.baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: req.phone,
        PartyB: this.shortcode,
        PhoneNumber: req.phone,
        CallBackURL: req.callbackUrl || this.callbackUrl,
        AccountReference: req.accountReference.slice(0, 12),
        TransactionDesc: req.transactionDesc.slice(0, 100),
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      logger.error({ status: res.status, err }, 'M-Pesa STK push failed');
      throw AppError.provider('M-Pesa STK push failed');
    }
    const json = (await res.json()) as Record<string, string>;
    return {
      provider: 'mpesa',
      isDemo: false,
      merchantRequestId: json.MerchantRequestID,
      checkoutRequestId: json.CheckoutRequestID,
      responseCode: json.ResponseCode,
      responseDescription: json.ResponseDescription,
      customerMessage: json.CustomerMessage,
    };
  }

  parseCallback(body: unknown): CallbackResult {
    const b = body as { Body?: { stkCallback?: Record<string, unknown> } };
    const cb = b.Body?.stkCallback ?? {};
    const items = (cb.CallbackMetadata as { Item?: Array<{ Name: string; Value: unknown }> })?.Item ?? [];
    const findVal = (n: string) => items.find((i) => i.Name === n)?.Value;
    return {
      merchantRequestId: cb.MerchantRequestID as string | undefined,
      checkoutRequestId: cb.CheckoutRequestID as string | undefined,
      resultCode: Number(cb.ResultCode ?? -1),
      resultDesc: (cb.ResultDesc as string) ?? '',
      amountCents: findVal('Amount') ? Number(findVal('Amount')) * 100 : undefined,
      mpesaReceiptNumber: findVal('MpesaReceiptNumber') as string | undefined,
      phoneNumber: findVal('PhoneNumber') as string | undefined,
      raw: cb,
    };
  }
}

function createPaymentProvider(): PaymentProvider {
  const env = getEnv();
  const provider = (env.PAYMENT_PROVIDER || 'demo').toLowerCase();
  if (
    provider === 'mpesa' &&
    env.MPESA_CONSUMER_KEY &&
    env.MPESA_CONSUMER_SECRET &&
    env.MPESA_SHORTCODE &&
    env.MPESA_PASSKEY
  ) {
    return new MpesaPaymentProvider(
      env.MPESA_ENVIRONMENT,
      env.MPESA_CONSUMER_KEY,
      env.MPESA_CONSUMER_SECRET,
      env.MPESA_SHORTCODE,
      env.MPESA_PASSKEY,
      env.MPESA_CALLBACK_URL,
    );
  }
  return new DemoPaymentProvider();
}

export const paymentProvider: PaymentProvider = createPaymentProvider();