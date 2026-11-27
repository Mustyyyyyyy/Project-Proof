interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, html, text }: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("EMAIL_NOT_CONFIGURED: Set RESEND_API_KEY and EMAIL_FROM on the API server.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; name?: string } | null;
    throw new Error(`RESEND_DELIVERY_FAILED: ${body?.message || response.statusText || response.status}`);
  }
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function emailShell(title: string, content: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7f6f1;font-family:Arial,sans-serif;color:#15251d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffefa;border:1px solid #e1ded2;border-radius:12px"><tr><td style="padding:28px 32px"><p style="margin:0;color:#1d5a43;font-weight:700;font-size:13px;letter-spacing:1px">PROJECTPROOF</p><h1 style="font-size:24px;line-height:1.3;margin:18px 0 12px">${escapeHtml(title)}</h1>${content}<p style="margin:28px 0 0;color:#77776d;font-size:12px;line-height:1.6">You received this message because of activity on your ProjectProof account. Manage your email preferences from your dashboard.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendWelcomeEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  const appUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Welcome to ProjectProof — your work has a place here",
    text: `Welcome to ProjectProof, ${name}. Your profile is ready. Add a project, share the story behind it, and let your work lead to new connections. Visit ${appUrl}/dashboard`,
    html: emailShell("Welcome to ProjectProof", `<p style="font-size:16px;line-height:1.7">Hello ${safeName},</p><p style="font-size:15px;line-height:1.7;color:#464b42">Your portfolio is ready for its first project. Share what you made, the thinking behind it, and the part you played.</p><p style="margin:24px 0"><a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:#1d5a43;color:#fffefa;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Open your dashboard</a></p><p style="font-size:14px;line-height:1.7;color:#464b42">Here’s to showing the work—and what you can do next.</p>`),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, code: string) {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  await sendEmail({
    to,
    subject: "Your ProjectProof password reset code",
    text: `Hello ${name}. Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: emailShell("Reset your password", `<p style="font-size:15px;line-height:1.7">Hello ${safeName},</p><p style="font-size:15px;line-height:1.7;color:#464b42">Use the code below to reset your ProjectProof password. It expires in <strong>10 minutes</strong>.</p><p style="margin:24px 0;padding:16px;text-align:center;border-radius:8px;background:#f0eee6;font-size:30px;letter-spacing:8px;font-weight:700">${safeCode}</p><p style="font-size:13px;line-height:1.7;color:#77776d">If you did not request a password reset, you can safely ignore this message. Your password will not change.</p>`),
  });
}

export async function sendNotificationEmail(to: string, name: string, title: string, body: string, href?: string | null) {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const appUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = href && href.startsWith("/") ? `${escapeHtml(appUrl)}${escapeHtml(href)}` : `${escapeHtml(appUrl)}/dashboard`;
  await sendEmail({
    to,
    subject: `ProjectProof: ${title}`,
    text: `Hello ${name}. ${title}. ${body} Open your dashboard: ${link}`,
    html: emailShell(safeTitle, `<p style="font-size:15px;line-height:1.7">Hello ${safeName},</p><p style="font-size:15px;line-height:1.7;color:#464b42">${safeBody}</p><p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#1d5a43;color:#fffefa;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">View in ProjectProof</a></p>`),
  });
}
