import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Boxes, Check, ChevronRight, Cloud, Eye, EyeOff, Gauge, GitBranch, LogOut, Rocket, Server, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const API = '/api';

function Logo() {
  return <div className="logo"><span className="logo-mark"><Rocket size={18} /></span><span>LAUNCHPAD</span></div>;
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      localStorage.setItem('launchpad_token', data.token);
      onAuth(data.user);
    } catch (err) { setError(err.message || 'Could not connect to the server.'); }
    finally { setLoading(false); }
  }

  return <main className="auth-shell">
    <section className="brand-panel">
      <div className="orb orb-one" /><div className="orb orb-two" />
      <Logo />
      <div className="brand-copy">
        <div className="eyebrow"><Sparkles size={15} /> BUILT FOR MODERN TEAMS</div>
        <h1>Ship boldly.<br /><em>Scale beautifully.</em></h1>
        <p>Your calm, clear command center for every deployment, service, and breakthrough.</p>
        <div className="trust-row">
          <div className="avatars"><span>A</span><span>K</span><span>M</span><span>+</span></div>
          <p><strong>2,400+ builders</strong><br />deploying without the drama</p>
        </div>
      </div>
      <div className="deploy-card"><div className="deploy-icon"><Check size={17} /></div><div><b>Deployment successful</b><small>production · just now</small></div><span className="live-dot">LIVE</span></div>
    </section>
    <section className="form-panel">
      <div className="mobile-logo"><Logo /></div>
      <div className="form-wrap">
        <div className="form-heading"><span className="mini-icon"><Zap size={19} /></span><p>WELCOME {mode === 'login' ? 'BACK' : 'ABOARD'}</p></div>
        <h2>{mode === 'login' ? 'Good to see you.' : 'Create your account.'}</h2>
        <p className="subtitle">{mode === 'login' ? 'Enter your details to access your workspace.' : 'Start your next great deployment today.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>FULL NAME<input required autoComplete="name" placeholder="Alex Morgan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}
          <label>EMAIL ADDRESS<input required type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>PASSWORD<div className="password"><input required minLength="8" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><button type="button" aria-label="Toggle password visibility" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={loading}>{loading ? 'PLEASE WAIT…' : mode === 'login' ? 'ENTER WORKSPACE' : 'CREATE ACCOUNT'}<ArrowRight size={18} /></button>
        </form>
        <p className="switch">{mode === 'login' ? 'New to Launchpad?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        <div className="secure"><ShieldCheck size={15} /> Enterprise-grade security. Always encrypted.</div>
      </div>
    </section>
  </main>;
}

const cards = [
  { label: 'DEPLOYMENTS', value: '12', note: '+3 this week', icon: Rocket, tone: 'lime' },
  { label: 'UPTIME', value: '99.98%', note: 'All systems healthy', icon: Gauge, tone: 'violet' },
  { label: 'SERVICES', value: '4', note: 'Across 2 regions', icon: Boxes, tone: 'blue' },
  { label: 'ACTIVE ALERTS', value: '0', note: 'Looking good', icon: Bell, tone: 'orange' }
];

function Dashboard({ onLogout }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('launchpad_token')}` } })
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(onLogout);
  }, [onLogout]);
  if (!data) return <div className="loader"><span /><p>Preparing your workspace</p></div>;
  const firstName = data.user.name.split(' ')[0];
  return <div className="dashboard">
    <aside><Logo /><nav><a className="active"><Gauge /> Overview</a><a><Rocket /> Deployments</a><a><Server /> Services</a><a><GitBranch /> Pipelines</a><a><Cloud /> Infrastructure</a></nav><div className="aside-bottom"><div className="help"><Sparkles /><b>Need a hand?</b><small>Read the deployment guide</small></div><button onClick={onLogout}><LogOut /> Sign out</button></div></aside>
    <div className="dash-main">
      <header><div><span className="mobile-brand"><Logo /></span><p>WORKSPACE / PRODUCTION</p><h1>Good evening, {firstName}.</h1></div><div className="profile"><button aria-label="Notifications"><Bell /></button><span>{firstName[0]}</span><div><b>{data.user.name}</b><small>{data.user.email}</small></div></div></header>
      <section className="hero"><div><span className="status"><i /> ALL SYSTEMS OPERATIONAL</span><h2>Everything is running<br />smoothly.</h2><p>Your infrastructure is healthy and your latest release is live.</p></div><button>NEW DEPLOYMENT <Rocket size={18} /></button><div className="hero-grid" /></section>
      <section className="stats">{cards.map(({ label, value, note, icon: Icon, tone }) => <article key={label}><div className={`card-icon ${tone}`}><Icon /></div><span>{label}</span><strong>{data.stats[label.toLowerCase().replace('active ', '')] ?? value}</strong><small><Check size={13} /> {note}</small></article>)}</section>
      <section className="lower-grid"><div className="activity panel"><div className="panel-title"><div><p>RECENT ACTIVITY</p><h3>What’s happening</h3></div><button>View all <ChevronRight /></button></div>{data.activity.map((item, i) => <div className="event" key={item.title}><span className={`event-icon e${i}`}><Check /></span><div><b>{item.title}</b><small>{item.detail}</small></div><time>{item.time}</time></div>)}</div><div className="quick panel"><div className="panel-title"><div><p>QUICK START</p><h3>Keep shipping</h3></div></div><button><span><GitBranch />Connect repository</span><ChevronRight /></button><button><span><Server />Add a service</span><ChevronRight /></button><button><span><Cloud />View infrastructure</span><ChevronRight /></button></div></section>
    </div>
  </div>;
}

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('launchpad_token') ? {} : null);
  const logout = () => { localStorage.removeItem('launchpad_token'); setUser(null); };
  return user ? <Dashboard onLogout={logout} /> : <Auth onAuth={setUser} />;
}

