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

// --- UPLOAD CONFIG ---
const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
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

// --- FUNÇÕES AUXILIARES ---
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
    const transporter = nodemailer.createTransport({
        host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPass }
    });
    return transporter.sendMail({ from: `"CG Seguros" <${config.smtpUser}>`, to, subject, text, attachments: attachmentPath ? [{ path: attachmentPath }] : [] });
};

// ================= ROTAS DE LOGIN E USUÁRIOS =================

// Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.senha !== senha) return res.status(401).json({ erro: "Acesso negado" });
    res.json(user);
});

// Criar Usuário (Para Admin ou Primeiro Acesso)
app.post('/users', async (req, res) => {
    try {
        const data = req.body;
        // Verifica se é o primeiro usuário do sistema (vira ADMIN automático)
        const count = await prisma.user.count();
        const perfil = count === 0 ? 'ADMIN' : (data.perfil || 'PRODUTOR');
        
        const user = await prisma.user.create({
            data: {
                nome: data.nome, email: data.email, senha: data.senha,
                perfil: perfil, comissao: parseFloat(data.comissao || 10)
            }
        });
        res.json(user);
    } catch (e) { res.status(400).json({ erro: "Erro ao criar usuário. Email já existe?" }); }
});

// Listar Usuários
app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({ orderBy: { nome: 'asc' } });
    res.json(users);
});

// ================= ROTA DE EXTRATO FINANCEIRO =================
app.get('/producer-stats', async (req, res) => {
    const { userId, mes, ano } = req.query;
    
    let whereClause = { status: 'ATIVA' };
    if (userId && userId !== 'null' && userId !== '') whereClause.userId = parseInt(userId);
    
    if (mes && ano) {
        const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const fim = new Date(parseInt(ano), parseInt(mes), 0);
        whereClause.data_inicio = { gte: inicio, lte: fim };
    }

    const policies = await prisma.policy.findMany({
        where: whereClause,
        include: { client: true, user: true }
    });

    let totalPremio = 0;
    let totalComissao = 0;
    
    const lista = policies.map(p => {
        const premio = p.premio_liquido || 0;
        const percentual = p.user ? p.user.comissao : 0;
        const comissao = (premio * percentual) / 100;
        
        totalPremio += premio;
        totalComissao += comissao;

        return { ...p, comissao_produtor: comissao };
    });

    res.json({ resumo: { vendas: policies.length, premio: totalPremio, comissao: totalComissao }, lista });
});

// ================= ROTAS PADRÃO (CLIENTES, APÓLICES, ETC) =================

app.post('/documents', dynamicUpload, async (req, res) => {
    try {
        const { nome, categoria, clientId, claimId } = req.body;
        const file = req.file; if(!file) throw new Error("Sem arquivo");
        const config = await prisma.systemConfig.findFirst();
        let finalUrl='', finalType='LOCAL', finalPath='';

        if (config?.storageType === 'DRIVE' && config.googleDriveJson) {
            const r = await uploadToDrive(file, config.googleFolderId, config.googleDriveJson);
            finalUrl = r.url; finalType = 'DRIVE';
        } else {
            finalUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            finalType = 'LOCAL'; finalPath = file.path;
        }
        const doc = await prisma.document.create({
            data: { nome, categoria, clientId: parseInt(clientId), claimId: claimId?parseInt(claimId):null, url: finalUrl, tipo: finalType, path: finalPath }
        });
        res.json(doc);
    } catch(e){ res.status(500).json({erro:e.message}); }
});

app.get('/clients/:id/documents', async(req,res)=>{ const d=await prisma.document.findMany({where:{clientId:parseInt(req.params.id)},orderBy:{criadoEm:'desc'}}); res.json(d); });
app.post('/documents/:id/send-email', async(req,res)=>{ try{ const d=await prisma.document.findUnique({where:{id:parseInt(req.params.id)},include:{client:true}}); if(d.tipo==='LOCAL'&&d.path) await sendEmail(d.client.email,`Doc: ${d.nome}`,'Segue anexo',d.path); else await sendEmail(d.client.email,`Doc`,`Link: ${d.url}`); res.json({ok:true}); }catch(e){res.status(500).json({erro:e.message});} });

