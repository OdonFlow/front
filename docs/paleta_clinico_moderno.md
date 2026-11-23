# OdontoFlow — Identidade Visual: Opção 1 (Clínico Moderno)

Guia de estilo e especificação de paleta de cores para o sistema de gestão de clínica odontológica.

---

## 1. Filosofia Visual
- **Conceito:** Clareza cirúrgica, ambiente estéril e moderno, foco em alta legibilidade e redução de fadiga visual em rotinas intensas de atendimento.
- **Tipografia:** Inter / Plus Jakarta Sans (precisa, neutra e com excelente legibilidade para horários e prontuários).
- **Formas:** Bordas sutilmente arredondadas (`rounded-xl` / `8px`–`12px`), divisórias finas (`border-slate-200`) e sombras suaves.

---

## 2. Paleta de Cores Principal

| Papel | Nome | HEX | Tailwind Class | Aplicação |
|---|---|---|---|---|
| **Primary Brand** | Teal 600 | `#0D9488` | `bg-teal-600` / `text-teal-600` | Botões primários, itens ativos na sidebar, logo |
| **Primary Dark / Hover** | Teal 700 | `#0F766E` | `bg-teal-700` | Estados de hover em botões primários |
| **Primary Light / Surface** | Teal 50 | `#F0FDFA` | `bg-teal-50` / `border-teal-200` | Fundo de itens selecionados, badges sutis |
| **Primary Accent** | Teal 500 | `#14B8A6` | `text-teal-500` | Indicadores de tempo real e linha de "agora" |

---

## 3. Cores de Superfície e Estrutura

| Papel | Nome | HEX | Tailwind Class | Aplicação |
|---|---|---|---|---|
| **App Background** | Slate 50 | `#F8FAFC` | `bg-slate-50` | Fundo geral da aplicação |
| **Surface / Card** | Branco Puro | `#FFFFFF` | `bg-white` | Cartões, sidebar, cabeçalho e modais |
| **Borders & Dividers** | Slate 200 | `#E2E8F0` | `border-slate-200` | Divisórias de tabelas, grade horária e contornos |
| **Muted Surface** | Slate 100 | `#F1F5F9` | `bg-slate-100` | Cabeçalhos de tabela, slots vazios na agenda |

---

## 4. Tipografia e Escala de Texto

| Nível | HEX | Tailwind Class | Peso / Uso |
|---|---|---|---|
| **Texto Primário** | `#0F172A` | `text-slate-900` | Semibold/Bold — Títulos, nomes de pacientes |
| **Texto Secundário** | `#334155` | `text-slate-700` | Regular/Medium — Corpo, rótulos de formulários |
| **Texto Terciário / Muted** | `#64748B` | `text-slate-500` | Regular — Horários secundários, legendas |
| **Texto Invertido** | `#FFFFFF` | `text-white` | Médio/Bold — Em botões e badges preenchidos |

---

## 5. Badges de Status (Recepção & Consultas)

- **Aguardando na Recepção:**
  - Fundo: `#FEF3C7` (`amber-100`)
  - Borda: `#FDE68A` (`amber-200`)
  - Texto: `#92400E` (`amber-800`)
  - Indicador: Âmbar pulsante

- **Em Atendimento na Cadeira:**
  - Fundo: `#CCFBF1` (`teal-100`)
  - Borda: `#99F6E4` (`teal-200`)
  - Texto: `#115E59` (`teal-800`)
  - Indicador: Verde-água ativo

- **Finalizado / Concluído:**
  - Fundo: `#F1F5F9` (`slate-100`)
  - Borda: `#E2E8F0` (`slate-200`)
  - Texto: `#475569` (`slate-600`)

- **Falta / Cancelado:**
  - Fundo: `#FEE2E2` (`red-100`)
  - Borda: `#FECACA` (`red-200`)
  - Texto: `#991B1B` (`red-800`)

---

## 6. Cores Clínicas do Odontograma (FDI 11 a 48)

| Procedimento / Estado | Cor HEX | Amostra | Descrição |
|---|---|---|---|
| **Hígido (Saudável)** | `#0D9488` | Teal cirúrgico | Contorno limpo sem preenchimento |
| **Restauração Realizada** | `#2563EB` | Azul royal | Preenchimento da face restaurada |
| **Tratamento de Canal (Endo)** | `#D97706` | Âmbar escuro | Marcação na raiz dental |
| **Extração Indicada** | `#DC2626` | Vermelho cirúrgico | "X" vermelho sobre o dente |
| **Prótese / Coroa** | `#7C3AED` | Roxo / Violeta | Preenchimento total da coroa |
| **Implante** | `#059669` | Verde esmeralda | Pino estrutural na base |
