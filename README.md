# InkAnnote

Leitor de PDF com caderno de anotações integrado. Leia PDFs lado a lado com suas anotações em markdown WYSIWYG, com persistência automática no navegador e exportação para múltiplos formatos.

## Funcionalidades

### Leitor de PDF
- Renderização de duas páginas por vez (canvas único com crop automático de margens brancas)
- Alta resolução via `devicePixelRatio` + multiplicador de qualidade (1.5x)
- Navegação por pares de páginas com botões e setas do teclado
- Botões desabilitam nos extremos do documento
- Indicador visual de folhas vinculadas às páginas visíveis

### Caderno de anotações
- Editor **WYSIWYG markdown** com [Milkdown](https://milkdown.dev/) (ProseMirror + Remark)
- Digita markdown e vê a formatação renderizada em tempo real (estilo Notion/Typora)
- **Sidebar** recolhível com lista de folhas (nome + vínculo de páginas)
- **Nome livre editável** por folha, com sugestão automática baseada no vínculo
- **Vínculo de páginas PDF** editável inline (ex: `1-2, 5`)
- **Deletar folhas** com confirmação direto pela sidebar
- Contagem de palavras e status de salvamento no rodapé
- Persistência automática (debounce de 400ms)

### Persistência e restauração
- **PDF salvo no IndexedDB** como Blob — sobrevive a recarregamentos
- **Sessão salva no localStorage** (notebookPages, posição, nome do arquivo)
- **Restauração automática** ao recarregar: volta na mesma página, com as mesmas anotações
- Sem banner de confirmação — tudo automático

### Exportação
Módulo ESM separado em `js/export/` carregado sob demanda:

| Destino | Formato | Imagens | Como usar |
|---|---|---|---|
| Notion | `.md` | Não suportado | Import no Notion → Text & Markdown |
| Markdown simples | `.md` | Sem imagens | Qualquer editor |
| Obsidian Vault | `.zip` | Slides em `attachments/` | Extrair e arrastar para o vault |
| PDF (notas) | `.pdf` | Slides vinculados | Leitor de PDF qualquer |
| PDF (completo) | `.pdf` | Todos os slides | Leitor de PDF qualquer |

- Barra de progresso durante a exportação
- Dependências (JSZip, jsPDF) carregadas dinamicamente apenas quando necessário

### Tema
- Modo claro e escuro com toggle na navbar
- Preferência salva no localStorage

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `←` / `→` | Páginas anterior / próxima do PDF |
| `Alt + ←` / `Alt + →` | Folha anterior / próxima do caderno |
| `Alt + N` | Nova folha |
| `Ctrl + S` | Salvar sessão |
| `Ctrl + E` | Abrir modal de exportação |

## Arquitetura

```
InkAnnote/
├── index.html              # Estrutura HTML (upload, workspace, modal de exportação)
├── styles.css               # Estilos (tema claro/escuro, layout, modal, sidebar)
├── app.js                   # Lógica principal (IIFE clássica, dynamic import p/ Milkdown e export)
└── js/
    └── export/
        ├── index.js          # Orquestrador: exportTo(type, session)
        ├── utils.js          # Helpers: renderPageToDataURL, download, slugify, getJSZip, getJsPDF
        ├── exporter-md.js    # Markdown (Notion / plain / obsidian wikilinks)
        ├── exporter-zip.js   # Vault Obsidian em ZIP (JSZip dinâmico)
        └── exporter-pdf.js    # PDF com anotações (jsPDF dinâmico)
```

### Tecnologias
- **PDF.js** (CDN) — renderização do PDF
- **Milkdown** (esm.sh, dynamic import) — editor WYSIWYG markdown
- **JSZip** (esm.sh, dynamic import) — exportação ZIP para Obsidian
- **jsPDF** (esm.sh, dynamic import) — exportação PDF
- **IndexedDB** — armazenamento do arquivo PDF
- **localStorage** — sessão, tema, posição do divisor

## Como rodar

Por usar ES modules e dynamic imports, o app precisa de um servidor HTTP (não funciona via `file://`):

```bash
# Python
python -m http.server 8000

# ou Node
npx serve
```

Acesse `http://localhost:8000`.

## Privacidade

Tudo fica no dispositivo. Nada é enviado para servidores. O PDF e as anotações são salvos localmente no navegador (IndexedDB + localStorage).