app.get('/claims', async(req,res)=>{ const c=await prisma.claim.findMany({include:{client:true},orderBy:{data_aviso:'desc'}}); res.json(c); });
app.post('/claims', async(req,res)=>{ try{ const d=req.body; const c=await prisma.claim.create({data:{status:d.status, tipo_sinistro:d.tipo_sinistro, descricao:d.descricao, data_ocorrencia:new Date(d.data_ocorrencia), oficina_nome:d.oficina_nome, oficina_tel:d.oficina_tel, terceiro_nome:d.terceiro_nome, terceiro_tel:d.terceiro_tel, placa_terceiro:d.placa_terceiro, valor_franquia:parseFloat(d.valor_franquia||0), valor_orcamento:parseFloat(d.valor_orcamento||0), clientId:parseInt(d.clientId)}}); res.json(c); }catch(e){res.status(500).json({erro:e.message});} });
app.put('/claims/:id', async(req,res)=>{ const {id}=req.params; const d=req.body; const c=await prisma.claim.update({where:{id:parseInt(id)},data:{status:d.status}}); res.json(c); });
app.get('/claims-stats', async(req,res)=>{ const t=await prisma.claim.count(); const a=await prisma.claim.count({where:{status:{notIn:['CONCLUIDO','NEGADO']}}}); const c=await prisma.claim.count({where:{status:'CONCLUIDO'}}); const l=await prisma.claim.findMany({select:{data_aviso:true}}); const m={}; l.forEach(x=>{ const mo=new Date(x.data_aviso).toLocaleString('pt',{month:'short'}); m[mo]=(m[mo]||0)+1; }); res.json({total:t, abertos:a, concluidos:c, labels:Object.keys(m), data:Object.values(m)}); });

app.post('/config', async(req,res)=>{ try{ const d=req.body; let j=d.googleDriveJson?JSON.parse(d.googleDriveJson):undefined; await prisma.systemConfig.upsert({where:{id:1},update:{...d, googleDriveJson:j},create:{...d, googleDriveJson:j}}); res.json({ok:true}); }catch(e){res.status(500).json({erro:e.message});} });
app.get('/config', async(req,res)=>{ const c=await prisma.systemConfig.findFirst(); res.json(c||{}); });

app.get('/clients', async(req,res)=>{ const c=await prisma.client.findMany({orderBy:{nome:'asc'}}); res.json(c); });
app.post('/clients', async(req,res)=>{ try{const c=await prisma.client.create({data:req.body}); res.json(c);}catch(e){res.status(400).json({erro:'Erro'});} });

app.get('/policies', async(req,res)=>{ const p=await prisma.policy.findMany({include:{client:true, user:true}, orderBy:{id:'desc'}}); res.json(p); });
app.post('/policies', dynamicUpload, async(req,res)=>{ 
    try{
        const d=req.body; const f=req.file;
        let pdfUrl=null; if(f) pdfUrl=`${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
        await prisma.policy.create({
            data:{
                numero:d.numero, tipo_seguro:d.tipo_seguro, status:d.status,
                data_inicio:new Date(d.data_inicio), data_fim:new Date(d.data_fim),
                premio_liquido:parseFloat(d.premio||0), comissao_total:parseFloat(d.comissao||0),
                clientId:parseInt(d.clientId), userId: d.userId?parseInt(d.userId):null,
                pdf_url:pdfUrl
            }
        });
        res.json({ok:true});
    }catch(e){res.status(500).json({erro:e.message});}
});

app.get('/dashboard-stats', async(req,res)=>{ 
    const t=await prisma.client.count(); const a=await prisma.policy.count({where:{status:'ATIVA'}}); const n=await prisma.lead.count({where:{status:'NOVO'}}); const e=await prisma.policy.count({where:{data_fim:{gte:new Date(),lte:new Date(new Date().setDate(new Date().getDate()+30))}}}); 
    res.json({totalClients:t, activePolicies:a, newLeads:n, expiring:e}); 
});
app.get('/dashboard-charts', async(req,res)=>{ res.json({labels:['Auto','Vida'],distribuicao:[10,5],receitaTotal:1000,comissaoTotal:100}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));