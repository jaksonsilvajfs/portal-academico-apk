/* Dominus: animação de abertura da logo.
 *
 * Aparece quando o app abre e quando a pessoa volta depois de um período sem usar
 * (com o app parado na tela ou em segundo plano). O D desliza da esquerda, o capelo é
 * arremessado na diagonal e cai sobre o D; depois a própria logo serve de indicador de
 * carregamento até o app estar pronto.
 *
 * API (window.DominusAbertura):
 *   mostrar()          exibe a animação (se ainda não estiver na tela)
 *   concluir()         encerra assim que a entrada terminar de tocar
 *   aoRetomar(fn)      fn() é chamada na volta da inatividade; deve devolver uma Promise
 *                      (o carregamento) ou false para não mostrar a animação
 *   ativa()            true enquanto a animação estiver na tela
 */
(function () {
  "use strict";

  var INATIVIDADE = 5 * 60 * 1000;   /* 5 minutos */
  /* tempos da entrada (ms). Na abertura do app ela dura 5 s; na volta da inatividade, ~2 s */
  var TEMPOS = {
    abertura: { d: [0, 1100], cap: [1300, 1500], pend: [2700, 1200], nome: [3300, 800], slogan: [3700, 800], fim: 5000 },
    retomada: { d: [0, 650], cap: [500, 850], pend: [1300, 800], nome: [1450, 400], slogan: [1600, 400], fim: 1900 }
  };
  var ESPERA_MAX = 6000;             /* na volta da inatividade, não segura a tela mais que isso */
  var SVGNS = "http://www.w3.org/2000/svg";

  /* contorno do "D" da Poppins Bold (unidades da fonte, 1000 por em) */
  var D_PATH = "M693 351Q693 248 647.5 168Q602 88 518.5 44Q435 0 325 0H62V702H325Q436 702 519 658Q602 614 647.5 534.5Q693 455 693 351ZM519 351Q519 448 465 502Q411 556 314 556H233V148H314Q411 148 465 201Q519 254 519 351Z";

  var reduzido = false;
  try { reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var raiz = document.documentElement;
  raiz.classList.add("da-abrindo");

  var tela = null, inicio = 0, tempos = TEMPOS.abertura, concluirPedido = false, saindo = false, anims = [], timers = [];
  var retomarFn = null;

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function montar() {
    var t = document.createElement("div");
    t.id = "dominus-abertura";
    t.setAttribute("role", "status");
    t.setAttribute("aria-label", "Carregando o Dominus");

    var logo = svg("svg", { class: "dab-logo", viewBox: "0 0 200 200", width: "170", height: "170", "aria-hidden": "true" });
    var dg = svg("g", { class: "dab-d" });
    dg.appendChild(svg("path", { d: D_PATH, fill: "#FFFFFF", transform: "translate(54.7 168) scale(0.12 -0.12)" }));

    var cap = svg("g", { class: "dab-cap" });
    cap.appendChild(svg("polygon", { points: "52,58 100,42 148,58 100,74", fill: "#FFC228" }));
    cap.appendChild(svg("rect", { x: "74", y: "62", width: "52", height: "16", rx: "2", fill: "#FFC228" }));
    var pend = svg("g", { class: "dab-pend" });
    pend.appendChild(svg("line", { x1: "138", y1: "60", x2: "138", y2: "90", stroke: "#FFC228", "stroke-width": "3.5", "stroke-linecap": "round" }));
    pend.appendChild(svg("ellipse", { cx: "138", cy: "94", rx: "5.5", ry: "7", fill: "#FFC228" }));
    cap.appendChild(pend);

    logo.appendChild(dg);
    logo.appendChild(cap);

    var nome = document.createElement("p");
    nome.className = "dab-nome";
    nome.textContent = "Dominus";
    var slogan = document.createElement("p");
    slogan.className = "dab-slogan";
    slogan.textContent = "Seu parceiro acadêmico";

    t.appendChild(logo);
    t.appendChild(nome);
    t.appendChild(slogan);
    return { tela: t, logo: logo, dg: dg, cap: cap, pend: pend, nome: nome, slogan: slogan };
  }

  function an(el, quadros, opcoes) {
    if (!el.animate) return null;
    var a = el.animate(quadros, Object.assign({ fill: "both" }, opcoes));
    anims.push(a);
    return a;
  }

  function limpar() {
    anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    anims = [];
    timers.forEach(clearTimeout);
    timers = [];
  }

  function tocarEntrada(p) {
    if (reduzido) {
      an(p.logo, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
      an(p.nome, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 150 });
      an(p.slogan, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 300, delay: 250 });
      timers.push(setTimeout(function () { tocarCarregando(p); }, 600));
      return;
    }
    /* 1. o D desliza da esquerda, passa um pouco e volta */
    an(p.dg, [
      { transform: "translateX(-190px)", opacity: 0 },
      { transform: "translateX(10px)", opacity: 1, offset: 0.75 },
      { transform: "translateX(0)", opacity: 1 }
    ], { duration: tempos.d[1], delay: tempos.d[0], easing: "cubic-bezier(.2,.8,.2,1)" });
    /* 2. o capelo vem girando da diagonal direita e cai sobre o D, com um quique */
    an(p.cap, [
      { transform: "translate(170px,-190px) rotate(-260deg)", opacity: 0 },
      { transform: "translate(110px,-150px) rotate(-170deg)", opacity: 1, offset: 0.2 },
      { transform: "translate(0,-10px) rotate(10deg)", offset: 0.72, easing: "ease-out" },
      { transform: "translate(0,4px) rotate(-4deg)", offset: 0.86 },
      { transform: "translate(0,0) rotate(0)", opacity: 1 }
    ], { duration: tempos.cap[1], delay: tempos.cap[0], easing: "cubic-bezier(.35,0,.6,1)" });
    /* o pingente balança com o impacto */
    an(p.pend, [
      { transform: "rotate(0)" }, { transform: "rotate(28deg)", offset: 0.25 },
      { transform: "rotate(-16deg)", offset: 0.55 }, { transform: "rotate(7deg)", offset: 0.8 },
      { transform: "rotate(0)" }
    ], { duration: tempos.pend[1], delay: tempos.pend[0], easing: "ease-out" });
    an(p.nome, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: tempos.nome[1], delay: tempos.nome[0], easing: "ease-out" });
    an(p.slogan, [{ opacity: 0 }, { opacity: 0.9 }], { duration: tempos.slogan[1], delay: tempos.slogan[0], easing: "ease-out" });
    timers.push(setTimeout(function () { tocarCarregando(p); }, tempos.fim));
  }

  /* 3. carregando: o capelo pula sobre o D e o pingente balança, em repetição */
  function tocarCarregando(p) {
    if (!tela || saindo) return;
    if (reduzido) {
      an(p.cap, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 1600, iterations: Infinity, easing: "ease-in-out", fill: "none" });
      return;
    }
    an(p.cap, [
      { transform: "translateY(0) rotate(0)" },
      { transform: "translateY(-14px) rotate(-6deg)", offset: 0.35, easing: "ease-in" },
      { transform: "translateY(0) rotate(0)", offset: 0.6 },
      { transform: "translateY(2px) rotate(1deg)", offset: 0.7 },
      { transform: "translateY(0) rotate(0)" }
    ], { duration: 1100, iterations: Infinity, easing: "ease-out", fill: "none" });
    an(p.pend, [
      { transform: "rotate(0)" }, { transform: "rotate(22deg)", offset: 0.4 },
      { transform: "rotate(-14deg)", offset: 0.7 }, { transform: "rotate(0)" }
    ], { duration: 1100, iterations: Infinity, easing: "ease-in-out", fill: "none" });
  }

  var partes = null;

  function mostrar(tipo) {
    if (tela) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { mostrar(tipo); }, { once: true });
      return;
    }
    tempos = TEMPOS[tipo] || TEMPOS.abertura;
    limpar();
    partes = montar();
    tela = partes.tela;
    saindo = false;
    concluirPedido = false;
    inicio = Date.now();
    raiz.classList.add("da-abrindo");
    document.body.appendChild(tela);
    tocarEntrada(partes);
  }

  /* 4. pronto: a logo cresce um pouco e some, e o app aparece */
  function sair() {
    if (!tela || saindo) return;
    saindo = true;
    var t = tela, p = partes;
    var fim = function () {
      limpar();
      if (t.parentNode) t.parentNode.removeChild(t);
      if (tela === t) { tela = null; partes = null; }
      saindo = false;
      raiz.classList.remove("da-abrindo");
    };
    if (!t.animate) { fim(); return; }
    an(p.logo, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.08)", opacity: 1, offset: 0.3 }, { transform: "scale(.6)", opacity: 0 }], { duration: 450, easing: "ease-in" });
    an(p.nome, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    an(p.slogan, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 300 });
    raiz.classList.remove("da-abrindo");
    var a = an(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 300, easing: "ease-out" });
    if (a) a.onfinish = fim; else fim();
    setTimeout(fim, 1200);
  }

  function concluir() {
    if (!tela) { raiz.classList.remove("da-abrindo"); return; }
    if (concluirPedido) return;
    concluirPedido = true;
    var falta = (reduzido ? 600 : tempos.fim) - (Date.now() - inicio);
    if (falta > 0) timers.push(setTimeout(sair, falta));
    else sair();
  }

  /* ---------- volta depois de um tempo sem usar ---------- */
  var ultimaAtividade = Date.now();

  function retomar() {
    if (tela) return;
    var carregamento = retomarFn ? retomarFn() : false;
    if (!carregamento) return;
    mostrar("retomada");
    var limite = new Promise(function (r) { setTimeout(r, ESPERA_MAX); });
    Promise.race([Promise.resolve(carregamento), limite]).then(concluir, concluir);
  }

  function atividade(ev) {
    var agora = Date.now();
    if (tela) { ultimaAtividade = agora; return; }
    if (document.visibilityState === "visible" && agora - ultimaAtividade >= INATIVIDADE) {
      ultimaAtividade = agora;
      /* o primeiro toque depois da pausa só "acorda" o app; não aciona botões por baixo */
      if (ev.type === "pointerdown" || ev.type === "touchstart" || ev.type === "keydown") {
        if (ev.cancelable) ev.preventDefault();
        ev.stopPropagation();
      }
      retomar();
      return;
    }
    ultimaAtividade = agora;
  }

  ["pointerdown", "touchstart", "keydown", "wheel"].forEach(function (tipo) {
    window.addEventListener(tipo, atividade, { capture: true, passive: tipo === "wheel" });
  });

  document.addEventListener("visibilitychange", function () {
    var agora = Date.now();
    if (document.visibilityState === "visible") {
      if (agora - ultimaAtividade >= INATIVIDADE) retomar();
      ultimaAtividade = agora;
    } else {
      ultimaAtividade = agora;
    }
  });

  window.DominusAbertura = {
    mostrar: function () { mostrar("retomada"); },
    concluir: concluir,
    aoRetomar: function (fn) { retomarFn = fn; },
    ativa: function () { return !!tela; },
    _config: { INATIVIDADE: INATIVIDADE }
  };

  /* abertura do app */
  mostrar("abertura");
})();
