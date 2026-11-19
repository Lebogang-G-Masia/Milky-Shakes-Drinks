import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function SignUp({ onSwitch, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirm) {
      setError("Please fill in every field.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already exists in p_user
      const { data: existing, error: checkError } = await supabase
        .from("p_user")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        throw new Error("An account with this email or username already exists.");
      }

      // 2. Insert new user into p_user
      const { data, error: insertError } = await supabase
        .from("p_user")
        .insert([{ email: email.trim(), password }])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "42501") {
          throw new Error(
            "Row-Level Security: Please run the INSERT policy in Supabase SQL editor to allow sign-ups."
          );
        }
        throw insertError;
      }

      console.log("Account created successfully:", data);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Create account</h1>

      <label htmlFor="name">Name</label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />

      <label htmlFor="signup-email">Email or Username</label>
      <input
        id="signup-email"
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
      />

      <label htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <label htmlFor="confirm">Confirm password</label>
      <input
        id="confirm"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <p className="switch">
        Already have an account?{" "}
        <button type="button" className="link" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}
