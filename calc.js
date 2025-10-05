// ====== SELEÇÃO DE ELEMENTOS DO DOM ======
const exprEl = document.getElementById('expr');
const resultEl = document.getElementById('result');
const evalBtn = document.getElementById('evalBtn');
const clearBtn = document.getElementById('clearBtn');
const degBtn = document.getElementById('degRad');
const copyBtn = document.getElementById('copyRes');
const saveFav = document.getElementById('saveFav');
const historyEl = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');
const exportHistoryBtn = document.getElementById('exportHistory');
const precisionEl = document.getElementById('precision');
const showSteps = document.getElementById('showSteps');
const keypad = document.getElementById('keypad');
const notepad = document.getElementById('notepad');
const saveNotes = document.getElementById('saveNotes');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

// ====== CONFIGURAÇÃO DO MATH.JS ======
const mathConfig = { number: 'number' };
const math = window.math;
math.config(mathConfig);

// ====== ESTADO INICIAL ======
let degMode = true;
let ans = 0;
let history = loadHistory();
let historyIndex = history.length;
let drawing = false;

// ====== FUNÇÕES DE HISTÓRICO ======
function loadHistory() {
    try {
        const raw = localStorage.getItem('calc_history');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Erro ao carregar histórico:', e);
        return [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem('calc_history', JSON.stringify(history));
    } catch (e) {
        console.error('Erro ao salvar histórico:', e);
    }
}

function renderHistory() {
    historyEl.innerHTML = '';
    if (history.length === 0) {
        historyEl.innerHTML = '<div class="small" style="padding:10px;">Sem histórico ainda</div>';
        return;
    }

    history.slice().reverse().forEach((it, i) => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.style.cssText = 'padding:8px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;';

        const content = document.createElement('div');
        content.innerHTML = `
            <div style="font-weight:700;color:var(--text);">${escapeHtml(it.expr)}</div>
            <div class="small" style="color:var(--accent-light);">= ${escapeHtml(String(it.result))}</div>
        `;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:4px;';

        const useBtn = document.createElement('button');
        useBtn.className = 'btn ghost';
        useBtn.innerText = 'Usar';
        useBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
        useBtn.onclick = () => {
            exprEl.value = it.expr;
            exprEl.focus();
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'btn ghost';
        delBtn.innerText = '×';
        delBtn.style.cssText = 'padding:4px 8px;font-size:14px;color:var(--btn-clear);';
        delBtn.onclick = () => removeHistoryItem(history.length - 1 - i);

        actions.appendChild(useBtn);
        actions.appendChild(delBtn);
        el.appendChild(content);
        el.appendChild(actions);
        historyEl.appendChild(el);
    });
}

function removeHistoryItem(idx) {
    history.splice(idx, 1);
    saveHistory();
    renderHistory();
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ====== CONVERSÃO DEG/RAD ======
function toRadianWrapper(expr) {
    const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
    funcs.forEach(fn => {
        const re = new RegExp(`\\b${fn}\\s*\\(([^)]+)\\)`, 'g');
        expr = expr.replace(re, (match, group1) => {
            return `${fn}((${group1}) * pi / 180)`;
        });
    });
    return expr;
}

// ====== AVALIAÇÃO DE EXPRESSÃO ======
function evaluateExpression(raw) {
    if (!raw.trim()) return { result: '', error: null };
    
    try {
        let expr = raw
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .replace(/\u2212/g, '-')
            .replace(/√/g, 'sqrt');

        // Converte percentual: 50% -> 0.5
        expr = expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

        // Substitui 'ans' pelo último resultado
        expr = expr.replace(/\bans\b/g, `(${ans})`);

        // Converte para radianos se modo DEG
        if (degMode) {
            expr = toRadianWrapper(expr);
        }

        // Corrige funções sem parênteses (ex: sin45 -> sin(45))
        expr = expr.replace(/\b(sin|cos|tan|log|ln|sqrt|abs)\s*(\d+)/gi, '$1($2)');

        const res = math.evaluate(expr);

        // Formata resultado baseado na precisão
        const prec = Math.max(0, Math.min(20, parseInt(precisionEl.value || 8, 10)));
        let display;

        if (typeof res === 'number') {
            if (!Number.isFinite(res)) {
                display = res === Infinity ? '∞' : res === -Infinity ? '-∞' : 'NaN';
            } else {
                // Remove zeros desnecessários
                display = parseFloat(res.toFixed(prec));
            }
        } else if (math.typeOf(res) === 'Complex') {
            display = `${res.re.toFixed(prec)} ${res.im >= 0 ? '+' : ''} ${res.im.toFixed(prec)}i`;
        } else if (Array.isArray(res) || (res && res.entries)) {
            display = JSON.stringify(res);
        } else {
            display = String(res);
        }

        // Atualiza 'ans' apenas se for número válido
        if (typeof res === 'number' && Number.isFinite(res)) {
            ans = res;
        }

        // Adiciona ao histórico
        history.push({
            expr: raw,
            result: display,
            time: Date.now()
        });

        // Limita tamanho do histórico
        if (history.length > 200) {
            history.shift();
        }

        saveHistory();
        renderHistory();
        historyIndex = history.length;

        return { result: display, error: null, rawResult: res };
    } catch (err) {
        console.error('Erro na avaliação:', err);
        return { result: null, error: err.message || String(err) };
    }
}

// ====== FUNÇÕES DE UI ======
function doEval() {
    const raw = exprEl.value;
    const out = evaluateExpression(raw);
    
    if (out.error) {
        resultEl.innerHTML = `<span style="color:var(--btn-clear);">Erro: ${escapeHtml(out.error)}</span>`;
        resultEl.dataset.raw = '';
    } else {
        resultEl.innerHTML = `Resultado: <strong style="color:var(--accent-light);">${escapeHtml(String(out.result))}</strong>`;
        resultEl.dataset.raw = String(out.rawResult || out.result);
    }
    
    tryPlot(raw);
}

function insertAtCursor(input, text) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const v = input.value;
    
    input.value = v.slice(0, start) + text + v.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
}

// ====== EVENT LISTENERS ======
evalBtn.onclick = () => doEval();

clearBtn.onclick = () => {
    exprEl.value = '';
    resultEl.innerHTML = 'Resultado: —';
    exprEl.focus();
};

degBtn.onclick = () => {
    degMode = !degMode;
    degBtn.innerText = degMode ? 'DEG' : 'RAD';
    degBtn.style.background = degMode ? 'var(--accent)' : 'var(--bg-card)';
    degBtn.style.color = degMode ? 'white' : 'var(--text)';
    exprEl.focus();
};

copyBtn.onclick = async () => {
    try {
        const text = resultEl.dataset.raw || resultEl.innerText.replace('Resultado: ', '');
        await navigator.clipboard.writeText(text);
        copyBtn.innerText = '✓ Copiado';
        setTimeout(() => copyBtn.innerText = 'Copiar', 1500);
    } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar para área de transferência');
    }
};

