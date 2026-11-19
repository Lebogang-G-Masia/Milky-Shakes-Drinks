import { useState } from "react";
import { supabase } from "./supabaseClient";

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
      // Query p_user table in Supabase
      const { data, error: dbError } = await supabase
        .from("p_user")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) throw new Error("Invalid email or password.");

      console.log("Logged in successfully:", data);
      if (onSuccess) {
        onSuccess(data);
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
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        placeholder="e.g. customer-1"
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
