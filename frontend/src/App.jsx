import { useEffect, useState } from 'react';
import { Check, ChevronRight, Cloud, Eye, EyeOff, Gauge, GitBranch, LogOut, Rocket, Server } from 'lucide-react';

const API = '/api';

// The real stages of this project's Jenkins pipeline.
const STAGES = ['Checkout', 'Verify Node & npm', 'Install dependencies', 'Build frontend', 'Run tests', 'Archive artifacts', 'Deploy to Application EC2'];

function Logo() {
  return <div className="logo">
    <svg className="logo-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 19 15H5z" /><rect x="3" y="18" width="18" height="3" rx="0.5" /></svg>
    Launchpad
  </div>;
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isLogin = mode === 'login';

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Server is unavailable. Please try again shortly.');
      localStorage.setItem('launchpad_token', data.token);
      onAuth(data.user);
    } catch (err) { setError(err.message || 'Could not connect to the server.'); }
    finally { setLoading(false); }
  }

  return <main className="auth">
    <section className="auth-story">
      <Logo />
      <div className="story-copy">
        <h1>From push to production.</h1>
        <p>Every commit to main is built, tested and deployed to your servers, then checked until the API answers healthy.</p>
      </div>
      <ol className="sequence" aria-label="Release pipeline stages">
        {STAGES.map((stage, i) => {
          const last = i === STAGES.length - 1;
          return <li key={stage} style={{ '--i': i }} className={last ? 'is-last' : undefined}>
            <span className="tick" aria-hidden="true"><Check /></span>
            <span>{stage}</span>
            <span className="stage-state">{last ? 'Live' : 'Passed'}</span>
          </li>;
        })}
      </ol>
    </section>

    <section className="auth-form">
      <div className="form-card">
        <h2>{isLogin ? 'Sign in' : 'Create your account'}</h2>
        <p className="lede">{isLogin ? 'Use the email you registered with.' : 'You’ll go straight to your dashboard.'}</p>
        <form onSubmit={submit}>
          {!isLogin && <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" required autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" required type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password">
              <input id="password" required minLength="8" type={show ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} aria-describedby={isLogin ? undefined : 'password-hint'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button>
            </div>
            {!isLogin && <p className="hint" id="password-hint">At least 8 characters.</p>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn-primary btn-block" disabled={loading}>
            {loading ? (isLogin ? 'Signing in…' : 'Creating account…') : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>
        <p className="switch">
          {isLogin ? 'No account yet?' : 'Already registered?'}{' '}
          <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}>{isLogin ? 'Create one' : 'Sign in'}</button>
        </p>
      </div>
    </section>
  </main>;
}

const NAV = [['Overview', Gauge], ['Deployments', Rocket], ['Services', Server], ['Pipelines', GitBranch], ['Infrastructure', Cloud]];

const FIGURES = [
  { key: 'deployments', label: 'Deployments', note: '+3 this week' },
  { key: 'uptime', label: 'Uptime', note: 'All services healthy' },
  { key: 'services', label: 'Services', note: 'Across 2 regions' },
  { key: 'alerts', label: 'Open alerts', note: 'Nothing needs attention' }
];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Dashboard({ onLogout }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('launchpad_token')}` } })
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(onLogout);
  }, [onLogout]);

  if (!data) return <div className="loader" role="status"><span aria-hidden="true" /><p>Loading your dashboard…</p></div>;

  const firstName = data.user.name.split(' ')[0];
  const latest = data.activity[0];

  return <div className="dash">
    <header className="topbar">
      <Logo />
      <nav className="topnav" aria-label="Main">
        {NAV.map(([label, Icon], i) => <button type="button" key={label} aria-current={i === 0 ? 'page' : undefined}><Icon aria-hidden="true" />{label}</button>)}
      </nav>
      <div className="account">
        <span className="avatar" aria-hidden="true">{firstName[0]}</span>
        <div className="account-text"><b>{data.user.name}</b><small>{data.user.email}</small></div>
        <button type="button" className="btn-quiet" onClick={onLogout}><LogOut aria-hidden="true" />Sign out</button>
      </div>
    </header>

    <main className="dash-body">
      <div className="dash-head">
        <div>
          <h1>{greeting()}, {firstName}.</h1>
          <p className="health"><span className="health-dot" aria-hidden="true" />Production is healthy and the latest release is live.</p>
        </div>
        <button type="button" className="btn-primary"><Rocket aria-hidden="true" />New deployment</button>
      </div>

      {latest && <section className="release" aria-labelledby="release-title">
        <div className="release-head">
          <h2 id="release-title">Latest release</h2>
          <p>{latest.detail}<span className="sep" aria-hidden="true" />{latest.time}</p>
        </div>
        <ol className="pipeline">
          {STAGES.map((stage, i) => <li key={stage} className={i === STAGES.length - 1 ? 'is-live' : undefined}>
            <span className="node" aria-hidden="true"><Check /></span>
            <span className="pipeline-name">{stage}</span>
          </li>)}
        </ol>
      </section>}

      <dl className="figures">
        {FIGURES.map(({ key, label, note }) => <div className={`figure${key === 'alerts' && Number(data.stats[key]) > 0 ? ' is-alert' : ''}`} key={key}>
          <dt>{label}</dt>
          <dd className="figure-value">{data.stats[key]}</dd>
          <dd className="figure-note">{note}</dd>
        </div>)}
      </dl>

      <div className="lower">
        <section aria-labelledby="activity-title">
          <h2 id="activity-title">Recent activity</h2>
          <ol className="timeline">
            {data.activity.map(item => <li key={item.title} className={`is-${item.status}`}>
              <span className="tl-dot" aria-hidden="true" />
              <div><b>{item.title}</b><span>{item.detail}</span></div>
              <time>{item.time}</time>
            </li>)}
          </ol>
        </section>
        <section aria-labelledby="next-title">
          <h2 id="next-title">Next steps</h2>
          <div className="next">
            <button type="button"><GitBranch aria-hidden="true" /><span>Connect a repository</span><ChevronRight aria-hidden="true" /></button>
            <button type="button"><Server aria-hidden="true" /><span>Add a service</span><ChevronRight aria-hidden="true" /></button>
            <button type="button"><Cloud aria-hidden="true" /><span>View infrastructure</span><ChevronRight aria-hidden="true" /></button>
          </div>
        </section>
      </div>
    </main>
  </div>;
}

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('launchpad_token') ? {} : null);
  const logout = () => { localStorage.removeItem('launchpad_token'); setUser(null); };
  return user ? <Dashboard onLogout={logout} /> : <Auth onAuth={setUser} />;
}
