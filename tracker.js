// =========================================================================
// ziz.english — Student Homework Activity & Anti-Cheat Tracker (tracker.js)
// =========================================================================
(function () {
    const params = new URLSearchParams(window.location.search);
    const hwId = params.get('hw_id');
    const studentId = params.get('student_id');

    // Трекер вмикається ТІЛЬКИ коли учень відкриває урок як домашнє завдання
    // (через кнопку в My Classroom, де передаються hw_id та student_id)
    if (!hwId || !studentId) return;

    const SUPABASE_URL = 'https://vnvjcgafvfkmqbzeyajo.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Ij_gV7Q-X7j617TkJR84xg_0EyJPLOi';

    // Стан трекінгу
    const state = {
        started_at: new Date().toISOString(),
        active_seconds: 0,
        tab_leaves: 0,
        paste_events: [],
        answers: {},
        last_updated: new Date().toISOString()
    };

    let isTabVisible = !document.hidden;
    let saveTimeout = null;

    // 1. Підрахунок активного часу (секунди, коли вкладка відкрита)
    setInterval(() => {
        if (!document.hidden) {
            state.active_seconds += 1;
        }
    }, 1000);

    // Автоматичне збереження прогресу кожні 15 секунд
    setInterval(() => {
        syncToSupabase();
    }, 15000);

    // 2. Відстеження виходів з вкладки / згортання браузера
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isTabVisible) {
            isTabVisible = false;
            state.tab_leaves += 1;
            scheduleSave(true);
        } else if (!document.hidden) {
            isTabVisible = true;
        }
    });

    // Допоміжна функція для визначення назви/контексту поля введення
    function getFieldLabel(el, index) {
        if (el.id) return el.id;
        if (el.name) return el.name;
        if (el.placeholder) return el.placeholder.slice(0, 45);
        const prevText = el.closest('div, li, p, tr, section')?.innerText || '';
        const clean = prevText.replace(/\s+/g, ' ').trim().slice(0, 55);
        return clean || `Field #${index + 1}`;
    }

    // 3. Відстеження вставки тексту (Ctrl+V / Paste) у відкриті відповіді
    document.addEventListener('paste', (e) => {
        const target = e.target;
        if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && ['text', 'search', ''].includes(target.type)) || target.isContentEditable)) {
            const pastedText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
            if (pastedText.trim().length > 0) {
                const allInputs = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'));
                const idx = allInputs.indexOf(target);
                const label = getFieldLabel(target, idx >= 0 ? idx : 0);

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

    // 4. Збір усіх відповідей учня (текстові поля, випадаючі списки, радіокнопки, чекбокси)
    function collectAllAnswers() {
        const collected = {};
        const elements = document.querySelectorAll('input, textarea, select');

        elements.forEach((el, idx) => {
            if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

            const label = getFieldLabel(el, idx);

            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) {
                    const optionText = el.parentElement?.innerText?.trim().slice(0, 60) || el.value || 'Checked';
                    collected[label] = optionText;
                }
            } else if (el.tagName === 'SELECT') {
                if (el.value) {
                    const selectedText = el.options[el.selectedIndex]?.text || el.value;
                    collected[label] = selectedText;
                }
            } else {
                const val = el.value?.trim();
                if (val) {
                    collected[label] = val;
                }
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

    // 5. Відправка даних у Supabase через REST API (працює без додаткових бібліотек)
    function scheduleSave(immediate) {
        if (immediate) {
            clearTimeout(saveTimeout);
            syncToSupabase();
            return;
        }
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            syncToSupabase();
        }, 2500);
    }

    async function syncToSupabase() {
        collectAllAnswers();
        state.last_updated = new Date().toISOString();

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/assignments?id=eq.${encodeURIComponent(hwId)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    tracking_data: state
                }),
                keepalive: true
            });
        } catch (err) {
            // Тиха обробка помилок мережі
        }
    }

    // Збереження перед закриттям вкладки
    window.addEventListener('beforeunload', () => {
        syncToSupabase();
    });

    // Невеликий індикатор для учня внизу екрана, що відповіді автозберігаються
    window.addEventListener('DOMContentLoaded', () => {
        const badge = document.createElement('div');
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
    });
})();
