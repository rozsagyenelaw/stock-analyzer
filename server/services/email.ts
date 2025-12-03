import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

// Email queue to respect Gmail limits (500/day)
const emailQueue: Array<() => Promise<void>> = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 100; // ms between emails

export function initializeEmailService(): void {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured. Email alerts will be disabled.');
    return;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  console.log('Email service initialized');
}

async function processQueue(): Promise<void> {
  if (isProcessing || emailQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (emailQueue.length > 0) {
    const sendEmail = emailQueue.shift();
    if (sendEmail) {
      try {
        await sendEmail();
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }
  }

  isProcessing = false;
}

export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  if (!transporter) {
    console.warn('Email service not initialized. Skipping email.');
    return;
  }

  return new Promise((resolve, reject) => {
    emailQueue.push(async () => {
      try {
        await transporter!.sendMail({
          from: `Stock Analyzer <${process.env.GMAIL_USER}>`,
          to,
          subject,
          html: body,
        });
        console.log(`Email sent to ${to}: ${subject}`);
        resolve();
      } catch (error) {
        console.error('Email send error:', error);
        reject(error);
      }
    });

    processQueue();
  });
}

export async function sendStockAlert(
  to: string,
  symbol: string,
  condition: string,
  currentValue: string
): Promise<void> {
  const subject = `🚨 Stock Alert: ${symbol} - ${condition}`;
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Stock Alert Triggered</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <p><strong>Symbol:</strong> ${symbol}</p>
        <p><strong>Condition:</strong> ${condition}</p>
        <p><strong>Current Value:</strong> ${currentValue}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        This is an automated alert from your Stock Analyzer app.
      </p>
    </div>
  `;

  await sendAlertEmail(to, subject, body);
}

export async function sendTestEmail(to: string): Promise<void> {
  const subject = 'Stock Analyzer - Test Email';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Email Configuration Test</h2>
      <p>If you're reading this, your email alerts are configured correctly!</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Sent at ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  await sendAlertEmail(to, subject, body);
}

export default {
  initializeEmailService,
  sendAlertEmail,
  sendStockAlert,
  sendTestEmail,
};
