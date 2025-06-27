// src/pages/Login.js
import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "60px auto", textAlign: "center" }}>
      <h2>🔐 Admin Login</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 8, padding: 8, width: "100%" }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 8, padding: 8, width: "100%" }}
      />
      <button onClick={handleLogin} style={{ padding: 10, width: "100%" }}>
        Login
      </button>
      {errorMsg && <p style={{ color: "red", marginTop: 10 }}>{errorMsg}</p>}
    </div>
  );
}
