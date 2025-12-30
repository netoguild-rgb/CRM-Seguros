import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, FileText, Settings, Plus, Search, 
  Bot, AlertTriangle, Download, X, Folder, Mail, HardDrive, Upload, 
  AlertOctagon, Wrench, Activity, Camera, TrendingUp, Lock, LogOut, Car, CheckCircle,
  Calendar as CalendarIcon, Clock, DollarSign, ChevronDown, UserPlus, Filter, FolderOpen,
  LayoutKanban, List, MoreHorizontal, Phone, ArrowRight
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement 
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Registro dos Gráficos (Essencial para não dar erro)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://crm-seguros.onrender.com';
const api = axios.create({ baseURL: API_URL });

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const useAuth = () => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('crm_user')); } catch (e) { return null; }
    });
    const login = (userData) => { localStorage.setItem('crm_user', JSON.stringify(userData)); setUser(userData); };
    const logout = () => { localStorage.removeItem('crm_user'); setUser(null); };
    return { user, login, logout };
};

// --- COMPONENTES UI ---
const SidebarItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 mx-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} className={isActive ? 'scale-110' : 'group-hover:scale-110'} />
      <span className="font-medium text-sm tracking-wide">{label}</span>
    </Link>
  );
};

const StatusBadge = ({ status }) => {
    const styles = {
        'NOVO': 'bg-blue-100 text-blue-700 border-blue-200', 'CONTATADO': 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        'COTACAO': 'bg-purple-100 text-purple-700 border-purple-200', 'VENDA': 'bg-emerald-100 text-emerald-700 border-emerald-200', 
        'PERDIDO': 'bg-gray-100 text-gray-500 border-gray-200', 'ATIVA': 'bg-green-100 text-green-700 border-green-200', 
        'PENDENTE': 'bg-yellow-100 text-yellow-700 border-yellow-200', 'VENCIDA': 'bg-red-100 text-red-700 border-red-200'
    };
    return <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>{status}</span>;
};

const Modal = ({ title, children, onClose, maxWidth = "max-w-md" }) => (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`modal-content ${maxWidth}`}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                {children}
            </div>
        </div>
    </div>
);

