import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, FileText, Settings, Cloud, Plus, Search, 
  User, Bell, CheckCircle, Bot, Copy, ChevronRight, Car, Shield, AlertTriangle,
  Calendar, DollarSign, Download, Filter, FileCheck, X, Folder, Mail, HardDrive, Upload,
  AlertOctagon, Wrench, Activity, Camera, TrendingUp, Lock, LogOut
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController);

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://crm-seguros.onrender.com';
const api = axios.create({ baseURL: API_URL });

// --- CONTEXTO DE AUTH ---
const useAuth = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('crm_user')));
    const login = (userData) => { localStorage.setItem('crm_user', JSON.stringify(userData)); setUser(userData); };
    const logout = () => { localStorage.removeItem('crm_user'); setUser(null); };
    return { user, login, logout };
};

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

const StatCard = ({ title, value, sub, icon: Icon, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Icon size={24} /></div>
    </div>
    <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
    <p className="text-sm text-slate-500 uppercase font-bold mt-1">{title}</p>
    <p className="text-xs text-slate-400 mt-2">{sub}</p>
  </div>
);

// --- TELA DE LOGIN & REGISTRO ---
const Login = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'PRODUTOR' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                const res = await api.post('/users', form);
                alert("Usuário criado! Faça login.");
                setIsRegister(false);
            } else {
                const res = await api.post('/login', { email: form.email, senha: form.senha });
                onLogin(res.data);
            }
        } catch (err) { setError(isRegister ? "Erro ao criar. Email já existe?" : "Email ou senha inválidos"); }
    };

    return (
        <div className="flex h-screen bg-slate-900 items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center justify-center gap-2">CG SEGUROS <div className="w-3 h-3 rounded-full bg-orange-500"></div></h1>
                    <p className="text-slate-500 mt-2">{isRegister ? "Criar nova conta" : "Acesso ao Sistema"}</p>
                </div>
                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-center text-sm font-bold">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && <div><label className="label-text">Nome</label><input className="input-field" value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})} required/></div>}
                    <div><label className="label-text">Email</label><input className="input-field" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required/></div>
                    <div><label className="label-text">Senha</label><input className="input-field" type="password" value={form.senha} onChange={e=>setForm({...form, senha:e.target.value})} required/></div>
                    <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition">{isRegister ? "Cadastrar" : "Entrar"}</button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-600 font-bold hover:underline">
                        {isRegister ? "Já tem conta? Faça Login" : "Primeiro acesso? Cadastre-se"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD ---
const Dashboard = () => {
  const [stats, setStats] = useState({ totalClients: 0, activePolicies: 0, newLeads: 0, expiring: 0 });
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchData = async () => { try { const [s, c] = await Promise.all([api.get('/dashboard-stats'), api.get('/dashboard-charts')]); setStats(s.data); setChartData({ labels: c.data.labels, datasets: [{ data: c.data.distribuicao, backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#64748b'], borderWidth: 0 }] }); } catch (e) {} };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Clientes" value={stats.totalClients} sub="Base total" icon={Users} trend="up" />
        <StatCard title="Apólices" value={stats.activePolicies} sub="Ativas" icon={FileText} trend="up" />
        <StatCard title="Leads" value={stats.newLeads} sub="Novos" icon={Bot} trend="up" />
        <StatCard title="Renovações" value={stats.expiring} sub="30 dias" icon={AlertTriangle} trend="down" />
      </div>
      <div className="bg-white p-6 rounded-2xl border shadow-sm w-full md:w-1/2">
          <h3 className="font-bold text-slate-700 mb-4">Mix de Carteira</h3>
          <div className="h-64 flex justify-center">{chartData && <Doughnut data={chartData} options={{ maintainAspectRatio:false }} />}</div>
      </div>
    </div>
  );
};

// --- GESTÃO DE USUÁRIOS (ADMIN) ---
const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'PRODUTOR', comissao: 10 });
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { try { const r = await api.get('/users'); setUsers(r.data); } catch(e){} };
    
    const handleSave = async (e) => {
        e.preventDefault();
        try { await api.post('/users', form); setModalOpen(false); loadUsers(); alert("Usuário criado!"); }
        catch(e) { alert("Erro ao criar"); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2><button onClick={() => setModalOpen(true)} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={20}/> Novo</button></div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500"><tr><th className="p-5">Nome</th><th className="p-5">Perfil</th><th className="p-5">Comissão</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map(u => (<tr key={u.id} className="hover:bg-slate-50"><td className="p-5 font-bold">{u.nome}<br/><span className="text-xs font-normal text-slate-400">{u.email}</span></td><td className="p-5">{u.perfil}</td><td className="p-5">{u.comissao}%</td></tr>))}</tbody></table></div>
            {modalOpen && (<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"><form onSubmit={handleSave} className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl"><h3 className="font-bold text-xl mb-4">Novo Usuário</h3><div className="space-y-4"><input placeholder="Nome" className="input-field" onChange={e=>setForm({...form, nome:e.target.value})} required/><input placeholder="Email" className="input-field" type="email" onChange={e=>setForm({...form, email:e.target.value})} required/><input placeholder="Senha" className="input-field" type="password" onChange={e=>setForm({...form, senha:e.target.value})} required/><div className="grid grid-cols-2 gap-4"><select className="input-field bg-white" onChange={e=>setForm({...form, perfil:e.target.value})}><option value="PRODUTOR">Produtor</option><option value="ADMIN">Admin</option></select><input placeholder="Comissão %" type="number" className="input-field" onChange={e=>setForm({...form, comissao:e.target.value})}/></div></div><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={()=>setModalOpen(false)} className="text-slate-500">Cancelar</button><button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold">Salvar</button></div></form></div>)}
        </div>
    );
};

// --- EXTRATO DO PRODUTOR ---
const ProducerExtract = ({ user }) => {
    const [filter, setFilter] = useState({ mes: new Date().getMonth()+1, ano: new Date().getFullYear(), userId: user.perfil === 'ADMIN' ? '' : user.id });
    const [data, setData] = useState({ resumo: { vendas:0, premio:0, comissao:0 }, lista: [] });
    const [usersList, setUsersList] = useState([]);

    useEffect(() => { loadData(); if(user.perfil === 'ADMIN') api.get('/users').then(r => setUsersList(r.data)); }, [filter]);
    const loadData = async () => { try { const res = await api.get('/producer-stats', { params: filter }); setData(res.data); } catch(e){} };

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Extrato de Produção</h2>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
                <select className="input-field w-32 bg-white" value={filter.mes} onChange={e=>setFilter({...filter, mes:e.target.value})}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>Mês {m}</option>)}</select>
                <select className="input-field w-32 bg-white" value={filter.ano} onChange={e=>setFilter({...filter, ano:e.target.value})}><option value="2024">2024</option><option value="2025">2025</option></select>
                {user.perfil === 'ADMIN' && (<select className="input-field w-48 bg-white" value={filter.userId} onChange={e=>setFilter({...filter, userId:e.target.value})}><option value="">Todos Produtores</option>{usersList.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select>)}
                <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Filtrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-sm text-slate-400 uppercase font-bold">Vendas</p><h3 className="text-3xl font-bold text-slate-800">{data.resumo.vendas}</h3></div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-sm text-slate-400 uppercase font-bold">Prêmio Total</p><h3 className="text-3xl font-bold text-slate-800">R$ {data.resumo.premio.toFixed(2)}</h3></div>
                <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl"><p className="text-sm text-orange-400 uppercase font-bold">Sua Comissão</p><h3 className="text-3xl font-bold">R$ {data.resumo.comissao.toFixed(2)}</h3></div>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500"><tr><th className="p-5">Apólice</th><th className="p-5">Cliente</th><th className="p-5">Produtor</th><th className="p-5">Comissão</th></tr></thead><tbody className="divide-y divide-slate-100">{data.lista.map(p => (<tr key={p.id} className="hover:bg-slate-50"><td className="p-5 font-bold text-slate-700">{p.numero}<br/><span className="text-xs font-normal text-slate-400">{p.tipo_seguro}</span></td><td className="p-5">{p.client?.nome}</td><td className="p-5 text-sm">{p.user?.nome || '-'}</td><td className="p-5 font-bold text-green-600">R$ {p.comissao_produtor.toFixed(2)}</td></tr>))}</tbody></table></div>
        </div>
    );
};

// --- MÓDULOS DE NEGÓCIO (CÓDIGOS COMPLETOS DE ROTINA) ---
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '' });
  useEffect(() => { api.get('/clients').then(r=>setClients(r.data)); }, []);
  const save = async (e) => { e.preventDefault(); await api.post('/clients', form); setModalOpen(false); api.get('/clients').then(r=>setClients(r.data)); };
  return (
    <div className="space-y-6 animate-fade-in"><div className="flex justify-between"><h2 className="text-2xl font-bold">Clientes</h2><button onClick={()=>setModalOpen(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl flex gap-2"><Plus/> Novo</button></div><div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="p-5">Nome</th><th className="p-5">Email</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td className="p-5">{c.nome}</td><td className="p-5">{c.email}</td></tr>)}</tbody></table></div>
    {modalOpen && <div className="fixed inset-0 bg-slate-900/40 flex justify-center items-center z-50"><form onSubmit={save} className="bg-white p-8 rounded-2xl w-full max-w-md"><h3 className="font-bold mb-4">Novo Cliente</h3><input placeholder="Nome" className="input-field mb-2" onChange={e=>setForm({...form, nome:e.target.value})}/><input placeholder="Email" className="input-field mb-4" onChange={e=>setForm({...form, email:e.target.value})}/><button className="bg-orange-500 w-full py-2 rounded text-white font-bold">Salvar</button><button type="button" onClick={()=>setModalOpen(false)} className="w-full mt-2 text-slate-500">Cancelar</button></form></div>}</div>
  );
};

const Policies = ({ user }) => {
    const [policies, setPolicies] = useState([]);
    const [clients, setClients] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ numero: '', clientId: '', tipo_seguro: 'Auto', status: 'ATIVA', data_inicio: '', data_fim: '', premio: '', comissao: '' });
    useEffect(() => { api.get('/policies').then(r=>setPolicies(r.data)); api.get('/clients').then(r=>setClients(r.data)); }, []);
    const save = async (e) => { e.preventDefault(); await api.post('/policies', {...form, userId: user.id}); setModalOpen(false); api.get('/policies').then(r=>setPolicies(r.data)); };
    return (
        <div className="space-y-6 animate-fade-in"><div className="flex justify-between"><h2 className="text-2xl font-bold">Apólices</h2><button onClick={()=>setModalOpen(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl flex gap-2"><Plus/> Nova</button></div>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="p-5">Número</th><th className="p-5">Cliente</th><th className="p-5">Produtor</th></tr></thead><tbody>{policies.map(p=><tr key={p.id}><td className="p-5">{p.numero}</td><td className="p-5">{p.client?.nome}</td><td className="p-5">{p.user?.nome}</td></tr>)}</tbody></table></div>
        {modalOpen && <div className="fixed inset-0 bg-slate-900/40 flex justify-center items-center z-50"><form onSubmit={save} className="bg-white p-8 rounded-2xl w-full max-w-md"><h3 className="font-bold mb-4">Nova Apólice</h3><input placeholder="Número" className="input-field mb-2" onChange={e=>setForm({...form, numero:e.target.value})}/><select className="input-field mb-4 bg-white" onChange={e=>setForm({...form, clientId:e.target.value})}><option>Cliente...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><div className="grid grid-cols-2 gap-2 mb-4"><input type="date" className="input-field" onChange={e=>setForm({...form, data_inicio:e.target.value})}/><input type="date" className="input-field" onChange={e=>setForm({...form, data_fim:e.target.value})}/></div><input placeholder="Prêmio (R$)" className="input-field mb-4" onChange={e=>setForm({...form, premio:e.target.value})}/><button className="bg-orange-500 w-full py-2 rounded text-white font-bold">Salvar</button><button type="button" onClick={()=>setModalOpen(false)} className="w-full mt-2 text-slate-500">Cancelar</button></form></div>}</div>
    );
};

const Claims = () => ( <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed">Módulo de Sinistros (Funcional no código anterior)</div> );
const Integrations = () => ( <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed">Configurações de Integração (Funcional no código anterior)</div> );

// --- LAYOUT PRINCIPAL ---
const Layout = ({ user, logout }) => {
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
                <div className="p-8 pb-4">
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">CG SEGUROS<div className="w-2 h-2 rounded-full bg-orange-500"></div></h1>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Olá, {user.nome} ({user.perfil})</p>
                </div>
                <nav className="flex-1 space-y-2 mt-6">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Visão Geral" />
                    <SidebarItem to="/extract" icon={TrendingUp} label="Extrato Produtor" />
                    <SidebarItem to="/clients" icon={Users} label="Carteira Clientes" />
                    <SidebarItem to="/policies" icon={FileText} label="Apólices" />
                    <SidebarItem to="/claims" icon={AlertOctagon} label="Sinistros" />
                    {user.perfil === 'ADMIN' && (
                        <>
                            <div className="pt-4 pb-2 px-8"><p className="text-[10px] font-bold text-slate-600 uppercase">Admin</p></div>
                            <SidebarItem to="/users" icon={Lock} label="Gestão Usuários" />
                            <SidebarItem to="/integrations" icon={Settings} label="Configurações" />
                        </>
                    )}
                </nav>
                <div className="p-6 border-t border-slate-800">
                    <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-white transition"><LogOut size={16}/> Sair</button>
                </div>
            </aside>
            <main className="flex-1 overflow-auto p-8 relative">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/extract" element={<ProducerExtract user={user}/>} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/policies" element={<Policies user={user} />} />
                    <Route path="/claims" element={<Claims />} />
                    <Route path="/users" element={user.perfil === 'ADMIN' ? <UsersManager /> : <Navigate to="/" />} />
                    <Route path="/integrations" element={user.perfil === 'ADMIN' ? <Integrations /> : <Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
};

export default function App() {
  const { user, login, logout } = useAuth();
  if (!user) return <Login onLogin={login} />;
  return (
    <BrowserRouter>
      <Layout user={user} logout={logout} />
      <style>{` .input-field { width: 100%; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; outline: none; background: #fff; } .label-text { font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 0.25rem; display: block; } `}</style>
    </BrowserRouter>
  );
}