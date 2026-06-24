# XCX Language Support

Rich language support for the **XCX 4.1** programming language in Visual Studio Code.

[🌐 Website](https://xcxlang.com) · [📦 PAX Registry](https://pax.xcxlang.com) · [▶ Playground](https://playground.xcxlang.com) · [GitHub](https://github.com/xcxlang-org/xcx)

## Features

- **Syntax Highlighting** — comprehensive highlighting for all XCX keywords, types, operators, literals, column attributes (`@pk`, `@unique`, `@optional`, `@default`, `@fk`), terminal commands, and the `input` module.
- **Snippets** — handy snippets for all language constructs (see list below).
- **Diagnostics (Linter)** — real-time detection of common errors: missing semicolons, missing `then;`/`do;`, unclosed `<<<` blocks, malformed `yield from`, and more.
- **Language Configuration** — bracket matching, auto-closing pairs, comment toggling (`---`), and smart indentation.
- **File Icons** — custom icons for `.xcx` and `.pax` files.
- **PAX Support** — full syntax highlighting for `project.pax` and `pax.lock` files including version pins, GitHub shortcuts, dependency URLs, and metadata fields.

---

## Syntax Highlighting

The extension highlights:

- **Keywords** — `if`, `then`, `elif`, `else`, `end`, `while`, `for`, `do`, `func`, `fiber`, `yield`, `return`, `include`, `serve`, `const`, and all aliases.
- **Types** — `i`, `f`, `s`, `b` (and long forms `int`, `float`, `str`, `bool`), `array`, `set`, `map`, `table`, `json`, `date`, `fiber:T`, `database`.
- **Set domains** — `N`, `Z`, `Q`, `S`, `B`, `C` after `set:`.
- **Column attributes** — `@auto`, `@pk`, `@unique`, `@optional`, `@default`, `@fk` in table column definitions.
- **Built-in modules** — `crypto`, `net`, `env`, `store`, `random`, `date`, `input`, `perf` (when used as `module.method`).
- **Built-in functions** — `halt`, `alert`, `error`, `fatal`, `store`, `random`, `choice`, `input`, `perf`.
- **Operators** — arithmetic, comparison, logical (`AND`, `OR`, `NOT`, `HAS`, `!!`, `&&`, `||`), set (`UNION`, `INTERSECTION`, `DIFFERENCE`, `SYMMETRIC_DIFFERENCE`, `∪`, `∩`, `\`, `⊕`), I/O (`>!`, `>?`), digit concatenation (`++`), and special XCX operators (`->`, `<->`, `<=>`, `::`, `++`).
- **Decorators** — `@step`, `@wait`.
- **Terminal commands** — `.terminal !clear`, `!exit`, `!run`, `!raw`, `!normal`, `!cursor`, `!move`, `!write`.
- **Literals** — integers, floats, booleans, strings, raw JSON blocks (`<<< ... >>>`).
- **Constants** — `true`, `false`, `EMPTY`.
- **PAX files** — metadata keys (`name`, `version`, `author`, `description`, `main`, `tags`, `files`, `deps`), version pins (`@1.2.0`), GitHub shortcuts, and direct URLs.

---

## Snippets

Snippets are grouped by category. Trigger them with the listed prefix.

### Variables & Types
| Prefix | Description |
|--------|-------------|
| `xvar` | Variable declaration (i / f / s / b) |
| `const` | Constant declaration |
| `toi` | Cast to int: `i(x)` |
| `tof` | Cast to float: `f(x)` |
| `tos` | Cast to string: `s(x)` |

### Functions
| Prefix | Description |
|--------|-------------|
| `func` | Void function |
| `funcr` | Function with return value |
| `funcnp` | No-parameter function with return |
| `funcv` | No-parameter void function |

### Fibers
| Prefix | Description |
|--------|-------------|
| `fiber` | Typed fiber definition |
| `fiberv` | Void fiber definition |
| `fiberh` | HTTP handler fiber |
| `fiberi` | Typed fiber instance + `.next()` |
| `fiberiv` | Void fiber instance + `.run()` |
| `fiberpipe` | Fiber pipeline (chaining sub-fibers) |
| `fiberloop` | `while isDone()` consume loop |
| `forfib` | `for` loop over fiber |
| `yield` | `yield value;` |
| `yieldv` | `yield;` (void fiber) |
| `yieldfrom` | `yield from` — delegate to sub-fiber |

### Control Flow
| Prefix | Description |
|--------|-------------|
| `if` | If statement |
| `ifelse` | If-else |
| `ifelif` | If-elif-else |
| `ifg` | Inline guard |
| `ifguard` | Guard with `yield net.respond` + `return` |

### Loops
| Prefix | Description |
|--------|-------------|
| `while` | While loop |
| `forr` | For range loop |
| `forrs` | For range with `@step` |
| `forin` | For over collection (array / set / fiber) |
| `forset` | For over set |
| `foridx` | For with explicit index |

### HTTP Server
| Prefix | Description |
|--------|-------------|
| `serve` | `serve:` block |
| `respond` | `yield net.respond(status, body)` |
| `respondh` | `yield net.respond` with headers |
| `respondi` | `yield net.respond` with inline JSON |
| `handleopts` | CORS OPTIONS preflight handler |
| `handle404` | 404 fallback handler |
| `authextract` | Extract Bearer token from Authorization header |
| `netget` | `net.get(url)` |
| `netpost` | `net.post(url, body)` |
| `netput` | `net.put(url, body)` |
| `netdel` | `net.delete(url)` |
| `netreq` | Low-level `net.request` builder |
| `netcheck` | Guard on response `.ok` field |

### Database
| Prefix | Description |
|--------|-------------|
| `database` | SQLite connection declaration |
| `databasef` | SQLite connection with all options |
| `dbsync` | `yield db.sync(table)` — CREATE TABLE IF NOT EXISTS |
| `dbdrop` | `yield db.drop(table)` |
| `dbhas` | `db.has(table)` — check table exists (no yield) |
| `dbfetch` | `yield db.fetch(table)` — SELECT * |
| `dbfetchw` | `yield db.fetch(table).where(...)` — SELECT with filter |
| `dbinsert` | `yield db.insert(table, values)` — positional args |
| `dbinsertn` | `yield db.insert(table, col = val)` — named args |
| `dbinsertid` | INSERT and read `insertId` |
| `dbpush` | `yield db.push(table)` — bulk INSERT |
| `dbsave` | `yield db.save(table)` — upsert |
| `dbremove` | `yield db.remove(table).where(...)` — DELETE with filter |
| `dbtruncate` | `yield db.truncate(table)` — DELETE all rows |
| `dbexec` | `yield db.exec(sql, params)` — raw SQL |
| `dbquery` | `yield db.query(table, sql, params)` — typed raw SQL |
| `dbraw` | `yield db.queryRaw(sql)` — returns JSON array |
| `dbrawfirst` | `queryRaw(...).first()` — aggregate result |
| `dbtx` | `begin` / `commit` transaction block |
| `dbtxr` | Transaction with explicit `rollback` guard |
| `dbclose` | `db.isOpen()` + `db.close()` |
| `tabledb` | Table with `@auto @pk` for database use |
| `tablefk` | Table with `@fk` foreign key column |
| `dbvarfix` | Fiber-scoped DB variable workaround (Windows S101) |

### Tables
| Prefix | Description |
|--------|-------------|
| `table` | Empty table with `@auto` id |
| `tabledata` | Table with initial rows |
| `where` | `.where(col == val)` filter |
| `wherechain` | Chained `.where()` filters |
| `wherelambda` | `.where(row -> ...)` lambda filter |
| `wherehas` | `.where(col HAS "substring")` |
| `join` | Key-based inner join |
| `joinlambda` | Lambda inner join |
| `insert` | `.insert(values)` |
| `tadd` | `.add(values)` (alias for insert) |
| `taddn` | `.add(col = val)` named arguments |
| `update` | `.update(idx, values)` |
| `delete` | `.delete(idx)` |
| `tcount` | `.count()` — number of rows |
| `tshow` | `.show()` — print table to terminal |
| `ttojson` | `.toJson()` — serialize to JSON array |
| `tget` | Get field from row |
| `tfind` | Find row index by field value |

### JSON
| Prefix | Description |
|--------|-------------|
| `jsonraw` | JSON raw block literal |
| `jsonp` | `json.parse(string)` |
| `jset` | `.set(key, value)` |
| `jbind` | `.bind(key, var)` — extract into variable |
| `jbindpath` | `.bind("parent.child", var)` — nested dot-path |
| `jexists` | `.exists(key)` guard |
| `jpush` | Append to JSON array node via `.push()` |
| `jbracket` | Set JSON array element via bracket notation |
| `jinject` | `.inject()` — bulk import array into table |
| `jstr` | `.toStr()` — serialize to string |
| `jsize` | `.size()` / `.count()` |
| `jfirst` | `.first()` — first element of JSON array |
| `jresp` | Build JSON response and yield |

### Arrays
| Prefix | Description |
|--------|-------------|
| `array` | Array declaration (includes `array:json`) |
| `arraye` | Empty array |
| `arrayjsonloop` | Iterate over `array:json` with index |

### Sets
| Prefix | Description |
|--------|-------------|
| `setr` | Set with inclusive range |
| `setrs` | Set with range and `@step` |
| `sete` | Set with explicit elements |
| `setunion` | `UNION` operation |
| `setintersect` | `INTERSECTION` operation |
| `setdiff` | `DIFFERENCE` operation |
| `setsymdiff` | `SYMMETRIC_DIFFERENCE` operation |
| `setadd` | `.add(value)` |
| `setremove` | `.remove(value)` |
| `setcontains` | `.contains(value)` |

### Random
| Prefix | Description |
|--------|-------------|
| `randchoice` | `random.choice from` set or array |
| `randint` | `random.int(min, max)` |
| `randints` | `random.int(min, max @step n)` |
| `randfloat` | `random.float(min, max)` |
| `randfloats` | `random.float(min, max @step n)` |

### Maps
| Prefix | Description |
|--------|-------------|
| `map` | Empty map |
| `mapd` | Map with initial data |
| `mapget` | Safe `.get()` with `.contains()` guard |
| `maptojson` | `.toJson()` — serialize to JSON object |
| `mapkv` | `.keys()` / `.values()` — get arrays |

### Strings
| Prefix | Description |
|--------|-------------|
| `strlen` | `.length` property |
| `strcase` | `.upper()` / `.lower()` |
| `strtrim` | `.trim()` |
| `strreplace` | `.replace(find, replace)` |
| `strslice` | `.slice(start, end)` |
| `strindex` | `.indexOf(search)` / `.lastIndexOf(search)` |
| `strsplit` | `.split(separator)` → `array:s` |
| `strbound` | `.startsWith()` / `.endsWith()` |
| `strparse` | `.toInt()` / `.toFloat()` |
| `strchain` | Normalization chain: trim + lower + replace |
| `strconcat` | Integer digit concatenation `++` |

### Date
| Prefix | Description |
|--------|-------------|
| `datenow` | `date.now()` |
| `datelit` | Date from ISO string |
| `datelitf` | Date from string with custom format |
| `datefmt` | Format date to string |
| `datearith` | Add / subtract days |
| `datediff` | Days between two dates |
| `dateprop` | Access `.year`, `.month`, `.day`, `.hour`, `.minute`, `.second` |
| `ratelimitkey` | Per-minute rate limit key from IP + timestamp |

### Perf (Performance Timer)
| Prefix | Description |
|--------|-------------|
| `perfms` | `perf.ms()` — elapsed milliseconds since VM start |
| `perfus` | `perf.us()` — elapsed microseconds since VM start |
| `perfns` | `perf.ns()` — elapsed nanoseconds since VM start |
| `perfbench` | Benchmark block: start + end + print elapsed ms |

### Env
| Prefix | Description |
|--------|-------------|
| `envget` | `env.get("VAR")` — read environment variable |
| `envargs` | `env.args()` — CLI arguments as `array:s` |
| `envargsloop` | Get and iterate CLI arguments |

### Input (Raw Keys)
| Prefix | Description |
|--------|-------------|
| `inputkey` | `input.key()` — read key if available |
| `inputkeyw` | `input.key() @wait` — block until key pressed |
| `inputready` | `input.ready()` — check if key is waiting |
| `inputhandle` | Arrow key + ESC handler (if/elif block) |

### Terminal Commands
| Prefix | Description |
|--------|-------------|
| `termclear` | `.terminal !clear` |
| `termexit` | `.terminal !exit` |
| `termraw` | `.terminal !raw` — enable raw mode |
| `termnormal` | `.terminal !normal` — restore normal mode |
| `termcursor` | `.terminal !cursor on/off` |
| `termmove` | `.terminal !move x y` |
| `termwrite` | `.terminal !write expr` |
| `termrun` | `.terminal !run "file.xcx"` |
| `gameloop` | Full game loop with raw terminal + arrow key input |

### Error Handling
| Prefix | Description |
|--------|-------------|
| `alert` | `halt.alert` — warning, continues |
| `herror` | `halt.error` — aborts current frame |
| `fatal` | `halt.fatal` — terminates VM |
| `safediv` | Guard against division by zero |

### Store (File I/O)
| Prefix | Description |
|--------|-------------|
| `storewrite` | `store.write(path, content)` |
| `storeread` | `store.read(path)` with `exists()` guard |
| `storeappend` | `store.append(path, content)` |
| `storedelete` | `store.delete(path)` |
| `storelist` | `store.list(path)` → `array:s` |
| `storeisdir` | `store.isDir(path)` |
| `storesize` | `store.size(path)` → bytes |
| `storemkdir` | `store.mkdir(path)` |
| `storeglob` | `store.glob(pattern)` → `array:s` |
| `storezip` | `store.zip` / `store.unzip` |

### Crypto
| Prefix | Description |
|--------|-------------|
| `cryptohash` | `crypto.hash(password, "argon2")` |
| `cryptobcrypt` | `crypto.hash(password, "bcrypt")` |
| `cryptob64enc` | `crypto.hash(data, "base64_encode")` |
| `cryptob64dec` | `crypto.hash(data, "base64_decode")` |
| `cryptoverify` | `crypto.verify(input, hash, "argon2")` |
| `cryptotoken` | `crypto.token(32)` |

### Modules & I/O
| Prefix | Description |
|--------|-------------|
| `inc` | `include "module.xcx"` |
| `incas` | `include "module.xcx" as alias` |
| `print` | `>! value;` |
| `input` | Print prompt + read `>?` |
| `wait` | `@wait milliseconds;` |

---

## Diagnostics

The linter checks each `.xcx` file on every save/edit and reports:

- Missing `;` at end of statements (declarations, assignments, calls, I/O, `halt`, `include`, `yield`, `return`, `break`, `continue`, `input.*`, `.terminal !*`, database methods).
- Missing `then;` after `if`/`elif`/`elf` conditions.
- Missing `do;` after `while` and `for`.
- Missing `{` after `func`/`fiber` signature.
- `end` without `;`.
- `else`/`els` without `;`.
- Unclosed `<<<` raw JSON block on a single line (warning).
- Unbalanced `<<<`/`>>>` across the whole file.
- Malformed `yield from` — must be `yield from <identifier>;`.

---

## PAX Package Manager

The extension fully supports `.pax` files used by the PAX package manager.

### Highlighted elements in `project.pax`

- **Block delimiters** `/` — opening and closing of the configuration block.
- **Metadata keys** — `name`, `version`, `author`, `description`, `main`, `tags`, `files`, `deps`.
- **String values** — all quoted strings.
- **Version pins** — `@1.2.0` in dependency strings.
- **Semantic version values** — `"1.0.0"` literal version strings.
- **GitHub shortcuts** — `user/repo` format inside dependency strings.
- **Direct URLs** — `https://...` dependency URLs.
- **Operators** — `::` separator, `,` delimiter.
- **Comments** — `--- single line` and `--- / *---` block comments.

### Example `project.pax`

```pax
---
PAX Project Configuration
*---
/
    name        :: "my_project",
    version     :: "1.0.0",
    author      :: "DeveloperName",
    description :: "A quick description.",
    main        :: "src/app.xcx",
    tags        :: ["math", "utility"],
    files       :: ["src/main.xcx", "src/lib.xcx"],
    deps        :: [
        "mathlib@1.2.0",
        "user/repo",
        "https://domain.com/lib.xcx"
    ]
/
```

---

## Links

| | |
|---|---|
| Official website | [xcxlang.com](https://xcxlang.com) |
| PAX Registry | [pax.xcxlang.com](https://pax.xcxlang.com) |
| Web Playground | [playground.xcxlang.com](https://playground.xcxlang.com) |
| GitHub | [xcxlang-org/xcx](https://github.com/xcxlang-org/xcx) |

---

## Installation

1. Download the `.vsix` file.
2. Open VS Code.
3. Go to the Extensions view (`Ctrl+Shift+X`).
4. Click the `...` menu and select **Install from VSIX...**.
5. Choose the downloaded `.vsix` file.