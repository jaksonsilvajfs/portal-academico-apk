# Dominus

**Dominus, seu desenvolvedor acadêmico.**

App Android para o estudante organizar o curso: disciplinas e notas, frequência e faltas, calendário e horários, trabalhos e prazos, painel de desempenho e a Central de Estudos (temas, revisões, materiais e tags).

O Dominus nasceu do Portal de Gerenciamento Acadêmico, criado como página no Claude, e é distribuído como APK, sem passar pela Play Store.

## Baixar e instalar

1. Abra a página [Releases](../../releases) deste repositório no celular.
2. Na versão mais recente, toque no arquivo `Dominus-<versão>.apk` para baixar.
3. Abra o arquivo baixado. Se o Android pedir, permita a instalação de apps dessa origem (o navegador ou o gerenciador de arquivos).
4. Abra o Dominus e crie seu acesso com nome, e-mail e senha.

> Desde 30/09/2026, no Brasil, o Android passa a exigir que apps instalados fora da Play Store venham de desenvolvedores verificados pelo Google. Enquanto o Dominus não estiver registrado, a instalação pode pedir o fluxo avançado do Android, com avisos extras de segurança.

## O que já funciona (versão 0.1)

- Painel com média geral, presença, entregas da semana e alertas.
- Disciplinas, avaliações, média de aprovação e nota necessária.
- Frequência com limite de faltas.
- Grade semanal, calendário e compromissos.
- Trabalhos e prazos, com acompanhamento por situação.
- Central de Estudos por disciplina: temas, anotações, revisões, tags e materiais.

Nesta versão **os dados ficam guardados só no aparelho**. Desinstalar o app ou limpar os dados dele apaga as informações.

## Próximas etapas

- Conta com login real e dados sincronizados na nuvem (Supabase).
- Colegas e trabalhos em grupo.
- Monitor com IA: guias de estudo, perguntas, leitura de boletim e de propostas de trabalho.

## Como o APK é gerado

A cada envio para a branch `main`, o GitHub Actions ([gerar-apk.yml](.github/workflows/gerar-apk.yml)) monta o projeto Android com o [Capacitor](https://capacitorjs.com), gera o APK e publica uma nova versão em Releases.

Estrutura:

| Pasta ou arquivo | O que é |
|---|---|
| `www/` | O app (HTML, CSS e JavaScript) e as fontes |
| `assets/` | Ícone e tela de abertura, convertidos para o Android na geração |
| `tools/portal-origem.html` | Cópia da página do portal usada como base |
| `tools/gerar-www.py` | Gera `www/index.html` a partir do portal, com a marca Dominus |
| `tools/gerar-icones.py` | Gera os arquivos de `assets/` |
| `capacitor.config.json` | Nome e identificador do app (`io.github.jaksonsilvajfs.dominus`) |

Fontes incluídas: Poppins e IBM Plex Mono, ambas sob a SIL Open Font License.
