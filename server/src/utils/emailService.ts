import nodemailer from "nodemailer";
import { logger } from "./logger";

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add DKIM if you've set it up (requires additional configuration)
  // dkim: {
  //   domainName: "your-domain.com",
  //   keySelector: "your-selector",
  //   privateKey: "Your private key",
  // },
});

// Test email configuration on startup if credentials are available
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter
    .verify()
    .then(() => logger.info("Email service is ready"))
    .catch((err) => logger.error("Email service configuration error:", err));
} else {
  logger.warn("Email service not configured: missing credentials");
}

export const sendVerificationEmail = async (
  to: string,
  code: string
): Promise<boolean> => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn(`Email not sent: credentials missing (to: ${to})`);
      return false;
    }

    // Get app name from env or use default
    const appName = process.env.APP_NAME || "Food Recognition App";
    const fromName = process.env.EMAIL_FROM_NAME || appName;
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    // Unsubscribe link (required by anti-spam laws)
    const unsubscribeLink =
      process.env.UNSUBSCRIBE_LINK || "https://foodrecognition.com/unsubscribe";

    // Create a more professional email with better structure
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: "Verify Your Email for " + appName,
      text: `Your verification code is: ${code}\n\nThis code will expire in 24 hours.\n\nIf you did not request this verification, please ignore this email.\n\nRegards,\nThe ${appName} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333;">
          <div style="background-color: #4285F4; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">${appName}</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #dddddd; border-top: none;">
            <h2>Verify Your Email</h2>
            <p>Thank you for registering! Please use the following code to verify your email address:</p>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 2px; margin: 20px 0; border-radius: 4px;">
              <strong>${code}</strong>
            </div>
            <p>This code will expire in 24 hours.</p>
            <p>If you did not request this verification, please ignore this email.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dddddd; font-size: 12px; color: #777777;">
              <p>This is an automated message from ${appName}. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p><a href="${unsubscribeLink}" style="color: #777777;">Unsubscribe</a> from future emails.</p>
            </div>
          </div>
        </div>
      `,
      headers: {
        // Additional headers to improve deliverability
        Precedence: "Bulk",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "List-Unsubscribe": `<${unsubscribeLink}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    logger.info(`Verification email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send verification email to ${to}:`, error);
    return false;
  }
};

export default {
  sendVerificationEmail,
};
