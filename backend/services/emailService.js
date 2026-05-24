const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'yassinhoua123@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  async sendWelcomeEmail(user, temporaryPassword) {
    const passwordSection = temporaryPassword
      ? `<p><strong>Mot de passe temporaire :</strong></p>
         <div class="code-box">${temporaryPassword}</div>
         <p style="color:#DC2626;font-size:0.9em;">⚠️ Changez ce mot de passe lors de votre première connexion.</p>`
      : `<p><em>Votre mot de passe a été défini par l'administrateur.</em></p>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #0f766e); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p  { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; border-radius: 0 6px 6px 0; }
          .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .value { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 16px; }
          .code-box { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 2px solid #0f766e; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 12px 0; border-radius: 8px; color: #0f766e; }
          .divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
          .warning ul { margin: 8px 0 0; padding-left: 20px; }
          .warning li { margin-bottom: 4px; font-size: 14px; }
          .button { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #4F46E5, #0f766e); color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 600; font-size: 15px; }
          .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
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
              <a href="${process.env.FRONTEND_URL || 'https://bubbletech-pointage-4kdx-one.vercel.app'}/login" class="button">
                Se connecter →
              </a>
            </p>

            <p style="font-size:14px;color:#6b7280;">Si vous avez des questions, contactez votre administrateur.</p>
            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par BubbleTech Pointage — merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"BubbleTech Pointage" <${process.env.GMAIL_USER || 'yassinhoua123@gmail.com'}>`,
        to: user.email,
        subject: '🎉 Bienvenue sur BubbleTech Pointage — Vos identifiants',
        html
      });
      console.log('📧 Email envoyé à:', user.email, '| id:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erreur envoi email à', user.email, ':', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(user, newPassword) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .code-box { background: #fee2e2; border: 2px solid #DC2626; padding: 16px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 4px; margin: 12px 0; border-radius: 8px; color: #DC2626; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 32px; background: #DC2626; color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🔐 Réinitialisation de mot de passe</h1></div>
          <div class="content">
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            <p>Votre nouveau mot de passe temporaire :</p>
            <div class="code-box">${newPassword}</div>
            <div class="warning">
              <strong>⚠️ Sécurité :</strong>
              <ul>
                <li>Changez ce mot de passe dès votre prochaine connexion</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, contactez l'administrateur immédiatement</li>
              </ul>
            </div>
            <p style="text-align:center;">
              <a href="${process.env.FRONTEND_URL || 'https://bubbletech-pointage-4kdx-one.vercel.app'}/login" class="button">Se connecter →</a>
            </p>
            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"BubbleTech Pointage" <${process.env.GMAIL_USER || 'yassinhoua123@gmail.com'}>`,
        to: user.email,
        subject: '🔐 Réinitialisation de votre mot de passe BubbleTech',
        html
      });
      console.log('📧 Email reset envoyé à:', user.email);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erreur reset email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
