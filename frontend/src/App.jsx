import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, FileText, Settings, Cloud, Plus, Search, 
  User, Bell, CheckCircle, Bot, Copy, ChevronRight, Car, Shield, AlertTriangle,
  Calendar, DollarSign, Download, Filter, FileCheck, X, Folder, Mail, HardDrive, Upload,
  AlertOctagon, Wrench, Activity, Camera
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController);

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://crm-seguros.onrender.com';
const api = axios.create({ baseURL: API_URL });

// --- COMPONENTES UI ---
const SidebarItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 mx-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} className={`transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="font-medium text-sm tracking-wide">{label}</span>
      {isActive && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </Link>
  );
};

const StatusBadge = ({ status }) => {
    const colors = {
        'ABERTO': 'bg-blue-100 text-blue-700',
        'ANALISE': 'bg-yellow-100 text-yellow-700',
        'VISTORIA': 'bg-purple-100 text-purple-700',
        'REPARO': 'bg-orange-100 text-orange-700',
        'CONCLUIDO': 'bg-green-100 text-green-700',
        'NEGADO': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

// --- SINISTROS (NOVA ABA) ---
const Claims = () => {
    const [claims, setClaims] = useState([]);
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({ total: 0, abertos: 0, concluidos: 0, labels: [], data: [] });
    const [modalOpen, setModalOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);

    // Form Sinistro
    const initialForm = { 
        clientId: '', status: 'ABERTO', tipo_sinistro: 'Colisão', data_ocorrencia: '', descricao: '',
        oficina_nome: '', oficina_tel: '', terceiro_nome: '', terceiro_tel: '', placa_terceiro: '',
        valor_franquia: '', valor_orcamento: ''
    };
    const [form, setForm] = useState(initialForm);
    
    // Upload no Sinistro
    const [file, setFile] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [c, cli, s] = await Promise.all([
                api.get('/claims'), api.get('/clients'), api.get('/claims-stats')
            ]);
            setClaims(c.data); setClients(cli.data); setStats(s.data);
        } catch(e) {}
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try { await api.post('/claims', form); setModalOpen(false); setForm(initialForm); loadData(); alert("Sinistro Aberto!"); } 
        catch(e) { alert("Erro ao salvar"); }
    };

    const handleUpload = async () => {
        if(!file || !selectedClaim) return;
        const data = new FormData();
        data.append('file', file);
        data.append('nome', 'Doc Sinistro');
        data.append('categoria', 'Sinistro');
        data.append('clientId', selectedClaim.clientId);
        data.append('claimId', selectedClaim.id); // Vínculo importante

        try { await api.post('/documents', data); alert("Arquivo anexado!"); setFile(null); } 
        catch(e) { alert("Erro upload"); }
    };

    const updateStatus = async (id, newStatus) => {
        await api.put(`/claims/${id}`, { status: newStatus });
        loadData();
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Acompanhamento de Sinistros</h2>
                    <p className="text-slate-500">Controle completo de ocorrências, oficinas e terceiros.</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/20 flex items-center gap-2">
                    <AlertTriangle size={20}/> Abrir Sinistro
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><Activity size={24}/></div>
                    <div><h3 className="text-2xl font-bold text-slate-800">{stats.abertos}</h3><p className="text-xs text-slate-400 uppercase font-bold">Em Andamento</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24}/></div>
                    <div><h3 className="text-2xl font-bold text-slate-800">{stats.concluidos}</h3><p className="text-xs text-slate-400 uppercase font-bold">Finalizados</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sinistros por Período</h4>
                    <div className="h-16">
                        <Bar data={{
                            labels: stats.labels,
                            datasets: [{ label: 'Qtd', data: stats.data, backgroundColor: '#f87171', borderRadius: 4 }]
                        }} options={{ maintainAspectRatio: false, plugins: { legend: {display:false} }, scales: { x: {display:false}, y: {display:false} } }} />
                    </div>
                </div>
            </div>

            {/* Lista de Sinistros */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                        <tr><th className="p-5">Sinistro / Tipo</th><th className="p-5">Cliente</th><th className="p-5">Oficina</th><th className="p-5">Status</th><th className="p-5 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {claims.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => { setSelectedClaim(c); setDetailsOpen(true); }}>
                                <td className="p-5">
                                    <div className="font-bold text-slate-800 flex items-center gap-2"><Car size={16} className="text-slate-400"/> {c.tipo_sinistro}</div>
                                    <div className="text-xs text-slate-400">{new Date(c.data_ocorrencia).toLocaleDateString()}</div>
                                </td>
                                <td className="p-5"><span className="font-medium text-slate-700">{c.client.nome}</span></td>
                                <td className="p-5 text-sm">{c.oficina_nome || '-'}</td>
                                <td className="p-5"><StatusBadge status={c.status}/></td>
                                <td className="p-5 text-center"><button className="text-blue-600 font-bold text-sm hover:underline">Detalhes</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL DETALHES & ACOMPANHAMENTO */}
            {detailsOpen && selectedClaim && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-4xl shadow-2xl h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-4 mb-6">
                            <div>
                                <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2">
                                    <AlertOctagon className="text-red-500"/> Sinistro #{selectedClaim.id}
                                </h3>
                                <p className="text-sm text-slate-500">Cliente: <b>{selectedClaim.client.nome}</b></p>
                            </div>
                            <button onClick={()=>setDetailsOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X/></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Coluna 1: Status e Dados */}
                            <div className="space-y-6 col-span-2">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-4">Atualizar Etapa</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {['ABERTO','ANALISE','VISTORIA','REPARO','CONCLUIDO'].map(s => (
                                            <button key={s} onClick={()=>updateStatus(selectedClaim.id, s)} 
                                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors 
                                                ${selectedClaim.status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 hover:bg-slate-200'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border p-4 rounded-xl">
                                        <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2"><Wrench size={16}/> Oficina</h4>
                                        <p className="text-sm">{selectedClaim.oficina_nome || 'Não informada'}</p>
                                        <p className="text-xs text-slate-400">{selectedClaim.oficina_tel}</p>
                                    </div>
                                    <div className="bg-white border p-4 rounded-xl">
                                        <h4 className="flex items-center gap-2 font-bold text-slate-700 mb-2"><Users size={16}/> Terceiro</h4>
                                        <p className="text-sm">{selectedClaim.terceiro_nome || 'Sem terceiro'}</p>
                                        <p className="text-xs text-slate-400">{selectedClaim.placa_terceiro}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white border p-4 rounded-xl">
                                    <h4 className="font-bold text-slate-700 mb-2">Descrição do Evento</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{selectedClaim.descricao}</p>
                                </div>
                            </div>

                            {/* Coluna 2: Documentos Rápidos */}
                            <div className="border-l pl-8 space-y-6">
                                <h4 className="font-bold text-sm uppercase text-slate-500 flex items-center gap-2"><Camera size={16}/> Fotos & Docs</h4>
                                
                                <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center hover:bg-slate-50 cursor-pointer relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
                                    <Upload className="mx-auto text-slate-300 mb-2"/>
                                    <p className="text-xs text-slate-500 font-bold">{file ? file.name : "Anexar Arquivo"}</p>
                                </div>
                                {file && <button onClick={handleUpload} className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg">Enviar Agora</button>}

                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400">Documentos recentes do cliente:</p>
                                    {/* Aqui você poderia listar os docs filtrados pelo claimId se quiser */}
                                    <button className="text-xs text-blue-600 font-bold hover:underline">Ver todos na pasta do cliente</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NOVO SINISTRO */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-4 mb-6">
                            <h3 className="font-bold text-xl text-slate-800">Abertura de Sinistro</h3>
                            <button type="button" onClick={()=>setModalOpen(false)}><X/></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Cliente</label>
                                    <select className="input-field bg-white" onChange={e => setForm({...form, clientId: e.target.value})} required>
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">Data Ocorrência</label>
                                    <input type="date" className="input-field" onChange={e => setForm({...form, data_ocorrencia: e.target.value})} required/>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="label-text">Tipo e Descrição</label>
                                <div className="flex gap-4">
                                    <select className="input-field bg-white w-1/3" onChange={e => setForm({...form, tipo_sinistro: e.target.value})}>
                                        <option>Colisão</option><option>Roubo/Furto</option><option>Incêndio</option><option>Vidros</option><option>Terceiros</option>
                                    </select>
                                    <input placeholder="Descrição breve do ocorrido..." className="input-field flex-1" onChange={e => setForm({...form, descricao: e.target.value})}/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                <div>
                                    <h4 className="text-xs font-bold text-orange-500 uppercase mb-2">Dados da Oficina</h4>
                                    <input placeholder="Nome Oficina" className="input-field mb-2" onChange={e => setForm({...form, oficina_nome: e.target.value})}/>
                                    <input placeholder="Telefone/Zap" className="input-field" onChange={e => setForm({...form, oficina_tel: e.target.value})}/>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-orange-500 uppercase mb-2">Dados Terceiro</h4>
                                    <input placeholder="Nome Condutor" className="input-field mb-2" onChange={e => setForm({...form, terceiro_nome: e.target.value})}/>
                                    <div className="flex gap-2">
                                        <input placeholder="Tel" className="input-field" onChange={e => setForm({...form, terceiro_tel: e.target.value})}/>
                                        <input placeholder="Placa" className="input-field" onChange={e => setForm({...form, placa_terceiro: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                <input type="number" placeholder="Franquia (R$)" className="input-field" onChange={e => setForm({...form, valor_franquia: e.target.value})}/>
                                <input type="number" placeholder="Orçamento Estimado (R$)" className="input-field" onChange={e => setForm({...form, valor_orcamento: e.target.value})}/>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg">Confirmar Abertura</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

// ... Resto dos componentes (Dashboard, Clients, Policies, Integrations) MANTIDOS IGUAIS ...
// (Para economizar espaço na resposta, estou omitindo a repetição deles, mas no seu arquivo
// VOCÊ DEVE MANTER ELES. Vou colocar o Layout final chamando o Claims)

// (Componentes placeholder para ilustrar que devem estar lá)
const Dashboard = () => <div className="p-10 text-center">Dashboard Carregado (Código anterior)</div>;
const Clients = () => <div className="p-10 text-center">Clientes Carregado (Código anterior)</div>;
const Policies = () => <div className="p-10 text-center">Apólices Carregado (Código anterior)</div>;
const Integrations = () => <div className="p-10 text-center">Integrações Carregado (Código anterior)</div>;

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
        <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
          <div className="p-8 pb-4">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.3em] text-orange-500 uppercase mb-0.5">CRM</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">CG SEGUROS<div className="w-2 h-2 rounded-full bg-orange-500 mt-1"></div></h1>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Gestão Premium</p>
          </div>
          <nav className="flex-1 space-y-2 mt-6">
            <SidebarItem to="/" icon={LayoutDashboard} label="Visão Geral" />
            <SidebarItem to="/clients" icon={Users} label="Carteira Clientes" />
            <SidebarItem to="/policies" icon={FileText} label="Apólices" />
            <SidebarItem to="/claims" icon={AlertOctagon} label="Sinistros" /> {/* NOVO LINK */}
            <SidebarItem to="/integrations" icon={Settings} label="Integrações" />
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-8 relative">
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/claims" element={<Claims />} /> {/* NOVA ROTA */}
                <Route path="/integrations" element={<Integrations />} />
            </Routes>
        </main>
      </div>
      <style>{` 
        .input-field { width: 100%; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; outline: none; background: #fff; } 
        .btn-secondary { padding: 0.6rem 1.25rem; color: #64748b; font-weight: 500; border-radius: 0.75rem; }
        .btn-secondary:hover { background-color: #f1f5f9; }
        .label-text { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.25rem; display: block; }
      `}</style>
    </BrowserRouter>
  );
}