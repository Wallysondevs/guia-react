#!/usr/bin/env node
/* provar-defeitos.js — prova que o testador REPROVA quando o guia tem defeito.
 *
 * Um testador que só diz "ok" não serve para nada. Este script pega a aula-modelo
 * (primeiro-componente.html), injeta um defeito de cada vez numa cópia em tmp/defeitos/ e chama o
 * testador de verdade. Se o testador NÃO reprovar, é o testador que está errado.
 *
 *   node tools/provar-defeitos.js            roda todos os defeitos
 *   node tools/provar-defeitos.js -v         mostra a saída do testador em cada caso
 *
 * Sai com 1 se algum defeito passar batido.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const cp = require("child_process");
const N = require("./nucleo");

const RAIZ = N.RAIZ;
const MODELO = path.join(RAIZ, "primeiro-componente.html");
const PASTA = path.join(RAIZ, "tmp/defeitos");
const verboso = process.argv.includes("-v") || process.argv.includes("--verboso");

const CAIXA = '<div class="tryreact"';
const PAGER = '<div class="pager"></div>';

/* troca a meta de uma caixa, achando pelo começo do HTML dela */
function comMeta(html, inicioDoHtml, novaMeta) {
  const i = html.indexOf(inicioDoHtml);
  if (i < 0) throw new Error("não achei o pre.html: " + inicioDoHtml.slice(0, 50));
  const j = html.lastIndexOf("<div class=\"trytailwind\"", i);
  const k = html.indexOf("data-goal=\"", j);
  const fim = html.indexOf("\"", k + 11);
  return html.slice(0, k) + 'data-goal="' + novaMeta + html.slice(fim);
}

const DEFEITOS = [
  {
    nome: "sem dl.anatomy",
    espera: /dl\.anatomy/,
    html: (h) => h.replace(/<dl class="anatomy">[\s\S]*?<\/dl>/g, ""),
    semSim: true
  },
  {
    nome: "table.ref fora do .table-wrap",
    espera: /FORA de \.table-wrap/,
    html: (h) => h.replace('<div class="table-wrap">\n<table class="ref">', '<table class="ref">')
      .replace("</table>\n</div>", "</table>"),
    semSim: true
  },
  {
    nome: "sem <h2>Resumo</h2>",
    espera: /Resumo/,
    html: (h) => h.replace("<h2>11. Resumo</h2>", "<h2>11. Fim</h2>"),
    semSim: true
  },
  {
    nome: "meta fraca (inicial igual à solução)",
    espera: /INICIAL já cumpre a meta/,
    html: (h) => {
      const m = h.match(/<pre class="jsx"[^>]*>([\s\S]*?)<\/pre>\s*<pre class="out">[\s\S]*?<\/pre>\s*<pre class="solucao"[^>]*>([\s\S]*?)<\/pre>/);
      if (!m) throw new Error("não achei o par jsx/solucao");
      return h.replace(m[0], m[0].replace(m[1], m[2]));
    }
  },
  {
    nome: "solução não cumpre a meta",
    espera: /SOLUÇÃO não cumpre/,
    html: (h) => h.replace('data-goal="texto:Pão quentinho"', 'data-goal="texto:Pão de queijo"')
  },
  {
    nome: "passo de meta inventado",
    espera: /passo de meta desconhecido/,
    html: (h) => h.replace('data-goal="texto:Pão quentinho"', 'data-goal="texto:Pão quentinho;;status:200"')
  },
  {
    nome: "menos de 3 caixas",
    espera: /caixa\(s\) \.tryreact/,
    html: (h) => {
      const i2 = h.indexOf(CAIXA, h.indexOf(CAIXA) + 10);
      const i3 = h.indexOf(CAIXA, i2 + 10);
      if (i2 < 0 || i3 < 0) throw new Error("não achei as caixas");
      return h.slice(0, i2) + h.slice(i3);
    },
    semSim: true
  },
  {
    nome: "< sem escape dentro de pre.jsx",
    espera: /sem escape dentro de/,
    html: (h) => h.replace('<pre class="jsx">function App() {\n  return &lt;h1&gt;Oi&lt;/h1&gt;;\n}</pre>',
      '<pre class="jsx">function App() {\n  return <h1>Oi</h1>;\n}</pre>'),
    semSim: true
  },
  {
    nome: "link para página que não existe",
    espera: /NÃO existe no disco|não está na NIVEIS/,
    html: (h) => h.replace("<h2>1. A cena: o mesmo cabeçalho em três arquivos</h2>",
      '<h2>1. A cena: o mesmo cabeçalho em três arquivos</h2>\n<p>Veja <a href="nao-existe-mesmo.html">as props</a>.</p>'),
    semSim: true
  },
  {
    nome: "placeholder TODO",
    espera: /placeholder de rascunho/,
    html: (h) => h.replace("<h2>1. A cena: o mesmo cabeçalho em três arquivos</h2>",
      "<h2>1. TODO A cena: o mesmo cabeçalho em três arquivos</h2>"),
    semSim: true
  },
  {
    nome: "dado da máquina real",
    espera: /dado da máquina real/,
    html: (h) => h.replace("<h2>1. A cena: o mesmo cabeçalho em três arquivos</h2>",
      "<h2>1. A cena: o mesmo cabeçalho em três arquivos</h2>\n<p>A pasta é /home/fulano/padaria.</p>"),
    semSim: true
  },
  {
    nome: "texto curto demais",
    espera: /palavras/,
    html: (h) => {
      const ini = h.indexOf("<h2>3. ");
      const fim = h.indexOf("<h2>9. ");
      if (ini < 0 || fim < 0) throw new Error("não achei os h2 3 e 9");
      return h.slice(0, ini) + h.slice(fim);
    },
    semSim: true
  },
  {
    nome: "title sem | Guia React",
    espera: /\| Guia React/,
    html: (h) => h.replace(/\| Guia React<\/title>/, "— React</title>"),
    semSim: true
  },
  {
    nome: "sem o segundo .pager",
    espera: /\.pager na página/,
    html: (h) => {
      const i = h.lastIndexOf(PAGER);
      if (i < 0) throw new Error("não achei os pagers");
      return h.slice(0, i) + h.slice(i + PAGER.length);
    },
    semSim: true
  },
  {
    nome: "meta description curta",
    espera: /meta description tem/,
    html: (h) => h.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="curta">'),
    semSim: true
  },
  {
    nome: "h2 fora da numeração",
    espera: /numerados/,
    aviso: true,
    html: (h) => {
      const novo = h.replace("<h2>2. O que é um componente, na prática</h2>", "<h2>O que é um componente, na prática</h2>");
      if (novo === h) throw new Error("não achei o h2 2");
      return novo;
    },
    semSim: true
  }
];

