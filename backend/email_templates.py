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


def _assemble(to_email, sender, subject, text, html, logo):
    body = MIMEMultipart('alternative')
    body.attach(MIMEText(text, 'plain', 'utf-8'))
    body.attach(MIMEText(html, 'html', 'utf-8'))

    message = MIMEMultipart('related')
    message['From'] = formataddr(('SmartEnergy', sender))
    message['To'] = to_email
    message['Subject'] = subject
    message.attach(body)
    if logo is not None:
        image = MIMEImage(logo, 'gif')
        image.add_header('Content-ID', f'<{LOGO_CID}>')
        image.add_header('Content-Disposition', 'inline', filename='smartenergy.gif')
        message.attach(image)
    return message


def build_activation_message(to_email, sender, username, link):
    logo = _load_logo()
    return _assemble(to_email, sender, ACTIVATION_SUBJECT, _activation_text(username, link),
                     _activation_html(username, link, logo is not None), logo)


def _plural(count, unit):
    return f'{count} {unit}' if count == 1 else f'{count} {unit}s'


def _report_actions(report):
    actions = [f"Turn off {_plural(row['extra'], row['unit'])}" for row in report['extras']]
    if report['overcooling']:
        actions.append(f"Raise the AC set-point from {report['temp']} °C to {report['plan_temp']} °C")
    return actions


def report_subject(room_name, report):
    return f"Action required: {room_name} is using {report['excess_kw']:.2f} kW more than required"


def _report_text(assistant, room_name, report, admin_name, note, sent_at, link):
    lines = [
        f'Hello {assistant},', '',
        f'{room_name} is using more energy than its current headcount requires.', '',
        f"Students present:  {report['present']} of {report['seats']}",
        f"Required load:     {report['plan_kw']:.2f} kW",
        f"Current load:      {report['live_kw']:.2f} kW",
        f"Extra load:        {report['excess_kw']:.2f} kW", '',
        'Action requested:',
    ]
    lines += [f'  - {action}' for action in _report_actions(report)]
    if note:
        lines += ['', f'Note from {admin_name}:', note]
    lines += ['', f'Open the campus map: {link}', '', f'Sent by {admin_name} on {sent_at}. Replying reaches {admin_name} directly.']
    return '\n'.join(lines) + '\n'


