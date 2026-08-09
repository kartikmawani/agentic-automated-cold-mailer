import nodemailer from 'nodemailer';

// Reads credentials from process.env hydrated by setup wizard or .env
export function getTransporter() {
  const user = process.env.SENDER_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SENDER_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      `[SMTP Error] Missing credentials in environment! user: "${user}", pass: "${pass ? '*****' : 'undefined'}"`
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), 
    },
  });
}