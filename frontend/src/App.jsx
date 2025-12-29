import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, FileText, Settings, Plus, Search, 
  Bot, AlertTriangle, Download, X, Folder, Mail, HardDrive, Upload, 
  AlertOctagon, Wrench, Activity, Camera, TrendingUp, Lock, LogOut, Car, CheckCircle,
  Calendar as CalendarIcon, Clock, DollarSign, ClipboardList, ChevronDown, UserPlus, Filter
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController);

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://crm-seguros.onrender.com';
const api = axios.create({ baseURL: API_URL });

const useAuth = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('crm_user')));
    const login = (userData) => { localStorage.setItem('crm_user', JSON.stringify(userData)); setUser(userData); };
    const logout = () => { localStorage.removeItem('crm_user'); setUser(null); };
    return { user, login, logout };
};

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
        'NOVO': 'bg-blue-100 text-blue-700',
        'CONTATADO': 'bg-yellow-100 text-yellow-700',
        'VENDA': 'bg-green-100 text-green-700',
        'PERDIDO': 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
};

const Modal = ({ title, children, onClose, maxWidth = "max-w-md" }) => (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`modal-content ${maxWidth}`}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                {children}
            </div>
        </div>
    </div>
);

// --- NOVO MÓDULO: LEADS (TYPEBOT) ---
const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [selectedLead, setSelectedLead] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [clientForm, setClientForm] = useState({});

    useEffect(() => { loadLeads(); }, []);
    const loadLeads = async () => { try { const r = await api.get('/leads'); setLeads(r.data); } catch(e){} };
    
    const updateStatus = async (id, status) => { await api.put(`/leads/${id}`, { status }); loadLeads(); };
    
    const handleConvert = (lead) => {
        // Prepara o formulário de cliente com os dados do Lead
        setClientForm({
            nome: lead.nome, whatsapp: lead.whatsapp, email: '', // email nao veio no lead mas poderia
            tipo: 'PF', obs_final: lead.obs_final,
            // Auto
            modelo_veiculo: lead.modelo_veiculo, renavam: lead.renavan, placa: lead.placa, 
            ano_veiculo: lead.ano_do_veiculo, uso_veiculo: lead.uso_veiculo, 
            condutor_principal: lead.condutor_principal, idade_condutor: lead.idade_do_condutor,
            km: lead.km_guincho, guincho: lead.km_guincho, 
            carro_reserva: lead.carro_reserva, danos_terceiros: lead.cobertura_terceiros, cobertura_roubo: lead.cobertura_roubo,
            // Vida
            capital_vida: lead.capital_vida, profissao: lead.profissao, motivo_vida: lead.motivo_vida,
            // Saude
            preferencia_rede: lead.preferencia_rede, idades_saude: lead.idades_saude, plano_saude: lead.plano_saude
        });
        setIsConvertModalOpen(true);
    };

    const confirmConversion = async (e) => {
        e.preventDefault();
        await api.post('/clients', clientForm);
        await api.put(`/leads/${selectedLead.id}`, { status: 'VENDA' });
        alert("Lead promovido a Cliente com sucesso!");
        setIsConvertModalOpen(false);
        setSelectedLead(null);
        loadLeads();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Leads (Typebot)</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                        <tr><th className="p-4">Nome / Tipo</th><th className="p-4">Contato</th><th className="p-4">Status</th><th className="p-4 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                <td className="p-4 font-bold">{lead.nome}<div className="text-xs font-normal text-slate-400 bg-slate-100 px-1 rounded w-fit">{lead.tipo_seguro}</div></td>
                                <td className="p-4">{lead.whatsapp}</td>
                                <td className="p-4"><StatusBadge status={lead.status}/></td>
                                <td className="p-4 text-center"><button className="text-blue-600 font-bold text-xs hover:underline">Ver Detalhes</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedLead && !isConvertModalOpen && (
                <Modal title={`Detalhes do Lead #${selectedLead.id}`} onClose={()=>setSelectedLead(null)} maxWidth="max-w-2xl">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div className="bg-slate-50 p-3 rounded"><strong>Tipo:</strong> {selectedLead.tipo_seguro}</div>
                        <div className="bg-slate-50 p-3 rounded"><strong>Data:</strong> {new Date(selectedLead.criadoEm).toLocaleDateString()}</div>
                        
                        <div className="col-span-2"><h4 className="font-bold text-orange-500 mt-2 mb-1">Dados Gerais</h4></div>
                        <div><strong>Nome:</strong> {selectedLead.nome}</div>
                        <div><strong>Whats:</strong> {selectedLead.whatsapp}</div>
                        <div className="col-span-2"><strong>Obs:</strong> {selectedLead.obs_final}</div>

                        {selectedLead.tipo_seguro?.toLowerCase().includes('auto') && (
                            <>
                                <div className="col-span-2"><h4 className="font-bold text-orange-500 mt-2 mb-1">Dados Auto</h4></div>
                                <div><strong>Modelo:</strong> {selectedLead.modelo_veiculo}</div>
                                <div><strong>Placa:</strong> {selectedLead.placa}</div>
                                <div><strong>Ano:</strong> {selectedLead.ano_do_veiculo}</div>
                                <div><strong>Uso:</strong> {selectedLead.uso_veiculo}</div>
                                <div><strong>Condutor:</strong> {selectedLead.condutor_principal}</div>
                                <div><strong>Idade Condutor:</strong> {selectedLead.idade_do_condutor}</div>
                                <div><strong>Guincho:</strong> {selectedLead.km_guincho}</div>
                                <div><strong>Carro Reserva:</strong> {selectedLead.carro_reserva}</div>
                            </>
                        )}
                        {/* Exibe campos de Vida/Saúde se tiverem valor */}
                        {selectedLead.capital_vida && <div className="col-span-2"><strong>Capital Vida:</strong> {selectedLead.capital_vida}</div>}
                        {selectedLead.plano_saude && <div className="col-span-2"><strong>Plano Saúde:</strong> {selectedLead.plano_saude}</div>}
                    </div>
                    
                    <div className="flex gap-3 pt-4 border-t">
                        <button onClick={()=>handleConvert(selectedLead)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 flex justify-center gap-2"><UserPlus size={18}/> Promover a Cliente</button>
                        <select className="bg-slate-100 border rounded-lg px-3 text-sm font-bold" value={selectedLead.status} onClick={(e)=>e.stopPropagation()} onChange={(e)=>updateStatus(selectedLead.id, e.target.value)}>
                            <option value="NOVO">Novo</option>
                            <option value="CONTATADO">Contatado</option>
                            <option value="PERDIDO">Perdido</option>
                        </select>
                    </div>
                </Modal>
            )}

            {isConvertModalOpen && (
                <Modal title="Confirmar Cadastro de Cliente" onClose={()=>setIsConvertModalOpen(false)} maxWidth="max-w-2xl">
                    <form onSubmit={confirmConversion} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4">
                            Revise os dados importados do Typebot antes de salvar.
                        </div>
                        <input className="input-field" placeholder="Nome" value={clientForm.nome} onChange={e=>setClientForm({...clientForm, nome:e.target.value})} required/>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="input-field" placeholder="Email" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email:e.target.value})}/>
                            <input className="input-field" placeholder="WhatsApp" value={clientForm.whatsapp} onChange={e=>setClientForm({...clientForm, whatsapp:e.target.value})}/>
                        </div>
                        {/* Campos Auto */}
                        <h4 className="font-bold text-xs text-slate-400 mt-2">DADOS DO VEÍCULO (SE HOUVER)</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <input className="input-field" placeholder="Modelo" value={clientForm.modelo_veiculo || ''} onChange={e=>setClientForm({...clientForm, modelo_veiculo:e.target.value})}/>
                            <input className="input-field" placeholder="Placa" value={clientForm.placa || ''} onChange={e=>setClientForm({...clientForm, placa:e.target.value})}/>
                            <input className="input-field" placeholder="Renavam" value={clientForm.renavam || ''} onChange={e=>setClientForm({...clientForm, renavam:e.target.value})}/>
                        </div>
                        <button className="btn-primary w-full mt-4">Confirmar e Salvar</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

