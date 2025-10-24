// Глобальные переменные - храним в памяти для всех вкладок
window.expertSessions = window.expertSessions || {};
let currentSession = null;
let currentExpert = null;
let checkInterval = null;

// Инициализация приложения
function initApp() {
    console.log('🔧 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ');
    
    // Синхронизируем с window объекта (работает между вкладками)
    if (window.expertSessions) {
        sessions = window.expertSessions;
    }
    
    // Дублируем в localStorage для надежности
    try {
        const stored = localStorage.getItem('expertSessions');
        if (stored) {
            const parsed = JSON.parse(stored);
            Object.assign(sessions, parsed);
        }
    } catch (error) {
        console.log('⚠️ localStorage недоступен');
    }
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    console.log('🔗 Session code из URL:', sessionCode);
    console.log('📂 Доступные сессии:', Object.keys(sessions));
    
    if (sessionCode) {
        console.log('👤 Режим эксперта');
        showExpertPage();
        document.getElementById('sessionCode').value = sessionCode;
        
        if (sessions[sessionCode]) {
            console.log('✅ Сессия найдена:', sessions[sessionCode]);
        } else {
            console.log('❌ Сессия не найдена. Доступные:', Object.keys(sessions));
        }
    } else {
        console.log('👑 Режим админа');
        showAdminPage();
    }
    
    // Запускаем синхронизацию каждую секунду
    checkInterval = setInterval(syncSessions, 1000);
}

// Синхронизация сессий между вкладками
function syncSessions() {
    // Обновляем из window (глобальная переменная)
    if (window.expertSessions) {
        Object.assign(sessions, window.expertSessions);
    }
    
    // Обновляем из localStorage
    try {
        const stored = localStorage.getItem('expertSessions');
        if (stored) {
            const parsed = JSON.parse(stored);
            Object.assign(sessions, parsed);
        }
    } catch (error) {
        // Игнорируем ошибки localStorage
    }
    
    // Сохраняем обратно в window для других вкладок
    window.expertSessions = sessions;
    
    // Обновляем UI если нужно
    if (currentSession && document.getElementById('step2')?.classList.contains('active')) {
        updateExpertsList();
    }
}

// Создание сессии
function createSession() {
    console.log('🎯 НАЧАЛО СОЗДАНИЯ СЕССИИ');
    
    const sessionName = document.getElementById('sessionName').value || 'Тестовая сессия';
    const expertsCount = parseInt(document.getElementById('expertsCount').value) || 5;
    const objectsCount = parseInt(document.getElementById('objectsCount').value) || 4;
    const method = document.getElementById('evaluationMethod').value;
    
    // Генерация кода сессии
    const sessionCode = generateSessionCode();
    console.log('🆕 Код сессии:', sessionCode);
    
    // Создаем сессию
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
        objects: []
    };
    
    // Заполняем объекты
    for (let i = 1; i <= objectsCount; i++) {
        currentSession.objects.push(`Объект ${i}`);
    }
    
    console.log('📝 Создана сессия:', currentSession);
    
    // Сохраняем ВО ВСЕ ХРАНИЛИЩА
    sessions[sessionCode] = currentSession;
    
    // 1. В window (глобальная переменная) - работает между вкладками
    window.expertSessions = sessions;
    
    // 2. В localStorage
    try {
        localStorage.setItem('expertSessions', JSON.stringify(sessions));
        console.log('✅ Сохранено в localStorage');
    } catch (error) {
        console.log('⚠️ Не удалось сохранить в localStorage');
    }
    
    // 3. В sessionStorage
    try {
        sessionStorage.setItem('expertSessions', JSON.stringify(sessions));
        console.log('✅ Сохранено в sessionStorage');
    } catch (error) {
        console.log('⚠️ Не удалось сохранить в sessionStorage');
    }
    
    console.log('💾 Итоговые сессии:', sessions);
    
    // Переходим к приглашениям
    showInvitationStep();
    console.log('🎉 Сессия создана успешно!');
}

