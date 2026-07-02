"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "./Icons";

const TOKEN_RE = /^\d+\.[a-f0-9]{64}$/;

interface PasswordGateProps {
  onUnlock: (token: string) => void;
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPassword("");
        return;
      }
      const data = await res.json();
      if (data?.token && TOKEN_RE.test(data.token)) {
        setLeaving(true);
        const token = data.token;
        setTimeout(() => onUnlock(token), 300);
      } else {
        setError("Unexpected server response.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`gate ${leaving ? "gate-leaving" : ""}`}>
      <div className="bg-fx" aria-hidden="true" />
      <form className={`gate-card ${shake ? "shake" : ""}`} onSubmit={submit}>
        <div className="brand-mark gate-mark">FF</div>
        <h1 className="gate-title">FoundersFrame</h1>
        <p className="gate-studio">Image Studio</p>
        <div className="gate-divider" />
        <p className="gate-sub">Enter password to continue</p>

        <div className="gate-input-wrap">
          <input
            className="gate-input"
            type={show ? "text" : "password"}
            placeholder="Password"
            value={password}
            autoFocus
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
          />
          <button
            type="button"
            className="gate-toggle"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>

        {error && <div className="gate-error">{error}</div>}

        <button className="btn btn-gold gate-btn" type="submit" disabled={submitting || leaving}>
          {submitting ? "Unlocking…" : "Unlock →"}
        </button>
      </form>
    </div>
  );
}
