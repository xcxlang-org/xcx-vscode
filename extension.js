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
    const tokenTypes = ['comment'];
    const legend = new vscode.SemanticTokensLegend(tokenTypes, []);
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'xcx' },
            new XcxSemanticTokensProvider(),
            legend
        )
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'pax' },
            new XcxSemanticTokensProvider(),
            legend
        )
    );
}

function deactivate() { }

function validateDocument(document, diagnostics) {
    if (document.languageId !== 'xcx') return;
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
        checkEndSemicolon(trimmed, raw, i, errors);
        checkElseSemicolon(trimmed, raw, i, errors);
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
    return new vscode.Diagnostic(range, message, severity ?? vscode.DiagnosticSeverity.Error);
}

function endCol(raw) { return raw.trimEnd().length; }

// ── checks ────────────────────────────────────────────────────

function checkMissingSemicolon(trimmed, raw, i, errors) {
    const skip = [
        /^\{$/, /\{$/, /^end[;\s]/, /^end$/, /^\};/, /^\}$/,
        /^---/, /^<<</, /^>>>/, /^serve:/, /^table:/, /^map:/,
        /^database:/, /^columns\s*=/, /^rows\s*=/, /^schema\s*=/, /^data\s*=/,
        /^port\s*=/, /^host\s*=/, /^workers\s*=/, /^routes\s*=/,
        /^engine\s*=/, /^path\s*=/, /^timeout\s*=/, /^readonly\s*=/,
        /^\[/, /^\]$/, /,$/, /^".*::/, /^\*/,
        /^elseif\b/, /^elif\b/, /^elf\b/, /^else[;\s]/, /^els[;\s]/,
        /^else$/, /^els$/,
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

    if (!trimmed.trimEnd().endsWith(';')) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Brakujący średnik ';' na końcu instrukcji."));
    }
}

function checkIfThen(trimmed, raw, i, errors) {
    if (!/^(if|elif|elseif|elf)\s*\(/.test(trimmed)) return;
    if (!/\bthen\s*;/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Oczekiwane 'then;' po warunku if."));
    }
}

function checkWhileDo(trimmed, raw, i, errors) {
    if (!/^while\s*\(/.test(trimmed)) return;
    if (!/\bdo\s*;/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Oczekiwane 'do;' po warunku while."));
    }
}

function checkForDo(trimmed, raw, i, errors) {
    if (!/^for\s+/.test(trimmed)) return;
    if (!/\bdo\s*;/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Oczekiwane 'do;' w pętli for."));
    }
}

function checkFuncFiberBrace(trimmed, raw, i, errors) {
    if (!/^(func|fiber)\s/.test(trimmed)) return;
    if (!trimmed.includes('{')) {
        const col = endCol(raw);
        errors.push(makeDiag(i, col, col + 1, "Oczekiwane '{' po sygnaturze func/fiber."));
    }
}

function checkEndSemicolon(trimmed, raw, i, errors) {
    if (!/^end\b/.test(trimmed)) return;
    if (!trimmed.includes(';')) {
        const col = raw.indexOf('end');
        errors.push(makeDiag(i, col, col + 3, "'end' musi kończyć się średnikiem: 'end;'."));
    }
}

function checkElseSemicolon(trimmed, raw, i, errors) {
    if (!/^(else|els)\s*$/.test(trimmed)) return;
    const col = endCol(raw);
    errors.push(makeDiag(i, col, col + 1, "'else' musi kończyć się średnikiem: 'else;'."));
}

function checkUnclosedRawBlock(trimmed, raw, i, errors) {
    const opens = (trimmed.match(/<<</g) || []).length;
    const closes = (trimmed.match(/>>>/g) || []).length;
    if (opens > closes) {
        const col = raw.indexOf('<<<');
        errors.push(makeDiag(i, col, col + 3,
            "Niezamknięty blok JSON '<<<' — brakuje '>>>'.",
            vscode.DiagnosticSeverity.Warning));
    }
}

function checkYieldFrom(trimmed, raw, i, errors) {
    if (!/^yield\s+from\b/.test(trimmed)) return;
    if (!/^yield\s+from\s+[a-zA-Z_][a-zA-Z0-9_]*\s*;/.test(trimmed)) {
        const col = endCol(raw);
        errors.push(makeDiag(i, 0, raw.length,
            "'yield from' musi być w formie: yield from <nazwa_fibera>;"));
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
                "Nieoczekiwane '>>>' bez pasującego '<<<'."));
            depth = 0;
        }
    }
    if (depth > 0 && openLine >= 0) {
        errors.push(makeDiag(openLine, 0, lines[openLine].length,
            "Niezamknięty blok JSON '<<<' — brakuje '>>>' do końca pliku."));
    }
}

// ── Semantic Token Comment Provider and Helpers ──────────────

class XcxSemanticTokensProvider {
    provideDocumentSemanticTokens(document, token) {
        const tokenTypes = ['comment'];
        const legend = new vscode.SemanticTokensLegend(tokenTypes, []);
        const builder = new vscode.SemanticTokensBuilder(legend);
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

module.exports = { activate, deactivate };