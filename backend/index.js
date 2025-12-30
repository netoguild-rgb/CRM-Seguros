require('dotenv').config(); // LINHA ADICIONADA: Carrega variáveis do .env
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

// Configuração de Pastas e Segurança
const DEFAULT_UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DEFAULT_UPLOAD_DIR)) fs.mkdirSync(DEFAULT_UPLOAD_DIR);

app.use(cors());
app.use(express.json());

// --- SERVIDOR DE ARQUIVOS ---
app.get('/files/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const config = await prisma.systemConfig.findFirst();
        const targetDir = (config?.localPath && config.localPath.trim() !== '') ? config.localPath : DEFAULT_UPLOAD_DIR;
        const filePath = path.join(targetDir, filename);
        if (fs.existsSync(filePath)) res.sendFile(filePath);
        else {
            const fallback = path.join(DEFAULT_UPLOAD_DIR, filename);
            if(fs.existsSync(fallback)) res.sendFile(fallback); else res.status(404).send('Arquivo não encontrado');
        }
    } catch (e) { res.status(500).send('Erro interno'); }
});

// --- UPLOAD HANDLERS ---
const storageLocal = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const config = await prisma.systemConfig.findFirst();
      let targetDir = DEFAULT_UPLOAD_DIR;
      if (config?.localPath && config.localPath.trim() !== '') targetDir = config.localPath;
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    } catch (e) { cb(e); }
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});
const uploadLocal = multer({ storage: storageLocal });
const uploadMemory = multer({ storage: multer.memoryStorage() });
const dynamicUpload = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config?.storageType === 'DRIVE') uploadMemory.single('file')(req, res, next);
        else uploadLocal.single('file')(req, res, next);
    } catch (e) { next(e); }
};

const uploadToDrive = async (fileObject, folderId, credentials) => {
  const auth = new google.auth.JWT(credentials.client_email, null, credentials.private_key, ['https://www.googleapis.com/auth/drive.file']);
  const drive = google.drive({ version: 'v3', auth });
  const bufferStream = new stream.PassThrough(); bufferStream.end(fileObject.buffer);
  const response = await drive.files.create({
    requestBody: { name: fileObject.originalname, parents: [folderId] },
    media: { mimeType: fileObject.mimetype, body: bufferStream },
    fields: 'id, webViewLink'
  });
  return { id: response.data.id, url: response.data.webViewLink };
};

const sendEmail = async (to, subject, text, attachmentPath) => {
    const config = await prisma.systemConfig.findFirst();
    if (!config?.smtpHost) throw new Error("SMTP Off");
    const transporter = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure, auth: { user: config.smtpUser, pass: config.smtpPass } });
    return transporter.sendMail({ from: `"CG Seguros" <${config.smtpUser}>`, to, subject, text, attachments: attachmentPath ? [{ path: attachmentPath }] : [] });
};

// --- ROTAS INTELIGENTES (DASHBOARD & ANALYTICS) ---

// Dashboard Salesforce-style: Agrega dados para gráficos e KPIs em uma única chamada
app.get('/dashboard-stats', async (req, res) => {
    try {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        // KPIs
        const totalClients = await prisma.client.count();
        const activePolicies = await prisma.policy.count({ where: { status: 'ATIVA' } });
        const newLeads = await prisma.lead.count({ where: { status: 'NOVO' } });
        
        // Receita do Mês
        const revenueData = await prisma.financialRecord.aggregate({
            _sum: { amount: true },
            where: { type: 'RECEITA', status: 'PAGO', dueDate: { gte: inicioMes, lte: fimMes } }
        });

        // Dados para o Funil de Vendas (Gráfico de Barras)
        const leadsByStatus = await prisma.lead.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        // Dados para Histórico Financeiro (Gráfico de Linha - Últimos 6 meses)
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        const financialHistory = await prisma.financialRecord.findMany({
            where: { type: 'RECEITA', status: 'PAGO', dueDate: { gte: sixMonthsAgo } },
            select: { amount: true, dueDate: true }
        });

        // Agenda Próxima (Alertas)
        const upcomingAgenda = await prisma.appointment.findMany({
            where: { date: { gte: new Date() }, status: { not: 'CANCELADO' } },
            take: 5,
            orderBy: { date: 'asc' },
            include: { client: { select: { nome: true } } }
        });

        // Leads Recentes
        const recentLeads = await prisma.lead.findMany({
            take: 5,
            orderBy: { criadoEm: 'desc' }
        });

        res.json({
            kpi: { totalClients, activePolicies, newLeads, monthlyRevenue: revenueData._sum.amount || 0 },
            charts: { leadsByStatus, financialHistory },
            lists: { upcomingAgenda, recentLeads }
        });
    } catch (e) {
        console.error("Erro Dashboard:", e);
        res.status(500).json({ error: "Erro ao carregar dados" });
    }
});

