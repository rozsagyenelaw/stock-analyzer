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
  currentValue: string,
  aiReasoning?: string
): Promise<void> {
  const subject = `🚨 Stock Alert: ${symbol} - ${condition}`;

  // Format AI reasoning for HTML (convert newlines to <br> and preserve formatting)
  const formattedReasoning = aiReasoning
    ? aiReasoning
        .split('\n')
        .map(line => {
          // Convert bullet points to proper HTML list items
          if (line.trim().startsWith('•')) {
            return `<li style="margin: 5px 0;">${line.replace('•', '').trim()}</li>`;
          }
          // Bold section headers (lines ending with :)
          if (line.trim().endsWith(':') && !line.includes('http')) {
            return `<strong style="color: #1a1a2e; display: block; margin-top: 15px;">${line}</strong>`;
          }
          // Regular lines
          return line ? `<p style="margin: 5px 0;">${line}</p>` : '<br/>';
        })
        .join('')
    : '';

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Stock Alert Triggered</h1>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
          <h2 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 18px;">${symbol}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Condition:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${condition}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Current Value:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #667eea;">${currentValue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        ${
          aiReasoning
            ? `
        <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #4299e1;">
          <h3 style="color: #2c5282; margin: 0 0 15px 0; font-size: 16px;">🤖 AI-Powered Analysis</h3>
          <div style="color: #2d3748; font-size: 14px; line-height: 1.6;">
            ${formattedReasoning}
          </div>
        </div>
        `
            : ''
        }

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
            This is an automated alert from your Stock Analyzer app.<br/>
            ${aiReasoning ? 'AI analysis provided by local ML models and OpenAI.' : ''}
          </p>
        </div>
      </div>

      <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #666; font-size: 11px; margin: 0;">
          Stock Analyzer | Smart Trading Alerts
        </p>
      </div>
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
