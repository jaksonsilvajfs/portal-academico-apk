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
    '<link rel="stylesheet" href="dominus.css">\n'
    '<script src="abertura.js"></script>\n'
    '<script src="dominus.js"></script>\n'
    "<style>\n"
    "@font-face { font-family: 'Poppins'; font-weight: 400; font-style: normal; font-display: swap; src: url('fonts/Poppins-Regular.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'Poppins'; font-weight: 500; font-style: normal; font-display: swap; src: url('fonts/Poppins-Medium.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'Poppins'; font-weight: 600 700; font-style: normal; font-display: swap; src: url('fonts/Poppins-Bold.ttf') format('truetype'); }\n"
    "@font-face { font-family: 'IBM Plex Mono'; font-weight: 400 500; font-style: normal; font-display: swap; src: url('fonts/IBMPlexMono-Regular.ttf') format('truetype'); }\n"
    ".slogan { margin: 2px 0 0; font-size: 13px; opacity: .85; }\n"
    "/* textos só para leitor de tela não podem alargar a página (cortava o botão do monitor) */\n"
    ".tbl-wrap { position: relative; }\n"
    ".sr { top: 0; left: 0; }\n"
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

# ---- integração com o Supabase (dominus.js) ----
# entra direto no portal com a conta do Supabase, sem a segunda tela de senha do portal
troca("    if (dbNS && dono && !state.uidUser) {\n",
      "    if (window.DOMINUS && dbNS) { card.append(h(\"p\", { class: \"muted\", style: \"margin:0\", text: \"Abrindo…\" })); setTimeout(dominusEntrar, 0); return; }\n    if (dbNS && dono && !state.uidUser) {\n")
troca("  function sair() {\n    limparSessao();",
      """  function dominusEntrar() {
    if (state.auth) return;
    var u = window.DOMINUS.usuario(), c = state.conta;
    if (!c) {
      c = { id: "conta", nome: u.nome, email: u.email, curso: u.curso, periodo: u.periodo, instituicao: u.instituicao, criadoEm: Date.now() };
      state.conta = c; persist("config", c);
    } else if (c.email !== u.email) { c.email = u.email; persist("config", c); }
    entrar({ papel: "dono", email: u.email, nome: c.nome || u.nome || "" });
  }
  function sair() {
    if (window.DOMINUS) { window.DOMINUS.sair(); return; }
    limparSessao();""")
# colegas e área compartilhada ainda não existem no app
troca('if (!dbNS) return id !== "compartilhado" && id !== "acessos";',
      'if (!dbNS || window.DOMINUS) return id !== "compartilhado" && id !== "acessos";')
# textos de situação
troca('else txt = "Tudo salvo nesta página";', 'else txt = window.DOMINUS ? window.DOMINUS.textoStatus() : "Tudo salvo nesta página";')
troca('txt = "Não foi possível salvar. A página pode estar em modo somente leitura.";',
      'txt = window.DOMINUS ? "Não foi possível salvar uma alteração na nuvem. Tente de novo." : "Não foi possível salvar. A página pode estar em modo somente leitura.";')

# importações feitas pelo monitor (boletim, proposta, grade, horário) só aparecem quando o monitor existir
for secao in ("curriculoSection", "horarioSection", "propostaSection", "boletimSection"):
    troca("  function %s() {\n" % secao, "  function %s() {\n    if (!sampleFn) return document.createDocumentFragment();\n" % secao)

# mensagens de erro do monitor no app
troca('      not_granted: "O acesso ao Claude não foi liberado para esta página.",\n      sampling_disabled: "O Claude não está disponível para esta conta.",',
      '      not_granted: "O monitor com IA ainda não foi liberado para a sua conta no Dominus.",\n'
      '      sampling_disabled: "O monitor com IA ainda não está ativado no servidor do Dominus.",\n'
      '      offline: "Sem conexão com a internet. O monitor precisa de internet para responder.",\n'
      '      config: "O monitor ainda não está configurado no servidor do Dominus.",\n'
      '      image_rejected: "Uma das imagens não pôde ser lida. Use PNG, JPG ou WebP com até 3,5 MB.",\n'
      '      upstream: "O monitor não conseguiu responder agora. Tente de novo.",')

