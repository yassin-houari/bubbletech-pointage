const axios = require('axios');

class BrevoService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@bubbletech.be';
    this.senderName = process.env.BREVO_SENDER_NAME || 'BubbleTech Pointage';
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  // Méthode générique pour envoyer un email
  async sendEmail({ to, subject, htmlContent, textContent }) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          sender: {
            name: this.senderName,
            email: this.senderEmail
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent || this.stripHtml(htmlContent)
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Email envoyé avec succès à:', to);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi d\'email:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Email de bienvenue
  async sendWelcomeEmail(user, temporaryPassword) {
    const subject = '🎉 Bienvenue sur BubbleTech Pointage';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .code-box { background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 15px 0; border-radius: 4px; }
          .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenue sur BubbleTech Pointage !</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            
            <p>Votre compte a été créé avec succès. Voici vos informations de connexion :</p>
            
            <div class="credentials">
              <p><strong>Email :</strong> ${user.email}</p>
              <p><strong>Mot de passe temporaire :</strong></p>
              <div class="code-box">${temporaryPassword}</div>
              <p><strong>Code de pointage (4 chiffres) :</strong></p>
              <div class="code-box">${user.code_secret}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Important :</strong>
              <ul>
                <li>Vous devrez changer votre mot de passe lors de votre première connexion</li>
                <li>Conservez votre code de pointage en lieu sûr</li>
                <li>Ne partagez jamais vos identifiants</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Se connecter</a>
            </p>

            <p>Si vous avez des questions, n'hésitez pas à contacter l'administrateur.</p>
            
            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      htmlContent
    });
  }

  // Email de réinitialisation de mot de passe
  async sendPasswordResetEmail(user, newPassword) {
    const subject = '🔐 Réinitialisation de votre mot de passe';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .password-box { background-color: white; padding: 20px; border-left: 4px solid #DC2626; margin: 20px 0; text-align: center; }
          .code-box { background-color: #f0f0f0; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 15px 0; border-radius: 4px; }
          .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            
            <p>Votre mot de passe a été réinitialisé suite à votre demande.</p>
            
            <div class="password-box">
              <p><strong>Votre nouveau mot de passe temporaire :</strong></p>
              <div class="code-box">${newPassword}</div>
            </div>

            <div class="warning">
              <strong>⚠️ Sécurité :</strong>
              <ul>
                <li>Vous devrez changer ce mot de passe lors de votre prochaine connexion</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur</li>
                <li>Ce mot de passe est valable uniquement pour la première connexion</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Se connecter</a>
            </p>

            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      htmlContent
    });
  }

  // Email de notification d'absence
  async sendAbsenceNotification(user, date) {
    const subject = '⚠️ Absence détectée';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; border-left: 4px solid #F59E0B; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Absence détectée</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            
            <p>Nous avons remarqué que vous n'avez pas effectué de pointage le <strong>${date}</strong>.</p>
            
            <div class="info-box">
              <p>Si vous étiez absent(e) pour une raison valable, veuillez contacter votre manager ou les RH.</p>
              <p>Si vous avez oublié de pointer, pensez à régulariser votre situation.</p>
            </div>

            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      htmlContent
    });
  }

  // Email de rappel de pointage (journée en cours)
  async sendPointageReminderEmail(user, dateLabel) {
    const subject = '⏰ Rappel de pointage';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; border-left: 4px solid #2563EB; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Rappel de pointage</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
            <p>Nous n'avons détecté aucun pointage pour la journée du <strong>${dateLabel}</strong>.</p>
            <div class="info-box">
              <p>Merci d'effectuer votre check-in/check-out si vous êtes en activité aujourd'hui.</p>
            </div>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/pointage" class="button">Ouvrir le pointage</a>
            </p>
            <p>Cordialement,<br><strong>L'équipe BubbleTech</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      htmlContent
    });
  }

  // Alerte administrative quotidienne (synthèse absences)
  async sendAdminDailyAlertEmail(adminUser, { dateLabel, missingCount, sampleUsers }) {
    const subject = `🚨 Alerte administrateur - ${missingCount} absence(s) de pointage`;
    const sampleList = (sampleUsers || [])
      .map((u) => `<li>${u.prenom} ${u.nom} (${u.email})</li>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7C2D12; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .stat-box { background-color: white; padding: 20px; border-left: 4px solid #7C2D12; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #7C2D12; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Alerte administrative</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${adminUser.prenom} ${adminUser.nom}</strong>,</p>
            <div class="stat-box">
              <p><strong>Date:</strong> ${dateLabel}</p>
              <p><strong>Utilisateurs sans pointage:</strong> ${missingCount}</p>
            </div>
            ${sampleUsers && sampleUsers.length > 0 ? `<p>Exemples:</p><ul>${sampleList}</ul>` : ''}
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Ouvrir le dashboard</a>
            </p>
            <p>Cordialement,<br><strong>Système BubbleTech Pointage</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: adminUser.email,
      subject,
      htmlContent
    });
  }

  // Méthode utilitaire pour retirer les balises HTML
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new BrevoService();
