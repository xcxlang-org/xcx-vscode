const vscode = require('vscode');

function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection('xcx');
    context.subscriptions.push(diagnostics);

    if (vscode.window.activeTextEditor) {
        validateDocument(vscode.window.activeTextEditor.document, diagnostics);
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => validateDocument(e.document, diagnostics))
    );
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(ed => { if (ed) validateDocument(ed.document, diagnostics); })
    );
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri))
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration('xcx.linter')) return;
            for (const doc of vscode.workspace.textDocuments) {
                if (doc.languageId !== 'xcx') continue;
                if (linterEnabled()) validateDocument(doc, diagnostics);
                else diagnostics.delete(doc.uri);
            }
        })
    );

    // ── Providers ────────────────────────────────────────────────
    const selector = [{ language: 'xcx' }, { language: 'pax' }];
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(selector, new XcxHoverProvider())
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'xcx' },
            new XcxDocumentSymbolProvider()
        )
    );

    // ── <<< auto-expand ──────────────────────────────────────────
    // VS Code's autoClosingPairs turns <<< into <<<>>> with cursor between them.
    // We detect that and immediately expand it to <<<{}>>> with cursor inside {}.
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId !== 'xcx') return;
            for (const change of e.contentChanges) {
                // We're looking for the third '<' being typed (text === '<')
                if (change.text !== '<') continue;

                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document !== e.document) continue;

                // After VS Code processes autoClosingPairs the line now contains <<<>>>
                // and the cursor sits between <<< and >>>
                const cursor = editor.selection.active;
                const lineText = editor.document.lineAt(cursor.line).text;
                const col = cursor.character;

                // Expect: ...<<<>>> where cursor is right after <<<, i.e. before >>>
                if (lineText.slice(col - 3, col) !== '<<<') continue;
                if (lineText.slice(col, col + 3) !== '>>>') continue;

                // Replace <<<>>> with <<<{}>>> and place cursor between { and }
                editor.edit(eb => {
                    const range = new vscode.Range(
                        new vscode.Position(cursor.line, col - 3),
                        new vscode.Position(cursor.line, col + 3)
                    );
                    eb.replace(range, '<<<{}>>>');
                }, { undoStopBefore: false, undoStopAfter: false }).then(() => {
                    // cursor goes between { and }, which is at col - 3 + 4
                    const newCol = col - 3 + 4;
                    const newPos = new vscode.Position(cursor.line, newCol);
                    editor.selection = new vscode.Selection(newPos, newPos);
                });
            }
        })
    );

    // ── Semantic Token Comments ──────────────────────────────────
    const legend = new vscode.SemanticTokensLegend(['comment'], []);
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'xcx' },
            new XcxSemanticTokensProvider(legend),
            legend
        )
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'pax' },
            new XcxSemanticTokensProvider(legend),
            legend
        )
    );
}

function deactivate() { }

function linterEnabled() {
    return vscode.workspace.getConfiguration('xcx').get('linter.enabled', true);
}

function validateDocument(document, diagnostics) {
    if (document.languageId !== 'xcx') return;
    if (!linterEnabled()) {
        diagnostics.delete(document.uri);
        return;
    }
    const errors = [];
    const lines = document.getText().split('\n');
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = stripComment(raw);
        const trimmed = line.trim();
        if (trimmed === '') continue;
        checkMissingSemicolon(trimmed, raw, i, errors);
        checkIfThen(trimmed, raw, i, errors);
        checkWhileDo(trimmed, raw, i, errors);
        checkForDo(trimmed, raw, i, errors);
        checkFuncFiberBrace(trimmed, raw, i, errors);
        checkDeprecatedBlockSemicolon(trimmed, raw, i, errors);
        checkUnclosedRawBlock(trimmed, raw, i, errors);
        checkYieldFrom(trimmed, raw, i, errors);
    }
    checkRawBlockBalance(lines, errors);
    diagnostics.set(document.uri, errors);
}

// ── helpers ──────────────────────────────────────────────────

function stripComment(line) {
    let inStr = false;
    for (let i = 0; i < line.length - 2; i++) {
        if (line[i] === '"') inStr = !inStr;
        if (!inStr && line[i] === '-' && line[i + 1] === '-' && line[i + 2] === '-') {
            return line.substring(0, i);
        }
    }
    return line;
}

