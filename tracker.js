// =========================================================================
// ziz.english — Homework Activity Tracker + Canva-Style Smooth Teaching Dock
// =========================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const hwId = params.get('hw_id');
    const studentId = params.get('student_id');
    const isHomeworkMode = Boolean(hwId && studentId);

    // =====================================================================
    // PART 1: HOMEWORK TRACKER
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
            if (!document.body || document.getElementById('ziz-tracker-badge')) return;
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
                zIndex: '2147483640',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
            });
            document.body.appendChild(badge);
            syncToSupabase();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTrackerBadge);
        } else {
            initTrackerBadge();
        }
    }

    // =====================================================================
    // PART 2: CANVA-STYLE FLOATING VERTICAL DOCK (100% immune to lesson scripts)
    // =====================================================================
    function initCanvaBoard() {
        if (!document.body) {
            setTimeout(initCanvaBoard, 50);
            return;
        }
        if (document.getElementById('ziz-dock')) return;

        const style = document.createElement('style');
        style.textContent = `
            #ziz-viewport-canvas {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 2147483640 !important;
                pointer-events: none !important;
                touch-action: none !important;
            }
            #ziz-viewport-canvas.active {
                pointer-events: auto !important;
            }
            #ziz-objects-layer {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 0 !important;
                z-index: 2147483642 !important;
                pointer-events: none !important;
            }
            #ziz-dock {
                position: fixed !important;
                left: 16px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                background: #ffffff !important;
                border-radius: 999px !important;
                padding: 8px 6px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 6px !important;
                z-index: 2147483647 !important;
                pointer-events: auto !important;
                box-shadow: 0 8px 30px rgba(15, 23, 42, 0.14), 0 1px 3px rgba(15, 23, 42, 0.08) !important;
                border: 1px solid rgba(15, 23, 42, 0.08) !important;
                user-select: none !important;
            }
            #ziz-dock.minimized .ziz-dock-item:not(#zizToggleDockBtn) {
                display: none !important;
            }
            /* Використовуємо div замість button, щоб стилі/скрипти уроку не перебивали кліки */
            .ziz-dock-btn {
                width: 42px !important;
                height: 42px !important;
                min-width: 42px !important;
                min-height: 42px !important;
                border-radius: 50% !important;
                background: transparent !important;
                color: #1e293b !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                transition: background 0.15s ease, transform 0.1s ease !important;
                position: relative !important;
            }
            .ziz-dock-btn:hover {
                background: #f1f5f9 !important;
            }
            .ziz-dock-btn:active {
                transform: scale(0.92) !important;
            }
            .ziz-dock-btn.active {
                background: #e2e8f0 !important;
                color: #0f172a !important;
            }
            .ziz-dock-btn svg {
                width: 21px !important;
                height: 21px !important;
                pointer-events: none !important;
            }
            #ziz-subdock {
                position: fixed !important;
                left: 76px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                background: #ffffff !important;
                border-radius: 999px !important;
                padding: 12px 8px !important;
                display: none !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 10px !important;
                z-index: 2147483646 !important;
                pointer-events: auto !important;
                box-shadow: 0 10px 32px rgba(15, 23, 42, 0.16), 0 1px 3px rgba(15, 23, 42, 0.08) !important;
                border: 1px solid rgba(15, 23, 42, 0.08) !important;
                user-select: none !important;
            }
            #ziz-subdock.open {
                display: flex !important;
            }
            .ziz-nib-btn {
                width: 38px !important;
                height: 38px !important;
                border-radius: 12px !important;
                background: transparent !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .ziz-nib-btn:hover {
                background: #f1f5f9 !important;
            }
            .ziz-nib-btn.active {
                background: #f1f5f9 !important;
                box-shadow: inset 0 0 0 2px #cbd5e1 !important;
            }
            .ziz-nib-btn svg {
                pointer-events: none !important;
            }
            .ziz-sub-divider {
                width: 24px !important;
                height: 1px !important;
                background: #e2e8f0 !important;
            }
            .ziz-swatch {
                width: 24px !important;
                height: 24px !important;
                border-radius: 50% !important;
                border: 2px solid #ffffff !important;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.18) !important;
                cursor: pointer !important;
                pointer-events: auto !important;
            }
            .ziz-swatch.active {
                transform: scale(1.2) !important;
                box-shadow: 0 0 0 2px #0f172a !important;
            }
            .ziz-size-btn {
                width: 32px !important;
                height: 26px !important;
                border-radius: 8px !important;
                background: transparent !important;
                cursor: pointer !important;
                pointer-events: auto !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .ziz-size-btn:hover, .ziz-size-btn.active {
                background: #f1f5f9 !important;
            }
            .ziz-size-btn span {
                pointer-events: none !important;
            }
            .ziz-sticky {
                position: absolute !important;
                pointer-events: auto !important;
                width: 195px !important;
                min-height: 165px !important;
                padding: 14px 16px !important;
                border-radius: 6px 6px 22px 6px !important;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.16) !important;
                font-family: sans-serif !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .ziz-sticky.yellow { background: #fef08a !important; color: #1e293b !important; }
            .ziz-sticky.pink   { background: #fbcfe8 !important; color: #1e293b !important; }
            .ziz-sticky.mint   { background: #bbf7d0 !important; color: #1e293b !important; }
            .ziz-sticky.blue   { background: #bae6fd !important; color: #1e293b !important; }
            .ziz-text-box {
                position: absolute !important;
                pointer-events: auto !important;
                min-width: 120px !important;
                max-width: 440px !important;
                padding: 6px 10px !important;
                border-radius: 8px !important;
                background: rgba(255, 255, 255, 0.94) !important;
                border: 1.5px solid #cbd5e1 !important;
                font-family: sans-serif !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                line-height: 1.35 !important;
                box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important;
            }
            .ziz-item-bar {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
                margin-bottom: 6px !important;
                height: 18px !important;
                user-select: none !important;
            }
            .ziz-del-btn {
                background: rgba(0,0,0,0.1) !important;
                width: 20px !important;
                height: 20px !important;
                border-radius: 50% !important;
                font-size: 13px !important;
                cursor: pointer !important;
                color: #334155 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .ziz-del-btn:hover {
                background: #ef4444 !important;
                color: #ffffff !important;
            }
            .ziz-editable {
                outline: none !important;
                flex: 1 !important;
                word-break: break-word !important;
                cursor: text !important;
                min-height: 24px !important;
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
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item active" data-action="mode-cursor" title="Курсор">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" data-action="mode-draw" title="Пензлик і маркер">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 2l4 4L7.5 20.5 2 22l1.5-5.5L18 2z" fill="#ef4444" fill-opacity="0.18" stroke="#ef4444"/>
                    <path d="M14.5 5.5l4 4" stroke="#ef4444"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" data-action="add-sticky" title="Додати стікер">
                <svg viewBox="0 0 24 24" fill="#facc15" stroke="#eab308" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
                    <path d="M15 3v6h6" fill="#fef08a"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" data-action="add-text" title="Вставити текст">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7"/>
                    <line x1="9" y1="20" x2="15" y2="20"/>
                    <line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" data-action="undo" title="Скасувати (Ctrl+Z)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" data-action="clear" title="Очистити все">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-dock-btn ziz-dock-item" id="zizToggleDockBtn" data-action="toggle-dock" title="Згорнути / Розгорнути">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                </svg>
            </div>
        `;
        document.body.appendChild(dock);

        const subdock = document.createElement('div');
        subdock.id = 'ziz-subdock';
        subdock.innerHTML = `
            <div role="button" tabindex="0" class="ziz-nib-btn active" data-nib="pen" title="Пензлик">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-nib-btn" data-nib="highlighter" title="Маркер">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 11-6 6v3h9l3-3"/>
                    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" fill="#fef08a"/>
                </svg>
            </div>
            <div role="button" tabindex="0" class="ziz-nib-btn" data-nib="eraser" title="Гумка">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                    <path d="M22 21H7"/>
                    <path d="m5 11 9 9" fill="#ffe4e6"/>
                </svg>
            </div>
            <div class="ziz-sub-divider"></div>
            <div class="ziz-swatch active" data-color="#ef4444" style="background: #ef4444;"></div>
            <div class="ziz-swatch" data-color="#facc15" style="background: #facc15;"></div>
            <div class="ziz-swatch" data-color="#3b82f6" style="background: #3b82f6;"></div>
            <div class="ziz-swatch" data-color="#22c55e" style="background: #22c55e;"></div>
            <div class="ziz-swatch" data-color="#1e293b" style="background: #1e293b;"></div>
            <div class="ziz-sub-divider"></div>
            <div role="button" tabindex="0" class="ziz-size-btn active" data-scale="1">
                <span style="width: 18px; height: 2px; background: #1e293b; border-radius: 2px; display: block;"></span>
            </div>
            <div role="button" tabindex="0" class="ziz-size-btn" data-scale="1.8">
                <span style="width: 18px; height: 5px; background: #1e293b; border-radius: 3px; display: block;"></span>
            </div>
            <div role="button" tabindex="0" class="ziz-size-btn" data-scale="2.8">
                <span style="width: 18px; height: 8px; background: #1e293b; border-radius: 4px; display: block;"></span>
            </div>
        `;
        document.body.appendChild(subdock);

        let mode = 'cursor';
        let nib = 'pen';
        let color = '#ef4444';
        let sizeScale = 1;
        let strokes = [];
        let currentStroke = null;
        let isDrawingNow = false;
        let stickyIdx = 0;
        const stickyThemes = ['yellow', 'pink', 'mint', 'blue'];

        function resizeViewportCanvas() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            requestRender();
        }

        let renderScheduled = false;
        function requestRender() {
            if (renderScheduled) return;
            renderScheduled = true;
            requestAnimationFrame(() => {
                renderScheduled = false;
                renderAllStrokes();
            });
        }

        resizeViewportCanvas();
        window.addEventListener('resize', resizeViewportCanvas);
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
            const threshold = 18;
            const beforeCount = strokes.length;
            strokes = strokes.filter(s => {
                for (let i = 0; i < s.points.length; i++) {
                    const dx = s.points[i].x - pageX;
                    const dy = s.points[i].y - pageY;
                    if (dx * dx + dy * dy <= threshold * threshold) return false;
                }
                return true;
            });
            if (strokes.length !== beforeCount) requestRender();
        }

        function setMode(newMode) {
            mode = newMode;
            dock.querySelectorAll('[data-action^="mode-"]').forEach(b => {
                b.classList.toggle('active', b.dataset.action === `mode-${newMode}`);
            });
            if (newMode === 'draw') {
                canvas.classList.add('active');
                subdock.classList.add('open');
                canvas.style.cursor = nib === 'eraser' ? 'cell' : 'crosshair';
            } else {
                canvas.classList.remove('active');
                subdock.classList.remove('open');
            }
        }

        function undoLast() {
            if (strokes.length > 0) {
                strokes.pop();
                requestRender();
            }
        }

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
                <div class="ziz-item-bar" title="Потягни щоб перемістити">
                    <span style="font-size: 13px; letter-spacing: 2px; color: #475569; pointer-events: none;">⋮⋮</span>
                    <div class="ziz-del-btn" title="Видалити">&times;</div>
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
        }

        // =================================================================
        // CAPTURE-PHASE MOUSEDOWN HANDLER (перехоплює кліки ДО будь-яких скриптів уроку!)
        // =================================================================
        document.addEventListener('mousedown', (e) => {
            // 1. Клік по головній панелі
            const dockBtn = e.target.closest('#ziz-dock .ziz-dock-btn');
            if (dockBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const action = dockBtn.dataset.action;
                if (action === 'mode-cursor') {
                    setMode('cursor');
                } else if (action === 'mode-draw') {
                    if (mode === 'draw') {
                        subdock.classList.toggle('open');
                    } else {
                        setMode('draw');
                    }
                } else if (action === 'add-sticky') {
                    spawnDraggableElement('sticky');
                } else if (action === 'add-text') {
                    spawnDraggableElement('text');
                } else if (action === 'undo') {
                    undoLast();
                } else if (action === 'clear') {
                    strokes = [];
                    objectsLayer.innerHTML = '';
                    requestRender();
                } else if (action === 'toggle-dock') {
                    dock.classList.toggle('minimized');
                    if (dock.classList.contains('minimized')) setMode('cursor');
                }
                return;
            }

            // 2. Клік по виїжджаючій панелі налаштувань пензля
            const nibBtn = e.target.closest('#ziz-subdock .ziz-nib-btn');
            if (nibBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                subdock.querySelectorAll('.ziz-nib-btn').forEach(b => b.classList.remove('active'));
                nibBtn.classList.add('active');
                nib = nibBtn.dataset.nib;
                canvas.style.cursor = nib === 'eraser' ? 'cell' : 'crosshair';
                return;
            }

            const swatch = e.target.closest('#ziz-subdock .ziz-swatch');
            if (swatch) {
                e.preventDefault();
                e.stopImmediatePropagation();
                subdock.querySelectorAll('.ziz-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                color = swatch.dataset.color;
                if (nib === 'eraser') {
                    subdock.querySelectorAll('.ziz-nib-btn').forEach(b => b.classList.remove('active'));
                    subdock.querySelector('[data-nib="pen"]').classList.add('active');
                    nib = 'pen';
                    canvas.style.cursor = 'crosshair';
                }
                return;
            }

            const sizeBtn = e.target.closest('#ziz-subdock .ziz-size-btn');
            if (sizeBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                subdock.querySelectorAll('.ziz-size-btn').forEach(s => s.classList.remove('active'));
                sizeBtn.classList.add('active');
                sizeScale = parseFloat(sizeBtn.dataset.scale);
                return;
            }

            // 3. Видалення або перетягування стікера / тексту
            const delBtn = e.target.closest('#ziz-objects-layer .ziz-del-btn');
            if (delBtn) {
                e.preventDefault();
                e.stopImmediatePropagation();
                delBtn.closest('.ziz-sticky, .ziz-text-box')?.remove();
                return;
            }

            const itemBar = e.target.closest('#ziz-objects-layer .ziz-item-bar');
            if (itemBar) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const box = itemBar.closest('.ziz-sticky, .ziz-text-box');
                const startX = e.clientX;
                const startY = e.clientY;
                const origLeft = parseFloat(box.style.left) || 0;
                const origTop = parseFloat(box.style.top) || 0;

                function onDragMove(ev) {
                    box.style.left = (origLeft + (ev.clientX - startX)) + 'px';
                    box.style.top = (origTop + (ev.clientY - startY)) + 'px';
                }
                function onDragUp() {
                    window.removeEventListener('mousemove', onDragMove, true);
                    window.removeEventListener('mouseup', onDragUp, true);
                }
                window.addEventListener('mousemove', onDragMove, true);
                window.addEventListener('mouseup', onDragUp, true);
                return;
            }

            // 4. Малювання на полотні
            if (e.target === canvas && mode === 'draw' && e.button === 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
                isDrawingNow = true;
                const pageX = e.clientX + window.scrollX;
                const pageY = e.clientY + window.scrollY;

                if (nib === 'eraser') {
                    eraseAtPoint(pageX, pageY);
                } else {
                    currentStroke = { nib: nib, color: color, scale: sizeScale, points: [{ x: pageX, y: pageY }] };
                    requestRender();
                }
            }
        }, true);

        window.addEventListener('mousemove', (e) => {
            if (!isDrawingNow || mode !== 'draw') return;
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
        }, true);

        window.addEventListener('mouseup', () => {
            if (!isDrawingNow) return;
            isDrawingNow = false;
            if (currentStroke) {
                strokes.push(currentStroke);
                currentStroke = null;
                requestRender();
            }
        }, true);

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.target.isContentEditable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                undoLast();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCanvaBoard);
    } else {
        initCanvaBoard();
    }
})();
