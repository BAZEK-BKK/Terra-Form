/**
 * Terra & Form — formulaire de contact (Google Apps Script)
 * Reçoit les demandes du site et les envoie à contact@terra-and-form.com.
 * Déployer en "Application Web" : exécuter en tant que "Moi", accès "Tout le monde".
 */

// Adresse qui reçoit les demandes
var RECIPIENT = "contact@terra-and-form.com";

// (Facultatif) ID d'un Google Sheet pour garder une copie des demandes.
// Laisser vide ("") pour désactiver. L'ID est la partie entre /d/ et /edit dans l'URL du Sheet.
var SHEET_ID = "";

// Domaines autorisés à envoyer des demandes (vérifié via le champ "origin" envoyé par le site)
var ALLOWED_ORIGINS = [
  "https://www.terra-and-form.com",
  "https://terra-and-form.com"
];

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length > 8000) return json_({ success: false, message: "too_large" });

    var d = JSON.parse(raw);

    // Origine du site (le navigateur l'envoie ; filtre simple contre les appels hors site)
    if (ALLOWED_ORIGINS.indexOf(String(d.origin || "")) === -1) {
      return json_({ success: false, message: "forbidden" });
    }

    // Champ piège : un humain ne le remplit jamais
    if (d.website) return json_({ success: true }); // on fait semblant, sans envoyer

    var first = clean_(d.firstname, 80);
    var last = clean_(d.lastname, 80);
    var email = clean_(d.email, 120);
    var phone = clean_(d.phone, 40);
    var message = clean_(d.message, 4000);
    var lang = clean_(d.language, 5);
    var page = clean_(d.page, 200);

    if (!first || !last || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ success: false, message: "invalid" });
    }

    // Limites anti-abus : 1 envoi / minute par e-mail, 30 envois / heure au total
    var cache = CacheService.getScriptCache();
    var keyMail = "m_" + email.toLowerCase();
    if (cache.get(keyMail)) return json_({ success: false, message: "too_many" });
    var hourKey = "h_" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHH");
    var count = Number(cache.get(hourKey) || 0);
    if (count >= 30) return json_({ success: false, message: "too_many" });
    cache.put(keyMail, "1", 60);
    cache.put(hourKey, String(count + 1), 3600);

    var subject = "Nouvelle demande de contact — Terra & Form";
    var text =
      "Nom : " + first + " " + last + "\n" +
      "E-mail : " + email + "\n" +
      "Téléphone : " + (phone || "—") + "\n" +
      "Langue du site : " + (lang || "—") + "\n" +
      "Page : " + (page || "—") + "\n\n" +
      "Message :\n" + message + "\n";

    MailApp.sendEmail({
      to: RECIPIENT,
      replyTo: email,
      subject: subject,
      body: text,
      name: "Site Terra & Form"
    });

    if (SHEET_ID) {
      try {
        SpreadsheetApp.openById(SHEET_ID).getSheets()[0]
          .appendRow([new Date(), first, last, email, phone, lang, page, message]);
      } catch (errSheet) { /* la copie dans le Sheet ne doit jamais bloquer l'envoi */ }
    }

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, message: "error" });
  }
}

// Test dans le navigateur : l'adresse /exec doit répondre "ok"
function doGet() {
  return json_({ success: true, message: "ok" });
}

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
