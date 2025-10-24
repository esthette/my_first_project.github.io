// Глобальные переменные
let currentSession = null;
let sessions = {};
let currentExpert = null;
let checkInterval = null;

// Инициализация приложения
function initApp() {
    console.log('🔧 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ');
    
    // Загружаем сессии из localStorage
    try {
        const stored = localStorage.getItem('expertSessions');
        sessions = stored ? JSON.parse(stored) : {};
        console.log('📂 Загружено сессий:', Object.keys(sessions).length);
    } catch (error) {
        console.log('⚠️ Ошибка загрузки, используем пустой объект');
        sessions = {};
    }
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    console.log('🔗 Session code из URL:', sessionCode);
    
    if (sessionCode) {
        console.log('👤 Режим эксперта');
        showExpertPage();
        document.getElementById('sessionCode').value = sessionCode;
        
        if (sessions[sessionCode]) {
            console.log('✅ Сессия найдена в localStorage');
        } else {
            console.log('❌ Сессия не найдена, но показываем форму');
        }
    } else {
        console.log('👑 Режим админа');
        showAdminPage();
    }
    
    // Запускаем синхронизацию каждые 2 секунды
    checkInterval = setInterval(checkForUpdates, 2000);
}

// Создание сессии
function createSession() {
    console.log('🎯 СОЗДАНИЕ СЕССИИ');
    
    const sessionName = document.getElementById('sessionName').value || 'Тестовая сессия';
    const expertsCount = parseInt(document.getElementById('expertsCount').value) || 5;
    const objectsCount = parseInt(document.getElementById('objectsCount').value) || 4;
    const method = document.getElementById('evaluationMethod').value;
    
    // Генерация кода сессии
    const sessionCode = generateSessionCode();
    
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
    
    // Сохраняем в localStorage
    sessions[sessionCode] = currentSession;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    console.log('✅ Сессия создана:', currentSession);
    
    // Переходим к приглашениям
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
    
    // 🔥 УПРОЩЕННАЯ ссылка - ТОЛЬКО код сессии
    const invitationLink = `${window.location.origin}${window.location.pathname}?session=${currentSession.id}`;
    
    document.getElementById('invitationLink').value = invitationLink;
    
    console.log('🔗 Короткая ссылка для QR-кода:', invitationLink);
    console.log('📏 Длина ссылки:', invitationLink.length, 'символов');
    
    // Генерация QR-кода для КОРОТКОЙ ссылки
    document.getElementById('qrcode').innerHTML = '';
    try {
        new QRCode(document.getElementById('qrcode'), {
            text: invitationLink,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.Q
        });
        console.log('✅ QR-код создан для короткой ссылки');
    } catch (error) {
        console.error('❌ Ошибка создания QR-кода:', error);
        showCodeFallback();
    }
    
    nextStep(2);
    updateExpertsList();
}

// Резервный вариант - показ кода сессии
function showCodeFallback() {
    document.getElementById('qrcode').innerHTML = `
        <div class="session-code-large">
            <div class="code-title">📱 Код сессии для ручного ввода</div>
            <div class="code-value">${currentSession.id}</div>
            <div class="code-instruction">Отсканируйте QR-код выше или введите этот код</div>
        </div>
    `;
}

// Присоединение эксперта к сессии
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
    
    console.log('🔍 Ищем сессию по коду:', sessionCode);
    
    // 🔥 Ищем сессию в localStorage текущего устройства
    let session = sessions[sessionCode];
    
    if (!session) {
        console.error('❌ Сессия не найдена в этом браузере');
        alert('❌ Сессия не найдена в этом браузере!\n\n' +
              'Это нормально! Система создаст новую сессию на этом устройстве.\n\n' +
              'Администратор увидит вас в списке экспертов.');
        
        // 🔥 СОЗДАЕМ ЛОКАЛЬНУЮ КОПИЮ СЕССИИ
        session = createLocalSession(sessionCode, expertName);
    }
    
    if (!session) {
        alert('❌ Не удалось создать сессию');
        return;
    }
    
    // Добавляем/находим эксперта
    const existingExpert = session.experts.find(e => e.name === expertName);
    if (existingExpert) {
        currentExpert = existingExpert;
        console.log('👋 Эксперт вернулся:', expertName);
    } else {
        currentExpert = {
            id: generateExpertId(),
            name: expertName,
            joinedAt: new Date().toISOString()
        };
        session.experts.push(currentExpert);
        console.log('👋 Новый эксперт:', expertName);
    }
    
    currentSession = session;
    
    // Сохраняем в localStorage ЭТОГО устройства
    sessions[sessionCode] = session;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    // 🔥 ОБНОВЛЯЕМ СЕССИЮ АДМИНА (если он на этом же устройстве)
    updateAdminSession(sessionCode, session);
    
    console.log('✅ Эксперт присоединился к сессии:', sessionCode);
    
    // Показываем интерфейс голосования
    showExpertVoting(session);
}

