// Глобальные переменные
let currentSession = null;
let sessions = {};
let currentExpert = null;
let checkInterval = null;
let pairwiseSelections = {}; // Временное хранилище для парных выборов

// Инициализация приложения
function initApp() {
    console.log('🔧 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ');
    
    // Загружаем сессии из localStorage
    try {
        const stored = localStorage.getItem('expertSessions');
        sessions = stored ? JSON.parse(stored) : {};
        console.log('📂 Загружено сессий:', Object.keys(sessions).length);
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки сессий, используем пустой объект');
        sessions = {};
    }
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    if (sessionCode) {
        console.log('👤 Режим эксперта (код из URL):', sessionCode);
        showExpertPage();
        document.getElementById('sessionCode').value = sessionCode;
    } else {
        console.log('👑 Режим админа');
        showAdminPage();
    }
    
    // Запускаем синхронизацию каждые 2 секунды
    checkInterval = setInterval(checkForUpdates, 2000);
}

// Создание сессии
function createSession() {
    const sessionName = document.getElementById('sessionName').value?.trim() || 'Тестовая сессия';
    const expertsCount = Math.max(1, parseInt(document.getElementById('expertsCount').value) || 5);
    const objectsCount = Math.max(2, parseInt(document.getElementById('objectsCount').value) || 4);
    const method = document.getElementById('evaluationMethod').value;

    const sessionCode = generateSessionCode();

    currentSession = {
        id: sessionCode,
        name: sessionName,
        expertsCount: expertsCount,
        objectsCount: objectsCount,
        method: method,
        experts: [],
        votes: {},
        status: 'inviting',
        createdAt: new Date().toISOString(),
        objects: Array.from({ length: objectsCount }, (_, i) => `Объект ${i + 1}`)
    };

    sessions[sessionCode] = currentSession;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    console.log('✅ Сессия создана:', currentSession);
    showInvitationStep();
}

// Показать шаг приглашений
function showInvitationStep() {
    if (!currentSession) {
        alert('Ошибка: сессия не создана');
        return;
    }
    
    document.getElementById('currentSessionName').textContent = currentSession.name;
    document.getElementById('sessionCodeDisplay').textContent = currentSession.id;
    document.getElementById('totalExperts').textContent = currentSession.expertsCount;

    const invitationLink = `${window.location.origin}${window.location.pathname}?session=${currentSession.id}`;
    document.getElementById('invitationLink').value = invitationLink;

    // Очистка QR-кода
    const qrcodeEl = document.getElementById('qrcode');
    qrcodeEl.innerHTML = '';

    // Генерация QR-кода
    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrcodeEl, {
                text: invitationLink,
                width: 180,
                height: 180,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.Q
            });
        } else {
            throw new Error('QRCode not loaded');
        }
    } catch (error) {
        console.error('❌ Не удалось создать QR-код:', error);
        showCodeFallback();
    }

    nextStep(2);
    updateExpertsList();
}

function showCodeFallback() {
    document.getElementById('qrcode').innerHTML = `
        <div class="session-code-large">
            <div class="code-title">📱 Код сессии для ручного ввода</div>
            <div class="code-value">${currentSession.id}</div>
            <div class="code-instruction">Отсканируйте QR-код или введите этот код</div>
        </div>
    `;
}

