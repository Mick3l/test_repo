document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready(); tg.expand();

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

    // ===== Modal game data =====
    let modalVerbsData = [
        {questionStart: "", questionEnd: "you see anything in the dark room?", correct: "can", options: ["can","may"]},
        {questionStart: "Kate ", questionEnd: " speak English.", correct: "can", options: ["can","may"]},
        {questionStart: "", questionEnd: " I open the window?", correct: "may", options: ["can","may"]},
        {questionStart: "You ", questionEnd: " go now.", correct: "may", options: ["can","may"]},
        {questionStart: "", questionEnd: " you help me, please?", correct: "can", options: ["can","may"]},
    ];

    // ===== DOM refs =====
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
    const API = "http://84.201.171.104:8000/api/";

    // ===== App state =====
    let score = 0, bestScore = 0, currentIndex = 0, shuffled = [], timeLeft = 10, timerInterval;

    // ========== API ==========
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
        if (currentIndex >= shuffled.length) { endGame(); return; }
        let q = shuffled[currentIndex];

        // Render question: start [gap] end
        questionText.textContent = q.questionStart;
        gap.textContent = "";
        gap.style.borderColor = "#3390ec";
        gap.dataset.expected = q.correct;
        gap.dataset.filled = "0";
        gap.ondragover = e => { e.preventDefault(); gap.style.background="#def"; };
        gap.ondragleave = e => { gap.style.background = ""; };
        gap.ondrop = e => {
            e.preventDefault(); gap.style.background="";
            if(gap.dataset.filled==="1") return;
            let val = e.dataTransfer.getData("text/plain");
            fillGap(val);
        };
        // Set end part after gap
        gap.nextSibling && gap.nextSibling.remove(); // remove old if any
        let afterNode = document.createTextNode(q.questionEnd);
        gap.parentElement.insertBefore(afterNode, gap.nextSibling);

        // Render options
        optionsDiv.innerHTML = '';
        q.options.forEach(opt=>{
            let b = document.createElement('button');
            b.textContent = opt;
            b.setAttribute('draggable','true');
            b.className = "control-btn";
            // Desktop drag
            b.ondragstart = e => { e.dataTransfer.setData("text/plain", opt); };
            // Mobile tap (or desktop click)
            b.onclick = () => { if(gap.dataset.filled==="0") fillGap(opt); };
            optionsDiv.appendChild(b);
        });

        nextBtn.style.display = 'none';
        resultMsg.textContent = '';
        resultMsg.className = '';
        startTimer();
    }

    function fillGap(val) {
        if (gap.dataset.filled==="1") return;
        gap.textContent = val;
        gap.dataset.filled = "1";
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
                nextBtn.style.display = 'inline-block';
                gap.dataset.filled="1"; // prevent more fills
            }
        },1000);
    }

    function checkAnswer(val) {
        clearInterval(timerInterval);
        if (val.trim().toLowerCase() === gap.dataset.expected.toLowerCase()) {
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

    nextBtn.onclick = () => { currentIndex++; showQuestion(); };
    function endGame() {
        finalScoreElem.textContent = "Ваш счет: "+score;
        updateBestScoreIfNeeded();
        gameOverModal.style.display='flex';
    }
    playAgainBtn.onclick = startGame;

    fetchBestScore(); startGame();
});