// 🔥 Создание локальной копии сессии для эксперта
function createLocalSession(sessionCode, expertName) {
    console.log('🔨 Создаем локальную сессию для эксперта');
    
    // Базовая сессия
    const session = {
        id: sessionCode,
        name: `Сессия ${sessionCode}`,
        expertsCount: 10,
        objectsCount: 4,
        method: 'direct',
        experts: [],
        votes: {},
        status: 'inviting',
        createdAt: new Date().toISOString(),
        objects: ['Объект 1', 'Объект 2', 'Объект 3', 'Объект 4']
    };
    
    sessions[sessionCode] = session;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    console.log('✅ Локальная сессия создана:', session);
    return session;
}

// 🔥 Обновление сессии админа (если он на том же устройстве)
function updateAdminSession(sessionCode, expertSession) {
    // Ищем админскую сессию
    for (const code in sessions) {
        const session = sessions[code];
        if (session && session.experts) {
            // Если это админская сессия (есть expertsCount)
            if (session.expertsCount && session.id === sessionCode) {
                console.log('🔁 Обновляем админскую сессию');
                
                // Добавляем эксперта в админскую сессию
                const expertExists = session.experts.find(e => e.name === currentExpert.name);
                if (!expertExists) {
                    session.experts.push(currentExpert);
                    localStorage.setItem('expertSessions', JSON.stringify(sessions));
                    console.log('✅ Эксперт добавлен в админскую сессию');
                }
                break;
            }
        }
    }
}

