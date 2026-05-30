const axios = require('axios');

const MAILJET_API_KEY    = process.env.MAILJET_API_KEY;
const MAILJET_API_SECRET = process.env.MAILJET_API_SECRET;
const FROM_EMAIL         = process.env.MAILJET_FROM_EMAIL || 'yassinhoua123@gmail.com';
const SENDER_NAME        = 'BubbleTech Pointage';

// Envoyer un email via Mailjet avec retry automatique
const sendEmail = async ({ to, toName, subject, html }, retries = 2) => {
  if (!MAILJET_API_KEY || !MAILJET_API_SECRET) {
    console.warn('⚠️  MAILJET_API_KEY ou MAILJET_API_SECRET non défini');
    return { success: false, error: 'Mailjet non configuré' };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From:    { Email: FROM_EMAIL, Name: SENDER_NAME },
              To:      [{ Email: to, Name: toName || to }],
              Subject: subject,
              HTMLPart: html
            }
          ]
        },
        {
          auth:    { username: MAILJET_API_KEY, password: MAILJET_API_SECRET },
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000
        }
      );

      const status = response.data?.Messages?.[0]?.Status;
      if (status === 'success') {
        return { success: true, messageId: response.data.Messages[0].To[0].MessageID };
      }
      throw new Error(`Mailjet status: ${status}`);

    } catch (err) {
      const errMsg = err.response?.data?.ErrorMessage || err.message;
      console.error(`❌ Mailjet tentative ${attempt}/${retries}:`, errMsg);

      if (attempt === retries) return { success: false, error: errMsg };
      await new Promise(r => setTimeout(r, 1000));
    }
  }
};

class EmailService {
  async sendWelcomeEmail(user, temporaryPassword) {
    const passwordSection = temporaryPassword
      ? `<p><strong>Mot de passe temporaire :</strong></p>
         <div class="code-box">${temporaryPassword}</div>
         <p style="color:#DC2626;font-size:0.9em;">⚠️ Changez ce mot de passe lors de votre première connexion.</p>`
      : `<p><em>Votre mot de passe a été défini par l'administrateur.</em></p>`;

    const html = `<!DOCTYPE html>
<html><head><style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
  .container{max-width:600px;margin:0 auto;padding:20px}
  .header{background:linear-gradient(135deg,#4F46E5,#0f766e);color:white;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .header h1{margin:0;font-size:22px}
  .content{background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none}
  .credentials{background:white;padding:20px;border-left:4px solid #4F46E5;margin:20px 0;border-radius:0 6px 6px 0}
  .label{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .value{font-size:16px;font-weight:600;color:#111827;margin-bottom:16px}
  .code-box{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #0f766e;padding:16px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:8px;margin:12px 0;border-radius:8px;color:#0f766e}
  .divider{height:1px;background:#e5e7eb;margin:16px 0}
  .warning{background:#FEF3C7;border-left:4px solid #F59E0B;padding:15px;margin:20px 0;border-radius:0 6px 6px 0}
  .warning ul{margin:8px 0 0;padding-left:20px}
  .warning li{margin-bottom:4px;font-size:14px}
  .button{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#4F46E5,#0f766e);color:white!important;text-decoration:none;border-radius:6px;margin:16px 0;font-weight:600;font-size:15px}
  .footer{text-align:center;margin-top:24px;color:#9ca3af;font-size:12px}
</style></head>
<body><div class="container">
  <div class="header">
    <h1>🎉 Bienvenue sur BubbleTech Pointage !</h1>
    <p>Votre compte a été créé avec succès</p>
  </div>
  <div class="content">
    <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
    <p>Voici vos informations de connexion :</p>
    <div class="credentials">
      <div class="label">Adresse email</div>
      <div class="value">${user.email}</div>
      <div class="divider"></div>
      <div class="label">Mot de passe</div>
      ${passwordSection}
      <div class="divider"></div>
      <div class="label">Code de pointage (4 chiffres)</div>
      <p style="font-size:13px;color:#6b7280;margin:4px 0 8px;">Pour pointer rapidement sans mot de passe</p>
      <div class="code-box">${user.code_secret}</div>
    </div>
    <div class="warning">
      <strong>⚠️ Important :</strong>
      <ul>
        <li>Conservez votre code de pointage en lieu sûr</li>
        <li>Ne partagez jamais vos identifiants</li>
        <li>Contactez l'administrateur en cas de problème</li>
      </ul>
    </div>
    <p style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'https://bubbletech-pointage-4kdx-one.vercel.app'}/login" class="button">Se connecter →</a>
    </p>
    <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
  </div>
  <div class="footer"><p>Email automatique BubbleTech Pointage — merci de ne pas répondre.</p></div>
</div></body></html>`;

    const result = await sendEmail({
      to: user.email,
      toName: `${user.prenom} ${user.nom}`,
      subject: '🎉 Bienvenue sur BubbleTech Pointage — Vos identifiants',
      html
    });

    if (result.success) console.log('📧 Email welcome envoyé à:', user.email);
    return result;
  }

  async sendPasswordResetCode(user, code) {
    const html = `<!DOCTYPE html>
<html><head><style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}
  .container{max-width:600px;margin:0 auto;padding:20px}
  .header{background:linear-gradient(135deg,#4F46E5,#0f766e);color:white;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .header h1{margin:0;font-size:22px}
  .content{background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none}
  .code-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:3px solid #4F46E5;padding:24px;text-align:center;font-size:42px;font-weight:bold;letter-spacing:12px;margin:20px 0;border-radius:12px;color:#1d4ed8;font-family:"Courier New",monospace}
  .info{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;font-size:13px}
  .warning{background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;font-size:13px}
  .button{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#4F46E5,#0f766e);color:white!important;text-decoration:none;border-radius:6px;margin:16px 0;font-weight:600;font-size:15px}
  .footer{text-align:center;margin-top:24px;color:#9ca3af;font-size:11px}
  .expire{color:#dc2626;font-weight:bold}
</style></head>
<body><div class="container">
  <div class="header">
    <h1>🔐 Réinitialisation de mot de passe</h1>
    <p style="margin:8px 0 0;opacity:0.9">BubbleTech Pointage</p>
  </div>
  <div class="content">
    <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
    <p>Voici votre code de vérification :</p>
    <div class="code-box">${code}</div>
    <div class="info">✅ Saisissez ce code sur la page de réinitialisation pour définir votre nouveau mot de passe.</div>
    <div class="warning">
      ⏱️ Ce code est valable <span class="expire">15 minutes</span> uniquement.<br>
      🚫 Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </div>
    <p style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'https://bubbletech-pointage-4kdx-one.vercel.app'}/forgot-password" class="button">Réinitialiser mon mot de passe →</a>
    </p>
    <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
  </div>
  <div class="footer"><p>Email automatique BubbleTech Pointage — merci de ne pas répondre.</p></div>
</div></body></html>`;

    const result = await sendEmail({
      to: user.email,
      toName: `${user.prenom} ${user.nom}`,
      subject: `🔐 Votre code de réinitialisation BubbleTech : ${code}`,
      html
    });

    if (result.success) console.log('📧 Code OTP envoyé à:', user.email);
    return result;
  }

  async sendPasswordResetEmail(user, newPassword) {
    return this.sendPasswordResetCode(user, newPassword);
  }
}

module.exports = new EmailService();