function rodarTestador(arquivo, semSim) {
  const env = Object.assign({}, process.env, {
    PATH: path.dirname(process.execPath) + ":" + process.env.PATH,
    NODE_PATH: process.env.NODE_PATH || path.join(os.homedir(), "guia-react/node_modules")
  });
  const comando = ["tools/testar-missoes.js", arquivo].concat(semSim ? ["--sem-sim"] : []);
  const r = cp.spawnSync(process.execPath, comando, { cwd: RAIZ, env, encoding: "utf8", timeout: 240000 });
  return { saida: (r.stdout || "") + (r.stderr || ""), codigo: r.status };
}

function principal() {
  if (!fs.existsSync(MODELO)) {
    console.error("não achei a aula-modelo: " + MODELO);
    process.exit(2);
  }
  const original = fs.readFileSync(MODELO, "utf8");
  fs.mkdirSync(PASTA, { recursive: true });

  let passaram = 0;
  console.log("provando " + DEFEITOS.length + " defeitos contra o testador (fonte: primeiro-componente.html)\n");

  DEFEITOS.forEach((d, k) => {
    const nome = "d" + String(k + 1).padStart(2, "0") + "-" + d.nome.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
    const arq = path.join(PASTA, nome + ".html");
    let html;
    try {
      html = d.html(original);
    } catch (e) {
      console.log("✗ " + d.nome + ": o defeito não pôde ser injetado — " + e.message);
      return;
    }
    if (html === original) {
      console.log("✗ " + d.nome + ": a injeção não mudou nada (defeito mal escrito)");
      return;
    }
    fs.writeFileSync(arq, html);
    const relativo = path.relative(RAIZ, arq);
    const r = rodarTestador(relativo, d.semSim === true);
    const pegou = d.aviso
      ? r.codigo === 0 && d.espera.test(r.saida)
      : r.codigo === 1 && d.espera.test(r.saida);
    if (pegou) {
      passaram++;
      console.log("✓ " + d.nome + " — reprovado como devia");
    } else {
      console.log("✗ " + d.nome + " — PASSOU BATIDO (código " + r.codigo + ")");
      if (verboso) console.log(r.saida.split("\n").slice(-14).join("\n"));
      else console.log("   rode com -v para ver a saída do testador");
    }
  });

  console.log("");
  console.log(passaram + " de " + DEFEITOS.length + " defeitos reprovados");
  if (passaram < DEFEITOS.length) {
    console.log("o testador deixou passar defeito: conserte a REGRA, não o defeito.");
    process.exit(1);
  }
  console.log("o testador está afiado.");
}

principal();
