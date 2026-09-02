// NEWTV 環境知識題庫主程式
// 內建 Firebase 官方專案設定 (1app)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBiN4fOyryJBB-2L34WUVt2V53BecELNAI",
  authDomain: "app-9e2a3.firebaseapp.com",
  projectId: "app-9e2a3",
  storageBucket: "app-9e2a3.firebasestorage.app",
  messagingSenderId: "833321250062",
  appId: "1:833321250062:web:c5ca16762f25cd7b9f3b5f",
  measurementId: "G-C3V6EJ64XY"
};

let firebaseInitialized = false;
let currentUser = null;
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

// Auth UI Elements
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnOpenFirebaseConfig = document.getElementById('btn-open-firebase-config');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const cloudSyncStatus = document.getElementById('cloud-sync-status');
const btnLogout = document.getElementById('btn-logout');

// Firebase Modal Elements
const firebaseModalBackdrop = document.getElementById('firebase-modal-backdrop');
const firebaseConfigInput = document.getElementById('firebase-config-input');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalSave = document.getElementById('btn-modal-save');

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ---------------- Firebase Google 登入與 Firestore 雲端儲存系統 ----------------
function initFirebase() {
    let config = DEFAULT_FIREBASE_CONFIG;
    const savedConfigStr = localStorage.getItem('newtv_firebase_config');
    if (savedConfigStr) {
        try {
            const parsed = JSON.parse(savedConfigStr);
            if (parsed && parsed.apiKey) {
                config = parsed;
            }
        } catch (e) {}
    }
    
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }
        firebaseInitialized = true;
        
        // 監聽 Firebase 登入狀態變更
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = {
                    id: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    picture: user.photoURL || 'https://lh3.googleusercontent.com/a/default-user'
                };
                localStorage.setItem('newtv_user', JSON.stringify(currentUser));
                loadUserCloudData(user.uid);
            } else {
                currentUser = null;
                localStorage.removeItem('newtv_user');
            }
            updateAuthUI();
            updateHistoricalStats();
        });
        return true;
    } catch (err) {
        console.error("Firebase 初始化失敗:", err);
    }
    return false;
}

// 從 Google Firestore 雲端讀取用戶戰績
function loadUserCloudData(userId) {
    if (!firebaseInitialized || !firebase.firestore) return;
    
    if (cloudSyncStatus) cloudSyncStatus.innerText = "☁️ 雲端同步中...";
    
    firebase.firestore().collection("users").doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const total = data.totalAnswered || 0;
                const correct = data.totalCorrect || 0;
                
                localStorage.setItem(`newtv_user_${userId}_total`, total);
                localStorage.setItem(`newtv_user_${userId}_correct`, correct);
                if (cloudSyncStatus) cloudSyncStatus.innerText = "☁️ 雲端已連線";
                updateHistoricalStats();
            } else {
                // 首次登入，建立初始紀錄
                syncUserCloudData(0, 0, null);
                if (cloudSyncStatus) cloudSyncStatus.innerText = "☁️ 雲端已建立";
            }
        })
        .catch((err) => {
            console.warn("讀取雲端資料提示 (可能尚未在控制台點選建立 Firestore 資料庫):", err);
            if (cloudSyncStatus) cloudSyncStatus.innerText = "☁️ 本地模式";
        });
}

// 同步寫入 Google Firestore 雲端資料庫
function syncUserCloudData(answeredCount, correctDelta, roundRecordSummary) {
    if (!currentUser || !firebaseInitialized || !firebase.firestore) return;
    
    const db = firebase.firestore();
    const userDocRef = db.collection("users").doc(currentUser.id);
    
    const updatePayload = {
        name: currentUser.name,
        email: currentUser.email,
        picture: currentUser.picture,
        totalAnswered: firebase.firestore.FieldValue.increment(answeredCount),
        totalCorrect: firebase.firestore.FieldValue.increment(correctDelta),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (roundRecordSummary) {
        updatePayload.recentRounds = firebase.firestore.FieldValue.arrayUnion(roundRecordSummary);
    }
    
    userDocRef.set(updatePayload, { merge: true })
        .then(() => {
            console.log("✅ 戰績已成功即時同步至 Google 雲端！");
            if (cloudSyncStatus) cloudSyncStatus.innerText = "☁️ 雲端已同步";
        })
        .catch((err) => {
            console.warn("雲端寫入提示 (如未開通 Firestore 請至控制台啟用):", err);
        });
}

function updateAuthUI() {
    if (currentUser) {
        loggedOutView.style.display = 'none';
        loggedInView.style.display = 'flex';
        userAvatar.src = currentUser.picture;
        userName.innerText = currentUser.name;
        userEmail.innerText = currentUser.email;
    } else {
        loggedInView.style.display = 'none';
        loggedOutView.style.display = 'flex';
    }
}

function triggerGoogleSignIn() {
    // 檢查運行協定
    if (window.location.protocol === 'file:') {
        alert("⚠️ Google 官方安全政策限制：\n請執行資料夾內的「啟動本地伺服器.bat」在 http://localhost:8000 下登入，或在部署後的 HTTPS 網站上登入！");
        return;
    }
    
    if (!firebaseInitialized) {
        if (!initFirebase()) {
            firebaseModalBackdrop.style.display = 'flex';
            return;
        }
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
    
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Google 登入成功:", result.user);
        })
        .catch((error) => {
            console.error("Google 登入錯誤:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                return;
            }
            if (error.code === 'auth/unauthorized-domain') {
                alert("網域尚未授權：請至 Firebase 控制台 ➔ Authentication ➔ Settings ➔ Authorized domains 加入當前網域 (例如 localhost 或 ethan628.github.io)");
                return;
            }
            alert(`登入發生錯誤：${error.message}`);
        });
}