# importação da grade curricular também em Disciplinas e notas (no portal ela fica só em Calendário)
troca("    w.append(boletimSection());\n", "    w.append(curriculoSection());\n    w.append(boletimSection());\n")
troca('text: "1. Grade curricular do curso" }', 'text: state.modulo === "calendario" ? "1. Grade curricular do curso" : "Importar grade curricular" }')

# dias sem aula: um dia ou um período (férias, recesso, feriado, ausência do professor), para todas ou uma disciplina
troca('return { haMin: ha, unidade: c.chUnidade === "h" ? "h" : "ha", semAula: Array.isArray(c.semAula) ? c.semAula.slice() : [] };',
      'return { haMin: ha, unidade: c.chUnidade === "h" ? "h" : "ha", semAula: listaSemAula(c) };')
troca("  function minutos(hm) {", """  /* períodos sem aula: { id, inicio, fim, motivo, disciplinaId } (datas antigas, só texto, viram um dia) */
  function listaSemAula(c) {
    return (Array.isArray(c.semAula) ? c.semAula : []).map(function (x) {
      if (typeof x === "string") return { id: "d-" + x, inicio: x, fim: x, motivo: "", disciplinaId: "" };
      if (!x || !x.inicio) return null;
      var fim = x.fim && x.fim >= x.inicio ? x.fim : x.inicio;
      return { id: x.id || ("p-" + x.inicio + "-" + fim), inicio: x.inicio, fim: fim, motivo: x.motivo || "", disciplinaId: x.disciplinaId || "" };
    }).filter(Boolean).sort(function (a, b) { return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0; });
  }
  function semAulaEm(lista, iso, discId) {
    for (var i = 0; i < lista.length; i++) { var p = lista[i]; if (p.inicio <= iso && iso <= p.fim && (!p.disciplinaId || p.disciplinaId === discId)) return true; }
    return false;
  }
  function minutos(hm) {""")
