// =========================================================================
// ziz.english — Homework Activity Tracker + Canva-Style Smooth Teaching Dock
// =========================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const hwId = params.get('hw_id');
    const studentId = params.get('student_id');
    const isHomeworkMode = Boolean(hwId && studentId);

    // =====================================================================
    // PART 1: HOMEWORK TRACKER (активний тільки коли урок відкрито як ДЗ)
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
                if (target.closest('#ziz-objects-layer, #ziz-dock, #ziz-subdock')) return;
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
            if (e.target.closest('#ziz-dock, #ziz-subdock, #ziz-objects-layer, #ziz-tracker-badge')) return;
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
                if (el.closest('#ziz-dock, #ziz-subdock, #ziz-objects-layer')) return;
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
                if (el.closest('#ziz-dock, #ziz-subdock, #ziz-objects-layer, nav, header')) return;
                const text = el.innerText?.replace(/\s+/g, ' ').trim();
                if (text && text.length < 100) {
                    const qLabel = getQuestionContext(el, idx);
                    collected[`✅ ${qLabel}`] = text;
                }
            });

            state.answers = collected;
        }

        document.addEventListener('input', (e) => {
            if (e.target.closest('#ziz-dock, #ziz-subdock, #ziz-objects-layer')) return;
            collectAllAnswers();
            scheduleSave(false);
        }, true);

        document.addEventListener('change', (e) => {
            if (e.target.closest('#ziz-dock, #ziz-subdock, #ziz-objects-layer')) return;
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
    // PART 2: CANVA-STYLE FLOATING VERTICAL DOCK (швидкий, плавний, для мишки)
    // =====================================================================
    function initCanvaBoard() {
        if (document.getElementById('ziz-dock')) return;

        const style = document.createElement('style');
        style.textContent = `
            #ziz-viewport-canvas {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                z-index: 99990;
                pointer-events: none;
            }
            #ziz-viewport-canvas.active {
                pointer-events: auto;
            }

            #ziz-objects-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 0;
                z-index: 99992;
                pointer-events: none;
            }

            #ziz-dock {
                position: fixed;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                background: #ffffff;
                border-radius: 999px;
                padding: 8px 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 99999;
                box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06);
                border: 1px solid rgba(15, 23, 42, 0.06);
                user-select: none;
                transition: opacity 0.2s;
            }

            #ziz-dock.minimized .ziz-dock-item:not(#zizToggleDockBtn) {
                display: none;
            }

            .ziz-dock-btn {
                width: 42px;
                height: 42px;
                border-radius: 50%;
                border: none;
                background: transparent;
                color: #1e293b;
                display: grid;
                place-items: center;
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
            }

            .ziz-dock-btn:hover {
                background: #f1f5f9;
            }

            .ziz-dock-btn.active {
                background: #e2e8f0;
                color: #0f172a;
            }

            .ziz-dock-btn svg {
                width: 21px;
                height: 21px;
            }

            .ziz-dock-btn::after {
                content: attr(data-tip);
                position: absolute;
                left: 52px;
                background: #1e293b;
                color: #fff;
                font-family: 'Outfit', -apple-system, sans-serif;
                font-size: 12px;
                font-weight: 500;
                padding: 5px 10px;
                border-radius: 8px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transform: translateX(-4px);
                transition: all 0.15s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .ziz-dock-btn:hover::after {
                opacity: 1;
                transform: translateX(0);
            }

            #ziz-subdock {
                position: fixed;
                left: 76px;
                top: 50%;
                transform: translateY(-50%) scale(0.95);
                background: #ffffff;
                border-radius: 999px;
                padding: 12px 8px;
                display: none;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                z-index: 99998;
                box-shadow: 0 10px 32px rgba(15, 23, 42, 0.14), 0 1px 3px rgba(15, 23, 42, 0.06);
                border: 1px solid rgba(15, 23, 42, 0.06);
                user-select: none;
                opacity: 0;
                transition: opacity 0.15s ease, transform 0.15s ease;
            }

            #ziz-subdock.open {
                display: flex;
                opacity: 1;
                transform: translateY(-50%) scale(1);
            }

            .ziz-nib-btn {
                width: 38px;
                height: 38px;
                border-radius: 12px;
                border: none;
                background: transparent;
                cursor: pointer;
                display: grid;
                place-items: center;
                transition: all 0.15s;
            }

            .ziz-nib-btn:hover {
                background: #f1f5f9;
            }

            .ziz-nib-btn.active {
                background: #f1f5f9;
                box-shadow: inset 0 0 0 2px #cbd5e1;
            }

            .ziz-sub-divider {
                width: 24px;
                height: 1px;
                background: #e2e8f0;
            }

            .ziz-swatch {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
                cursor: pointer;
                transition: transform 0.12s;
            }

            .ziz-swatch:hover {
                transform: scale(1.15);
            }

            .ziz-swatch.active {
                transform: scale(1.2);
                box-shadow: 0 0 0 2px #0f172a;
            }

            .ziz-size-btn {
                width: 32px;
                height: 26px;
                border-radius: 8px;
                border: none;
                background: transparent;
                cursor: pointer;
                display: grid;
                place-items: center;
            }

            .ziz-size-btn:hover, .ziz-size-btn.active {
                background: #f1f5f9;
            }

            .ziz-sticky {
                position: absolute;
                pointer-events: auto;
                width: 190px;
                min-height: 165px;
                padding: 14px 16px;
                border-radius: 6px 6px 22px 6px;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.14);
                font-family: 'Outfit', -apple-system, sans-serif;
                display: flex;
                flex-direction: column;
                transition: box-shadow 0.15s;
            }

            .ziz-sticky:hover {
                box-shadow: 0 14px 32px rgba(15, 23, 42, 0.2);
            }

            .ziz-sticky.yellow { background: #fef08a; color: #1e293b; }
            .ziz-sticky.pink   { background: #fbcfe8; color: #1e293b; }
            .ziz-sticky.mint   { background: #bbf7d0; color: #1e293b; }
            .ziz-sticky.blue   { background: #bae6fd; color: #1e293b; }

            .ziz-text-box {
                position: absolute;
                pointer-events: auto;
                min-width: 110px;
                max-width: 420px;
                padding: 6px 10px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(4px);
                border: 1.5px solid transparent;
                font-family: 'Outfit', -apple-system, sans-serif;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.35;
                box-shadow: 0 4px 14px rgba(0,0,0,0.06);
            }

            .ziz-text-box:hover, .ziz-text-box:focus-within {
                border-color: #9333ea;
                background: #ffffff;
            }

            .ziz-item-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: grab;
                margin-bottom: 6px;
                opacity: 0.45;
                transition: opacity 0.15s;
                height: 16px;
            }

            .ziz-sticky:hover .ziz-item-bar,
            .ziz-text-box:hover .ziz-item-bar,
            .ziz-text-box:focus-within .ziz-item-bar {
                opacity: 1;
            }

            .ziz-item-bar:active {
                cursor: grabbing;
            }

            .ziz-drag-dots {
                font-size: 12px;
                letter-spacing: 2px;
                color: #475569;
            }

            .ziz-del-btn {
                background: rgba(0,0,0,0.08);
                border: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                font-size: 12px;
                line-height: 1;
                cursor: pointer;
                color: #334155;
                display: grid;
                place-items: center;
            }

            .ziz-del-btn:hover {
                background: #ef4444;
                color: #fff;
            }

            .ziz-editable {
                outline: none;
                flex: 1;
                word-break: break-word;
                cursor: text;
            }
        `;
        document.head.appendChild(style);

        const canvas = document.createElement('canvas');
        canvas.id = 'ziz-viewport-canvas';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const objectsLayer = document.createElement('div');
        objectsLayer.id = 'ziz-objects-layer';
        document.body.appendChild(objectsLayer);

        const dock = document.createElement('div');
        dock.id = 'ziz-dock';
        if (isHomeworkMode) dock.classList.add('minimized');

        dock.innerHTML = `
            <button type="button" class="ziz-dock-btn ziz-dock-item active" data-mode="cursor" data-tip="Курсор (взаємодія з уроком)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" data-mode="draw" data-tip="Пензлик і маркер">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 2l4 4L7.5 20.5 2 22l1.5-5.5L18 2z" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/>
                    <path d="M14.5 5.5l4 4" stroke="#ef4444"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" id="zizBtnSticky" data-tip="Додати стікер">
                <svg viewBox="0 0 24 24" fill="#facc15" stroke="#eab308" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
                    <path d="M15 3v6h6" fill="#fef08a"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" id="zizBtnText" data-tip="Вставити текст">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7"/>
                    <line x1="9" y1="20" x2="15" y2="20"/>
                    <line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" id="zizBtnUndo" data-tip="Скасувати дію (Ctrl+Z)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" id="zizBtnClear" data-tip="Очистити все">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>

            <button type="button" class="ziz-dock-btn ziz-dock-item" id="zizToggleDockBtn" data-tip="Згорнути / Розгорнути">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                </svg>
            </button>
        `;
        document.body.appendChild(dock);

        const subdock = document.createElement('div');
        subdock.id = 'ziz-subdock';
        subdock.innerHTML = `
            <button type="button" class="ziz-nib-btn active" data-nib="pen" title="Пензлик (тонкий)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
            </button>

            <button type="button" class="ziz-nib-btn" data-nib="highlighter" title="Маркер-виділювач">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 11-6 6v3h9l3-3"/>
                    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" fill="#fef08a"/>
                </svg>
            </button>

            <button type="button" class="ziz-nib-btn" data-nib="eraser" title="Гумка (натисни на штрих щоб стерти)">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                    <path d="M22 21H7"/>
                    <path d="m5 11 9 9" fill="#ffe4e6"/>
                </svg>
            </button>

            <div class="ziz-sub-divider"></div>

            <div class="ziz-swatch active" data-color="#ef4444" style="background: #ef4444;" title="Червоний"></div>
            <div class="ziz-swatch" data-color="#facc15" style="background: #facc15;" title="Жовтий"></div>
            <div class="ziz-swatch" data-color="#3b82f6" style="background: #3b82f6;" title="Синій"></div>
            <div class="ziz-swatch" data-color="#22c55e" style="background: #22c55e;" title="Зелений"></div>
            <div class="ziz-swatch" data-color="#1e293b" style="background: #1e293b;" title="Чорний"></div>

            <div class="ziz-sub-divider"></div>

            <button type="button" class="ziz-size-btn active" data-scale="1" title="Тонка лінія">
                <span style="width: 18px; height: 2px; background: #1e293b; border-radius: 2px; display: block;"></span>
            </button>
            <button type="button" class="ziz-size-btn" data-scale="1.8" title="Середня лінія">
                <span style="width: 18px; height: 5px; background: #1e293b; border-radius: 3px; display: block;"></span>
            </button>
            <button type="button" class="ziz-size-btn" data-scale="2.8" title="Товста лінія">
                <span style="width: 18px; height: 8px; background: #1e293b; border-radius: 4px; display: block;"></span>
            </button>
        `;
        document.body.appendChild(subdock);

        let mode = 'cursor';
        let nib = 'pen';
        let color = '#ef4444';
        let sizeScale = 1;

        let strokes = [];
        let currentStroke = null;
        let isPointerDown = false;
        let stickyIdx = 0;
        const stickyThemes = ['yellow', 'pink', 'mint', 'blue'];

        function resizeViewportCanvas() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            requestRender();
        }

        resizeViewportCanvas();
        window.addEventListener('resize', resizeViewportCanvas);

        let renderScheduled = false;
        function requestRender() {
            if (renderScheduled) return;
            renderScheduled = true;
            requestAnimationFrame(() => {
                renderScheduled = false;
                renderAllStrokes();
            });
        }

        window.addEventListener('scroll', requestRender, { passive: true });

        function renderSingleStroke(s, scrollX, scrollY) {
            if (!s.points || s.points.length === 0) return;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (s.nib === 'highlighter') {
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = s.color;
                ctx.fillStyle = s.color;
                ctx.lineWidth = 18 * s.scale;
            } else {
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = s.color;
                ctx.fillStyle = s.color;
                ctx.lineWidth = 3 * s.scale;
            }

            const pts = s.points;
            if (pts.length === 1) {
                ctx.beginPath();
                ctx.arc(pts[0].x - scrollX, pts[0].y - scrollY, ctx.lineWidth / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            }

            ctx.beginPath();
            ctx.moveTo(pts[0].x - scrollX, pts[0].y - scrollY);

            for (let i = 1; i < pts.length - 1; i++) {
                const midX = (pts[i].x + pts[i + 1].x) / 2 - scrollX;
                const midY = (pts[i].y + pts[i + 1].y) / 2 - scrollY;
                ctx.quadraticCurveTo(pts[i].x - scrollX, pts[i].y - scrollY, midX, midY);
            }

            const last = pts[pts.length - 1];
            ctx.lineTo(last.x - scrollX, last.y - scrollY);
            ctx.stroke();
            ctx.restore();
        }

        function renderAllStrokes() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            for (let i = 0; i < strokes.length; i++) {
                renderSingleStroke(strokes[i], scrollX, scrollY);
            }
            if (currentStroke) {
                renderSingleStroke(currentStroke, scrollX, scrollY);
            }
        }

        function eraseAtPoint(pageX, pageY) {
            const threshold = 16;
            const beforeCount = strokes.length;
            strokes = strokes.filter(s => {
                for (let i = 0; i < s.points.length; i++) {
                    const dx = s.points[i].x - pageX;
                    const dy = s.points[i].y - pageY;
                    if (dx * dx + dy * dy <= threshold * threshold) {
                        return false;
                    }
                }
                return true;
            });
            if (strokes.length !== beforeCount) {
                requestRender();
            }
        }

        canvas.addEventListener('pointerdown', (e) => {
            if (mode !== 'draw' || e.button !== 0) return;
            canvas.setPointerCapture(e.pointerId);
            isPointerDown = true;

            const pageX = e.clientX + window.scrollX;
            const pageY = e.clientY + window.scrollY;

            if (nib === 'eraser') {
                eraseAtPoint(pageX, pageY);
                return;
            }

            currentStroke = {
                nib: nib,
                color: color,
                scale: sizeScale,
                points: [{ x: pageX, y: pageY }]
            };
            requestRender();
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isPointerDown || mode !== 'draw') return;
            const pageX = e.clientX + window.scrollX;
            const pageY = e.clientY + window.scrollY;

            if (nib === 'eraser') {
                eraseAtPoint(pageX, pageY);
                return;
            }

            if (currentStroke) {
                const pts = currentStroke.points;
                const prev = pts[pts.length - 1];
                if (Math.hypot(pageX - prev.x, pageY - prev.y) >= 2) {
                    pts.push({ x: pageX, y: pageY });
                    requestRender();
                }
            }
        });

        function finishPointer() {
            if (!isPointerDown) return;
            isPointerDown = false;
            if (currentStroke) {
                strokes.push(currentStroke);
                currentStroke = null;
                requestRender();
            }
        }

        canvas.addEventListener('pointerup', finishPointer);
        canvas.addEventListener('pointercancel', finishPointer);

        function setMode(newMode) {
            mode = newMode;
            dock.querySelectorAll('[data-mode]').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === newMode);
            });

            if (newMode === 'draw') {
                canvas.classList.add('active');
                subdock.classList.add('open');
                updateCursorIcon();
            } else {
                canvas.classList.remove('active');
                subdock.classList.remove('open');
            }
        }

        function updateCursorIcon() {
            canvas.style.cursor = nib === 'eraser' ? 'cell' : 'crosshair';
        }

        dock.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.mode === 'draw' && mode === 'draw') {
                    subdock.classList.toggle('open');
                } else {
                    setMode(btn.dataset.mode);
                }
            });
        });

        subdock.querySelectorAll('[data-nib]').forEach(btn => {
            btn.addEventListener('click', () => {
                subdock.querySelectorAll('[data-nib]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                nib = btn.dataset.nib;
                updateCursorIcon();
            });
        });

        subdock.querySelectorAll('.ziz-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                subdock.querySelectorAll('.ziz-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                color = sw.dataset.color;
                if (nib === 'eraser') {
                    subdock.querySelector('[data-nib="pen"]').click();
                }
            });
        });

        subdock.querySelectorAll('.ziz-size-btn').forEach(sb => {
            sb.addEventListener('click', () => {
                subdock.querySelectorAll('.ziz-size-btn').forEach(s => s.classList.remove('active'));
                sb.classList.add('active');
                sizeScale = parseFloat(sb.dataset.scale);
            });
        });

        document.getElementById('zizToggleDockBtn').addEventListener('click', () => {
            dock.classList.toggle('minimized');
            if (dock.classList.contains('minimized')) {
                setMode('cursor');
            }
        });

        function undoLast() {
            if (strokes.length > 0) {
                strokes.pop();
                requestRender();
            }
        }

        document.getElementById('zizBtnUndo').addEventListener('click', undoLast);
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.target.isContentEditable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                undoLast();
            }
        });

        document.getElementById('zizBtnClear').addEventListener('click', () => {
            if (strokes.length === 0 && objectsLayer.children.length === 0) return;
            strokes = [];
            objectsLayer.innerHTML = '';
            requestRender();
        });

        function spawnDraggableElement(type) {
            setMode('cursor');

            const el = document.createElement('div');
            if (type === 'sticky') {
                const theme = stickyThemes[stickyIdx % stickyThemes.length];
                stickyIdx++;
                el.className = `ziz-sticky ${theme}`;
            } else {
                el.className = 'ziz-text-box';
                el.style.color = color;
            }

            const topPos = window.scrollY + Math.round(window.innerHeight * 0.25) + Math.round(Math.random() * 40 - 20);
            const leftPos = window.scrollX + Math.round(window.innerWidth * 0.35) + Math.round(Math.random() * 40 - 20);
            el.style.top = topPos + 'px';
            el.style.left = Math.max(90, leftPos) + 'px';

            el.innerHTML = `
                <div class="ziz-item-bar" title="Потягни за цю панель, щоб перемістити">
                    <span class="ziz-drag-dots">⋮⋮</span>
                    <button type="button" class="ziz-del-btn" title="Видалити">&times;</button>
                </div>
                <div class="ziz-editable" contenteditable="true">${type === 'sticky' ? 'Нотатка...' : 'Введіть текст...'}</div>
            `;

            objectsLayer.appendChild(el);

            const editable = el.querySelector('.ziz-editable');
            editable.focus();
            const range = document.createRange();
            range.selectNodeContents(editable);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            el.querySelector('.ziz-del-btn').addEventListener('click', () => el.remove());

            const bar = el.querySelector('.ziz-item-bar');
            let dragging = false;
            let startX = 0, startY = 0, origLeft = 0, origTop = 0;

            bar.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.ziz-del-btn')) return;
                e.preventDefault();
                bar.setPointerCapture(e.pointerId);
                dragging = true;
                startX = e.clientX;
                startY = e.clientY;
                origLeft = parseFloat(el.style.left) || 0;
                origTop = parseFloat(el.style.top) || 0;
            });

            bar.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                el.style.left = (origLeft + (e.clientX - startX)) + 'px';
                el.style.top = (origTop + (e.clientY - startY)) + 'px';
            });

            bar.addEventListener('pointerup', () => {
                dragging = false;
            });
        }

        document.getElementById('zizBtnSticky').addEventListener('click', () => spawnDraggableElement('sticky'));
        document.getElementById('zizBtnText').addEventListener('click', () => spawnDraggableElement('text'));
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initCanvaBoard);
    } else {
        initCanvaBoard();
    }
})();
