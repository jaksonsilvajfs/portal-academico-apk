# Dominus

**Dominus, seu parceiro acadêmico.**

App Android para o estudante organizar o curso: disciplinas e notas, frequência e faltas, calendário e horários, trabalhos e prazos, painel de desempenho e a Central de Estudos (temas, revisões, materiais e tags).

O Dominus nasceu do Portal de Gerenciamento Acadêmico, criado como página no Claude, e é distribuído como APK, sem passar pela Play Store.

## Usar no navegador

O Dominus também abre no navegador, no computador ou em qualquer celular (inclusive iPhone): **https://jaksonsilvajfs.github.io/portal-academico-apk/**. A conta e os dados são os mesmos do app.

O site é publicado pelo GitHub Actions ([publicar-site.yml](.github/workflows/publicar-site.yml)) a cada mudança em `www/`. Para funcionar, o repositório precisa estar com **Settings > Pages > Source: GitHub Actions**.

## Baixar e instalar no Android

1. Abra a página [Releases](../../releases) deste repositório no celular.
2. Na versão mais recente, toque no arquivo `Dominus-<versão>.apk` para baixar.
3. Abra o arquivo baixado. Se o Android pedir, permita a instalação de apps dessa origem (o navegador ou o gerenciador de arquivos).
4. Abra o Dominus e toque em **Criar conta**: nome, e-mail e senha. Se o Supabase pedir confirmação, digite o código que chega no e-mail (ou toque no link do e-mail e depois entre no app).
5. No primeiro acesso, responda a entrevista inicial (6 etapas curtas) para o Dominus se ajustar ao seu curso e à sua rotina.

> Desde 30/09/2026, no Brasil, o Android passa a exigir que apps instalados fora da Play Store venham de desenvolvedores verificados pelo Google. Enquanto o Dominus não estiver registrado, a instalação pode pedir o fluxo avançado do Android, com avisos extras de segurança.

## O que já funciona (versão 0.4)

- Entrevista inicial no primeiro acesso, em 6 etapas: perfil acadêmico (nível de ensino: técnico, graduação, pós lato sensu, mestrado ou doutorado, com perguntas próprias para cada um), disciplinas, avaliações (ou marcos da pós), rotina de estudo, objetivos e preferências do monitor, com autorização de uso dos dados (LGPD). Só a primeira etapa é obrigatória; as outras podem ser puladas.
- Meu perfil: dados pessoais (nome, e-mail, telefone, nascimento, cidade) e todas as respostas da entrevista, editáveis a qualquer momento, além de refazer a entrevista e sair da conta. Os dados do usuário saíram da tela principal: no topo fica só o botão do perfil.
- Animação de abertura: o D desliza, o capelo cai sobre ele e a logo fica animada enquanto o app carrega. Ela volta quando o app fica 5 minutos sem uso (parado na tela ou em segundo plano).
- Conta com e-mail e senha, confirmação de e-mail e recuperação de senha por código.
- Dados salvos na nuvem (Supabase), com cópia no aparelho: o app abre sem internet e envia as alterações quando a conexão volta. Entrando em outro celular com a mesma conta, os dados aparecem lá.
- Painel com média geral, presença, entregas da semana e alertas.
- Disciplinas, avaliações, média de aprovação e nota necessária.
- Frequência com limite de faltas.
- Grade semanal, calendário e compromissos, com dias sem aula: um dia ou um período (feriado, recesso, férias, ausência do professor), para todas as disciplinas ou só uma.
- Trabalhos e prazos, com acompanhamento por situação.
- Central de Estudos por disciplina: temas, anotações, revisões, tags e materiais.
- Monitor com IA (Claude): conversa em todas as telas, guias de estudo, perguntas com correção, resumos de revisão, orientação de trabalhos e leitura de boletim, proposta de trabalho, grade curricular e horário (PDF ou foto).

Quem usou a versão 0.1 não perde nada: no primeiro acesso com a conta nova, os dados guardados no aparelho vão para a nuvem.

## Próximas etapas

- Colegas e trabalhos em grupo.

## Supabase

O app usa o projeto Supabase `ucngbmpjdfurlwnrfmio`, com a chave pública (*publishable key*) em [`www/dominus.js`](www/dominus.js). Essa chave pode ficar no app: o que protege os dados são as regras de acesso (Row Level Security), que só deixam cada pessoa ler e alterar as próprias linhas.

Para preparar um projeto Supabase novo, rode [`supabase/esquema.sql`](supabase/esquema.sql) no SQL Editor. Todos os dados ficam na tabela `public.docs`, um registro por item (`owner`, `col`, `id`, `data`). O perfil e as respostas da entrevista ficam no registro `config/conta` (campos `perfil` e `entrevista`), então não é preciso mudar o banco.

Nunca coloque no app a chave secreta (`sb_secret_...` ou `service_role`) nem a senha do banco.

### Monitor com IA

O app nunca fala direto com a API do Claude. Ele chama a função [`supabase/functions/claude`](supabase/functions/claude/index.ts), que roda no Supabase, confere o login, aplica os limites e repassa o pedido com a chave da API guardada no servidor.

Para ativar:

1. Rode [`supabase/monitor.sql`](supabase/monitor.sql) no SQL Editor (controle de uso diário).
2. Em **Edge Functions**, crie a função `claude` pelo editor do painel e cole o código de `supabase/functions/claude/index.ts`. Nas configurações da função, desligue a verificação de JWT: a própria função confere o login.
3. Em **Edge Functions > Secrets**, cadastre:

| Segredo | Para que serve |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API do Claude (obrigatório) |
| `DOMINUS_EMAILS_PERMITIDOS` | E-mails que podem usar o monitor, separados por vírgula. Vazio libera para qualquer conta. |
| `DOMINUS_LIMITE_DIARIO` | Pedidos por pessoa por dia (padrão 80) |
| `DOMINUS_MODELO` / `DOMINUS_MODELO_RAPIDO` | Modelos usados (padrão `claude-sonnet-5-5` e `claude-haiku-5-5`) |

## Como o APK é gerado

A cada envio para a branch `main`, o GitHub Actions ([gerar-apk.yml](.github/workflows/gerar-apk.yml)) monta o projeto Android com o [Capacitor](https://capacitorjs.com), gera o APK e publica uma nova versão em Releases.

Estrutura:

| Pasta ou arquivo | O que é |
|---|---|
| `www/` | O app (HTML, CSS e JavaScript) e as fontes |
| `www/abertura.js` | Animação de abertura da logo e retorno após inatividade |
| `www/dominus.js` | Login e dados na nuvem (Supabase), com cópia local e fila de envio |
| `tools/perfil-entrevista.js` | Entrevista inicial e Meu perfil, inseridos no portal por `gerar-www.py` |
| `supabase/esquema.sql` | Tabela e regras de acesso do banco |
| `supabase/monitor.sql` | Controle de uso diário do monitor |
| `supabase/functions/claude/` | Função do servidor que fala com a API do Claude |
| `assets/` | Ícone e tela de abertura, convertidos para o Android na geração |
| `tools/portal-origem.html` | Cópia da página do portal usada como base |
| `tools/gerar-www.py` | Gera `www/index.html` a partir do portal, com a marca Dominus |
| `tools/gerar-icones.py` | Gera os arquivos de `assets/` |
| `capacitor.config.json` | Nome e identificador do app (`io.github.jaksonsilvajfs.dominus`) |

Fontes incluídas: Poppins e IBM Plex Mono, ambas sob a SIL Open Font License.