def _report_html(assistant, room_name, report, admin_name, note, sent_at, link, has_logo):
    title = escape(report_subject(room_name, report))
    room = escape(room_name)
    admin = escape(admin_name)
    href = escape(link, quote=True)
    year = datetime.now().year
    logo = (
        f'<td width="64" style="padding-right:12px;line-height:0;">'
        f'<img src="cid:{LOGO_CID}" width="64" height="64" alt="" style="display:block;border:0;width:64px;height:64px;"></td>'
        if has_logo else ''
    )

    def metric(label, value, color, value_class):
        return (
            f'<td class="se-metric" width="33%" valign="top" style="padding:14px 12px;background-color:#f4f7f8;border:1px solid #e4e9eb;">'
            f'<div class="se-muted" style="font-family:{FONT};font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:#5b6a72;">{label}</div>'
            f'<div class="{value_class}" style="font-family:{FONT};font-size:22px;font-weight:700;line-height:1.3;color:{color};">{value:.2f} <span style="font-size:13px;font-weight:600;">kW</span></div></td>'
        )

    cell = 'padding:10px 8px;border-top:1px solid #e4e9eb;font-family:' + FONT + ';font-size:14px;color:#3d4d55;'
    head = 'padding:0 8px 8px;font-family:' + FONT + ';font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:#5b6a72;'
    rows = ''.join(
        f'<tr><td class="se-text se-rule" style="{cell}font-weight:600;">{escape(row["device"])}</td>'
        f'<td class="se-text se-rule" align="right" style="{cell}">{row["live"]}</td>'
        f'<td class="se-text se-rule" align="right" style="{cell}">{row["required"]}</td>'
        f'<td class="se-rule se-danger" align="right" style="{cell}font-weight:700;color:#b42318;">+{row["extra"]}</td>'
        f'<td class="se-rule se-danger" align="right" style="{cell}font-weight:700;color:#b42318;">{row["extra_kw"]:.2f} kW</td></tr>'
        for row in report['extras']
    )
    if report['overcooling']:
        rows += (
            f'<tr><td class="se-text se-rule" style="{cell}font-weight:600;">AC set-point</td>'
            f'<td class="se-text se-rule" align="right" style="{cell}">{report["temp"]} °C</td>'
            f'<td class="se-text se-rule" align="right" style="{cell}">{report["plan_temp"]} °C</td>'
            f'<td class="se-rule se-danger" colspan="2" align="right" style="{cell}font-weight:700;color:#b42318;">{report["plan_temp"] - report["temp"]} °C too low</td></tr>'
        )
    table = (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>'
        f'<td class="se-muted" style="{head}">Device</td><td class="se-muted" align="right" style="{head}">On now</td>'
        f'<td class="se-muted" align="right" style="{head}">Required</td><td class="se-muted" align="right" style="{head}">Extra</td>'
        f'<td class="se-muted" align="right" style="{head}">Extra load</td></tr>{rows}</table>'
    ) if rows else ''
    actions = ''.join(
        f'<tr><td class="se-good" width="22" valign="top" style="font-family:{FONT};font-size:15px;line-height:1.5;font-weight:700;color:#047857;">&#10003;</td>'
        f'<td class="se-text" style="padding-bottom:6px;font-family:{FONT};font-size:15px;line-height:1.5;color:#10242b;">{escape(action)}</td></tr>'
        for action in _report_actions(report)
    )
    note_html = (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>'
        f'<td class="se-note" style="padding:14px 16px;background-color:#f4f7f8;border-left:3px solid #047857;font-family:{FONT};">'
        f'<div class="se-muted" style="font-size:12px;font-weight:600;color:#5b6a72;padding-bottom:4px;">Note from {admin}</div>'
        f'<div class="se-text" style="font-size:14px;line-height:1.55;color:#3d4d55;">{escape(note).replace(chr(10), "<br>")}</div></td></tr></table>'
    ) if note else ''
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{title}</title>
<style>
  @media (max-width: 620px) {{
    .se-body {{ padding: 28px 20px !important; }}
    .se-outer {{ padding: 16px 8px !important; }}
    .se-title {{ font-size: 22px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .se-page {{ background-color: #02090c !important; }}
    .se-card {{ background-color: #0b1f25 !important; border-color: #1b3339 !important; }}
    .se-title {{ color: #ffffff !important; }}
    .se-text {{ color: #d1d5db !important; }}
    .se-muted {{ color: #9ca3af !important; }}
    .se-rule {{ border-color: #1b3339 !important; }}
    .se-metric, .se-note {{ background-color: #102a31 !important; border-color: #1b3339 !important; }}
    .se-danger {{ color: #f87171 !important; }}
    .se-good {{ color: #34d399 !important; }}
  }}
</style>
</head>
<body class="se-page" style="margin:0;padding:0;background-color:#eef2f3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{room} needs attention: {report['excess_kw']:.2f} kW above the required load.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="se-page" style="background-color:#eef2f3;">
  <tr>
    <td align="center" class="se-outer" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="se-card" style="max-width:600px;background-color:#ffffff;border:1px solid #dde3e6;border-radius:16px;border-collapse:separate;overflow:hidden;">
        <tr>
          <td bgcolor="#06181d" style="background-color:#06181d;padding:14px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                {logo}
                <td style="font-family:{FONT};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#ffffff;">Smart<span style="color:#00f59b;">Energy</span></td>
                <td align="right" style="font-family:{FONT};font-size:12px;color:#9ca3af;">Energy usage report</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td bgcolor="#b42318" style="background-color:#b42318;padding:9px 24px;font-family:{FONT};font-size:13px;font-weight:600;color:#ffffff;">Action required &middot; {room}</td></tr>
        <tr>
          <td class="se-body" style="padding:32px 32px 28px;font-family:{FONT};">
            <h1 class="se-title" style="margin:0 0 12px;font-size:25px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;color:#10242b;">{room} is using extra energy</h1>
            <p class="se-text" style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3d4d55;">Hello {escape(assistant)}, this room has {report['present']} of {report['seats']} students present, and more energy is being used than that headcount requires. Please make the changes listed below.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">
              <tr>{metric('Required', report['plan_kw'], '#047857', 'se-good')}{metric('Current', report['live_kw'], '#10242b', 'se-title')}{metric('Extra', report['excess_kw'], '#b42318', 'se-danger')}</tr>
            </table>
            {table}
            <h2 class="se-title" style="margin:0 0 10px;font-size:16px;font-weight:700;color:#10242b;">What to do</h2>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">{actions}</table>
            {note_html}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#047857" style="background-color:#047857;border-radius:10px;">
                  <a href="{href}" style="display:inline-block;padding:13px 28px;font-family:{FONT};font-size:15px;font-weight:600;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:10px;">Open campus map</a>
                </td>
              </tr>
            </table>
            <hr class="se-rule" style="border:0;border-top:1px solid #e4e9eb;margin:28px 0 16px;">
            <p class="se-muted" style="margin:0;font-size:13px;line-height:1.55;color:#5b6a72;">Sent by {admin} on {escape(sent_at)}. Reply to this email to reach {admin} directly.</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td class="se-muted" style="padding:20px 32px 8px;font-family:{FONT};font-size:12px;line-height:1.6;color:#5b6a72;text-align:center;">
            You receive this because you are the assigned assistant for {room}. Figures are estimated from rated device power.<br>
            &copy; {year} SmartEnergy &middot; Smart classroom energy management
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def build_energy_report_message(to_email, sender, reply_to, assistant, room_name, report, admin_name, note, sent_at, link):
    logo = _load_logo()
    message = _assemble(
        to_email, sender, report_subject(room_name, report),
        _report_text(assistant, room_name, report, admin_name, note, sent_at, link),
        _report_html(assistant, room_name, report, admin_name, note, sent_at, link, logo is not None),
        logo
    )
    if reply_to:
        message['Reply-To'] = reply_to
    return message
