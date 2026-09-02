// NEWTV 環境知識題庫主程式
let currentQuestionIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let gameActive = false;
let selectedOptionIndex = -1;
let isAnswerConfirmed = false;
let roundQuestions = [];
let roundRecords = [];

const screens = {
    menu: document.getElementById('menu-screen'),
    play: document.getElementById('play-screen'),
    result: document.getElementById('result-screen')
};

const bankSelect = document.getElementById('bank-select');
const countSelect = document.getElementById('count-select');
const orderSelect = document.getElementById('order-select');
const startCountBadge = document.getElementById('start-count-badge');
const customCountWrapper = document.getElementById('custom-count-wrapper');
const customCountInput = document.getElementById('custom-count-input');
const customCountHint = document.getElementById('custom-count-hint');
const customCountWarning = document.getElementById('custom-count-warning');

const actionBox = document.getElementById('action-box');
const btnConfirm = document.getElementById('btn-confirm');
const feedbackBox = document.getElementById('feedback-box');
const feedbackBadge = document.getElementById('feedback-badge');
const explanationBody = document.getElementById('explanation-body');
const btnNext = document.getElementById('btn-next');
const reviewContainer = document.getElementById('review-container');
const btnRetryWrong = document.getElementById('btn-retry-wrong');

const filterAllBtn = document.getElementById('filter-all');
const filterWrongBtn = document.getElementById('filter-wrong');
let currentFilter = 'all';

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function updateStartButtonCount() {
    const selectedBank = bankSelect.value;
    const selectedCount = countSelect.value;
    
    let poolSize = 0;
    if (selectedBank === 'all') {
        poolSize = ALL_QUESTIONS.length;
    } else {
        poolSize = ALL_QUESTIONS.filter(q => q.bank === selectedBank).length;
    }
    
    if (customCountInput) {
        customCountInput.max = poolSize;
        customCountHint.innerText = `題 (上限 ${poolSize} 題)`;
    }
    
    let finalCount = poolSize;
    if (selectedCount === 'custom') {
        customCountWrapper.style.display = 'flex';
        let rawVal = customCountInput.value.trim();
        let val = parseInt(rawVal);
        
        customCountInput.classList.remove('input-warning', 'input-error');
        
        if (rawVal === '' || isNaN(val)) {
            customCountWarning.className = 'custom-warning';
            customCountWarning.style.display = 'none';
            finalCount = Math.min(30, poolSize);
        } else if (val > poolSize) {
            // 超過題庫上限提示
            customCountInput.classList.add('input-warning');
            customCountWarning.className = 'custom-warning exceed';
            customCountWarning.innerText = `⚠️ 輸入題數 (${val} 題) 已超過該範圍上限 (${poolSize} 題)！將為您出滿全部 ${poolSize} 題。`;
            customCountWarning.style.display = 'block';
            finalCount = poolSize;
        } else if (val <= 0) {
            // 小於等於0提示
            customCountInput.classList.add('input-error');
            customCountWarning.className = 'custom-warning error';
            customCountWarning.innerText = `⚠️ 題數至少為 1 題！`;
            customCountWarning.style.display = 'block';
            finalCount = 1;
        } else {
            // 正常範圍
            customCountWarning.className = 'custom-warning valid';
            customCountWarning.innerText = `✅ 已設定出題 ${val} 題 (該範圍共 ${poolSize} 題)`;
            customCountWarning.style.display = 'block';
            finalCount = val;
        }
    } else {
        customCountWrapper.style.display = 'none';
        if (selectedCount !== 'all') {
            finalCount = Math.min(parseInt(selectedCount), poolSize);
        }
    }
    
    if (startCountBadge) {
        startCountBadge.innerText = finalCount;
    }
}

bankSelect.addEventListener('change', updateStartButtonCount);
countSelect.addEventListener('change', () => {
    updateStartButtonCount();
    if (countSelect.value === 'custom') {
        customCountInput.focus();
    }
});
customCountInput.addEventListener('input', updateStartButtonCount);
updateStartButtonCount();

// 綁定主按鈕
document.getElementById('btn-start').addEventListener('click', () => startTest());
document.getElementById('btn-restart').addEventListener('click', () => showScreen('menu'));
btnConfirm.addEventListener('click', () => confirmAnswer());
btnNext.addEventListener('click', () => goToNextQuestion());

btnRetryWrong.addEventListener('click', () => {
    const wrongQs = roundRecords.filter(r => !r.isCorrect).map(r => r.originalData);
    if (wrongQs.length > 0) {
        startCustomTest(wrongQs, "錯題重練");
    }
});

filterAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    filterAllBtn.classList.add('active');
    filterWrongBtn.classList.remove('active');
    renderReviewList();
});

filterWrongBtn.addEventListener('click', () => {
    currentFilter = 'wrong';
    filterWrongBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    renderReviewList();
});