// --- GESTÃO DE LEADS (PIPELINE) ---
app.get('/leads', async (req, res) => { const l = await prisma.lead.findMany({ orderBy: { criadoEm: 'desc' } }); res.json(l); });
app.post('/leads', async (req, res) => {
    try {
        const d = req.body;
        // Mapeamento Inteligente do Typebot
        const lead = await prisma.lead.create({ data: {
            nome: d.Nome_completo || d.nome || 'Lead', whatsapp: d.whatsapp, tipo_seguro: d.tipo_seguro, obs_final: d.obs_final,
            capital_vida: d.capital_vida, profissao: d.profissao, motivo_vida: d.motivo_vida, preferencia_rede: d.preferencia_rede,
            idades_saude: d.idades_saude, plano_saude: d.plano_saude, cobertura_roubo: d.cobertura_roubo, cobertura_terceiros: d.cobertura_terceiros,
            carro_reserva: d.carro_reserva, km_guincho: d.km_guincho, renavan: d.renavan, placa: d.placa, ano_do_veiculo: d.ano_do_veiculo,
            modelo_veiculo: d.modelo_veiculo, uso_veiculo: d.uso_veiculo, idade_do_condutor: d.idade_do_condutor, condutor_principal: d.condutor_principal,
            status: "NOVO"
        }});
        res.json(lead);
    } catch(e) { res.status(500).json({erro: e.message}); }
});
app.put('/leads/:id', async (req, res) => { try { await prisma.lead.update({ where: { id: parseInt(req.params.id) }, data: req.body }); res.json({ok:true}); } catch(e){ res.status(500).json({erro:e.message}); } });
app.delete('/leads/:id', async (req, res) => { await prisma.lead.delete({ where: { id: parseInt(req.params.id) } }); res.json({ok:true}); });

// --- OUTROS MÓDULOS (AGENDA, FINANCEIRO, CLIENTES...) ---
app.get('/appointments', async (req, res) => { const { start, end } = req.query; let where = {}; if (start && end) where.date = { gte: new Date(start), lte: new Date(end) }; const apps = await prisma.appointment.findMany({ where, include: { client: true }, orderBy: { date: 'asc' } }); res.json(apps); });
app.post('/appointments', async (req, res) => { try { const d = req.body; const app = await prisma.appointment.create({ data: { title: d.title, description: d.description, date: new Date(d.date), type: d.type, clientId: d.clientId ? parseInt(d.clientId) : null } }); res.json(app); } catch(e) { res.status(500).json({erro: e.message}); } });
app.put('/appointments/:id', async (req, res) => { try { await prisma.appointment.update({ where: { id: parseInt(req.params.id) }, data: req.body }); res.json({ok:true}); } catch(e){ res.status(500).json({erro:e.message}); } });
app.delete('/appointments/:id', async(req,res)=>{ await prisma.appointment.delete({where:{id:parseInt(req.params.id)}}); res.json({ok:true}); });

app.get('/financial', async (req, res) => { const r = await prisma.financialRecord.findMany({ orderBy: { dueDate: 'asc' } }); res.json(r); });
app.post('/financial', async (req, res) => { try { const d = req.body; const r = await prisma.financialRecord.create({ data: { ...d, amount: parseFloat(d.amount), dueDate: new Date(d.dueDate) } }); res.json(r); } catch(e) { res.status(500).json({erro: e.message}); } });
app.put('/financial/:id', async (req, res) => { await prisma.financialRecord.update({ where: { id: parseInt(req.params.id) }, data: req.body }); res.json({ ok: true }); });
app.delete('/financial/:id', async(req,res)=>{ await prisma.financialRecord.delete({where:{id:parseInt(req.params.id)}}); res.json({ok:true}); });
app.get('/financial-stats', async (req, res) => { const r = await prisma.financialRecord.findMany(); let re=0, de=0, p=0; r.forEach(x=>{ if(x.type==='RECEITA'&&x.status==='PAGO') re+=x.amount; if(x.type==='DESPESA'&&x.status==='PAGO') de+=x.amount; if(x.status==='PENDENTE') p+=x.amount; }); res.json({receita:re, despesa:de, saldo:re-de, pendente:p}); });

app.get('/clients', async (req, res) => { const c = await prisma.client.findMany({ orderBy: { nome: 'asc' } }); res.json(c); });
app.post('/clients', async (req, res) => { try { const d = req.body; const c = await prisma.client.create({ data: { ...d, preferences: d.preferences?(typeof d.preferences==='string'?JSON.parse(d.preferences):d.preferences):{}, questionnaires: d.questionnaires?(typeof d.questionnaires==='string'?JSON.parse(d.questionnaires):d.questionnaires):{} } }); res.json(c); } catch(e) { res.status(400).json({erro: "Erro"}); } });
app.put('/clients/:id', async (req, res) => { try { await prisma.client.update({ where: { id: parseInt(req.params.id) }, data: req.body }); res.json({ok:true}); } catch(e){ res.status(500).json({erro:e.message}); } });

