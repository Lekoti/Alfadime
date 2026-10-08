import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isPersistent, setIsPersistent] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);

    if (!username.trim()) {
      setError('Digite seu nome de usuário');
      setLoggingIn(false);
      return;
    }

    const result = await login(username.trim(), isPersistent);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Falha ao fazer login');
    }

    setLoggingIn(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Alfadime</h1>
          <p>Sistema de Gestão Empresarial</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              disabled={loggingIn}
              autoFocus
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPersistent}
                onChange={(e) => setIsPersistent(e.target.checked)}
                disabled={loggingIn}
              />
              <span>Lembrar neste computador</span>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loggingIn}>
            {loggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p className="hint">
            Dica: O usuário padrão é <strong>sLekoti</strong>
          </p>
        </div>
      </div>
    </div>
  );
}