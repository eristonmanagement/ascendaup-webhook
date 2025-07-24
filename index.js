import express from 'express';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import cors from 'cors';

import 'dotenv/config';


const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

// Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor AscendaUP Webhook rodando 🚀');
});

// Webhook
app.post('/api/notificacoes', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:');
    console.log(JSON.stringify(req.body, null, 2));

    const { action, type, data, user_id } = req.body;

    // Exemplo: assinatura aprovada
    if (type === 'subscription_preapproval' && action === 'created') {
      const preapproval_id = data.id;

      await db.collection('assinaturas').doc(preapproval_id).set({
        preapproval_id,
        user_id,
        status: 'ativa',
        origem: 'webhook',
        criado_em: new Date().toISOString(),
      });

      console.log(`✅ Assinatura salva: ${preapproval_id}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