function makeDiag(lineIdx, colStart, colEnd, message, severity) {
    const range = new vscode.Range(
        new vscode.Position(lineIdx, colStart),
        new vscode.Position(lineIdx, colEnd)
    );
    const diag = new vscode.Diagnostic(range, message, severity ?? vscode.DiagnosticSeverity.Error);
    diag.source = 'xcx';
    return diag;
}

function endCol(raw) { return raw.trimEnd().length; }

// ── checks ────────────────────────────────────────────────────

function checkMissingSemicolon(trimmed, raw, i, errors) {
    const skip = [
        /\{$/, /^end[;\s]/, /^end$/, /^\};/, /^\}$/,
        /^---/, /^<<</, /^>>>/, /^serve:/, /^table:/, /^map:/,
        /^database:/, /^columns\s*=/, /^rows\s*=/, /^schema\s*=/, /^data\s*=/,
        /^port\s*=/, /^host\s*=/, /^workers\s*=/, /^routes\s*=/,
        /^engine\s*=/, /^path\s*=/, /^timeout\s*=/, /^readonly\s*=/,
        /^\[/, /^\]$/, /,$/, /^".*::/, /^\*/,
        /^elseif\b/, /^elif\b/, /^else[;\s]/,
        /^else$/,
        /^yield\s+from\b/,
        /^net\.request\s*\{/, /^net\.request\s*$/,
        /^method\s*=/, /^url\s*=/, /^headers\s*=/, /^body\s*=/, /^workers\s*=/,
    ];
    for (const p of skip) if (p.test(trimmed)) return;

    const needs = [
        // short-form primitive type declarations: i: x = ..., f: y = ..., etc.
        /^(i|f|s|b)\s*:/,
        // long-form aliases: int: x, float: y, str: z, bool: flag
        /^(int|float|str|bool)\s*:/,
        // complex types
        /^(json|date|array:[a-z]+|set:[NZQSBC]|map|table|fiber(:[a-zA-Z]+)?|database)\s*:/,
        /^const\s/, /^>!/, /^>\?/, /^@wait\s/,
        /^halt\.(alert|error|fatal)/,
        /^include\s/, /^yield\b/, /^return\b/,
        /^break$/, /^continue$/,
        /^\.[a-zA-Z]+\s*![a-z]+/,
        /^\.terminal\s*!/,
        /^[a-zA-Z_][a-zA-Z0-9_.]*\s*=[^=]/,
        /^[a-zA-Z_][a-zA-Z0-9_.]*\(.*\)\s*$/,
        /^store\./, /^db\.[a-zA-Z]+\.(insert|update|delete)/,
        /^[a-zA-Z_][a-zA-Z0-9_.]*\.(insert|update|delete|push|set|bind|add|remove|clear|sync|drop|save|truncate|exec|begin|commit|rollback|close)\(/,
        /^input\.(key|ready)\(/,
        /^[a-zA-Z_][a-zA-Z0-9_]*\.(begin|commit|rollback|close)\(\)/,
    ];
    let should = false;
    for (const p of needs) if (p.test(trimmed)) { should = true; break; }
    if (!should) return;

    // XCX 4.4: single-line block declarations (array:/set:/map:/table:/database: with { ... })
    // end the statement with '}' — no semicolon required.
    if (/\}\s*$/.test(trimmed)) return;

    if (!trimmed.trimEnd().endsWith(';')) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Missing semicolon ';' at end of statement."));
    }
}

