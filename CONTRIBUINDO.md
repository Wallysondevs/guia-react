# Como escrever uma aula do Guia React

Este guia é para quem **nunca programou**. Cada página é uma aula inteira, com 2.800 a 4.000
palavras de texto visível, escrita como uma conversa: uma pessoa (a Ana) tem um problema, tenta,
erra, entende e resolve. O leitor aprende a escrever componentes React — e as caixas da página
**rodam o componente dele com o React de verdade**.

## 1. O esqueleto de uma aula

Copie `primeiro-componente.html` (a aula-modelo aprovada) e troque o conteúdo. O que o testador
cobra em toda aula:

| Peça | Quantas | Observação |
| --- | --- | --- |
| `<title>` | 1 | termina exatamente em `\| Guia React` |
| `<meta name="description">` | 1 | de 100 a 180 caracteres |
| `<h1>` com `<span class="hl">` | 1 | o destaque cai na palavra-chave |
| `p.intro` | 1 | apresenta a cena da Ana |
| `div.note` | 1 | "Você vai aprender", logo depois do intro |
| `<h2>` de conteúdo | 10 | numerados `1.` … `10.` |
| `<h2>11. Resumo</h2>` | 1 | e um `div.note` "Para lembrar" no fim |
| `dl.anatomy` | 1 | 3 a 6 termos com `<dt>`/`<dd>` |
| `pre.term` | 2 | saída de console/CSS (texto cru: **nunca** use `<` dentro) |
| `pre.file` | livre | código de arquivo (`data-file="App.jsx"`), pode substituir um `pre.term` |
| `div.cenario` | 3 | cada um com `<h3>` e um parágrafo |
| `table.ref` | 2 | sempre dentro de `div.table-wrap` |
| `div.mc` | 3 | `data-answer="1\|2\|3"` + `<label><input type="radio">` |
| `div.exercise` | 1 | com `.ex-code` e um `<input data-answer="...">` |
| `div.pager` | 2 | um no começo e um no fim do `.content` |
| `div.tryreact` | 3 | as caixas que rodam o componente (veja §2) |

Além disso: `<!doctype html>`, `lang="pt-BR"`, favicon `data:,`, `assets/style.css`, o script do
tema no `<head>`, `.layout > nav.sidebar#sidebar + main.main > .content` e `assets/site.js` antes
de `</body`. Tudo isso já está no modelo.

Páginas de **projeto** (`projeto-*.html`) seguem o mesmo esqueleto com 9 `<h2>`, 2 `dl.anatomy`,
3 `pre.term`, 3 `table.ref` e 3 caixas. Páginas de **referência** (`ref-*.html`) têm 8 `<h2>`,
1 `dl.anatomy`, 2 `pre.term`, 4 `table.ref`, 2 caixas e **não** têm cenário, `.mc` nem exercício.

## 2. A caixa que roda o React

```html
<div class="tryreact" data-goal="texto:Pão quentinho">
  <p class="try-task">Troque o título para "Pão quentinho" e clique em Rodar.</p>
  <pre class="jsx">function App() {
  return &lt;h1&gt;Oi&lt;/h1&gt;;
}</pre>
  <pre class="out">
&lt;h1&gt;Oi&lt;/h1&gt;
</pre>
  <pre class="solucao">function App() {
  return &lt;h1&gt;Pão quentinho&lt;/h1&gt;;
}</pre>
</div>
```

O que cada peça faz:

- `pre.jsx` — **o editor**. O leitor edita, clica em **Rodar** e o componente roda com o React 19
  dentro de um iframe. `<`, `>` e `&` ficam escapados (`&lt;`, `&gt;`, `&amp;`).
- `pre.solucao` — o componente que cumpre a missão, escondido; **Ver solução** copia para o editor.
- `p.try-task` — o enunciado, em uma ou duas frases.
- `data-goal` — a meta que o botão **Verificar** confere (veja §3).
- `pre.out` — o painel, para o leitor ver o resultado sem clicar. Só vale o que o motor devolve:
  rode `node tools/verificar-saidas.js --fix pagina.html` e ele grava a saída certa.
- `data-modo="manual"` — o código chama `ReactDOM.createRoot(...)` sozinho (o normal é o motor
  renderizar `App` automaticamente).

O painel mostra **o HTML que o React gerou** para `#raiz`, uma tag por linha (texto inline na mesma
linha), mais as linhas de `console.log` prefixadas com `console: `. Se o JSX não compilar, mostra
`Erro: não compilou: …`; se o componente quebrar ao rodar, `Erro: …`.

Convenções do motor: o componente deve se chamar **`App`** (letra maiúscula); `useState`,
`useEffect`, `useRef`, `useReducer`, `useContext`, `useMemo`, `useCallback`, `useId`,
`useTransition`, `useDeferredValue`, `useLayoutEffect`, `createContext`, `Fragment` e `memo` já estão
no escopo; linhas `import …` e `export default` são removidas automaticamente.

## 3. A meta (`data-goal`)

Passos separados por `;;`, na ordem:

| Passo | Exemplo | Confere |
| --- | --- | --- |
| `texto:` | `texto:Pão quentinho` | um trecho do texto visível na prévia |
| `html:` | `html:<h1>` | um trecho do HTML gerado |
| `conta:` | `conta:.card=3` | quantos elementos casam com o seletor |
| `attr:` | `attr:img\|alt=Pão` | um atributo do elemento |
| `css:` | `css:#alvo\|display=flex` | o CSS computado |
| `clique:` | `clique:button` | clica antes de conferir os próximos passos |
| `digite:` | `digite:input=Pão` | digita no campo antes de conferir |
| `console:` | `console:clicou` | o que o código escreveu no console |
| `erro:` | `erro:must be wrapped` | a mensagem de erro esperada |

Regras de ouro: a meta tem de **falhar** no código inicial (senão a missão não pede nada) e
**passar** na solução. Use `clique:`/`digite:` para provar interação (estado, formulário) — depois
do clique o painel mostra o novo HTML. Para erro de propósito, use `erro:` e um `pre.out` com a
mensagem que o motor devolve.

## 4. Privacidade

Nada da máquina de quem escreve entra na página. Use sempre:

- `ana@notebook`, `/home/ana`, `America/Sao_Paulo`;
- IPs de exemplo (`192.0.2.10`), domínio `loja.test`;
- nome do projeto inventado (padaria, livraria, estudio).

O testador reprova nome real, `/home/<outro>`, `/root`, IP da VPS, MAC e SSID.

## 5. Conferir antes de commitar

```bash
export PATH=/home/wallyson/.local/node22/bin:$PATH
node tools/testar-missoes.js -q pagina.html        # contrato, texto, links, caixas e metas
node tools/verificar-saidas.js --fix pagina.html   # grava o pre.out que o motor devolve
node tools/verificar-saidas.js -q pagina.html      # confere de novo (tem de dar 0 problema)
node tools/testar-navegador.js pagina.html         # abre no Chromium, clica nas caixas
node tools/rx.js pagina.html                       # vê o HTML que cada caixa gera
```

- `--completo` transforma em FALHA o link para página que ainda não existe.
- `node tools/empacotar.js --checar` garante que o motor publicado é o do `package.json`.
- Commit: `git add pagina.html && git commit -m "aula: <título>"`. **Nunca** `git push` sem o OK
  do Wallyson, e nunca `git add -A` neste repositório.