saveFav.onclick = () => {
    const last = history[history.length - 1];
    if (last) {
        try {
            const favs = JSON.parse(localStorage.getItem('calc_favs') || '[]');
            favs.push(last);
            localStorage.setItem('calc_favs', JSON.stringify(favs));
            saveFav.innerText = '★ Salvo';
            setTimeout(() => saveFav.innerText = 'Favorito', 1500);
        } catch (e) {
            console.error('Erro ao salvar favorito:', e);
        }
    }
};

clearHistoryBtn.onclick = () => {
    if (confirm('Deseja limpar todo o histórico?')) {
        history = [];
        saveHistory();
        renderHistory();
        historyIndex = 0;
    }
};

exportHistoryBtn.onclick = () => {
    try {
        const csv = 'Expressão,Resultado,Data\n' + history.map(h => 
            `"${h.expr.replace(/"/g, '""')}","${String(h.result).replace(/"/g, '""')}","${new Date(h.time).toLocaleString()}"`
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historico_calculadora_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Erro ao exportar:', e);
        alert('Erro ao exportar histórico');
    }
};

// ====== TECLADO VIRTUAL ======
keypad.addEventListener('click', (e) => {
    const k = e.target.closest('[data-insert]');
    if (!k) return;
    
    const txt = k.getAttribute('data-insert');
    insertAtCursor(exprEl, txt);
    exprEl.focus();
});

// ====== ATALHOS DE TECLADO ======
window.addEventListener('keydown', (ev) => {
    // Ignora se estiver no textarea
    if (ev.target.tagName === 'TEXTAREA') return;
    
    if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        doEval();
    } else if (ev.key === 'Escape') {
        ev.preventDefault();
        exprEl.value = '';
        resultEl.innerHTML = 'Resultado: —';
        exprEl.focus();
    } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (history.length > 0 && historyIndex > 0) {
            historyIndex--;
            exprEl.value = history[historyIndex].expr;
        }
    } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (history.length > 0 && historyIndex < history.length - 1) {
            historyIndex++;
            exprEl.value = history[historyIndex].expr;
        }
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        const cur = exprEl.value.trim();
        if (cur) {
            try {
                const favs = JSON.parse(localStorage.getItem('calc_favs') || '[]');
                favs.push({ expr: cur, time: Date.now() });
                localStorage.setItem('calc_favs', JSON.stringify(favs));
                saveFav.innerText = '★ Salvo';
                setTimeout(() => saveFav.innerText = 'Favorito', 1500);
            } catch (e) {
                console.error('Erro ao salvar:', e);
            }
        }
    }
});

