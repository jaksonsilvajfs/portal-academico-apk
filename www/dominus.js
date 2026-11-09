/*
 * Dominus: login (Supabase Auth) e armazenamento na nuvem (tabela public.docs no Supabase).
 *
 * O app do portal foi escrito para a API de dados das páginas do Claude
 * (claude.use("db"), claude.use("user")). Este arquivo oferece a mesma API em cima do
 * Supabase, para que o código do portal funcione sem mudanças:
 *   - collection(caminho).doc(id).set / get / delete / onSnapshot
 *   - collection(caminho).get / onSnapshot
 * Os dados ficam numa cópia local (para abrir sem internet) e as alterações feitas
 * sem conexão ficam numa fila, enviada quando a conexão volta.
 */
(function () {
  "use strict";

  var CONFIG = {
    url: "https://ucngbmpjdfurlwnrfmio.supabase.co",
    chave: "sb_publishable_6O4PGLJJ_KoNu2_rw7UH_A_GjzNQepN"
  };
  var K_SESSAO = "dominus-sessao";
  var K_LOCAL_V01 = "pga-local-v1";

  /* ---------------- utilidades ---------------- */
  function lerLS(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function gravarLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function apagarLS(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function copia(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") e.textContent = v;
      else if (k === "class") e.className = v;
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
      else if (k === "value" || k === "hidden" || k === "disabled") e[k] = v;
      else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    }
    return e;
  }

  /* ---------------- Supabase Auth (REST) ---------------- */
  var sessao = lerLS(K_SESSAO);

  function erroDe(res, corpo) {
    var e = new Error((corpo && (corpo.msg || corpo.message || corpo.error_description || corpo.error)) || ("HTTP " + res.status));
    e.status = res.status;
    e.code = (corpo && (corpo.error_code || corpo.code || corpo.error)) || "";
    return e;
  }
  function pedidoAuth(caminho, corpo, metodo, token) {
    var h = { "apikey": CONFIG.chave, "Content-Type": "application/json" };
    if (token) h.Authorization = "Bearer " + token;
    return fetch(CONFIG.url + "/auth/v1/" + caminho, { method: metodo || "POST", headers: h, body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (res) {
        return res.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
          if (!res.ok) throw erroDe(res, j);
          return j;
        });
      });
  }
  function guardarSessao(j) {
    if (!j || !j.access_token) return null;
    sessao = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000,
      user: j.user || (sessao && sessao.user) || null
    };
    gravarLS(K_SESSAO, sessao);
    return sessao;
  }
  var renovando = null;
  function renovar() {
    if (!sessao || !sessao.refresh_token) return Promise.reject(new Error("sem-sessao"));
    if (renovando) return renovando;
    renovando = pedidoAuth("token?grant_type=refresh_token", { refresh_token: sessao.refresh_token })
      .then(guardarSessao)
      .catch(function (e) {
        if (e.status === 400 || e.status === 401 || e.status === 403) { sessaoExpirada(); }
        throw e;
      })
      .then(function (s) { renovando = null; return s; }, function (e) { renovando = null; throw e; });
    return renovando;
  }
  function tokenValido() {
    if (!sessao) return Promise.reject(new Error("sem-sessao"));
    if (sessao.expires_at - Date.now() > 60000) return Promise.resolve(sessao.access_token);
    return renovar().then(function (s) { return s.access_token; });
  }

  var Auth = {
    entrar: function (email, senha) {
      return pedidoAuth("token?grant_type=password", { email: email, password: senha }).then(guardarSessao);
    },
    cadastrar: function (email, senha, perfil) {
      return pedidoAuth("signup", { email: email, password: senha, data: perfil }).then(function (j) {
        if (j && j.access_token) { guardarSessao(j); return { sessao: true }; }
        return { sessao: false };
      });
    },
    confirmarCodigo: function (email, codigo, tipo) {
      return pedidoAuth("verify", { type: tipo, email: email, token: codigo }).then(guardarSessao);
    },
    reenviarConfirmacao: function (email) { return pedidoAuth("resend", { type: "signup", email: email }); },
    pedirCodigoSenha: function (email) { return pedidoAuth("recover", { email: email }); },
    novaSenha: function (senha) {
      return tokenValido().then(function (t) { return pedidoAuth("user", { password: senha }, "PUT", t); });
    },
    sair: function () {
      var t = sessao && sessao.access_token;
      if (t) pedidoAuth("logout", null, "POST", t).catch(function () {});
    }
  };

  function msgAuth(e) {
    var c = String((e && e.code) || ""), m = String((e && e.message) || "").toLowerCase();
    if (e && e.message === "Failed to fetch" || e instanceof TypeError) return "Sem conexão com a internet. Confira a rede e tente de novo.";
    if (c === "invalid_credentials" || m.indexOf("invalid login") >= 0) return "E-mail ou senha incorretos.";
    if (c === "email_not_confirmed" || m.indexOf("not confirmed") >= 0) return "Seu e-mail ainda não foi confirmado.";
    if (c === "user_already_exists" || c === "email_exists" || m.indexOf("already registered") >= 0) return "Já existe uma conta com este e-mail. Entre com ela ou recupere a senha.";
    if (c === "weak_password" || m.indexOf("password should") >= 0) return "Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.";
    if (c === "otp_expired" || m.indexOf("expired") >= 0 || m.indexOf("invalid") >= 0 && m.indexOf("token") >= 0) return "Código inválido ou vencido. Peça um novo código.";
    if (c === "over_email_send_rate_limit" || e.status === 429) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    if (c === "signup_disabled") return "Novos cadastros estão desativados no momento.";
    if (c === "same_password") return "A nova senha precisa ser diferente da anterior.";
    return "Não foi possível concluir. " + (e && e.message ? "(" + e.message + ")" : "Tente de novo.");
  }

  /* ---------------- dados (PostgREST) ---------------- */
  function rest(caminho, opcoes, tentou) {
    return tokenValido().then(function (t) {
      var h = Object.assign({ "apikey": CONFIG.chave, "Authorization": "Bearer " + t, "Content-Type": "application/json" }, (opcoes && opcoes.headers) || {});
      return fetch(CONFIG.url + "/rest/v1/" + caminho, Object.assign({}, opcoes, { headers: h }));
    }).then(function (res) {
      if (res.status === 401 && !tentou) return renovar().then(function () { return rest(caminho, opcoes, true); });
      return res.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!res.ok) throw erroDe(res, j);
        return j;
      });
    });
  }

  function colDe(caminho) {
    var m = /^data\/users\/[^/]+\/portal\/(.+)$/.exec(caminho);
    return m ? m[1] : "x:" + caminho;
  }

  var Store = {
    uid: null, docs: {}, fila: [], subsCol: {}, subsDoc: {}, enviando: false, online: true,

    chaveCache: function () { return "dominus-cache-" + this.uid; },
    chaveFila: function () { return "dominus-fila-" + this.uid; },
    salvarLocal: function () { gravarLS(this.chaveCache(), this.docs); gravarLS(this.chaveFila(), this.fila); },

    iniciar: function (uid) {
      this.uid = uid;
      this.docs = lerLS(this.chaveCache()) || {};
      this.fila = lerLS(this.chaveFila()) || [];
      var self = this;
      return this.baixarTudo().then(function () { self.online = true; }, function () { self.online = false; })
        .then(function () { return self.importarV01(); })
        .then(function () { self.garantirMigracao(); self.enviarFila(); });
    },

    baixarTudo: function () {
      var self = this, todos = [], passo = 1000;
      function pagina(de) {
        return rest("docs?select=col,id,data&order=col.asc,id.asc&offset=" + de + "&limit=" + passo, { method: "GET" }).then(function (lista) {
          todos = todos.concat(lista || []);
          if (lista && lista.length === passo) return pagina(de + passo);
        });
      }
      return pagina(0).then(function () {
        var novos = {};
        todos.forEach(function (r) { (novos[r.col] = novos[r.col] || {})[r.id] = r.data || {}; });
        /* alterações ainda não enviadas continuam valendo por cima do que veio do servidor */
        self.fila.forEach(function (op) {
          if (op.tipo === "set") (novos[op.col] = novos[op.col] || {})[op.id] = op.data;
          else if (novos[op.col]) delete novos[op.col][op.id];
        });
        self.docs = novos;
        self.salvarLocal();
        self.avisarTudo();
      });
    },

    garantirMigracao: function () {
      /* o portal procura dados antigos das páginas do Claude; no app isso não se aplica */
      if (!this.docs.config || !this.docs.config.migracao) this.gravar("config", "migracao", { feito: true, em: Date.now(), origem: "dominus" });
    },

    importarV01: function () {
      var local = lerLS(K_LOCAL_V01);
      if (!local) return;
      var principais = ["temas", "trabalhos", "materiais", "disciplinas", "aulas", "eventos"];
      var vazio = principais.every(function (c) { return !this.docs[c] || !Object.keys(this.docs[c]).length; }, this);
      if (vazio) {
        var self = this;
        principais.forEach(function (c) {
          (local[c] || []).forEach(function (item) {
            if (!item || !item.id) return;
            var d = copia(item); delete d.id;
            self.gravar(c, item.id, d);
          });
        });
        if (local.geral && Array.isArray(local.geral.chat) && local.geral.chat.length) self.gravar("conversas", "geral", { chat: local.geral.chat });
      }
      gravarLS(K_LOCAL_V01 + "-importado", local);
      apagarLS(K_LOCAL_V01);
    },

    gravar: function (col, id, data) {
      (this.docs[col] = this.docs[col] || {})[id] = copia(data);
      this.fila = this.fila.filter(function (op) { return !(op.col === col && op.id === id); });
      this.fila.push({ tipo: "set", col: col, id: id, data: copia(data), em: Date.now() });
      this.salvarLocal();
      this.avisar(col, id);
      return this.enviarFila();
    },
    apagar: function (col, id) {
      if (this.docs[col]) delete this.docs[col][id];
      this.fila = this.fila.filter(function (op) { return !(op.col === col && op.id === id); });
      this.fila.push({ tipo: "del", col: col, id: id, em: Date.now() });
      this.salvarLocal();
      this.avisar(col, id);
      return this.enviarFila();
    },

    enviarFila: function () {
      var self = this;
      if (this.enviando) return this.enviando;
      if (!this.fila.length) { atualizarStatus(); return Promise.resolve(); }
      function proxima() {
        var op = self.fila[0];
        if (!op) return Promise.resolve();
        var p = op.tipo === "set"
          ? rest("docs?on_conflict=owner,col,id", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify([{ owner: self.uid, col: op.col, id: op.id, data: op.data, updated_at: new Date().toISOString() }]) })
          : rest("docs?owner=eq." + encodeURIComponent(self.uid) + "&col=eq." + encodeURIComponent(op.col) + "&id=eq." + encodeURIComponent(op.id), { method: "DELETE" });
        return p.then(function () {
          if (self.fila[0] === op) self.fila.shift();
          self.salvarLocal();
          self.online = true;
          return proxima();
        });
      }
      this.enviando = proxima().then(function () { self.enviando = null; atualizarStatus(); }, function (e) {
        self.enviando = null;
        var semRede = !e.status || e instanceof TypeError;
        self.online = !semRede;
        if (!semRede && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429) {
          /* o servidor recusou esta alteração: descarta para não travar a fila */
          var op = self.fila.shift(); self.salvarLocal();
          console.warn("Dominus: alteração recusada pelo servidor", op && op.col, op && op.id, e.message);
          atualizarStatus();
          throw e;
        }
        atualizarStatus();
      });
      return this.enviando;
    },

    /* ---- avisos para quem está ouvindo ---- */
    snapDoc: function (col, id) {
      var d = this.docs[col] && this.docs[col][id];
      return { id: id, exists: d != null, data: function () { return d == null ? undefined : copia(d); } };
    },
    snapCol: function (col) {
      var self = this, m = this.docs[col] || {};
      return { docs: Object.keys(m).map(function (id) { return self.snapDoc(col, id); }), metadata: { fromCache: false }, empty: !Object.keys(m).length, size: Object.keys(m).length };
    },
    avisar: function (col, id) {
      var self = this;
      setTimeout(function () {
        (self.subsCol[col] || []).slice().forEach(function (f) { try { f(self.snapCol(col)); } catch (e) { console.error(e); } });
        (self.subsDoc[col + "/" + id] || []).slice().forEach(function (f) { try { f(self.snapDoc(col, id)); } catch (e) { console.error(e); } });
      }, 0);
    },
    avisarTudo: function () {
      var self = this;
      setTimeout(function () {
        Object.keys(self.subsCol).forEach(function (col) { (self.subsCol[col] || []).slice().forEach(function (f) { try { f(self.snapCol(col)); } catch (e) { console.error(e); } }); });
        Object.keys(self.subsDoc).forEach(function (k) {
          var i = k.indexOf("/"), col = k.slice(0, i), id = k.slice(i + 1);
          (self.subsDoc[k] || []).slice().forEach(function (f) { try { f(self.snapDoc(col, id)); } catch (e) { console.error(e); } });
        });
      }, 0);
    }
  };

  /* API no formato das páginas do Claude */
  function colecao(caminho) {
    var col = colDe(caminho);
    return {
      doc: function (id) {
        return {
          id: id,
          set: function (data) { return Store.gravar(col, id, data); },
          delete: function () { return Store.apagar(col, id); },
          get: function () { return Promise.resolve(Store.snapDoc(col, id)); },
          onSnapshot: function (ok) {
            var k = col + "/" + id; (Store.subsDoc[k] = Store.subsDoc[k] || []).push(ok);
            setTimeout(function () { ok(Store.snapDoc(col, id)); }, 0);
            return function () { Store.subsDoc[k] = (Store.subsDoc[k] || []).filter(function (f) { return f !== ok; }); };
          }
        };
      },
      get: function () { return Promise.resolve(Store.snapCol(col)); },
      onSnapshot: function (ok) {
        (Store.subsCol[col] = Store.subsCol[col] || []).push(ok);
        setTimeout(function () { ok(Store.snapCol(col)); }, 0);
        return function () { Store.subsCol[col] = (Store.subsCol[col] || []).filter(function (f) { return f !== ok; }); };
      }
    };
  }
  var dbAPI = Object.freeze({ collection: colecao, doc: function (p) { var i = p.lastIndexOf("/"); return colecao(p.slice(0, i)).doc(p.slice(i + 1)); } });

  /* ---------------- ponte com o portal ---------------- */
  var prontoResolve, pronto = new Promise(function (r) { prontoResolve = r; });
  var userAPI = null;

  window.claude = {
    use: function (nome) {
      if (nome === "db") return pronto.then(function () { return dbAPI; });
      if (nome === "user") return pronto.then(function () { return userAPI; });
      return Promise.resolve(null);
    }
  };

  window.DOMINUS = {
    usuario: function () {
      var u = (sessao && sessao.user) || {}, m = u.user_metadata || {};
      return { id: u.id, email: (u.email || "").toLowerCase(), nome: m.nome || "", curso: m.curso || "", periodo: m.periodo || "", instituicao: m.instituicao || "" };
    },
    sair: function () {
      Auth.sair();
      if (Store.uid) { apagarLS("dominus-cache-" + Store.uid); if (!Store.fila.length) apagarLS("dominus-fila-" + Store.uid); }
      apagarLS(K_SESSAO);
      sessao = null;
      location.hash = "";
      location.reload();
    },
    textoStatus: function () {
      if (Store.fila.length && !Store.online) return "Sem internet: " + Store.fila.length + (Store.fila.length === 1 ? " alteração aguardando envio" : " alterações aguardando envio");
      if (Store.fila.length) return "Enviando para a nuvem…";
      return "Tudo salvo na nuvem";
    },
    sincronizar: function () { return Store.enviarFila().then(function () { return Store.baixarTudo(); }); }
  };

  function atualizarStatus() {
    var s = document.getElementById("status");
    if (!s || /bad/.test(s.className) || /Carregando/.test(s.textContent)) return;
    s.textContent = window.DOMINUS.textoStatus();
    s.className = "status" + (Store.fila.length ? " warn" : "");
  }

  function sessaoExpirada() {
    apagarLS(K_SESSAO);
    sessao = null;
    if (Store.uid) { location.reload(); }
  }

  function liberar() {
    var u = sessao.user;
    userAPI = Object.freeze({
      isOwner: function () { return Promise.resolve(true); },
      canEdit: function () { return Promise.resolve(true); },
      id: function () { return Promise.resolve(u.id); },
      me: function () { return Promise.resolve({ id: u.id, name: (u.user_metadata && u.user_metadata.nome) || "", email: u.email || "" }); }
    });
    var tela = document.getElementById("dominus-auth");
    return Store.iniciar(u.id).then(function () {
      if (tela) tela.remove();
      document.documentElement.classList.remove("dominus-bloqueado");
      prontoResolve();
    });
  }

  /* sincroniza ao voltar para o app e quando a internet volta */
  window.addEventListener("online", function () { if (Store.uid) Store.enviarFila(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Store.uid) window.DOMINUS.sincronizar().catch(function () {});
  });
  setInterval(function () { if (Store.uid && Store.fila.length) Store.enviarFila(); }, 30000);

  /* ---------------- tela de entrada ---------------- */
  var CURSOS = ["Administração", "Arquitetura e Urbanismo", "Biomedicina", "Ciência da Computação", "Ciências Contábeis", "Direito", "Educação Física", "Enfermagem", "Engenharia Civil", "Engenharia de Produção", "Farmácia", "Fisioterapia", "Medicina", "Medicina Veterinária", "Nutrição", "Odontologia", "Pedagogia", "Psicologia"];
  var modo = "entrar", emailPendente = "", aviso = "";

  function campo(id, rotulo, tipo, extra) {
    var inp = el("input", Object.assign({ id: id, type: tipo, class: "da-in" }, extra || {}));
    return { inp: inp, el: el("label", { class: "da-campo", for: id }, el("span", { text: rotulo }), inp) };
  }

  function montarTela() {
    var tela = document.getElementById("dominus-auth");
    if (!tela) {
      tela = el("div", { id: "dominus-auth", role: "dialog", "aria-modal": "true", "aria-labelledby": "da-titulo" });
      document.body.appendChild(tela);
    }
    tela.textContent = "";
    var marca = el("div", { class: "da-marca" },
      el("img", { src: "icone.png", alt: "", class: "da-ico", width: "64", height: "64" }),
      el("h1", { id: "da-titulo", text: "Dominus" }),
      el("p", { class: "da-slogan", text: "Seu desenvolvedor acadêmico" }));
    var card = el("section", { class: "da-card" });
    var erro = el("div", { class: "da-erro", role: "alert", hidden: true });
    function falha(e) { erro.textContent = typeof e === "string" ? e : msgAuth(e); erro.hidden = false; }
    function ocupado(bt, sim, txt) { bt.disabled = sim; bt.textContent = txt; }
    if (aviso) card.append(el("div", { class: "da-ok", role: "status", text: aviso }));

    if (modo === "entrar") {
      var e = campo("da-email", "E-mail", "email", { autocomplete: "username", value: emailPendente });
      var s = campo("da-senha", "Senha", "password", { autocomplete: "current-password" });
      var go = el("button", { class: "da-btn", type: "submit", text: "Entrar" });
      var f = el("form", { class: "da-form" }, e.el, s.el, erro, go);
      f.addEventListener("submit", function (ev) {
        ev.preventDefault(); erro.hidden = true;
        var email = e.inp.value.trim().toLowerCase();
        if (!email || !s.inp.value) return falha("Informe o e-mail e a senha.");
        ocupado(go, true, "Entrando…");
        Auth.entrar(email, s.inp.value).then(function () { aviso = ""; return liberar(); }).catch(function (x) {
          ocupado(go, false, "Entrar");
          if (String(x.code) === "email_not_confirmed") { emailPendente = email; modo = "confirmar"; aviso = ""; montarTela(); return; }
          falha(x);
        });
      });
      card.append(el("h2", { text: "Entrar" }), f,
        el("div", { class: "da-links" },
          el("button", { class: "da-link", type: "button", text: "Criar conta", onclick: function () { modo = "cadastrar"; aviso = ""; montarTela(); } }),
          el("button", { class: "da-link", type: "button", text: "Esqueci minha senha", onclick: function () { emailPendente = e.inp.value.trim(); modo = "recuperar"; aviso = ""; montarTela(); } })));
    }

    if (modo === "cadastrar") {
      var n = campo("da-nome", "Seu nome", "text", { autocomplete: "name", maxlength: "80" });
      var cu = campo("da-curso", "Curso", "text", { maxlength: "80", list: "da-cursos", placeholder: "Ex.: Direito, Medicina" });
      var lista = el("datalist", { id: "da-cursos" }, CURSOS.map(function (c) { return el("option", { value: c }); }));
      var pe = el("select", { id: "da-periodo", class: "da-in" }, [el("option", { value: "", text: "Prefiro não informar" })].concat(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (k) { return el("option", { value: k + "º período", text: k + "º período" }); })));
      var ins = campo("da-inst", "Instituição (opcional)", "text", { maxlength: "80", placeholder: "Ex.: UNIP" });
      var e2 = campo("da-email2", "E-mail", "email", { autocomplete: "username" });
      var s1 = campo("da-senha1", "Senha (mínimo de 6 caracteres)", "password", { autocomplete: "new-password" });
      var s2 = campo("da-senha2", "Repita a senha", "password", { autocomplete: "new-password" });
      var go2 = el("button", { class: "da-btn", type: "submit", text: "Criar conta" });
      var f2 = el("form", { class: "da-form" }, n.el, cu.el, lista, el("label", { class: "da-campo", for: "da-periodo" }, el("span", { text: "Período atual" }), pe), ins.el, e2.el, s1.el, s2.el, erro, go2);
      f2.addEventListener("submit", function (ev) {
        ev.preventDefault(); erro.hidden = true;
        var email = e2.inp.value.trim().toLowerCase();
        if (!n.inp.value.trim()) return falha("Informe seu nome.");
        if (!cu.inp.value.trim()) return falha("Informe o curso que você faz.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falha("Informe um e-mail válido.");
        if (s1.inp.value.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
        if (s1.inp.value !== s2.inp.value) return falha("As senhas não são iguais.");
        ocupado(go2, true, "Criando…");
        Auth.cadastrar(email, s1.inp.value, { nome: n.inp.value.trim(), curso: cu.inp.value.trim(), periodo: pe.value, instituicao: ins.inp.value.trim() })
          .then(function (r) {
            if (r.sessao) return liberar();
            emailPendente = email; modo = "confirmar"; aviso = ""; montarTela();
          })
          .catch(function (x) { ocupado(go2, false, "Criar conta"); falha(x); });
      });
      card.append(el("h2", { text: "Criar conta" }), f2,
        el("div", { class: "da-links" }, el("button", { class: "da-link", type: "button", text: "Já tenho conta", onclick: function () { modo = "entrar"; aviso = ""; montarTela(); } })));
    }

    if (modo === "confirmar") {
      var c = campo("da-codigo", "Código recebido por e-mail", "text", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "10" });
      var go3 = el("button", { class: "da-btn", type: "submit", text: "Confirmar" });
      var f3 = el("form", { class: "da-form" }, c.el, erro, go3);
      f3.addEventListener("submit", function (ev) {
        ev.preventDefault(); erro.hidden = true;
        var cod = c.inp.value.replace(/\D/g, "");
        if (cod.length < 6) return falha("Digite o código de 6 dígitos ou mais que chegou no e-mail.");
        ocupado(go3, true, "Confirmando…");
        Auth.confirmarCodigo(emailPendente, cod, "signup").then(function () { aviso = ""; return liberar(); })
          .catch(function (x) { ocupado(go3, false, "Confirmar"); falha(x); });
      });
      card.append(el("h2", { text: "Confirme seu e-mail" }),
        el("p", { class: "da-txt", text: "Enviamos uma mensagem para " + emailPendente + ". Se ela trouxer um código, digite abaixo. Se trouxer só um link, toque nele e depois volte aqui para entrar." }),
        f3,
        el("div", { class: "da-links" },
          el("button", { class: "da-link", type: "button", text: "Reenviar e-mail", onclick: function (ev) {
            var b = ev.currentTarget; b.disabled = true;
            Auth.reenviarConfirmacao(emailPendente).then(function () { aviso = "E-mail reenviado para " + emailPendente + "."; montarTela(); }).catch(function (x) { b.disabled = false; falha(x); });
          } }),
          el("button", { class: "da-link", type: "button", text: "Já confirmei, quero entrar", onclick: function () { modo = "entrar"; aviso = ""; montarTela(); } })));
    }

    if (modo === "recuperar") {
      var e4 = campo("da-email4", "E-mail da sua conta", "email", { autocomplete: "username", value: emailPendente });
      var go4 = el("button", { class: "da-btn", type: "submit", text: "Enviar código" });
      var f4 = el("form", { class: "da-form" }, e4.el, erro, go4);
      f4.addEventListener("submit", function (ev) {
        ev.preventDefault(); erro.hidden = true;
        var email = e4.inp.value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falha("Informe um e-mail válido.");
        ocupado(go4, true, "Enviando…");
        Auth.pedirCodigoSenha(email).then(function () { emailPendente = email; modo = "redefinir"; aviso = "Se existir uma conta com " + email + ", um código foi enviado para esse e-mail."; montarTela(); })
          .catch(function (x) { ocupado(go4, false, "Enviar código"); falha(x); });
      });
      card.append(el("h2", { text: "Recuperar senha" }),
        el("p", { class: "da-txt", text: "Vamos enviar um código para o seu e-mail. Com ele, você cria uma senha nova aqui mesmo." }), f4,
        el("div", { class: "da-links" }, el("button", { class: "da-link", type: "button", text: "Voltar para entrar", onclick: function () { modo = "entrar"; aviso = ""; montarTela(); } })));
    }

    if (modo === "redefinir") {
      var c5 = campo("da-codigo5", "Código recebido por e-mail", "text", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "10" });
      var s5 = campo("da-senha5", "Nova senha (mínimo de 6 caracteres)", "password", { autocomplete: "new-password" });
      var s6 = campo("da-senha6", "Repita a nova senha", "password", { autocomplete: "new-password" });
      var go5 = el("button", { class: "da-btn", type: "submit", text: "Salvar nova senha" });
      var f5 = el("form", { class: "da-form" }, c5.el, s5.el, s6.el, erro, go5);
      f5.addEventListener("submit", function (ev) {
        ev.preventDefault(); erro.hidden = true;
        var cod = c5.inp.value.replace(/\D/g, "");
        if (cod.length < 6) return falha("Digite o código que chegou no e-mail.");
        if (s5.inp.value.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
        if (s5.inp.value !== s6.inp.value) return falha("As senhas não são iguais.");
        ocupado(go5, true, "Salvando…");
        Auth.confirmarCodigo(emailPendente, cod, "recovery").then(function () { return Auth.novaSenha(s5.inp.value); })
          .then(function () { aviso = ""; return liberar(); })
          .catch(function (x) { ocupado(go5, false, "Salvar nova senha"); falha(x); });
      });
      card.append(el("h2", { text: "Criar nova senha" }), f5,
        el("div", { class: "da-links" },
          el("button", { class: "da-link", type: "button", text: "Pedir outro código", onclick: function () { modo = "recuperar"; aviso = ""; montarTela(); } }),
          el("button", { class: "da-link", type: "button", text: "Voltar para entrar", onclick: function () { modo = "entrar"; aviso = ""; montarTela(); } })));
    }

    tela.append(el("div", { class: "da-caixa" }, marca, card));
    var primeiro = tela.querySelector("input");
    if (primeiro && !primeiro.value) { try { primeiro.focus({ preventScroll: true }); } catch (e) {} }
  }

  function iniciar() {
    document.documentElement.classList.add("dominus-bloqueado");
    if (sessao && sessao.user) {
      /* já entrou antes: abre com a cópia local e renova o acesso em segundo plano */
      liberar().catch(function () {
        montarTela();
      });
      return;
    }
    montarTela();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  /* exposto para testes */
  window.__dominusInterno = { Store: Store, Auth: Auth, colDe: colDe };
})();
