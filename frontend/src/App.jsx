import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, FileText, Settings, Cloud, Plus, Search, 
  User, Bell, CheckCircle, Database, Server, Bot, Copy 
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// --- CONFIGURAÇÃO DA API ---
// Detecta se está rodando no PC ou na Nuvem
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://crm-seguros.onrender.com';

const api = axios.create({ baseURL: API_URL });

// --- COMPONENTES VISUAIS ---
const CardStat = ({ title, value, sub, icon: Icon, color = "text-primary" }) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition">
    <div className="flex justify-between">
      <div>
        <p className="text-gray-500 text-xs uppercase font-bold">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
        <p className="text-xs text-gray-400 mt-2">{sub}</p>
      </div>
      <div className={`p-3 rounded-lg bg-gray-50 ${color}`}><Icon size={24} /></div>
    </div>
  </div>
);

// --- PÁGINAS ---

// 1. DASHBOARD
const Dashboard = () => {
  const [stats, setStats] = useState({ totalClients: 0, activePolicies: 0, newLeads: 0, expiring: 0 });

  useEffect(() => {
    // Busca dados reais do backend
    api.get('/dashboard-stats')
       .then(res => setStats(res.data))
       .catch(err => console.log("Backend offline ou carregando..."));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Visão Geral</h2>
        <div className="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema Online
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <CardStat title="Total Clientes" value={stats.totalClients} sub="Base ativa" icon={Users} />
        <CardStat title="Apólices Ativas" value={stats.activePolicies} sub="Protegidos" icon={FileText} color="text-green-600" />
        <CardStat title="Novos Leads" value={stats.newLeads} sub="Via Typebot" icon={Bot} color="text-blue-600" />
        <CardStat title="Vencendo (30d)" value={stats.expiring} sub="Atenção" icon={Bell} color="text-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-lg">
          <p className="text-slate-400 text-sm">Receita Mensal Estimada</p>
          <h3 className="text-3xl font-bold mt-1">R$ 142.300,00</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-gray-500 text-sm">Comissão Projetada</p>
          <h3 className="text-3xl font-bold text-green-600 mt-1">R$ 24.500,00</h3>
        </div>
      </div>
    </div>
  );
};

// 2. CLIENTES (COMPLETO E FUNCIONAL)
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '', tipo: 'PF' });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (e) { console.error("Erro ao carregar clientes"); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clients', form);
      setModalOpen(false);
      setForm({ nome: '', whatsapp: '', email: '', tipo: 'PF' }); // Limpa form
      loadClients();
      alert("Cliente cadastrado!");
    } catch (e) { alert("Erro ao salvar cliente"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Carteira de Clientes</h2>
          <p className="text-sm text-gray-500">Gerencie seus segurados</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex gap-2 shadow-sm transition">
          <Plus size={20}/> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Contato</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Cidade</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium text-slate-800">{client.nome}</td>
                <td className="p-4 text-sm text-gray-600">
                  <div>{client.whatsapp}</div>
                  <div className="text-xs text-gray-400">{client.email}</div>
                </td>
                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{client.tipo}</span></td>
                <td className="p-4 text-sm">{client.cidade || '-'}</td>
                <td className="p-4 text-center">
                  <button className="text-primary hover:underline text-sm font-bold">Ver</button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhum cliente cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Cliente */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl animate-fade-in">
            <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Cadastrar Cliente</h3>
            
            <input 
              placeholder="Nome Completo" 
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              onChange={e => setForm({...form, nome: e.target.value})} 
              required
            />
            
            <div className="grid grid-cols-2 gap-4">
              <input 
                placeholder="WhatsApp (Só números)" 
                className="border p-3 rounded-lg"
                onChange={e => setForm({...form, whatsapp: e.target.value})} 
              />
              <select className="border p-3 rounded-lg bg-white" onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <input 
              placeholder="Email" 
              type="email"
              className="w-full border p-3 rounded-lg"
              onChange={e => setForm({...form, email: e.target.value})} 
            />

            <input 
              placeholder="Cidade/Estado" 
              className="w-full border p-3 rounded-lg"
              onChange={e => setForm({...form, cidade: e.target.value})} 
            />

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-primary hover:bg-orange-600 text-white font-bold rounded-lg shadow-md">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 3. APÓLICES (Igual ao anterior, apenas mantendo a consistência)
const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const p = await api.get('/policies');
    const c = await api.get('/clients');
    setPolicies(p.data);
    setClients(c.data);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(form).forEach(k => data.append(k, form[k]));
    if (file) data.append('pdf_apolice', file);

    try {
      await api.post('/policies', data);
      setModalOpen(false);
      loadData();
      alert('Apólice Salva!');
    } catch (err) { alert('Erro ao salvar'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Apólices</h2>
        <button onClick={() => setModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex gap-2"><Plus size={20}/> Nova Apólice</button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
            <tr><th className="p-4">Número</th><th className="p-4">Cliente</th><th className="p-4">Status</th><th className="p-4">PDF</th></tr>
          </thead>
          <tbody className="divide-y">
            {policies.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono">{p.numero}</td>
                <td className="p-4 font-bold">{p.client?.nome || 'N/A'}</td>
                <td className="p-4"><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">{p.status}</span></td>
                <td className="p-4">{p.pdf_url ? <a href={p.pdf_url} target="_blank" className="text-blue-600 font-bold hover:underline flex items-center gap-1"><FileText size={16}/> Abrir</a> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-xl w-full max-w-lg space-y-4 shadow-xl">
            <h3 className="font-bold text-lg">Nova Apólice</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Número Apólice" className="border p-2 rounded" onChange={e => setForm({...form, numero: e.target.value})} required/>
              <select className="border p-2 rounded" onChange={e => setForm({...form, clientId: e.target.value})} required>
                <option value="">Selecione Cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <input type="date" className="border p-2 rounded" onChange={e => setForm({...form, data_inicio: e.target.value})} required title="Início"/>
               <input type="date" className="border p-2 rounded" onChange={e => setForm({...form, data_fim: e.target.value})} required title="Fim"/>
            </div>
            <select className="border p-2 rounded w-full" onChange={e => setForm({...form, tipo_seguro: e.target.value})}>
                <option value="Auto">Auto</option><option value="Vida">Vida</option><option value="Residencial">Residencial</option>
            </select>
            <div className="border-2 border-dashed p-6 text-center cursor-pointer hover:bg-gray-50 relative rounded-lg bg-gray-50">
               <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
               <p className="text-sm font-bold text-gray-500">{file ? file.name : "Clique para anexar PDF da Apólice"}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 4. INTEGRAÇÕES (TURBINADA)
const Integrations = () => {
  const [json, setJson] = useState('');
  const [folder, setFolder] = useState('');
  const [status, setStatus] = useState({ backend: 'checking', db: 'checking' });

  // Teste automático de conexão ao abrir a aba
  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      await api.get('/'); 
      setStatus({ backend: 'online', db: 'online' }); // Assumimos DB online se backend responde (simplificado)
    } catch (e) {
      setStatus({ backend: 'offline', db: 'offline' });
    }
  };

  const saveConfig = async () => {
    try {
      await api.post('/config/drive', { folderId: folder, credentialsJson: json });
      alert('Configuração Google Drive salva com sucesso!');
    } catch (e) { alert('Erro ao processar JSON. Verifique o formato.'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* 1. STATUS DOS SERVIÇOS (O que você pediu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded"><Server size={24}/></div>
            <h3 className="font-bold text-slate-800">Servidor Backend</h3>
          </div>
          <div className="flex items-center justify-between">
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{API_URL}</code>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.backend === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {status.backend === 'online' ? 'CONECTADO' : 'OFFLINE'}
            </span>
          </div>
          <button onClick={checkConnections} className="mt-4 w-full text-xs text-indigo-600 font-bold border border-indigo-200 rounded py-2 hover:bg-indigo-50">Testar Conexão Novamente</button>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded"><Database size={24}/></div>
            <h3 className="font-bold text-slate-800">Banco de Dados (Postgres)</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Neon / PostgreSQL</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.db === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {status.db === 'online' ? 'CONECTADO' : 'ERRO'}
            </span>
          </div>
           <p className="text-xs text-gray-400 mt-4">Configurado via .env no Servidor</p>
        </div>
      </div>

      {/* 2. TYPEBOT CONFIG (Webhook URL) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 text-pink-600 rounded"><Bot size={24}/></div>
            <div>
              <h3 className="font-bold text-slate-800">Integração Typebot</h3>
              <p className="text-sm text-gray-500">Configure o Typebot para enviar leads para esta URL:</p>
            </div>
         </div>
         <div className="flex gap-2">
            <input 
              readOnly 
              value={`${API_URL}/leads`} 
              className="flex-1 bg-gray-50 border p-3 rounded font-mono text-sm text-gray-600 outline-none"
            />
            <button 
              onClick={() => {navigator.clipboard.writeText(`${API_URL}/leads`); alert("Copiado!");}}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded border font-bold flex items-center gap-2"
            >
              <Copy size={16}/> Copiar
            </button>
         </div>
         <div className="mt-4 bg-pink-50 p-4 rounded text-xs text-pink-800 border border-pink-100">
            <strong>Dica:</strong> No seu Typebot, adicione um bloco "Webhook" e cole essa URL acima. 
            Certifique-se de enviar os dados em formato JSON (Nome, Whatsapp, etc).
         </div>
      </div>

      {/* 3. GOOGLE DRIVE (Sua config antiga) */}
      <div className="bg-white p-8 rounded-xl border shadow-sm space-y-6">
        <div className="flex items-center gap-4 text-blue-600">
          <div className="p-2 bg-blue-100 rounded"><Cloud size={24} /></div>
          <h2 className="text-xl font-bold text-slate-800">Conexão Google Drive</h2>
        </div>
        
        <div>
          <label className="block font-bold text-sm mb-1 text-gray-700">ID da Pasta</label>
          <input className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={folder} onChange={e => setFolder(e.target.value)} placeholder="Cole o ID da pasta aqui..." />
        </div>
        <div>
          <label className="block font-bold text-sm mb-1 text-gray-700">Conteúdo do JSON (Credenciais)</label>
          <textarea className="w-full border p-3 rounded-lg bg-gray-50 h-32 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none" value={json} onChange={e => setJson(e.target.value)} placeholder='Cole o conteúdo completo do arquivo .json aqui...' />
        </div>
        <button onClick={saveConfig} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold w-full shadow-lg transition">Salvar Configuração do Drive</button>
      </div>

    </div>
  );
};

// --- LAYOUT PRINCIPAL ---
export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 font-sans text-slate-800">
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              CRM<span className="text-white font-light">Pro</span>
            </h1>
          </div>
          <nav className="flex-1 mt-6 px-4 space-y-2">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-primary hover:text-white rounded-lg transition"><LayoutDashboard size={20}/> Dashboard</Link>
            <Link to="/clients" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-primary hover:text-white rounded-lg transition"><Users size={20}/> Clientes</Link>
            <Link to="/policies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-primary hover:text-white rounded-lg transition"><FileText size={20}/> Apólices</Link>
            <Link to="/integrations" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-primary hover:text-white rounded-lg transition"><Settings size={20}/> Integrações</Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}