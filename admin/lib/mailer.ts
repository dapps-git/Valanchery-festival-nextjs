import { Resend } from 'resend'

export async function sendOtpEmail(toEmail: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY || ''
    const from = process.env.RESEND_FROM || 'Lucky Draw Admin <onboarding@resend.dev>'

    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY is missing from environment variables.' }
    }

    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from,
      to: toEmail,
      subject: `Your Admin Verification OTP: ${otp}`,
      text: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share this.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #E8E3D8;border-radius:6px;background:#fff">
          <div style="text-align:center;margin-bottom:20px">
            <h2 style="color:#1E1B18;margin:0;font-size:20px;font-weight:500">Lucky Draw 2026</h2>
            <p style="color:#78716c;font-size:12px;margin-top:4px">Admin Portal Security Verification</p>
          </div>
          <div style="background:#FAF8F5;border:1px solid #E8E3D8;border-radius:4px;padding:20px;text-align:center;margin-bottom:20px">
            <p style="color:#78716c;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px">One-Time Password (OTP)</p>
            <h1 style="color:#1E1B18;font-size:32px;letter-spacing:6px;margin:0;font-family:monospace;font-weight:600">${otp}</h1>
          </div>
          <p style="color:#44403c;font-size:13px;line-height:1.5;margin:0 0 12px 0">
            Use the OTP above to reset your administrator password. This code expires in <strong>10 minutes</strong>.
          </p>
          <p style="color:#a8a29e;font-size:11px;margin:16px 0 0 0;border-top:1px solid #F2EFE9;padding-top:12px">
            If you did not request this reset, ignore this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[RESEND ERROR]:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[RESEND ERROR]:', err)
    return { ok: false, error: err.message || 'Failed to send OTP via Resend' }
  }
}

