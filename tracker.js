// =========================================================================
// ziz.english — Homework Activity Tracker + Live Teaching Whiteboard (tracker.js)
// =========================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const hwId = params.get('hw_id');
    const studentId = params.get('student_id');
    const isHomeworkMode = Boolean(hwId && studentId);

    // =====================================================================
    // PART 1: HOMEWORK TRACKER (працює тільки коли урок відкрито як ДЗ)
    // =====================================================================
    if (isHomeworkMode) {
        const SUPABASE_URL = 'https://vnvjcgafvfkmqbzeyajo.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_Ij_gV7Q-X7j617TkJR84xg_0EyJPLOi';

        const state = {
            started_at: new Date().toISOString(),
            active_seconds: 0,
            tab_leaves: 0,
            paste_events: [],
            answers: {},
            clicked_actions: [],
            last_updated: new Date().toISOString()
        };

        let isTabVisible = !document.hidden;
        let saveTimeout = null;

        setInterval(() => {
            if (!document.hidden) state.active_seconds += 1;
        }, 1000);

        setInterval(() => {
            syncToSupabase();
        }, 10000);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && isTabVisible) {
                isTabVisible = false;
                state.tab_leaves += 1;
                scheduleSave(true);
            } else if (!document.hidden) {
                isTabVisible = true;
            }
        });

        function getQuestionContext(el, index) {
            const container = el.closest('.question, .task, .exercise, .card, .item, li, tr, .quiz-item, .mcq-item, div');
            if (container) {
                const heading = container.querySelector('h1, h2, h3, h4, h5, p, .q-text, .question-text, strong, b');
                if (heading && heading.innerText.trim().length > 2 && heading.innerText.trim() !== el.innerText?.trim()) {
                    return heading.innerText.replace(/\s+/g, ' ').trim().slice(0, 75);
                }
            }
            if (el.getAttribute('data-question')) return el.getAttribute('data-question');
            if (el.name) return `Choice (${el.name})`;
            if (el.id) return el.id;
            if (el.placeholder) return el.placeholder.slice(0, 50);
            return `Task / Item #${index + 1}`;
        }

        document.addEventListener('paste', (e) => {
            const target = e.target;
            if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && ['text', 'search', ''].includes(target.type)) || target.isContentEditable)) {
                if (target.closest('#ziz-board-layer, #ziz-toolbar')) return;
                const pastedText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
                if (pastedText.trim().length > 0) {
                    const label = getQuestionContext(target, 0);
                    state.paste_events.push({
                        field: label,
                        text_preview: pastedText.trim().slice(0, 120),
                        length: pastedText.trim().length,
                        time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    });
                    scheduleSave(true);
                }
            }
        }, true);

        document.addEventListener('click', (e) => {
            if (e.target.closest('#ziz-toolbar, #ziz-board-layer, #ziz-tracker-badge')) return;
            const target = e.target.closest('button, label, [role="button"], .option, .choice, .answer, .quiz-option, .word-btn, .chip, .card-item, .match-item, li, input[type="radio"], input[type="checkbox"], [onclick]');
            if (!target) return;
            if ((target.tagName === 'INPUT' && target.type === 'text') || target.tagName === 'TEXTAREA') return;

            let clickedText = (target.innerText || target.value || target.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
            if (!clickedText || clickedText.length > 100) return;

            const context = getQuestionContext(target, state.clicked_actions.length);
            const timeStr = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (target.tagName !== 'BUTTON' || !/check|submit|reset|next|show|перевір/i.test(clickedText)) {
                state.answers[`🖱️ ${context}`] = clickedText;
            }

            const lastClick = state.clicked_actions[state.clicked_actions.length - 1];
            if (!lastClick || lastClick.choice !== clickedText || lastClick.context !== context) {
                state.clicked_actions.push({ context, choice: clickedText, time: timeStr });
                if (state.clicked_actions.length > 150) state.clicked_actions.shift();
            }

            setTimeout(() => {
                collectAllAnswers();
                scheduleSave(false);
            }, 300);
        }, true);

        function collectAllAnswers() {
            const collected = {};
            Object.entries(state.answers).forEach(([k, v]) => {
                if (k.startsWith('🖱️ ')) collected[k] = v;
            });

            const elements = document.querySelectorAll('input, textarea, select');
            elements.forEach((el, idx) => {
                if (el.closest('#ziz-toolbar, #ziz-board-layer')) return;
                if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
                const label = getQuestionContext(el, idx);

                if (el.type === 'checkbox' || el.type === 'radio') {
                    if (el.checked) {
                        const optionText = el.closest('label')?.innerText?.trim() || el.parentElement?.innerText?.trim() || el.value || 'Selected';
                        collected[label] = optionText.replace(/\s+/g, ' ').slice(0, 80);
                    }
                } else if (el.tagName === 'SELECT') {
                    if (el.value) {
                        const selectedText = el.options[el.selectedIndex]?.text || el.value;
                        collected[label] = selectedText;
                    }
                } else {
                    const val = el.value?.trim();
                    if (val) collected[`✍️ ${label}`] = val;
                }
            });

            const selectedCustom = document.querySelectorAll('.selected, .chosen, .active-option, .is-selected, [aria-checked="true"], [aria-pressed="true"]');
            selectedCustom.forEach((el, idx) => {
                if (el.closest('#ziz-toolbar, #ziz-board-layer, nav, header')) return;
                const text = el.innerText?.replace(/\s+/g, ' ').trim();
                if (text && text.length < 100) {
                    const qLabel = getQuestionContext(el, idx);
                    collected[`✅ ${qLabel}`] = text;
                }
            });

            state.answers = collected;
        }

        document.addEventListener('input', (e) => {
            if (e.target.closest('#ziz-toolbar, #ziz-board-layer')) return;
            collectAllAnswers();
            scheduleSave(false);
        }, true);

        document.addEventListener('change', (e) => {
            if (e.target.closest('#ziz-toolbar, #ziz-board-layer')) return;
            collectAllAnswers();
            scheduleSave(false);
        }, true);

        function scheduleSave(immediate) {
            if (immediate) {
                clearTimeout(saveTimeout);
                syncToSupabase();
                return;
            }
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => syncToSupabase(), 1800);
        }

        async function syncToSupabase() {
            collectAllAnswers();
            state.last_updated = new Date().toISOString();
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_homework_tracking`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        p_hw_id: hwId,
                        p_student_id: studentId,
                        p_tracking: state
                    }),
                    keepalive: true
                });
            } catch (err) {}
        }

        window.addEventListener('beforeunload', () => syncToSupabase());

        function initTrackerBadge() {
            if (document.getElementById('ziz-tracker-badge')) return;
            const badge = document.createElement('div');
            badge.id = 'ziz-tracker-badge';
            badge.innerHTML = '🟢 ziz.english • Progress auto-saved';
            Object.assign(badge.style, {
                position: 'fixed',
                bottom: '14px',
                right: '14px',
                background: 'rgba(30, 30, 47, 0.88)',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontFamily: 'sans-serif',
                zIndex: '99998',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
            });
            document.body.appendChild(badge);
            syncToSupabase();
        }

        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', initTrackerBadge);
        } else {
            initTrackerBadge();
        }
    }

    // =====================================================================
    // PART 2: LIVE TEACHING WHITEBOARD OVERLAY (пензлик, маркер, текст, стікери)
    // =====================================================================
    function initTeachingBoard() {
        if (document.getElementById('ziz-toolbar')) return;

        // 1. Стилі для панелі інструментів та стікерів
        const style = document.createElement('style');
        style.textContent = `
            #ziz-board-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                z-index: 99990;
                pointer-events: none;
            }
            #ziz-canvas {
                position: absolute;
                top: 0;
                left: 0;
                display: block;
                pointer-events: none;
            }
            #ziz-canvas.drawing-active {
                pointer-events: auto;
                cursor: crosshair;
            }
            #ziz-objects-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            #ziz-toolbar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e1e2f;
                color: #ffffff;
                padding: 8px 14px;
                border-radius: 18px;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 99999;
                box-shadow: 0 10px 30px rgba(0,0,0,0.28);
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                user-select: none;
                border: 1px solid rgba(255,255,255,0.12);
                flex-wrap: wrap;
                max-width: 95vw;
            }
            .ziz-tool-btn {
                background: transparent;
                border: none;
                color: #d1d1e0;
                padding: 8px 11px;
                border-radius: 11px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: all 0.15s;
            }
            .ziz-tool-btn:hover {
                background: rgba(255,255,255,0.12);
                color: #ffffff;
            }
            .ziz-tool-btn.active {
                background: #ff4757;
                color: #ffffff;
            }
            .ziz-divider {
                width: 1px;
                height: 22px;
                background: rgba(255,255,255,0.15);
                margin: 0 4px;
            }
            .ziz-color-dot {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: transform 0.15s;
            }
            .ziz-color-dot:hover {
                transform: scale(1.15);
            }
            .ziz-color-dot.active {
                border-color: #ffffff;
                transform: scale(1.18);
            }
            /* Draggable Text Box & Sticky Note */
            .ziz-floating-item {
                position: absolute;
                pointer-events: auto;
                min-width: 140px;
                max-width: 340px;
                z-index: 99995;
                border-radius: 12px;
                transition: box-shadow 0.15s;
            }
            .ziz-floating-item.sticky-note {
                background: #fff3a1;
                color: #222222;
                padding: 10px 14px 14px 14px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.16);
                border: 1px solid #f0dc65;
            }
            .ziz-floating-item.sticky-note.pink {
                background: #ffd6e0;
                border-color: #f7b2c4;
            }
            .ziz-floating-item.sticky-note.mint {
                background: #c7f9cc;
                border-color: #95e89e;
            }
            .ziz-floating-item.sticky-note.blue {
                background: #d0ebff;
                border-color: #99d1ff;
            }
            .ziz-floating-item.text-label {
                background: rgba(255, 255, 255, 0.94);
                border: 2px solid #ff4757;
                padding: 6px 10px;
                box-shadow: 0 6px 16px rgba(0,0,0,0.12);
            }
            .ziz-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
                padding-bottom: 4px;
                margin-bottom: 4px;
                border-bottom: 1px dashed rgba(0,0,0,0.15);
                font-size: 11px;
                color: rgba(0,0,0,0.5);
                font-weight: 700;
            }
            .ziz-item-header:active {
                cursor: grabbing;
            }
            .ziz-item-del {
                background: none;
                border: none;
                color: #ff4757;
                font-weight: bold;
                cursor: pointer;
                font-size: 15px;
                line-height: 1;
                padding: 0 2px;
            }
            .ziz-item-content {
                outline: none;
                font-size: 15px;
                line-height: 1.45;
                font-family: 'Outfit', sans-serif;
                min-height: 24px;
                word-break: break-word;
                cursor: text;
            }
            #ziz-toolbar.collapsed .ziz-collapsible {
                display: none;
            }
        `;
        document.head.appendChild(style);

        // 2. Створюємо шар дошки поверх усієї сторінки уроку
        const boardLayer = document.createElement('div');
        boardLayer.id = 'ziz-board-layer';

        const canvas = document.createElement('canvas');
        canvas.id = 'ziz-canvas';

        const objectsLayer = document.createElement('div');
        objectsLayer.id = 'ziz-objects-layer';

        boardLayer.appendChild(canvas);
        boardLayer.appendChild(objectsLayer);
        document.body.appendChild(boardLayer);

        const ctx = canvas.getContext('2d');

        // 3. Панель інструментів знизу по центру
        const toolbar = document.createElement('div');
        toolbar.id = 'ziz-toolbar';
        // Якщо відкрито в режимі ДЗ учнем — згортаємо панель у компактну кнопку, щоб не заважала
        if (isHomeworkMode) toolbar.classList.add('collapsed');

        toolbar.innerHTML = `
            <button type="button" class="ziz-tool-btn active" data-tool="cursor" title="Cursor (interact with lesson)">🖱️ Cursor</button>
            <div class="ziz-divider ziz-collapsible"></div>
            <button type="button" class="ziz-tool-btn ziz-collapsible" data-tool="pen" title="Brush / Pen">✏️ Pen</button>
            <button type="button" class="ziz-tool-btn ziz-collapsible" data-tool="highlighter" title="Highlighter">🖍️ Marker</button>
            <button type="button" class="ziz-tool-btn ziz-collapsible" data-tool="eraser" title="Eraser">🧹 Eraser</button>
            <div class="ziz-divider ziz-collapsible"></div>
            <button type="button" class="ziz-tool-btn ziz-collapsible" id="zizAddText" title="Insert Text Box">🔤 Text</button>
            <button type="button" class="ziz-tool-btn ziz-collapsible" id="zizAddSticky" title="Add Sticky Note">📝 Sticker</button>
            <div class="ziz-divider ziz-collapsible"></div>
            <div class="ziz-color-dot active ziz-collapsible" data-color="#ff4757" style="background: #ff4757;" title="Red"></div>
            <div class="ziz-color-dot ziz-collapsible" data-color="#1e90ff" style="background: #1e90ff;" title="Blue"></div>
            <div class="ziz-color-dot ziz-collapsible" data-color="#2ed573" style="background: #2ed573;" title="Green"></div>
            <div class="ziz-color-dot ziz-collapsible" data-color="#ffa502" style="background: #ffa502;" title="Yellow/Orange"></div>
            <div class="ziz-color-dot ziz-collapsible" data-color="#1e1e2f" style="background: #1e1e2f;" title="Black"></div>
            <div class="ziz-divider ziz-collapsible"></div>
            <button type="button" class="ziz-tool-btn ziz-collapsible" id="zizUndoBtn" title="Undo last stroke">↩️ Undo</button>
            <button type="button" class="ziz-tool-btn ziz-collapsible" id="zizClearAllBtn" title="Clear board">🗑️ Clear</button>
            <button type="button" class="ziz-tool-btn" id="zizToggleCollapse" title="Hide/Show toolbar">${isHomeworkMode ? '🎨 Tools' : '▾'}</button>
        `;
        document.body.appendChild(toolbar);

        // 4. Логіка розміру полотна на всю висоту сторінки
        let currentTool = 'cursor';
        let currentColor = '#ff4757';
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let historyStack = [];
        let stickyColorIndex = 0;
        const stickyColors = ['', 'pink', 'mint', 'blue'];

        function resizeCanvasPreserve() {
            const docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                window.innerHeight
            );
            const docWidth = Math.max(
                document.body.scrollWidth,
                document.documentElement.scrollWidth,
                window.innerWidth
            );

            if (canvas.width === docWidth && canvas.height === docHeight) return;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            if (canvas.width > 0 && canvas.height > 0) {
                tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
            }

            boardLayer.style.height = docHeight + 'px';
            canvas.width = docWidth;
            canvas.height = docHeight;

            if (tempCanvas.width > 0 && tempCanvas.height > 0) {
                ctx.drawImage(tempCanvas, 0, 0);
            }
        }

        resizeCanvasPreserve();
        window.addEventListener('resize', resizeCanvasPreserve);
        // Якщо в уроці розкриваються спойлери/блоки і висота сторінки збільшується
        const resizeObserver = new ResizeObserver(() => resizeCanvasPreserve());
        resizeObserver.observe(document.body);

        function saveSnapshot() {
            if (historyStack.length > 25) historyStack.shift();
            historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }

        // 5. Вибір інструментів
        toolbar.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                toolbar.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTool = btn.dataset.tool;

                if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
                    canvas.classList.add('drawing-active');
                    canvas.style.cursor = currentTool === 'eraser' ? 'cell' : 'crosshair';
                } else {
                    canvas.classList.remove('drawing-active');
                }
            });
        });

        // Вибір кольору
        toolbar.querySelectorAll('.ziz-color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                toolbar.querySelectorAll('.ziz-color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                currentColor = dot.dataset.color;
                if (currentTool === 'cursor' || currentTool === 'eraser') {
                    toolbar.querySelector('[data-tool="pen"]').click();
                }
            });
        });

        // Згортання/розгортання панелі
        document.getElementById('zizToggleCollapse').addEventListener('click', (e) => {
            toolbar.classList.toggle('collapsed');
            e.currentTarget.textContent = toolbar.classList.contains('collapsed') ? '🎨 Tools' : '▾';
        });

        // 6. Малювання пензликом, маркером та гумкою (мишка + тачпад/планшет)
        function getCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }

        function startDraw(e) {
            if (currentTool === 'cursor') return;
            e.preventDefault();
            resizeCanvasPreserve();
            saveSnapshot();
            isDrawing = true;
            const pos = getCoords(e);
            lastX = pos.x;
            lastY = pos.y;
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getCoords(e);

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (currentTool === 'pen') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 3.5;
            } else if (currentTool === 'highlighter') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 0.28;
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 22;
            } else if (currentTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.globalAlpha = 1.0;
                ctx.lineWidth = 28;
            }

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.restore();

            lastX = pos.x;
            lastY = pos.y;
        }

        function stopDraw() {
            isDrawing = false;
        }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        window.addEventListener('touchend', stopDraw);

        // Undo & Clear
        document.getElementById('zizUndoBtn').addEventListener('click', () => {
            if (historyStack.length > 0) {
                const prev = historyStack.pop();
                ctx.putImageData(prev, 0, 0);
            }
        });

        document.getElementById('zizClearAllBtn').addEventListener('click', () => {
            if (!confirm('Clear all drawings, text boxes, and stickers on this page?')) return;
            saveSnapshot();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            objectsLayer.innerHTML = '';
        });

        // 7. Додавання перетягуваних текстових полів і стікерів
        function createFloatingItem(type) {
            // Перемикаємо на курсор, щоб одразу можна було писати й рухати
            toolbar.querySelector('[data-tool="cursor"]').click();

            const item = document.createElement('div');
            item.className = `ziz-floating-item ${type === 'sticky' ? 'sticky-note ' + stickyColors[stickyColorIndex % stickyColors.length] : 'text-label'}`;
            if (type === 'sticky') stickyColorIndex++;

            const startTop = window.scrollY + Math.round(window.innerHeight * 0.28);
            const startLeft = Math.round(window.innerWidth * 0.38) + (Math.random() * 40 - 20);
            item.style.top = startTop + 'px';
            item.style.left = Math.max(20, startLeft) + 'px';

            if (type === 'text') {
                item.style.borderColor = currentColor;
            }

            item.innerHTML = `
                <div class="ziz-item-header">
                    <span>${type === 'sticky' ? '📌 Note' : '🔤 Text'} (drag)</span>
                    <button type="button" class="ziz-item-del" title="Remove">&times;</button>
                </div>
                <div class="ziz-item-content" contenteditable="true" style="color: ${type === 'text' ? currentColor : '#1e1e2f'};">${type === 'sticky' ? 'Type note here...' : 'Type text...'}</div>
            `;

            objectsLayer.appendChild(item);

            const contentEl = item.querySelector('.ziz-item-content');
            contentEl.focus();
            // Виділяємо стартовий текст, щоб можна було одразу друкувати поверх
            const range = document.createRange();
            range.selectNodeContents(contentEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            item.querySelector('.ziz-item-del').addEventListener('click', () => item.remove());

            // Перетягування (Drag & Drop) за верхню шапку
            const header = item.querySelector('.ziz-item-header');
            let isDragging = false;
            let offsetX = 0;
            let offsetY = 0;

            header.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('ziz-item-del')) return;
                isDragging = true;
                offsetX = e.clientX - item.offsetLeft;
                offsetY = e.clientY - item.offsetTop;
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                item.style.left = (e.clientX - offsetX) + 'px';
                item.style.top = (e.clientY - offsetY) + 'px';
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }

        document.getElementById('zizAddText').addEventListener('click', () => createFloatingItem('text'));
        document.getElementById('zizAddSticky').addEventListener('click', () => createFloatingItem('sticky'));
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initTeachingBoard);
    } else {
        initTeachingBoard();
    }
})();