function checkIfThen(trimmed, raw, i, errors) {
    if (!/^(if|elif|elseif)\s*\(/.test(trimmed)) return;
    if (!/\bthen\b/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Expected 'then' after if condition."));
    }
}

function checkWhileDo(trimmed, raw, i, errors) {
    if (!/^while\s*\(/.test(trimmed)) return;
    if (!/\bdo\b/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Expected 'do' after while condition."));
    }
}

function checkForDo(trimmed, raw, i, errors) {
    if (!/^for\s+/.test(trimmed)) return;
    if (!/\bdo\b/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Expected 'do' in for loop."));
    }
}

function checkFuncFiberBrace(trimmed, raw, i, errors) {
    if (!/^(func|fiber)\s/.test(trimmed)) return;
    if (!trimmed.includes('{')) {
        const col = endCol(raw);
            errors.push(makeDiag(i, col, col + 1, "Expected '{' after func/fiber signature."));
    }
}

// XCX 4.4: semicolons after block terminators are optional (removed in XCX 5.0).
function checkDeprecatedBlockSemicolon(trimmed, raw, i, errors) {
    let token = null;
    let m = /(?:^|\s)(end|else)\s*;\s*$/.exec(trimmed);
    if (m) {
        token = m[1];
    } else if ((m = /\b(then|do)\s*;\s*$/.exec(trimmed))) {
        token = m[1];
    } else if (/\}\s*;\s*$/.test(trimmed)) {
        token = '}';
    }
    if (!token) return;
    const col = endCol(raw) - 1;
    errors.push(makeDiag(i, col, col + 1,
        "Semicolon after '" + token + "' is optional since XCX 4.4 and will be removed in XCX 5.0.",
        vscode.DiagnosticSeverity.Warning));
}

function checkUnclosedRawBlock(trimmed, raw, i, errors) {
    const opens = (trimmed.match(/<<</g) || []).length;
    const closes = (trimmed.match(/>>>/g) || []).length;
    if (opens > closes) {
        const col = raw.indexOf('<<<');
        errors.push(makeDiag(i, col, col + 3,
            "Unclosed JSON block '<<<' — missing '>>>'.",
            vscode.DiagnosticSeverity.Warning));
    }
}

function checkYieldFrom(trimmed, raw, i, errors) {
    if (!/^yield\s+from\b/.test(trimmed)) return;
    if (!/^yield\s+from\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, 0, raw.length,
            "'yield from' must have the form: yield from <fiber_name>;"));
    }
}

function checkRawBlockBalance(lines, errors) {
    let depth = 0, openLine = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = stripComment(lines[i]);
        const opens = (line.match(/<<</g) || []).length;
        const closes = (line.match(/>>>/g) || []).length;
        if (opens > 0 && depth === 0) openLine = i;
        depth += opens - closes;
        if (depth < 0) {
            errors.push(makeDiag(i, 0, lines[i].length,
                "Unexpected '>>>' without matching '<<<'."));
            depth = 0;
        }
    }
    if (depth > 0 && openLine >= 0) {
        errors.push(makeDiag(openLine, 0, lines[openLine].length,
            "Unclosed JSON block '<<<' — missing '>>>' before end of file."));
    }
}

// ── Semantic Token Comment Provider and Helpers ──────────────

class XcxSemanticTokensProvider {
    constructor(legend) {
        this.legend = legend;
    }

    provideDocumentSemanticTokens(document, token) {
        const builder = new vscode.SemanticTokensBuilder(this.legend);
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) {
            lines.push(document.lineAt(i).text);
        }

        let i = 0;
        while (i < lines.length) {
            const lineText = lines[i];
            const trimmed = lineText.trim();

            if (trimmed === '---') {
                let foundClose = false;
                let foundInterveningStart = false;

                for (let j = i + 1; j < lines.length; j++) {
                    const nextTrimmed = lines[j].trim();
                    if (nextTrimmed === '*---') {
                        foundClose = true;
                        break;
                    }
                    if (nextTrimmed === '---') {
                        foundInterveningStart = true;
                        break;
                    }
                }

                if (foundClose && !foundInterveningStart) {
                    while (i < lines.length) {
                        const currentLineText = lines[i];
                        builder.push(
                            new vscode.Range(
                                new vscode.Position(i, 0),
                                new vscode.Position(i, currentLineText.length)
                            ),
                            'comment'
                        );
                        if (currentLineText.trim() === '*---') {
                            break;
                        }
                        i++;
                    }
                } else {
                    builder.push(
                        new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, lineText.length)
                        ),
                        'comment'
                    );
                }
            } else {
                const commentIdx = getCommentStartIndex(lineText);
                if (commentIdx !== -1) {
                    builder.push(
                        new vscode.Range(
                            new vscode.Position(i, commentIdx),
                            new vscode.Position(i, lineText.length)
                        ),
                        'comment'
                    );
                }
            }
            i++;
        }

        return builder.build();
    }
}

function getCommentStartIndex(line) {
    let inStr = false;
    for (let i = 0; i < line.length - 2; i++) {
        if (line[i] === '"') {
            let escape = false;
            let checkIdx = i - 1;
            while (checkIdx >= 0 && line[checkIdx] === '\\') {
                escape = !escape;
                checkIdx--;
            }
            if (!escape) {
                inStr = !inStr;
            }
        }
        if (!inStr && line[i] === '-' && line[i + 1] === '-' && line[i + 2] === '-') {
            return i;
        }
    }
    return -1;
}

