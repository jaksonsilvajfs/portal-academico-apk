"""Gera www/index.html do Dominus a partir da página do portal (tools/portal-origem.html).

Uso: python3 tools/gerar-www.py
"""
import os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(RAIZ, "tools", "portal-origem.html"), encoding="utf-8").read()


def troca(antigo, novo, vezes=1):
    global s
    n = s.count(antigo)
    if n != vezes:
        sys.exit("Trecho esperado %d vez(es), encontrado %d: %r" % (vezes, n, antigo[:90]))
    s = s.replace(antigo, novo)


# cabeçalho do documento: título, cor do sistema e fontes locais
troca("<title>Gerenciamento Acadêmico</title>", "<title>Dominus</title>")
troca('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
troca(
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">',
    '<meta name="theme-color" content="#5446D2">\n'
    "<style>\n"
    "@font-face { font-family: 'Poppins'; font-weight: 400; font-style: normal; font-display: swap; src: url('fonts/Poppins-Regular.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'Poppins'; font-weight: 500; font-style: normal; font-display: swap; src: url('fonts/Poppins-Medium.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'Poppins'; font-weight: 600 700; font-style: normal; font-display: swap; src: url('fonts/Poppins-Bold.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'IBM Plex Mono'; font-weight: 400 500; font-style: normal; font-display: swap; src: url('fonts/IBMPlexMono-Regular.ttf') format('truetype'); }\n"
    ".slogan { margin: 2px 0 0; font-size: 13px; opacity: .85; }\n"
    "</style>",
)

# marca
troca("        <h1>Portal de Gerenciamento Acadêmico</h1>\n",
      "        <h1>Dominus</h1>\n        <p class=\"slogan\">Seu desenvolvedor acadêmico</p>\n")
s = s.replace('"Portal de Gerenciamento Acadêmico\\nE-mail: "', '"Dominus\\nE-mail: "')

# textos do modo sem Claude (versão 0.1 funciona só com dados no aparelho)
s = re.sub(r'var NO_CLAUDE = "[^"]*";',
           'var NO_CLAUDE = "O monitor com IA chega em uma próxima versão do Dominus. Por enquanto, preencha as informações manualmente.";', s, count=1)
troca('txt = "Salvo só neste navegador";', 'txt = "Salvo neste aparelho";')

# sem servidor ainda: esconde as áreas que dependem de outras pessoas
troca('function modPermitido(m) { var id = typeof m === "string" ? m : m[0]; return state.isOwner || !dbNS || (id !== "compartilhado" && id !== "acessos"); }',
      'function modPermitido(m) { var id = typeof m === "string" ? m : m[0]; if (!dbNS) return id !== "compartilhado" && id !== "acessos"; return state.isOwner || (id !== "compartilhado" && id !== "acessos"); }')

# sem monitor com IA nesta versão: some com a caixa do monitor e o botão flutuante
troca("  function attachMonitor(container, refocus) {\n",
      "  function attachMonitor(container, refocus) {\n    if (!sampleFn) { var semMon = $(\"#fab-monitor\"); if (semMon) semMon.hidden = true; return; }\n")

os.makedirs(os.path.join(RAIZ, "www"), exist_ok=True)
open(os.path.join(RAIZ, "www", "index.html"), "w", encoding="utf-8").write(s)
print("www/index.html gerado (%d caracteres)" % len(s))