troca("    var sem = {}; cfg.semAula.forEach(function (x) { sem[x] = 1; });\n", "")
troca("        if (lista && !sem[iso]) {", "        if (lista && !semAulaEm(cfg.semAula, iso, d.id)) {")
troca("""    var fI = h("input", { id: "pl-feriado", type: "date" });
    var chips = h("div", { class: "chips" }, cfg.semAula.slice().sort().map(function (x) {
      return h("span", { class: "chip" }, dataBR(x) + " · " + diaSemana(x),
        h("button", { class: "tag-x", type: "button", "aria-label": "Remover " + dataBR(x), onclick: function () { salvarCfg(function (c) { c.semAula = (c.semAula || []).filter(function (y) { return y !== x; }); }); } }, "×"));
    }));
    sec.append(h("div", { class: "form-row" },
      h("label", { class: "field", for: "pl-ha" }, "Duração da hora-aula (min)", haI),
      h("label", { class: "field", for: "pl-un" }, "A carga horária está em", unI),
      h("label", { class: "field", for: "pl-feriado" }, "Dia sem aula (feriado, recesso)", fI),
      h("button", { class: "btn ghost", type: "button", onclick: function () { if (!fI.value) { fI.focus(); return; } var v = fI.value; salvarCfg(function (c) { c.semAula = (c.semAula || []).filter(function (y) { return y !== v; }).concat(v); }); } }, "Adicionar dia sem aula")));
    if (cfg.semAula.length) sec.append(chips);""",
"""    sec.append(h("div", { class: "form-row" },
      h("label", { class: "field", for: "pl-ha" }, "Duração da hora-aula (min)", haI),
      h("label", { class: "field", for: "pl-un" }, "A carga horária está em", unI)));

    /* dias sem aula: um dia ou um período */
    var MOTIVOS = ["Feriado", "Recesso acadêmico", "Férias", "Ausência do professor", "Outro"];
    var moI = h("select", { id: "pl-sa-motivo" }, MOTIVOS.map(function (m) { return h("option", { value: m, text: m }); }));
    var deI = h("input", { id: "pl-sa-de", type: "date" });
    var ateI = h("input", { id: "pl-sa-ate", type: "date" });
    var diI = h("select", { id: "pl-sa-disc" }, [h("option", { value: "", text: "Todas as disciplinas" })].concat(
      state.disciplinas.map(function (d) { return h("option", { value: d.id, text: d.nome || "Disciplina" }); })));
    var saMsg = h("p", { class: "muted small", style: "margin:0", role: "status" });
    function sugerirDisc() { if (moI.value === "Ausência do professor" && !diI.value && state.disciplinas.length) diI.focus(); }
    moI.addEventListener("change", sugerirDisc);
    deI.addEventListener("change", function () { if (ateI.value && ateI.value < deI.value) ateI.value = ""; ateI.min = deI.value; });
    var saBtn = h("button", { class: "btn ghost", type: "button", onclick: function () {
      if (!deI.value) { saMsg.textContent = "Escolha a data (ou a data de início do período)."; deI.focus(); return; }
      if (ateI.value && ateI.value < deI.value) { saMsg.textContent = "A data final precisa ser igual ou depois da inicial."; ateI.focus(); return; }
      var item = { id: uid(), inicio: deI.value, fim: ateI.value || deI.value, motivo: moI.value, disciplinaId: diI.value };
      salvarCfg(function (c) { c.semAula = listaSemAula(c).concat(item); });
    } }, "Adicionar");
    sec.append(h("div", { class: "stack", style: "gap:10px" },
      h("h3", { style: "margin:0;font-size:15px", text: "Dias sem aula" }),
      h("p", { class: "muted small", style: "margin:0", text: "Cadastre um dia (feriado, falta do professor) ou um período (férias, recesso). Para um dia só, deixe \\u201cAté\\u201d em branco." }),
      h("div", { class: "form-row" },
        h("label", { class: "field", for: "pl-sa-motivo" }, "Motivo", moI),
        h("label", { class: "field", for: "pl-sa-disc" }, "Vale para", diI)),
      h("div", { class: "form-row" },
        h("label", { class: "field", for: "pl-sa-de" }, "De", deI),
        h("label", { class: "field", for: "pl-sa-ate" }, "Até (opcional)", ateI)),
      h("div", { class: "row", style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, saBtn, saMsg)));
    if (cfg.semAula.length) {
      sec.append(h("ul", { class: "sa-lista", style: "list-style:none;margin:0;padding:0;display:grid;gap:8px" }, cfg.semAula.map(function (x) {
        var quando = x.inicio === x.fim ? dataBR(x.inicio) + " (" + diaSemana(x.inicio) + ")" : dataBR(x.inicio) + " a " + dataBR(x.fim);
        var quem = x.disciplinaId ? discNome(x.disciplinaId) : "Todas as disciplinas";
        return h("li", { class: "chip", style: "display:flex;justify-content:space-between;align-items:center;gap:10px;border-radius:14px;padding:8px 12px" },
          h("span", {}, h("strong", { text: x.motivo || "Sem aula" }), h("br"), h("span", { class: "small", text: quando + " · " + quem })),
          h("button", { class: "tag-x", type: "button", "aria-label": "Remover " + (x.motivo || "dia sem aula") + " de " + quando, onclick: function () { salvarCfg(function (c) { c.semAula = listaSemAula(c).filter(function (y) { return y.id !== x.id; }); }); } }, "×"));
      })));
    }""")

