// ARQUIVO: backend/index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const stream = require('stream');

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// --- FUNÇÃO GOOGLE DRIVE ---
const uploadToDrive = async (fileObject, folderId, credentials) => {
  const auth = new google.auth.JWT(
    credentials.client_email, null, credentials.private_key, ['https://www.googleapis.com/auth/drive.file']
  );
  const drive = google.drive({ version: 'v3', auth });
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);

  const response = await drive.files.create({
    requestBody: { name: fileObject.originalname, parents: [folderId] },
    media: { mimeType: fileObject.mimetype, body: bufferStream },
    fields: 'id, webViewLink'
  });
  return { id: response.data.id, url: response.data.webViewLink };
};

// --- ROTA 1: LEADS (TYPEBOT) ---
app.post('/leads', async (req, res) => {
  try {
    const dados = req.body;
    console.log("Novo Lead:", dados.nome);

    let whatsLimpo = "00000000000";
    if (dados.whatsapp || dados.telefone) {
        whatsLimpo = (dados.whatsapp || dados.telefone).toString().replace(/\D/g, '');
    }

    const lead = await prisma.lead.create({
      data: {
        nome:           dados.nome || dados.name || "Sem Nome",
        whatsapp:       whatsLimpo,
        email:          dados.email || dados.mail,
        cpf:            dados.cpf,
        status:         "NOVO",
        tipo_seguro:    dados.tipo_seguro,
        placa:          dados.placa,
        modelo_veiculo: dados.modelo_veiculo,
        ano_veiculo:    dados.ano_do_veiculo || dados.ano_veiculo,
        uso_veiculo:    dados.uso_veiculo,
        dados_extras:   dados 
      }
    });
    res.json({ sucesso: true, id: lead.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: error.message });
  }
});

// --- ROTA 2: CLIENTES ---
app.get('/clients', async (req, res) => {
    const clients = await prisma.client.findMany({ orderBy: { nome: 'asc' } });
    res.json(clients);
});

app.post('/clients', async (req, res) => {
    try {
        const client = await prisma.client.create({ data: req.body });
        res.json(client);
    } catch(e) { res.status(400).json({erro: "Erro ao criar cliente"}); }
});

// --- ROTA 3: APÓLICES (COM UPLOAD) ---
app.get('/policies', async (req, res) => {
    const policies = await prisma.policy.findMany({ include: { client: true }, orderBy: { id: 'desc' } });
    res.json(policies);
});

app.post('/policies', upload.single('pdf_apolice'), async (req, res) => {
  try {
    const dados = req.body;
    const file = req.file;
    
    // Busca config do Drive
    const config = await prisma.systemConfig.findFirst();
    let pdfUrl = null, pdfId = null;

    if (file && config?.googleDriveJson) {
      console.log("Enviando PDF para o Drive...");
      const result = await uploadToDrive(file, config.googleFolderId, config.googleDriveJson);
      pdfUrl = result.url;
      pdfId = result.id;
    }

    const policy = await prisma.policy.create({
      data: {
        numero: dados.numero,
        tipo_seguro: dados.tipo_seguro,
        status: dados.status || 'ATIVA',
        data_inicio: new Date(dados.data_inicio),
        data_fim: new Date(dados.data_fim),
        premio_liquido: parseFloat(dados.premio || 0),
        comissao: parseFloat(dados.comissao || 0),
        clientId: parseInt(dados.clientId),
        pdf_url: pdfUrl,
        pdf_file_id: pdfId
      }
    });
    res.json(policy);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTA 4: CONFIGURAÇÕES E DASHBOARD ---
app.post('/config/drive', async (req, res) => {
  try {
    const { folderId, credentialsJson } = req.body;
    await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: { googleFolderId: folderId, googleDriveJson: JSON.parse(credentialsJson) },
      create: { googleFolderId: folderId, googleDriveJson: JSON.parse(credentialsJson) }
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: "JSON Inválido" }); }
});

app.get('/dashboard-stats', async (req, res) => {
    const totalClients = await prisma.client.count();
    const activePolicies = await prisma.policy.count({ where: { status: 'ATIVA' } });
    const newLeads = await prisma.lead.count({ where: { status: 'NOVO' } });
    const today = new Date();
    const in30days = new Date();
    in30days.setDate(today.getDate() + 30);
    const expiring = await prisma.policy.count({
        where: { data_fim: { gte: today, lte: in30days } }
    });
    res.json({ totalClients, activePolicies, newLeads, expiring });
});

// Rota padrão
app.get('/', (req, res) => res.send('CRM Online - Conectado ao Neon 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));