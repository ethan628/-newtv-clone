const questions = [
    {
        q: "地球上最大的海洋是？",
        options: ["大西洋", "印度洋", "太平洋", "北冰洋"],
        answer: 2
    },
    {
        q: "一天有幾小時？",
        options: ["12", "24", "48", "36"],
        answer: 1
    },
    {
        q: "光速大約每秒多少公里？",
        options: ["30萬", "3萬", "300萬", "10萬"],
        answer: 0
    },
    {
        q: "人體最大的器官是？",
        options: ["心臟", "肝臟", "大腦", "皮膚"],
        answer: 3
    },
    {
        q: "太陽系中體積最大的行星是？",
        options: ["地球", "火星", "木星", "土星"],
        answer: 2
    },
    {
        q: "台灣最高的山是？",
        options: ["阿里山", "陽明山", "玉山", "雪山"],
        answer: 2
    },
    {
        q: "水在標準大氣壓下的沸點是？",
        options: ["50度", "100度", "120度", "80度"],
        answer: 1
    },
    {
        q: "圓周率大約等於多少？",
        options: ["3.14", "3.16", "3.12", "3.18"],
        answer: 0
    },
    {
        q: "電腦的心臟通常指哪個元件？",
        options: ["RAM", "硬碟", "CPU", "顯示卡"],
        answer: 2
    },
    {
        q: "彩虹有幾種顏色？",
        options: ["5", "6", "7", "8"],
        answer: 2
    }
];

let currentQuestionIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let gameActive = false;
let shuffledQuestions = [];

const screens = {
    menu: document.getElementById('menu-screen'),
    play: document.getElementById('play-screen'),
    result: document.getElementById('result-screen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 綁定按鈕事件
document.getElementById('btn-start').addEventListener('click', () => startGame());
document.getElementById('btn-restart').addEventListener('click', () => showScreen('menu'));

const optionBtns = document.querySelectorAll('.option-btn');
optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!gameActive) return;
        const index = parseInt(btn.getAttribute('data-index'));
        handleAnswer(index);
    });
});



function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startGame() {
    currentQuestionIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    gameActive = true;
    
    // 隨機打亂題目
    shuffledQuestions = shuffleArray(questions);
    
    document.getElementById('total-questions').innerText = shuffledQuestions.length;
    document.getElementById('progress-history').innerHTML = '';
    
    updateStatus();
    loadQuestion();
    showScreen('play');
}

function updateStatus() {
    document.getElementById('score-value').innerText = currentQuestionIndex;
}

function loadQuestion() {
    if (currentQuestionIndex >= shuffledQuestions.length) {
        endGame();
        return;
    }
    
    const qData = shuffledQuestions[currentQuestionIndex];
    document.getElementById('question-text').innerText = qData.q;
    
    for (let i = 0; i < 4; i++) {
        optionBtns[i].innerHTML = `<span class="option-text" id="opt-${i}">${qData.options[i]}</span>`;
        optionBtns[i].classList.remove('flash-correct', 'flash-wrong');
    }
    updateStatus();
}

function handleAnswer(selectedIndex) {
    if (!gameActive) return;
    gameActive = false; // 暫停接收輸入
    
    const qData = shuffledQuestions[currentQuestionIndex];
    const isCorrect = (selectedIndex === qData.answer);
    
    const selectedBtn = optionBtns[selectedIndex];
    const progressHistory = document.getElementById('progress-history');
    
    if (isCorrect) {
        selectedBtn.classList.add('flash-correct');
        selectedBtn.innerHTML = "⭕ " + selectedBtn.innerHTML;
        progressHistory.innerHTML += '<span style="color: #4caf50; font-size: 1.5rem;">⭕</span>';
        correctCount++;
    } else {
        selectedBtn.classList.add('flash-wrong');
        selectedBtn.innerHTML = "❌ " + selectedBtn.innerHTML;
        progressHistory.innerHTML += '<span style="color: #f44336; font-size: 1.5rem;">❌</span>';
        wrongCount++;
        // 標示正確答案
        optionBtns[qData.answer].classList.add('flash-correct');
    }
    
    updateStatus();
    
    setTimeout(() => {
        currentQuestionIndex++;
        gameActive = true;
        loadQuestion();
    }, 500); // 延遲500毫秒換題，製造節奏感
}

function endGame() {
    gameActive = false;
    showScreen('result');
    
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered === 0 ? 0 : Math.round((correctCount / totalAnswered) * 100);
    
    document.getElementById('accuracy-value').innerText = accuracy;
    document.getElementById('correct-count').innerText = correctCount;
    document.getElementById('wrong-count').innerText = wrongCount;
    
    document.getElementById('result-title').innerText = "測驗完成！";
    
    // 儲存至 localStorage
    let histTotal = parseInt(localStorage.getItem('newtv_hist_total') || '0');
    let histCorrect = parseInt(localStorage.getItem('newtv_hist_correct') || '0');
    
    histTotal += totalAnswered;
    histCorrect += correctCount;
    
    localStorage.setItem('newtv_hist_total', histTotal);
    localStorage.setItem('newtv_hist_correct', histCorrect);
    
    updateHistoricalStats();
}

function updateHistoricalStats() {
    let histTotal = parseInt(localStorage.getItem('newtv_hist_total') || '0');
    let histCorrect = parseInt(localStorage.getItem('newtv_hist_correct') || '0');
    
    let histAccuracy = histTotal === 0 ? 0 : Math.round((histCorrect / histTotal) * 100);
    
    document.getElementById('hist-total').innerText = histTotal;
    document.getElementById('hist-accuracy').innerText = histAccuracy;
}

// 初始載入時更新歷史統計
updateHistoricalStats();