// Присоединение эксперта к сессии - ИСПРАВЛЕННАЯ ВЕРСИЯ
function joinSession() {
    const expertName = document.getElementById('expertName').value.trim();
    let sessionCode = document.getElementById('sessionCode').value.trim().toUpperCase();
    
    // Если код пустой, берем из URL
    if (!sessionCode) {
        const urlParams = new URLSearchParams(window.location.search);
        sessionCode = urlParams.get('session');
        if (sessionCode) {
            document.getElementById('sessionCode').value = sessionCode;
        }
    }
    
    if (!expertName) {
        alert('Пожалуйста, введите ваше имя');
        return;
    }
    
    if (!sessionCode) {
        alert('Пожалуйста, введите код сессии');
        return;
    }
    
    console.log('🔍 Ищем сессию:', sessionCode);
    console.log('📂 Все сессии:', sessions);
    
    // Синхронизируем перед поиском
    syncSessions();
    
    const session = sessions[sessionCode];
    
    if (!session) {
        console.error('❌ Сессия не найдена. Доступные:', Object.keys(sessions));
        alert('Сессия с кодом ' + sessionCode + ' не найдена.\n\nПопросите администратора:' +
              '\n1. Создать сессию заново' +
              '\n2. Отправить новую ссылку' +
              '\n3. Убедиться, что сессия активна');
        return;
    }
    
    // Проверяем, не присоединился ли уже эксперт
    const existingExpert = session.experts.find(e => e.name === expertName);
    if (existingExpert) {
        currentExpert = existingExpert;
        console.log('👋 Эксперт вернулся:', expertName);
    } else {
        // Добавляем нового эксперта
        currentExpert = {
            id: generateExpertId(),
            name: expertName,
            joinedAt: new Date().toISOString()
        };
        session.experts.push(currentExpert);
        console.log('👋 Новый эксперт:', expertName);
    }
    
    currentSession = session;
    
    // Сохраняем изменения
    saveSessions();
    
    // Показываем интерфейс голосования
    showExpertVoting(session);
}

// Сохранение сессий во все хранилища
function saveSessions() {
    // 1. Window
    window.expertSessions = sessions;
    
    // 2. LocalStorage
    try {
        localStorage.setItem('expertSessions', JSON.stringify(sessions));
    } catch (error) {
        console.log('⚠️ Ошибка localStorage');
    }
    
    // 3. SessionStorage
    try {
        sessionStorage.setItem('expertSessions', JSON.stringify(sessions));
    } catch (error) {
        console.log('⚠️ Ошибка sessionStorage');
    }
}

// Показать интерфейс голосования для эксперта
function showExpertVoting(session) {
    document.getElementById('expertSessionName').textContent = session.name;
    document.getElementById('expertJoin').classList.remove('active');
    document.getElementById('expertVoting').classList.add('active');
    
    const container = document.getElementById('expertVotingContainer');
    container.innerHTML = '<div class="voting-interface"></div>';
    
    const votingInterface = container.querySelector('.voting-interface');
    
    // Простой интерфейс для теста
    votingInterface.innerHTML = `
        <h3>Оценка объектов</h3>
        <p>Сессия: <strong>${session.name}</strong></p>
        <p>Метод: <strong>${getMethodName(session.method)}</strong></p>
        
        <div class="test-voting">
            <h4>Тестовый интерфейс голосования</h4>
            ${session.objects.map(object => `
                <div class="object-card">
                    <label>${object}:</label>
                    <input type="number" min="0" max="10" value="5" class="rating-input">
                </div>
            `).join('')}
        </div>
        
        <p><small>Это тестовый интерфейс. Полная версия будет реализована позже.</small></p>
    `;
    
    console.log('🎯 Эксперт начал голосование');
}

