import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// Rota do webhook
app.post('/api/notificacoes', async (req, res) => {
  const body = req.body;

  console.log('📩 Webhook recebido:', JSON.stringify(body, null, 2));

  try {
    const id = body?.data?.id;
    const tipo = body?.type;

    if (!id || !tipo) {
      console.warn('❗ Payload incompleto.');
      return res.sendStatus(400);
    }

    if (tipo === 'payment') {
      // MOCK para testes sandbox — remove axios.get
      const response = {
        data: {
          payer: {
            email: `teste-${id}@ascendaup.com`,
            first_name: `Usuário ${id}`
          }
        }
      };

      const email = response.data.payer?.email;
      const nome = response.data.payer?.first_name;

      if (!email) {
        console.warn('⚠️ Pagamento sem email de comprador.');
        return res.sendStatus(400);
      }

      // Verifica se usuário já existe
      await admin.auth().getUserByEmail(email).catch(async (err) => {
        if (err.code === 'auth/user-not-found') {
          await admin.auth().createUser({ email, displayName: nome || 'Assinante Ascenda Up' });
          console.log(`✅ Usuário criado no Firebase: ${email}`);
        }
      });

      // Grava no Firestore
      await admin.firestore().collection('usuarios').doc(email).set({
        ativo: true,
        plano: 'mensal',
        origem: 'MercadoPago',
        criado_em: new Date()
      });

      console.log(`📌 Registro salvo no Firestore para: ${email}`);
      return res.sendStatus(200);
    }

    if (tipo === 'preapproval') {
      console.log('📦 Notificação preapproval recebida, mas ainda não tratada.');
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro no webhook:', err);
    return res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.send('Ascenda Up Webhook online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
