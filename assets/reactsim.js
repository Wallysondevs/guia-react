/* reactsim.js — a caixa "Experimente" do Guia React.
 *
 * Não simula: o código do leitor é transformado pelo Babel (preset-react) e executado com o React
 * 19 de verdade (assets/react.js, empacotado do pacote oficial) dentro de um iframe. O painel mostra
 * o HTML que o React gerou para o elemento #raiz, mais o que o código escreveu no console.
 */
(function () {
  "use strict";

  var MOTOR = "assets/react.js";
  var BABEL = "assets/babel.js";
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    if (!s) return "";
    return s.replace(/assets\/reactsim\.js.*$/, "");
  })();

  var VAZIAS = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };

  function normalizar(t) {
    return String(t == null ? "" : t).replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{2,}/g, "\n").trim();
  }
  function escapar(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------------------------------------------------------- as libs */

  var babelPedido = null;
  function carregarBabel() {
    if (window.Babel) return Promise.resolve(window.Babel);
    if (babelPedido) return babelPedido;
    babelPedido = new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = BASE + BABEL;
      s.onload = function () { ok(window.Babel); };
      s.onerror = function () { falha(new Error("o Babel não carregou (" + s.src + ")")); };
      document.head.appendChild(s);
    });
    return babelPedido;
  }

  /* transforma JSX em JavaScript: o mesmo trabalho do Vite/Babel no projeto do leitor */
  function compilar(jsx) {
    var semImports = jsx
      .replace(/^\s*import\s+[^;\n]*;?\s*$/gm, "")
      .replace(/^\s*export\s+default\s+/gm, "");
    var r = window.Babel.transform(semImports, {
      presets: [["react", { runtime: "classic" }]],
      filename: "App.jsx",
      sourceType: "script",
      compact: false
    });
    return r.code;
  }

  /* ------------------------------------------------------------- o iframe */

  function pagina(codigo, modo) {
    var auto = modo === "manual" ? "false" : "true";
    return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<script src=\"" + BASE + MOTOR + "\"><\/script>" +
      "<style>html,body{margin:0}body{padding:12px;font:16px/1.5 system-ui,sans-serif;color:#111}" +
      "body>*{max-width:100%}</style></head><body><div id=\"raiz\"></div><script>\n" +
      "window.__erro = null; window.__logs = []; window.__errosConsole = []; window.__renderizou = false;\n" +
      "var __log = console.log, __err = console.error;\n" +
      "console.log = function () { window.__logs.push(Array.prototype.map.call(arguments, function (a) { try { return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); } catch (e) { return String(a); } }).join(' ')); __log.apply(console, arguments); };\n" +
      "console.error = function () { window.__errosConsole.push(Array.prototype.map.call(arguments, function (a) { return String(a); }).join(' ')); __err.apply(console, arguments); };\n" +
      "var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useReducer = React.useReducer,\n" +
      "    useContext = React.useContext, useMemo = React.useMemo, useCallback = React.useCallback, useId = React.useId,\n" +
      "    useLayoutEffect = React.useLayoutEffect, useTransition = React.useTransition, useDeferredValue = React.useDeferredValue,\n" +
      "    createContext = React.createContext, Fragment = React.Fragment, memo = React.memo;\n" +
      "var raiz = document.getElementById('raiz');\n" +
      "try {\n" + codigo + "\n} catch (e) { window.__erro = e && e.message ? e.message : String(e); }\n" +
      "if (" + auto + " && !window.__erro && !window.__renderizou && typeof App === 'function') {\n" +
      "  try { ReactDOM.flushSync(function () { ReactDOM.createRoot(raiz).render(React.createElement(App)); }); }\n" +
      "  catch (e) { window.__erro = e && e.message ? e.message : String(e); }\n" +
      "}\n" +
      "<\/script></body></html>";
  }

  /* HTML do #raiz em formato de leitura (uma tag por linha; texto inline na mesma linha) */
  var INLINE = { a: 1, abbr: 1, b: 1, br: 1, cite: 1, code: 1, em: 1, i: 1, kbd: 1, mark: 1, q: 1, s: 1, small: 1, span: 1, strong: 1, sub: 1, sup: 1, time: 1, u: 1 };

  function atributosDe(no) {
    var atrs = "";
    Array.prototype.forEach.call(no.attributes, function (a) { atrs += " " + a.name + '="' + escapar(a.value) + '"'; });
    return atrs;
  }

  /* um pedaço que cabe na mesma linha (texto + tags inline) */
  function inlineDe(no) {
    if (no.nodeType === 3) return escapar(normalizar(no.nodeValue));
    if (no.nodeType !== 1) return "";
    var tag = no.tagName.toLowerCase();
    var dentro = Array.prototype.map.call(no.childNodes, inlineDe).join(" ");
    if (VAZIAS[tag]) return "<" + tag + atributosDe(no) + ">";
    return "<" + tag + atributosDe(no) + ">" + normalizar(dentro) + "</" + tag + ">";
  }

  function formatar(el, nivel) {
    var recuo = new Array((nivel || 0) + 1).join("  ");
    var saida = [];
    Array.prototype.forEach.call(el.childNodes, function (no) {
      if (no.nodeType === 3) {
        var t = normalizar(no.nodeValue);
        if (t) saida.push(recuo + escapar(t));
        return;
      }
      if (no.nodeType !== 1) return;
      var tag = no.tagName.toLowerCase();
      if (INLINE[tag]) {
        var linha = normalizar(inlineDe(no));
        if (linha) saida.push(recuo + linha);
        return;
      }
      var atrs = atributosDe(no);
      if (VAZIAS[tag]) { saida.push(recuo + "<" + tag + atrs + ">"); return; }
      var filhos = Array.prototype.filter.call(no.childNodes, function (c) {
        return c.nodeType === 1 || (c.nodeType === 3 && normalizar(c.nodeValue));
      });
      var soInline = filhos.length && filhos.every(function (c) { return c.nodeType === 3 || INLINE[c.tagName.toLowerCase()]; });
      if (soInline) {
        saida.push(recuo + "<" + tag + atrs + ">" + normalizar(filhos.map(inlineDe).join(" ")) + "</" + tag + ">");
        return;
      }
      var dentro = formatar(no, (nivel || 0) + 1);
      if (!dentro) { saida.push(recuo + "<" + tag + atrs + "></" + tag + ">"); return; }
      saida.push(recuo + "<" + tag + atrs + ">");
      saida.push(dentro);
      saida.push(recuo + "</" + tag + ">");
    });
    return saida.join("\n");
  }

  function saidaDe(r) {
    if (r.erro) return "Erro: " + r.erro;
    var linhas = [];
    if (r.html) linhas.push(r.html);
    else linhas.push("(o React não desenhou nada: o componente devolveu null?)");
    (r.logs || []).forEach(function (l) { linhas.push("console: " + l); });
    return linhas.join("\n");
  }

  /* ------------------------------------------------------------ rodar/avaliar */

  function rodarNoIframe(container, jsx, modo, espera) {
    return carregarBabel().then(function () {
      var codigo;
      try {
        codigo = compilar(jsx);
      } catch (e) {
        return { erro: "não compilou: " + (e && e.message ? e.message : String(e)), html: "", texto: "", logs: [], doc: null };
      }
      return new Promise(function (ok) {
        var velho = container.querySelector("iframe");
        if (velho) velho.remove();
        var iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Prévia do componente");
        iframe.style.width = "100%";
        iframe.style.border = "0";
        iframe.style.display = "block";
        iframe.style.background = "#fff";
        iframe.srcdoc = pagina(codigo, modo);
        iframe.addEventListener("load", function () {
          var win = iframe.contentWindow;
          var doc = iframe.contentDocument;
          var tentativas = 0;
          (function esperar() {
            var pronto = win && (win.__erro || win.__renderizou || (win.document && win.document.getElementById("raiz") && win.document.getElementById("raiz").childNodes.length));
            if (!pronto && tentativas < 40) { tentativas++; return setTimeout(esperar, 25); }
            setTimeout(function () {
              var raiz = doc.getElementById("raiz");
              var html = raiz ? formatar(raiz, 0) : "";
              var r = {
                erro: win.__erro || null,
                html: html,
                texto: raiz ? normalizar(raiz.innerText || raiz.textContent || "") : "",
                logs: (win.__logs || []).slice(),
                errosConsole: (win.__errosConsole || []).slice(),
                doc: doc,
                win: win,
                iframe: iframe
              };
              var h = Math.max(60, Math.min(420, doc.documentElement.scrollHeight || 120));
              iframe.style.height = h + "px";
              ok(r);
            }, espera || 60);
          })();
        });
        container.appendChild(iframe);
      });
    });
  }

  /* ------------------------------------------------------------- as metas */

  function passosDaMeta(meta) {
    return String(meta || "").split(";;").map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function dividir(passo) {
    var i = passo.indexOf(":");
    return i === -1 ? { nome: passo, valor: "" } : { nome: passo.slice(0, i).trim(), valor: passo.slice(i + 1).trim() };
  }
  function cssDe(doc, seletor, prop) {
    var el;
    try { el = doc.querySelector(seletor); } catch (e) { return null; }
    if (!el) return null;
    return normalizar(doc.defaultView.getComputedStyle(el).getPropertyValue(prop));
  }

  function atualizar(r) {
    var raiz = r.doc.getElementById("raiz");
    r.html = raiz ? formatar(raiz, 0) : "";
    r.texto = raiz ? normalizar(raiz.innerText || raiz.textContent || "") : "";
    return r;
  }

  function esperarUmPouco(ms) {
    return new Promise(function (ok) { setTimeout(ok, ms || 60); });
  }

  /* digita em um campo como o usuário digita (o React escuta o evento input) */
  function digitar(doc, seletor, texto) {
    var el;
    try { el = doc.querySelector(seletor); } catch (e) { return "seletor inválido em digite: " + seletor; }
    if (!el) return "não achei o campo \"" + seletor + "\"";
    var win = doc.defaultView;
    var proto = el.tagName.toLowerCase() === "textarea" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value");
    if (setter && setter.set) setter.set.call(el, texto);
    else el.value = texto;
    el.dispatchEvent(new win.Event("input", { bubbles: true }));
    el.dispatchEvent(new win.Event("change", { bubbles: true }));
    return null;
  }

  /* devolve uma Promise<null | motivo da falha>; o clique e a digitação acontecem na prévia */
  function conferir(r, meta) {
    var passos = passosDaMeta(meta);
    if (!passos.length) return Promise.resolve("a caixa não tem meta (data-goal)");
    if (r.erro && !passos.some(function (p) { return p.indexOf("erro:") === 0; })) return Promise.resolve(r.erro);
    var i = 0;
    function proximo() {
      if (i >= passos.length) return Promise.resolve(null);
      var p = dividir(passos[i++]);
      var valor = normalizar(p.valor);
      if (p.nome === "clique") {
        var el;
        try { el = r.doc.querySelector(p.valor.trim()); } catch (e) { return Promise.resolve("seletor inválido em clique: " + p.valor); }
        if (!el) return Promise.resolve("não achei o elemento \"" + p.valor.trim() + "\" para clicar");
        el.click();
        return esperarUmPouco(80).then(function () { atualizar(r); return proximo(); });
      }
      if (p.nome === "digite") {
        var m = p.valor.match(/^(.*)=(.+)$/);
        if (!m) return Promise.resolve("passo digite mal escrito (use digite:seletor=texto)");
        var falha = digitar(r.doc, m[1].trim(), m[2]);
        if (falha) return Promise.resolve(falha);
        return esperarUmPouco(80).then(function () { atualizar(r); return proximo(); });
      }
      if (p.nome === "texto") {
        if (r.texto.indexOf(valor) === -1) return Promise.resolve("o texto da prévia não tem \"" + valor + "\"");
        return proximo();
      }
      if (p.nome === "html") {
        if (normalizar(r.html).indexOf(valor) === -1) return Promise.resolve("o HTML gerado não tem \"" + valor + "\"");
        return proximo();
      }
      if (p.nome === "console") {
        if ((r.logs || []).join("\n").indexOf(valor) === -1) return Promise.resolve("o console da prévia não tem \"" + valor + "\"");
        return proximo();
      }
      if (p.nome === "erro") {
        if (!r.erro) return Promise.resolve("a prévia não deu erro (a missão esperava \"" + valor + "\")");
        if (normalizar(r.erro).indexOf(valor) === -1) return Promise.resolve("o erro foi \"" + r.erro + "\" (a missão espera \"" + valor + "\")");
        return proximo();
      }
      if (p.nome === "conta") {
        var c = p.valor.match(/^(.*)=(\d+)$/);
        if (!c) return Promise.resolve("passo conta mal escrito (use conta:seletor=n)");
        var n;
        try { n = r.doc.querySelectorAll(c[1].trim()).length; } catch (e) { return Promise.resolve("seletor inválido em conta: " + c[1]); }
        if (n !== parseInt(c[2], 10)) return Promise.resolve("contei " + n + " elemento(s) em \"" + c[1].trim() + "\" (a missão pede " + c[2] + ")");
        return proximo();
      }
      if (p.nome === "attr") {
        var a = p.valor.match(/^(.*)\|([a-z-]+)=(.+)$/);
        if (!a) return Promise.resolve("passo attr mal escrito (use attr:seletor|atributo=valor)");
        var el2;
        try { el2 = r.doc.querySelector(a[1].trim()); } catch (e) { return Promise.resolve("seletor inválido em attr: " + a[1]); }
        if (!el2) return Promise.resolve("não achei o elemento \"" + a[1].trim() + "\"");
        if (normalizar(el2.getAttribute(a[2].trim()) || "") !== normalizar(a[3])) {
          return Promise.resolve(a[1].trim() + " tem " + a[2].trim() + '="' + (el2.getAttribute(a[2].trim()) || "") + '" (a missão pede "' + normalizar(a[3]) + '")');
        }
        return proximo();
      }
      if (p.nome === "css") {
        var k = p.valor.match(/^(.*)\|([a-z-]+)=(.+)$/);
        if (!k) return Promise.resolve("passo css mal escrito (use css:seletor|propriedade=valor)");
        var achado = cssDe(r.doc, k[1].trim(), k[2].trim());
        if (achado === null) return Promise.resolve("não achei o elemento \"" + k[1].trim() + "\"");
        if (achado !== normalizar(k[3])) return Promise.resolve(k[1].trim() + " tem " + k[2].trim() + " = " + (achado || "vazio") + " (a missão pede " + normalizar(k[3]) + ")");
        return proximo();
      }
      return Promise.resolve("passo de meta desconhecido: \"" + p.nome + "\" (use texto:, html:, conta:, attr:, css:, clique:, digite:, console:, erro:)");
    }
    return proximo();
  }

  /* ---------------------------------------------------------------- a caixa */

  function montarCaixa(caixa) {
    var fonte = caixa.querySelector("pre.jsx");
    var solucao = caixa.querySelector("pre.solucao");
    if (!fonte) return;

    var inicial = fonte.textContent.replace(/^\n+|\s+$/g, "");
    var meta = caixa.getAttribute("data-goal") || "";
    var modo = caixa.getAttribute("data-modo") || "auto";

    fonte.setAttribute("contenteditable", "true");
    fonte.setAttribute("spellcheck", "false");
    fonte.setAttribute("role", "textbox");
    fonte.setAttribute("aria-label", "Código JSX");

    var barra = document.createElement("div");
    barra.className = "try-bar";
    barra.innerHTML =
      '<span class="try-nome">' + escapar(fonte.getAttribute("data-file") || "App.jsx") + "</span>" +
      '<button type="button" class="try-rodar">Rodar</button>' +
      '<button type="button" class="try-verificar secondary">Verificar</button>' +
      '<button type="button" class="try-solucao secondary">Ver solução</button>' +
      '<button type="button" class="try-restaurar secondary">Restaurar</button>' +
      '<span class="try-largura">React ' + (window.React ? window.React.version : "19") + "</span>";

    var palco = document.createElement("div");
    palco.className = "try-vivo";

    var saida = document.createElement("pre");
    saida.className = "try-out";
    saida.setAttribute("aria-live", "polite");
    saida.hidden = true;

    var status = document.createElement("p");
    status.className = "try-status";

    caixa.insertBefore(barra, fonte);
    caixa.insertBefore(palco, fonte.nextSibling ? fonte.nextSibling : null);
    caixa.insertBefore(saida, palco.nextSibling);
    caixa.appendChild(status);

    function mostrar(r) {
      saida.textContent = saidaDe(r);
      saida.hidden = false;
      return r;
    }

    function rodar() {
      status.textContent = "";
      status.classList.remove("falhou", "ok");
      return rodarNoIframe(palco, fonte.textContent, modo, 60).then(mostrar).catch(function (e) {
        saida.textContent = "não deu para rodar: " + e.message;
        saida.hidden = false;
        throw e;
      });
    }

    function verificar() {
      return rodarNoIframe(palco, fonte.textContent, modo, 60).then(function (r) {
        return conferir(r, meta).then(function (falha) {
          mostrar(r);
          if (falha) {
            status.textContent = "ainda não: " + falha;
            status.classList.add("falhou");
            status.classList.remove("ok");
          } else {
            status.textContent = "isso: o componente faz o que a missão pede.";
            status.classList.add("ok");
            status.classList.remove("falhou");
          }
          return !falha;
        });
      });
    }

    barra.querySelector(".try-rodar").addEventListener("click", function () { rodar().catch(function () {}); });
    barra.querySelector(".try-verificar").addEventListener("click", function () { verificar().catch(function (e) {
      status.textContent = "não deu para verificar: " + e.message;
    }); });
    barra.querySelector(".try-restaurar").addEventListener("click", function () {
      fonte.textContent = inicial;
      status.textContent = "";
      status.classList.remove("falhou", "ok");
      saida.textContent = "";
      saida.hidden = true;
      if (palco.firstChild) palco.removeChild(palco.firstChild);
    });

    var botaoSolucao = barra.querySelector(".try-solucao");
    if (solucao) {
      botaoSolucao.addEventListener("click", function () {
        fonte.textContent = solucao.textContent.replace(/^\n+|\s+$/g, "");
        rodar().catch(function () {});
      });
    } else {
      botaoSolucao.hidden = true;
    }
    fonte.addEventListener("input", function () { status.textContent = ""; status.classList.remove("falhou", "ok"); });

    caixa.__rodar = rodar;
    caixa.__verificar = verificar;
  }

  function iniciar() {
    var caixas = Array.prototype.slice.call(document.querySelectorAll(".tryreact"));
    caixas.forEach(montarCaixa);
    window.__reactPronto = true;
  }

  /* API usada pelo testador (tools/avaliar.html) */
  window.__reactRodar = function (jsx, modo) {
    var palco = document.createElement("div");
    document.body.appendChild(palco);
    return rodarNoIframe(palco, jsx, modo || "auto", 60).then(function (r) {
      if (r.iframe) r.iframe.remove();
      palco.remove();
      var res = { erro: r.erro, html: r.html, texto: r.texto, logs: r.logs, saida: saidaDe(r) };
      r.doc = null;
      return res;
    }).catch(function (e) {
      palco.remove();
      return { erro: "não rodou: " + e.message, html: "", texto: "", logs: [], saida: "Erro: não rodou: " + e.message };
    });
  };

  window.__reactAvaliar = function (jsx, meta, modo) {
    var palco = document.createElement("div");
    document.body.appendChild(palco);
    return rodarNoIframe(palco, jsx, modo || "auto", 60).then(function (r) {
      return conferir(r, meta).then(function (falha) {
        var saida = saidaDe(r);
        if (r.iframe) r.iframe.remove();
        palco.remove();
        return { ok: !falha, motivo: falha, saida: saida };
      });
    }).catch(function (e) {
      palco.remove();
      return { ok: false, motivo: "não rodou: " + e.message, saida: "" };
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
