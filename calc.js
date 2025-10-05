    // Seleciona elementos do DOM para manipulação
    const exprEl = document.getElementById('expr'); // input de expressão
    const resultEl = document.getElementById('result'); // div para exibir resultado
    const evalBtn = document.getElementById('evalBtn'); // botão "="
    const clearBtn = document.getElementById('clearBtn'); // botão "X"
    const degBtn = document.getElementById('degRad'); // botão para alternar DEG/RAD
    const copyBtn = document.getElementById('copyRes'); // botão copiar resultado
    const saveFav = document.getElementById('saveFav'); // botão salvar favorito
    const historyEl = document.getElementById('history'); // container do histórico
    const clearHistoryBtn = document.getElementById('clearHistory'); // botão limpar histórico
    const exportHistoryBtn = document.getElementById('exportHistory'); // botão exportar histórico
    const precisionEl = document.getElementById('precision'); // input para casas decimais
    const showSteps = document.getElementById('showSteps'); // checkbox "mostrar passos"
    const keypad = document.getElementById('keypad'); // container do teclado virtual

    // Configuração do math.js
    const mathConfig = { number: 'number' }; // força uso de números normais
    const math = window.math; // referência global
    math.config(mathConfig);

    // Estado inicial
    let degMode = true; // DEG padrão
    let ans = 0; // variável para armazenar último resultado numérico
    let history = loadHistory(); // carrega histórico do localStorage
    let historyIndex = history.length; // índice para navegar no histórico

    // Função para carregar histórico do localStorage
    function loadHistory() {
        try { 
            const raw = localStorage.getItem('calc_history'); // tenta pegar item
            return raw ? JSON.parse(raw) : []; // parse JSON ou array vazio
        } catch (e) { 
            return []; // se erro, retorna array vazio
        }
    }

    // Função para salvar histórico no localStorage
    function saveHistory() { 
        localStorage.setItem('calc_history', JSON.stringify(history)); 
    }

    // Função para renderizar histórico na tela
    function renderHistory() {
        historyEl.innerHTML = ''; // limpa container
        if (history.length === 0) { 
            historyEl.innerHTML = '<div class="small">Sem histórico ainda</div>'; 
            return; 
        }

        // percorre histórico do mais recente para o mais antigo
        history.slice().reverse().forEach((it, i) => {
            const el = document.createElement('div'); 
            el.className = 'history-item';

            // conteúdo do item: expressão + resultado
            el.innerHTML = `<div><div style="font-weight:700">${escapeHtml(it.expr)}</div><div class="small">= ${escapeHtml(String(it.result))}</div></div>`;

            const actions = document.createElement('div');

            // botão "Usar" -> copia expressão para input
            const useBtn = document.createElement('button'); 
            useBtn.className = 'btn ghost'; 
            useBtn.innerText = 'Usar';
            useBtn.onclick = () => { exprEl.value = it.expr; exprEl.focus(); }

            // botão "Excluir" -> remove item do histórico
            const del = document.createElement('button'); 
            del.className = 'btn'; 
            del.innerText = 'Excluir'; 
            del.onclick = () => { removeHistoryItem(history.length - 1 - i); }

            actions.appendChild(useBtn); 
            actions.appendChild(del);
            el.appendChild(actions);

            historyEl.appendChild(el);
        });
    }

    // Função para remover item específico do histórico
    function removeHistoryItem(idx) { 
        history.splice(idx, 1); // remove item
        saveHistory(); // salva histórico atualizado
        renderHistory(); // renderiza novamente
    }

    // Função para escapar caracteres HTML (segurança)
    function escapeHtml(s) { 
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
    }

    // Função para converter funções trigonométricas para radianos se DEG
    function toRadianWrapper(expr) {
        const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan']; // funções trig
        funcs.forEach(fn => {
            const re = new RegExp(fn + "\\(([^)]+)\\)", 'g'); // regex captura argumento
            expr = expr.replace(re, (m, g1) => `${fn}(( ${g1} )*pi/180)`); // converte para radianos
        });
        return expr;
    }

    // Função principal de avaliação
    function evaluateExpression(raw) {
        if (!raw.trim()) return { result: '', error: null }; // vazio -> retorna
        try {
            let expr = raw.replace(/÷/g, '/').replace(/×/g, '*').replace(/\u2212/g, '-'); // normaliza símbolos
            expr = expr.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)'); // converte %
            expr = expr.replace(/\bans\b/g, `(${ans})`); // substitui ans
            if (degMode) { expr = toRadianWrapper(expr); } // converte trig se DEG
            const res = math.evaluate(expr); // avalia expressão

            // formata resultado baseado em precisão
            const prec = Math.max(0, Math.min(20, parseInt(precisionEl.value || 8, 10)));
            let display;
            if (typeof res === 'number') {
                display = Number.isFinite(res) ? Number(res.toFixed(prec)) : String(res);
            } else if (math.typeOf(res) === 'Complex') {
                display = `${res.re.toFixed(prec)} ${res.im >= 0 ? '+' : '-'} ${Math.abs(res.im).toFixed(prec)}i`;
            } else if (Array.isArray(res) || res && res.entries) {
                display = JSON.stringify(res);
            } else {
                display = String(res);
            }

            ans = typeof res === 'number' ? res : ans; // atualiza ans

            // adiciona ao histórico
            history.push({ expr: raw, result: display, time: Date.now() });
            if (history.length > 200) history.shift(); // limita tamanho
            saveHistory(); renderHistory();

            return { result: display, error: null, rawResult: res };
        } catch (err) {
            return { result: null, error: err.message || String(err) };
        }
    }

    // ====== UI BINDINGS ======
    evalBtn.onclick = () => doEval(); // "="
    clearBtn.onclick = () => { exprEl.value = ''; resultEl.innerText = 'Resultado: —'; exprEl.focus(); } // "X"
    degBtn.onclick = () => { degMode = !degMode; degBtn.innerText = degMode ? 'DEG' : 'RAD'; exprEl.focus(); } // alterna DEG/RAD
    copyBtn.onclick = () => { 
        navigator.clipboard.writeText(resultEl.dataset.raw || resultEl.innerText)
        .then(() => { copyBtn.innerText = 'Copiado!'; setTimeout(() => copyBtn.innerText = 'Copiar', 900); });
    }
    saveFav.onclick = () => { 
        const last = history[history.length - 1]; 
        if (last) { 
            const favs = JSON.parse(localStorage.getItem('calc_favs') || '[]'); 
            favs.push(last); 
            localStorage.setItem('calc_favs', JSON.stringify(favs)); 
            saveFav.innerText = 'Salvo'; 
            setTimeout(() => saveFav.innerText = 'Favorito', 900); 
        } 
    }

    // Histórico
    clearHistoryBtn.onclick = () => { 
        if (confirm('Limpar todo o histórico?')) { 
            history = []; saveHistory(); renderHistory(); 
        } 
    }
    exportHistoryBtn.onclick = () => {
        const csv = history.map(h => `"${h.expr.replace(/"/g, '""')}","${String(h.result).replace(/"/g, '""')}",${new Date(h.time).toISOString()}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'history.csv'; a.click(); URL.revokeObjectURL(url);
    }

    // ====== TECLADO VIRTUAL ======
    keypad.addEventListener('click', (e) => {
        const k = e.target.closest('[data-insert]'); 
        if (!k) return;
        const txt = k.getAttribute('data-insert');
        insertAtCursor(exprEl, txt);
        exprEl.focus();
    });

    function insertAtCursor(input, text) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const v = input.value;
        input.value = v.slice(0, start) + text + v.slice(end); // insere texto
        const pos = start + text.length;
        input.setSelectionRange(pos, pos); // move cursor
    }

    // Avaliação de expressão
    function doEval() {
        const raw = exprEl.value;
        const out = evaluateExpression(raw);
        if (out.error) { 
            resultEl.innerText = 'Erro: ' + out.error; 
            resultEl.dataset.raw = ''; 
        } else { 
            resultEl.innerText = String(out.result); 
            resultEl.dataset.raw = String(out.rawResult || out.result); 
        }
        tryPlot(raw); // tenta plotar se expressão tiver x
    }

    // ====== ATALHOS DE TECLADO ======
    window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); doEval(); }
        else if (ev.key === 'Escape') { exprEl.value = ''; }
        else if (ev.key === 'ArrowUp') { 
            ev.preventDefault(); 
            if (history.length) { historyIndex = Math.max(0, historyIndex - 1); const it = history[historyIndex]; if (it) exprEl.value = it.expr; } 
        }
        else if (ev.key === 'ArrowDown') { 
            ev.preventDefault(); 
            if (history.length) { historyIndex = Math.min(history.length - 1, historyIndex + 1); const it = history[historyIndex]; if (it) exprEl.value = it.expr; } 
        }
        else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
            ev.preventDefault(); // salva expressão atual
            const cur = exprEl.value.trim(); 
            if (cur) { 
                const favs = JSON.parse(localStorage.getItem('calc_favs') || '[]'); 
                favs.push({ expr: cur, time: Date.now() }); 
                localStorage.setItem('calc_favs', JSON.stringify(favs)); 
                saveFav.innerText = 'Salvo'; 
                setTimeout(() => saveFav.innerText = 'Favorito', 900); 
            }
        }
    });

    // ====== PLOT SIMPLES ======
    function tryPlot(raw) {
        if (!raw.includes('x')) { 
            Plotly.purge('plot'); 
            document.getElementById('plot').innerHTML = '<div class="small">Sem gráfico (expr sem variável x)</div>'; 
            return; 
        }
        try {
            const fexpr = degMode ? toRadianWrapper(raw) : raw;
            const f = math.compile(fexpr);
            const xs = [];
            const ys = [];
            for (let i = 0; i <= 200; i++) { 
                const xv = -10 + (20 / 200) * i; 
                xs.push(xv); 
                const scope = { x: xv }; 
                const yv = f.evaluate(scope); 
                ys.push(typeof yv === 'number' ? yv : NaN); 
            }
            Plotly.newPlot('plot', [{ x: xs, y: ys, type: 'scatter', mode: 'lines' }], { margin: { t: 10, l: 30, r: 10, b: 30 } });
        } catch (e) { 
            document.getElementById('plot').innerText = 'Erro no plot: ' + e.message; 
        }
    }

    // render inicial
    renderHistory();
    document.getElementById('plot').innerHTML = '<div class="small">Sem gráfico (expr sem variável x)</div>';

    // ====== BLOCO DE NOTAS ======
    showSteps.addEventListener('change', () => {
        if (showSteps.checked) alert('Passos habilitados (demo). Para passos formais, integrar backend Python com SymPy.');
    });

    const notepad = document.getElementById('notepad');
    const saveNotes = document.getElementById('saveNotes');

    // Carregar notas salvas
    notepad.value = localStorage.getItem('notes') || '';

    // Salvar ao clicar no botão
    saveNotes.onclick = () => {
        localStorage.setItem('notes', notepad.value);
        alert('Notas salvas!');
    };

    // Salvar automaticamente ao digitar
    notepad.addEventListener('input', () => {
        localStorage.setItem('notes', notepad.value);
    });

    // ====== CANVAS DE DESENHO ======
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;

    // eventos de mouse
    canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mouseup', () => { drawing = false; });
    canvas.addEventListener('mousemove', e => {
        if (!drawing) return;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = '#1f6feb';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // botão limpar
    document.getElementById('clearCanvas').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // redimensiona canvas mantendo desenho
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = canvas.height;
        tmpCanvas.getContext('2d').drawImage(canvas, 0, 0);

        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // inicial

    // desenhar com mouse e touch
    function getPos(e) {
        if (e.touches) {
            const rect = canvas.getBoundingClientRect();
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        } else {
            return { x: e.offsetX, y: e.offsetY };
        }
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchend', endDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchmove', draw);

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
        ctx.stroke();
    }