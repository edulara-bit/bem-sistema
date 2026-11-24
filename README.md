# BEM — Plataforma do Terapeuta (SaaS Multi-Tenant & PWA com IA)

Sistema completo para terapeutas organizarem **rotina, agenda de sessões, prontuários eletrônicos com IA (SOAP), controle financeiro, captação de pacientes e produção de conteúdo para redes sociais**.

Desenvolvido sob o framework **EGM (Elephant-Goldfish Model)** com foco em conformidade ética (CFP/LGPD) e baixo consumo de recursos para VPS compartilhada.

---

## 🚀 Como Rodar Localmente (Desenvolvimento)

No terminal do Windows em `c:\xampp\htdocs\bem`:

```bash
# 1. Instalar dependências (já instaladas)
npm install

# 2. Sincronizar o banco SQLite
npm run db:push

# 3. Popular o banco com dados demo (Eduardo Lara, pacientes e sessões)
npm run db:seed

# 4. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra no navegador: [http://localhost:3000](http://localhost:3000)

---

## 🧠 Recursos Integrados

1. **Cockpit Diário (`/`):**
   - Atendimentos do dia com horários, links de Google Meet e status.
   - Resumo financeiro em tempo real (Recebido vs Pendente).
   - Acesso rápido aos prontuários e gerador de ideias.

2. **Agenda Inteligente (`/agenda`):**
   - Visão Hoje / Próximos / Todos.
   - Agendamento rápido de consultas online ou presenciais.
   - Botão para disparar lembrete amigável no WhatsApp com 1 clique.

3. **Captação & CRM de Pacientes (`/captacao`):**
   - **Kanban do Funil:** Novos Contatos ➔ Contatados ➔ Sessão Agendada ➔ Pacientes Ativos.
   - **Gerador de Mensagem com IA:** Lê a dor/queixa do interessado e gera uma abordagem calorosa, empática e ética para WhatsApp com 1 clique no botão "Mensagem IA".
   - **Conversão em 1 Clique:** Botão "Tornar Paciente" migra o lead para o cadastro oficial de pacientes sem redigitação.

4. **Página Pública de Agendamento (`/agendar`):**
   - Mini landing page elegante para colocar no link da bio do Instagram ou WhatsApp.
   - Apresentação acolhedora do terapeuta, valores éticos e formulário de triagem inicial.
   - Os pedidos caem diretamente no seu funil de captação interno com dados protegidos pela LGPD.

5. **Pacientes & Prontuário com IA (`/pacientes`):**
   - Telefones e CPFs protegidos com **criptografia AES-256-GCM**.
   - **IndexedDB Auto-Save:** Rascunhos de evolução clínica são salvos no aparelho a cada digitação para proteção contra quedas de internet.
   - **Estruturação SOAP com Gemini:** Converte anotações livres para o padrão técnico (Subjetivo, Objetivo, Avaliação, Plano) após anonimização regex pré-LLM (LGPD/CFP).
   - Travamento de prontuário pós-conclusão.

4. **Gestão Financeira & Pix (`/financeiro`):**
   - Controle de consultas pagas vs pendentes.
   - Botão "Cobrar Pix" que gera e copia a mensagem personalizada para o WhatsApp do paciente.
   - Lançamento de despesas operacionais do consultório.

5. **Copiloto de Conteúdo para Redes Sociais (`/ia-copiloto`):**
   - Geração de carrosséis educativos para Instagram (5 slides didáticos).
   - Roteiros para Reels/TikTok com gancho de 3 segundos e cenas.
   - Posts reflexivos com legenda formatada e chamada para ação (CTA).

7. **Painel de Configurações do Terapeuta (`/configuracoes`):**
   - Personalização completa do consultório (Nome, Slogan, Bio pública e Registro Profissional CRP/CRTH).
   - **Recebimento Direto Pix:** Configuração da chave Pix própria (e-mail, CPF, celular ou aleatória) e nome do titular. Alimenta automaticamente as mensagens de cobrança rápida no WhatsApp.
   - Links de telemedicina padrão (Google Meet / Zoom fixo) e endereço do consultório presencial.
   - Gerenciamento de multi-tenancy e visualização do link da página pública.

---

## 🐳 Deploy na Hostinger VPS (`bem.edulara.com.br`)

O projeto está pronto para rodar em container Docker na porta `3002`, com limite rígido de memória de **384MB de RAM** para não interferir com `compareofertas` ou `quepresentedar`.

### Passo a Passo no Servidor VPS:

1. Envie a pasta do projeto para a VPS (ex: `/var/www/bem`).
2. Adicione sua chave do Gemini no arquivo `.env` da VPS:
   ```env
   GEMINI_API_KEY="sua_chave_do_google_ai_studio"
   ```
3. Suba o container Docker:
   ```bash
   docker compose up -d --build
   ```
4. Configure o Nginx para apontar o domínio `bem.edulara.com.br` para a porta `3002` (modelo disponível em `nginx.conf.example`).
5. Gere o certificado SSL gratuito:
   ```bash
   certbot --nginx -d bem.edulara.com.br
   ```

---

## 🔒 Arquitetura de Segurança & Multi-Tenancy

- **Isolamento de Tenants:** Cada terapeuta opera com seu próprio `tenantId` isolado via `getTenantDb(tenantId)`. No futuro, novos terapeutas cadastrados têm consultório, pacientes e finanças 100% segregados.
- **Criptografia em Repouso:** Módulo `src/lib/crypto.ts` com AES-256-GCM para dados clínicos e cadastrais.
- **Anonimização Pré-IA:** O módulo `src/lib/ai/gemini.ts` remove nomes próprios, telefones e identificadores antes de enviar as notas ao modelo da Google.
