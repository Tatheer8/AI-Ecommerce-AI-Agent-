import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface RefundEmailParams {
  toEmail: string;
  customerName: string;
  orderId: string;
  productName: string;
  amount?: number | string;
  refundMethod?: string;
  notes?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    mobileNumber?: string;
  };
}

export interface OrderEmailParams {
  toEmail: string;
  customerName: string;
  orderId: string;
  productName: string;
  amount: number | string;
  status?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'resend' | 'nodemailer' | 'simulated';
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

/**
 * Generates an HTML email template for refund confirmations.
 */
function buildRefundHtmlEmail(params: RefundEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Refund Approved - NexusTech Store</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 24px; color: #333; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 28px; text-align: center; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; color: #94a3b8; font-size: 14px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .table td:first-child { color: #64748b; font-weight: 500; width: 40%; }
    .table td:last-child { color: #0f172a; font-weight: 600; }
    .notice { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #475569; line-height: 1.5; margin: 24px 0; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>NexusTech Customer Support</h1>
      <p>Automated Return & Refund Notification</p>
    </div>
    <div class="content">
      <span class="badge">&#10003; Return & Refund Approved</span>
      <p>Dear <strong>${params.customerName}</strong>,</p>
      <p>Good news! Your return and refund request has been verified against our store policy and officially <strong>approved</strong>.</p>
      
      <table class="table">
        <tr>
          <td>Order Number:</td>
          <td>${params.orderId}</td>
        </tr>
        <tr>
          <td>Product:</td>
          <td>${params.productName}</td>
        </tr>
        ${params.amount ? `<tr><td>Refund Amount:</td><td>$${params.amount}</td></tr>` : ''}
        <tr>
          <td>Processing Timeframe:</td>
          <td>5 business days</td>
        </tr>
        ${
          params.bankDetails
            ? `
        <tr>
          <td>Payout Bank:</td>
          <td>${params.bankDetails.bankName}</td>
        </tr>
        <tr>
          <td>Account Number:</td>
          <td>${params.bankDetails.accountNumber}</td>
        </tr>
        ${params.bankDetails.mobileNumber ? `<tr><td>Mobile Number:</td><td>${params.bankDetails.mobileNumber}</td></tr>` : ''}
        `
            : `
        <tr>
          <td>Refund Destination:</td>
          <td>Original payment method${params.refundMethod ? ` (${params.refundMethod})` : ''}</td>
        </tr>
        `
        }
      </table>

      <div class="notice">
        <strong>Return & Payout Details:</strong><br>
        Your banking records have been registered in our financial reconciliation sheet (Sheet3). Payout will be issued directly to your specified account within 5 business days. Please ensure items are returned in original packaging.
      </div>

      <p style="font-size: 13px; color: #64748b;">If you have any questions, reply to this email or contact support at <strong>support@nexustech.com</strong> or call <strong>1-800-NEXUSTECH</strong>.</p>
    </div>
    <div class="footer">
      NexusTech Online Store &copy; ${new Date().getFullYear()} — All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates an HTML email template for new order confirmations.
 */
function buildOrderHtmlEmail(params: OrderEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmed - NexusTech Store</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 24px; color: #333; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 28px; text-align: center; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; color: #94a3b8; font-size: 14px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; background: #dbeafe; color: #1d4ed8; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .table td:first-child { color: #64748b; font-weight: 500; width: 40%; }
    .table td:last-child { color: #0f172a; font-weight: 600; }
    .notice { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #166534; line-height: 1.5; margin: 24px 0; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>NexusTech Store</h1>
      <p>Order Confirmation & Receipt</p>
    </div>
    <div class="content">
      <span class="badge">&#10003; Order Confirmed & Logged</span>
      <p>Dear <strong>${params.customerName}</strong>,</p>
      <p>Thank you for shopping with NexusTech! Your order has been placed and registered into our order fulfillment database (Sheet2).</p>
      
      <table class="table">
        <tr>
          <td>Order ID:</td>
          <td><strong>#${params.orderId}</strong></td>
        </tr>
        <tr>
          <td>Item:</td>
          <td>${params.productName}</td>
        </tr>
        <tr>
          <td>Total Price:</td>
          <td>$${params.amount}</td>
        </tr>
        <tr>
          <td>Status:</td>
          <td>${params.status || 'Confirmed / Processing'}</td>
        </tr>
        <tr>
          <td>Estimated Delivery:</td>
          <td>2–3 Business Days</td>
        </tr>
      </table>

      <div class="notice">
        <strong>Return Policy Notice:</strong><br>
        Electronics may be returned within 15 days of delivery. Keep this order number handy if you ever need support.
      </div>
    </div>
    <div class="footer">
      NexusTech Online Store &copy; ${new Date().getFullYear()} — All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends a refund confirmation email to the customer.
 * - Uses Resend if RESEND_API_KEY is configured.
 * - Uses Nodemailer if SMTP credentials are provided.
 * - Otherwise falls back to simulated email delivery with local file inspection.
 */
export async function sendRefundConfirmationEmail(
  params: RefundEmailParams
): Promise<SendEmailResult> {
  const subject = `[NexusTech] Refund Approved for Order #${params.orderId}`;
  const html = buildRefundHtmlEmail(params);
  const text = `Dear ${params.customerName},\n\nYour return and refund for Order #${params.orderId} (${params.productName}) has been approved!\nRefunds are processed within 5 business days to your original payment method.\n\nThank you,\nNexusTech Customer Support`;

  // 1. Try Resend if API key is present
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes('your_resend_api_key')) {
    try {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const data = await resend.emails.send({
        from: `NexusTech Support <${fromEmail}>`,
        to: params.toEmail,
        subject,
        html,
        text,
      });

      return {
        success: true,
        provider: 'resend',
        messageId: data.data?.id || undefined,
      };
    } catch (err: any) {
      console.warn('Resend failed; attempting fallback:', err.message);
    }
  }

  // 2. Try Nodemailer SMTP if configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"NexusTech Support" <${smtpUser}>`,
        to: params.toEmail,
        subject,
        text,
        html,
      });

      return {
        success: true,
        provider: 'nodemailer',
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.warn('Nodemailer SMTP failed; falling back to simulated mail:', err.message);
    }
  }

  // 3. Simulated Delivery Mode (Safe offline & development fallback)
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const emailLogFile = path.join(logsDir, 'sent_emails.json');
  let emailLogs: any[] = [];
  if (fs.existsSync(emailLogFile)) {
    try {
      emailLogs = JSON.parse(fs.readFileSync(emailLogFile, 'utf8'));
    } catch {
      emailLogs = [];
    }
  }

  const simulatedRecord = {
    timestamp: new Date().toISOString(),
    to: params.toEmail,
    subject,
    customerName: params.customerName,
    orderId: params.orderId,
    productName: params.productName,
    amount: params.amount,
    provider: 'simulated',
    status: 'SENT (Simulated)',
  };

  emailLogs.push(simulatedRecord);
  fs.writeFileSync(emailLogFile, JSON.stringify(emailLogs, null, 2), 'utf8');

  console.log(`[EMAIL DISPATCHED - SIMULATED] Confirmation sent to ${params.toEmail} for Order ${params.orderId}`);

  return {
    success: true,
    provider: 'simulated',
    messageId: `sim-${Date.now()}-${params.orderId}`,
  };
}

/**
 * Sends an order confirmation email to the customer.
 */
export async function sendOrderConfirmationEmail(
  params: OrderEmailParams
): Promise<SendEmailResult> {
  const subject = `[NexusTech] Order Confirmed: #${params.orderId}`;
  const html = buildOrderHtmlEmail(params);
  const text = `Dear ${params.customerName},\n\nThank you for ordering with NexusTech! Your order #${params.orderId} for "${params.productName}" ($${params.amount}) is confirmed and logged in our system.\n\nNexusTech Store`;

  // 1. Try Resend if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes('your_resend_api_key')) {
    try {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const data = await resend.emails.send({
        from: `NexusTech Orders <${fromEmail}>`,
        to: params.toEmail,
        subject,
        html,
        text,
      });

      return {
        success: true,
        provider: 'resend',
        messageId: data.data?.id || undefined,
      };
    } catch (err: any) {
      console.warn('Resend failed for order email; falling back:', err.message);
    }
  }

  // 2. Try Nodemailer SMTP if configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: `"NexusTech Orders" <${smtpUser}>`,
        to: params.toEmail,
        subject,
        text,
        html,
      });

      return {
        success: true,
        provider: 'nodemailer',
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.warn('Nodemailer SMTP failed for order email:', err.message);
    }
  }

  // 3. Simulated Delivery Mode
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const emailLogFile = path.join(logsDir, 'sent_emails.json');
  let emailLogs: any[] = [];
  if (fs.existsSync(emailLogFile)) {
    try {
      emailLogs = JSON.parse(fs.readFileSync(emailLogFile, 'utf8'));
    } catch {
      emailLogs = [];
    }
  }

  const simulatedRecord = {
    timestamp: new Date().toISOString(),
    to: params.toEmail,
    subject,
    customerName: params.customerName,
    orderId: params.orderId,
    productName: params.productName,
    amount: params.amount,
    provider: 'simulated',
    status: 'SENT (Simulated)',
  };

  emailLogs.push(simulatedRecord);
  fs.writeFileSync(emailLogFile, JSON.stringify(emailLogs, null, 2), 'utf8');

  console.log(`[ORDER EMAIL DISPATCHED - SIMULATED] Confirmation sent to ${params.toEmail} for Order ${params.orderId}`);

  return {
    success: true,
    provider: 'simulated',
    messageId: `sim-order-${Date.now()}-${params.orderId}`,
  };
}

