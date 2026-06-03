import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://nuswyldwdqbgqxbvmyln.supabase.co";
const SUPABASE_KEY = "sb_publishable_VMWE_Y8_xvwvCBxXwx6YMg_q8QBEZu2";

const api = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${opts.token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const authApi = async (path, body) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Erro");
  return data;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  income: [
    { id:"salary", label:"Salário", icon:"💼" },
    { id:"freelance", label:"Freelance", icon:"💻" },
    { id:"investment", label:"Investimento", icon:"📈" },
    { id:"other_in", label:"Outro", icon:"➕" },
  ],
  expense: [
    { id:"food", label:"Alimentação", icon:"🍔" },
    { id:"transport", label:"Transporte", icon:"🚗" },
    { id:"housing", label:"Moradia", icon:"🏠" },
    { id:"health", label:"Saúde", icon:"❤️" },
    { id:"education", label:"Educação", icon:"📚" },
    { id:"leisure", label:"Lazer", icon:"🎮" },
    { id:"clothing", label:"Vestuário", icon:"👕" },
    { id:"other_out", label:"Outro", icon:"➖" },
  ],
};

const ACCENT_COLORS = {
  cyan:   { from:"#00e5ff", to:"#0066ff", label:"Ciano" },
  purple: { from:"#a855f7", to:"#6366f1", label:"Roxo" },
  green:  { from:"#22d3ee", to:"#16a34a", label:"Verde" },
  orange: { from:"#f97316", to:"#ef4444", label:"Laranja" },
  pink:   { from:"#ec4899", to:"#8b5cf6", label:"Rosa" },
};

