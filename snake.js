document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram Mini App
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Получение элементов DOM
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const taskModal = document.getElementById('task-modal');
    const taskQuestion = document.getElementById('task-question');
    const taskAnswer = document.getElementById('task-answer');
    const submitAnswer = document.getElementById('submit-answer');
    const taskResult = document.getElementById('task-result');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreElement = document.getElementById('final-score');
    const newRecordElement = document.getElementById('new-record');
    const playAgainButton = document.getElementById('play-again');
    const backToMenuButton = document.getElementById('back-to-menu');

    // Кнопки управления
    const upButton = document.getElementById('up');
    const leftButton = document.getElementById('left');
    const rightButton = document.getElementById('right');
    const downButton = document.getElementById('down');

    // Задания
    const tasks = [
        {q:"She ___ (to go) to school every day.", a:"goes"},
        {q:"They ___ (to eat) dinner at 7 PM yesterday.", a:"ate"},
        {q:"I ___ (to be) very happy last week.", a:"was"},
        {q:"He ___ (to work) in the garden right now.", a:"is working"},
        {q:"We ___ (to see) that movie already.", a:"have seen"}
    ];

    // Параметры игры
    const gridSize = 10;
    const cellSize = canvas.width / gridSize;
    let snake = [{x: 4, y: 4}]; // Начальное положение змейки
    let direction = 'right';
    let nextDirection = 'right';
    let food = [];
    let score = 0;
    let bestScore = 0;
    let gameInterval;
    let isPaused = false;
    let gameSpeed = 300; // Миллисекунды между обновлениями

    // Получение лучшего результата из Telegram
    function getBestScore() {
        // В реальном приложении здесь будет запрос к серверу
        // Для демонстрации используем localStorage
        const savedBestScore = localStorage.getItem('snakeBestScore');
        if (savedBestScore) {
            bestScore = parseInt(savedBestScore);
            bestScoreElement.textContent = bestScore;
        }
    }

    // Обновление лучшего результата
    function updateBestScore() {
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('snakeBestScore', bestScore);
            bestScoreElement.textContent = bestScore;
            return true;
        }
        return false;
    }

    // Создание еды в случайных местах
    function createFood() {
        food = [];
        for (let i = 0; i < 5; i++) {
            let newFood;
            let isOverlapping;

            do {
                isOverlapping = false;
                newFood = {
                    x: Math.floor(Math.random() * gridSize),
                    y: Math.floor(Math.random() * gridSize)
                };

                // Проверка на совпадение с змейкой
                for (let segment of snake) {
                    if (segment.x === newFood.x && segment.y === newFood.y) {
                        isOverlapping = true;
                        break;
                    }
                }

                // Проверка на совпадение с другой едой
                for (let existingFood of food) {
                    if (existingFood.x === newFood.x && existingFood.y === newFood.y) {
                        isOverlapping = true;
                        break;
                    }
                }
            } while (isOverlapping);

            food.push(newFood);
        }
    }

    // Отрисовка игры
    function draw() {
        // Очистка холста
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-secondary-bg-color') || '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Отрисовка змейки
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];

            // Голова змейки
            if (i === 0) {
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-button-color') || '#3390ec';
            }
            // Тело змейки
            else {
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-link-color') || '#2481cc';
            }

            ctx.fillRect(
                segment.x * cellSize + 1,
                segment.y * cellSize + 1,
                cellSize - 2,
                cellSize - 2
            );
        }

        // Отрисовка еды
        ctx.fillStyle = '#e74c3c'; // Красный цвет для ягод
        for (let item of food) {
            ctx.beginPath();
            ctx.arc(
                item.x * cellSize + cellSize/2,
                item.y * cellSize + cellSize/2,
                cellSize/2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Отрисовка сетки
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        // Вертикальные линии
        for (let i = 1; i < gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
        }

        // Горизонтальные линии
        for (let i = 1; i < gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }
    }

    // Обновление состояния игры
    function update() {
        if (isPaused) return;

        direction = nextDirection;

        // Создаем новую голову змейки
        const head = {...snake[0]};

        // Обновляем позицию головы в зависимости от направления
        switch (direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }

        // Проверка на столкновение со стеной
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            gameOver();
            return;
        }

        // Проверка на столкновение с самим собой
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        // Добавляем новую голову
        snake.unshift(head);

        // Проверка на столкновение с едой
        let foundFood = false;
        for (let i = 0; i < food.length; i++) {
            if (head.x === food[i].x && head.y === food[i].y) {
                food.splice(i, 1);
                score += 1;
                scoreElement.textContent = score;
                foundFood = true;

                // Показываем задание
                showTask();
                break;
            }
        }

        // Если еды не найдено, удаляем хвост змейки
        if (!foundFood) {
            snake.pop();
        }

        // Проверка на окончание игры (все ягоды съедены)
        if (food.length === 0) {
            gameOver(true);
            return;
        }
    }

    // Показать задание
    function showTask() {
        isPaused = true;
        clearInterval(gameInterval);

        // Выбираем случайное задание
        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
        taskQuestion.textContent = randomTask.q;
        taskAnswer.value = '';
        taskResult.textContent = '';
        taskResult.className = '';

        // Сохраняем правильный ответ в атрибуте
        taskQuestion.dataset.answer = randomTask.a;

        // Показываем модальное окно
        taskModal.style.display = 'flex';
        taskAnswer.focus();
    }

    // Проверка ответа
    function checkAnswer() {
        const userAnswer = taskAnswer.value.trim().toLowerCase();
        const correctAnswer = taskQuestion.dataset.answer.toLowerCase();

        if (userAnswer === correctAnswer) {
            taskResult.textContent = 'Правильно!';
            taskResult.className = 'correct';

            // Закрываем модальное окно через 1 секунду
            setTimeout(function() {
                taskModal.style.display = 'none';
                isPaused = false;
                // Возобновляем игру
                gameInterval = setInterval(gameLoop, gameSpeed);
            }, 1000);
        } else {
            taskResult.textContent = 'Неправильно! Попробуйте еще раз.';
            taskResult.className = 'incorrect';
            taskAnswer.value = '';
            taskAnswer.focus();
        }
    }

    // Окончание игры
    function gameOver(completed = false) {
        clearInterval(gameInterval);

        finalScoreElement.textContent = `Ваш счет: ${score}`;

        // Проверка на новый рекорд
        if (updateBestScore()) {
            newRecordElement.classList.remove('hidden');
        } else {
            newRecordElement.classList.add('hidden');
        }

        gameOverModal.style.display = 'flex';
    }

    // Основной игровой цикл
    function gameLoop() {
        update();
        draw();
    }

    // Сброс игры
    function resetGame() {
        snake = [{x: 4, y: 4}];
        direction = 'right';
        nextDirection = 'right';
        score = 0;
        scoreElement.textContent = '0';
        isPaused = false;

        createFood();
        gameOverModal.style.display = 'none';

        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }

    // Обработчики событий

    // Клавиатура (для компьютеров)
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case 'ArrowUp':
                if (direction !== 'down') nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (direction !== 'up') nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (direction !== 'right') nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (direction !== 'left') nextDirection = 'right';
                break;
        }
    });

    // Кнопки управления (для мобильных)
    upButton.addEventListener('click', function() {
        if (direction !== 'down') nextDirection = 'up';
    });

    downButton.addEventListener('click', function() {
        if (direction !== 'up') nextDirection = 'down';
    });

    leftButton.addEventListener('click', function() {
        if (direction !== 'right') nextDirection = 'left';
    });

    rightButton.addEventListener('click', function() {
        if (direction !== 'left') nextDirection = 'right';
    });

    // Мобильные события касания
    upButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'down') nextDirection = 'up';
    });

    downButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'up') nextDirection = 'down';
    });

    leftButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'right') nextDirection = 'left';
    });

    rightButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (direction !== 'left') nextDirection = 'right';
    });

    // Проверка ответа
    submitAnswer.addEventListener('click', checkAnswer);

    taskAnswer.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    // Кнопки после окончания игры
    playAgainButton.addEventListener('click', resetGame);

    backToMenuButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // Инициализация игры
    getBestScore();
    createFood();
    draw();
    gameInterval = setInterval(gameLoop, gameSpeed);
});
