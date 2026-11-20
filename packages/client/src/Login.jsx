import { useState } from "react";
import { supabase } from "./supabaseClient";
import { hashPassword } from "./SignUp";

export default function Login({ onSwitch, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setError("");

    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Query users table in Supabase
      const { data: user, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!user) throw new Error("Invalid email or password.");

      if (user.is_active === false) {
        throw new Error("This account is inactive. Please contact support.");
      }

      // Verify password hash (with fallback to plain text if legacy rows exist)
      const inputHash = await hashPassword(password);
      const passwordMatches =
        user.password_hash === inputHash || user.password_hash === password;

      if (!passwordMatches) {
        throw new Error("Invalid email or password.");
      }

      console.log("Logged in successfully from users table:", user);
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 id="sign-in-header">Sign in</h1>

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        placeholder="e.g. alex@example.com"
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="switch">
        New here?{" "}
        <button type="button" className="link" onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </form>
  );
}
