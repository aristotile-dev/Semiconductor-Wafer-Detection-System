"""Outgoing mail through a Google Apps Script web app (see apps_script_mail_relay.gs).

Hugging Face Spaces cannot open SMTP connections, so mail goes out as an HTTPS call to a small script
that sends it from the owner's Gmail. Without MAIL_RELAY_URL the mail is printed to the log instead,
which is enough for local development.
"""
import os
import html


def mail_configured() -> bool:
    return bool(os.getenv("MAIL_RELAY_URL") and os.getenv("MAIL_RELAY_TOKEN"))


def send_mail(to: str, subject: str, body_html: str) -> bool:
    """Send one email. Never raises: a mail problem must not break the request that triggered it."""
    url, token = os.getenv("MAIL_RELAY_URL", ""), os.getenv("MAIL_RELAY_TOKEN", "")
    if not (url and token):
        print(f"[mail] relay not configured. To: {to} | Subject: {subject}\n{body_html}")
        return False
    try:
        import httpx
        r = httpx.post(url, json={"token": token, "to": to, "subject": subject, "html": body_html}, timeout=20, follow_redirects=True)
        ok = r.status_code == 200 and '"ok":true' in r.text.replace(" ", "")
        if not ok:
            print(f"[mail] relay refused the message ({r.status_code}): {r.text[:200]}")
        return ok
    except Exception as e:
        print(f"[mail] could not reach the relay: {e}")
        return False


def esc(value: str) -> str:
    return html.escape(value or "")
