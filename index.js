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

  try {
    if (body.type === 'payment' || body.type === 'preapproval') {
      const id = body.data.id;

      // Tenta buscar o pagamento na API apenas se o ID for válido (simples verificação)
      let email = 'teste@ascendaup.com.br';
      let nome = 'Usuário de Teste';

      try {
        const response = await axios.get(
          `https://api.mercadopago.com/v1/payments/${id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
            }
          }
        );
        email = response.data.payer.email;
        nome = response.data.payer.first_name;
      } catch (erroApi) {
        console.log('⚠️ ID inválido ou não encontrado. Usando dados de teste.');
      }

      await admin.auth().getUserByEmail(email).catch(async (err) => {
        if (err.code === 'auth/user-not-found') {
          await admin.auth().createUser({ email, displayName: nome });
        }
      });

      await admin.firestore().collection('usuarios').doc(email).set({
        ativo: true,
        plano: 'mensal',
        origem: 'MercadoPago (sandbox)',
        criado_em: new Date()
      });

      console.log('✅ Webhook processado com sucesso.');
      res.sendStatus(200);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.send('Ascenda Up Webhook online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
