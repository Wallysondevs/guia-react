#!/usr/bin/env node
/* empacotar.js — o React que o site usa é o MESMO que o testador usa.
 *
 *   node tools/empacotar.js --gerar     gera assets/react.js (React + ReactDOM em um IIFE) e
 *                                      copia assets/babel.js (@babel/standalone) + assets/vendor.json
 *   node tools/empacotar.js --checar   confere versões e hash contra o node_modules
 *
 * React 19 não publica mais build UMD: o jeito é empacotar o pacote oficial com esbuild — o mesmo
 * código que o Vite entrega no projeto do leitor. O JSX é transformado pelo Babel, que é o
 * transformador de referência do React (preset-react, runtime automático).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");
const ASSETS = path.join(RAIZ, "assets");
const MANIFESTO = path.join(ASSETS, "vendor.json");
const BABEL_ORIGEM = path.join(RAIZ, "node_modules/@babel/standalone/babel.min.js");
const BABEL_DESTINO = path.join(ASSETS, "babel.js");
const REACT_DESTINO = path.join(ASSETS, "react.js");

const hash = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const versao = (pkg) => {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, "node_modules", pkg, "package.json"), "utf8")).version; }
  catch (e) { return null; }
};

const ENTRADA = `
import * as React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { flushSync } from "react-dom";
window.React = React;
window.ReactDOM = { createRoot: createRoot, hydrateRoot: hydrateRoot, flushSync: flushSync, version: React.version };
`;

async function gerar() {
  const esbuild = require("esbuild");
  const saida = await esbuild.build({
    stdin: { contents: ENTRADA, resolveDir: RAIZ, loader: "jsx" },
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2020"],
    define: { "process.env.NODE_ENV": '"production"' },
    write: false
  });
  const reactBytes = saida.outputFiles[0].contents;
  fs.writeFileSync(REACT_DESTINO, reactBytes);
  fs.copyFileSync(BABEL_ORIGEM, BABEL_DESTINO);

  const manifesto = {
    react: versao("react"),
    reactDom: versao("react-dom"),
    babel: versao("@babel/standalone"),
    gerado: new Date().toISOString().slice(0, 10),
    arquivos: {}
  };
  for (const nome of ["react.js", "babel.js"]) {
    const b = fs.readFileSync(path.join(ASSETS, nome));
    manifesto.arquivos[nome] = { sha256: hash(b), bytes: b.length };
  }
  fs.writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + "\n");
  console.log("publicado assets/react.js (" + Math.round(reactBytes.length / 1024) + " KB, react " + manifesto.react + ")");
  console.log("publicado assets/babel.js (" + Math.round(fs.statSync(BABEL_DESTINO).size / 1024) + " KB, babel " + manifesto.babel + ")");
}

function checar() {
  if (!fs.existsSync(MANIFESTO)) { console.error("falta assets/vendor.json — rode --gerar"); process.exit(1); }
  const m = JSON.parse(fs.readFileSync(MANIFESTO, "utf8"));
  let erros = 0;
  for (const nome of ["react.js", "babel.js"]) {
    const arq = path.join(ASSETS, nome);
    if (!fs.existsSync(arq)) { console.error("FALTA assets/" + nome); erros++; continue; }
    const b = fs.readFileSync(arq);
    if (hash(b) !== m.arquivos[nome].sha256) { console.error("assets/" + nome + " não confere com o manifesto — rode --gerar"); erros++; }
    else console.log("assets/" + nome + " confere com o manifesto (" + Math.round(b.length / 1024) + " KB, sha " + hash(b) + ")");
  }
  const v = { react: versao("react"), "react-dom": versao("react-dom"), "@babel/standalone": versao("@babel/standalone") };
  if (m.react !== v.react || m.reactDom !== v["react-dom"] || m.babel !== v["@babel/standalone"]) {
    console.error("o manifesto diz react " + m.react + " / react-dom " + m.reactDom + " / babel " + m.babel +
      " e o node_modules tem " + v.react + " / " + v["react-dom"] + " / " + v["@babel/standalone"] + " — rode --gerar");
    erros++;
  } else {
    console.log("react " + v.react + ", react-dom " + v["react-dom"] + ", babel " + v["@babel/standalone"] + " conferem com o node_modules");
  }
  if (fs.existsSync(BABEL_ORIGEM) && hash(fs.readFileSync(BABEL_ORIGEM)) !== hash(fs.readFileSync(BABEL_DESTINO))) {
    console.error("assets/babel.js difere do pacote instalado — rode --gerar");
    erros++;
  }
  if (erros) process.exit(1);
  console.log("\nmotor do site confere com o do projeto.");
}

const args = process.argv.slice(2);
if (args.includes("--gerar")) gerar().catch((e) => { console.error(e.message); process.exit(1); });
else if (args.includes("--checar")) checar();
else { console.error("uso: node tools/empacotar.js --gerar | --checar"); process.exit(2); }