// --- MÓDULOS EXISTENTES ---
const Agenda = () => {
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ title: '', date: '', time: '', type: 'REUNIAO', clientId: '' });
    useEffect(() => { loadData(); }, []);
    const loadData = async () => { const [a, c] = await Promise.all([api.get('/appointments'), api.get('/clients')]); setAppointments(a.data); setClients(c.data); };
    const handleSave = async (e) => { e.preventDefault(); const fullDate = `${form.date}T${form.time}:00`; await api.post('/appointments', { ...form, date: fullDate }); setModalOpen(false); loadData(); };
    const handleDelete = async (id) => { if(confirm("Remover?")) { await api.delete(`/appointments/${id}`); loadData(); } };
    return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Agenda</h2><button onClick={()=>setModalOpen(true)} className="btn-primary"><Plus size={20}/> Novo</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{appointments.map(app => (<div key={app.id} className="bg-white p-5 rounded-xl border shadow-sm"><div className="flex justify-between"><div className={`p-2 rounded-lg ${app.type==='REUNIAO'?'bg-blue-50 text-blue-600':'bg-orange-50 text-orange-600'}`}><CalendarIcon size={20}/></div><button onClick={()=>handleDelete(app.id)}><X size={16} className="text-slate-300 hover:text-red-500"/></button></div><h4 className="font-bold mt-3">{app.title}</h4><p className="text-sm text-slate-500 mb-2">{app.client?.nome}</p><div className="text-xs bg-slate-100 p-2 rounded font-bold">{new Date(app.date).toLocaleString()}</div></div>))}</div>{modalOpen && (<Modal title="Novo Compromisso" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><input className="input-field" placeholder="Título" onChange={e=>setForm({...form, title:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" type="date" onChange={e=>setForm({...form, date:e.target.value})} required/><input className="input-field" type="time" onChange={e=>setForm({...form, time:e.target.value})} required/></div><select className="input-field" onChange={e=>setForm({...form, type:e.target.value})}><option value="REUNIAO">Reunião</option><option value="VISTORIA">Vistoria</option></select><select className="input-field" onChange={e=>setForm({...form, clientId:e.target.value})}><option value="">Cliente (Opcional)</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><button className="btn-primary w-full mt-4">Agendar</button></form></Modal>)}</div> );
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
    return ( <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold">Financeiro</h2><div className="grid grid-cols-3 gap-6"><div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Entradas</p><h3 className="text-2xl font-bold text-green-600">R$ {stats.receita.toFixed(2)}</h3></div><div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Saídas</p><h3 className="text-2xl font-bold text-red-600">R$ {stats.despesa.toFixed(2)}</h3></div><div className="bg-slate-900 p-6 rounded-xl text-white shadow-lg"><p className="text-xs text-orange-400 font-bold uppercase">Saldo</p><h3 className="text-2xl font-bold">R$ {stats.saldo.toFixed(2)}</h3></div></div><div className="flex justify-end"><button onClick={()=>setModalOpen(true)} className="btn-primary"><Plus size={20}/> Nova Movimentação</button></div><div className="bg-white rounded-xl border overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="p-4">Descrição</th><th className="p-4">Valor</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead><tbody className="divide-y">{records.map(r=>(<tr key={r.id}><td className="p-4 font-bold">{r.description}</td><td className={`p-4 font-bold ${r.type==='RECEITA'?'text-green-600':'text-red-600'}`}>{r.type==='DESPESA'?'- ':''}R$ {r.amount.toFixed(2)}</td><td className="p-4"><StatusBadge status={r.status}/></td><td className="p-4"><button onClick={()=>toggleStatus(r)} className="text-blue-600 font-bold text-xs">Mudar Status</button></td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Nova Movimentação" onClose={()=>setModalOpen(false)}><form onSubmit={handleSave} className="space-y-4"><div className="grid grid-cols-2 gap-3"><select className="input-field" onChange={e=>setForm({...form, type:e.target.value})}><option value="DESPESA">Despesa (-)</option><option value="RECEITA">Receita (+)</option></select><input className="input-field" type="date" onChange={e=>setForm({...form, dueDate:e.target.value})} required/></div><input className="input-field" placeholder="Descrição" onChange={e=>setForm({...form, description:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" type="number" placeholder="Valor R$" onChange={e=>setForm({...form, amount:e.target.value})} required/><input className="input-field" placeholder="Categoria" onChange={e=>setForm({...form, category:e.target.value})}/></div><button className="btn-primary w-full mt-4">Salvar</button></form></Modal>)}</div> );
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('DADOS'); 
  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '', modelo_veiculo: '', renavam: '', preferences: '', questionnaires: '' });
  useEffect(() => { loadClients(); }, []);
  const loadClients = async () => { try { const res = await api.get('/clients'); setClients(res.data); } catch(e){} };
  const handleSaveClient = async (e) => { e.preventDefault(); await api.post('/clients', form); setModalOpen(false); loadClients(); };
  return ( <div className="space-y-6 animate-fade-in"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Clientes</h2><button onClick={() => {setForm({}); setModalOpen(true);}} className="btn-primary"><Plus size={20}/> Novo Cliente</button></div><div className="bg-white rounded-xl border shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="p-4">Nome</th><th className="p-4">Veículo</th><th className="p-4 text-center">Perfil</th></tr></thead><tbody className="divide-y">{clients.map(c => (<tr key={c.id}><td className="p-4 font-bold">{c.nome}<div className="text-xs font-normal text-slate-400">{c.whatsapp}</div></td><td className="p-4">{c.modelo_veiculo || '-'}</td><td className="p-4 text-center"><button className="text-blue-600 text-xs font-bold">Ver Completo</button></td></tr>))}</tbody></table></div>{modalOpen && (<Modal title="Cadastro de Cliente" onClose={()=>setModalOpen(false)} maxWidth="max-w-2xl"><div className="flex gap-4 border-b mb-4"><button onClick={()=>setActiveTab('DADOS')} className={`pb-2 text-sm font-bold ${activeTab==='DADOS'?'text-orange-500 border-b-2 border-orange-500':'text-slate-400'}`}>Dados</button><button onClick={()=>setActiveTab('PERFIL')} className={`pb-2 text-sm font-bold ${activeTab==='PERFIL'?'text-orange-500 border-b-2 border-orange-500':'text-slate-400'}`}>Perfil</button></div><form onSubmit={handleSaveClient} className="space-y-4">{activeTab === 'DADOS' ? (<><input className="input-field" placeholder="Nome Completo" onChange={e=>setForm({...form, nome:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><input className="input-field" placeholder="Email" onChange={e=>setForm({...form, email:e.target.value})}/><input className="input-field" placeholder="WhatsApp" onChange={e=>setForm({...form, whatsapp:e.target.value})}/></div></>) : (<><div className="space-y-2"><label className="text-xs font-bold text-slate-500">PREFERÊNCIAS</label><textarea className="input-field h-20" placeholder="Ex: Prefere contato por Zap..." onChange={e=>setForm({...form, preferences:e.target.value})}/></div></>)}<button className="btn-primary w-full mt-4">Salvar</button></form></Modal>)}</div> );
};

const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'PRODUTOR' });
    const handleSubmit = async (e) => { e.preventDefault(); try { if (isRegister) { await api.post('/users', form); alert("Cadastrado!"); setIsRegister(false); } else { const res = await api.post('/login', { email: form.email, senha: form.senha }); onLogin(res.data); } } catch (err) { alert("Erro login"); } };
    return ( <div className="flex h-screen bg-slate-900 items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl text-center"><h1 className="text-3xl font-extrabold text-slate-800 mb-6">CG SEGUROS</h1><form onSubmit={handleSubmit} className="space-y-4">{isRegister && <input className="input-field" placeholder="Nome" onChange={e=>setForm({...form, nome:e.target.value})}/>}<input className="input-field" placeholder="Email" onChange={e=>setForm({...form, email:e.target.value})}/><input className="input-field" type="password" placeholder="Senha" onChange={e=>setForm({...form, senha:e.target.value})}/><button className="btn-primary w-full">{isRegister ? "Cadastrar" : "Entrar"}</button></form><button onClick={()=>setIsRegister(!isRegister)} className="mt-4 text-sm text-blue-600 hover:underline">{isRegister ? "Já tenho conta" : "Criar conta"}</button></div></div> );
};
const Dashboard = () => { const [s, setS] = useState({}); useEffect(() => { api.get('/dashboard-stats').then(r => setS(r.data)); }, []); return <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2><div className="grid grid-cols-4 gap-4"> {[{t:'Clientes',v:s.totalClients||0,i:Users},{t:'Apólices',v:s.activePolicies||0,i:FileText},{t:'Novos Leads',v:s.newLeads||0,i:Bot},{t:'A Pagar',v:'-',i:DollarSign}].map((x,i)=><div key={i} className="bg-white p-6 rounded-xl border shadow-sm"><h3 className="text-2xl font-bold">{x.v}</h3><p className="text-xs text-slate-500 uppercase">{x.t}</p></div>)} </div></div> };
const Policies = () => <div className="p-10 border border-dashed rounded-xl text-center text-slate-400">Módulo de Apólices (Use código da versão anterior)</div>;
const Claims = () => <div className="p-10 border border-dashed rounded-xl text-center text-slate-400">Módulo de Sinistros (Use código da versão anterior)</div>;
const Integrations = () => <div className="p-10 border border-dashed rounded-xl text-center text-slate-400">Configurações (Use código da versão anterior)</div>;
const UsersManager = () => <div className="p-10 border border-dashed rounded-xl text-center text-slate-400">Gestão Usuários (Use código da versão anterior)</div>;
const ProducerExtract = () => <div className="p-10 border border-dashed rounded-xl text-center text-slate-400">Extrato (Use código da versão anterior)</div>;

const Layout = ({ user, logout }) => (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
        <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
            <div className="p-8 pb-4"><span className="text-[10px] font-bold tracking-[0.3em] text-orange-500 uppercase">CRM</span><h1 className="text-2xl font-extrabold flex items-center gap-2">CG SEGUROS</h1><p className="text-xs text-slate-500 mt-2 font-medium">Olá, {user.nome}</p></div>
            <nav className="flex-1 space-y-2 mt-6 overflow-y-auto">
                <SidebarItem to="/" icon={LayoutDashboard} label="Visão Geral" />
                <SidebarItem to="/leads" icon={Bot} label="Leads (Typebot)" /> {/* NOVO */}
                <SidebarItem to="/agenda" icon={CalendarIcon} label="Agenda" />
                <SidebarItem to="/finance" icon={DollarSign} label="Financeiro" />
                <SidebarItem to="/clients" icon={Users} label="Clientes & Perfil" />
                <SidebarItem to="/policies" icon={FileText} label="Apólices" />
                <SidebarItem to="/claims" icon={AlertOctagon} label="Sinistros" />
                <SidebarItem to="/extract" icon={TrendingUp} label="Extrato Produtor" />
                {user.perfil === 'ADMIN' && (<><div className="pt-4 pb-2 px-8"><p className="text-[10px] font-bold text-slate-600 uppercase">Admin</p></div><SidebarItem to="/users" icon={Lock} label="Usuários" /><SidebarItem to="/integrations" icon={Settings} label="Configurações" /></>)}
            </nav>
            <div className="p-6 border-t border-slate-800"><button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-white transition font-medium"><LogOut size={16}/> Sair</button></div>
        </aside>
        <main className="flex-1 overflow-auto p-8 relative"><Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/extract" element={<ProducerExtract />} />
            <Route path="/users" element={<UsersManager />} />
            <Route path="/integrations" element={<Integrations />} />
        </Routes></main>
    </div>
);

export default function App() {
  const { user, login, logout } = useAuth();
  if (!user) return <Login onLogin={login} />;
  return <BrowserRouter><Layout user={user} logout={logout} /><style>{` .input-field { width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; outline: none; background: #fff; } .btn-primary { background-color: #f97316; color: white; padding: 0.6rem 1.2rem; border-radius: 0.75rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem; } `}</style></BrowserRouter>;
}