// ====== PLOT GRÁFICO ======
function tryPlot(raw) {
    const plotEl = document.getElementById('plot');
    
    if (!raw.includes('x')) {
        Plotly.purge('plot');
        plotEl.innerHTML = '<div class="small" style="padding:20px;text-align:center;color:var(--text-dim);">Digite uma expressão com "x" para gerar gráfico<br>Exemplo: sin(x), x^2, etc.</div>';
        return;
    }
    
    try {
        let fexpr = raw
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .replace(/√/g, 'sqrt');
            
        if (degMode) {
            fexpr = toRadianWrapper(fexpr);
        }
        
        const f = math.compile(fexpr);
        const xs = [];
        const ys = [];
        
        for (let i = 0; i <= 400; i++) {
            const xv = -10 + (20 / 400) * i;
            xs.push(xv);
            
            try {
                const scope = { x: xv };
                const yv = f.evaluate(scope);
                ys.push(typeof yv === 'number' && Number.isFinite(yv) ? yv : null);
            } catch (e) {
                ys.push(null);
            }
        }
        
        const layout = {
            margin: { t: 20, l: 40, r: 20, b: 40 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e6edf3' },
            xaxis: { 
                gridcolor: '#30363d',
                zerolinecolor: '#58a6ff'
            },
            yaxis: { 
                gridcolor: '#30363d',
                zerolinecolor: '#58a6ff'
            }
        };
        
        const config = {
            responsive: true,
            displayModeBar: false
        };
        
        Plotly.newPlot('plot', [{
            x: xs,
            y: ys,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#1f6feb', width: 2 },
            name: raw
        }], layout, config);
    } catch (e) {
        console.error('Erro no plot:', e);
        plotEl.innerHTML = `<div class="small" style="padding:20px;color:var(--btn-clear);">Erro ao gerar gráfico: ${escapeHtml(e.message)}</div>`;
    }
}

// ====== BLOCO DE NOTAS ======
notepad.value = localStorage.getItem('calc_notes') || '';

saveNotes.onclick = () => {
    localStorage.setItem('calc_notes', notepad.value);
    saveNotes.innerText = '✓ Salvo';
    setTimeout(() => saveNotes.innerText = 'Salvar', 1500);
};

notepad.addEventListener('input', () => {
    localStorage.setItem('calc_notes', notepad.value);
});

// ====== CANVAS DE DESENHO ======
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return { x: e.offsetX, y: e.offsetY };
}

function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function endDraw(e) {
    e.preventDefault();
    drawing = false;
}

function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchmove', draw);

document.getElementById('clearCanvas').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Redimensiona canvas mantendo proporção
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = canvas.height;
    tmpCanvas.getContext('2d').drawImage(canvas, 0, 0);
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.drawImage(tmpCanvas, 0, 0, rect.width, rect.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ====== CONFIGURAÇÕES ======
showSteps.addEventListener('change', () => {
    if (showSteps.checked) {
        alert('⚠️ Funcionalidade de passos ainda em desenvolvimento.\nPara mostrar passos formais, seria necessário integrar com backend (SymPy/Python).');
        showSteps.checked = false;
    }
});

// ====== INICIALIZAÇÃO ======
renderHistory();
document.getElementById('plot').innerHTML = '<div class="small" style="padding:20px;text-align:center;color:var(--text-dim);">Digite uma expressão com "x" para gerar gráfico</div>';
exprEl.focus();