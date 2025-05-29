document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready(); tg.expand();

    function getInitData() {
        if (tg?.initData) return tg.initData;
        let m = window.location.search.match(/[?&]initData=([^&]*)/);
        return m ? decodeURIComponent(m[1]) : '';
    }
    function getUserIdFromInitData(initData) {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id)
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        let m = initData.match(/"id": *(\d+)/);
        return m ? Number(m[1]) : null;
    }
    const initData = getInitData();
    const user_id = getUserIdFromInitData(initData);
    if (!user_id) {
        alert("User not identified. Please open from Telegram.");
        throw 'no user';
    }

    let modalVerbsData = [
        {questionStart: "", questionEnd: "you see anything in the dark room?", correct: "can", options: ["can","may"]},
        {questionStart: "Kate ", questionEnd: "speak English.", correct: "can", options: ["can","may"]},
        {questionStart: "", questionEnd: "I open the window?", correct: "may", options: ["can","may"]},
        {questionStart: "You ", questionEnd: "go now.", correct: "may", options: ["can","may"]},
        {questionStart: "", questionEnd: "you help me, please?", correct: "can", options: ["can","may"]}
    ];

    const questionText = document.getElementById('question-text');
    const gap = document.getElementById('gap');
    const optionsDiv = document.getElementById('options');
    const timerSpan = document.getElementById('timer');
    const resultMsg = document.getElementById('result-msg');
    const scoreSpan = document.getElementById('score');
    const bestSpan = document.getElementById('best-score');
    const nextBtn = document.getElementById('next-btn');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreElem = document.getElementById('final-score');
    const newRecordElem = document.getElementById('new-record');
    const playAgainBtn = document.getElementById('play-again');
    const backToMenuButton = document.getElementById('back-to-menu');
    const gameoverBackButton = document.getElementById('gameover-back-button');
    const API = "https://threeinone.duckdns.org:8000/api/";

    let score = 0, bestScore = 0, currentIndex = 0, shuffled = [], timeLeft = 10, timerInterval, questionEndSpan;

    function fetchBestScore() {
        fetch(API + "get_best_score/", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, game: "modal" })
        }).then(r => r.json()).then(data => {
            bestScore = data.score || 0;
            bestSpan.textContent = bestScore;
        });
    }
    function updateBestScoreIfNeeded() {
        if (score > bestScore) {
            fetch(API + "set_best_score/", {
                method: "POST", headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id, game: "modal", score })
            });
            bestScore = score;
            bestSpan.textContent = bestScore;
            newRecordElem.classList.remove('hidden');
            return true;
        } else {
            newRecordElem.classList.add('hidden');
            return false;
        }
    }

    function shuffleArray(array) {
        let arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function startGame() {
        shuffled = shuffleArray(modalVerbsData);
        currentIndex = 0;
        score = 0;
        scoreSpan.textContent = '0';
        resultMsg.textContent = '';
        newRecordElem.classList.add('hidden');
        gameOverModal.style.display = 'none';
        nextBtn.style.display = 'none';
        showQuestion();
    }

    function showQuestion() {
        if (currentIndex >= shuffled.length) { endGame(); return; }
        let q = shuffled[currentIndex];
        questionText.textContent = q.questionStart;
        gap.textContent = "";
        gap.className = "gap-area";
        gap.style.borderColor = "#3390ec";
        gap.dataset.expected = q.correct;
        gap.dataset.filled = "0";

        if (questionEndSpan) questionEndSpan.remove();
        questionEndSpan = document.createElement('span');
        questionEndSpan.id = "question-end";
        questionEndSpan.textContent = q.questionEnd;
        gap.parentNode.appendChild(questionEndSpan);

        gap.ondragover = e => { e.preventDefault(); gap.classList.add("dragover"); };
        gap.ondragleave = e => { gap.classList.remove("dragover"); };
        gap.ondrop = e => {
            e.preventDefault();
            gap.classList.remove("dragover");
            if (gap.dataset.filled === "1") return;
            let val = e.dataTransfer.getData("text/plain");
            fillGap(val);
        };

        optionsDiv.innerHTML = '';
        q.options.forEach(opt => {
            let b = document.createElement('button');
            b.textContent = opt;
            b.className = "option-btn";
            b.setAttribute('draggable', 'true');
            b.ondragstart = e => { e.dataTransfer.setData("text/plain", opt); };
            b.onclick = function (e) {
                if (gap.dataset.filled === "1") return;
                fillGap(opt);
            };
            optionsDiv.appendChild(b);
        });

        nextBtn.style.display = "none";
        resultMsg.textContent = '';
        resultMsg.className = '';
        startTimer();
    }

    function fillGap(val) {
        if (gap.dataset.filled === "1") return;
        gap.textContent = val;
        gap.classList.add("filled");
        gap.dataset.filled = "1";
        if (val.trim().toLowerCase() === gap.dataset.expected.toLowerCase()) {
            score++;
            scoreSpan.textContent = score;
            if (score > bestScore) {
                fetch(API + "set_best_score/", {
                    method: "POST", headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id, game: "modal", score })
                });
                bestScore = score;
                bestSpan.textContent = bestScore;
            }
            resultMsg.textContent = 'Верно!';
            resultMsg.className = "correct";
        } else {
            resultMsg.textContent = 'Неверно!';
            resultMsg.className = "incorrect";
        }
        clearInterval(timerInterval);
        nextBtn.style.display = 'inline-block';
    }

    function startTimer() {
        timeLeft = 10;
        timerSpan.textContent = "⏳ " + timeLeft;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = "⏳ " + timeLeft;
            if (timeLeft === 0) {
                clearInterval(timerInterval);
                resultMsg.textContent = "⛔ Время вышло!";
                resultMsg.className = "incorrect";
                nextBtn.style.display = 'inline-block';
                gap.dataset.filled = "1";
            }
        }, 1000);
    }

    nextBtn.onclick = () => { currentIndex++; showQuestion(); };
    playAgainBtn.onclick = startGame;

    function backToMainMenu() {
        if (score > bestScore) {
            fetch(API + "set_best_score/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id, game: 'modal', score })
            }).then(() => {
                alert("Поздравляем! Новый рекорд сохранён!");
                window.location.href = 'index.html';
            });
        } else {
            window.location.href = 'index.html';
        }
    }
    backToMenuButton.onclick = backToMainMenu;
    gameoverBackButton.onclick = backToMainMenu;

    function endGame() {
        finalScoreElem.textContent = "Ваш счет: " + score;
        updateBestScoreIfNeeded();
        gameOverModal.style.display = 'flex';
    }

    fetchBestScore();
    startGame();
});
