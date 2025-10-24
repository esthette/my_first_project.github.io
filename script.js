// Глобальные переменные
let currentSession = null;
let sessions = JSON.parse(localStorage.getItem('expertSessions')) || {};
let currentExpert = null;

// Инициализация приложения
function initApp() {
    // Проверяем, есть ли параметры сессии в URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    if (sessionCode && sessions[sessionCode]) {
        // Показываем страницу эксперта
        showExpertPage();
        document.getElementById('sessionCode').value = sessionCode;
    } else {
        // Показываем страницу админа
        showAdminPage();
    }
}

// Создание сессии
function createSession() {
    const sessionName = document.getElementById('sessionName').value || 'Сессия оценки';
    const expertsCount = parseInt(document.getElementById('expertsCount').value);
    const objectsCount = parseInt(document.getElementById('objectsCount').value);
    const method = document.getElementById('evaluationMethod').value;
    
    // Генерация уникального кода сессии
    const sessionCode = generateSessionCode();
    
    // Создание сессии
    currentSession = {
        id: sessionCode,
        name: sessionName,
        expertsCount: expertsCount,
        objectsCount: objectsCount,
        method: method,
        experts: [],
        votes: {},
        status: 'inviting',
        createdAt: new Date().toISOString()
    };
    
    // Генерация объектов
    currentSession.objects = [];
    for (let i = 1; i <= objectsCount; i++) {
        currentSession.objects.push(`Объект ${i}`);
    }
    
    // Сохранение сессии
    sessions[sessionCode] = currentSession;
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    // Переход к шагу приглашений
    showInvitationStep();
}

// Показать шаг приглашений
function showInvitationStep() {
    document.getElementById('currentSessionName').textContent = currentSession.name;
    document.getElementById('sessionCodeDisplay').textContent = currentSession.id;
    document.getElementById('totalExperts').textContent = currentSession.expertsCount;
    
    // Генерация ссылки приглашения
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
}

// Копирование ссылки
function copyLink() {
    const linkInput = document.getElementById('invitationLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    // Визуальное подтверждение
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Скопировано!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Присоединение эксперта к сессии
function joinSession() {
    const expertName = document.getElementById('expertName').value.trim();
    const sessionCode = document.getElementById('sessionCode').value.trim().toUpperCase();
    
    if (!expertName) {
        alert('Пожалуйста, введите ваше имя');
        return;
    }
    
    if (!sessionCode) {
        alert('Пожалуйста, введите код сессии');
        return;
    }
    
    const session = sessions[sessionCode];
    if (!session) {
        alert('Сессия с таким кодом не найдена');
        return;
    }
    
    if (session.experts.length >= session.expertsCount) {
        alert('В сессии уже максимальное количество экспертов');
        return;
    }
    
    // Проверяем, не присоединился ли уже эксперт с таким именем
    if (session.experts.some(e => e.name === expertName)) {
        alert('Эксперт с таким именем уже присоединился к сессии');
        return;
    }
    
    // Добавляем эксперта
    currentExpert = {
        id: generateExpertId(),
        name: expertName,
        joinedAt: new Date().toISOString()
    };
    
    session.experts.push(currentExpert);
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    // Показываем интерфейс голосования
    showExpertVoting(session);
}

// Показать интерфейс голосования для эксперта
function showExpertVoting(session) {
    document.getElementById('expertSessionName').textContent = session.name;
    document.getElementById('expertJoin').classList.remove('active');
    document.getElementById('expertVoting').classList.add('active');
    
    const container = document.getElementById('expertVotingContainer');
    container.innerHTML = '';
    
    // Создаем интерфейс голосования в зависимости от метода
    switch(session.method) {
        case 'direct':
            renderDirectVoting(container, session.objects);
            break;
        case 'ranking':
            renderRankingVoting(container, session.objects);
            break;
        case 'pairwise':
            renderPairwiseVoting(container, session.objects);
            break;
    }
}

// Отправка оценки экспертом
function submitVote() {
    if (!currentSession || !currentExpert) return;
    
    const session = sessions[currentSession.id];
    const votes = collectExpertVotes();
    
    if (!votes) {
        alert('Пожалуйста, завершите оценку всех объектов');
        return;
    }
    
    // Сохраняем оценку
    session.votes[currentExpert.id] = {
        expert: currentExpert.name,
        votes: votes,
        submittedAt: new Date().toISOString()
    };
    
    localStorage.setItem('expertSessions', JSON.stringify(sessions));
    
    // Показываем экран ожидания
    document.getElementById('expertVoting').classList.remove('active');
    document.getElementById('expertWaiting').classList.add('active');
    
    // Обновляем счетчик завершивших
    updateCompletedCount();
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
}

// Инициализация при загрузке
window.onload = initApp;

// Заглушки для функций, которые нужно реализовать
function startVoting() {
    // Реализация начала голосования
    console.log('Начало голосования');
}

function showResults() {
    // Реализация показа результатов
    console.log('Показать результаты');
}

function createNewSession() {
    // Реализация создания новой сессии
    console.log('Создать новую сессию');
}

function exportResults() {
    // Реализация экспорта результатов
    console.log('Экспорт результатов');
}

function leaveSession() {
    // Реализация выхода из сессии
    console.log('Выйти из сессии');
}

function updateCompletedCount() {
    // Обновление счетчика завершивших экспертов
}

function collectExpertVotes() {
    // Сбор оценок эксперта
    return {};
}

function renderDirectVoting(container, objects) {
    // Рендеринг интерфейса непосредственной оценки
}

function renderRankingVoting(container, objects) {
    // Рендеринг интерфейса ранжирования
}

function renderPairwiseVoting(container, objects) {
    // Рендеринг интерфейса парного сравнения
}