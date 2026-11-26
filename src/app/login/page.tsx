'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { loginAction } from '@/actions/auth-actions';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPendingEmail(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result: any = await loginAction(formData);

    if (!result.success) {
      setError(result.error || 'Erro ao realizar login.');
      if (result.needsActivation && result.email) {
        setPendingEmail(result.email);
      }
      setIsLoading(false);
    } else {
      router.push(result.redirectUrl || '/cockpit');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center items-center p-4 sm:p-6 text-[#222924]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1F4D36] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
            B
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Acesso Exclusivo a Terapeutas Credenciados
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#222924]">
            Entrar no Sistema BEM
          </h1>
          <p className="text-xs sm:text-sm text-[#6B726B]">
            Faça login com sua conta para acessar a agenda, prontuários e finanças do seu consultório.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {pendingEmail && (
                <Link
                  href={`/cadastro?email=${encodeURIComponent(pendingEmail)}`}
                  className="inline-flex items-center gap-1 font-bold text-[#1F4D36] underline"
                >
                  Validar código do celular e criar minha senha agora →
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                E-mail do Consultório
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="terapeuta@edulara.com.br"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#1F4D36] text-white font-semibold text-sm hover:bg-[#183d2b] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Meu Consultório</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B726B] gap-2">
            <span>Recebeu convite da Administração?</span>
            <Link
              href="/cadastro"
              className="font-semibold text-[#1F4D36] hover:underline flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Validar código e criar senha
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-[#6B726B]">
            🛡️ Arquitetura Multi-Tenant com isolamento seguro por consultório e criptografia LGPD de ponta a ponta.
          </p>
        </div>
      </div>
    </div>
  );
}