// 綁定登入/登出事件
if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', triggerGoogleSignIn);
}

if (btnOpenFirebaseConfig) {
    btnOpenFirebaseConfig.addEventListener('click', () => {
        const currentConf = localStorage.getItem('newtv_firebase_config') || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
        firebaseConfigInput.value = currentConf;
        firebaseModalBackdrop.style.display = 'flex';
    });
}

if (btnModalCancel) {
    btnModalCancel.addEventListener('click', () => {
        firebaseModalBackdrop.style.display = 'none';
    });
}

if (btnModalSave) {
    btnModalSave.addEventListener('click', () => {
        const raw = firebaseConfigInput.value.trim();
        try {
            let clean = raw.replace(/^(const|let|var)\s+\w+\s*=\s*/, '').replace(/;\s*$/, '').trim();
            if (!clean.startsWith('{')) clean = '{' + clean + '}';
            clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
            const conf = JSON.parse(clean);
            if (!conf.apiKey) throw new Error("無 apiKey");
            localStorage.setItem('newtv_firebase_config', JSON.stringify(conf));
            firebaseModalBackdrop.style.display = 'none';
            location.reload();
        } catch (e) {
            alert("請輸入正確的 Firebase Config 物件！");
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if (firebaseInitialized) {
            firebase.auth().signOut().then(() => {
                currentUser = null;
                localStorage.removeItem('newtv_user');
                updateAuthUI();
                updateHistoricalStats();
            });
        } else {
            currentUser = null;
            localStorage.removeItem('newtv_user');
            updateAuthUI();
            updateHistoricalStats();
        }
    });
}

// 初始化 Firebase
initFirebase();

// ---------------- 題數與設定選單 ----------------
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
            customCountInput.classList.add('input-warning');
            customCountWarning.className = 'custom-warning exceed';
            customCountWarning.innerText = `⚠️ 輸入題數 (${val} 題) 已超過該範圍上限 (${poolSize} 題)！將為您出滿全部 ${poolSize} 題。`;
            customCountWarning.style.display = 'block';
            finalCount = poolSize;
        } else if (val <= 0) {
            customCountInput.classList.add('input-error');
            customCountWarning.className = 'custom-warning error';
            customCountWarning.innerText = `⚠️ 題數至少為 1 題！`;
            customCountWarning.style.display = 'block';
            finalCount = 1;
        } else {
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
    
    if (firebaseModalBackdrop.style.display === 'flex') {
        if (key === 'ESCAPE') {
            firebaseModalBackdrop.style.display = 'none';
        }
        return;
    }
    
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
    
    if (screens.play.classList.contains('active')) {
        if (isAnswerConfirmed) {
            if (key === ' ' || key === 'ENTER') {
                e.preventDefault();
                goToNextQuestion();
            }
            return;
        }
        
        if (gameActive) {
            if ((key === 'ENTER' || key === ' ') && selectedOptionIndex >= 0) {
                e.preventDefault();
                confirmAnswer();
                return;
            }
            
            let targetIdx = -1;
            if (key === '1') targetIdx = 0;
            else if (key === '2') targetIdx = 1;
            else if (key === '3') targetIdx = 2;
            else if (key === '4') targetIdx = 3;
            else if (key === 'A') targetIdx = 0;
            else if (key === 'B') targetIdx = 1;
            else if (key === 'C') targetIdx = 2;
            else if (key === 'D') targetIdx = 3;
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
    
    if (selectedOrder === 'random') {
        pool = shuffleArray(pool);
    }
    
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
    
    if (wrongCount > 0) {
        btnRetryWrong.style.display = 'block';
        btnRetryWrong.innerText = `🔥 練習本次錯題 (${wrongCount} 題)`;
    } else {
        btnRetryWrong.style.display = 'none';
    }
    
    // 歷史紀錄 (本地快取)
    const userPrefix = currentUser ? `newtv_user_${currentUser.id}_` : 'newtv_guest_';
    let histTotal = parseInt(localStorage.getItem(`${userPrefix}total`) || '0');
    let histCorrect = parseInt(localStorage.getItem(`${userPrefix}correct`) || '0');
    histTotal += totalAnswered;
    histCorrect += correctCount;
    localStorage.setItem(`${userPrefix}total`, histTotal);
    localStorage.setItem(`${userPrefix}correct`, histCorrect);
    
    updateHistoricalStats();
    
    // 同步寫入 Google Firestore 雲端資料庫
    if (currentUser) {
        const roundSummary = {
            timestamp: new Date().toISOString(),
            bank: bankSelect.value,
            totalAnswered: totalAnswered,
            correctCount: correctCount,
            accuracy: accuracy
        };
        syncUserCloudData(totalAnswered, correctCount, roundSummary);
    }
    
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
    const histLabel = document.getElementById('hist-label');
    const userPrefix = currentUser ? `newtv_user_${currentUser.id}_` : 'newtv_guest_';
    
    if (histLabel) {
        if (currentUser) {
            histLabel.innerText = "Google 雲端歷史總答題：";
        } else {
            histLabel.innerText = "訪客歷史作答：";
        }
    }
    
    let histTotal = parseInt(localStorage.getItem(`${userPrefix}total`) || '0');
    let histCorrect = parseInt(localStorage.getItem(`${userPrefix}correct`) || '0');
    let histAccuracy = histTotal === 0 ? 0 : Math.round((histCorrect / histTotal) * 100);
    
    document.getElementById('hist-total').innerText = histTotal;
    document.getElementById('hist-accuracy').innerText = histAccuracy;
}

updateAuthUI();
updateHistoricalStats();