// ── Hover documentation ──────────────────────────────────────

function xcxDoc(signature, description) {
    const ms = new vscode.MarkdownString();
    ms.appendCodeblock(signature, 'xcx');
    ms.appendText(description);
    return ms;
}

const XCX_HOVER_DOCS = {
    // keywords
    'func': xcxDoc('func name(s: param -> i) { ... }',
        'Function declaration. Parameters are "type: name". The "-> type" part declares the return type; without it the function returns nothing.'),
    'fiber': xcxDoc('fiber name(json: req -> json) {\n    yield value;\n}',
        'Fiber (coroutine) declaration. Instantiate with "fiber:TYPE: f = name(args);" and consume with .next(), .run() or "for x in f". "yield from subFiber;" delegates to a sub-fiber.'),
    'const': xcxDoc('const i: NAME = 42;',
        'Constant declaration. Type is required: i, f, s, b (or int, float, str, bool).'),
    'serve': xcxDoc('serve: api {\n    port = 8080,\n    host = "0.0.0.0",\n    workers = 4,\n    routes = [\n        "GET /api/items" :: handle_get\n    ]\n}',
        'HTTP server block — terminal expression. Routes map "METHOD /path" to handler fibers (json: req -> json).'),
    'include': xcxDoc('include "module.xcx";\ninclude "module.xcx" as alias;',
        'Import another XCX module into the current namespace. With "as alias" all imported names are prefixed with the alias.'),
    'yield': xcxDoc('yield value;\nyield;\nyield from subFiber;',
        'Suspend a fiber and produce a value (typed fibers). Bare "yield;" for void fibers. "yield from" delegates yielding to a sub-fiber.'),
    'from': xcxDoc('random.choice from my_set;\nyield from sub_fiber;',
        'Keyword used by "random.choice from <collection>" and "yield from <fiber>" (delegation).'),
    'end': xcxDoc('if (x) then\n    ...\nend',
        'Closes if/while/for/func/fiber blocks. The trailing semicolon is optional since XCX 4.4 and will be removed in XCX 5.0.'),
    'if': xcxDoc('if (x > 0) then\n    ...\nend',
        'Conditional. The block opens with "then" and closes with "end". Alternative branches: elif (or elseif) and else.'),
    'elif': xcxDoc('elif (cond) then\n    ...;',
        'Else-if branch of an if statement (alias: elseif).'),
    'else': xcxDoc('else\n    ...;', 'Final branch of an if statement.'),
    'while': xcxDoc('while (n > 0) do\n    ...\nend',
        'Loop — the body opens with "do" and closes with "end".'),
    'for': xcxDoc('for i in 0 to n do\n    ...\nend\nfor item in collection do\n    ...\nend',
        'Iteration. Numeric inclusive range with "in start to end" (optional "@step n"), or over arrays, sets, tables and fibers.'),
    'to': xcxDoc('for i in 0 to n do', 'Upper bound of a numeric for range — inclusive.'),
    'in': xcxDoc('for item in collection do', 'Iteration keyword of for loops (ranges and collections).'),
    'break': xcxDoc('break;', 'Exit the enclosing while/for loop immediately (fibers are closed automatically).'),
    'continue': xcxDoc('continue;', 'Skip to the next iteration of the enclosing loop.'),
    'return': xcxDoc('return value;\nreturn;', 'Return a value from a func (typed with "-> type") or leave a void func/fiber.'),
    'as': xcxDoc('net.request { ... } as resp;\ninclude "m.xcx" as alias;',
        'Binds the result of an expression (e.g. net.request) or names an included module alias.'),
    'EMPTY': xcxDoc('rows = [EMPTY];',
        'Empty placeholder literal — used for empty collections, e.g. table rows or map data.'),
    // types
    'json': xcxDoc('json: resp <<< {"status": "ok"} >>>;',
        'JSON value type. Inline literals use raw blocks <<< ... >>>; parse strings with json.parse(). Values provide .set, .get, .bind, .exists, .push, .inject, .toStr, .size, .first.'),
    'date': xcxDoc('date: d = date("2026-01-01");',
        'Date/time type. Create with date.now() or date(str [, format]). Supports day arithmetic (d + 1, a - b = days) and exposes .year, .month, .day, .hour, .minute, .second; format with .format("DD/MM/YYYY HH:mm").'),
    'array': xcxDoc('array:i: a {1, 2, 3};',
        'Homogeneous array with element type i, f, s, b or json. Iterate with "for x in a"; access with .get(idx), .size().'),
    'set': xcxDoc('set:N: r {1,,10};',
        'Set with domain N, Z, Q, S, B or C. Numeric domains support ranges {start,,end} and "@step". Operations: UNION, INTERSECTION, DIFFERENCE, SYMMETRIC_DIFFERENCE. Methods: .add, .remove, .contains.'),
    'map': xcxDoc('map: m {\n    schema = [s <-> i]\n    data = ["key" :: 1]\n}',
        'Key-value map with a typed schema "keyType <-> valueType". Methods: .get, .contains, .keys, .values, .toJson.'),
    'table': xcxDoc('table: users {\n    columns = [\n        id :: i @auto @pk,\n        name :: s\n    ]\n    rows = [EMPTY]\n}',
        'In-memory table with typed columns. Methods: .where, .join, .insert, .add, .update, .delete, .count, .get, .show, .toJson. Tables with @pk can sync to a database.'),
    'database': xcxDoc('database: app {\n    engine = "sqlite",\n    path = "data.db"\n}',
        'SQLite database connection (options: engine, path, timeout, readonly). Operations on the handle: .sync, .drop, .has, .fetch, .insert, .push, .save, .remove, .truncate, .exec, .query, .queryRaw, .begin, .commit, .rollback, .close, .isOpen.'),
    // set domains
    'N': xcxDoc('set:N: r {1,,10};', 'Set domain: naturals.'),
    'Z': xcxDoc('set:Z: r {-5,,5};', 'Set domain: integers.'),
    'Q': xcxDoc('set:Q: r {0.5,,9.5};', 'Set domain: rationals (floats).'),
    'S': xcxDoc('set:S: s {"a", "b"};', 'Set domain: strings.'),
    'B': xcxDoc('set:B: s {true, false};', 'Set domain: booleans.'),
    'C': xcxDoc('set:C: s {...};', 'Set domain.'),
    // built-in modules
    'net': xcxDoc('json: resp = net.get(url);\nyield net.respond(200, body);',
        'HTTP networking. Requests: net.get, net.post, net.put, net.delete or the low-level net.request { method = ..., url = ..., headers = ..., body = ... } as resp;. Handlers answer with "yield net.respond(status, body [, headers])".'),
    'store': xcxDoc('store.write("file.txt", data);\ns: txt = store.read("file.txt");',
        'File I/O module: .read, .write, .append, .delete, .list, .mkdir, .isDir, .exists, .size, .glob, .zip, .unzip.'),
    'crypto': xcxDoc('s: hash = crypto.hash(password, "argon2");',
        'Hashing and tokens: crypto.hash(data, "argon2" | "bcrypt" | "base64_encode" | "base64_decode"), crypto.verify(input, hash, algo), crypto.token(bytes).'),
    'env': xcxDoc('s: val = env.get("HOME");\narray:s: args = env.args();',
        'Environment and CLI. env.get halts with an error if the variable is not set; env.args returns the CLI arguments.'),
    'input': xcxDoc('s: k = input.key();\ns: k = input.key() @wait;',
        'Raw keyboard input. input.key() is non-blocking (empty string when no key), with "@wait" it blocks; input.ready() checks the buffer. Requires ".terminal !raw".'),
    'perf': xcxDoc('i: t = perf.ms();',
        'Monotonic performance timers — elapsed time since VM start: perf.ms(), perf.us(), perf.ns().'),
    'random': xcxDoc('i: n = random.int(1, 100);\nf: x = random.float(0.0, 1.0);\ni: p = random.choice from my_set;',
        'Randomness. Ranges are inclusive and accept "@step"; random.choice picks an element from a set or array.'),
    'halt': xcxDoc('halt.alert >! "warning";\nhalt.error >! "error";\nhalt.fatal >! "fatal";',
        'Error signaling. alert logs and continues, error stops the current frame (caller continues), fatal terminates the entire VM.'),
    'terminal': xcxDoc('.terminal !raw;\n.terminal !move x y;\n.terminal !write expr;',
        'Terminal control directives: !clear, !exit, !raw, !normal, !cursor on|off, !move x y, !write expr, !run "file.xcx".'),
    // column attributes / decorators (word after @)
    'pk': xcxDoc('id :: i @auto @pk', 'Primary key column attribute. Required for db .save (upsert).'),
    'auto': xcxDoc('id :: i @auto', 'Auto-generated (auto-increment) column attribute.'),
    'unique': xcxDoc('email :: s @unique', 'Unique-constraint column attribute.'),
    'optional': xcxDoc('phone :: s @optional', 'Column may be empty/null.'),
    'default': xcxDoc('active :: b @default', 'Column default-value attribute.'),
    'fk': xcxDoc('user_id :: i @fk(users.id)', 'Foreign-key attribute pointing at another table column.'),
    'step': xcxDoc('for i in 0 to n @step 2 do\nset:N: r {0,,100 @step 2}',
        'Step modifier for ranges (for loops, set ranges, random ranges).'),
    'wait': xcxDoc('@wait 500;\ns: k = input.key() @wait;',
        'Synchronous delay in milliseconds; after input.key() it blocks until a key is pressed.'),
};

