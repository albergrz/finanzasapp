import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { session, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { error } = await signIn(username, password);
    setSubmitting(false);
    if (error) setErr(error);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-ring" style={{ width: 48, height: 48 }}>
            <div className="logo-ring-t" style={{ fontSize: 8 }}>·CLAB·</div>
            <div className="logo-ring-m" style={{ fontSize: 16 }}>CLAB</div>
          </div>
          <div className="login-logo-name">COLISEUM</div>
          <div className="login-logo-sub">Finanzas</div>
        </div>

        {err && <div className="login-error">{err}</div>}

        <form onSubmit={onSubmit}>
          <div className="fg">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>
          <div className="fg">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