# painel: desempenho por disciplina com caixa de seleção em vez da lista inteira
troca("""    cs.forEach(function (x) {
      perf.append(h("div", { class: "perf-row" },""", """    var PERF_K = "dominus-painel-disc";
    if (state.painelDisc === undefined) { try { state.painelDisc = localStorage.getItem(PERF_K) || ""; } catch (e) { state.painelDisc = ""; } }
    if (state.painelDisc && !cs.some(function (x) { return x.d.id === state.painelDisc; })) state.painelDisc = "";
    var perfSel = h("select", { id: "perf-disc" }, [h("option", { value: "", text: cs.length ? "Escolha uma disciplina" : "Nenhuma disciplina cadastrada" })].concat(cs.map(function (x) {
      var alerta = x.c.sit[1] === "bad" || x.c.fsit[1] === "bad" ? " · em risco" : (x.c.sit[1] === "warn" || x.c.fsit[1] === "warn" ? " · atenção" : "");
      var op = h("option", { value: x.d.id, text: x.d.nome + alerta }); if (x.d.id === state.painelDisc) op.selected = true; return op;
    })));
    var perfBox = h("div", { class: "stack", "aria-live": "polite" });
    perf.append(h("label", { class: "field", for: "perf-disc" }, "Disciplina", perfSel), perfBox);
    function perfMostrar() {
      perfBox.textContent = "";
      var x = cs.filter(function (y) { return y.d.id === state.painelDisc; })[0];
      if (!x) { perfBox.append(h("p", { class: "muted small", style: "margin:0", text: "Selecione uma disciplina para ver média, presença e situação." })); return; }
      perfBox.append(h("div", { class: "perf-row" },""")
troca("""        h("div", { class: "q-meta" }, pill(x.c.sit[0], x.c.sit[1]), pill(x.c.fsit[0], x.c.fsit[1]))));
    });
    perf.append(h("p", { class: "muted small", style: "margin:0", text: "O traço vertical""", """        h("div", { class: "q-meta" }, pill(x.c.sit[0], x.c.sit[1]), pill(x.c.fsit[0], x.c.fsit[1]))));
    }
    perfSel.addEventListener("change", function () { state.painelDisc = perfSel.value; try { localStorage.setItem(PERF_K, perfSel.value); } catch (e) {} perfMostrar(); });
    perfMostrar();
    perf.append(h("p", { class: "muted small", style: "margin:0", text: "O traço vertical""")

# Disciplinas e notas: caixa de seleção em vez da lista de todas as disciplinas
troca("""    var lista = h("section", { class: "panel" });
    state.disciplinas.forEach(function (d) {
      var c = calcDisc(d), cur = state.discSel === d.id;
      lista.append(h("button", { class: "disc-row", type: "button", "aria-current": cur ? "true" : "false", onclick: function () { state.discSel = cur ? null : d.id; renderAll(true); } },
        h("span", { class: "disc-row-name" }, h("b", { text: d.nome }), h("small", { text: [d.professor, d.semestre].filter(Boolean).join(" · ") || "Toque para editar" })),
        h("span", { class: "q-meta" }, pill("média " + fmt1(c.media), ""), pill("aprovação com " + fmtNota(c.min), ""), pill(c.sit[0], c.sit[1]))));
    });
    w.append(lista);""", """    var lista = h("section", { class: "panel stack" });
    var discI = h("select", { id: "disc-escolha" }, [h("option", { value: "", text: "Escolha uma disciplina (" + state.disciplinas.length + ")" })].concat(state.disciplinas.map(function (d) {
      var c = calcDisc(d);
      var alerta = c.sit[1] === "bad" || c.fsit[1] === "bad" ? " · em risco" : (c.sit[1] === "warn" || c.fsit[1] === "warn" ? " · atenção" : "");
      var op = h("option", { value: d.id, text: d.nome + alerta }); if (state.discSel === d.id) op.selected = true; return op;
    })));
    discI.addEventListener("change", function () { flushAll(); state.discSel = discI.value || null; renderAll(true); });
    lista.append(h("label", { class: "field", for: "disc-escolha" }, "Disciplina", discI));
    var atual = state.discSel && getDisc(state.discSel);
    if (atual) {
      var ca = calcDisc(atual);
      lista.append(h("div", { class: "q-meta" }, pill("média " + fmt1(ca.media), ""), pill("aprovação com " + fmtNota(ca.min), ""), pill(ca.sit[0], ca.sit[1])));
    } else {
      lista.append(h("p", { class: "muted small", style: "margin:0", text: "Selecione uma disciplina para ver e editar notas, avaliações, professor e média de aprovação." }));
    }
    w.append(lista);""")

os.makedirs(os.path.join(RAIZ, "www"), exist_ok=True)
open(os.path.join(RAIZ, "www", "index.html"), "w", encoding="utf-8").write(s)
print("www/index.html gerado (%d caracteres)" % len(s))