const CAT_COLORS = ["#00E5FF","#FF6B6B","#FFD93D","#6BCB77","#845EC2","#FF9671","#F9F871","#4D8076"];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (n) => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(n);
const fmtShort = (n) => n >= 1000 ? `R$${(n/1000).toFixed(1)}k` : fmt(n);
function getMonthKey(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function getWeekKey(date) { const d = new Date(date); const s = new Date(d); s.setDate(d.getDate()-d.getDay()); return s.toISOString().slice(0,10); }

const TABS = [
  { id:"dashboard", icon:"⬡", label:"Início" },
  { id:"transactions", icon:"↕", label:"Lançamentos" },
  { id:"goals", icon:"◎", label:"Metas" },
  { id:"limits", icon:"⊘", label:"Limites" },
  { id:"compare", icon:"⇌", label:"Comparar" },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#08080f}::-webkit-scrollbar-thumb{background:#252535;border-radius:4px}
  .card{background:#0f0f1a;border:1px solid #1c1c2e;border-radius:20px}
  .card-glow{background:#0f0f1a;border:1px solid #1c1c2e;border-radius:20px;box-shadow:0 0 30px rgba(0,229,255,0.04)}
  .btn-primary{border:none;border-radius:14px;padding:13px 24px;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .2s,transform .1s;font-family:inherit}
  .btn-primary:active{transform:scale(.97)}
  .btn-primary:hover{opacity:.88}
  .btn-ghost{background:transparent;border:1px solid #252535;color:#8080a0;border-radius:12px;padding:9px 16px;font-size:13px;cursor:pointer;transition:all .2s;font-family:inherit}
  .btn-ghost:hover{border-color:#ffffff22;color:#e8e8f0}
  .input{background:#13131f;border:1px solid #252535;border-radius:12px;color:#e8e8f0;padding:12px 16px;font-size:14px;width:100%;outline:none;transition:border .2s;font-family:inherit}
  .input:focus{border-color:#00e5ff55}
  .tab-btn{background:none;border:none;color:#303050;font-size:10px;font-weight:700;cursor:pointer;padding:6px 0;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color .2s;min-width:52px;letter-spacing:.5px;text-transform:uppercase;font-family:inherit}
  .tab-btn.active{color:#e8e8f0}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);z-index:100;display:flex;align-items:flex-end;justify-content:center}
  .modal{background:#0f0f1a;border:1px solid #1c1c2e;border-radius:28px 28px 0 0;padding:24px 20px 48px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto}
  .modal-handle{width:40px;height:4px;background:#252535;border-radius:2px;margin:0 auto 20px}
  select.input option{background:#13131f}
  .alert-d{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.2);border-radius:12px;padding:10px 14px;font-size:12px;color:#ff6b6b}
  .alert-w{background:rgba(255,217,61,.07);border:1px solid rgba(255,217,61,.2);border-radius:12px;padding:10px 14px;font-size:12px;color:#ffd93d}
  .stat-chip{background:#13131f;border:1px solid #1c1c2e;border-radius:12px;padding:12px 14px}
  .spin{animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handle() {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "login") {
        const data = await authApi("token?grant_type=password", { email, password });
        onAuth(data.access_token, data.user);
      } else if (mode === "register") {
        await authApi("signup", { email, password, data: { name } });
        setSuccess("Conta criada! Verifique seu e-mail para confirmar.");
        setMode("login");
      } else {
        await authApi("recover", { email });
        setSuccess("E-mail de recuperação enviado!");
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#08080f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:380, display:"flex", flexDirection:"column", gap:24 }}>
        {/* Logo */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Space Grotesk'", fontSize:40, fontWeight:700, background:"linear-gradient(135deg,#00e5ff,#0066ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Fluxo</div>
          <div style={{ fontSize:13, color:"#505068", marginTop:4 }}>Seu dinheiro, sob controle</div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", background:"#0f0f1a", border:"1px solid #1c1c2e", borderRadius:14, padding:4, gap:4 }}>
          {[["login","Entrar"],["register","Criar conta"]].map(([m,l]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex:1, padding:"9px 0", borderRadius:11, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", background:mode===m?"#1e1e30":"transparent", color:mode===m?"#e8e8f0":"#505068", transition:"all .2s" }}>{l}</button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="register" && <input className="input" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />}
          <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />
          {mode!=="forgot" && <input className="input" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />}

          {error && <div className="alert-d">{error}</div>}
          {success && <div style={{ background:"rgba(107,203,119,.08)", border:"1px solid rgba(107,203,119,.2)", borderRadius:12, padding:"10px 14px", fontSize:12, color:"#6bcb77" }}>{success}</div>}

          <button className="btn-primary" onClick={handle} disabled={loading} style={{ background:"linear-gradient(135deg,#00e5ff,#0066ff)", color:"#000", width:"100%", padding:14, marginTop:4 }}>
            {loading ? <span className="spin" style={{ display:"inline-block" }}>⟳</span> : mode==="login" ? "Entrar" : mode==="register" ? "Criar conta" : "Enviar e-mail"}
          </button>

          {mode==="login" && <button onClick={() => setMode("forgot")} style={{ background:"none", border:"none", color:"#505068", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Esqueci minha senha</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState("cyan");
  const g = `linear-gradient(135deg,${ACCENT_COLORS[accent].from},${ACCENT_COLORS[accent].to})`;
  const slides = [
    { icon:"💸", title:"Bem-vindo ao Fluxo", sub:"Controle total do seu dinheiro, de forma simples e visual." },
    { icon:"📊", title:"Monitore tudo", sub:"Entradas, saídas, metas e limites de gastos em um só lugar." },
    { icon:"🎯", title:"Alcance seus objetivos", sub:"Crie metas de economia e acompanhe seu progresso em tempo real." },
  ];
  return (
    <div style={{ minHeight:"100vh", background:"#08080f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{CSS}</style>
      {step < 3 ? (
        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column", alignItems:"center", gap:32 }}>
          <div style={{ display:"flex", gap:8 }}>
            {slides.map((_,i) => <div key={i} style={{ width:i===step?24:8, height:8, borderRadius:4, background:i===step?ACCENT_COLORS[accent].from:"#2a2a3a", transition:"all .3s" }} />)}
          </div>
          <div style={{ width:100, height:100, borderRadius:28, background:"#12121e", border:"1px solid #2a2a3a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>{slides[step].icon}</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:26, fontWeight:700, color:"#e8e8f0", marginBottom:12 }}>{slides[step].title}</div>
            <div style={{ fontSize:15, color:"#808098", lineHeight:1.6 }}>{slides[step].sub}</div>
          </div>
          <button onClick={() => setStep(s => s+1)} style={{ background:g, color:"#000", border:"none", borderRadius:14, padding:"14px 48px", fontWeight:700, fontSize:15, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
            {step===slides.length-1?"Vamos lá →":"Continuar →"}
          </button>
        </div>
      ) : (
        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:24, fontWeight:700, color:"#e8e8f0", marginBottom:8 }}>Como posso te chamar?</div>
            <div style={{ fontSize:14, color:"#606080" }}>Personalize sua experiência</div>
          </div>
          <input className="input" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} style={{ textAlign:"center", fontSize:16 }} />
          <div>
            <div style={{ fontSize:13, color:"#606080", marginBottom:12, textAlign:"center" }}>Escolha sua cor</div>
            <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
              {Object.entries(ACCENT_COLORS).map(([k,v]) => (
                <div key={k} onClick={() => setAccent(k)} style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${v.from},${v.to})`, cursor:"pointer", border:accent===k?"3px solid #fff":"3px solid transparent", transition:"border .2s" }} />
              ))}
            </div>
          </div>
          <button onClick={() => onDone(name||"Você", accent)} style={{ background:g, color:"#000", border:"none", borderRadius:14, padding:"14px 48px", fontWeight:700, fontSize:15, cursor:"pointer", width:"100%", fontFamily:"inherit", marginTop:8 }}>Entrar no Fluxo ✦</button>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("fluxo_token"));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [limitsData, setLimitsData] = useState({});
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type:"expense", amount:"", category:"food", description:"", date:new Date().toISOString().slice(0,10) });
  const [goalForm, setGoalForm] = useState({ label:"", target:"", saved:"", deadline:"" });
  const [limitForm, setLimitForm] = useState({ category:"food", amount:"" });
  const [recurForm, setRecurForm] = useState({ description:"", amount:"", category:"food", type:"expense", day:"1" });
  const [filterMonth, setFilterMonth] = useState(getMonthKey(new Date()));
  const [compareMonths, setCompareMonths] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [saving, setSaving] = useState(false);

  const accent = ACCENT_COLORS[profile?.accent || "cyan"];
  const grad = `linear-gradient(135deg,${accent.from},${accent.to})`;

  // ── Load all data
  async function loadAll(tk) {
    setLoading(true);
    try {
      const [txs, gls, lims, recs, prof] = await Promise.all([
        api("transactions?order=date.desc", { token: tk }),
        api("goals?order=created_at.desc", { token: tk }),
        api("limits", { token: tk }),
        api("recurring?order=created_at.desc", { token: tk }),
        api("profiles?limit=1", { token: tk }),
      ]);
      setTransactions(txs || []);
      setGoals(gls || []);
      const limMap = {};
      (lims || []).forEach(l => { limMap[l.category] = l.amount; });
      setLimitsData(limMap);
      setRecurring(recs || []);
      if (prof && prof.length > 0) { setProfile(prof[0]); setOnboarded(true); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    if (token) {
      // Get user from token
      fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(u => { if (u.id) { setUser(u); loadAll(token); } else { logout(); } })
        .catch(logout);
    } else { setLoading(false); }
  }, [token]);

  function logout() {
    localStorage.removeItem("fluxo_token");
    setToken(null); setUser(null); setProfile(null); setOnboarded(false);
    setTransactions([]); setGoals([]); setLimitsData({}); setRecurring([]);
  }

  function handleAuth(tk, u) {
    localStorage.setItem("fluxo_token", tk);
    setToken(tk); setUser(u); loadAll(tk);
  }

  async function handleOnboardingDone(name, ac) {
    setSaving(true);
    try {
      await api("profiles", { method:"POST", token, body: JSON.stringify({ id: user.id, name, accent: ac }), prefer:"return=representation" });
      setProfile({ name, accent: ac });
      setOnboarded(true);
    } catch (e) {
      // maybe already exists, try upsert
      try {
        await api(`profiles?id=eq.${user.id}`, { method:"PATCH", token, body: JSON.stringify({ name, accent: ac }) });
        setProfile({ name, accent: ac }); setOnboarded(true);
      } catch {}
    }
    setSaving(false);
  }

  // ── Derived data
  const filtered = transactions.filter(tx => getMonthKey(tx.date) === filterMonth);
  const totalIn  = filtered.filter(t => t.type==="income").reduce((s,t) => s+t.amount, 0);
  const totalOut = filtered.filter(t => t.type==="expense").reduce((s,t) => s+t.amount, 0);
  const balance  = totalIn - totalOut;

  const catSpendMap = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type==="expense").forEach(t => { map[t.category]=(map[t.category]||0)+t.amount; });
    return map;
  }, [filtered]);

  const catData = useMemo(() => Object.entries(catSpendMap).map(([cat,val]) => {
    const info = CATEGORIES.expense.find(c => c.id===cat)||{ label:cat, icon:"💰" };
    return { name:info.label, icon:info.icon, value:val, id:cat };
  }).sort((a,b) => b.value-a.value), [catSpendMap]);

  const balanceEvolution = useMemo(() => {
    const days = {};
    filtered.forEach(t => {
      const d = t.date.slice(8,10);
      if (!days[d]) days[d] = 0;
      days[d] += t.type==="income" ? t.amount : -t.amount;
    });
    let cum = 0;
    return Object.entries(days).sort().map(([d,v]) => { cum+=v; return { day:parseInt(d), value:cum }; });
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const k = getMonthKey(t.date);
      if (!map[k]) map[k] = { income:0, expense:0 };
      map[k][t.type] += t.amount;
    });
    return Object.entries(map).sort().slice(-6).map(([k,v]) => {
      const [,m] = k.split("-");
      return { name:MONTHS[parseInt(m)-1], key:k, ...v };
    });
  }, [transactions]);

  const weeklyData = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const wk = getWeekKey(t.date);
      if (!map[wk]) map[wk] = { income:0, expense:0 };
      map[wk][t.type] += t.amount;
    });
    return Object.entries(map).sort().map(([,v],i) => ({ ...v, name:`Sem ${i+1}` }));
  }, [filtered]);

  const compareData = useMemo(() => {
    if (compareMonths.length < 2) return [];
    return compareMonths.map(mk => {
      const txs = transactions.filter(t => getMonthKey(t.date)===mk);
      const inc = txs.filter(t => t.type==="income").reduce((s,t)=>s+t.amount,0);
      const exp = txs.filter(t => t.type==="expense").reduce((s,t)=>s+t.amount,0);
      const [,m] = mk.split("-");
      return { name:MONTHS[parseInt(m)-1], income:inc, expense:exp, balance:inc-exp };
    });
  }, [compareMonths, transactions]);

  useEffect(() => {
    const newAlerts = [];
    Object.entries(limitsData).forEach(([cat,limit]) => {
      const spent = catSpendMap[cat]||0; const pct = (spent/limit)*100;
      const info = CATEGORIES.expense.find(c => c.id===cat);
      if (pct>=100) newAlerts.push({ type:"danger", msg:`🚨 Limite de ${info?.label} ultrapassado! (${fmt(spent)} / ${fmt(limit)})` });
      else if (pct>=80) newAlerts.push({ type:"warn", msg:`⚠️ ${info?.label}: ${pct.toFixed(0)}% do limite usado` });
    });
    setAlerts(newAlerts);
  }, [catSpendMap, limitsData]);

  // ── CRUD
  async function addTx() {
    if (!form.amount||isNaN(form.amount)) return;
    setSaving(true);
    try {
      const tx = { user_id:user.id, type:form.type, amount:parseFloat(form.amount), category:form.category, description:form.description, date:form.date };
      const res = await api("transactions", { method:"POST", token, body:JSON.stringify(tx) });
      setTransactions(prev => [res[0], ...prev]);
      setModal(null);
      setForm({ type:"expense", amount:"", category:"food", description:"", date:new Date().toISOString().slice(0,10) });
    } catch(e) { alert("Erro ao salvar: "+e.message); }
    setSaving(false);
  }

  async function deleteTx(id) {
    setTransactions(prev => prev.filter(t => t.id!==id));
    await api(`transactions?id=eq.${id}`, { method:"DELETE", token, prefer:"" }).catch(console.error);
  }

  async function addGoal() {
    if (!goalForm.label||!goalForm.target) return;
    setSaving(true);
    try {
      const g = { user_id:user.id, label:goalForm.label, target:parseFloat(goalForm.target), saved:parseFloat(goalForm.saved||0), deadline:goalForm.deadline||null };
      const res = await api("goals", { method:"POST", token, body:JSON.stringify(g) });
      setGoals(prev => [res[0], ...prev]);
      setModal(null); setGoalForm({ label:"", target:"", saved:"", deadline:"" });
    } catch(e) { alert("Erro: "+e.message); }
    setSaving(false);
  }

  async function updateGoalSaved(id, val) {
    const saved = Math.min(parseFloat(val)||0, goals.find(g=>g.id===id)?.target||0);
    setGoals(prev => prev.map(g => g.id===id ? { ...g, saved } : g));
    await api(`goals?id=eq.${id}`, { method:"PATCH", token, body:JSON.stringify({ saved }), prefer:"" }).catch(console.error);
  }

  async function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id!==id));
    await api(`goals?id=eq.${id}`, { method:"DELETE", token, prefer:"" }).catch(console.error);
  }

  async function setLimitFn() {
    if (!limitForm.amount||isNaN(limitForm.amount)) return;
    setSaving(true);
    try {
      const body = { user_id:user.id, category:limitForm.category, amount:parseFloat(limitForm.amount) };
      await api("limits", { method:"POST", token, body:JSON.stringify(body), prefer:"resolution=merge-duplicates,return=representation" });
      setLimitsData(prev => ({ ...prev, [limitForm.category]:parseFloat(limitForm.amount) }));
      setModal(null); setLimitForm({ category:"food", amount:"" });
    } catch(e) { alert("Erro: "+e.message); }
    setSaving(false);
  }

  async function removeLimit(cat) {
    setLimitsData(prev => { const l={...prev}; delete l[cat]; return l; });
    await api(`limits?user_id=eq.${user.id}&category=eq.${cat}`, { method:"DELETE", token, prefer:"" }).catch(console.error);
  }

  async function addRecurring() {
    if (!recurForm.amount||!recurForm.description) return;
    setSaving(true);
    try {
      const r = { user_id:user.id, description:recurForm.description, amount:parseFloat(recurForm.amount), category:recurForm.category, type:recurForm.type, day:parseInt(recurForm.day) };
      const res = await api("recurring", { method:"POST", token, body:JSON.stringify(r) });
      setRecurring(prev => [res[0], ...prev]);
      setModal(null); setRecurForm({ description:"", amount:"", category:"food", type:"expense", day:"1" });
    } catch(e) { alert("Erro: "+e.message); }
    setSaving(false);
  }

  async function deleteRecurring(id) {
    setRecurring(prev => prev.filter(r => r.id!==id));
    await api(`recurring?id=eq.${id}`, { method:"DELETE", token, prefer:"" }).catch(console.error);
  }

  async function updateProfile(updates) {
    setProfile(prev => ({ ...prev, ...updates }));
    await api(`profiles?id=eq.${user.id}`, { method:"PATCH", token, body:JSON.stringify(updates), prefer:"" }).catch(console.error);
  }

  function toggleCompareMonth(mk) { setCompareMonths(prev => prev.includes(mk)?prev.filter(m=>m!==mk):prev.length<3?[...prev,mk]:prev); }

  function exportCSV() {
    const rows = [["Data","Tipo","Categoria","Descrição","Valor"]];
    transactions.forEach(t => { const cat=[...CATEGORIES.income,...CATEGORIES.expense].find(c=>c.id===t.category); rows.push([t.date,t.type==="income"?"Entrada":"Saída",cat?.label||t.category,t.description||"",t.amount.toFixed(2)]); });
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8;"})); a.download="fluxo.csv"; a.click();
  }

  const cats = form.type==="income" ? CATEGORIES.income : CATEGORIES.expense;

  // ── Gates
  if (!token) return <AuthScreen onAuth={handleAuth} />;
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#08080f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Space Grotesk'", fontSize:32, fontWeight:700, background:"linear-gradient(135deg,#00e5ff,#0066ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:20 }}>Fluxo</div>
        <div className="spin" style={{ fontSize:24, display:"inline-block", color:"#00e5ff" }}>⟳</div>
      </div>
    </div>
  );
  if (!onboarded) return <Onboarding onDone={handleOnboardingDone} />;

  const firstName = (profile?.name||"").split(" ")[0] || "Você";

  return (
    <div style={{ minHeight:"100vh", background:"#08080f", color:"#e8e8f0", fontFamily:"'DM Sans','Segoe UI',sans-serif", paddingBottom:88 }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding:"28px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:13, color:"#505068", marginBottom:4 }}>Olá, {firstName} 👋</div>
          <div style={{ fontFamily:"'Space Grotesk'", fontSize:28, fontWeight:700, background:grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1 }}>Fluxo</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button className="btn-ghost" onClick={() => setModal("profile")} style={{ padding:"8px 12px", fontSize:18 }}>⚙</button>
          <button className="btn-ghost" onClick={exportCSV} style={{ padding:"8px 12px", fontSize:12 }}>⬇ CSV</button>
          <button onClick={() => setModal("add")} style={{ background:grad, color:"#000", border:"none", borderRadius:14, padding:"10px 18px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>+ Lançar</button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length>0 && tab==="dashboard" && (
        <div style={{ padding:"12px 20px 0", display:"flex", flexDirection:"column", gap:6 }}>
          {alerts.map((a,i) => <div key={i} className={a.type==="danger"?"alert-d":"alert-w"}>{a.msg}</div>)}
        </div>
      )}

      {/* Month selector */}
      <div style={{ padding:"14px 20px 0", display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
        {Array.from({ length:6 }, (_,i) => {
          const d = new Date(); d.setMonth(d.getMonth()-(5-i));
          const k = getMonthKey(d); const active = filterMonth===k;
          return <button key={k} onClick={() => setFilterMonth(k)} style={{ background:active?grad:"#0f0f1a", border:active?"none":"1px solid #1c1c2e", color:active?"#000":"#606080", borderRadius:10, padding:"6px 18px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", letterSpacing:.5, flexShrink:0, fontFamily:"inherit" }}>{MONTHS[d.getMonth()]}</button>;
        })}
      </div>

      {/* DASHBOARD */}
      {tab==="dashboard" && (
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card-glow" style={{ padding:"24px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle,${accent.from}18,transparent 70%)` }} />
            <div style={{ fontSize:11, color:"#505068", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Saldo do mês</div>
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:38, fontWeight:700, color:balance>=0?accent.from:"#ff6b6b", lineHeight:1, marginBottom:16 }}>{fmt(balance)}</div>
            <div style={{ height:3, background:"#1c1c2e", borderRadius:4, marginBottom:8 }}>
              <div style={{ height:"100%", width:`${Math.min(100,totalIn?(totalOut/totalIn)*100:0)}%`, background:balance>=0?grad:"#ff6b6b", borderRadius:4, transition:"width .6s" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:"#6bcb77", fontWeight:600 }}>↑ {fmt(totalIn)}</span>
              <span style={{ fontSize:12, color:"#ff6b6b", fontWeight:600 }}>↓ {fmt(totalOut)}</span>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[
              { label:"Lançamentos", value:filtered.length },
              { label:"Maior gasto", value:fmtShort(Math.max(0,...filtered.filter(t=>t.type==="expense").map(t=>t.amount))) },
              { label:"Economia", value:totalIn>0?`${Math.max(0,((balance/totalIn)*100)).toFixed(0)}%`:"—" },
            ].map(s => (
              <div key={s.label} className="stat-chip">
                <div style={{ fontSize:17, fontWeight:700, fontFamily:"'Space Grotesk'", color:"#e8e8f0" }}>{s.value}</div>
                <div style={{ fontSize:10, color:"#505068", marginTop:3, letterSpacing:.5 }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {balanceEvolution.length>1 && (
            <div className="card" style={{ padding:"18px 18px 10px" }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color:"#a0a0c0" }}>Evolução do saldo</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={balanceEvolution}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent.from} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={accent.from} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill:"#404060", fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background:"#13131f", border:"1px solid #252535", borderRadius:10, color:"#e8e8f0", fontSize:12 }} formatter={v => fmt(v)} labelFormatter={l => `Dia ${l}`} />
                  <Area type="monotone" dataKey="value" stroke={accent.from} strokeWidth={2} fill="url(#balGrad)" dot={false} name="Saldo" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {weeklyData.length>0 && (
            <div className="card" style={{ padding:"18px 18px 10px" }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color:"#a0a0c0" }}>Resumo semanal</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill:"#404060", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background:"#13131f", border:"1px solid #252535", borderRadius:10, color:"#e8e8f0", fontSize:12 }} formatter={v => fmt(v)} />
                  <Bar dataKey="income" fill="#6bcb77" radius={[6,6,0,0]} name="Entrada" />
                  <Bar dataKey="expense" fill="#ff6b6b" radius={[6,6,0,0]} name="Saída" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {monthlyData.length>1 && (
            <div className="card" style={{ padding:"18px 18px 10px" }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color:"#a0a0c0" }}>Histórico 6 meses</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={monthlyData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill:"#404060", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background:"#13131f", border:"1px solid #252535", borderRadius:10, color:"#e8e8f0", fontSize:12 }} formatter={v => fmt(v)} />
                  <Bar dataKey="income" fill="#6bcb77" radius={[6,6,0,0]} name="Entrada" />
                  <Bar dataKey="expense" fill="#ff6b6b" radius={[6,6,0,0]} name="Saída" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {catData.length>0 && (
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color:"#a0a0c0" }}>Gastos por categoria</div>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <PieChart width={100} height={100}>
                  <Pie data={catData} cx={46} cy={46} innerRadius={26} outerRadius={46} dataKey="value" stroke="none">
                    {catData.map((_,i) => <Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                  {catData.slice(0,5).map((c,i) => {
                    const limit = limitsData[c.id];
                    const pct = limit ? Math.min(100,(c.value/limit)*100) : null;
                    return (
                      <div key={c.name}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:7, height:7, borderRadius:2, background:CAT_COLORS[i%CAT_COLORS.length], flexShrink:0 }} />
                            <span style={{ fontSize:11, color:"#8080a0" }}>{c.icon} {c.name}</span>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:pct&&pct>=80?"#ff6b6b":CAT_COLORS[i%CAT_COLORS.length] }}>{fmt(c.value)}</span>
                        </div>
                        {pct!==null && <div style={{ height:2, background:"#1c1c2e", borderRadius:2, marginTop:3 }}><div style={{ height:"100%", width:`${pct}%`, background:pct>=100?"#ff6b6b":pct>=80?"#ffd93d":accent.from, borderRadius:2 }} /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS */}
      {tab==="transactions" && (
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:10 }}>
          <button className="btn-ghost" onClick={() => setModal("recurring")} style={{ width:"100%", padding:12, borderStyle:"dashed", fontSize:13 }}>🔁 Contas Recorrentes</button>
          {filtered.length===0 && <div style={{ textAlign:"center", padding:"60px 0", color:"#404060" }}><div style={{ fontSize:40, marginBottom:12 }}>📭</div><div style={{ fontSize:14 }}>Nenhum lançamento neste mês</div></div>}
          {filtered.map(tx => {
            const catList = tx.type==="income" ? CATEGORIES.income : CATEGORIES.expense;
            const cat = catList.find(c => c.id===tx.category)||{ label:tx.category, icon:"💰" };
            return (
              <div key={tx.id} className="card" style={{ padding:"13px 14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:13, background:tx.type==="income"?"rgba(107,203,119,.1)":"rgba(255,107,107,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.description||cat.label}</div>
                  <div style={{ fontSize:11, color:"#505068", marginTop:2 }}>{cat.label} · {tx.date}{tx.recurring_id?" 🔁":""}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontFamily:"'Space Grotesk'", fontWeight:700, color:tx.type==="income"?"#6bcb77":"#ff6b6b", fontSize:14 }}>{tx.type==="income"?"+":"-"}{fmt(tx.amount)}</div>
                  <button onClick={() => deleteTx(tx.id)} style={{ background:"none", border:"none", color:"#303050", cursor:"pointer", fontSize:11, marginTop:1, fontFamily:"inherit" }}>remover</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GOALS */}
      {tab==="goals" && (
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          <button className="btn-ghost" onClick={() => setModal("goal")} style={{ width:"100%", padding:13, borderStyle:"dashed", fontSize:13 }}>+ Nova Meta de Economia</button>
          {goals.length===0 && <div style={{ textAlign:"center", padding:"50px 0", color:"#404060" }}><div style={{ fontSize:40, marginBottom:10 }}>🎯</div><div style={{ fontSize:13 }}>Crie metas para alcançar seus objetivos</div></div>}
          {goals.map(g => {
            const pct = Math.min(100,(g.saved/g.target)*100);
            return (
              <div key={g.id} className="card" style={{ padding:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{g.label}</div>
                    {g.deadline && <div style={{ fontSize:11, color:"#505068", marginTop:2 }}>Prazo: {g.deadline}</div>}
                  </div>
                  <button onClick={() => deleteGoal(g.id)} style={{ background:"none", border:"none", color:"#303050", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:14, color:accent.from, fontWeight:700 }}>{fmt(g.saved)}</span>
                  <span style={{ fontSize:12, color:"#505068" }}>de {fmt(g.target)}</span>
                </div>
                <div style={{ height:6, background:"#1c1c2e", borderRadius:4, marginBottom:10 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:pct>=100?"#6bcb77":grad, borderRadius:4, transition:"width .5s" }} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input type="number" className="input" placeholder="Atualizar valor guardado" style={{ flex:1, fontSize:12, padding:"8px 12px" }} onBlur={e => { if (e.target.value) { updateGoalSaved(g.id,e.target.value); e.target.value=""; } }} />
                  <div style={{ fontSize:12, color:pct>=100?"#6bcb77":"#606080", fontWeight:700, whiteSpace:"nowrap" }}>{pct.toFixed(0)}%{pct>=100?" ✅":""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIMITS */}
      {tab==="limits" && (
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          <button className="btn-ghost" onClick={() => setModal("limit")} style={{ width:"100%", padding:13, borderStyle:"dashed", fontSize:13 }}>+ Definir Limite por Categoria</button>
          {Object.keys(limitsData).length===0 && <div style={{ textAlign:"center", padding:"50px 0", color:"#404060" }}><div style={{ fontSize:40, marginBottom:10 }}>⊘</div><div style={{ fontSize:13 }}>Defina limites para controlar seus gastos</div></div>}
          {Object.entries(limitsData).map(([cat,limit]) => {
            const info = CATEGORIES.expense.find(c => c.id===cat)||{ label:cat, icon:"💰" };
            const spent = catSpendMap[cat]||0; const pct = Math.min(100,(spent/limit)*100);
            const color = pct>=100?"#ff6b6b":pct>=80?"#ffd93d":accent.from;
            return (
              <div key={cat} className="card" style={{ padding:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{info.icon} {info.label}</div>
                  <button onClick={() => removeLimit(cat)} style={{ background:"none", border:"none", color:"#303050", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>✕</button>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:13, color, fontWeight:700 }}>{fmt(spent)}</span>
                  <span style={{ fontSize:12, color:"#505068" }}>limite {fmt(limit)}</span>
                </div>
                <div style={{ height:6, background:"#1c1c2e", borderRadius:4, marginBottom:6 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:4, transition:"width .5s" }} />
                </div>
                <div style={{ fontSize:11, color }}>{pct>=100?"🚨 Limite ultrapassado!":pct>=80?`⚠️ ${pct.toFixed(0)}% atingido`:`${pct.toFixed(0)}% do limite usado`}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPARE */}
      {tab==="compare" && (
        <div style={{ padding:"14px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontSize:12, color:"#505068", marginBottom:10 }}>Selecione até 3 meses para comparar</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {Array.from({ length:6 }, (_,i) => {
                const d = new Date(); d.setMonth(d.getMonth()-(5-i));
                const k = getMonthKey(d); const sel = compareMonths.includes(k);
                return <button key={k} onClick={() => toggleCompareMonth(k)} style={{ background:sel?grad:"#13131f", border:sel?"none":"1px solid #1c1c2e", color:sel?"#000":"#8080a0", borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{MONTHS[d.getMonth()]}</button>;
              })}
            </div>
          </div>
          {compareData.length>=2 ? (
            <>
              <div className="card" style={{ padding:"18px 18px 10px" }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:14, color:"#a0a0c0" }}>Entradas vs Saídas</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={compareData} barGap={4}>
                    <XAxis dataKey="name" tick={{ fill:"#404060", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background:"#13131f", border:"1px solid #252535", borderRadius:10, color:"#e8e8f0", fontSize:12 }} formatter={v => fmt(v)} />
                    <Bar dataKey="income" fill="#6bcb77" radius={[6,6,0,0]} name="Entrada" />
                    <Bar dataKey="expense" fill="#ff6b6b" radius={[6,6,0,0]} name="Saída" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {compareData.map(m => (
                <div key={m.name} className="card" style={{ padding:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:16 }}>{m.name}</div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, color:"#6bcb77" }}>+{fmt(m.income)}</div>
                    <div style={{ fontSize:12, color:"#ff6b6b" }}>-{fmt(m.expense)}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:m.balance>=0?accent.from:"#ff6b6b", marginTop:2 }}>{fmt(m.balance)}</div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"50px 0", color:"#404060" }}><div style={{ fontSize:40, marginBottom:10 }}>⇌</div><div style={{ fontSize:13 }}>Selecione ao menos 2 meses</div></div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0a0a14", borderTop:"1px solid #14142a", display:"flex", justifyContent:"space-around", padding:"10px 0 18px" }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)}>
            <span style={{ fontSize:18, color:tab===t.id?accent.from:"#303050" }}>{t.icon}</span>
            <span style={{ color:tab===t.id?"#e8e8f0":"#303050" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODAL: Add Transaction */}
      {modal==="add" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:700, marginBottom:16 }}>Novo Lançamento</div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {["expense","income"].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type:t, category:t==="income"?"salary":"food" }))} style={{ flex:1, padding:11, borderRadius:12, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, background:form.type===t?(t==="income"?"#6bcb77":"#ff6b6b"):"#1a1a2e", color:form.type===t?"#000":"#606080", fontFamily:"inherit" }}>
                  {t==="income"?"💰 Entrada":"💸 Saída"}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input className="input" type="number" placeholder="Valor (R$)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <input className="input" type="text" placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} />
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))} />
              <button className="btn-primary" onClick={addTx} disabled={saving} style={{ marginTop:4, width:"100%", padding:14, background:grad, color:"#000" }}>
                {saving ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Goal */}
      {modal==="goal" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:700, marginBottom:16 }}>Nova Meta 🎯</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input className="input" type="text" placeholder="Nome da meta" value={goalForm.label} onChange={e => setGoalForm(f => ({ ...f, label:e.target.value }))} />
              <input className="input" type="number" placeholder="Valor total (R$)" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target:e.target.value }))} />
              <input className="input" type="number" placeholder="Quanto já guardou? (R$)" value={goalForm.saved} onChange={e => setGoalForm(f => ({ ...f, saved:e.target.value }))} />
              <input className="input" type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline:e.target.value }))} />
              <button className="btn-primary" onClick={addGoal} disabled={saving} style={{ marginTop:4, width:"100%", padding:14, background:grad, color:"#000" }}>{saving?"Salvando...":"Criar Meta"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Limit */}
      {modal==="limit" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:700, marginBottom:16 }}>Definir Limite ⊘</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <select className="input" value={limitForm.category} onChange={e => setLimitForm(f => ({ ...f, category:e.target.value }))}>
                {CATEGORIES.expense.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <input className="input" type="number" placeholder="Limite mensal (R$)" value={limitForm.amount} onChange={e => setLimitForm(f => ({ ...f, amount:e.target.value }))} />
              <button className="btn-primary" onClick={setLimitFn} disabled={saving} style={{ marginTop:4, width:"100%", padding:14, background:grad, color:"#000" }}>{saving?"Salvando...":"Salvar Limite"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recurring */}
      {modal==="recurring" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:700, marginBottom:16 }}>Contas Recorrentes 🔁</div>
            {recurring.length>0 && (
              <div style={{ marginBottom:16, display:"flex", flexDirection:"column", gap:8 }}>
                {recurring.map(r => {
                  const cat = [...CATEGORIES.income,...CATEGORIES.expense].find(c => c.id===r.category);
                  return (
                    <div key={r.id} style={{ background:"#13131f", borderRadius:12, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div><div style={{ fontSize:13, fontWeight:600 }}>{cat?.icon} {r.description}</div><div style={{ fontSize:11, color:"#505068" }}>Todo dia {r.day} · {fmt(r.amount)}</div></div>
                      <button onClick={() => deleteRecurring(r.id)} style={{ background:"none", border:"none", color:"#505068", cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize:12, color:"#606080", marginBottom:10, fontWeight:600 }}>NOVA RECORRÊNCIA</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input className="input" type="text" placeholder="Ex: Aluguel, Netflix..." value={recurForm.description} onChange={e => setRecurForm(f => ({ ...f, description:e.target.value }))} />
              <input className="input" type="number" placeholder="Valor (R$)" value={recurForm.amount} onChange={e => setRecurForm(f => ({ ...f, amount:e.target.value }))} />
              <div style={{ display:"flex", gap:8 }}>
                <select className="input" value={recurForm.type} onChange={e => setRecurForm(f => ({ ...f, type:e.target.value, category:e.target.value==="income"?"salary":"food" }))}>
                  <option value="expense">💸 Saída</option>
                  <option value="income">💰 Entrada</option>
                </select>
                <select className="input" value={recurForm.category} onChange={e => setRecurForm(f => ({ ...f, category:e.target.value }))}>
                  {(recurForm.type==="income"?CATEGORIES.income:CATEGORIES.expense).map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <select className="input" value={recurForm.day} onChange={e => setRecurForm(f => ({ ...f, day:e.target.value }))}>
                {Array.from({ length:28 }, (_,i) => <option key={i+1} value={String(i+1)}>Todo dia {i+1}</option>)}
              </select>
              <button className="btn-primary" onClick={addRecurring} disabled={saving} style={{ marginTop:4, width:"100%", padding:14, background:grad, color:"#000" }}>{saving?"Salvando...":"Adicionar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Profile */}
      {modal==="profile" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontFamily:"'Space Grotesk'", fontSize:17, fontWeight:700, marginBottom:20 }}>Perfil & Configurações</div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <div style={{ fontSize:12, color:"#606080", marginBottom:8, fontWeight:600 }}>CONTA</div>
                <div style={{ background:"#13131f", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#a0a0c0" }}>📧 {user?.email}</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#606080", marginBottom:8, fontWeight:600 }}>NOME</div>
                <input className="input" type="text" placeholder="Seu nome" value={profile?.name||""} onChange={e => updateProfile({ name:e.target.value })} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#606080", marginBottom:10, fontWeight:600 }}>COR DO TEMA</div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {Object.entries(ACCENT_COLORS).map(([k,v]) => (
                    <div key={k} onClick={() => updateProfile({ accent:k })} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${v.from},${v.to})`, border:profile?.accent===k?"3px solid #fff":"3px solid transparent", transition:"border .2s" }} />
                      <span style={{ fontSize:10, color:"#606080" }}>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderTop:"1px solid #1c1c2e", paddingTop:16, display:"flex", flexDirection:"column", gap:8 }}>
                <button className="btn-ghost" onClick={exportCSV} style={{ width:"100%", padding:12 }}>⬇ Exportar CSV</button>
                <button className="btn-ghost" onClick={logout} style={{ width:"100%", padding:12, borderColor:"#ff6b6b44", color:"#ff6b6b88" }}>Sair da conta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
