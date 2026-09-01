import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

let transporter = null;

export const getEmailTransporter = () => {
    if (transporter) return transporter;

    const user = process.env.GOOGLE_USER || "";
    const pass = process.env.GOOGLE_AUTH_APP_PASSWORD || "";

    if (!user || !pass) {
        console.warn("[emailService] Warning: GOOGLE_USER or GOOGLE_AUTH_APP_PASSWORD not provided in .env");
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user,
            pass,
        },
    });

    return transporter;
};

export const verifyEmailTransporter = async () => {
    try {
        const mailer = getEmailTransporter();
        await mailer.verify();
        console.log("[emailService] SMTP connection verified successfully for", process.env.GOOGLE_USER);
        return true;
    } catch (error) {
        console.warn("[emailService] SMTP verification notice:", error.message);
        return false;
    }
};

export const sendVerificationEmail = async ({ to, name, verificationToken, otp }) => {
    try {
        if (!to) throw new Error("Recipient email is required");

        const mailer = getEmailTransporter();
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const verificationLink = `${clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(to)}`;
        const sender = `"chatSocial" <${process.env.GOOGLE_USER || "no-reply@chatsocial.com"}>`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your chatSocial Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0f14; color: #f8fafc;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0d0f14;">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #151821; border: 1px solid #262c38; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 35px 30px 20px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%); border-bottom: 1px solid #1e222a;">
                            <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 16px; background: linear-gradient(135deg, #10b981 0%, #6366f1 100%); color: #ffffff; font-size: 26px; font-weight: 900; text-align: center; margin-bottom: 15px;">
                                ∞
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">chatSocial</h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Real-Time Secure Communication</p>
                        </td>
                    </tr>
                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 35px 35px 25px;">
                            <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #ffffff;">Hello, ${name || "there"}! 👋</h2>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                                Thank you for joining chatSocial. To secure your account and activate encrypted messaging & SFU calls, please verify your email address.
                            </p>

                            <!-- OTP Box -->
                            ${otp ? `
                            <div style="margin: 25px 0; padding: 20px; background-color: #0b0d11; border: 1px solid #1e222a; border-radius: 16px; text-align: center;">
                                <span style="display: block; font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                                <span style="display: inline-block; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: 6px;">${otp}</span>
                                <span style="display: block; font-size: 11px; color: #64748b; margin-top: 8px;">Valid for 15 minutes</span>
                            </div>
                            ` : ""}

                            <!-- Action Button -->
                            ${verificationToken ? `
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 20px;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #080a0e; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); text-decoration: none; border-radius: 14px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ""}

                            <p style="margin: 25px 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                                If you did not create an account on chatSocial, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 20px 30px; background-color: #0f1117; border-top: 1px solid #1e222a; font-size: 11px; color: #475569;">
                            © ${new Date().getFullYear()} chatSocial Platform. End-to-end encrypted realtime communication.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const textContent = `Hello ${name || "there"},\n\nThank you for joining chatSocial.\n\nYour verification code is: ${otp || ""}\n\nOr verify by clicking this link: ${verificationLink}\n\nValid for 15 minutes.\n\n- The chatSocial Team`;

        const mailOptions = {
            from: sender,
            to,
            subject: `Verify your chatSocial account ${otp ? `(${otp})` : ""}`,
            text: textContent,
            html: htmlContent,
        };

        const info = await mailer.sendMail(mailOptions);
        console.log(`[emailService] Verification email sent to ${to} (MessageId: ${info.messageId})`);
        return {
            success: true,
            messageId: info.messageId,
            verificationLink,
            otp,
        };
    } catch (error) {
        console.warn("[emailService] Failed to send verification email:", error.message);
        return {
            success: false,
            error: error.message,
            otp,
        };
    }
};

export const sendWelcomeEmail = async ({ to, name }) => {
    try {
        if (!to) return null;
        const mailer = getEmailTransporter();
        const sender = `"chatSocial" <${process.env.GOOGLE_USER || "no-reply@chatsocial.com"}>`;

        const info = await mailer.sendMail({
            from: sender,
            to,
            subject: "Welcome to chatSocial! 🎉",
            text: `Hi ${name || "there"},\n\nYour email has been verified successfully. Welcome to chatSocial!\n\n- The chatSocial Team`,
            html: `
            <div style="font-family: sans-serif; background-color: #0d0f14; color: #ffffff; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto;">
                <h2 style="color: #10b981;">Welcome to chatSocial! 🎉</h2>
                <p style="color: #94a3b8; line-height: 1.6;">Hi ${name || "there"}, your email address has been verified. You can now connect, chat, and make HD audio/video calls securely.</p>
                <div style="margin-top: 20px; font-size: 11px; color: #475569;">© ${new Date().getFullYear()} chatSocial</div>
            </div>
            `,
        });
        return info;
    } catch (err) {
        console.warn("[emailService] Welcome email notice:", err.message);
        return null;
    }
};

export default {
    getEmailTransporter,
    verifyEmailTransporter,
    sendVerificationEmail,
    sendWelcomeEmail,
};
