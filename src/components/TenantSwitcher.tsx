'use client';

import { useState } from 'react';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { switchTenantAction } from '@/actions/tenant-actions';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export function TenantSwitcher({
  currentSlug,
  allTenants,
}: {
  currentSlug: string;
  allTenants: TenantSummary[];
}) {
  const [open, setOpen] = useState(false);
  const current = allTenants.find((t) => t.slug === currentSlug) || allTenants[0];

  const handleSelect = async (slug: string) => {
    setOpen(false);
    if (slug !== currentSlug) {
      await switchTenantAction(slug);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white text-xs font-semibold text-[#222924] transition-all shadow-xs"
      >
        <Building2 className="w-3.5 h-3.5 text-[#1F4D36]" />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{current?.name || 'Consultório'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E5DF] p-2 z-50 animate-fade-in space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B726B] border-b border-[#E8E5DF]">
              Alternar Consultório (Multi-Tenant)
            </div>

            {allTenants.map((t) => {
              const isSelected = t.slug === currentSlug;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.slug)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#EBF3ED] text-[#1F4D36] font-bold'
                      : 'text-[#222924] hover:bg-[#FBF9F5]'
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate">{t.name}</div>
                    <div className="text-[10px] text-[#6B726B] font-normal">{t.slug} • Plano {t.plan.toUpperCase()}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#1F4D36] shrink-0 ml-2" />}
                </button>
              );
            })}

            <div className="pt-1.5 border-t border-[#E8E5DF]">
              <Link
                href="/cadastro"
                onClick={() => setOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-[#1F4D36] hover:bg-[#EBF3ED] transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Novo Terapeuta
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

