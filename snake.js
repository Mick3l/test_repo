document.addEventListener('DOMContentLoaded', function() {

    const tg = window.Telegram.WebApp;

    tg.ready();
    tg.expand();

    function getInitData() {
        if (tg?.initData) return tg.initData;
        let m = window.location.search.match(/[?&]initData=([^&]*)/);
        return m ? decodeURIComponent(m[1]) : '';
    }
    function getUserIdFromInitData(initData) {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user && Telegram.WebApp.initDataUnsafe.user.id)
            return Telegram.WebApp.initDataUnsafe.user.id;
        let m = initData.match(/"id": *(\d+)/);
        return m ? Number(m[1]) : null;
    }

    const initData = getInitData();
    const user_id = getUserIdFromInitData(initData);
    if (!user_id) {
        alert("User not identified. Please open from Telegram.");
        throw 'no user';
    }

    const API = "https://threeinone.duckdns.org:8000/api/";
    

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
    const gameOverBackToMenuButton = document.getElementById('game-over-back-to-menu');

    

    const upButton = document.getElementById('up');
    const leftButton = document.getElementById('left');
    const rightButton = document.getElementById('right');
    const downButton = document.getElementById('down');

    

    const tasks = [
        {q:"She ___ (to go) to school every day.", a:"goes"},
        {q:"They ___ (to eat) dinner at 7 PM yesterday.", a:"ate"},
        {q:"I ___ (to be) very happy last week.", a:"was"},
        {q:"He ___ (to work) in the garden right now.", a:"is working"},
        {q:"We ___ (to see) that movie already.", a:"have seen"}
    ];

    const gridSize = 10;
    const cellSize = canvas.width / gridSize;
    let snake = [{x: 4, y: 4}];

    let direction = 'right';
    let nextDirection = 'right';
    let food = [];
    let score = 0;
    let bestScore = 0;
    let gameInterval;
    let isPaused = false;
    let gameSpeed = 300;

    function getBestScore() {
        fetch(API+"get_best_score/",{
            method:"POST",
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({user_id,game:'snake'})
        }).then(r=>r.json()).then(data=>{
            bestScore = data.score || 0;
            bestScoreElement.textContent = bestScore;
        });
    }

    function updateBestScore() {
        if (score > bestScore) {
            fetch(API+"set_best_score/",{
                method:"POST",
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({user_id,game:'snake',score})
            });
            bestScore = score;
            bestScoreElement.textContent = bestScore;
            return true;
        }
        return false;
    }

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

                

                for (let segment of snake) {
                    if (segment.x === newFood.x && segment.y === newFood.y) {
                        isOverlapping = true;
                        break;
                    }
                }

                

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

    

    function draw() {
        

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-secondary-bg-color') || '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        

        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];

            

            if (i === 0) {
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--tg-theme-button-color') || '#3390ec';
            }
            

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

        

        ctx.fillStyle = '#e74c3c'; 

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

        

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        

        for (let i = 1; i < gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
        }

        

        for (let i = 1; i < gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }
    }

    

    function update() {
        if (isPaused) return;

        direction = nextDirection;

        

        const head = {...snake[0]};

        

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

        

        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            gameOver();
            return;
        }

        

        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        

        snake.unshift(head);

        

        let foundFood = false;
        for (let i = 0; i < food.length; i++) {
            if (head.x === food[i].x && head.y === food[i].y) {
                food.splice(i, 1);
                score += 1;
                scoreElement.textContent = score;

                if (score > bestScore) {
                    fetch(API + "set_best_score/", {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id, game: 'snake', score })
                    });
                }

                foundFood = true;
                showTask();
                break;
            }
        }

        

        if (!foundFood) {
            snake.pop();
        }

        

        if (food.length === 0) {
            gameOver(true);
            return;
        }
    }

    

    function showTask() {
        isPaused = true;
        clearInterval(gameInterval);

        

        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
        taskQuestion.textContent = randomTask.q;
        taskAnswer.value = '';
        taskResult.textContent = '';
        taskResult.className = '';

        

        taskQuestion.dataset.answer = randomTask.a;

        

        taskModal.style.display = 'flex';
        taskAnswer.focus();
    }

    

    function checkAnswer() {
        const userAnswer = taskAnswer.value.trim().toLowerCase();
        const correctAnswer = taskQuestion.dataset.answer.toLowerCase();

        if (userAnswer === correctAnswer) {
            taskResult.textContent = 'Правильно!';
            taskResult.className = 'correct';

            

            setTimeout(function() {
                taskModal.style.display = 'none';
                isPaused = false;
                

                gameInterval = setInterval(gameLoop, gameSpeed);
            }, 1000);
        } else {
            taskResult.textContent = 'Неправильно! Попробуйте еще раз.';
            taskResult.className = 'incorrect';
            taskAnswer.value = '';
            taskAnswer.focus();
        }
    }

    

    function gameOver(completed = false) {
        clearInterval(gameInterval);

        finalScoreElement.textContent = `Ваш счет: ${score}`;

        if (updateBestScore()) {
            newRecordElement.classList.remove('hidden');
        } else {
            newRecordElement.classList.add('hidden');
        }

        gameOverModal.style.display = 'flex';
    }

    

    function gameLoop() {
        update();
        draw();
    }

    

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

    

    submitAnswer.addEventListener('click', checkAnswer);

    taskAnswer.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    

    playAgainButton.addEventListener('click', resetGame);

    backToMenuButton.addEventListener('click', function() {
        if (score > bestScore) {
            fetch(API+"set_best_score/", {
                method:"POST",
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({user_id, game: 'snake', score})
            }).then(r=>r.json()).then(()=>{
                alert("Поздравляем! Новый рекорд сохранён!");
                window.location.href = 'index.html';
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    gameOverBackToMenuButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    

    getBestScore();
    createFood();
    draw();
    gameInterval = setInterval(gameLoop, gameSpeed);
});