// Primitive type docs — only shown when the word sits in a type position,
// so a variable named "i" or "count" in a loop never triggers them.
const TYPE_CONTEXT_DOCS = {
    'i': xcxDoc('i: x = 5;', 'Integer primitive type (short form of int). Cast with i(value).'),
    'f': xcxDoc('f: x = 3.14;', 'Float primitive type (short form of float). Cast with f(value).'),
    's': xcxDoc('s: name = "XCX";', 'String primitive type (short form of str). Cast with s(value).'),
    'b': xcxDoc('b: ok = true;', 'Boolean primitive type (short form of bool).'),
    'int': xcxDoc('int: x = 5;', 'Integer primitive type — long-form alias of i.'),
    'float': xcxDoc('float: x = 3.14;', 'Float primitive type — long-form alias of f.'),
    'str': xcxDoc('str: name = "XCX";', 'String primitive type — long-form alias of s.'),
    'bool': xcxDoc('bool: ok = true;', 'Boolean primitive type — long-form alias of b.'),
};

// Operators are checked by position on the line (longest first).
const OPERATOR_DOCS = new Map([
    ['<->', xcxDoc('schema = [s <-> i]', 'Map schema separator: key type <-> value type.')],
    ['<=>', xcxDoc('a <=> b', 'Bridge operator (alternative bridge form).')],
    ['>!', xcxDoc('>! "Hello " + name;',
        'Output operator — prints to the terminal with a trailing newline. Also used by halt.alert / halt.error / halt.fatal to emit their message.')],
    ['>?', xcxDoc('>? var;', 'Input operator — reads a value from stdin into a previously declared variable.')],
    ['->', xcxDoc('func f(s: x -> i) { ... };\n.where(row -> row.age > 18)',
        'Declares the return type in func/fiber signatures; also introduces lambda expressions (e.g. in .where).')],
    ['::', xcxDoc('"GET /api/items" :: handle_get;\nschema = [s <-> i], data = ["key" :: 1]',
        'Pairing operator — binds routes to handlers and map/inject keys to values.')],
    ['++', xcxDoc('i: combined = 48 ++ 77;', 'Integer digit concatenation: 48 ++ 77 gives 4877.')],
    [',,', xcxDoc('set:N: r {1,,10};', 'Range separator in set literals — inclusive on both ends; combine with @step.')],
]);

