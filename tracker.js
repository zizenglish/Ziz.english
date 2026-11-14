// =========================================================================
// ziz.english — Full Interactive Lesson Activity & Click Tracker (tracker.js)
// =========================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const hwId = params.get('hw_id');
    const studentId = params.get('student_id');

    if (!hwId || !studentId) return;

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

    // 1. Підрахунок активного часу
    setInterval(() => {
        if (!document.hidden) {
            state.active_seconds += 1;
        }
    }, 1000);

    setInterval(() => {
        syncToSupabase();
    }, 10000);

    // 2. Відстеження виходів з вкладки
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isTabVisible) {
            isTabVisible = false;
            state.tab_leaves += 1;
            scheduleSave(true);
        } else if (!document.hidden) {
            isTabVisible = true;
        }
    });

    // Допоміжна функція для визначення питання / контексту елемента
    function getQuestionContext(el, index) {
        // Шукаємо найближчий блок завдання або питання
        const container = el.closest('.question, .task, .exercise, .card, .item, li, tr, .quiz-item, .mcq-item, div');
        if (container) {
            // Беремо перший заголовок або текст питання в цьому блоці
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

    // 3. Відстеження вставки тексту (Ctrl+V / Paste)
    document.addEventListener('paste', (e) => {
        const target = e.target;
        if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && ['text', 'search', ''].includes(target.type)) || target.isContentEditable)) {
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

    // 4. Відстеження КЛІКІВ (кнопки вибору відповіді, картки matching, quiz-опції, кнопки перевірки)
    document.addEventListener('click', (e) => {
        // Ігноруємо кліки по порожньому фону сторінки
        const target = e.target.closest('button, label, [role="button"], .option, .choice, .answer, .quiz-option, .word-btn, .chip, .card-item, .match-item, li, input[type="radio"], input[type="checkbox"], [onclick]');
        if (!target) return;

        // Не логуємо кліки по нашому власному індикатору чи полям вводу тексту
        if (target.id === 'ziz-tracker-badge' || target.tagName === 'INPUT' && target.type === 'text' || target.tagName === 'TEXTAREA') return;

        let clickedText = (target.innerText || target.value || target.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        if (!clickedText || clickedText.length > 100) return;

        const context = getQuestionContext(target, state.clicked_actions.length);
        const timeStr = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Записуємо останній вибір для цього контексту в answers, щоб було видно фінальну відповідь
        if (target.tagName !== 'BUTTON' || !/check|submit|reset|next|show|перевір/i.test(clickedText)) {
            state.answers[`🖱️ ${context}`] = clickedText;
        }

        // Додаємо в хронологічний лог кліків (уникаємо дублів підряд за ту саму секунду)
        const lastClick = state.clicked_actions[state.clicked_actions.length - 1];
        if (!lastClick || lastClick.choice !== clickedText || lastClick.context !== context) {
            state.clicked_actions.push({
                context: context,
                choice: clickedText,
                time: timeStr
            });
            // Тримаємо останні 150 кліків, щоб не перевантажувати базу
            if (state.clicked_actions.length > 150) {
                state.clicked_actions.shift();
            }
        }

        // Зберігаємо з невеликою затримкою (300мс), щоб встигли оновитися класи .selected / .correct у самому уроці
        setTimeout(() => {
            collectAllAnswers();
            scheduleSave(false);
        }, 300);
    }, true);

    // 5. Збір усіх відповідей (інпути, селекти, радіо, чекбокси + виділені елементи в інтерактивних вправах)
    function collectAllAnswers() {
        // Зберігаємо вже зафіксовані кліки
        const collected = {};
        Object.entries(state.answers).forEach(([k, v]) => {
            if (k.startsWith('🖱️ ')) collected[k] = v;
        });

        // Стандартні форми (input, textarea, select)
        const elements = document.querySelectorAll('input, textarea, select');
        elements.forEach((el, idx) => {
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
                if (val) {
                    collected[`✍️ ${label}`] = val;
                }
            }
        });

        // Кастомні інтерактивні кнопки/картки, які урок позначив як вибрані (active / selected / correct / wrong / chosen)
        const selectedCustom = document.querySelectorAll('.selected, .chosen, .active-option, .is-selected, [aria-checked="true"], [aria-pressed="true"]');
        selectedCustom.forEach((el, idx) => {
            const text = el.innerText?.replace(/\s+/g, ' ').trim();
            if (text && text.length < 100 && !el.closest('nav, header')) {
                const qLabel = getQuestionContext(el, idx);
                collected[`✅ ${qLabel}`] = text;
            }
        });

        state.answers = collected;
    }

    document.addEventListener('input', () => {
        collectAllAnswers();
        scheduleSave(false);
    }, true);

    document.addEventListener('change', () => {
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
        saveTimeout = setTimeout(() => {
            syncToSupabase();
        }, 1800);
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
        } catch (err) {
            console.error('Tracker sync error:', err);
        }
    }

    window.addEventListener('beforeunload', () => {
        syncToSupabase();
    });

    function initTracker() {
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
            zIndex: '99999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none'
        });
        document.body.appendChild(badge);
        syncToSupabase();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initTracker);
    } else {
        initTracker();
    }
})();
