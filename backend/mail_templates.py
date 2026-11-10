"""HTML email templates for Waferscope. Table layout and inline styles only, so Gmail, Outlook and phones render them alike."""
from mailer import esc

LIME, PINK, INK, PAPER, MUTE, LINE = "#c6ff3d", "#ff2e93", "#0a0a0f", "#f4f4ef", "#a8a8b8", "#2a2a37"
FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
DISPLAY = "'Arial Black','Helvetica Neue',Arial,sans-serif"
MONO = "'Courier New',Courier,monospace"


def _button(label: str, href: str, colour: str, text: str = INK) -> str:
    return (
        f'<a href="{esc(href)}" style="display:inline-block;padding:14px 22px;background:{colour};color:{text};'
        f'font:900 14px {DISPLAY};text-decoration:none;text-transform:uppercase;letter-spacing:-.2px;'
        f'border:2px solid {PAPER};border-radius:4px;box-shadow:4px 4px 0 {PAPER}">{esc(label)}</a>'
    )


def _shell(preheader: str, headline: str, headline_accent: str, body: str, footer: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:{INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{INK}">{esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{INK};">
<tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
    <tr><td style="padding:0 0 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:26px;height:26px;background:{LIME};border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding-left:10px;font:800 15px {DISPLAY};color:{PAPER};letter-spacing:-.4px;">WAFERSCOPE</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#101016;border:2px solid {PAPER};border-radius:12px;padding:30px 28px;">
      <div style="font:900 34px/1 {DISPLAY};color:{PAPER};text-transform:uppercase;letter-spacing:-1.5px;">
        {esc(headline)} <span style="color:{LIME};">{esc(headline_accent)}</span>
      </div>
      <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
      {body}
    </td></tr>
    <tr><td style="padding:16px 4px 0;font:12px/1.6 {FONT};color:{MUTE};">{footer}</td></tr>
  </table>
</td></tr></table></body></html>"""


def _card(rows: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<tr><td style="padding:9px 0;border-top:1px solid {LINE};font:600 11px {MONO};color:{MUTE};text-transform:uppercase;'
        f'letter-spacing:.8px;width:34%;vertical-align:top;">{esc(k)}</td>'
        f'<td style="padding:9px 0;border-top:1px solid {LINE};font:15px/1.5 {FONT};color:{PAPER};">{v}</td></tr>'
        for k, v in rows
    )
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{cells}</table>'


def request_to_admin(name: str, email: str, reason: str, approve_url: str, reject_url: str) -> tuple[str, str]:
    body = (
        _card([("Name", esc(name)), ("Email", esc(email)), ("Reason", esc(reason) if reason else f'<i style="color:{MUTE}">No reason given</i>')])
        + '<div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>'
        + f'<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:14px;">{_button("Approve", approve_url, LIME)}</td>'
        + f'<td>{_button("Reject", reject_url, PINK)}</td></tr></table>'
    )
    footer = "The buttons open a confirmation page, so nothing is decided until you confirm. They work for 7 days. You can also decide on the People page."
    return f"New request from {name}", _shell(f"{name} asked for access to Waferscope", "New", "request.", body, footer)


def welcome_to_user(name: str, email: str, password: str, login_url: str) -> tuple[str, str]:
    body = (
        f'<div style="font:16px/1.6 {FONT};color:{PAPER};">Hi {esc(name)}, your request was approved. Use these details to sign in.</div>'
        + '<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>'
        + _card([("Email", esc(email)), ("Password", f'<span style="font:700 16px {MONO};background:{LIME};color:{INK};padding:3px 8px;border-radius:3px;">{esc(password)}</span>')])
        + '<div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>'
        + _button("Sign in", login_url, LIME)
    )
    footer = "This is a temporary password. Keep it private. If you did not ask for access, ignore this email."
    return "You are in: Waferscope access approved", _shell("Your Waferscope account is ready", "You are", "in.", body, footer)


def rejection_to_user(name: str, scan_url: str) -> tuple[str, str]:
    body = (
        f'<div style="font:16px/1.6 {FONT};color:{PAPER};">Hi {esc(name)}, thanks for your interest. We could not approve your access request this time.</div>'
        + f'<div style="font:16px/1.6 {FONT};color:{MUTE};margin-top:10px;">You can still scan wafers without an account.</div>'
        + '<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>'
        + _button("Try a guest scan", scan_url, PAPER)
    )
    return "Waferscope access request", _shell("About your Waferscope access request", "Not this", "time.", body, "You are receiving this because someone used this address to ask for Waferscope access.")