// Присоединение эксперта
function joinSession() {
    const expertName = document.getElementById('expertName').value?.trim();
    let sessionCode = document.getElementById('sessionCode').value?.trim().toUpperCase();

    if (!expertName) {
        alert('Пожалуйста, введите ваше имя');
        return;
    }

    // Если код не введён, но есть в URL — используем его
    if (!sessionCode) {
        const urlParams = new URLSearchParams(window.location.search);
        sessionCode = urlParams.get('session')?.toUpperCase();
        if (sessionCode) {
            document.getElementById('sessionCode').value = sessionCode;
        } else {
            alert('Пожалуйста, введите код сессии');
            return;
        }
    }

    let session = sessions[sessionCode];

    if (!session) {
        // Создаём локальную сессию для эксперта
        session = {
            id: sessionCode,
            name: `Сессия ${sessionCode}`,
            expertsCount: 10,
            objectsCount: 4,
            method: 'direct',
            experts: [],
            votes: {},
            status: 'voting', // Изначально в состоянии голосования
            createdAt: new Date().toISOString(),
            objects: ['Объект 1', 'Объект 2', 'Объект 3', 'Объект 4']
        };
        sessions[sessionCode] = session;
        localStorage.setItem('expertSessions', JSON.stringify(sessions));
        console.log('✅ Создана локальная сессия для эксперта');
    }

    // Найти или создать эксперта
    let expert = session.experts.find(e => e.name === expertName);
    if (!expert) {
        expert = {
            id: generateExpertId(),
            name: expertName,
            joinedAt: new Date().toISOString()
        };
        session.experts.push(expert);
        // Обновляем админскую сессию, если она есть на этом устройстве
        updateAdminSession(sessionCode, expert);
    }

    currentExpert = expert;
    currentSession = session;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));

    // Показываем интерфейс голосования, а не экран ожидания
    showExpertVoting(session);
}

// Обновление сессии админа (если на том же устройстве)
function updateAdminSession(sessionCode, expert) {
    const adminSession = sessions[sessionCode];
    if (adminSession && adminSession.expertsCount) {
        const exists = adminSession.experts.some(e => e.id === expert.id);
        if (!exists) {
            adminSession.experts.push(expert);
            localStorage.setItem('expertSessions', JSON.stringify(sessions));
            console.log('✅ Эксперт добавлен в админскую сессию');
        }
    }
}

// Показать интерфейс голосования
function showExpertVoting(session) {
    document.getElementById('expertSessionName').textContent = session.name;
    
    // Скрыть все шаги эксперта
    document.querySelectorAll('#expertPage .step').forEach(el => el.classList.remove('active'));
    document.getElementById('expertVoting').classList.add('active');

    const container = document.getElementById('expertVotingContainer');
    switch (session.method) {
        case 'direct':
            container.innerHTML = renderDirectRatingInterface(session);
            break;
        case 'ranking':
            container.innerHTML = renderRankingInterface(session);
            break;
        case 'pairwise':
            pairwiseSelections = {}; // сброс
            container.innerHTML = renderPairwiseInterface(session);
            break;
        default:
            container.innerHTML = renderDirectRatingInterface(session);
    }
}

// Парное сравнение — выбор
function selectPairOption(element, selectedObj, otherObj, pairKey) {
    const pairOptions = element.closest('.pair-options').querySelectorAll('.pair-option');
    pairOptions.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    pairwiseSelections[pairKey] = selectedObj;
    console.log('Выбор в паре:', pairKey, '→', selectedObj);
}

