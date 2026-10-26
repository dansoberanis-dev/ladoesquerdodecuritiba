# Área de membros e assinatura recorrente — opções e recomendação

> Documento de decisão para o dono do **Lado Esquerdo de Curitiba**.
> Escrito em 23/10/2026. Não é proposta fechada: é o mapa das opções, com custo e esforço.

---

## 1. O que está sendo pedido

- Uma **área de membros** dentro do blog, para assinantes.
- Nesse espaço, **matérias exclusivas** (não públicas).
- **Login** do assinante.
- **Cobrança mensal recorrente**, automática.

Nada disso existe hoje: o site é 100% público, sem cadastro, sem banco de dados e sem pagamento. É a maior funcionalidade já pedida para o projeto — maior que o blog inteiro.

---

## 2. A descoberta técnica que muda tudo

Antes de escolher a ferramenta, é preciso encarar um fato da estrutura atual:

| Item | Situação hoje |
|---|---|
| Repositório no GitHub | **público** |
| `conteudo/posts.json` | contém **o texto completo** de cada matéria |
| `/api/posts` | público (lista títulos, sem corpo) |
| `/api/post?slug=` | protegido na prática (o middleware consome) |

**Consequência direta:** hoje, esconder uma matéria atrás de login no site seria **teatro**. Qualquer pessoa com o link do GitHub lê o texto inteiro do acervo sem pagar. Uma matéria exclusiva **nunca** pode entrar em `conteudo/` nem no repositório público.

Isso não invalida o projeto — só define a regra: **material pago tem que viver em outro lugar**, fora do git público. Todo caminho abaixo respeita isso.

Segundo ponto: a conta da Vercel está no plano **Hobby**, cujos termos são para uso **pessoal e não comercial**. Site com assinatura paga é uso comercial. Em algum momento será preciso subir para o **Pro** (cerca de US$ 20/mês) para ficar dentro das regras.

---

## 3. Os caminhos possíveis

### Caminho A — Plataforma de assinatura pronta (Substack, beehiiv, Ghost)

O conteúdo pago sai do site atual e passa a viver numa plataforma que já tem login, cobrança recorrente e paywall embutidos. O site atual continua como vitrine: home, blog público, identidade visual — e um botão "Assinar" que leva para a plataforma.

- **Esforço para nós:** 1 a 2 dias (configurar, personalizar, ligar os links).
- **Custo mensal:** de gratuito (Substack cobra ~10% da receita) a US$ 9–25/mês (Ghost Pro, beehiiv).
- **Prós:** funciona em dias; a plataforma cuida de login, senha, recibo, falha de cartão, cancelamento, e-mail. Nada de código nosso para manter.
- **Contras:** o conteúdo pago fica em outro domínio (a marca assina embaixo de outra); layout com menos controle; o assinante sai do site para ler; dois lugares para publicar.
- **Quando faz sentido:** se o objetivo é **começar a cobrar em 2 semanas** e testar se existe disposição a pagar.

### Caminho B — Área de membros dentro do site, com serviços por peça

Mantemos o site e a marca. Contratamos peças especializadas: autenticação, banco de dados e cobrança. Nós colamos as partes.

- **Peças típicas:** Supabase (login + banco) ou Clerk (só login) · Stripe, Asaas, Pagar.me ou Mercado Pago (assinatura) · Resend (envio do e-mail de acesso).
- **Esforço para nós:** 4 a 6 dias de trabalho, com testes sérios.
- **Custo mensal:** US$ 0–45 somando os serviços, mais a taxa por transação (na faixa de 4% a 5% no cartão; Pix costuma ser mais barato).
- **Prós:** tudo no domínio do jornal, com a identidade visual da casa; liberdade total (matéria aberta por X dias, assinante vê antes, área "minha assinatura", cancelamento dentro do site).
- **Contras:** é código nosso para manter; quando o cartão falha, alguém precisa olhar; exige conta de e-mail transacional e um CNPJ para o gateway.
- **Quando faz sentido:** se a assinatura é parte do futuro do veículo, não um teste.

### Caminho C — WordPress + plugins de assinatura

Sair do site estático e ir para WordPress com MemberPress / Restrict Content Pro.

- **Esforço:** 3 a 5 dias, mas é praticamente **refazer o site** e criar uma hospedagem nova (PHP + banco).
- **Custo:** hospedagem (R$ 40–120/mês) + plugin (US$ 100–300/ano).
- **Contras:** joga fora o que foi construído (performance excelente, HTML puro, deploy automático, 100 KB de página em vez de 2 MB); aparece manutenção de plugin, atualização de segurança, backup.
- **Veredito:** **não recomendo.** Seria trocar um site rápido e barato por um site lento e caro, para ganhar uma funcionalidade que os caminhos A e B entregam melhor.

### Caminho D — Paywall "de leitura livre" (doação / assinatura de apoio)

Sem login para ler: um botão "Apoie" no estilo do Vakinha que já colocamos, com cobrança recorrente opcional, e conteúdo exclusivo só como **recompensa simbólica** (uma coluna, um bastidor, um vídeo).

- **Esforço:** 1 dia.
- **Contras:** não é área de membros; não controla acesso a nada.
- **Quando faz sentido:** se a pergunta real do dono for "como aumento receita recorrente?", e não "como fecho conteúdo?".

---

## 4. Comparação direta

| | A · Plataforma | B · No nosso site | C · WordPress | D · Apoio |
|---|---|---|---|---|
| Prazo até cobrar | 2 semanas | 1 mês | 1 mês | 1 semana |
| No domínio do jornal | não | **sim** | sim | sim |
| Esforço técnico para nós | baixo | médio/alto | alto | baixo |
| Manutenção contínua | nenhuma | alguma | alta | nenhuma |
| Controle visual | pouco | **total** | total | total |
| Custo fixo mensal | US$ 0–25 | US$ 0–45 + Pro | R$ 60–150 | ~0 |
| Risco de dar errado | baixo | médio | alto | baixo |

