  /* ================= DOMINUS: ENTREVISTA INICIAL E MEU PERFIL =================
   * Trecho inserido no portal por tools/gerar-www.py.
   * Tudo fica no documento da conta (config/conta): campos básicos (nome, curso, período,
   * instituição) no próprio documento e o restante em conta.perfil. O andamento da
   * entrevista fica em conta.entrevista = { etapa, concluida, em }.
   */
  var NIVEIS = [["tecnico", "Técnico"], ["graduacao", "Graduação"], ["lato", "Pós-graduação lato sensu (especialização ou MBA)"], ["mestrado", "Mestrado"], ["doutorado", "Doutorado"]];
  var TIPOS_GRAD = [["bacharelado", "Bacharelado"], ["licenciatura", "Licenciatura"], ["tecnologo", "Tecnólogo"]];
  var MODALIDADES = [["presencial", "Presencial"], ["ead", "EAD"], ["semipresencial", "Semipresencial"]];
  var TURNOS = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"], ["integral", "Integral"]];
  var HORARIOS = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"], ["madrugada", "Madrugada"]];
  var HORAS_DIA = [["menos1", "Menos de 1 hora"], ["1a2", "1 a 2 horas"], ["2a4", "2 a 4 horas"], ["mais4", "Mais de 4 horas"]];
  var OCUPACAO = [["nao", "Não, só estudo"], ["trabalho", "Trabalho"], ["estagio", "Faço estágio"], ["ambos", "Trabalho e faço estágio"]];
  var DIAS_SEMANA = [["seg", "Segunda"], ["ter", "Terça"], ["qua", "Quarta"], ["qui", "Quinta"], ["sex", "Sexta"], ["sab", "Sábado"], ["dom", "Domingo"]];
  var ESTILOS = [["resumos", "Resumos"], ["mapas", "Mapas mentais"], ["questoes", "Questões"], ["flashcards", "Flashcards"], ["videos", "Videoaulas"], ["leitura", "Leitura do livro-texto"]];
  var CALCULOS = [["simples", "Média simples das avaliações"], ["ponderada", "Média ponderada (pesos diferentes)"], ["outra", "Outra regra"]];
  var TONS = [["explicativo", "Explicativo, com exemplos"], ["direto", "Direto ao ponto"]];
  var LEMBRETE_PROVA = [["1", "1 dia antes"], ["2", "2 dias antes"], ["3", "3 dias antes"], ["7", "1 semana antes"], ["0", "Não quero lembretes"]];
  var METAS = {
    grad: [["aprovacao", "Passar em todas as disciplinas"], ["media", "Manter a média alta"], ["estagio", "Conseguir estágio"], ["tcc", "Fazer um bom TCC"], ["exame", "Me preparar para exame de ordem, conselho ou concurso"]],
    lato: [["modulos", "Concluir os módulos em dia"], ["tcc", "Fazer o TCC ou artigo final"], ["carreira", "Crescer na carreira"]],
    stricto: [["creditos", "Cumprir os créditos"], ["qualificacao", "Passar na qualificação"], ["defesa", "Defender no prazo"], ["publicar", "Publicar artigos"]]
  };

  function grupoNivel(n) { return n === "lato" ? "lato" : (n === "mestrado" || n === "doutorado") ? "stricto" : n ? "grad" : ""; }
  function rotuloDe(lista, v) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === v) return lista[i][1]; return ""; }
  function rotulosDe(lista, vs) { return (Array.isArray(vs) ? vs : []).map(function (v) { return rotuloDe(lista, v); }).filter(Boolean); }
  function perfilDados() { return (state.conta && state.conta.perfil) || {}; }
  function iniciais(nome) {
    var p = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "?";
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }
  function primeiroNome() { var p = perfilDados(); return String(p.apelido || ((state.conta && state.conta.nome) || "").split(" ")[0] || "").trim(); }

  /* rascunho: cópia editável dos dados da conta; só vai para a nuvem ao salvar */
  function rascunho() {
    var c = state.conta || {};
    var d = JSON.parse(JSON.stringify(c.perfil || {}));
    d.nome = c.nome || ""; d.curso = c.curso || ""; d.instituicao = c.instituicao || ""; d.periodo = c.periodo || "";
    if (!d.apelido && c.nome) d.apelido = c.nome.split(" ")[0];
    return d;
  }
  function gravarRascunho(d) {
    var c = state.conta; if (!c) return;
    var p = {};
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (k === "nome" || k === "curso" || k === "instituicao" || k === "periodo") { c[k] = String(v || "").trim().slice(0, 120); return; }
      p[k] = typeof v === "string" ? v.trim().slice(0, 600) : v;
    });
    p.atualizadoEm = Date.now();
    c.perfil = p;
    persist("config", c);
  }

  /* ---------- campos ligados ao rascunho ---------- */
  function pfTexto(d, k, rotulo, extra) {
    var inp = h("input", Object.assign({ id: "pe-" + k, type: "text", value: d[k] || "" }, extra || {}));
    inp.addEventListener("input", function () { d[k] = inp.value; });
    return h("label", { class: "field", for: inp.id }, rotulo, inp);
  }
  function pfArea(d, k, rotulo, extra) {
    var t = h("textarea", Object.assign({ id: "pe-" + k, rows: "3" }, extra || {}));
    t.value = d[k] || "";
    t.addEventListener("input", function () { d[k] = t.value; });
    return h("label", { class: "field", for: t.id }, rotulo, t);
  }
  function pfSelect(d, k, rotulo, opcoes, vazio, aoMudar) {
    if (vazio == null && !d[k] && opcoes.length) d[k] = opcoes[0][0];
    var s = h("select", { id: "pe-" + k }, (vazio != null ? [h("option", { value: "", text: vazio })] : []).concat(opcoes.map(function (o) {
      var op = h("option", { value: o[0], text: o[1] }); if (d[k] === o[0]) op.selected = true; return op;
    })));
    s.addEventListener("change", function () { d[k] = s.value; if (aoMudar) aoMudar(); });
    return h("label", { class: "field", for: s.id }, rotulo, s);
  }
  function pfChecks(d, k, rotulo, opcoes) {
    d[k] = Array.isArray(d[k]) ? d[k].slice() : [];
    return h("fieldset", { class: "pf-grupo" }, h("legend", { text: rotulo }), h("div", { class: "chips" }, opcoes.map(function (o) {
      var cb = h("input", { type: "checkbox", id: "pe-" + k + "-" + o[0], checked: d[k].indexOf(o[0]) >= 0 });
      cb.addEventListener("change", function () {
        var i = d[k].indexOf(o[0]);
        if (cb.checked && i < 0) d[k].push(o[0]);
        if (!cb.checked && i >= 0) d[k].splice(i, 1);
      });
      return h("label", { class: "check chip", for: cb.id }, cb, o[1]);
    })));
  }
  function pfDica(txt) { return h("p", { class: "muted small", style: "margin:0", text: txt }); }

  /* ---------- blocos de perguntas (usados na entrevista e no Meu perfil) ---------- */
  function blocoPessoal(d) {
    var email = (state.auth && state.auth.email) || (window.DOMINUS ? window.DOMINUS.usuario().email : "");
    var el = h("div", { class: "stack" },
      h("div", { class: "form-row" },
        pfTexto(d, "nome", "Nome completo", { maxlength: "120", autocomplete: "name" }),
        pfTexto(d, "apelido", "Como prefere ser chamado", { maxlength: "40" })),
      h("div", { class: "form-row" },
        h("label", { class: "field", for: "pe-email" }, "E-mail da conta", h("input", { id: "pe-email", type: "email", value: email, readonly: true, "aria-readonly": "true" })),
        pfTexto(d, "telefone", "Telefone ou WhatsApp (opcional)", { type: "tel", inputmode: "tel", autocomplete: "tel", maxlength: "20", placeholder: "(00) 00000-0000" })),
      h("div", { class: "form-row" },
        pfTexto(d, "nascimento", "Data de nascimento (opcional)", { type: "date" }),
        pfTexto(d, "cidade", "Cidade e estado (opcional)", { maxlength: "80", placeholder: "Ex.: Teresina - PI" })),
      pfDica("O e-mail é o do login. Para usar outro e-mail, crie uma conta nova com ele."));
    return {
      el: el,
      validar: function () {
        if (!String(d.nome || "").trim()) return "Informe seu nome.";
        var tel = String(d.telefone || "").replace(/\D/g, "");
        if (tel && (tel.length < 10 || tel.length > 13)) return "Confira o telefone: use DDD e número, por exemplo (86) 99999-9999.";
        return "";
      }
    };
  }

  function blocoAcademico(d, opc) {
    opc = opc || {};
    var cond = h("div", { class: "stack" });
    function montar() {
      cond.textContent = "";
      var g = grupoNivel(d.nivel);
      if (!g) { cond.append(pfDica("Escolha o nível para ver as próximas perguntas.")); return; }
      if (d.nivel === "graduacao") cond.append(pfSelect(d, "tipoGrad", "Tipo de graduação", TIPOS_GRAD, "Escolha"));
      var rotCurso = g === "stricto" ? "Programa de pós-graduação" : g === "lato" ? "Nome do curso (especialização ou MBA)" : "Curso";
      var cu = pfTexto(d, "curso", rotCurso, { maxlength: "120", list: "lista-cursos", placeholder: g === "grad" ? "Ex.: Direito, Medicina, Engenharia Civil" : "" });
      cond.append(h("div", { class: "form-row" },
        pfTexto(d, "instituicao", "Instituição", { maxlength: "120", placeholder: "Ex.: UNIP, UFPI" }), cu, g === "grad" ? listaCursos() : null),
        pfSelect(d, "modalidade", "Modalidade", MODALIDADES, "Escolha"));
      if (g === "grad") {
        var pe = campoPeriodo("pe-periodo", d.periodo);
        pe.inp.addEventListener("change", function () { d.periodo = pe.inp.value; });
        cond.append(h("div", { class: "form-row" }, pe.el, pfSelect(d, "turno", "Turno", TURNOS, "Prefiro não informar")));
      } else if (g === "lato") {
        cond.append(h("div", { class: "form-row" },
          pfTexto(d, "modulo", "Módulo atual", { maxlength: "60", placeholder: "Ex.: Módulo 3" }),
          pfTexto(d, "frequenciaAulas", "Com que frequência há aulas", { maxlength: "80", placeholder: "Ex.: fins de semana quinzenais" })));
      } else {
        cond.append(h("div", { class: "form-row" },
          pfTexto(d, "orientador", "Orientador(a)", { maxlength: "120" }),
          pfTexto(d, "linhaPesquisa", "Linha de pesquisa", { maxlength: "160" })),
          pfTexto(d, "temaPesquisa", "Tema da pesquisa", { maxlength: "240" }));
      }
      cond.append(h("div", { class: "form-row" },
        pfTexto(d, "matricula", "Matrícula ou RA (opcional)", { maxlength: "40" }),
        pfTexto(d, "conclusao", "Previsão de conclusão (opcional)", { type: "month" })));
    }
    var el = h("div", { class: "stack" },
      opc.comApelido ? pfTexto(d, "apelido", "Como prefere ser chamado", { maxlength: "40" }) : null,
      pfSelect(d, "nivel", "Nível de ensino", NIVEIS, "Escolha o nível", montar),
      cond);
    montar();
    return {
      el: el,
      validar: function () {
        if (opc.comApelido && !String(d.apelido || "").trim()) return "Conte como prefere ser chamado.";
        if (!d.nivel) return "Escolha o nível de ensino.";
        if (!String(d.curso || "").trim()) return grupoNivel(d.nivel) === "stricto" ? "Informe o programa de pós-graduação." : "Informe o curso.";
        if (grupoNivel(d.nivel) !== "grad") { d.periodo = ""; d.turno = ""; }
        if (d.nivel !== "graduacao") d.tipoGrad = "";
        return "";
      }
    };
  }

  function blocoDisciplinas(d, opc) {
    var stricto = grupoNivel(d.nivel) === "stricto";
    var lista = h("div", { class: "chips" });
    var nI = h("input", { id: "pe-nova-disc", type: "text", maxlength: "120", placeholder: "Ex.: Direito Constitucional I" });
    var msg = h("p", { class: "muted small", style: "margin:0", role: "status" });
    function montarLista() {
      lista.textContent = "";
      if (!state.disciplinas.length) { lista.append(pfDica("Nenhuma disciplina cadastrada ainda.")); return; }
      state.disciplinas.forEach(function (x) {
        var minha = opc && opc.criadas && opc.criadas.indexOf(x.id) >= 0;
        lista.append(h("span", { class: "chip" }, x.nome,
          minha ? h("button", { class: "tag-x", type: "button", "aria-label": "Remover " + x.nome, onclick: function () {
            removeItem("disciplinas", x.id); opc.criadas.splice(opc.criadas.indexOf(x.id), 1); refilter(); montarLista();
          } }, "×") : null));
      });
    }
    function adicionar() {
      var n = nI.value.trim();
      if (!n) { msg.textContent = "Digite o nome da disciplina."; nI.focus(); return; }
      if (state.disciplinas.some(function (x) { return x.nome.toLowerCase() === n.toLowerCase(); })) { msg.textContent = "Essa disciplina já está na lista."; return; }
      var nova = novaDisciplina(n);
      if (opc && opc.criadas) opc.criadas.push(nova.id);
      nI.value = ""; msg.textContent = n + " adicionada."; montarLista(); nI.focus();
    }
    nI.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); adicionar(); } });
    montarLista();
    return {
      el: h("div", { class: "stack" },
        pfDica(stricto ? "Se você está cursando disciplinas do programa, adicione aqui. Se não, pode continuar." : "Adicione as disciplinas deste período. Professor, horários e carga horária você completa depois, em Disciplinas e notas e em Calendário e horários."),
        h("div", { class: "form-row" }, h("label", { class: "field grow", for: "pe-nova-disc" }, "Nome da disciplina", nI),
          h("button", { class: "btn ghost", type: "button", onclick: adicionar }, "Adicionar")),
        msg, lista,
        sampleFn ? pfDica("Tem a grade ou o horário em PDF ou foto? Depois da entrevista, o monitor com IA importa tudo para você em Disciplinas e notas e em Calendário e horários.") : null)
    };
  }

  function avaliacoesPadrao() {
    var nomes = String(perfilDados().avaliacoes || "").split(/[,;\n]+/).map(function (s) { return s.trim().slice(0, 40); }).filter(Boolean).slice(0, 8);
    if (!nomes.length) nomes = ["NP1", "NP2"];
    return nomes.map(function (n) { return { id: uid(), nome: n, peso: 1, data: "", nota: "" }; });
  }
  function marcoEvento(id, titulo, data) {
    var i = state.eventos.map(function (e) { return e.id; }).indexOf(id);
    if (!data) { if (i >= 0) removeItem("eventos", id); return; }
    var ev = i >= 0 ? state.eventos[i] : { id: id, disciplinaId: "", criadoEm: Date.now() };
    ev.titulo = titulo; ev.data = data; ev.tipo = "entrega";
    if (i < 0) state.eventos.push(ev);
    persist("eventos", ev);
  }

  function blocoAvaliacoes(d, opc) {
    var g = grupoNivel(d.nivel) || "grad";
    if (!d.avaliacoes && g === "grad") d.avaliacoes = "NP1, NP2";
    if (d.mediaMin == null || d.mediaMin === "") d.mediaMin = "7";
    var el = h("div", { class: "stack" });
    var regra = h("div");
    function montarRegra() { regra.textContent = ""; if (d.calculo === "outra") regra.append(pfTexto(d, "regraMedia", "Como a média é calculada", { maxlength: "240", placeholder: "Ex.: (NP1 + NP2) / 2; abaixo de 7 faz exame" })); }
    if (g === "grad") {
      el.append(pfDica("Isso vale como padrão para as disciplinas novas. Cada disciplina pode ter regras próprias em Disciplinas e notas."),
        h("div", { class: "form-row" },
          pfTexto(d, "avaliacoes", "Avaliações do período", { maxlength: "120", placeholder: "Ex.: NP1, NP2, Exame" }),
          pfTexto(d, "mediaMin", "Média para aprovação (0 a 10)", { type: "number", min: "0", max: "10", step: "0.1", inputmode: "decimal" })),
        pfSelect(d, "calculo", "Como a média é calculada", CALCULOS, null, montarRegra), regra);
      montarRegra();
      if (opc && opc.entrevista) {
        var tI = h("input", { id: "pe-prova-tit", type: "text", maxlength: "120", placeholder: "Ex.: NP1 de Direito Constitucional" });
        var dI = h("input", { id: "pe-prova-data", type: "date" });
        var msg = h("p", { class: "muted small", style: "margin:0", role: "status" });
        el.append(h("h3", { style: "margin:6px 0 0;font-size:15px", text: "Já sabe a data de alguma prova?" }),
          h("div", { class: "form-row" },
            h("label", { class: "field grow", for: "pe-prova-tit" }, "Prova ou trabalho", tI),
            h("label", { class: "field", for: "pe-prova-data" }, "Data", dI),
            h("button", { class: "btn ghost", type: "button", onclick: function () {
              if (!tI.value.trim() || !dI.value) { msg.textContent = "Informe o nome e a data."; return; }
              var ev = { id: uid(), titulo: tI.value.trim().slice(0, 120), data: dI.value, tipo: "prova", disciplinaId: "", criadoEm: Date.now() };
              state.eventos.push(ev); persist("eventos", ev);
              msg.textContent = ev.titulo + " marcada para " + dataBR(ev.data) + ". Ela aparece em Calendário e horários."; tI.value = ""; dI.value = "";
            } }, "Adicionar")), msg);
      }
    } else if (g === "lato") {
      el.append(pfDica("Na pós, as notas costumam vir de trabalhos de cada módulo e de um trabalho final."),
        h("div", { class: "form-row" },
          pfTexto(d, "avaliacoes", "Como os módulos são avaliados", { maxlength: "160", placeholder: "Ex.: trabalho ao fim de cada módulo" }),
          pfTexto(d, "mediaMin", "Nota mínima (0 a 10)", { type: "number", min: "0", max: "10", step: "0.1", inputmode: "decimal" })),
        pfTexto(d, "dataTcc", "Entrega do TCC ou artigo final (se já souber)", { type: "date" }));
    } else {
      el.append(pfDica("As datas entram no seu calendário como marcos da pós-graduação."),
        h("div", { class: "form-row" },
          pfTexto(d, "creditosFaltam", "Créditos que faltam cumprir", { type: "number", min: "0", step: "1", inputmode: "numeric" }),
          pfTexto(d, "dataQualificacao", "Data da qualificação", { type: "date" })),
        h("div", { class: "form-row" },
          pfTexto(d, "dataDefesa", "Data da defesa", { type: "date" }),
          pfTexto(d, "prazoBolsa", "Fim da bolsa (se tiver)", { type: "date" })),
        pfArea(d, "publicacoes", "Metas de publicação (opcional)", { maxlength: "400", placeholder: "Ex.: 1 artigo em revista Qualis A até o fim do ano" }));
    }
    return {
      el: el,
      validar: function () {
        var m = num(d.mediaMin);
        if (d.mediaMin !== "" && d.mediaMin != null && (m == null || m < 0 || m > 10)) return "A média para aprovação precisa ficar entre 0 e 10.";
        if (g !== "grad") d.calculo = "";
        return "";
      },
      depois: function () {
        var g2 = grupoNivel(d.nivel);
        if (g2 === "lato") marcoEvento("marco-tcc", "Entrega do TCC ou artigo final", d.dataTcc);
        if (g2 === "stricto") {
          marcoEvento("marco-qualificacao", "Qualificação", d.dataQualificacao);
          marcoEvento("marco-defesa", "Defesa", d.dataDefesa);
          marcoEvento("marco-bolsa", "Fim da bolsa", d.prazoBolsa);
        }
        /* disciplinas criadas na entrevista, ainda sem notas, recebem o padrão informado */
        var mm = num(d.mediaMin);
        ((opc && opc.criadas) || []).forEach(function (id) {
          var x = getDisc(id); if (!x) return;
          if ((x.avaliacoes || []).some(function (a) { return a.nota !== "" && a.nota != null; })) return;
          if (mm != null && mm >= 0 && mm <= 10) x.mediaMin = Math.round(mm * 10) / 10;
          if (g2 === "grad") x.avaliacoes = avaliacoesPadrao();
          persist("disciplinas", x);
        });
      }
    };
  }

  function blocoRotina(d) {
    return {
      el: h("div", { class: "stack" },
        h("div", { class: "form-row" },
          pfSelect(d, "horasDia", "Quanto tempo por dia você tem para estudar", HORAS_DIA, "Escolha"),
          pfSelect(d, "ocupacao", "Você trabalha ou faz estágio?", OCUPACAO, "Escolha")),
        pfChecks(d, "horarios", "Melhores horários para estudar", HORARIOS),
        pfChecks(d, "diasLivres", "Dias mais livres na semana", DIAS_SEMANA))
    };
  }

  function blocoObjetivos(d) {
    var g = grupoNivel(d.nivel) || "grad";
    return {
      el: h("div", { class: "stack" },
        pfSelect(d, "meta", "Meta principal", METAS[g], "Escolha"),
        pfTexto(d, "metaTexto", "Quer contar mais sobre o seu objetivo? (opcional)", { maxlength: "200" }),
        pfArea(d, "dificuldades", "Matérias ou assuntos com mais dificuldade (opcional)", { maxlength: "400", placeholder: "Ex.: Direito Civil, interpretação de artigos" }),
        pfChecks(d, "estilos", "Como você prefere estudar", ESTILOS))
    };
  }

  function blocoMonitor(d, opc) {
    var entrevista = opc && opc.entrevista;
    var cb = h("input", { type: "checkbox", id: "pe-consentimento", checked: !!(d.consentimento && d.consentimento.aceito) });
    cb.addEventListener("change", function () { d.consentimento = cb.checked ? { aceito: true, em: Date.now() } : null; });
    var aceite = d.consentimento && d.consentimento.aceito && !entrevista
      ? pfDica("Você autorizou o uso destas informações em " + new Date(d.consentimento.em).toLocaleDateString("pt-BR") + ". Você pode alterar ou apagar qualquer dado nesta tela.")
      : h("label", { class: "check", for: "pe-consentimento", style: "align-items:flex-start" }, cb,
          h("span", { text: "Autorizo o Dominus a guardar estas informações na minha conta para organizar meus estudos e personalizar o monitor com IA. Posso alterar ou apagar esses dados a qualquer momento em Meu perfil (LGPD)." }));
    return {
      el: h("div", { class: "stack" },
        sampleFn ? pfSelect(d, "tom", "Como o monitor deve responder", TONS, null) : null,
        h("div", { class: "form-row" },
          pfSelect(d, "lembreteProva", "Lembrete de provas e entregas", LEMBRETE_PROVA, null),
          pfTexto(d, "lembreteDiario", "Lembrete diário de estudo (opcional)", { type: "time" })),
        pfDica("Os avisos no celular chegam em uma próxima versão do Dominus. Suas escolhas já ficam salvas."),
        aceite),
      validar: function () {
        if (!(d.consentimento && d.consentimento.aceito)) return "Para concluir, marque a autorização de uso das informações.";
        return "";
      }
    };
  }

  /* ---------- contexto para o monitor com IA ---------- */
  function contextoPerfil() {
    var c = state.conta || {}, p = c.perfil || {}, L = [], g = grupoNivel(p.nivel);
    var nome = primeiroNome(); if (nome) L.push("Chame o estudante de " + nome + ".");
    if (p.nivel) L.push("Nível: " + rotuloDe(NIVEIS, p.nivel) + (p.tipoGrad ? " (" + rotuloDe(TIPOS_GRAD, p.tipoGrad) + ")" : "") +
      (p.modalidade ? ", " + rotuloDe(MODALIDADES, p.modalidade) : "") + (c.instituicao ? ", " + c.instituicao : "") + (p.turno ? ", turno " + rotuloDe(TURNOS, p.turno).toLowerCase() : "") + ".");
    if (g === "lato" && (p.modulo || p.frequenciaAulas)) L.push("Pós lato sensu: " + [p.modulo, p.frequenciaAulas ? "aulas " + p.frequenciaAulas : ""].filter(Boolean).join(", ") + ".");
    if (g === "stricto") {
      var pq = [p.orientador ? "orientador(a) " + p.orientador : "", p.linhaPesquisa ? "linha de pesquisa " + p.linhaPesquisa : "", p.temaPesquisa ? "tema " + p.temaPesquisa : ""].filter(Boolean);
      if (pq.length) L.push("Pesquisa: " + pq.join("; ") + ".");
      var mc = [p.creditosFaltam ? p.creditosFaltam + " crédito(s) a cumprir" : "", p.dataQualificacao ? "qualificação em " + dataBR(p.dataQualificacao) : "", p.dataDefesa ? "defesa em " + dataBR(p.dataDefesa) : "", p.prazoBolsa ? "bolsa até " + dataBR(p.prazoBolsa) : "", p.publicacoes ? "metas de publicação: " + p.publicacoes : ""].filter(Boolean);
      if (mc.length) L.push("Marcos: " + mc.join("; ") + ".");
    }
    if (p.avaliacoes || p.mediaMin) L.push("Avaliação: " + [p.avaliacoes, p.mediaMin ? "nota mínima " + p.mediaMin : "", p.calculo ? rotuloDe(CALCULOS, p.calculo).toLowerCase() + (p.calculo === "outra" && p.regraMedia ? " (" + p.regraMedia + ")" : "") : ""].filter(Boolean).join("; ") + ".");
    var rot = [p.horasDia ? rotuloDe(HORAS_DIA, p.horasDia).toLowerCase() + " por dia para estudar" : "", rotulosDe(HORARIOS, p.horarios).length ? "estuda melhor de " + rotulosDe(HORARIOS, p.horarios).join(", ").toLowerCase() : "", p.ocupacao && p.ocupacao !== "nao" ? rotuloDe(OCUPACAO, p.ocupacao).toLowerCase() : "", rotulosDe(DIAS_SEMANA, p.diasLivres).length ? "dias mais livres: " + rotulosDe(DIAS_SEMANA, p.diasLivres).join(", ").toLowerCase() : ""].filter(Boolean);
    if (rot.length) L.push("Rotina: " + rot.join("; ") + ".");
    if (p.meta) L.push("Meta principal: " + rotuloDe(METAS[g || "grad"], p.meta) + (p.metaTexto ? " (" + p.metaTexto + ")" : "") + ".");
    if (p.dificuldades) L.push("Dificuldades relatadas: " + p.dificuldades + ".");
    if (rotulosDe(ESTILOS, p.estilos).length) L.push("Prefere estudar com: " + rotulosDe(ESTILOS, p.estilos).join(", ").toLowerCase() + ". Quando fizer sentido, use esses formatos.");
    if (p.tom === "direto") L.push("Prefere respostas diretas e curtas.");
    if (p.tom === "explicativo") L.push("Prefere explicações detalhadas, com exemplos.");
    return L.length ? "Perfil do estudante (informado por ele):\n- " + L.join("\n- ") : "";
  }

  /* ---------- entrevista inicial ---------- */
  var ETAPAS = [
    ["Seu perfil acadêmico", function (d, o) { return blocoAcademico(d, { comApelido: true, entrevista: o.entrevista }); }],
    ["Disciplinas", blocoDisciplinas],
    ["Avaliações", blocoAvaliacoes],
    ["Rotina de estudo", blocoRotina],
    ["Objetivos", blocoObjetivos],
    ["Monitor e lembretes", blocoMonitor]
  ];
  var ent = null, perfilRasc = null, perfilMsg = null;

  function precisaEntrevista() {
    return !!(window.DOMINUS && state.auth && state.auth.papel === "dono" && state.loaded && state.contaLoaded && state.conta &&
      !(state.conta.entrevista && state.conta.entrevista.concluida));
  }
  function irEtapa(n) {
    var c = state.conta;
    c.entrevista = Object.assign({}, c.entrevista, { etapa: n });
    ent.etapa = n;
    renderAll(true);
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function entrevistaView() {
    if (!ent) ent = { etapa: Math.max(0, Math.min(Number((state.conta.entrevista || {}).etapa) || 0, ETAPAS.length)), d: rascunho(), criadas: [] };
    if (ent.etapa >= ETAPAS.length) return resumoEntrevista();
    var i = ent.etapa, etapa = ETAPAS[i], opc = { entrevista: true, criadas: ent.criadas };
    var bloco = etapa[1](ent.d, opc);
    var erro = h("div", { class: "note bad", role: "alert", hidden: true });
    var w = h("div", { class: "mod ent" });
    w.append(h("p", { class: "kicker", style: "margin:0", text: "Primeiro acesso · etapa " + (i + 1) + " de " + ETAPAS.length }),
      h("div", { class: "ent-barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(ETAPAS.length), "aria-valuenow": String(i + 1), "aria-label": "Andamento da entrevista" },
        h("span", { style: "width:" + Math.round((i + 1) / ETAPAS.length * 100) + "%" })),
      modHead(i === 2 && grupoNivel(ent.d.nivel) === "stricto" ? "Marcos da pós-graduação" : etapa[0], i === 0 ? "Antes de começar, conte um pouco sobre você. Leva uns 3 minutos e deixa o Dominus e o monitor do seu jeito." : null));
    function continuar() {
      erro.hidden = true;
      var e = bloco.validar ? bloco.validar() : "";
      if (e) { erro.textContent = e; erro.hidden = false; return; }
      gravarRascunho(ent.d);
      if (bloco.depois) bloco.depois();
      irEtapa(i + 1);
      persist("config", state.conta);
    }
    var ultima = i === ETAPAS.length - 1;
    w.append(h("section", { class: "panel stack" }, bloco.el, erro,
      h("div", { class: "row between" },
        i > 0 ? h("button", { class: "btn ghost", type: "button", onclick: function () { irEtapa(i - 1); } }, "Voltar") : h("span"),
        h("div", { class: "row" },
          i > 0 && !ultima ? h("button", { class: "btn ghost", type: "button", onclick: function () { irEtapa(i + 1); persist("config", state.conta); } }, "Pular esta etapa") : null,
          h("button", { class: "btn", type: "button", onclick: continuar }, ultima ? "Concluir" : "Continuar")))),
      pfDica(i > 0 ? "Você pode completar ou mudar tudo isso depois em Meu perfil." : ""));
    return w;
  }
  function resumoEntrevista() {
    var c = state.conta, p = perfilDados(), g = grupoNivel(p.nivel);
    var itens = [];
    itens.push([rotuloDe(NIVEIS, p.nivel) || "Curso", [c.curso, c.instituicao, g === "grad" ? c.periodo : p.modulo].filter(Boolean).join(" · ") || "a informar"]);
    itens.push(["Disciplinas", state.disciplinas.length ? state.disciplinas.length + (state.disciplinas.length === 1 ? " cadastrada" : " cadastradas") : "nenhuma ainda"]);
    var prox = agenda(400, 0).slice().sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; })[0];
    if (prox) { var dl = daysLeft(prox.data); itens.push(["Próximo compromisso", prox.titulo + " · " + (dl === 0 ? "hoje" : dl === 1 ? "amanhã" : "em " + dl + " dias")]); }
    if (p.meta) itens.push(["Meta", rotuloDe(METAS[g || "grad"], p.meta)]);
    var w = h("div", { class: "mod ent" });
    w.append(h("p", { class: "kicker", style: "margin:0", text: "Primeiro acesso · tudo pronto" }),
      modHead("Tudo pronto" + (primeiroNome() ? ", " + primeiroNome() : "") + "!", "O Dominus já está organizado com as suas informações."),
      h("section", { class: "panel stack" },
        h("ul", { class: "ent-resumo" }, itens.map(function (x) { return h("li", null, h("small", { text: x[0] }), h("b", { text: x[1] })); })),
        h("div", { class: "row between" },
          h("button", { class: "btn ghost", type: "button", onclick: function () { irEtapa(ETAPAS.length - 1); } }, "Voltar e revisar"),
          h("button", { class: "btn", type: "button", onclick: function () {
            c.entrevista = { etapa: ETAPAS.length, concluida: true, em: Date.now() };
            persist("config", c); ent = null;
            goModulo(state.disciplinas.length ? "painel" : "disciplinas");
          } }, "Começar a usar o Dominus"))));
    return w;
  }

  /* ---------- Meu perfil ---------- */
  function perfilView() {
    var w = h("div", { class: "mod" });
    if (!state.conta) { w.append(modHead("Meu perfil"), h("section", { class: "panel" }, h("p", { class: "muted", style: "margin:0", text: "Carregando seus dados…" }))); return w; }
    if (!perfilRasc) perfilRasc = rascunho();
    var d = perfilRasc, c = state.conta, p = perfilDados();
    var email = (state.auth && state.auth.email) || "";
    w.append(modHead("Meu perfil", "Seus dados e as informações que personalizam o Dominus e o monitor."));
    w.append(h("section", { class: "panel perfil-topo" },
      h("span", { class: "perfil-ava", "aria-hidden": "true", text: iniciais(c.nome || email) }),
      h("div", null, h("b", { text: c.nome || "Sem nome" }), h("small", { text: email }),
        h("small", { text: [rotuloDe(NIVEIS, p.nivel), c.curso, c.instituicao].filter(Boolean).join(" · ") || "Perfil acadêmico a preencher" }))));
    var secoes = [
      ["Dados pessoais", blocoPessoal],
      ["Perfil acadêmico", blocoAcademico],
      ["Avaliações e aprovação", blocoAvaliacoes],
      ["Rotina de estudo", blocoRotina],
      ["Objetivos e jeito de estudar", blocoObjetivos],
      ["Monitor e lembretes", blocoMonitor]
    ];
    secoes.forEach(function (s, idx) {
      var bloco = s[1](d, {});
      var erro = h("div", { class: "note bad", role: "alert", hidden: true });
      var ok = h("p", { class: "muted small", style: "margin:0", role: "status", text: perfilMsg && perfilMsg.i === idx && Date.now() - perfilMsg.t < 5000 ? "Alterações salvas." : "" });
      w.append(h("section", { class: "panel stack" },
        h("h2", { class: "label", style: "margin:0", text: s[0] }), bloco.el, erro,
        h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: function () {
          erro.hidden = true;
          var e = bloco.validar ? bloco.validar() : "";
          if (e) { erro.textContent = e; erro.hidden = false; return; }
          gravarRascunho(d);
          if (bloco.depois) bloco.depois();
          if (state.auth && d.nome) state.auth.nome = String(d.nome).trim();
          perfilRasc = null; perfilMsg = { i: idx, t: Date.now() }; renderAll(true);
        } }, "Salvar"), ok)));
    });
    w.append(h("section", { class: "panel stack" },
      h("h2", { class: "label", style: "margin:0", text: "Disciplinas" }),
      pfDica(state.disciplinas.length ? state.disciplinas.length + (state.disciplinas.length === 1 ? " disciplina cadastrada." : " disciplinas cadastradas.") : "Nenhuma disciplina cadastrada."),
      h("div", { class: "row" }, h("button", { class: "btn ghost", type: "button", onclick: function () { goModulo("disciplinas"); } }, "Ir para Disciplinas e notas"))));
    w.append(h("section", { class: "panel stack" },
      h("h2", { class: "label", style: "margin:0", text: "Conta" }),
      h("div", { class: "row" },
        h("button", { class: "btn ghost", type: "button", onclick: function () {
          c.entrevista = { etapa: 0, concluida: false }; persist("config", c); ent = null; renderAll(true);
          try { window.scrollTo(0, 0); } catch (e) {}
        } }, "Refazer a entrevista inicial"),
        h("button", { class: "btn ghost danger", type: "button", onclick: sair }, "Sair da conta"))));
    return w;
  }

