const questions = [
    {
        q: "地球上最大的海洋是？",
        options: ["大西洋", "印度洋", "太平洋", "北冰洋"],
        answer: 2,
        explanation: "太平洋是地球上最大、最深的海洋，覆蓋了地球表面約三分之一的面積。"
    },
    {
        q: "一天有幾小時？",
        options: ["12", "24", "48", "36"],
        answer: 1,
        explanation: "地球自轉一週大約需要 24 小時，因此一天被定義為 24 小時。"
    },
    {
        q: "光速大約每秒多少公里？",
        options: ["30萬", "3萬", "300萬", "10萬"],
        answer: 0,
        explanation: "真空中的光速大約為每秒 299,792 公里，通常以每秒約 30 萬公里來簡稱。"
    },
    {
        q: "人體最大的器官是？",
        options: ["心臟", "肝臟", "大腦", "皮膚"],
        answer: 3,
        explanation: "皮膚覆蓋於人體外表，具有保護與調節體溫的功能，是人體面積與重量最大的器官。"
    },
    {
        q: "太陽系中體積最大的行星是？",
        options: ["地球", "火星", "木星", "土星"],
        answer: 2,
        explanation: "木星是太陽系中體積最大、質量最重的行星，其體積是地球的 1300 多倍。"
    },
    {
        q: "台灣最高的山是？",
        options: ["阿里山", "陽明山", "玉山", "雪山"],
        answer: 2,
        explanation: "玉山主峰海拔高達 3,952 公尺，為台灣第一高峰，亦為東北亞最高峰。"
    },
    {
        q: "水在標準大氣壓下的沸點是？",
        options: ["50度", "100度", "120度", "80度"],
        answer: 1,
        explanation: "在 1 個標準大氣壓（1 atm）下，純水的沸點為攝氏 100 度（100°C）。"
    },
    {
        q: "圓周率大約等於多少？",
        options: ["3.14", "3.16", "3.12", "3.18"],
        answer: 0,
        explanation: "圓周率（π）是圓周長與直徑的比值，是一個無限不循環小數，約等於 3.14159..."
    },
    {
        q: "電腦的心臟通常指哪個元件？",
        options: ["RAM", "硬碟", "CPU", "顯示卡"],
        answer: 2,
        explanation: "CPU（中央處理器）負責執行系統指令與算術運算，被稱為電腦的心臟與大腦。"
    },
    {
        q: "彩虹有幾種顏色？",
        options: ["5", "6", "7", "8"],
        answer: 2,
        explanation: "彩虹在光學色散下常見的分色依序為紅、橙、黃、綠、藍、靛、紫共 7 種顏色。"
    }
];

let currentQuestionIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let gameActive = false;
let shuffledQuestions = [];
let roundRecords = []; // 儲存本回合的作答紀錄

const screens = {
    menu: document.getElementById('menu-screen'),
    play: document.getElementById('play-screen'),
    result: document.getElementById('result-screen')
};

const explanationBox = document.getElementById('explanation-box');
const explanationBadge = document.getElementById('explanation-badge');
const explanationText = document.getElementById('explanation-text');
const btnNext = document.getElementById('btn-next');
const reviewContainer = document.getElementById('review-container');
const btnToggleReview = document.getElementById('btn-toggle-review');

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 綁定按鈕事件
document.getElementById('btn-start').addEventListener('click', () => startGame());
document.getElementById('btn-restart').addEventListener('click', () => showScreen('menu'));
btnNext.addEventListener('click', () => goToNextQuestion());

btnToggleReview.addEventListener('click', () => {
    if (reviewContainer.style.display === 'none') {
        reviewContainer.style.display = 'flex';
        btnToggleReview.innerText = '收起解析';
    } else {
        reviewContainer.style.display = 'none';
        btnToggleReview.innerText = '查看詳細解析';
    }
});

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
    roundRecords = [];
    gameActive = true;
    
    shuffledQuestions = shuffleArray(questions);
    
    document.getElementById('total-questions').innerText = shuffledQuestions.length;
    reviewContainer.style.display = 'none';
    btnToggleReview.innerText = '查看詳細解析';
    
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
    
    // 隱藏上一題的解析區塊
    explanationBox.style.display = 'none';
    
    // 重置所有選項按鈕
    for (let i = 0; i < 4; i++) {
        optionBtns[i].innerHTML = `<span class="option-text" id="opt-${i}">${qData.options[i]}</span>`;
        optionBtns[i].classList.remove('flash-correct', 'flash-wrong');
        optionBtns[i].disabled = false;
    }
    
    updateStatus();
    gameActive = true;
}

function handleAnswer(selectedIndex) {
    if (!gameActive) return;
    gameActive = false; // 答題後鎖定選項
    
    // 禁用選項按鈕避免重複點擊
    optionBtns.forEach(btn => btn.disabled = true);
    
    const qData = shuffledQuestions[currentQuestionIndex];
    const isCorrect = (selectedIndex === qData.answer);
    const selectedBtn = optionBtns[selectedIndex];
    
    // 顯示選項反饋
    if (isCorrect) {
        selectedBtn.classList.add('flash-correct');
        selectedBtn.innerHTML = `⭕ <span class="option-text">${qData.options[selectedIndex]}</span>`;
        correctCount++;
        
        explanationBadge.innerText = '✅ 答對了！';
        explanationBadge.className = 'explanation-badge correct';
    } else {
        selectedBtn.classList.add('flash-wrong');
        selectedBtn.innerHTML = `❌ <span class="option-text">${qData.options[selectedIndex]}</span>`;
        wrongCount++;
        
        // 標示正確答案
        const correctBtn = optionBtns[qData.answer];
        correctBtn.classList.add('flash-correct');
        correctBtn.innerHTML = `⭕ <span class="option-text">${qData.options[qData.answer]}</span>`;
        
        explanationBadge.innerText = `❌ 答錯了！（正確答案：${qData.options[qData.answer]}）`;
        explanationBadge.className = 'explanation-badge wrong';
    }
    
    // 記錄到本回合作答歷程
    roundRecords.push({
        q: qData.q,
        yourAnswer: qData.options[selectedIndex],
        correctAnswer: qData.options[qData.answer],
        isCorrect: isCorrect,
        explanation: qData.explanation
    });
    
    // 顯示題目解析
    explanationText.innerText = qData.explanation || '暫無解析。';
    explanationBox.style.display = 'flex';
    
    updateStatus();
}

function goToNextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
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
    renderReviewList();
}

function renderReviewList() {
    reviewContainer.innerHTML = '';
    roundRecords.forEach((rec, idx) => {
        const item = document.createElement('div');
        item.className = `review-item ${rec.isCorrect ? 'correct' : 'wrong'}`;
        item.innerHTML = `
            <div class="review-q">${idx + 1}. ${rec.q} (${rec.isCorrect ? '⭕ 答對' : '❌ 答錯'})</div>
            <div class="review-ans">你的回答：${rec.yourAnswer} | 正確答案：${rec.correctAnswer}</div>
            <div class="review-exp">💡 解析：${rec.explanation}</div>
        `;
        reviewContainer.appendChild(item);
    });
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
