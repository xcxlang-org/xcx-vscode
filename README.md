# XCX Language Support

Rich language support for the **XCX 4.4** programming language in Visual Studio Code.

[🌐 Website](https://xcxlang.com) · [📦 PAX Registry](https://pax.xcxlang.com) · [▶ Playground](https://playground.xcxlang.com) · [GitHub](https://github.com/xcxlang-org/xcx) · [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=xcxlang-org.xcx-vscode) · [Open VSX](https://open-vsx.org/extension/xcxlang-org/xcx-vscode)

## Features

- **Syntax Highlighting** — comprehensive highlighting for all XCX keywords, types, operators, literals, column attributes (`@pk`, `@unique`, `@optional`, `@default`, `@fk`), terminal commands, and the `input` module. JSON inside `<<< ... >>>` raw blocks is highlighted as JSON.
- **Hover Documentation** — hover over keywords, types, built-in modules (`net`, `store`, `crypto`, ...), column attributes and operators (`>!`, `>?`, `->`, `::`, `++`) for inline reference docs.
- **Outline / Document Symbols** — functions, fibers, constants and `serve:` / `database:` / `table:` / `map:` blocks appear in the Outline view and breadcrumbs.
- **Snippets** — handy snippets for all language constructs (see list below).
- **Diagnostics (Linter)** — real-time detection of common errors: missing `then`/`do`, missing statement semicolons, unclosed `<<<` blocks, malformed `yield from`, plus deprecation warnings for semicolons after block terminators (`end;`, `then;`, `do;`, `else;`, `};`) — optional in XCX 4.4, removed in XCX 5.0. Can be disabled with the `xcx.linter.enabled` setting.
- **Language Configuration** — bracket matching, auto-closing pairs, comment toggling (`---`), and smart indentation (`then;`/`do;`/`{` indent on Enter, `end;`/`};`/`else;` dedent).
- **File Icons** — custom icons for `.xcx` and `.pax` files.
- **PAX Support** — full syntax highlighting for `project.pax` and `pax.lock` files including version pins, GitHub shortcuts, dependency URLs, and metadata fields.

---

## Links

| | |
|---|---|
| Official website | [xcxlang.com](https://xcxlang.com) |
| PAX Registry | [pax.xcxlang.com](https://pax.xcxlang.com) |
| Web Playground | [playground.xcxlang.com](https://playground.xcxlang.com) |
| GitHub | [xcxlang-org/xcx](https://github.com/xcxlang-org/xcx) |
| VS Code Marketplace | [xcxlang-org.xcx-vscode](https://marketplace.visualstudio.com/items?itemName=xcxlang-org.xcx-vscode) |
| Open VSX Registry | [xcxlang-org/xcx-vscode](https://open-vsx.org/extension/xcxlang-org/xcx-vscode) |

---

## Installation

### From VS Code Marketplace
Search for **XCX Language Support** in the Extensions view (`Ctrl+Shift+X`) or install directly from the [Marketplace page](https://marketplace.visualstudio.com/items?itemName=xcxlang-org.xcx-vscode).

### From Open VSX (VSCodium, other Open VSX-based editors)
Install from the [Open VSX Registry page](https://open-vsx.org/extension/xcxlang-org/xcx-vscode).

### Manual install (.vsix)
1. Download the `.vsix` file.
2. Open VS Code.
3. Go to the Extensions view (`Ctrl+Shift+X`).
4. Click the `...` menu and select **Install from VSIX...**.
5. Choose the downloaded `.vsix` file.

---
