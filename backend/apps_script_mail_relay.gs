/**
 * Mail relay for the Waferscope API. Deploy as a Google Apps Script web app:
 *   1. script.google.com -> New project, paste this file.
 *   2. Project Settings -> Script properties -> add RELAY_TOKEN with a long random value.
 *   3. Deploy -> New deployment -> Web app. Execute as: Me. Who has access: Anyone.
 *   4. Copy the web app URL into the Space secret MAIL_RELAY_URL and the token into MAIL_RELAY_TOKEN.
 * Mail is sent from the Google account that owns the script.
 */
function doPost(e) {
  var out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  };
  try {
    var data = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty("RELAY_TOKEN");
    if (!expected || data.token !== expected) return out({ ok: false, error: "unauthorized" });
    if (!data.to || !data.subject || !data.html) return out({ ok: false, error: "missing fields" });
    MailApp.sendEmail({ to: data.to, subject: data.subject, htmlBody: data.html, name: "Waferscope" });
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}
