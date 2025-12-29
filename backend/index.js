const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const stream = require('stream');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// --- CONFIGURAÇÃO UPLOAD ---
const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadLocal = multer({ storage: storageLocal });
const uploadMemory = multer({ storage: multer.memoryStorage() });

const dynamicUpload = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config?.storageType === 'DRIVE') {
            uploadMemory.single('file')(req, res, next);
        } else {
            uploadLocal.single('file')(req, res, next);
        }
    } catch (e) { next(e); }
};

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

const sendEmail = async (to, subject, text, attachmentPath) => {
    const config = await prisma.systemConfig.findFirst();
    if (!config?.smtpHost) throw new Error("SMTP não configurado");
    const transporter = nodemailer.createTransport({
        host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPass }
    });
    return transporter.sendMail({
        from: `"CG Seguros" <${config.smtpUser}>`, to, subject, text,
        attachments: attachmentPath ? [{ path: attachmentPath }] : []
    });
};

// --- ROTAS DE DOCUMENTOS ---
app.post('/documents', dynamicUpload, async (req, res) => {
    try {
        const { nome, categoria, clientId, claimId } = req.body; // Adicionado claimId
        const file = req.file;
        if (!file) throw new Error("Nenhum arquivo enviado");

        const config = await prisma.systemConfig.findFirst();
        let finalUrl = '', finalType = 'LOCAL', finalPath = '';

        if (config?.storageType === 'DRIVE' && config.googleDriveJson) {
            const result = await uploadToDrive(file, config.googleFolderId, config.googleDriveJson);
            finalUrl = result.url; finalType = 'DRIVE';
        } else {
            const protocol = req.protocol; const host = req.get('host');
            finalUrl = `${protocol}://${host}/uploads/${file.filename}`;
            finalType = 'LOCAL'; finalPath = file.path;
        }

        const doc = await prisma.document.create({
            data: {
                nome, categoria, clientId: parseInt(clientId),
                claimId: claimId ? parseInt(claimId) : null,
                url: finalUrl, tipo: finalType, path: finalPath
            }
        });
        res.json(doc);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/clients/:id/documents', async (req, res) => {
    const docs = await prisma.document.findMany({ where: { clientId: parseInt(req.params.id) }, orderBy: { criadoEm: 'desc' } });
    res.json(docs);
});

app.post('/documents/:id/send-email', async (req, res) => {
    try {
        const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) }, include: { client: true } });
        if (doc.tipo === 'LOCAL' && doc.path) await sendEmail(doc.client.email, `Doc: ${doc.nome}`, `Olá,\nSegue anexo.`, doc.path);
        else await sendEmail(doc.client.email, `Doc: ${doc.nome}`, `Link: ${doc.url}`);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTAS DE SINISTROS (NOVO) ---
app.get('/claims', async (req, res) => {
    const claims = await prisma.claim.findMany({
        include: { client: true, policy: true },
        orderBy: { data_aviso: 'desc' }
    });
    res.json(claims);
});

app.post('/claims', async (req, res) => {
    try {
        const data = req.body;
        const claim = await prisma.claim.create({
            data: {
                status: data.status,
                tipo_sinistro: data.tipo_sinistro,
                descricao: data.descricao,
                data_ocorrencia: new Date(data.data_ocorrencia),
                oficina_nome: data.oficina_nome,
                oficina_tel: data.oficina_tel,
                terceiro_nome: data.terceiro_nome,
                terceiro_tel: data.terceiro_tel,
                placa_terceiro: data.placa_terceiro,
                valor_franquia: parseFloat(data.valor_franquia || 0),
                valor_orcamento: parseFloat(data.valor_orcamento || 0),
                clientId: parseInt(data.clientId),
                policyId: data.policyId ? parseInt(data.policyId) : null
            }
        });
        res.json(claim);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/claims/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const claim = await prisma.claim.update({
            where: { id: parseInt(id) },
            data: { 
                status: data.status,
                valor_final: data.valor_final ? parseFloat(data.valor_final) : undefined
            }
        });
        res.json(claim);
    } catch(e) { res.status(500).json({erro: e.message}); }
});

// Estatísticas de Sinistros
app.get('/claims-stats', async (req, res) => {
    const total = await prisma.claim.count();
    const abertos = await prisma.claim.count({ where: { status: { notIn: ['CONCLUIDO', 'NEGADO'] } } });
    const concluidos = await prisma.claim.count({ where: { status: 'CONCLUIDO' } });
    
    // Agrupar por mês (Simplificado)
    const claims = await prisma.claim.findMany({ select: { data_aviso: true } });
    const porMes = {};
    claims.forEach(c => {
        const mes = new Date(c.data_aviso).toLocaleString('pt-BR', { month: 'short' });
        porMes[mes] = (porMes[mes] || 0) + 1;
    });

    res.json({ total, abertos, concluidos, labels: Object.keys(porMes), data: Object.values(porMes) });
});

// --- ROTAS GERAIS ---
app.post('/config', async (req, res) => {
    try {
        const data = req.body;
        let driveJson = data.googleDriveJson ? JSON.parse(data.googleDriveJson) : undefined;
        await prisma.systemConfig.upsert({
            where: { id: 1 },
            update: { ...data, googleDriveJson: driveJson },
            create: { ...data, googleDriveJson: driveJson }
        });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/config', async (req, res) => { const c = await prisma.systemConfig.findFirst(); res.json(c || {}); });
app.get('/clients', async (req, res) => { const c = await prisma.client.findMany({ orderBy: { nome: 'asc' } }); res.json(c); });
app.post('/clients', async (req, res) => { try { const c = await prisma.client.create({ data: req.body }); res.json(c); } catch(e) { res.status(400).json({erro: "Erro"}); } });
app.get('/policies', async (req, res) => { const p = await prisma.policy.findMany({ include: { client: true }, orderBy: { id: 'desc' } }); res.json(p); });
app.post('/policies', async (req, res) => { res.json({ok:true}); }); 
app.get('/dashboard-stats', async (req, res) => {
    const totalClients = await prisma.client.count();
    const activePolicies = await prisma.policy.count({ where: { status: 'ATIVA' } });
    const newLeads = await prisma.lead.count({ where: { status: 'NOVO' } });
    const expiring = await prisma.policy.count({ where: { data_fim: { gte: new Date(), lte: new Date(new Date().setDate(new Date().getDate() + 30)) } } });
    res.json({ totalClients, activePolicies, newLeads, expiring });
});
app.get('/dashboard-charts', async (req, res) => { res.json({ labels: ['Auto', 'Vida'], distribuicao: [10, 5], receitaTotal: 1000, comissaoTotal: 100 }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));