const optionBtns = document.querySelectorAll('.option-btn');
optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!gameActive || isAnswerConfirmed) return;
        const index = parseInt(btn.getAttribute('data-index'));
        selectOption(index);
    });
});

function selectOption(index) {
    if (!gameActive || isAnswerConfirmed) return;
    selectedOptionIndex = index;
    
    // 清除其他選項的 selected 樣式，並為當前選項加上 selected
    optionBtns.forEach((btn, idx) => {
        if (idx === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    const optLetters = ['A', 'B', 'C', 'D'];
    btnConfirm.disabled = false;
    btnConfirm.innerText = `確認答案：(${optLetters[index]}) ➔ (Enter)`;
    btnConfirm.classList.add('pulse');
}

function confirmAnswer() {
    if (!gameActive || isAnswerConfirmed || selectedOptionIndex < 0) return;
    isAnswerConfirmed = true;
    
    // 禁用選項按鈕
    optionBtns.forEach(btn => btn.disabled = true);
    actionBox.style.display = 'none';
    
    const qData = roundQuestions[currentQuestionIndex];
    const isCorrect = (selectedOptionIndex === qData.answer);
    const selectedBtn = optionBtns[selectedOptionIndex];
    
    const optLetters = ['A', 'B', 'C', 'D'];
    
    if (isCorrect) {
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('flash-correct');
        correctCount++;
        feedbackBadge.innerText = `⭕ 答對了！ 正確答案是 (${optLetters[selectedOptionIndex]}) ${qData.options[selectedOptionIndex]}`;
        feedbackBadge.className = 'feedback-badge correct';
    } else {
        selectedBtn.classList.remove('selected');
        selectedBtn.classList.add('flash-wrong');
        wrongCount++;
        
        const correctBtn = optionBtns[qData.answer];
        if (correctBtn) correctBtn.classList.add('flash-correct');
        
        feedbackBadge.innerText = `❌ 答錯了！ 正確答案是 (${optLetters[qData.answer]}) ${qData.options[qData.answer]}`;
        feedbackBadge.className = 'feedback-badge wrong';
    }
    
    // 呈現完整題目解析
    const expText = qData.explanation || `正確選項為 (${optLetters[qData.answer]}) ${qData.options[qData.answer]}。`;
    explanationBody.innerText = expText;
    
    roundRecords.push({
        originalData: qData,
        q: qData.q,
        id: qData.id,
        yourAnswer: `(${optLetters[selectedOptionIndex]}) ${qData.options[selectedOptionIndex]}`,
        correctAnswer: `(${optLetters[qData.answer]}) ${qData.options[qData.answer]}`,
        isCorrect: isCorrect,
        explanation: expText
    });
    
    feedbackBox.style.display = 'flex';
}

// 鍵盤快速鍵支援
document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    
    // 如果在主選單
    if (screens.menu.classList.contains('active')) {
        if (key === 'ENTER' || key === ' ') {
            if (document.activeElement === customCountInput) {
                e.preventDefault();
                startTest();
                return;
            }
            e.preventDefault();
            startTest();
        }
        return;
    }
    
    // 答題中
    if (screens.play.classList.contains('active')) {
        // 如果已經確認答案 -> 按 Enter 或 空白鍵 直接前往下一題
        if (isAnswerConfirmed) {
            if (key === ' ' || key === 'ENTER') {
                e.preventDefault();
                goToNextQuestion();
            }
            return;
        }
        
        // 尚未確認答案
        if (gameActive) {
            // 如果已選中某選項且按下 Enter 或 空白鍵 -> 確認答案
            if ((key === 'ENTER' || key === ' ') && selectedOptionIndex >= 0) {
                e.preventDefault();
                confirmAnswer();
                return;
            }
            
            let targetIdx = -1;
            // 支援 1, 2, 3, 4
            if (key === '1') targetIdx = 0;
            else if (key === '2') targetIdx = 1;
            else if (key === '3') targetIdx = 2;
            else if (key === '4') targetIdx = 3;
            // 支援 A, B, C, D
            else if (key === 'A') targetIdx = 0;
            else if (key === 'B') targetIdx = 1;
            else if (key === 'C') targetIdx = 2;
            else if (key === 'D') targetIdx = 3;
            // 支援 D, F, J, K (NEWTV 原版鍵位)
            else if (key === 'D') targetIdx = 0;
            else if (key === 'F') targetIdx = 1;
            else if (key === 'J') targetIdx = 2;
            else if (key === 'K') targetIdx = 3;
            
            if (targetIdx >= 0) {
                e.preventDefault();
                selectOption(targetIdx);
            }
        }
    }
});

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startTest() {
    const selectedBank = bankSelect.value;
    const selectedCount = countSelect.value;
    const selectedOrder = orderSelect.value;
    
    // 篩選題目
    let pool = [];
    if (selectedBank === 'all') {
        pool = [...ALL_QUESTIONS];
    } else {
        pool = ALL_QUESTIONS.filter(q => q.bank === selectedBank);
    }
    
    if (pool.length === 0) {
        alert("所選範圍無題目！");
        return;
    }
    
    // 排序或洗牌
    if (selectedOrder === 'random') {
        pool = shuffleArray(pool);
    }
    
    // 截取題數
    let finalCount = pool.length;
    if (selectedCount === 'custom') {
        let val = parseInt(customCountInput.value);
        if (isNaN(val) || val <= 0) {
            val = 30;
        }
        finalCount = Math.min(val, pool.length);
    } else if (selectedCount !== 'all') {
        const countNum = parseInt(selectedCount);
        finalCount = Math.min(countNum, pool.length);
    }
    
    roundQuestions = pool.slice(0, finalCount);
    initRound(selectedBank === 'all' ? '全體合輯' : selectedBank);
}

function startCustomTest(questionList, label) {
    roundQuestions = shuffleArray(questionList);
    initRound(label);
}

function initRound(bankLabel) {
    currentQuestionIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    roundRecords = [];
    gameActive = true;
    
    document.getElementById('q-category-tag').innerText = bankLabel;
    document.getElementById('total-questions').innerText = roundQuestions.length;
    
    showScreen('play');
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= roundQuestions.length) {
        endGame();
        return;
    }
    
    const qData = roundQuestions[currentQuestionIndex];
    document.getElementById('score-value').innerText = currentQuestionIndex + 1;
    
    // 更新進度條
    const progressPct = ((currentQuestionIndex) / roundQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progressPct}%`;
    
    document.getElementById('question-text').innerText = `${qData.id ? `[第 ${qData.id} 題] ` : ''}${qData.q}`;
    
    selectedOptionIndex = -1;
    isAnswerConfirmed = false;
    
    actionBox.style.display = 'block';
    btnConfirm.disabled = true;
    btnConfirm.innerText = "請點選答案";
    btnConfirm.classList.remove('pulse');
    
    feedbackBox.style.display = 'none';
    
    // 重置按鈕
    for (let i = 0; i < 4; i++) {
        const btn = optionBtns[i];
        btn.querySelector('.option-text').innerText = qData.options[i] || '';
        btn.classList.remove('selected', 'flash-correct', 'flash-wrong');
        btn.disabled = false;
    }
    
    gameActive = true;
}

function goToNextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function endGame() {
    gameActive = false;
    isAnswerConfirmed = false;
    showScreen('result');
    
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered === 0 ? 0 : Math.round((correctCount / totalAnswered) * 100);
    
    document.getElementById('accuracy-value').innerText = accuracy;
    document.getElementById('correct-count').innerText = correctCount;
    document.getElementById('wrong-count').innerText = wrongCount;
    
    // 錯題按鈕
    if (wrongCount > 0) {
        btnRetryWrong.style.display = 'block';
        btnRetryWrong.innerText = `🔥 練習本次錯題 (${wrongCount} 題)`;
    } else {
        btnRetryWrong.style.display = 'none';
    }
    
    // 歷史紀錄
    let histTotal = parseInt(localStorage.getItem('newtv_hist_total') || '0');
    let histCorrect = parseInt(localStorage.getItem('newtv_hist_correct') || '0');
    histTotal += totalAnswered;
    histCorrect += correctCount;
    localStorage.setItem('newtv_hist_total', histTotal);
    localStorage.setItem('newtv_hist_correct', histCorrect);
    
    updateHistoricalStats();
    
    document.getElementById('count-all').innerText = roundRecords.length;
    document.getElementById('count-wrong').innerText = wrongCount;
    
    currentFilter = 'all';
    filterAllBtn.classList.add('active');
    filterWrongBtn.classList.remove('active');
    renderReviewList();
}

function renderReviewList() {
    reviewContainer.innerHTML = '';
    const list = currentFilter === 'wrong' ? roundRecords.filter(r => !r.isCorrect) : roundRecords;
    
    if (list.length === 0) {
        reviewContainer.innerHTML = '<div style="text-align:center; color:#8b949e; padding:20px;">無符合的作答紀錄</div>';
        return;
    }
    
    list.forEach((rec, idx) => {
        const item = document.createElement('div');
        item.className = `review-item ${rec.isCorrect ? 'correct' : 'wrong'}`;
        item.innerHTML = `
            <div class="review-q">${rec.id ? `[第 ${rec.id} 題] ` : ''}${rec.q} ${rec.isCorrect ? '⭕ 答對' : '❌ 答錯'}</div>
            <div class="review-ans-row">
                <div>你的回答：${rec.yourAnswer}</div>
                <div style="color:${rec.isCorrect ? '#3fb950' : '#f85149'};">正確答案：${rec.correctAnswer}</div>
            </div>
            <div class="review-exp-box"><strong>💡 完整解析：</strong>${rec.explanation}</div>
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

updateHistoricalStats();
