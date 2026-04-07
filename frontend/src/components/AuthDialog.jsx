import { useEffect, useRef, useState } from "react";

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google login is unavailable"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", () => reject(new Error("Google login failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google login failed to load"));
    document.head.appendChild(script);
  });
}

export default function AuthDialog({
  open,
  mode,
  loading,
  error,
  googleClientId,
  onClose,
  onModeChange,
  onLogin,
  onSignup,
  onGoogleCredential,
}) {
  const [loginDraft, setLoginDraft] = useState({ email: "", password: "" });
  const [signupDraft, setSignupDraft] = useState({ displayName: "", email: "", password: "" });
  const [googleError, setGoogleError] = useState(null);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!open || !googleClientId || !googleButtonRef.current) return;

    let mounted = true;
    googleButtonRef.current.innerHTML = "";
    setGoogleError(null);

    loadGoogleScript()
      .then((google) => {
        if (!mounted || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (credential) {
              void onGoogleCredential(credential);
            }
          },
        });
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: "320",
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "pill",
        });
      })
      .catch((scriptError) => {
        if (mounted) {
          setGoogleError(scriptError.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [googleClientId, mode, onGoogleCredential, open]);

  if (!open) return null;

  const title = mode === "signup" ? "Create your account" : "Sign in";
  const description =
    mode === "signup"
      ? "Use email and password or continue with Google. New accounts start as normal users."
      : "Sign in as an organizer or player. Public view-only results still work without login.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Account</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close auth dialog"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onModeChange("signup")}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {googleClientId ? (
            <div className="flex flex-col items-center gap-3">
              <div ref={googleButtonRef} className="min-h-11" />
              {googleError ? <p className="text-sm text-rose-700">{googleError}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Google login is not configured yet for this environment.</p>
          )}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>Or use email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {mode === "login" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onLogin(loginDraft);
            }}
          >
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={loginDraft.email}
                onChange={(event) => setLoginDraft((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={loginDraft.password}
                onChange={(event) => setLoginDraft((current) => ({ ...current, password: event.target.value }))}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !loginDraft.email.trim() || !loginDraft.password}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onSignup(signupDraft);
            }}
          >
            <label className="block text-sm font-medium text-slate-700">
              Display name
              <input
                type="text"
                value={signupDraft.displayName}
                onChange={(event) => setSignupDraft((current) => ({ ...current, displayName: event.target.value }))}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={signupDraft.email}
                onChange={(event) => setSignupDraft((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={signupDraft.password}
                onChange={(event) => setSignupDraft((current) => ({ ...current, password: event.target.value }))}
                className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !signupDraft.displayName.trim() || !signupDraft.email.trim() || !signupDraft.password}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