app.post('/documents', dynamicUpload, async (req, res) => { try{ const {nome,categoria,clientId}=req.body; const f=req.file; if(!f)throw new Error("Sem arquivo"); const cfg=await prisma.systemConfig.findFirst(); let url='', type='LOCAL', p=f.path; if(cfg?.storageType==='DRIVE' && cfg.googleDriveJson){ const r=await uploadToDrive(f,cfg.googleFolderId,cfg.googleDriveJson); url=r.url; type='DRIVE'; }else{ url=`${req.protocol}://${req.get('host')}/files/${f.filename}`; } await prisma.document.create({data:{nome,categoria,clientId:parseInt(clientId),url,type,path:p}}); res.json({ok:true}); }catch(e){res.status(500).json({erro:e.message});} });
app.get('/clients/:id/documents', async(req,res)=>{ const d=await prisma.document.findMany({where:{clientId:parseInt(req.params.id)},orderBy:{criadoEm:'desc'}}); res.json(d); });
app.post('/documents/:id/send-email', async(req,res)=>{ try{ const d=await prisma.document.findUnique({where:{id:parseInt(req.params.id)},include:{client:true}}); if(d.type==='LOCAL'&&d.path) await sendEmail(d.client.email,`Doc: ${d.nome}`,'Segue anexo',d.path); else await sendEmail(d.client.email,`Doc`,`Link: ${d.url}`); res.json({ok:true}); }catch(e){res.status(500).json({erro:e.message});} });

app.get('/policies', async(req,res)=>{ const p=await prisma.policy.findMany({include:{client:true, user:true}, orderBy:{id:'desc'}}); res.json(p); });
app.post('/policies', dynamicUpload, async(req,res)=>{ try{const d=req.body; const f=req.file; let u=null; if(f) u=`${req.protocol}://${req.get('host')}/files/${f.filename}`; await prisma.policy.create({data:{numero:d.numero, tipo_seguro:d.tipo_seguro, status:d.status, data_inicio:new Date(d.data_inicio), data_fim:new Date(d.data_fim), premio_liquido:parseFloat(d.premio||0), comissao_total:parseFloat(d.comissao||0), clientId:parseInt(d.clientId), userId: d.userId?parseInt(d.userId):null, pdf_url:u}}); res.json({ok:true});}catch(e){res.status(500).json({erro:e.message});}});

app.get('/claims', async(req,res)=>{ const c=await prisma.claim.findMany({include:{client:true},orderBy:{data_aviso:'desc'}}); res.json(c); });
app.post('/claims', async(req,res)=>{ try{ const d=req.body; const c=await prisma.claim.create({data:{status:d.status, tipo_sinistro:d.tipo_sinistro, descricao:d.descricao, data_ocorrencia:new Date(d.data_ocorrencia), oficina_nome:d.oficina_nome, oficina_tel:d.oficina_tel, terceiro_nome:d.terceiro_nome, terceiro_tel:d.terceiro_tel, placa_terceiro:d.placa_terceiro, valor_franquia:parseFloat(d.valor_franquia||0), valor_orcamento:parseFloat(d.valor_orcamento||0), clientId:parseInt(d.clientId)}}); res.json(c); }catch(e){res.status(500).json({erro:e.message});} });

app.get('/producer-stats', async (req, res) => { const { userId, mes, ano } = req.query; let w = { status: 'ATIVA' }; if (userId && userId!=='') w.userId = parseInt(userId); if (mes && ano) { const i = new Date(parseInt(ano), parseInt(mes) - 1, 1); const f = new Date(parseInt(ano), parseInt(mes), 0); w.data_inicio = { gte: i, lte: f }; } const p = await prisma.policy.findMany({ where: w, include: { client: true, user: true } }); let tp = 0, tc = 0; const l = p.map(x => { const pr = x.premio_liquido || 0; const c = (pr * (x.user ? x.user.comissao : 0)) / 100; tp += pr; tc += c; return { ...x, comissao_produtor: c }; }); res.json({ resumo: { vendas: p.length, premio: tp, comissao: tc }, lista: l }); });
app.post('/login', async (req, res) => { const { email, senha } = req.body; const u = await prisma.user.findUnique({ where: { email } }); if (!u || u.senha !== senha) return res.status(401).json({ erro: "Erro" }); res.json(u); });
app.post('/users', async (req, res) => { try{ const d=req.body; const c=await prisma.user.count(); const p=c===0?'ADMIN':(d.perfil||'PRODUTOR'); const u=await prisma.user.create({data:{...d, perfil:p, comissao:parseFloat(d.comissao||10)}}); res.json(u); }catch(e){res.status(400).json({erro:"Erro"});} });
app.get('/users', async (req, res) => { const u = await prisma.user.findMany({orderBy:{nome:'asc'}}); res.json(u); });
app.post('/config', async (req, res) => { try{ const d=req.body; let j=d.googleDriveJson?JSON.parse(d.googleDriveJson):undefined; await prisma.systemConfig.upsert({where:{id:1},update:{...d, googleDriveJson:j},create:{...d, googleDriveJson:j}}); res.json({ok:true}); }catch(e){res.status(500).json({erro:e.message});} });
app.get('/config', async (req, res) => { const c = await prisma.systemConfig.findFirst(); res.json(c||{}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));