import nodemailer from 'nodemailer';

// Reads credentials from process.env hydrated by setup wizard or .env
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL,         // e.g. kartikmanwani2005@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD,   // The 16-character App Password
  },
});