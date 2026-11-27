#!/usr/bin/env node
/* rx.js — o CLI dos autores: roda um componente com o React de verdade e mostra a saída do painel
 * (o HTML que o React gerou) ou o resultado da meta.
 *
 *   node tools/rx.js pagina.html                      # todos os pre.jsx da página, um por um
 *   node tools/rx.js pagina.html --meta "texto:Pão"
 *   node tools/rx.js --jsx "function App(){return <h1>Oi</h1>}"
 *   --modo manual   (o código chama ReactDOM.createRoot sozinho)
 *   --json
 *
 * Sai com 1 quando a meta não é cumprida.
 */
"use strict";

const fs = require("fs");
const { abrir } = require("./compilar");
const N = require("./nucleo");

const args = process.argv.slice(2);
const valor = (nome, padrao) => {
  const i = args.indexOf(nome);
  return i === -1 ? padrao : args[i + 1];
};
const opcoes = {
  meta: valor("--meta", ""),
  jsx: valor("--jsx", null),
  modo: valor("--modo", "auto"),
  json: args.includes("--json")
};
const arquivos = args.filter((a) => !a.startsWith("--") && !["--meta", "--jsx", "--modo"].includes(args[args.indexOf(a) - 1]));

function lerTrechos(arquivo) {
  const html = fs.readFileSync(arquivo, "utf8");
  const src = N.prepararHtml(html);
  const tags = N.varrer(src);
  return N.listar(tags, "pre", (at) => N.temClasse(at, "jsx")).map((b, i) => ({
    nome: require("path").basename(arquivo) + " #" + (i + 1),
    jsx: N.decodificarEntidades(src.slice(b.fimTag, b.fimEl ?? src.length)).replace(/^\n/, "").replace(/\s+$/, ""),
    modo: b.at["data-modo"] || opcoes.modo,
    meta: b.at["data-goal"] || ""
  }));
}

(async () => {
  const trechos = opcoes.jsx
    ? [{ nome: "trecho", jsx: opcoes.jsx, modo: opcoes.modo, meta: "" }]
    : arquivos.flatMap(lerTrechos);
  if (!trechos.length) {
    console.error('uso: node tools/rx.js pagina.html [--meta "texto:Pão"] [--jsx "<App/>"]');
    process.exit(2);
  }
  const nav = await abrir();
  let falhas = 0;
  for (const t of trechos) {
    const meta = opcoes.meta || t.meta;
    if (meta) {
      const r = await nav.avaliar(t.jsx, meta, t.modo);
      if (opcoes.json) console.log(JSON.stringify({ trecho: t.nome, ...r }, null, 1));
      else {
        console.log("== " + t.nome + ": " + (r.ok ? "meta cumprida" : "meta NÃO cumprida — " + r.motivo));
        console.log(r.saida);
      }
      if (!r.ok) falhas++;
      continue;
    }
    const r = await nav.rodar(t.jsx, t.modo);
    console.log("== " + t.nome);
    console.log(r.saida || "(nada)");
  }
  await nav.fechar();
  process.exit(falhas ? 1 : 0);
})();