// Отправка оценки экспертом
function submitVote() {
    if (!currentSession || !currentExpert) return;
    
    const session = sessions[currentSession.id];
    const inputs = document.querySelectorAll('.rating-input');
    const votes = {};
    
    session.objects.forEach((object, index) => {
        votes[object] = parseFloat(inputs[index].value) || 0;
    });
    
    // Сохраняем оценку
    session.votes[currentExpert.id] = {
        expert: currentExpert.name,
        votes: votes,
        submittedAt: new Date().toISOString()
    };
    
    saveSessions();
    
    // Показываем экран ожидания
    document.getElementById('expertVoting').classList.remove('active');
    document.getElementById('expertWaiting').classList.add('active');
    
    updateCompletedCount();
    console.log('✅ Оценка отправлена:', votes);
}

// Обновление счетчика завершивших
function updateCompletedCount() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    const completedCount = Object.keys(session.votes).length;
    const totalExperts = session.expertsCount;
    
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalExpertsCount').textContent = totalExperts;
}

// Вспомогательные функции
function generateSessionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateExpertId() {
    return 'expert_' + Math.random().toString(36).substr(2, 9);
}

function getMethodName(method) {
    const names = {
        'direct': 'Непосредственная оценка',
        'ranking': 'Ранжирование', 
        'pairwise': 'Парное сравнение'
    };
    return names[method] || method;
}

function nextStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

function showAdminPage() {
    document.getElementById('expertPage').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
}

function showExpertPage() {
    document.querySelector('.container').style.display = 'none';
    document.getElementById('expertPage').style.display = 'block';
    document.getElementById('expertJoin').classList.add('active');
}

// Обновление списка экспертов
function updateExpertsList() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    if (!session) return;
    
    const container = document.getElementById('connectedExperts');
    const connectedCount = session.experts.length;
    
    document.getElementById('connectedCount').textContent = connectedCount;
    document.getElementById('totalExperts').textContent = session.expertsCount;
    
    if (connectedCount === 0) {
        container.innerHTML = '<div class="empty-state">Пока никто не присоединился</div>';
        document.getElementById('startVotingBtn').disabled = true;
    } else {
        container.innerHTML = '';
        session.experts.forEach(expert => {
            const expertElement = document.createElement('div');
            expertElement.className = 'expert-item';
            expertElement.innerHTML = `
                <div class="expert-avatar">${expert.name.charAt(0)}</div>
                <div class="expert-name">${expert.name}</div>
            `;
            container.appendChild(expertElement);
        });
        document.getElementById('startVotingBtn').disabled = false;
    }
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
    
    // Генерация ссылки
    const invitationLink = `${window.location.origin}${window.location.pathname}?session=${currentSession.id}`;
    document.getElementById('invitationLink').value = invitationLink;
    
    // Генерация QR-кода
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: invitationLink,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    nextStep(2);
    updateExpertsList();
}

function copyLink() {
    const linkInput = document.getElementById('invitationLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Ссылка скопирована!');
}

function startVoting() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    session.status = 'voting';
    saveSessions();
    
    nextStep(3);
    document.getElementById('votingSessionName').textContent = session.name;
    alert('Голосование началось!');
}

function showResults() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    session.status = 'completed';
    saveSessions();
    
    nextStep(4);
    document.getElementById('resultsSessionName').textContent = session.name;
    
    document.getElementById('resultsContainer').innerHTML = `
        <div class="results-placeholder">
            <h3>Результаты оценки</h3>
            <p>Завершено оценок: ${Object.keys(session.votes).length} из ${session.experts.length}</p>
            <div class="winner">
                <h3>Система работает! 🎉</h3>
                <p>Эксперты могут присоединяться и голосовать</p>
            </div>
        </div>
    `;
}

function createNewSession() {
    currentSession = null;
    currentExpert = null;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.getElementById('sessionName').value = '';
}

function exportResults() {
    alert('Функция экспорта в разработке');
}

function leaveSession() {
    currentExpert = null;
    showExpertPage();
    document.getElementById('expertName').value = '';
}

// Инициализация при загрузке
window.onload = initApp;
window.addEventListener('beforeunload', function() {
    if (checkInterval) clearInterval(checkInterval);
});
