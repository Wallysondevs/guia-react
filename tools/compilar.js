#!/usr/bin/env node
/* compilar.js — abre o Chromium uma vez e roda JSX com o React de verdade.
 *
 * Usado por tools/rx.js (CLI dos autores), tools/verificar-saidas.js (pares pre.out) e pelos
 * testadores. O banco de provas é o tools/avaliar.html, que carrega assets/reactsim.js.
 */
"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

function acharChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = path.join(os.homedir(), ".cache/puppeteer/chrome");
  try {
    const dirs = fs.readdirSync(base).filter((d) => d.startsWith("linux-")).sort().reverse();
    for (const d of dirs) {
      const p = path.join(base, d, "chrome-linux64/chrome");
      if (fs.existsSync(p)) return p;
    }
  } catch (e) { /* sem cache */ }
  return undefined;
}

function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const alvo = path.join(RAIZ, p);
      if (!alvo.startsWith(RAIZ)) { res.writeHead(403).end("fora"); return; }
      fs.readFile(alvo, (err, dados) => {
        if (err) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404 " + p); return; }
        res.writeHead(200, { "content-type": TIPOS[path.extname(alvo)] || "application/octet-stream" });
        res.end(dados);
      });
    });
    s.listen(0, "127.0.0.1", () => ok({ servidor: s, porta: s.address().port }));
  });
}

/* puppeteer-core: do node_modules daqui, do PUPPETEER_CORE ou de um node_modules vizinho */
function carregarPuppeteer() {
  const tentativas = [process.env.PUPPETEER_CORE, "puppeteer-core"];
  try {
    const base = path.join(os.homedir());
    fs.readdirSync(base).forEach((d) => {
      if (d === "node_modules" || d[0] === ".") return;
      tentativas.push(path.join(base, d, "node_modules/puppeteer-core"));
    });
  } catch (e) { /* sem home legível */ }
  for (const t of tentativas) {
    if (!t) continue;
    try {
      return require(t);
    } catch (e) { /* tenta o próximo */ }
  }
  console.error("não achei puppeteer-core. Rode: npm i -D puppeteer-core (ou aponte PUPPETEER_CORE=/caminho)");
  process.exit(2);
}

/* abre o navegador no banco de provas e devolve funções prontas */
async function abrir() {
  const pup = carregarPuppeteer();
  const { servidor: s, porta } = await servidor();
  const navegador = await pup.launch({
    executablePath: acharChrome(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const pg = await navegador.newPage();
  pg.on("pageerror", () => {});
  await pg.goto("http://127.0.0.1:" + porta + "/tools/avaliar.html", { waitUntil: "networkidle2", timeout: 60000 });
  await pg.waitForFunction("window.__avaliadorPronto === true", { timeout: 30000 });

  return {
    porta,
    navegador,
    pg,
    /* roda a meta inteira: devolve { ok, motivo, saida } */
    avaliar: (jsx, meta, modo) =>
      pg.evaluate(
        (j, m, mo) => window.__reactAvaliar(j, m, mo),
        jsx, meta || "", modo || "auto"
      ),
    /* só a saída que o painel mostra (usada pelo verificar-saidas) */
    rodar: (jsx, modo) =>
      pg.evaluate(
        (j, mo) => window.__reactRodar(j, mo),
        jsx, modo || "auto"
      ),
    async fechar() {
      await navegador.close();
      await new Promise((ok) => s.close(ok));
    }
  };
}

module.exports = { abrir, acharChrome, servidor, RAIZ };