// --- DASHBOARD (COM PROTEÇÃO CONTRA TELA BRANCA) ---
const Dashboard = () => { 
    const [data, setData] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => { 
        const fetchData = async () => {
            try {
                const res = await api.get('/dashboard-stats');
                setData(res.data);
            } catch(e) { 
                console.error("Erro Dashboard:", e);
                setError(true);
            } finally { 
                setLoading(false); 
            }
        };
        fetchData();
    }, []); 

    if(loading) return <div className="flex justify-center items-center h-full gap-2 text-slate-500"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div> Carregando dados...</div>;
    
    // PROTEÇÃO: Se deu erro ou dados vieram vazios, mostra aviso em vez de travar
    if(error || !data) return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <AlertTriangle size={48} className="mb-4 text-orange-400 opacity-50"/>
            <h3 className="text-xl font-bold text-slate-600">Ops! Não foi possível carregar o painel.</h3>
            <p className="text-sm mt-2">Verifique se o Backend está rodando e se o banco de dados está atualizado.</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 font-bold hover:underline">Tentar Novamente</button>
        </div>
    );

    // Preparação Segura dos Gráficos (Evita erro se arrays forem null)
    const leadsByStatus = data.charts?.leadsByStatus || [];
    const funnelData = {
        labels: leadsByStatus.map(s => s.status),
        datasets: [{ label: 'Leads', data: leadsByStatus.map(s => s._count.status), backgroundColor: ['#3b82f6', '#a855f7', '#10b981', '#ef4444', '#cbd5e1'], borderRadius: 6 }]
    };

    const financialHistory = data.charts?.financialHistory || [];
    const revenueData = {
        labels: financialHistory.length ? financialHistory.map(h => new Date(h.dueDate).toLocaleDateString('pt-BR',{month:'short'})) : ['Jan','Fev','Mar'],
        datasets: [{ label: 'Receita', data: financialHistory.length ? financialHistory.map(h => h.amount) : [0,0,0], borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', fill: true, tension: 0.4 }]
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-end"><div><h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2><p className="text-sm text-slate-500">Painel de controle.</p></div><div className="text-sm text-slate-400 font-medium bg-white px-3 py-1 rounded-lg border border-slate-200 hidden md:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> 
                {[{t:'Clientes', v: data.kpi?.totalClients || 0, i:Users, c:'text-blue-600', bg:'bg-blue-50'},{t:'Apólices', v: data.kpi?.activePolicies || 0, i:FileText, c:'text-emerald-600', bg:'bg-emerald-50'},{t:'Leads', v: data.kpi?.newLeads || 0, i:Bot, c:'text-purple-600', bg:'bg-purple-50'},{t:'Receita Mês', v: formatCurrency(data.kpi?.monthlyRevenue), i:DollarSign, c:'text-orange-600', bg:'bg-orange-50'}].map((x,i)=>(<div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{x.t}</p><h3 className="text-2xl font-bold text-slate-800 mt-1">{x.v}</h3></div><div className={`p-3 rounded-xl ${x.bg} ${x.c}`}><x.i size={24}/></div></div>))} 
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h3 className="font-bold text-lg text-slate-800 mb-6">Desempenho Financeiro</h3><div className="h-64 w-full"><Line data={revenueData} options={{maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{grid:{borderDash:[4,4]}},x:{grid:{display:false}}}}}/></div></div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h3 className="font-bold text-lg text-slate-800 mb-6">Funil de Leads</h3><div className="h-64 w-full"><Bar data={funnelData} options={{maintainAspectRatio:false, indexAxis:'y', plugins:{legend:{display:false}}}}/></div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CalendarIcon size={18} className="text-orange-500"/> Agenda Próxima</h3><div className="space-y-3">{data.lists?.upcomingAgenda?.map(a=>(<div key={a.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-orange-50 transition-colors"><div className="w-1 bg-orange-500 rounded-full"></div><div><h4 className="text-sm font-bold">{a.title}</h4><p className="text-xs text-slate-500">{new Date(a.date).toLocaleString('pt-BR')} • {a.client?.nome || 'Sem cliente'}</p></div></div>))}</div>{(!data.lists?.upcomingAgenda || data.lists.upcomingAgenda.length === 0) && <p className="text-center text-sm text-slate-400 py-4">Sem compromissos.</p>}</div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Bot size={18} className="text-blue-500"/> Leads Recentes</h3><div className="space-y-0">{data.lists?.recentLeads?.map((l,i)=>(<div key={l.id} className={`flex justify-between items-center p-3 ${i!==4?'border-b border-slate-50':''}`}><div><h4 className="text-sm font-bold">{l.nome}</h4><p className="text-xs text-slate-400">{l.tipo_seguro}</p></div><StatusBadge status={l.status}/></div>))}</div>{(!data.lists?.recentLeads || data.lists.recentLeads.length === 0) && <p className="text-center text-sm text-slate-400 py-4">Nenhum lead novo.</p>}</div>
            </div>
        </div> 
    );
};

// --- MÓDULO LEADS (KANBAN & TABLE) ---
const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [viewMode, setViewMode] = useState('KANBAN'); 
    const [selectedLead, setSelectedLead] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [clientForm, setClientForm] = useState({});
    const [search, setSearch] = useState('');

    useEffect(() => { loadLeads(); }, []);
    const loadLeads = async () => { try { const r = await api.get('/leads'); setLeads(r.data); } catch(e){} };
    
    const updateStatus = async (id, status) => { 
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l)); 
        await api.put(`/leads/${id}`, { status }); 
        loadLeads(); 
    };
    
    const handleConvert = (lead) => {
        setClientForm({
            nome: lead.nome, whatsapp: lead.whatsapp, email: '', tipo: 'PF', obs_final: lead.obs_final,
            modelo_veiculo: lead.modelo_veiculo, renavam: lead.renavan, placa: lead.placa, 
            ano_veiculo: lead.ano_do_veiculo, uso_veiculo: lead.uso_veiculo, 
            condutor_principal: lead.condutor_principal, idade_condutor: lead.idade_do_condutor,
            km: lead.km_guincho, guincho: lead.km_guincho, 
            carro_reserva: lead.carro_reserva, danos_terceiros: lead.cobertura_terceiros, cobertura_roubo: lead.cobertura_roubo,
            capital_vida: lead.capital_vida, profissao: lead.profissao, motivo_vida: lead.motivo_vida,
            preferencia_rede: lead.preferencia_rede, idades_saude: lead.idades_saude, plano_saude: lead.plano_saude
        });
        setIsConvertModalOpen(true);
    };

    const confirmConversion = async (e) => {
        e.preventDefault(); await api.post('/clients', clientForm); await api.put(`/leads/${selectedLead.id}`, { status: 'VENDA' });
        alert("Lead promovido a Cliente!"); setIsConvertModalOpen(false); setSelectedLead(null); loadLeads();
    };

    const filteredLeads = leads.filter(l => l.nome.toLowerCase().includes(search.toLowerCase()) || l.whatsapp.includes(search));
    const stages = [
        { id: 'NOVO', label: 'Novos', color: 'border-blue-500' }, { id: 'CONTATADO', label: 'Contatados', color: 'border-yellow-500' },
        { id: 'COTACAO', label: 'Em Cotação', color: 'border-purple-500' }, { id: 'VENDA', label: 'Fechados', color: 'border-emerald-500' },
        { id: 'PERDIDO', label: 'Perdidos', color: 'border-gray-300' }
    ];

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Bot className="text-orange-500"/> Pipeline de Leads</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center mr-2">
                        <button onClick={()=>setViewMode('TABLE')} className={`p-2 rounded-md transition-all ${viewMode==='TABLE'?'bg-white shadow-sm text-orange-500':'text-slate-400'}`}><List size={20}/></button>
                        <button onClick={()=>setViewMode('KANBAN')} className={`p-2 rounded-md transition-all ${viewMode==='KANBAN'?'bg-white shadow-sm text-orange-500':'text-slate-400'}`}><LayoutKanban size={20}/></button>
                    </div>
                    <div className="relative w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input className="pl-10 input-field" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
                </div>
            </div>

            {viewMode === 'TABLE' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b sticky top-0 bg-slate-50 z-10"><tr><th className="p-5">Nome</th><th className="p-5">Contato</th><th className="p-5">Status</th><th className="p-5 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredLeads.map(l => (<tr key={l.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedLead(l)}><td className="p-5 font-bold text-slate-700">{l.nome}</td><td className="p-5 text-sm">{l.whatsapp}</td><td className="p-5"><StatusBadge status={l.status}/></td><td className="p-5 text-center"><button className="text-blue-600 font-bold text-xs">Detalhes</button></td></tr>))}</tbody></table>
                </div>
            )}

            {viewMode === 'KANBAN' && (
                <div className="flex gap-4 overflow-x-auto h-full pb-4 items-start">
                    {stages.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.status === stage.id || (stage.id === 'COTACAO' && l.status === 'COTACAO'));
                        return (
                            <div key={stage.id} className="min-w-[300px] w-[300px] flex flex-col h-full rounded-2xl bg-slate-100/50 border border-slate-200/60">
                                <div className={`p-4 border-b border-slate-200 bg-white rounded-t-2xl flex justify-between items-center border-t-4 ${stage.color}`}><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{stage.label}</h3><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-bold">{stageLeads.length}</span></div>
                                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                    {stageLeads.map(lead => (
                                        <div key={lead.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative" onClick={() => setSelectedLead(lead)}>
                                            <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100">{lead.tipo_seguro || 'Geral'}</span><small className="text-[10px] text-slate-400">{new Date(lead.criadoEm).toLocaleDateString()}</small></div>
                                            <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{lead.nome}</h4>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-3"><Phone size={12}/> {lead.whatsapp}</div>
                                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                                {stage.id === 'NOVO' && <button onClick={(e)=>{e.stopPropagation(); updateStatus(lead.id, 'CONTATADO')}} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1">Contatar <ArrowRight size={10}/></button>}
                                                {stage.id === 'CONTATADO' && <button onClick={(e)=>{e.stopPropagation(); updateStatus(lead.id, 'COTACAO')}} className="text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded flex items-center gap-1">Cotar <ArrowRight size={10}/></button>}
                                                {stage.id === 'COTACAO' && <button onClick={(e)=>{e.stopPropagation(); handleConvert(lead)}} className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">Vender <ArrowRight size={10}/></button>}
                                                <button onClick={(e)=>{e.stopPropagation(); setSelectedLead(lead)}} className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {selectedLead && !isConvertModalOpen && (
                <Modal title={`Lead: ${selectedLead.nome}`} onClose={()=>setSelectedLead(null)} maxWidth="max-w-2xl">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div className="col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl text-orange-900"><strong>Resumo:</strong> {selectedLead.obs_final || 'Sem observações.'}</div>
                        <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Contato</span><p className="font-medium">{selectedLead.whatsapp}</p></div>
                        <div><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Interesse</span><p className="font-medium">{selectedLead.tipo_seguro}</p></div>
                        {selectedLead.modelo_veiculo && <div className="col-span-2 pt-4 border-t border-slate-100 mt-2"><span className="text-slate-400 text-xs font-bold uppercase block mb-2">Veículo</span><p>{selectedLead.modelo_veiculo} - {selectedLead.placa}</p></div>}
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button onClick={()=>handleConvert(selectedLead)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 flex justify-center gap-2 shadow-lg shadow-emerald-600/20"><UserPlus size={18}/> Converter em Cliente</button>
                        <select className="input-field w-auto font-bold text-slate-600 h-full" value={selectedLead.status} onChange={(e)=>updateStatus(selectedLead.id, e.target.value)}><option value="NOVO">Novo</option><option value="CONTATADO">Contatado</option><option value="COTACAO">Cotação</option><option value="PERDIDO">Perdido</option><option value="VENDA">Venda</option></select>
                    </div>
                </Modal>
            )}
            {isConvertModalOpen && (
                <Modal title="Converter Lead" onClose={()=>setIsConvertModalOpen(false)} maxWidth="max-w-2xl">
                    <form onSubmit={confirmConversion} className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4 border border-blue-100 flex gap-3"><CheckCircle className="shrink-0"/><p>Dados do Typebot pré-preenchidos. Confirme para criar o cliente.</p></div>
                        <input className="input-field" placeholder="Nome" value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome:e.target.value})} required/>
                        <div className="grid grid-cols-2 gap-3"><input className="input-field" placeholder="Email" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email:e.target.value})}/><input className="input-field" placeholder="WhatsApp" value={clientForm.whatsapp} onChange={e=>setClientForm({...clientForm, whatsapp:e.target.value})}/></div>
                        <button className="btn-primary w-full mt-4 py-3">Confirmar Cadastro</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const Agenda = () => {
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ title: '', date: '', time: '', type: 'REUNIAO', clientId: '' });
    useEffect(() => { loadData(); }, []);
    const loadData = async () => { const [a, c] = await Promise.all([api.get('/appointments'), api.get('/clients')]); setAppointments(a.data); setClients(c.data); };
    const handleSave = async (e) => { e.preventDefault(); await api.post('/appointments', { ...form, date: `${form.date}T${form.time}:00` }); setModalOpen(false); loadData(); };
    const handleDelete = async (id) => { if(confirm("Remover?")) { await api.delete(`/appointments/${id}`); loadData(); } };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarIcon className="text-orange-500"/> Agenda</h2><button onClick={()=>setModalOpen(true)} className="btn-primary"><Plus size={20}/> Novo</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{appointments.map(app => (<div key={app.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden"><div className={`absolute top-0 left-0 w-1 h-full ${app.type==='REUNIAO'?'bg-blue-500':'bg-orange-500'}`}></div><div className="flex justify-between pl-3"><div><span className="text-[10px] font-bold uppercase text-slate-400">{app.type}</span><h4 className="font-bold text-lg">{app.title}</h4></div><button onClick={()=>handleDelete(app.id)}><X size={18} className="text-slate-300 hover:text-red-500"/></button></div><div className="pl-3 mt-3 text-sm text-slate-500 flex gap-2"><Clock size={14}/> {new Date(app.date).toLocaleString()}</div></div>))}</div>{modalOpen && (<Modal title="Novo Compromisso" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><input className="input-field" placeholder="Título" onChange={e=>setForm({...form, title:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" type="date" onChange={e=>setForm({...form, date:e.target.value})} required/><input className="input-field" type="time" onChange={e=>setForm({...form, time:e.target.value})} required/></div><select className="input-field bg-white" onChange={e=>setForm({...form, type:e.target.value})}><option value="REUNIAO">Reunião</option><option value="VISTORIA">Vistoria</option></select><select className="input-field bg-white" onChange={e=>setForm({...form, clientId:e.target.value})}><option value="">Cliente (Opcional)</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><button className="btn-primary w-full mt-4">Agendar</button></form></Modal>)}</div> );
};

const Finance = () => {
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState({ receita:0, despesa:0, saldo:0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'DESPESA', category: 'Geral', dueDate: '', status: 'PENDENTE' });
    useEffect(() => { loadData(); }, []);
    const loadData = async () => { const [r, s] = await Promise.all([api.get('/financial'), api.get('/financial-stats')]); setRecords(r.data); setStats(s.data); };
    const handleSave = async (e) => { e.preventDefault(); await api.post('/financial', form); setModalOpen(false); loadData(); };
    const toggleStatus = async (rec) => { await api.put(`/financial/${rec.id}`, { status: rec.status==='PAGO'?'PENDENTE':'PAGO' }); loadData(); };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><DollarSign className="text-orange-500"/> Financeiro</h2><button onClick={()=>setModalOpen(true)} className="btn-primary"><Plus size={20}/> Nova</button></div><div className="grid grid-cols-3 gap-6"><div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-xs uppercase font-bold text-slate-400">Entradas</p><h3 className="text-2xl font-bold text-green-600">R$ {stats.receita.toFixed(2)}</h3></div><div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-xs uppercase font-bold text-slate-400">Saídas</p><h3 className="text-2xl font-bold text-red-600">R$ {stats.despesa.toFixed(2)}</h3></div><div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white"><p className="text-xs uppercase font-bold text-orange-400">Saldo</p><h3 className="text-2xl font-bold">R$ {stats.saldo.toFixed(2)}</h3></div></div><div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase"><tr><th className="p-5">Descrição</th><th className="p-5">Vencimento</th><th className="p-5">Valor</th><th className="p-5">Status</th><th className="p-5">Ação</th></tr></thead><tbody className="divide-y">{records.map(r=>(<tr key={r.id}><td className="p-5 font-bold">{r.description}</td><td className="p-5 text-sm">{new Date(r.dueDate).toLocaleDateString()}</td><td className={`p-5 font-bold ${r.type==='RECEITA'?'text-green-600':'text-red-600'}`}>R$ {r.amount.toFixed(2)}</td><td className="p-5"><StatusBadge status={r.status}/></td><td className="p-5"><button onClick={()=>toggleStatus(r)} className="text-blue-600 font-bold text-xs">Mudar</button></td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Movimentação" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-3"><select className="input-field" onChange={e=>setForm({...form, type:e.target.value})}><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select><input className="input-field" type="date" onChange={e=>setForm({...form, dueDate:e.target.value})} required/></div><input className="input-field" placeholder="Descrição" onChange={e=>setForm({...form, description:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" type="number" placeholder="Valor" onChange={e=>setForm({...form, amount:e.target.value})} required/><input className="input-field" placeholder="Categoria" onChange={e=>setForm({...form, category:e.target.value})}/></div><button className="btn-primary w-full mt-4">Salvar</button></form></Modal>)}</div> );
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('DADOS'); 
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDocs, setClientDocs] = useState([]);
  const [form, setForm] = useState({});
  const [docFile, setDocFile] = useState(null);
  const [docForm, setDocForm] = useState({ nome: '', categoria: 'Geral' });
  const [search, setSearch] = useState('');
  useEffect(() => { loadClients(); }, []);
  const loadClients = async () => { try { const res = await api.get('/clients'); setClients(res.data); } catch(e){} };
  const openClient = (client) => { setSelectedClient(client); setForm(client); setActiveTab('DADOS'); setModalOpen(true); loadDocs(client.id); };
  const loadDocs = async (id) => { const r = await api.get(`/clients/${id}/documents`); setClientDocs(r.data); };
  const handleSaveClient = async (e) => { e.preventDefault(); if(selectedClient) await api.put(`/clients/${selectedClient.id}`, form); else await api.post('/clients', form); setModalOpen(false); loadClients(); };
  const handleUploadDoc = async (e) => { e.preventDefault(); if(!docFile) return alert("Selecione um arquivo"); const data = new FormData(); data.append('file', docFile); data.append('nome', docForm.nome || docFile.name); data.append('categoria', docForm.categoria); data.append('clientId', selectedClient.id); await api.post('/documents', data); alert("Salvo!"); setDocFile(null); loadDocs(selectedClient.id); };
  const handleSendEmail = async (docId) => { if(confirm("Enviar email?")) { try { await api.post(`/documents/${docId}/send-email`); alert("Enviado!"); } catch(e) { alert("Erro"); } } };
  const filteredClients = clients.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
  return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-orange-500"/> Clientes</h2><div className="flex gap-2"><input className="input-field w-64" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={() => {setForm({}); setSelectedClient(null); setActiveTab('DADOS'); setModalOpen(true);}} className="btn-primary"><Plus size={20}/> Novo</button></div></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b"><tr><th className="p-5">Nome</th><th className="p-5">Veículo</th><th className="p-5 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredClients.map(c => (<tr key={c.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-bold text-slate-700">{c.nome}<div className="text-xs font-normal text-slate-400">{c.whatsapp}</div></td><td className="p-5 text-sm">{c.modelo_veiculo || '-'}</td><td className="p-5 text-center"><button onClick={() => openClient(c)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs font-bold transition-colors">Abrir Ficha</button></td></tr>))}</tbody></table></div>{modalOpen && (<Modal title={selectedClient ? `Ficha: ${selectedClient.nome}` : "Novo Cliente"} onClose={()=>setModalOpen(false)} maxWidth="max-w-4xl"><div className="flex gap-4 border-b mb-6 overflow-x-auto">{['DADOS', 'PERFIL', 'ARQUIVOS'].map(tab => (<button key={tab} onClick={()=>setActiveTab(tab)} className={`pb-2 text-sm font-bold transition-colors ${activeTab===tab?'text-orange-500 border-b-2 border-orange-500':'text-slate-400 hover:text-slate-600'}`}>{tab === 'ARQUIVOS' ? 'ARQUIVO DIGITAL (GED)' : tab}</button>))}</div>{activeTab === 'DADOS' && (<form onSubmit={handleSaveClient} className="space-y-4"><input className="input-field" placeholder="Nome Completo" value={form.nome||''} onChange={e=>setForm({...form, nome:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" placeholder="Email" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/><input className="input-field" placeholder="WhatsApp" value={form.whatsapp||''} onChange={e=>setForm({...form, whatsapp:e.target.value})}/></div><h4 className="text-xs font-bold text-slate-400 mt-4 uppercase">Dados do Veículo (Opcional)</h4><div className="grid grid-cols-3 gap-3"><input className="input-field" placeholder="Modelo" value={form.modelo_veiculo||''} onChange={e=>setForm({...form, modelo_veiculo:e.target.value})}/><input className="input-field" placeholder="Placa" value={form.placa||''} onChange={e=>setForm({...form, placa:e.target.value})}/><input className="input-field" placeholder="Renavam" value={form.renavam||''} onChange={e=>setForm({...form, renavam:e.target.value})}/></div><button className="btn-primary w-full mt-4">Salvar Alterações</button></form>)}{activeTab === 'PERFIL' && (<form onSubmit={handleSaveClient} className="space-y-4"><div className="space-y-2"><label className="text-xs font-bold text-slate-500">PREFERÊNCIAS & OBSERVAÇÕES</label><textarea className="input-field h-24" placeholder="Ex: Prefere contato por Zap, Aniversário..." value={form.obs_final||''} onChange={e=>setForm({...form, obs_final:e.target.value})}/></div><button className="btn-primary w-full mt-4">Salvar Perfil</button></form>)}{activeTab === 'ARQUIVOS' && selectedClient && (<div className="flex flex-col md:flex-row gap-6 h-96"><div className="md:w-1/3 md:border-r md:pr-4 space-y-4"><h4 className="font-bold text-xs uppercase text-slate-400">Novo Documento</h4><form onSubmit={handleUploadDoc} className="space-y-3"><input className="input-field" placeholder="Nome do Arquivo" value={docForm.nome} onChange={e=>setDocForm({...docForm, nome:e.target.value})}/><select className="input-field bg-white" value={docForm.categoria} onChange={e=>setDocForm({...docForm, categoria:e.target.value})}><option>Geral</option><option>Apólice</option><option>CNH/RG</option><option>Vistoria</option><option>Sinistro</option></select><div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center hover:bg-slate-50 cursor-pointer relative"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>setDocFile(e.target.files[0])}/><Upload className="mx-auto text-slate-300 mb-2"/><p className="text-xs text-slate-500 font-bold">{docFile ? docFile.name : "Selecionar Arquivo"}</p></div><button className="btn-primary w-full text-sm">Enviar</button></form></div><div className="md:w-2/3 overflow-y-auto space-y-3 pr-2"><h4 className="font-bold text-xs uppercase text-slate-400">Arquivos Armazenados</h4>{clientDocs.map(doc=>(<div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition"><div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg border"><FileText size={16} className="text-orange-500"/></div><div><p className="font-bold text-sm text-slate-700">{doc.nome}</p><p className="text-[10px] text-slate-400 uppercase">{doc.categoria} • {new Date(doc.criadoEm).toLocaleDateString()}</p></div></div><div className="flex gap-2"><a href={doc.url} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Baixar"><Download size={16}/></a><button onClick={()=>handleSendEmail(doc.id)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Enviar Email"><Mail size={16}/></button></div></div>))}{clientDocs.length===0 && <div className="text-center text-slate-400 py-10">Nenhum documento encontrado.</div>}</div></div>)}</Modal>)}</div> );
};

const Policies = ({ user }) => {
    const [policies, setPolicies] = useState([]);
    const [clients, setClients] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({});
    const [file, setFile] = useState(null);
    useEffect(() => { api.get('/policies').then(r=>setPolicies(r.data)); api.get('/clients').then(r=>setClients(r.data)); }, []);
    const handleSave = async (e) => { e.preventDefault(); const data = new FormData(); Object.keys(form).forEach(k => data.append(k, form[k])); data.append('userId', user.id); if (file) data.append('file', file); await api.post('/policies', data); setModalOpen(false); api.get('/policies').then(r=>setPolicies(r.data)); };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-orange-500"/> Apólices</h2><button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={20}/> Nova</button></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b"><tr><th className="p-5">Apólice</th><th className="p-5">Cliente</th><th className="p-5">Status</th><th className="p-5 text-center">PDF</th></tr></thead><tbody className="divide-y divide-slate-50">{policies.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-mono font-bold text-slate-700">{p.numero}</td><td className="p-5 text-sm">{p.client?.nome}</td><td className="p-5"><StatusBadge status={p.status}/></td><td className="p-5 text-center">{p.pdf_url ? <a href={p.pdf_url} target="_blank" className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg inline-block transition-colors"><Download size={16}/></a> : '-'}</td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Nova Apólice" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-3"><input className="input-field" placeholder="Número" onChange={e=>setForm({...form, numero:e.target.value})}/><select className="input-field bg-white" onChange={e=>setForm({...form, clientId:e.target.value})}><option>Cliente...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><input className="input-field" type="date" onChange={e=>setForm({...form, data_inicio:e.target.value})}/><input className="input-field" type="date" onChange={e=>setForm({...form, data_fim:e.target.value})}/></div><input type="file" className="input-field" onChange={e=>setFile(e.target.files[0])}/><button className="btn-primary w-full mt-4">Salvar</button></form></Modal>)}</div> );
};

const Claims = () => {
    const [claims, setClaims] = useState([]);
    const [clients, setClients] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({});
    useEffect(() => { api.get('/claims').then(r=>setClaims(r.data)); api.get('/clients').then(r=>setClients(r.data)); }, []);
    const handleSave = async (e) => { e.preventDefault(); await api.post('/claims', form); setModalOpen(false); api.get('/claims').then(r=>setClaims(r.data)); };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><AlertOctagon className="text-red-500"/> Sinistros</h2><button onClick={()=>setModalOpen(true)} className="btn-primary bg-red-500 hover:bg-red-600 shadow-red-500/20"><Plus size={20}/> Abrir</button></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b"><tr><th className="p-5">Tipo</th><th className="p-5">Cliente</th><th className="p-5">Oficina</th><th className="p-5">Status</th></tr></thead><tbody className="divide-y divide-slate-50">{claims.map(c=>(<tr key={c.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-bold flex items-center gap-2 text-slate-700"><Car size={16} className="text-slate-400"/> {c.tipo_sinistro}</td><td className="p-5 text-sm">{c.client?.nome}</td><td className="p-5 text-sm">{c.oficina_nome||'-'}</td><td className="p-5"><StatusBadge status={c.status}/></td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Abertura de Sinistro" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><select className="input-field bg-white" onChange={e=>setForm({...form, clientId:e.target.value})}><option>Cliente...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><button className="btn-primary w-full bg-red-500 hover:bg-red-600 mt-4">Confirmar</button></form></Modal>)}</div> );
};

const ProducerExtract = ({ user }) => {
    const [filter, setFilter] = useState({ mes: new Date().getMonth()+1, ano: new Date().getFullYear(), userId: user.perfil === 'ADMIN' ? '' : user.id });
    const [data, setData] = useState({ resumo: { vendas:0, premio:0, comissao:0 }, lista: [] });
    useEffect(() => { const l=async()=>{try{const r=await api.get('/producer-stats',{params:filter});setData(r.data);}catch(e){}};l();}, [filter]);
    return ( <div className="space-y-8 animate-fade-in"><div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><h2 className="text-2xl font-bold text-slate-800">Extrato de Produção</h2><select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600" value={filter.mes} onChange={e=>setFilter({...filter, mes:e.target.value})}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>Mês {m}</option>)}</select></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vendas</p><h3 className="text-3xl font-bold text-slate-800">{data.resumo.vendas}</h3></div><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Prêmio Total</p><h3 className="text-3xl font-bold text-slate-800">R$ {data.resumo.premio.toFixed(2)}</h3></div><div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl"><p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Comissão Estimada</p><h3 className="text-3xl font-bold">R$ {data.resumo.comissao.toFixed(2)}</h3></div></div></div> );
};

const Integrations = () => {
    const [config, setConfig] = useState({ storageType: 'LOCAL', localPath: '' });
    useEffect(() => { api.get('/config').then(r => setConfig(r.data)); }, []);
    const save = async () => { await api.post('/config', config); alert("Salvo!"); };
    return ( <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold text-slate-800">Configurações</h2><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-2xl"><h3 className="font-bold flex gap-2 mb-6 text-slate-700"><HardDrive className="text-orange-500"/> Armazenamento de Arquivos</h3><div className="flex gap-4 mb-4"><button onClick={()=>setConfig({...config, storageType:'LOCAL'})} className={`flex-1 py-3 rounded-xl border font-bold text-sm ${config.storageType==='LOCAL'?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-500'}`}>Local (PC)</button><button onClick={()=>setConfig({...config, storageType:'DRIVE'})} className={`flex-1 py-3 rounded-xl border font-bold text-sm ${config.storageType==='DRIVE'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500'}`}>Google Drive</button></div>{config.storageType==='LOCAL' && <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"><label className="text-xs font-bold text-slate-500 uppercase">Caminho da Pasta (No Servidor)</label><input className="input-field" placeholder="Ex: C:\Arquivos\Seguros" value={config.localPath || ''} onChange={e=>setConfig({...config, localPath:e.target.value})}/><p className="text-xs text-slate-400">Cole aqui o caminho completo da pasta.</p></div>}{config.storageType==='DRIVE' && <textarea placeholder="JSON Credenciais Google..." className="input-field h-32 text-xs font-mono" value={JSON.stringify(config.googleDriveJson||{})} onChange={e=>setConfig({...config, googleDriveJson:e.target.value})}/>}<button onClick={save} className="btn-primary w-full mt-6">Salvar</button></div></div> );
};

const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'PRODUTOR', comissao: 10 });
    const [modalOpen, setModalOpen] = useState(false);
    useEffect(() => { api.get('/users').then(r=>setUsers(r.data)); }, []);
    const handleSave = async (e) => { e.preventDefault(); await api.post('/users', form); setModalOpen(false); api.get('/users').then(r=>setUsers(r.data)); };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Usuários</h2><button onClick={()=>setModalOpen(true)} className="btn-primary"><Plus size={20}/> Novo</button></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b"><tr><th className="p-5">Nome</th><th className="p-5">Perfil</th><th className="p-5">Comissão</th></tr></thead><tbody className="divide-y divide-slate-50">{users.map(u=>(<tr key={u.id} className="hover:bg-slate-50"><td className="p-5 font-bold text-slate-800">{u.nome}<div className="text-xs font-normal text-slate-400">{u.email}</div></td><td className="p-5"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{u.perfil}</span></td><td className="p-5 font-mono text-sm">{u.comissao}%</td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Novo Usuário" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><input className="input-field" placeholder="Nome" onChange={e=>setForm({...form, nome:e.target.value})} required/><input className="input-field" placeholder="Email" onChange={e=>setForm({...form, email:e.target.value})} required/><input className="input-field" placeholder="Senha" type="password" onChange={e=>setForm({...form, senha:e.target.value})} required/><button className="btn-primary w-full mt-4">Salvar</button></form></Modal>)}</div> );
};

const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'PRODUTOR' });
    const handleSubmit = async (e) => { e.preventDefault(); try { if (isRegister) { await api.post('/users', form); alert("Cadastrado!"); setIsRegister(false); } else { const res = await api.post('/login', { email: form.email, senha: form.senha }); onLogin(res.data); } } catch (err) { alert("Erro login"); } };
    return ( <div className="flex h-screen bg-slate-900 items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl text-center"><div className="mb-8"><h1 className="text-4xl font-extrabold text-slate-800">CRM</h1><span className="text-xs font-bold text-orange-500 tracking-[0.3em] uppercase">CG Seguros</span></div><form onSubmit={handleSubmit} className="space-y-4">{isRegister && <input className="input-field" placeholder="Nome" onChange={e=>setForm({...form, nome:e.target.value})}/>}<input className="input-field" placeholder="Email" onChange={e=>setForm({...form, email:e.target.value})}/><input className="input-field" type="password" placeholder="Senha" onChange={e=>setForm({...form, senha:e.target.value})}/><button className="btn-primary w-full">{isRegister ? "Cadastrar" : "Entrar"}</button></form><button onClick={()=>setIsRegister(!isRegister)} className="mt-4 text-sm text-blue-600 hover:underline">{isRegister ? "Já tenho conta" : "Criar conta"}</button></div></div> );
};

// --- LAYOUT ---
const Layout = ({ user, logout }) => (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
        <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20 shrink-0">
            <div className="p-8 pb-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    CRM <div className="w-3 h-3 rounded-full bg-orange-500 mt-1"></div>
                </h1>
                <span className="text-xs font-bold text-orange-500 tracking-[0.2em] uppercase block mt-1">CG Seguros</span>
                <p className="text-xs text-slate-500 mt-4 font-medium">Olá, {user.nome}</p>
            </div>
            <nav className="flex-1 space-y-2 mt-6 overflow-y-auto">
                <SidebarItem to="/" icon={LayoutDashboard} label="Visão Geral" />
                <SidebarItem to="/leads" icon={Bot} label="Leads & Pipeline" />
                <SidebarItem to="/agenda" icon={CalendarIcon} label="Agenda" />
                <SidebarItem to="/finance" icon={DollarSign} label="Financeiro" />
                <SidebarItem to="/clients" icon={Users} label="Carteira & Arquivos" />
                <SidebarItem to="/policies" icon={FileText} label="Apólices" />
                <SidebarItem to="/claims" icon={AlertOctagon} label="Sinistros" />
                <SidebarItem to="/extract" icon={TrendingUp} label="Extrato Produtor" />
                {user.perfil === 'ADMIN' && (<><div className="pt-4 pb-2 px-8"><p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Admin</p></div><SidebarItem to="/users" icon={Lock} label="Usuários" /><SidebarItem to="/integrations" icon={Settings} label="Configurações" /></>)}
            </nav>
            <div className="p-6 border-t border-slate-800"><button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-white transition font-medium"><LogOut size={16}/> Sair</button></div>
        </aside>
        <main className="flex-1 overflow-auto p-8 relative bg-[#f8fafc]"><Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/policies" element={<Policies user={user} />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/extract" element={<ProducerExtract user={user} />} />
            <Route path="/users" element={<UsersManager />} />
            <Route path="/integrations" element={<Integrations />} />
        </Routes></main>
    </div>
);

export default function App() {
  const { user, login, logout } = useAuth();
  if (!user) return <Login onLogin={login} />;
  return <BrowserRouter><Layout user={user} logout={logout} /><style>{` .input-field { width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; outline: none; background: #fff; transition: all 0.2s; font-size: 0.95rem; } .input-field:focus { border-color: #f97316; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); } .btn-primary { background-color: #f97316; color: white; padding: 0.6rem 1.2rem; border-radius: 0.75rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s; } .btn-primary:hover { background-color: #ea580c; } `}</style></BrowserRouter>;
}