// Показать интерфейс голосования для эксперта
function showExpertVoting(session) {
    document.getElementById('expertSessionName').textContent = session.name;
    document.getElementById('expertJoin').classList.remove('active');
    document.getElementById('expertVoting').classList.add('active');
    
    const container = document.getElementById('expertVotingContainer');
    
    // Простой интерфейс голосования
    container.innerHTML = `
        <div class="voting-interface">
            <h3>🎯 Оценка объектов</h3>
            <p><strong>Сессия:</strong> ${session.name}</p>
            <p><strong>Метод:</strong> ${getMethodName(session.method)}</p>
            <p><strong>Ваше имя:</strong> ${currentExpert.name}</p>
            
            <div class="objects-list">
                <h4>Оцените объекты (0-10 баллов):</h4>
                ${session.objects.map((object, index) => `
                    <div class="object-card">
                        <div class="object-name">${object}</div>
                        <input type="range" class="rating-slider" min="0" max="10" step="1" value="5" 
                               oninput="document.getElementById('rating${index}').textContent = this.value">
                        <div class="rating-display">
                            Оценка: <span id="rating${index}" class="rating-value">5</span>/10
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button class="btn btn-success" onclick="submitVote()" style="margin-top: 20px;">
                ✅ Отправить оценку
            </button>
        </div>
    `;
    
    console.log('🎯 Эксперт начал голосование');
}

// Отправка оценки экспертом
function submitVote() {
    if (!currentSession || !currentExpert) return;
    
    const session = sessions[currentSession.id];
    const sliders = document.querySelectorAll('.rating-slider');
    const votes = {};
    
    session.objects.forEach((object, index) => {
        votes[object] = parseInt(sliders[index].value) || 0;
    });
    
    // Сохраняем оценку
    session.votes[currentExpert.id] = {
        expert: currentExpert.name,
        votes: votes,
        submittedAt: new Date().toISOString()
    };
    
    sessions[currentSession.id] = session;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    // Показываем экран ожидания
    document.getElementById('expertVoting').classList.remove('active');
    document.getElementById('expertWaiting').classList.add('active');
    
    updateCompletedCount();
    console.log('✅ Оценка отправлена:', votes);
    
    alert('✅ Ваша оценка отправлена! Ожидайте результатов.');
}

// Обновление счетчика завершивших
function updateCompletedCount() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    if (!session) return;
    
    const completedCount = Object.keys(session.votes).length;
    const totalExperts = session.expertsCount;
    
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalExpertsCount').textContent = totalExperts;
}

// Обновление списка экспертов (для админа)
function updateExpertsList() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    if (!session) return;
    
    const container = document.getElementById('connectedExperts');
    const connectedCount = session.experts.length;
    
    document.getElementById('connectedCount').textContent = connectedCount;
    document.getElementById('totalExperts').textContent = session.expertsCount;
    
    if (connectedCount === 0) {
        container.innerHTML = '<div class="empty-state">👥 Пока никто не присоединился</div>';
        document.getElementById('startVotingBtn').disabled = true;
    } else {
        container.innerHTML = '';
        session.experts.forEach(expert => {
            const expertElement = document.createElement('div');
            expertElement.className = 'expert-item';
            expertElement.innerHTML = `
                <div class="expert-avatar">${expert.name.charAt(0)}</div>
                <div class="expert-name">${expert.name}</div>
                <div class="expert-status">
                    ${session.votes[expert.id] ? '✅' : '⏳'}
                </div>
            `;
            container.appendChild(expertElement);
        });
        document.getElementById('startVotingBtn').disabled = false;
    }
}

// Проверка обновлений
function checkForUpdates() {
    // Обновляем данные из localStorage
    try {
        const stored = localStorage.getItem('expertSessions');
        if (stored) {
            const updatedSessions = JSON.parse(stored);
            Object.assign(sessions, updatedSessions);
        }
    } catch (error) {
        // Игнорируем ошибки
    }
    
    // Обновляем UI если нужно
    if (currentSession) {
        const session = sessions[currentSession.id];
        if (session) {
            if (document.getElementById('step2')?.classList.contains('active')) {
                updateExpertsList();
            }
            if (document.getElementById('expertWaiting')?.classList.contains('active')) {
                updateCompletedCount();
            }
        }
    }
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
        'direct': 'Непосредственная оценка (0-10)',
        'ranking': 'Ранжирование', 
        'pairwise': 'Парное сравнение'
    };
    return names[method] || method;
}

function nextStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

function prevStep(step) {
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

function copyLink() {
    const linkInput = document.getElementById('invitationLink');
    linkInput.select();
    document.execCommand('copy');
    
    const btn = event.target;
    btn.textContent = '✅ Скопировано!';
    setTimeout(() => btn.textContent = 'Копировать', 2000);
}

function startVoting() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    session.status = 'voting';
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    nextStep(3);
    document.getElementById('votingSessionName').textContent = session.name;
    
    // Показываем статус экспертов
    updateVotingProgress();
    
    alert('Голосование началось! Эксперты могут теперь оценивать объекты.');
}

function updateVotingProgress() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    const container = document.getElementById('votingProgress');
    
    if (!container) return;
    
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
    
    // Включаем кнопку показа результатов если есть завершившие
    const completedCount = Object.keys(session.votes).length;
    document.getElementById('showResultsBtn').disabled = completedCount === 0;
}

function showResults() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    session.status = 'completed';
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    nextStep(4);
    document.getElementById('resultsSessionName').textContent = session.name;
    
    // Рассчитываем и показываем результаты
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
                    ${results.ranking.map((object, index) => `
                        <tr>
                            <td>${object}</td>
                            <td>${results.scores[object].toFixed(2)}</td>
                            <td>${index + 1}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function calculateResults(session) {
    const scores = {};
    const objects = session.objects;
    
    // Инициализируем scores
    objects.forEach(object => {
        scores[object] = 0;
    });
    
    // Суммируем оценки
    Object.values(session.votes).forEach(vote => {
        objects.forEach(object => {
            scores[object] += vote.votes[object] || 0;
        });
    });
    
    // Вычисляем средние
    const expertCount = Object.keys(session.votes).length || 1;
    objects.forEach(object => {
        scores[object] = scores[object] / expertCount;
    });
    
    // Сортируем по убыванию баллов
    const ranking = objects.sort((a, b) => scores[b] - scores[a]);
    const winner = ranking[0];
    
    return { scores, ranking, winner };
}

function createNewSession() {
    currentSession = null;
    currentExpert = null;
    nextStep(1);
    document.getElementById('sessionName').value = '';
}

function exportResults() {
    alert('📊 Экспорт результатов будет доступен в следующей версии');
}

function leaveSession() {
    currentExpert = null;
    showExpertPage();
    document.getElementById('expertName').value = '';
}

// Инициализация при загрузке
window.onload = initApp;

// Очистка при закрытии страницы
window.addEventListener('beforeunload', function() {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
});
