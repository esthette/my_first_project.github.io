// Глобальные переменные
let currentSession = null;
let sessions = JSON.parse(localStorage.getItem('expertSessions')) || {};
let currentExpert = null;
let checkInterval = null;

// Инициализация приложения
function initApp() {
    // Проверяем, есть ли параметры сессии в URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCode = urlParams.get('session');
    
    debug('Инициализация приложения. Session code: ' + (sessionCode || 'не найден'));
    
    if (sessionCode) {
        // Показываем страницу эксперта
        showExpertPage();
        document.getElementById('sessionCode').value = sessionCode;
        
        // Автоматически заполняем код сессии
        if (sessions[sessionCode]) {
            document.getElementById('sessionCode').value = sessionCode;
        }
    } else {
        // Показываем страницу админа
        showAdminPage();
    }
    
    // Запускаем проверку обновлений каждые 2 секунды
    checkInterval = setInterval(checkForUpdates, 2000);
}

// Функция для отладки
function debug(message) {
    console.log('DEBUG:', message);
    const debugDiv = document.getElementById('debugInfo');
    const debugText = document.getElementById('debugText');
    if (debugDiv && debugText) {
        debugDiv.style.display = 'block';
        debugText.textContent = message;
    }
}

// Показать страницу админа
function showAdminPage() {
    document.getElementById('expertPage').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
}

// Показать страницу эксперта
function showExpertPage() {
    document.querySelector('.container').style.display = 'none';
    document.getElementById('expertPage').style.display = 'block';
    
    // Показываем только форму присоединения
    document.getElementById('expertJoin').classList.add('active');
    document.getElementById('expertVoting').classList.remove('active');
    document.getElementById('expertWaiting').classList.remove('active');
    document.getElementById('expertResults').classList.remove('active');
}

