import nodemailer from 'nodemailer'

export async function sendOtpEmail(toEmail: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 465
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || ''
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || ''
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"Lucky Draw Admin" <${smtpUser}>` : '')

    if (!smtpUser || !smtpPass) {
      return { ok: false, error: 'SMTP credentials missing: Please add SMTP_USER and SMTP_PASS to Vercel Environment Variables.' }
    }

    const transporter = nodemailer.createTransport({
      host: isGmail ? 'smtp.gmail.com' : smtpHost,
      port: isGmail ? 465 : smtpPort,
      secure: isGmail ? true : isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Your Admin Verification OTP: ${otp}`,
      text: `Your OTP for resetting the admin password is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #E8E3D8; border-radius: 6px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1E1B18; margin: 0; font-size: 20px; font-weight: 500;">Lucky Draw 2026</h2>
            <p style="color: #78716c; font-size: 12px; margin-top: 4px;">Admin Portal Security Verification</p>
          </div>
          <div style="background-color: #FAF8F5; border: 1px solid #E8E3D8; border-radius: 4px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="color: #78716c; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">One-Time Password (OTP)</p>
            <h1 style="color: #1E1B18; font-size: 32px; letter-spacing: 6px; margin: 0; font-family: monospace; font-weight: 600;">${otp}</h1>
          </div>
          <p style="color: #44403c; font-size: 13px; line-height: 1.5; margin: 0 0 12px 0;">
            Use the OTP above to reset your administrator password. This code will expire in <strong>10 minutes</strong>.
          </p>
          <p style="color: #a8a29e; font-size: 11px; margin: 16px 0 0 0; border-top: 1px solid #F2EFE9; padding-top: 12px;">
            If you did not request this password reset, please ignore this email immediately.
          </p>
        </div>
      `,
    })
    return { ok: true }
  } catch (err: any) {
    console.error('Nodemailer sendOtpEmail error:', err)
    return { ok: false, error: err.message || 'Failed to send OTP email' }
  }
}
