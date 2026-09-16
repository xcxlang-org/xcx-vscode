# Changelog

All notable changes to this extension are documented here.
Version numbers follow the supported XCX language version.

## [4.4.0] - 2026-09-16

XCX 4.4 support.

### Added
- Hover documentation for XCX keywords, types, built-in modules, column attributes and operators (plus PAX manifest fields).
- Document symbol provider — functions, fibers, constants and `serve:`/`database:`/`table:`/`map:` blocks now appear in the Outline view and breadcrumbs.
- `xcx.linter.enabled` setting to turn the real-time diagnostics off.
- JSON syntax highlighting inside `<<< ... >>>` raw blocks (embeds the built-in JSON grammar).
- Indentation rules: pressing Enter after `then`/`do`/`{`/`[` increases indent; `end`, `}`, `]`, `else` dedent — with or without the (now optional) trailing semicolon.
- Deprecation warnings for semicolons after block terminators (`end;`, `then;`, `do;`, `else;`, `};`) — optional in XCX 4.4, removed in XCX 5.0.

### Changed
- Diagnostic messages are now in English (previously Polish).
- The linter no longer requires a semicolon after single-line block declarations — `array:`, `set:`, `map:`, `table:` and `database:` with an inline `{ ... }` body are complete without one (block-terminator rules apply).
- All snippets use the XCX 4.4 style — no semicolons after `end`, `then`, `do`, `else` or block closers.
- `ovsx` moved from `dependencies` to `devDependencies` — it is a publishing tool and is no longer packaged into the VSIX.

### Removed
- Support for the `els` and `elf` aliases (use `else` and `elif`).

## [4.3.0] - 2026-09-01

### Added
- XCX 4.3 as the declared supported language version (extension version, description, README).
- Highlighting for `\xNN` (hex) and `\NNN` (octal) string escape sequences.
- `json` highlighted as a built-in module (`json.parse(...)`); `date.now()` and other `date.` calls now highlight `date` as a module instead of a type.

### Fixed
- `engines.vscode` raised from `^1.7.0` to `^1.44.0` — the extension uses the semantic tokens API, available since VS Code 1.44.
- `package.json` repository/homepage/bugs pointed to the wrong GitHub org (`xcx-lang` instead of `xcxlang-org`).
- Duplicate pattern in the missing-semicolon diagnostic rule list.
- Semantic tokens legend was rebuilt on every provider call; it is now created once at activation.

## [4.2.0] - 2026-07-17

### Changed
- License changed to Apache-2.0.
- README and packaging updates (Marketplace and Open VSX links).

## [4.1.0] - 2026-06-24

### Added
- Semantic tokens provider so multi-line comments (`---` ... `*---`) render as comments.

## [4.0.0] - 2026-06-14

### Changed
- Reworked snippet set.
- Updates to the XCX and PAX grammars.
