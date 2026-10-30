'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Orbit, Lock, Mail, KeyRound, User, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export function WorkspaceAuthGate({ children }: { children: React.ReactNode }) {
  const {
    authReady,
    isAuthenticated,
    signInWithGoogle,
    signInWithCredentials,
    locale,
  } = useOrbit();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!authReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
          <span>
            {locale === 'fr'
              ? 'Vérification de la session d’authentification...'
              : locale === 'it'
                ? 'Verifica della sessione di autenticazione...'
                : 'Verifying authentication session...'}
          </span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const copy =
    locale === 'fr'
      ? {
          badge: 'Accès Protégé · Authentification Requise',
          signinTitle: 'Connexion à votre espace Orbit',
          signupTitle: 'Créer votre compte Orbit',
          subtitle:
            'Vous devez être authentifié pour accéder au tableau de bord des agents IA, aux outils MCP et aux bureaux Cloud VM.',
          googleBtn: 'Continuer avec Google (OAuth)',
          orDivider: 'ou avec votre adresse e-mail',
          nameLabel: 'Nom complet',
          namePlaceholder: 'ex. Abdoulaye Thiam',
          emailLabel: 'Adresse e-mail professionnelle',
          emailPlaceholder: 'vous@entreprise.com',
          passwordLabel: 'Mot de passe',
          passwordPlaceholder: 'Minimum 6 caractères',
          submitSignin: 'Se connecter au tableau de bord',
          submitSignup: 'Créer mon compte et accéder',
          switchToSignup: 'Pas encore de compte ? Créer un compte',
          switchToSignin: 'Déjà un compte ? Se connecter',
          backHome: '← Retour à la page d’accueil',
          errRequired: 'Veuillez renseigner une adresse e-mail valide et un mot de passe (min. 6 caractères).',
          securityNote: 'Session sécurisée par Firebase Authentication & règles Firestore.',
        }
      : locale === 'it'
        ? {
            badge: 'Accesso Protetto · Autenticazione Richiesta',
            signinTitle: 'Accedi al tuo workspace Orbit',
            signupTitle: 'Crea il tuo account Orbit',
            subtitle:
              'Devi effettuare l’accesso per accedere alla dashboard degli agenti IA, agli strumenti MCP e ai desktop Cloud VM.',
            googleBtn: 'Continuer con Google (OAuth)',
            orDivider: 'oppure con la tua email',
            nameLabel: 'Nome completo',
            namePlaceholder: 'es. Marco Rossi',
            emailLabel: 'Indirizzo email',
            emailPlaceholder: 'nome@azienda.it',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Minimo 6 caratteri',
            submitSignin: 'Accedi alla dashboard',
            submitSignup: 'Crea account e accedi',
            switchToSignup: 'Non hai un account? Registrati',
            switchToSignin: 'Hai già un account? Accedi',
            backHome: '← Torna alla pagina iniziale',
            errRequired: 'Inserisci un indirizzo email valido e una password (min. 6 caratteri).',
            securityNote: 'Sessione protetta da Firebase Authentication e regole Firestore.',
          }
        : {
            badge: 'Protected Access · Authentication Required',
            signinTitle: 'Sign in to your Orbit Workspace',
            signupTitle: 'Create your Orbit Account',
            subtitle:
              'You must be authenticated to access the AI agent dashboard, Composio MCP tools, and Cloud VM desktops.',
            googleBtn: 'Continue with Google (OAuth)',
            orDivider: 'or continue with email',
            nameLabel: 'Full Name',
            namePlaceholder: 'e.g. Alex Rivera',
            emailLabel: 'Work Email Address',
            emailPlaceholder: 'you@company.com',
            passwordLabel: 'Password',
            passwordPlaceholder: 'At least 6 characters',
            submitSignin: 'Sign In to Dashboard',
            submitSignup: 'Create Account & Enter',
            switchToSignup: "Don't have an account? Create one",
            switchToSignin: 'Already have an account? Sign in',
            backHome: '← Back to overview',
            errRequired: 'Please enter a valid email address and password (min 6 characters).',
            securityNote: 'Secured by Firebase Authentication & Firestore security rules.',
          };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.trim().length < 6) {
      setErrorMsg(copy.errRequired);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await signInWithCredentials({
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        isSignUp: mode === 'signup',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : copy.errRequired;
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-50 text-slate-900 p-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-slate-900">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Orbit className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">Orbit</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5 text-slate-900" />
            <span>{copy.badge}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'signin' ? copy.signinTitle : copy.signupTitle}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">{copy.subtitle}</p>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ShieldCheck className="h-4 w-4 text-slate-900" />
          <span>{copy.googleBtn}</span>
        </button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200" />
          <span className="shrink-0 px-3 text-[11px] text-slate-400">{copy.orDivider}</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5" noValidate>
          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-800">
                {copy.nameLabel}
              </label>
              <div className="relative">
                <User className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.namePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-800">
              {copy.emailLabel}
            </label>
            <div className="relative">
              <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={copy.emailPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-800">
              {copy.passwordLabel}
            </label>
            <div className="relative">
              <KeyRound className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={copy.passwordPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? copy.submitSignin : copy.submitSignup}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErrorMsg('');
            }}
            className="font-semibold text-slate-900 hover:underline"
          >
            {mode === 'signin' ? copy.switchToSignup : copy.switchToSignin}
          </button>
          <Link href="/" className="text-slate-500 hover:text-slate-900">
            {copy.backHome}
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[11px] text-slate-500">
        {copy.securityNote}
      </div>
    </div>
  );
}
