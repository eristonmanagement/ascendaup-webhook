import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

app.post('/api/notificacoes', async (req, res) => {
  const body = req.body;

  console.log('🔔 Webhook recebido:', JSON.stringify(body, null, 2));

  try {
    if (body.type === 'payment' || body.type === 'preapproval') {
      const id = body.data.id;

      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      );

      const payer = response.data.payer || {};
      const email = payer.email || null;
      const nome = payer.first_name || 'Usuário MercadoPago';

      if (!email) {
        console.warn('⚠️ Email do comprador está vazio. Ignorando criação de usuário.');
        return res.sendStatus(200);
      }

      await admin.auth().getUserByEmail(email).catch(async (err) => {
        if (err.code === 'auth/user-not-found') {
          await admin.auth().createUser({ email, displayName: nome });
        }
      });

      await admin.firestore().collection('usuarios').doc(email).set({
        ativo: true,
        plano: 'mensal',
        origem: 'MercadoPago',
        criado_em: new Date()
      });

      console.log(`✅ Usuário ${email} inserido com sucesso no Firebase`);
      res.sendStatus(200);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('❌ Erro no webhook:', err.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.send('Ascenda Up Webhook online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
