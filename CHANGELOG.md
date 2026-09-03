# Changelog

All notable changes to this extension are documented here.
Version numbers follow the supported XCX language version.

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
