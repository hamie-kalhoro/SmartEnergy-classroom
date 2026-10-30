"""Builds SmartEnergy's emails. Email clients support little CSS, so layout uses tables and inline styles."""
import os
from datetime import datetime
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape

LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'email_logo.gif')
LOGO_CID = 'smartenergy-logo'

ACTIVATION_SUBJECT = 'Activate your SmartEnergy account'

FONT = "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"


def _load_logo():
    try:
        with open(LOGO_PATH, 'rb') as f:
            return f.read()
    except OSError:
        return None  # A missing image must never stop an account email from sending.


def _activation_text(username, link):
    return (
        f'Welcome to SmartEnergy, {username}.\n\n'
        'Confirm your email address to finish setting up your account:\n'
        f'{link}\n\n'
        'This link can only be used once.\n\n'
        "If you didn't create this account, you can ignore this email. "
        'The account stays inactive until the link is used.\n'
    )


def _activation_html(username, link, has_logo):
    name = escape(username)
    href = escape(link, quote=True)
    year = datetime.now().year
    logo = (
        f'<td width="64" style="padding-right:12px;line-height:0;">'
        f'<img src="cid:{LOGO_CID}" width="64" height="64" alt="" style="display:block;border:0;width:64px;height:64px;"></td>'
        if has_logo else ''
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{ACTIVATION_SUBJECT}</title>
<style>
  @media (max-width: 620px) {{
    .se-body {{ padding: 32px 24px !important; }}
    .se-footer {{ padding: 20px 24px 8px !important; }}
    .se-outer {{ padding: 16px 8px !important; }}
    .se-title {{ font-size: 24px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .se-page {{ background-color: #02090c !important; }}
    .se-card {{ background-color: #0b1f25 !important; border-color: #1b3339 !important; }}
    .se-title {{ color: #ffffff !important; }}
    .se-text {{ color: #d1d5db !important; }}
    .se-muted {{ color: #9ca3af !important; }}
    .se-rule {{ border-color: #1b3339 !important; }}
    .se-link {{ color: #5eead4 !important; }}
  }}
</style>
</head>
<body class="se-page" style="margin:0;padding:0;background-color:#eef2f3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Confirm your email address to finish setting up your SmartEnergy account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="se-page" style="background-color:#eef2f3;">
  <tr>
    <td align="center" class="se-outer" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="se-card" style="max-width:560px;background-color:#ffffff;border:1px solid #dde3e6;border-radius:16px;border-collapse:separate;overflow:hidden;">
        <tr>
          <td bgcolor="#06181d" style="background-color:#06181d;padding:14px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                {logo}
                <td style="font-family:{FONT};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#ffffff;">Smart<span style="color:#00f59b;">Energy</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="se-body" style="padding:40px 40px 36px;font-family:{FONT};">
            <h1 class="se-title" style="margin:0 0 14px;font-size:28px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;color:#10242b;">Activate your account</h1>
            <p class="se-text" style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#3d4d55;">Welcome, {name}. Confirm your email address to finish setting up your SmartEnergy account.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#047857" style="background-color:#047857;border-radius:10px;">
                  <a href="{href}" style="display:inline-block;padding:14px 32px;font-family:{FONT};font-size:16px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:10px;">Activate account</a>
                </td>
              </tr>
            </table>
            <p class="se-muted" style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#5b6a72;">This link can only be used once.</p>
            <hr class="se-rule" style="border:0;border-top:1px solid #e4e9eb;margin:28px 0 20px;">
            <p class="se-muted" style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#5b6a72;">Button not working? Paste this link into your browser:</p>
            <p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;"><a class="se-link" href="{href}" style="color:#047857;">{escape(link)}</a></p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td class="se-footer se-muted" style="padding:20px 40px 8px;font-family:{FONT};font-size:12px;line-height:1.6;color:#5b6a72;text-align:center;">
            If you didn't create this account, you can ignore this email. It stays inactive until the link is used.<br>
            &copy; {year} SmartEnergy &middot; Smart classroom energy management
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def build_activation_message(to_email, sender, username, link):
    logo = _load_logo()

    body = MIMEMultipart('alternative')
    body.attach(MIMEText(_activation_text(username, link), 'plain', 'utf-8'))
    body.attach(MIMEText(_activation_html(username, link, logo is not None), 'html', 'utf-8'))

    message = MIMEMultipart('related')
    message['From'] = formataddr(('SmartEnergy', sender))
    message['To'] = to_email
    message['Subject'] = ACTIVATION_SUBJECT
    message.attach(body)
    if logo is not None:
        image = MIMEImage(logo, 'gif')
        image.add_header('Content-ID', f'<{LOGO_CID}>')
        image.add_header('Content-Disposition', 'inline', filename='smartenergy.gif')
        message.attach(image)
    return message