// Рендер интерфейса парного сравнения
function renderPairwiseInterface(session) {
    let pairs = [];
    for (let i = 0; i < session.objects.length; i++) {
        for (let j = i + 1; j < session.objects.length; j++) {
            pairs.push({
                obj1: session.objects[i],
                obj2: session.objects[j],
                key: `${session.objects[i]}|${session.objects[j]}`
            });
        }
    }

    return `
        <div class="voting-interface">
            <h3>⚖️ Парное сравнение</h3>
            <p><strong>Сессия:</strong> ${session.name}</p>
            <p><strong>Метод:</strong> ${getMethodName(session.method)}</p>
            <p><strong>Ваше имя:</strong> ${currentExpert.name}</p>
            
            <div class="objects-list">
                <h4>Выберите более предпочтительный объект в каждой паре:</h4>
                ${pairs.map((pair, idx) => `
                    <div class="object-card">
                        <div class="object-name">Сравнение ${idx + 1}</div>
                        <div class="pair-options">
                            <div class="pair-option" onclick="selectPairOption(this, '${pair.obj1}', '${pair.obj2}', '${pair.key}')">
                                <h4>${pair.obj1}</h4>
                            </div>
                            <div class="pair-option" onclick="selectPairOption(this, '${pair.obj2}', '${pair.obj1}', '${pair.key}')">
                                <h4>${pair.obj2}</h4>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Отправка оценки
function submitVote() {
    if (!currentSession || !currentExpert) return;

    const session = sessions[currentSession.id];
    let votes = {};

    switch (session.method) {
        case 'direct':
            const sliders = document.querySelectorAll('.rating-slider');
            session.objects.forEach((obj, i) => {
                votes[obj] = parseInt(sliders[i]?.value) || 0;
            });
            break;

        case 'ranking':
            const inputs = document.querySelectorAll('.ranking-input');
            session.objects.forEach((obj, i) => {
                votes[obj] = parseInt(inputs[i]?.value) || (i + 1);
            });
            break;

        case 'pairwise':
            // Преобразуем парные выборы в оценки (простой подсчёт побед)
            const scores = {};
            session.objects.forEach(obj => scores[obj] = 0);
            Object.values(pairwiseSelections).forEach(winner => {
                if (scores[winner] !== undefined) scores[winner]++;
            });
            votes = scores;
            break;
    }

    // Сохраняем голос
    session.votes[currentExpert.id] = {
        expert: currentExpert.name,
        votes: votes,
        submittedAt: new Date().toISOString()
    };

    sessions[currentSession.id] = session;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));

    // Переключаем на экран ожидания
    document.querySelectorAll('#expertPage .step').forEach(el => el.classList.remove('active'));
    document.getElementById('expertWaiting').classList.add('active');

    updateCompletedCount();
    alert('✅ Ваша оценка успешно отправлена!');

    // Добавлено: Проверяем, есть ли уже голос у эксперта
    // Если да, то обновляем UI
    // Это уже делается в updateCompletedCount(), но можно вызвать явно
    // updateCompletedCount(); // Вызов уже есть выше
}

// Обновление счётчика завершивших
function updateCompletedCount() {
    const session = sessions[currentSession?.id];
    if (!session) return;

    const completed = Object.keys(session.votes).length;
    const total = session.expertsCount || session.experts.length || 0;

    document.getElementById('completedCount').textContent = completed;
    document.getElementById('totalExpertsCount').textContent = total;
}

// Обновление списка экспертов (админ)
function updateExpertsList() {
    const session = sessions[currentSession?.id];
    if (!session) return;

    const container = document.getElementById('connectedExperts');
    const count = session.experts.length;

    document.getElementById('connectedCount').textContent = count;
    document.getElementById('totalExperts').textContent = session.expertsCount;

    if (count === 0) {
        container.innerHTML = '<div class="empty-state">👥 Пока никто не присоединился</div>';
        document.getElementById('startVotingBtn').disabled = true;
    } else {
        container.innerHTML = session.experts.map(expert => `
            <div class="expert-item">
                <div class="expert-avatar">${expert.name.charAt(0).toUpperCase()}</div>
                <div class="expert-name">${expert.name}</div>
                <div class="expert-status">${session.votes[expert.id] ? '✅' : '⏳'}</div>
            </div>
        `).join('');
        document.getElementById('startVotingBtn').disabled = false;
    }
}

// Проверка обновлений из localStorage
function checkForUpdates() {
    try {
        const stored = localStorage.getItem('expertSessions');
        if (stored) {
            const updated = JSON.parse(stored);
            Object.assign(sessions, updated);
        }
    } catch (e) {
        console.warn('Не удалось обновить сессии из localStorage');
    }

    if (currentSession) {
        const session = sessions[currentSession.id];
        if (session) {
            if (document.getElementById('step2')?.classList.contains('active')) {
                updateExpertsList();
            }
            if (document.getElementById('expertWaiting')?.classList.contains('active')) {
                updateCompletedCount();
            }
            if (document.getElementById('step3')?.classList.contains('active')) {
                updateVotingProgress();
            }
        }
    }
}

// Управление навигацией
function nextStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

function prevStep(step) {
    nextStep(step);
}

function showAdminPage() {
    document.querySelector('.container').style.display = 'block';
    document.getElementById('expertPage').style.display = 'none';
}