// Создание сессии
function createSession() {
    const sessionName = document.getElementById('sessionName').value || 'Тестовая сессия';
    const expertsCount = parseInt(document.getElementById('expertsCount').value) || 5;
    const objectsCount = parseInt(document.getElementById('objectsCount').value) || 4;
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
    
    console.log('Сессия создана:', sessionCode);
    debug('Сессия создана: ' + sessionCode);
    
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
    updateExpertsList();
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
    const sessionCodeInput = document.getElementById('sessionCode');
    let sessionCode = sessionCodeInput.value.trim().toUpperCase();
    
    // Если код сессии пустой, пробуем взять из URL
    if (!sessionCode) {
        const urlParams = new URLSearchParams(window.location.search);
        sessionCode = urlParams.get('session');
        if (sessionCode) {
            sessionCodeInput.value = sessionCode;
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
    
    const session = sessions[sessionCode];
    if (!session) {
        alert('Сессия с таким кодом не найдена. Попросите администратора создать сессию заново.');
        return;
    }
    
    // Проверяем, не присоединился ли уже эксперт с таким именем
    const existingExpert = session.experts.find(e => e.name === expertName);
    if (existingExpert) {
        // Если эксперт уже присоединялся, используем его данные
        currentExpert = existingExpert;
        alert(`Добро пожаловать обратно, ${expertName}!`);
    } else {
        // Добавляем нового эксперта
        currentExpert = {
            id: generateExpertId(),
            name: expertName,
            joinedAt: new Date().toISOString()
        };
        session.experts.push(currentExpert);
    }
    
    currentSession = session;
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
    container.innerHTML = '<div class="voting-interface"></div>';
    
    const votingInterface = container.querySelector('.voting-interface');
    
    // Создаем интерфейс голосования в зависимости от метода
    switch(session.method) {
        case 'direct':
            renderDirectVoting(votingInterface, session.objects);
            break;
        case 'ranking':
            renderRankingVoting(votingInterface, session.objects);
            break;
        case 'pairwise':
            renderPairwiseVoting(votingInterface, session.objects);
            break;
    }
}

// Рендеринг интерфейса непосредственной оценки
function renderDirectVoting(container, objects) {
    container.innerHTML = `
        <h3>Оцените каждый объект по шкале от 0 до 10</h3>
        <p>Используйте ползунки для оценки</p>
    `;
    
    objects.forEach((object, index) => {
        const objectCard = document.createElement('div');
        objectCard.className = 'object-card';
        objectCard.innerHTML = `
            <h4>${object}</h4>
            <input type="range" class="rating-slider" min="0" max="10" step="0.5" value="5" 
                   oninput="updateRatingValue(this, ${index})">
            <div class="rating-value" id="ratingValue${index}">5.0</div>
        `;
        container.appendChild(objectCard);
    });
}

// Рендеринг интерфейса ранжирования
function renderRankingVoting(container, objects) {
    container.innerHTML = `
        <h3>Упорядочьте объекты по предпочтению</h3>
        <p>Перетащите объекты от наиболее предпочтительного (сверху) к наименее предпочтительному (снизу)</p>
        <ul class="ranking-list" id="rankingList"></ul>
    `;
    
    const rankingList = document.getElementById('rankingList');
    
    // Перемешиваем объекты для начального порядка
    const shuffledObjects = [...objects].sort(() => Math.random() - 0.5);
    
    shuffledObjects.forEach((object, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'ranking-item';
        listItem.draggable = true;
        listItem.innerHTML = `
            <span>${object}</span>
            <div class="ranking-number">${index + 1}</div>
        `;
        listItem.setAttribute('data-object', object);
        rankingList.appendChild(listItem);
    });
    
    makeListSortable(rankingList);
}

// Рендеринг интерфейса парного сравнения
function renderPairwiseVoting(container, objects) {
    container.innerHTML = `
        <h3>Сравните объекты попарно</h3>
        <p>Для каждой пары выберите предпочтительный объект</p>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Объект A</th>
                    <th>Объект B</th>
                    <th>Предпочтение</th>
                </tr>
            </thead>
            <tbody id="comparisonBody"></tbody>
        </table>
    `;
    
    const comparisonBody = document.getElementById('comparisonBody');
    
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${objects[i]}</td>
                <td>${objects[j]}</td>
                <td>
                    <input type="radio" name="pair-${i}-${j}" value="${objects[i]}" class="comparison-option"> ${objects[i]}
                    <input type="radio" name="pair-${i}-${j}" value="${objects[j]}" class="comparison-option"> ${objects[j]}
                </td>
            `;
            comparisonBody.appendChild(row);
        }
    }
}

// Обновление значения рейтинга
function updateRatingValue(slider, index) {
    document.getElementById(`ratingValue${index}`).textContent = slider.value;
}

// Сделать список перетаскиваемым
function makeListSortable(list) {
    let draggedItem = null;
    
    list.querySelectorAll('li').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            setTimeout(() => this.style.opacity = '0.5', 0);
        });
        
        item.addEventListener('dragend', function() {
            setTimeout(() => {
                draggedItem.style.opacity = '1';
                draggedItem = null;
                updateRankingNumbers(list);
            }, 0);
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        item.addEventListener('dragenter', function(e) {
            e.preventDefault();
            this.style.backgroundColor = '#f8f9fa';
        });
        
        item.addEventListener('dragleave', function() {
            this.style.backgroundColor = '';
        });
        
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.backgroundColor = '';
            if (this !== draggedItem) {
                list.insertBefore(draggedItem, this);
            }
        });
    });
}

// Обновление номеров в ранжировании
function updateRankingNumbers(list) {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
        item.querySelector('.ranking-number').textContent = index + 1;
    });
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

// Сбор оценок эксперта
function collectExpertVotes() {
    if (!currentSession) return null;
    
    const session = sessions[currentSession.id];
    const votes = {};
    
    switch(session.method) {
        case 'direct':
            const sliders = document.querySelectorAll('.rating-slider');
            sliders.forEach((slider, index) => {
                votes[session.objects[index]] = parseFloat(slider.value);
            });
            break;
            
        case 'ranking':
            const rankingItems = document.querySelectorAll('.ranking-item');
            rankingItems.forEach((item, index) => {
                const object = item.getAttribute('data-object');
                votes[object] = index + 1; // Позиция в рейтинге
            });
            break;
            
        case 'pairwise':
            const comparisons = {};
            const rows = document.querySelectorAll('#comparisonBody tr');
            rows.forEach(row => {
                const objectA = row.cells[0].textContent;
                const objectB = row.cells[1].textContent;
                const selectedRadio = row.querySelector('input[type="radio"]:checked');
                
                if (selectedRadio) {
                    comparisons[`${objectA}-${objectB}`] = selectedRadio.value;
                }
            });
            
            // Проверяем, все ли сравнения выполнены
            const totalComparisons = (session.objects.length * (session.objects.length - 1)) / 2;
            if (Object.keys(comparisons).length !== totalComparisons) {
                alert('Пожалуйста, завершите все попарные сравнения');
                return null;
            }
            
            Object.assign(votes, comparisons);
            break;
    }
    
    return votes;
}

// Обновление счетчика завершивших
function updateCompletedCount() {
    if (!currentSession) return;
    
    const session = sessions[currentSession.id];
    const completedCount = Object.keys(session.votes).length;
    const totalExperts = session.expertsCount;
    
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalExpertsCount').textContent = totalExperts;
