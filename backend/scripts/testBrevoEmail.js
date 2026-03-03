require('dotenv').config();

const brevoService = require('../services/brevoService');

const run = async () => {
  const to = process.env.BREVO_TEST_TO_EMAIL || 'yassinhoua123@gmail.com';

  if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY.includes('votre_cle_api_brevo')) {
    console.error('❌ BREVO_API_KEY manquante ou invalide dans backend/.env');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  const result = await brevoService.sendEmail({
    to,
    subject: `✅ Test réel Brevo - BubbleTech (${timestamp})`,
    htmlContent: `
      <h2>Test réel Brevo</h2>
      <p>Cet email confirme que l'envoi Brevo fonctionne en environnement réel.</p>
      <p><strong>Destinataire:</strong> ${to}</p>
      <p><strong>Date:</strong> ${timestamp}</p>
    `,
    textContent: `Test réel Brevo\nDestinataire: ${to}\nDate: ${timestamp}`
  });

  if (!result.success) {
    console.error('❌ Envoi Brevo échoué:', result.error);
    process.exit(1);
  }

  console.log(`✅ Email réel envoyé à ${to}`);
  console.log('📨 Message ID:', result.messageId || 'n/a');
};

run().catch((error) => {
  console.error('❌ Erreur test Brevo réel:', error.message);
  process.exit(1);
});
