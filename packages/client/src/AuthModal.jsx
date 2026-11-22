import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { hashPassword } from './SignUp';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, packSummary }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup inputs
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');

    const email = loginEmail.trim().toLowerCase();
    if (!email || !loginPassword) {
      setError('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const { data: user, error: dbErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (dbErr) throw dbErr;
      if (!user) throw new Error('Invalid email or password.');
      if (user.is_active === false) {
        throw new Error('This account is inactive. Please contact support.');
      }

      const inputHash = await hashPassword(loginPassword);
      const isMatch = user.password_hash === inputHash || user.password_hash === loginPassword;
      if (!isMatch) {
        throw new Error('Invalid email or password.');
      }

      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');

    if (!signupFirstName.trim()) {
      setError('Please enter your first name.');
      return;
    }

    if (!signupMobile.trim() || signupMobile.trim().length < 7) {
      setError('Please enter a valid mobile number for delivery updates.');
      return;
    }

    const email = signupEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Check for existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('An account with this email address already exists. Please switch to Sign In.');
      }

      const hashed = await hashPassword(signupPassword);
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert([
          {
            email,
            first_name: signupFirstName.trim(),
            mobile_number: signupMobile.trim(),
            password_hash: hashed,
            role: 'PATRON',
            completed_orders_count: 0,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (onAuthSuccess) {
        onAuthSuccess(newUser);
      }
    } catch (err) {
      setError(err.message || 'Failed to create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal-card">
        {/* Brand Cursive */}
        <div className="auth-modal-brand">milky</div>

        <h2 id="auth-modal-title" className="auth-modal-title">
          {mode === 'login' ? 'Sign In to Finalize' : 'Create Account to Finalize'}
        </h2>

        <p className="auth-modal-sub">
          {packSummary
            ? `${packSummary} is saved and ready! Sign in or create an account to proceed to fulfillment and checkout.`
            : 'Sign in or create an account to finalize your order.'}
        </p>

        {/* Tab Switcher */}
        <div className="auth-modal-switcher" role="tablist">
          <button
            type="button"
            className={`auth-modal-tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-modal-tab ${mode === 'signup' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('signup');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-modal-error">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="auth-modal-field">
              <label htmlFor="auth-modal-email">Email Address</label>
              <input
                id="auth-modal-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-modal-field">
              <label htmlFor="auth-modal-password">Password</label>
              <input
                id="auth-modal-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Your secret password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="auth-modal-submit-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Sign In & Continue Order \u2192'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit} noValidate>
            <div className="auth-modal-field">
              <label htmlFor="auth-modal-name">First Name</label>
              <input
                id="auth-modal-name"
                type="text"
                value={signupFirstName}
                onChange={(e) => setSignupFirstName(e.target.value)}
                placeholder="e.g. Sarah"
                autoComplete="given-name"
                required
              />
            </div>

            <div className="auth-modal-field">
              <label htmlFor="auth-modal-mobile">Mobile Number</label>
              <input
                id="auth-modal-mobile"
                type="tel"
                value={signupMobile}
                onChange={(e) => setSignupMobile(e.target.value)}
                placeholder="+27 82 123 4567"
                autoComplete="tel"
                required
              />
            </div>

            <div className="auth-modal-field">
              <label htmlFor="auth-modal-signup-email">Email Address</label>
              <input
                id="auth-modal-signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-modal-field">
              <label htmlFor="auth-modal-signup-password">Password (min 8 characters)</label>
              <input
                id="auth-modal-signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="auth-modal-submit-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account & Continue Order \u2192'}
            </button>
          </form>
        )}

        <div className="auth-modal-footer">
          <button type="button" className="auth-modal-cancel-btn" onClick={onClose}>
            &larr; Return to Box Builder
          </button>
        </div>
      </div>
    </div>
  );
}