function showExpertPage() {
    document.querySelector('.container').style.display = 'none';
    document.getElementById('expertPage').style.display = 'block';
    document.querySelectorAll('#expertPage .step').forEach(el => el.classList.remove('active'));
    document.getElementById('expertJoin').classList.add('active');
}

// Копирование ссылки
function copyLink() {
    const input = document.getElementById('invitationLink');
    input.select();
    input.setSelectionRange(0, 99999); // Для мобильных
    document.execCommand('copy');
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = '✅ Скопировано!';
    setTimeout(() => btn.textContent = original, 2000);
}

// Начало голосования
function startVoting() {
    const session = sessions[currentSession.id];
    session.status = 'voting';
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    nextStep(3);
    document.getElementById('votingSessionName').textContent = session.name;
    updateVotingProgress();
}

function updateVotingProgress() {
    const session = sessions[currentSession.id];
    const container = document.getElementById('votingProgress');
    if (!container || !session) return;

    container.innerHTML = session.experts.map(expert => `
        <div class="progress-card ${session.votes[expert.id] ? 'completed' : 'pending'}">
            <div class="expert-name">${expert.name}</div>
            <div class="expert-status">
                <span class="status-badge ${session.votes[expert.id] ? 'status-completed' : 'status-pending'}">
                    ${session.votes[expert.id] ? '✅ Завершено' : '⏳ Ожидает'}
                </span>
            </div>
        </div>
    `).join('');

    const completedCount = Object.keys(session.votes).length;
    document.getElementById('showResultsBtn').disabled = completedCount === 0;
}

// Показ результатов
function showResults() {
    const session = sessions[currentSession.id];
    session.status = 'completed';
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    nextStep(4);
    document.getElementById('resultsSessionName').textContent = session.name;

    const results = calculateResults(session);
    document.getElementById('resultsContainer').innerHTML = `
        <div class="results">
            <h3>🎉 Результаты оценки</h3>
            <p>Завершено оценок: ${Object.keys(session.votes).length} из ${session.experts.length}</p>
            
            <div class="winner">
                <h3>🏆 Победитель: ${results.winner}</h3>
                <p>Средний балл: ${results.scores[results.winner].toFixed(2)}</p>
            </div>
            
            <table class="voting-table">
                <thead>
                    <tr>
                        <th>Объект</th>
                        <th>Средний балл</th>
                        <th>Место</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.ranking.map((obj, i) => `
                        <tr>
                            <td>${obj}</td>
                            <td>${results.scores[obj].toFixed(2)}</td>
                            <td>${i + 1}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function calculateResults(session) {
    const scores = {};
    session.objects.forEach(obj => scores[obj] = 0);

    const votes = Object.values(session.votes);
    if (votes.length === 0) {
        session.objects.forEach(obj => scores[obj] = 0);
    } else {
        votes.forEach(vote => {
            session.objects.forEach(obj => {
                scores[obj] += vote.votes[obj] || 0;
            });
        });
        const avg = session.objects.reduce((acc, obj) => {
            acc[obj] = scores[obj] / votes.length;
            return acc;
        }, {});
        scores = avg;
    }

    const ranking = [...session.objects].sort((a, b) => scores[b] - scores[a]);
    return { scores, ranking, winner: ranking[0] };
}

// Вспомогательные функции
function generateSessionCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // без I, L, O, 0, 1
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateExpertId() {
    return 'expert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

function getMethodName(method) {
    return {
        direct: 'Непосредственная оценка (0–10)',
        ranking: 'Ранжирование',
        pairwise: 'Парное сравнение'
    }[method] || method;
}

function createNewSession() {
    currentSession = null;
    currentExpert = null;
    pairwiseSelections = {};
    nextStep(1);
    document.getElementById('sessionName').value = '';
}

function exportResults() {
    alert('📊 Экспорт результатов будет реализован в будущем');
}

function leaveSession() {
    currentExpert = null;
    pairwiseSelections = {};
    showExpertPage();
}

// Инициализация
window.onload = initApp;

window.addEventListener('beforeunload', () => {
    if (checkInterval) clearInterval(checkInterval);
});
