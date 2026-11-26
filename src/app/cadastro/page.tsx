'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Smartphone,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  verifyTherapistCodeAndSetPasswordAction,
  requestNewCodeSelfServiceAction,
} from '@/actions/tenant-actions';

function ActivationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setIsSubmitting(true);

    const res = await verifyTherapistCodeAndSetPasswordAction({
      email,
      code,
      password,
      confirmPassword,
    });

    if (!res.success) {
      setError(res.error || 'Não foi possível validar o código.');
      setIsSubmitting(false);
      return;
    }

    router.push(res.redirectUrl || '/cockpit');
    router.refresh();
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Digite seu e-mail cadastrado primeiro para reenviar o código ao celular.');
      return;
    }
    setError(null);
    setInfoMsg(null);
    setIsResending(true);
    const res = await requestNewCodeSelfServiceAction(email);
    setIsResending(false);

    if (!res.success) {
      setError(res.error || 'Erro ao solicitar novo código.');
    } else {
      setInfoMsg(`Novo código de 6 dígitos enviado para o celular ${res.maskedPhone}!`);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-5">
      <div className="p-3.5 rounded-2xl bg-[#EBF3ED]/70 border border-[#1F4D36]/15 text-xs text-[#1F4D36] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Credenciamento Exclusivo pela Administração B.E.M.</strong>
          <p className="text-[#6B726B] mt-0.5">
            Informe abaixo o código numérico de 6 dígitos enviado ao seu celular para validar sua inscrição e definir sua senha.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-[#222924] mb-1">
            E-mail Cadastrado pela Administração *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@consultorio.com.br"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#222924]">
              Código de 6 Dígitos (Recebido no Celular) *
            </label>
            <button
              type="button"
              disabled={isResending}
              onClick={handleResend}
              className="text-[11px] font-semibold text-[#1F4D36] hover:underline flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {isResending ? 'Enviando...' : 'Reenviar código no celular'}
            </button>
          </div>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] text-base font-mono tracking-[0.35em] font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Criar Nova Senha *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Confirmar Senha *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-[#1F4D36] text-white font-bold text-sm hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span>{isSubmitting ? 'Validando Código...' : 'Validar Inscrição e Acessar Consultório'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-3 border-t border-[#E8E5DF] text-center text-xs text-[#6B726B]">
        Já validou sua conta?{' '}
        <Link href="/login" className="font-bold text-[#1F4D36] hover:underline">
          Entrar com e-mail e senha
        </Link>
      </div>
    </div>
  );
}

export default function CadastroAtivacaoPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] py-12 px-4 sm:px-6 max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#1F4D36] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
          B
        </div>
        <h1 className="text-2xl font-bold text-[#222924] tracking-tight">
          Ativar Acesso do Terapeuta
        </h1>
        <p className="text-xs sm:text-sm text-[#6B726B]">
          Valide o código recebido no celular e defina sua senha pessoal de acesso ao sistema B.E.M.
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Carregando...</div>}>
        <ActivationForm />
      </Suspense>
    </div>
  );
}