---

## 5. Recomendação

**Começar pelo Caminho A por 3 meses, e só construir o Caminho B se houver assinantes.**

Razão: paywall é a parte fácil. O difícil é saber se existe gente disposta a pagar por jornalismo local de esquerda em Curitiba. Uma plataforma pronta responde isso em duas semanas e por menos de R$ 150/mês. Se em três meses houver, digamos, 80 assinantes, aí vale investir no Caminho B e trazer todos para dentro do site — e nesse momento já existe receita para sustentar o trabalho de migração.

Construir primeiro a estrutura própria (B) é apostar 1 mês de trabalho numa hipótese não testada.

**Sugestão de preço para o teste:** R$ 9,90/mês ou R$ 99/ano, com boa parte do conteúdo ainda aberto (por exemplo, 1 matéria exclusiva por semana). Assinatura de veículo pequeno funciona melhor como "apoio com benefício" do que como muro total — muro total reduz alcance, e alcance é o ativo que hoje faz o Instagram crescer.

---

## 6. Se for o Caminho B, a arquitetura recomendada

Resumo do que eu construiria, para o dono entender o que está comprando:

1. **Banco e login:** Supabase.
   - Login **sem senha** (link mágico no e-mail): a pessoa digita o e-mail, recebe um link, entra. Não existe senha para esquecer nem para vazar.
   - Nada de cadastro de dados além do e-mail; menos dado, menos risco na LGPD.
2. **Pagamento:** gateway com assinatura nativa — Stripe ou Asaas (este com Pix recorrente).
   - Cartão recorrente é o padrão; **Pix Automático** é o diferencial brasileiro para quem não usa cartão. Vale confirmar disponibilidade na tabela vigente do gateway escolhido.
   - Cancelamento e troca de cartão em portal do próprio gateway: menos código nosso.
3. **Conteúdo exclusivo:** tabela privada no banco, com regra de acesso por assinatura ativa.
   - O Notion continua sendo a redação: o dono escreve lá e marca a matéria como **"Exclusiva"**, como já marca "Destaque".
   - O sincronizador passa a ter **dois destinos**: matéria pública vai para `conteudo/` (git); matéria exclusiva vai **só** para o banco.
4. **Proteção:** o texto exclusivo nunca chega ao navegador de quem não é assinante — nem escondido no HTML. Isso é o que separa paywall real de botão bonito.
5. **SEO das matérias pagas:** primeiros parágrafos abertos e marcação `isAccessibleForFree: false`, que é o padrão recomendado pelo Google para conteúdo pago. Assim a matéria aparece na busca sem entregar o texto.
6. **Operação:** o dono nunca toca em código. Ligar/desligar assinatura, ver inadimplência e cancelar acontece no painel do gateway.

Prazo realista para isso ficar **confiável** (e não só funcionando): cerca de 2 semanas de trabalho, considerando testes de pagamento aprovado, recusado, reembolso, cancelamento, sessão expirada e acesso indevido.

---

## 7. O que precisa de decisão do dono

1. **O objetivo é receita recorrente ou exclusividade de conteúdo?** Muda o caminho (D/A ou B).
2. **Aceita o conteúdo pago ficar num domínio de terceiros por uns meses?** (Caminho A). Se não aceitar de jeito nenhum, vamos direto ao B, sabendo do custo maior.
3. **Já existe CNPJ?** Gateway de pagamento recorrente exige. Sem CNPJ, nem A nem B avançam.
4. **Quem cuida do dinheiro e da nota fiscal?** Assinatura gera receita, receita gera obrigação fiscal.
5. **Preço e o que fica fechado.** Sugestão na seção 5, mas a decisão é editorial.
6. **Quem responde o assinante** quando o cartão falha ou ele quer cancelar? Precisa de um canal (o e-mail `ladoesquerdodecuritiba@gmail.com` já existe).

---

## 8. Riscos que precisam estar na mesa antes de prometer prazo

- **Cobrança recorrente no Brasil tem atrito:** cartão vence, é bloqueado, o assinante esquece. Uma base de 100 assinantes gera naturalmente algumas dezenas de falhas por ano. Sem alguém olhando, a receita vaza.
- **Estorno e reclamação** de assinatura pequena são raros, mas existem, e o gateway cobra taxa.
- **LGPD:** agora o site guarda e-mail e histórico de pagamento de pessoas reais. A política de privacidade precisa ser atualizada (a que publicamos hoje cobre só medição de audiência).
- **Terceirizar o login** (Caminho A) reduz esse risco: menos dado sob nossa guarda.
- **Não prometer data.** Se o dono quiser cobrar antes das eleições, o caminho é A, e ainda assim com margem.

---

## 9. Decisão registrada em 23/10/2026

O cliente e o prestador optaram pelo **Caminho A (plataforma externa)** neste primeiro momento, com um botão "Área de membros" no site levando para fora do domínio. Critérios:

- medir demanda real de assinatura antes de investir em estrutura própria;
- aceitar que o endereço da área de membros fique num subdomínio ou plataforma de terceiros, desde que o visual acompanhe a marca;
- reavaliar o Caminho B (estrutura própria) **somente se houver tração** de assinantes.

Próximo passo: escolher entre **Ghost(Pro)** (visual de jornal, 0% de comissão, só cartão) e **plataforma brasileira com Pix** (Kiwify/Hubla, sem mensalidade, comissão por venda), conforme a necessidade de Pix. Ver `AREA-DE-MEMBROS-EXPLICACAO.md`.