function isTypeContext(line, range) {
    const before = line.slice(0, range.start.character);
    const after = line.slice(range.end.character);
    if (/^\s*\(/.test(after)) return true;                       // cast: i(...)
    if (/^:/.test(after) && (/^\s*$/.test(before) || /[(,]\s*$/.test(before) ||
        /\bconst\s+$/.test(before) || /\bfiber\s+$/.test(before) || /:\s*$/.test(before))) {
        return true;                                             // declaration / param: i: x
    }
    if (/->\s*$/.test(before)) return true;                      // return type: -> i
    if (/::\s*$/.test(before)) return true;                      // table column: id :: i
    return false;
}

const PAX_HOVER_DOCS = {
    'name': xcxDoc('name = "my-project"', 'PAX package name.'),
    'version': xcxDoc('version = "1.0.0"', 'PAX package version (semantic version).'),
    'author': xcxDoc('author = "Your Name"', 'PAX package author.'),
    'description': xcxDoc('description = "What it does"', 'PAX package description.'),
    'main': xcxDoc('main = "src/main.xcx"', 'Entry-point file of the package.'),
    'tags': xcxDoc('tags = ["web", "api"]', 'Search tags for the PAX registry.'),
    'files': xcxDoc('files = ["src/*.xcx"]', 'Files included when publishing.'),
    'deps': xcxDoc('deps = ["pkg@1.2.0", "user/repo"]',
        'Dependencies. Supports version pins (pkg@1.2.0), "latest", GitHub shortcuts (user/repo) and direct URLs.'),
};

class XcxHoverProvider {
    provideHover(document, position) {
        const line = document.lineAt(position.line).text;
        const docs = document.languageId === 'pax' ? PAX_HOVER_DOCS : XCX_HOVER_DOCS;

        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            const word = document.getText(wordRange);
            const doc = docs[word] ||
                (document.languageId === 'xcx' && TYPE_CONTEXT_DOCS[word] && isTypeContext(line, wordRange)
                    ? TYPE_CONTEXT_DOCS[word] : null);
            if (doc) return new vscode.Hover(doc, wordRange);
        }

        if (document.languageId !== 'xcx') return null;
        for (const [op, doc] of OPERATOR_DOCS) {
            let idx = line.indexOf(op);
            while (idx !== -1) {
                if (position.character >= idx && position.character < idx + op.length) {
                    const range = new vscode.Range(position.line, idx, position.line, idx + op.length);
                    return new vscode.Hover(doc, range);
                }
                idx = line.indexOf(op, idx + 1);
            }
        }
        return null;
    }
}

// ── Document symbols (Outline) ───────────────────────────────

class XcxDocumentSymbolProvider {
    provideDocumentSymbols(document) {
        const symbols = [];
        const lines = document.getText().split('\n');
        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            if (inBlockComment) {
                if (trimmed === '*---') inBlockComment = false;
                continue;
            }
            if (trimmed === '---') {
                // Block comment start — only skip content if it closes before the next '---'.
                let closes = false;
                for (let j = i + 1; j < lines.length; j++) {
                    const t = lines[j].trim();
                    if (t === '*---') { closes = true; break; }
                    if (t === '---') break;
                }
                if (closes) inBlockComment = true;
                continue;
            }

            const line = stripComment(lines[i]);

            // func/fiber declarations (name immediately followed by '(' — not fiber instances)
            let m = /^[ \t]*(?:func|fiber)(?::[a-zA-Z][a-zA-Z0-9_]*)?[ \t]+([a-zA-Z_][a-zA-Z0-9_]*)[ \t]*(?=\()/.exec(line);
            if (m) {
                symbols.push(makeSymbol(lines[i], i, m[0], m[1], vscode.SymbolKind.Function));
                continue;
            }
            // const declarations
            m = /^[ \t]*const[ \t]+(?:[a-zA-Z][a-zA-Z0-9_]*[ \t]*:[ \t]*)?([a-zA-Z_][a-zA-Z0-9_]*)/.exec(line);
            if (m) {
                symbols.push(makeSymbol(lines[i], i, m[0], m[1], vscode.SymbolKind.Constant));
                continue;
            }
            // structural blocks: serve / database / table / map (name followed by '{')
            m = /^[ \t]*(serve|database|table|map)[ \t]*:[ \t]*([a-zA-Z_][a-zA-Z0-9_]*)[ \t]*(?=\{|\r?$)/.exec(line);
            if (m) {
                const kind = m[1] === 'serve' ? vscode.SymbolKind.Module
                    : m[1] === 'database' ? vscode.SymbolKind.Object
                        : vscode.SymbolKind.Struct;
                symbols.push(makeSymbol(lines[i], i, m[0], m[2], kind));
            }
        }
        return symbols;
    }
}

function makeSymbol(rawLine, lineIdx, matched, name, kind) {
    // All symbol regexes end with the name (or a zero-width lookahead after it),
    // so the name always ends at the end of the match.
    const nameStart = matched.length - name.length;
    return new vscode.DocumentSymbol(
        name,
        '',
        kind,
        new vscode.Range(lineIdx, 0, lineIdx, rawLine.length),
        new vscode.Range(lineIdx, nameStart, lineIdx, nameStart + name.length)
    );
}

module.exports = { activate, deactivate };