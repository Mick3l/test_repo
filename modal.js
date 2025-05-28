document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Data start
    let modalVerbsData = [
        {question: "______ you see anything in the dark room?", correct: "can", options: ["can","may"]},
        {question: "Kate ______ speak English.",                correct: "can", options: ["can","may"]},
        {question: "______ I open the window?",                 correct: "may", options: ["can","may"]},
        {question: "You ______ go now.",                        correct: "may", options: ["can","may"]},
        {question: "______ you help me, please?",               correct: "can", options: ["can","may"]},
    ];

    let user_id = tg.initDataUnsafe?.user?.id || tg.initDataUnsafe?.user_id;
    if (!user_id) {
        alert("User not identified. Try launching from Telegram.");
        return;
    }
    let score = 0;
    let bestScore = 0;
    let currentIndex = 0;
    let shuffled = [];
    let timeLeft = 10;
    let timerInterval;

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

    const API = "http://localhost:8000/api/";

    function fetchBestScore() {
        fetch(API+"get_best_score/", {
            method: "POST", headers: {'Content-Type':'application/json'},
            body: JSON.stringify({user_id, game:"modal"})
        }).then(r=>r.json()).then(data=>{
            bestScore = data.score || 0;
            bestSpan.textContent = bestScore;
        });
    }
    function updateBestScoreIfNeeded() {
        if (score > bestScore) {
            fetch(API+"set_best_score/", {
                method: "POST", headers: {'Content-Type':'application/json'},
                body: JSON.stringify({user_id, game:"modal", score})
            });
            bestScore = score;
            bestSpan.textContent = bestScore;
            newRecordElem.classList.remove('hidden');
        } else {
            newRecordElem.classList.add('hidden');
        }
    }

    function shuffleArray(array) {
        // Fisher-Yates
        let arr = array.slice();
        for (let i = arr.length-1; i > 0; i--) {
            let j = Math.floor(Math.random()*(i+1));
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
        gameOverModal.style.display='none';
        nextBtn.style.display='none';
        showQuestion();
    }

    function showQuestion() {
        if (currentIndex >= shuffled.length) {
            endGame();
            return;
        }
        let {question, options} = shuffled[currentIndex];
        let gapPos = question.indexOf("______");
        questionText.textContent = (gapPos>=0) ? question.slice(0,gapPos) : question;
        gap.textContent = '';
        gap.style.borderColor = "#3390ec";
        gap.dataset.expected = shuffled[currentIndex].correct;
        optionsDiv.innerHTML = '';
        nextBtn.style.display = 'none';
        resultMsg.innerHTML = '';
        // Two drag options as buttons
        options.forEach(opt=>{
            let b = document.createElement('button');
            b.textContent = opt;
            b.setAttribute('draggable','true');
            b.style.margin = "0 10px";
            b.className = "control-btn";
            b.ondragstart = function(e){
                e.dataTransfer.setData("text/plain", opt);
            };
            b.ontouchstart = function(e){
                // For mobile, allow tap-to-place
                fillGap(opt);
                e.preventDefault();
            };
            optionsDiv.appendChild(b);
        });

        // Make gap area droppable
        gap.ondragover = (e)=> { e.preventDefault(); gap.style.background = "#def"; }
        gap.ondragleave = (e)=> { gap.style.background = ""; };
        gap.ondrop = (e)=>{
            e.preventDefault();
            gap.style.background = "";
            let val = e.dataTransfer.getData("text/plain");
            fillGap(val);
        };

        startTimer();

    }

    function fillGap(val) {
        if (gap.textContent) return; // allow only once
        gap.textContent = val;
        checkAnswer(val);
    }

    function startTimer() {
        timeLeft = 10;
        timerSpan.textContent = "⏳ "+timeLeft;
        clearInterval(timerInterval);
        timerInterval = setInterval(()=>{
            timeLeft--;
            timerSpan.textContent = "⏳ "+timeLeft;
            if (timeLeft == 0) {
                clearInterval(timerInterval);
                resultMsg.textContent = "⛔ Время вышло!";
                resultMsg.className = "incorrect";
                nextBtn.style.display='inline-block';
            }
        },1000);
    }

    function checkAnswer(val) {
        clearInterval(timerInterval);
        let good = val.toLowerCase() === gap.dataset.expected.toLowerCase();

        if (good) {
            score++;
            scoreSpan.textContent = score;
            resultMsg.textContent = 'Верно!';
            resultMsg.className = "correct";
        } else {
            resultMsg.textContent = 'Неверно!';
            resultMsg.className = "incorrect";
        }
        nextBtn.style.display='inline-block';
    }

    nextBtn.addEventListener('click', ()=>{
        currentIndex++;
        showQuestion();
    });

    function endGame() {
        finalScoreElem.textContent = "Ваш счет: "+score;
        updateBestScoreIfNeeded();
        gameOverModal.style.display='flex';
    }

    playAgainBtn.onclick = startGame;

    // --- start ---
    fetchBestScore();
    startGame();
});
