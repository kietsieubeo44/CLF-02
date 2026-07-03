// state storage structure
let state = {
    bookmarks: [],
    mastered: [],
    bestScore: null,
    currentView: 'dashboard',
    
    // Study Mode State
    study: {
        filteredQuestions: [],
        currentIndex: 0,
        range: 'all',
        searchQuery: '',
        revealed: false,
        selectedOptions: []
    },
    
    // Exam Mode State
    exam: {
        active: false,
        questions: [],
        answers: {}, // questionId -> array of selected letters
        flags: [],
        currentIndex: 0,
        timeRemaining: 90 * 60, // 90 minutes in seconds
        timerInterval: null
    }
};

// DOM Bindings
const views = {
    dashboard: document.getElementById('view-dashboard'),
    study: document.getElementById('view-study'),
    exam: document.getElementById('view-exam'),
    results: document.getElementById('view-results')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    initDashboard();
    initTheme();
    
    // Populate counts in study sidebar ranges
    updateRangeCounts();
    
    // Default show home
    showView('dashboard');
});

// Load progress from localStorage
function loadProgress() {
    try {
        state.bookmarks = JSON.parse(localStorage.getItem('aws_quiz_bookmarks')) || [];
        state.mastered = JSON.parse(localStorage.getItem('aws_quiz_mastered')) || [];
        state.bestScore = localStorage.getItem('aws_quiz_best_score') ? parseFloat(localStorage.getItem('aws_quiz_best_score')) : null;
    } catch (e) {
        console.error("Failed to load progress from local storage", e);
    }
}

// Save progress to localStorage
function saveProgress() {
    try {
        localStorage.setItem('aws_quiz_bookmarks', JSON.stringify(state.bookmarks));
        localStorage.setItem('aws_quiz_mastered', JSON.stringify(state.mastered));
        if (state.bestScore !== null) {
            localStorage.setItem('aws_quiz_best_score', state.bestScore.toString());
        }
    } catch (e) {
        console.error("Failed to save progress to local storage", e);
    }
}

// Update dashboard statistics
function initDashboard() {
    document.getElementById('stat-total-questions').innerText = QUESTIONS.length.toString();
    document.getElementById('stat-bookmarks').innerText = state.bookmarks.length.toString();
    document.getElementById('stat-mastered').innerText = state.mastered.length.toString();
    
    const scoreText = state.bestScore !== null ? `${state.bestScore.toFixed(0)}%` : '--%';
    document.getElementById('stat-best-score').innerText = scoreText;
}

// Theme logic
function initTheme() {
    const savedTheme = localStorage.getItem('aws_quiz_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('aws_quiz_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const iconLight = document.getElementById('theme-icon-light');
    const iconDark = document.getElementById('theme-icon-dark');
    if (theme === 'light') {
        iconLight.style.display = 'inline-block';
        iconDark.style.display = 'none';
    } else {
        iconLight.style.display = 'none';
        iconDark.style.display = 'inline-block';
    }
}

// Switch between views
function showView(viewName) {
    // If an exam is currently active, prompt confirmation before leaving
    if (state.exam.active && viewName !== 'exam') {
        if (!confirm("Your mock exam is currently in progress. Leaving this page will submit your exam as is. Do you want to submit?")) {
            return;
        }
        submitExamFinal();
    }

    state.currentView = viewName;
    
    // Hide all views, show target view
    for (const key in views) {
        if (views[key]) {
            views[key].style.display = key === viewName ? '' : 'none';
        }
    }
    
    // Highlight nav buttons
    document.getElementById('btn-home').classList.toggle('btn-primary', viewName === 'dashboard');
    document.getElementById('btn-home').classList.toggle('btn-text', viewName !== 'dashboard');
    
    document.getElementById('btn-study').classList.toggle('btn-primary', viewName === 'study');
    document.getElementById('btn-study').classList.toggle('btn-text', viewName !== 'study');
    
    document.getElementById('btn-exam').classList.toggle('btn-primary', viewName === 'exam');
    document.getElementById('btn-exam').classList.toggle('btn-text', viewName !== 'exam');

    if (viewName === 'study') {
        initStudyMode();
    } else if (viewName === 'dashboard') {
        initDashboard();
    }
}

// ================= STUDY MODE CONTROLLER =================

function initStudyMode() {
    state.study.searchQuery = '';
    document.getElementById('search-input').value = '';
    
    // Load question filters based on current range
    filterQuestions();
    calculateProgress();
    updateRangeCounts();
}

function updateRangeCounts() {
    // Range counts
    document.querySelector('#range-all .range-count').innerText = QUESTIONS.length.toString();
    document.querySelector('#range-1-100 .range-count').innerText = QUESTIONS.filter(q => q.id >= 1 && q.id <= 100).length.toString();
    document.querySelector('#range-101-200 .range-count').innerText = QUESTIONS.filter(q => q.id >= 101 && q.id <= 200).length.toString();
    document.querySelector('#range-201-300 .range-count').innerText = QUESTIONS.filter(q => q.id >= 201 && q.id <= 300).length.toString();
    document.querySelector('#range-301-400 .range-count').innerText = QUESTIONS.filter(q => q.id >= 301 && q.id <= 400).length.toString();
    document.getElementById('badge-bookmark-count').innerText = state.bookmarks.length.toString();
}

function calculateProgress() {
    const total = QUESTIONS.length;
    const masteredCount = state.mastered.length;
    const percent = total > 0 ? (masteredCount / total) * 100 : 0;
    
    document.getElementById('mastery-progress-text').innerText = `${percent.toFixed(0)}%`;
    document.getElementById('mastery-progress-fill').style.width = `${percent}%`;
}

function filterByRange(rangeName) {
    state.study.range = rangeName;
    
    // Toggle sidebar class active
    const rangeItems = document.querySelectorAll('.range-item');
    rangeItems.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.getElementById(`range-${rangeName}`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    state.study.currentIndex = 0;
    filterQuestions();
}

function handleSearch() {
    state.study.searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    state.study.currentIndex = 0;
    filterQuestions();
}

function filterQuestions() {
    let qs = [...QUESTIONS];
    
    // 1. Filter by range
    const range = state.study.range;
    if (range === '1-100') {
        qs = qs.filter(q => q.id >= 1 && q.id <= 100);
    } else if (range === '101-200') {
        qs = qs.filter(q => q.id >= 101 && q.id <= 200);
    } else if (range === '201-300') {
        qs = qs.filter(q => q.id >= 201 && q.id <= 300);
    } else if (range === '301-400') {
        qs = qs.filter(q => q.id >= 301 && q.id <= 400);
    } else if (range === 'bookmarked') {
        qs = qs.filter(q => state.bookmarks.includes(q.id));
    }
    
    // 2. Filter by search query
    const query = state.study.searchQuery;
    if (query) {
        qs = qs.filter(q => 
            q.question.toLowerCase().includes(query) || 
            q.explanation.toLowerCase().includes(query) ||
            q.options.some(opt => opt.text.toLowerCase().includes(query))
        );
    }
    
    state.study.filteredQuestions = qs;
    state.study.revealed = false;
    state.study.selectedOptions = [];
    
    renderStudyQuestion();
}

function highlightSearchMatch(text, query) {
    if (!query) return text;
    // escape regex characters
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark style="background-color: rgba(251,191,36,0.3); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

function renderStudyQuestion() {
    const container = document.getElementById('study-question-card');
    const explanationPanel = document.getElementById('explanation-panel');
    
    if (state.study.filteredQuestions.length === 0) {
        // Render empty state
        document.getElementById('study-q-num').innerText = "Question #0";
        document.getElementById('study-q-source').innerText = "";
        document.getElementById('study-q-body').innerText = "No questions found matching your selection or search query.";
        document.getElementById('study-options-list').innerHTML = "";
        document.getElementById('btn-show-answer').style.display = 'none';
        explanationPanel.style.display = 'none';
        return;
    }
    
    document.getElementById('btn-show-answer').style.display = 'inline-flex';
    
    const q = state.study.filteredQuestions[state.study.currentIndex];
    
    // Question Header info
    document.getElementById('study-q-num').innerText = `Question #${q.id}`;
    document.getElementById('study-q-source').innerText = q.source || "ExamTopics Practice";
    
    // Highlight query in question body
    const query = state.study.searchQuery;
    document.getElementById('study-q-body').innerHTML = highlightSearchMatch(q.question, query);
    
    // Highlight bookmark icon
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (state.bookmarks.includes(q.id)) {
        bookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark" style="color: var(--accent-primary);"></i>';
    } else {
        bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
    }
    
    // Highlight master icon
    const masterBtn = document.getElementById('btn-master');
    if (state.mastered.includes(q.id)) {
        masterBtn.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i>';
    } else {
        masterBtn.innerHTML = '<i class="fa-regular fa-circle-check"></i>';
    }
    
    // Render options
    const optionsList = document.getElementById('study-options-list');
    optionsList.innerHTML = "";
    
    // Detect multiple answers (if answer has more than 1 option)
    const isMultiSelect = q.answer.length > 1;
    
    q.options.forEach(opt => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.id = `study-opt-${opt.letter}`;
        
        const isSelected = state.study.selectedOptions.includes(opt.letter);
        if (isSelected) {
            optionItem.classList.add('selected');
        }
        
        // Handle Revealed styles
        if (state.study.revealed) {
            const isCorrect = q.answer.includes(opt.letter);
            if (isCorrect) {
                optionItem.classList.add('correct');
            } else if (isSelected) {
                optionItem.classList.add('incorrect');
            }
            optionItem.style.pointerEvents = 'none'; // Lock clicking after reveal
        } else {
            optionItem.onclick = () => selectOptionStudy(opt.letter, isMultiSelect);
        }
        
        // Highlight search query in option text
        const optionTextHtml = highlightSearchMatch(opt.text, query);
        
        optionItem.innerHTML = `
            <div class="option-letter">${opt.letter}</div>
            <div class="option-text">${optionTextHtml}</div>
        `;
        
        optionsList.appendChild(optionItem);
    });
    
    // Render explanation panel
    if (state.study.revealed) {
        explanationPanel.style.display = 'block';
        // Clean explanation highlights or text formats if needed
        const cleanExplanation = q.explanation || "No explanation or discussion notes available for this question.";
        document.getElementById('explanation-body').innerHTML = highlightSearchMatch(cleanExplanation, query);
    } else {
        explanationPanel.style.display = 'none';
    }
}

function selectOptionStudy(letter, isMultiSelect) {
    if (state.study.revealed) return;
    
    if (isMultiSelect) {
        const idx = state.study.selectedOptions.indexOf(letter);
        if (idx > -1) {
            state.study.selectedOptions.splice(idx, 1);
        } else {
            state.study.selectedOptions.push(letter);
        }
    } else {
        state.study.selectedOptions = [letter];
    }
    
    // Rerender option list to show select state
    renderStudyQuestion();
}

function revealAnswer() {
    if (state.study.filteredQuestions.length === 0) return;
    state.study.revealed = true;
    renderStudyQuestion();
}

function prevQuestion() {
    if (state.study.filteredQuestions.length === 0) return;
    
    if (state.study.currentIndex > 0) {
        state.study.currentIndex--;
    } else {
        // wrap to last
        state.study.currentIndex = state.study.filteredQuestions.length - 1;
    }
    state.study.revealed = false;
    state.study.selectedOptions = [];
    renderStudyQuestion();
}

function nextQuestion() {
    if (state.study.filteredQuestions.length === 0) return;
    
    if (state.study.currentIndex < state.study.filteredQuestions.length - 1) {
        state.study.currentIndex++;
    } else {
        // wrap to first
        state.study.currentIndex = 0;
    }
    state.study.revealed = false;
    state.study.selectedOptions = [];
    renderStudyQuestion();
}

function toggleBookmarkCurrent() {
    if (state.study.filteredQuestions.length === 0) return;
    const q = state.study.filteredQuestions[state.study.currentIndex];
    
    const idx = state.bookmarks.indexOf(q.id);
    if (idx > -1) {
        state.bookmarks.splice(idx, 1);
    } else {
        state.bookmarks.push(q.id);
    }
    
    saveProgress();
    updateRangeCounts();
    renderStudyQuestion();
}

function toggleMasteredCurrent() {
    if (state.study.filteredQuestions.length === 0) return;
    const q = state.study.filteredQuestions[state.study.currentIndex];
    
    const idx = state.mastered.indexOf(q.id);
    if (idx > -1) {
        state.mastered.splice(idx, 1);
    } else {
        state.mastered.push(q.id);
    }
    
    saveProgress();
    calculateProgress();
    initDashboard(); // Update home stat too
    renderStudyQuestion();
}


// ================= MOCK EXAM CONTROLLER =================

function startMockExam() {
    // If an exam is already running, jump back into it
    if (state.exam.active) {
        showView('exam');
        return;
    }
    
    // Draw 65 random questions from QUESTIONS bank
    const examQuestions = getRandomSample(QUESTIONS, 65);
    
    state.exam.active = true;
    state.exam.questions = examQuestions;
    state.exam.answers = {};
    state.exam.flags = [];
    state.exam.currentIndex = 0;
    state.exam.timeRemaining = 90 * 60; // 90 minutes
    
    // Hide main menus and show mock exam view
    showView('exam');
    
    // Clear and start timer interval
    if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
    state.exam.timerInterval = setInterval(updateExamTimer, 1000);
    
    // Generate questions navigator grid
    renderExamGrid();
    renderExamQuestion();
}

function getRandomSample(arr, num) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

function renderExamGrid() {
    const grid = document.getElementById('exam-question-grid');
    grid.innerHTML = "";
    
    state.exam.questions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.id = `exam-grid-item-${idx}`;
        item.innerText = (idx + 1).toString();
        
        // Set indicator styles
        const isCurrent = idx === state.exam.currentIndex;
        const isAnswered = state.exam.answers[q.id] && state.exam.answers[q.id].length > 0;
        const isFlagged = state.exam.flags.includes(q.id);
        
        if (isCurrent) item.classList.add('current');
        if (isAnswered) item.classList.add('answered');
        if (isFlagged) item.classList.add('flagged');
        
        item.onclick = () => jumpToExamQuestion(idx);
        grid.appendChild(item);
    });
}

function renderExamQuestion() {
    const q = state.exam.questions[state.exam.currentIndex];
    
    document.getElementById('exam-progress-badge').innerText = `Question ${state.exam.currentIndex + 1} / 65`;
    document.getElementById('exam-q-real-num').innerText = `Practice Bank Q#${q.id}`;
    document.getElementById('exam-q-body').innerText = q.question;
    
    // Highlight Flag button
    const flagBtn = document.getElementById('btn-flag-exam');
    const isFlagged = state.exam.flags.includes(q.id);
    if (isFlagged) {
        flagBtn.innerHTML = '<i class="fa-solid fa-flag" style="color: var(--warning);"></i> Flagged';
        flagBtn.classList.add('btn-primary');
    } else {
        flagBtn.innerHTML = '<i class="fa-regular fa-flag"></i> Flag Question';
        flagBtn.classList.remove('btn-primary');
    }
    
    // Render options
    const optionsList = document.getElementById('exam-options-list');
    optionsList.innerHTML = "";
    
    const isMultiSelect = q.answer.length > 1;
    const userAnswers = state.exam.answers[q.id] || [];
    
    q.options.forEach(opt => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        if (userAnswers.includes(opt.letter)) {
            optionItem.classList.add('selected');
        }
        
        optionItem.onclick = () => selectOptionExam(opt.letter, isMultiSelect);
        
        optionItem.innerHTML = `
            <div class="option-letter">${opt.letter}</div>
            <div class="option-text">${opt.text}</div>
        `;
        optionsList.appendChild(optionItem);
    });
    
    // Rerender navigator grids to update 'current' state
    const gridItems = document.querySelectorAll('.grid-item');
    gridItems.forEach((item, idx) => {
        item.classList.toggle('current', idx === state.exam.currentIndex);
    });
}

function selectOptionExam(letter, isMultiSelect) {
    const q = state.exam.questions[state.exam.currentIndex];
    
    if (!state.exam.answers[q.id]) {
        state.exam.answers[q.id] = [];
    }
    
    const userAnswers = state.exam.answers[q.id];
    
    if (isMultiSelect) {
        const idx = userAnswers.indexOf(letter);
        if (idx > -1) {
            userAnswers.splice(idx, 1);
        } else {
            userAnswers.push(letter);
        }
    } else {
        state.exam.answers[q.id] = [letter];
    }
    
    // Re-render display states
    renderExamQuestion();
    
    // Update Navigator Grid item style
    const gridItem = document.getElementById(`exam-grid-item-${state.exam.currentIndex}`);
    if (gridItem) {
        const hasAnswers = state.exam.answers[q.id] && state.exam.answers[q.id].length > 0;
        gridItem.classList.toggle('answered', hasAnswers);
    }
}

function toggleExamFlag() {
    const q = state.exam.questions[state.exam.currentIndex];
    const idx = state.exam.flags.indexOf(q.id);
    if (idx > -1) {
        state.exam.flags.splice(idx, 1);
    } else {
        state.exam.flags.push(q.id);
    }
    
    renderExamQuestion();
    
    // Update grid item flag color
    const gridItem = document.getElementById(`exam-grid-item-${state.exam.currentIndex}`);
    if (gridItem) {
        const isFlagged = state.exam.flags.includes(q.id);
        gridItem.classList.toggle('flagged', isFlagged);
    }
}

function jumpToExamQuestion(idx) {
    state.exam.currentIndex = idx;
    renderExamQuestion();
}

function prevExamQuestion() {
    if (state.exam.currentIndex > 0) {
        state.exam.currentIndex--;
        renderExamQuestion();
    }
}

function nextExamQuestion() {
    if (state.exam.currentIndex < 64) {
        state.exam.currentIndex++;
        renderExamQuestion();
    }
}

function updateExamTimer() {
    if (!state.exam.active) return;
    
    if (state.exam.timeRemaining > 0) {
        state.exam.timeRemaining--;
        
        // Format time string MM:SS
        const minutes = Math.floor(state.exam.timeRemaining / 60);
        const seconds = state.exam.timeRemaining % 60;
        
        const timerDisplay = document.getElementById('timer-display');
        timerDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Under 5 minutes left
        if (state.exam.timeRemaining < 5 * 60) {
            timerDisplay.parentElement.classList.add('danger');
        }
    } else {
        // Time ran out!
        clearInterval(state.exam.timerInterval);
        alert("Time is up! Your exam will be submitted automatically.");
        submitExamFinal();
    }
}

function promptSubmitExam() {
    // Count answered questions
    let answeredCount = 0;
    state.exam.questions.forEach(q => {
        if (state.exam.answers[q.id] && state.exam.answers[q.id].length > 0) {
            answeredCount++;
        }
    });
    
    const unAnswered = 65 - answeredCount;
    const modalText = document.getElementById('submit-modal-text');
    if (unAnswered > 0) {
        modalText.innerHTML = `You have answered <strong>${answeredCount}</strong> out of 65 questions.<br><span style="color: var(--error); font-weight: 600;">You have ${unAnswered} unanswered questions left!</span><br><br>Are you sure you want to submit?`;
    } else {
        modalText.innerHTML = `You have answered all 65 questions.<br><br>Are you sure you want to submit and view your grade?`;
    }
    
    openModal('modal-submit-exam');
}

function submitExamFinal() {
    closeModal('modal-submit-exam');
    
    state.exam.active = false;
    if (state.exam.timerInterval) {
        clearInterval(state.exam.timerInterval);
    }
    
    // Calculate Score
    let correctCount = 0;
    state.exam.questions.forEach(q => {
        const userSelections = state.exam.answers[q.id] || [];
        
        // Match lists
        const isCorrect = userSelections.length === q.answer.length &&
                          userSelections.every(letter => q.answer.includes(letter));
        if (isCorrect) {
            correctCount++;
        }
    });
    
    const percentage = (correctCount / 65) * 100;
    
    // Update best score
    if (state.bestScore === null || percentage > state.bestScore) {
        state.bestScore = percentage;
        saveProgress();
    }
    
    // Populate Results Screen
    const resultsContainer = document.getElementById('view-results');
    const isPassed = percentage >= 70; // AWS CLF-C02 passing score is approx 70% (700/1000)
    
    const statusTitle = document.getElementById('result-status-title');
    statusTitle.innerText = isPassed ? "PASSED" : "FAILED";
    statusTitle.className = `result-status ${isPassed ? 'pass' : 'fail'}`;
    
    const scoreCircle = document.getElementById('result-score-circle');
    scoreCircle.className = `score-circle ${isPassed ? 'pass' : 'fail'}`;
    document.getElementById('result-score-percent').innerText = `${percentage.toFixed(0)}%`;
    
    document.getElementById('result-stat-score').innerText = `${correctCount} / 65`;
    
    // Time spent calculation
    const timeSpentSec = (90 * 60) - state.exam.timeRemaining;
    const timeMin = Math.floor(timeSpentSec / 60);
    const timeSec = timeSpentSec % 60;
    document.getElementById('result-stat-time').innerText = `${timeMin.toString().padStart(2, '0')}:${timeSec.toString().padStart(2, '0')}`;
    
    // Date
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('result-stat-date').innerText = today.toLocaleDateString('en-US', options);
    
    // Render Diagnostic review list
    renderReviewList();
    
    // Display results view
    showView('results');
}

function renderReviewList() {
    const list = document.getElementById('results-review-list');
    list.innerHTML = "";
    
    state.exam.questions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'review-item';
        
        const userSelections = state.exam.answers[q.id] || [];
        const isCorrect = userSelections.length === q.answer.length &&
                          userSelections.every(letter => q.answer.includes(letter));
                          
        const badge = document.createElement('div');
        badge.className = `review-badge ${isCorrect ? 'correct' : 'incorrect'}`;
        badge.innerHTML = isCorrect ? '<i class="fa-solid fa-circle-check"></i> Correct' : '<i class="fa-solid fa-circle-xmark"></i> Incorrect';
        
        const questionHeader = document.createElement('h4');
        questionHeader.style.fontWeight = '700';
        questionHeader.style.fontSize = '16px';
        questionHeader.innerText = `Question ${idx + 1}: Practice Bank Q#${q.id}`;
        
        const questionBody = document.createElement('p');
        questionBody.style.fontFamily = 'var(--font-heading)';
        questionBody.style.fontSize = '16px';
        questionBody.style.margin = '10px 0 16px 0';
        questionBody.innerText = q.question;
        
        // Options List for Review
        const optsList = document.createElement('div');
        optsList.className = 'options-list';
        
        q.options.forEach(opt => {
            const optDiv = document.createElement('div');
            optDiv.className = 'option-item';
            
            const wasSelected = userSelections.includes(opt.letter);
            const isAnswerKey = q.answer.includes(opt.letter);
            
            if (isAnswerKey) {
                optDiv.classList.add('correct');
            } else if (wasSelected) {
                optDiv.classList.add('incorrect');
            }
            
            if (wasSelected) {
                optDiv.classList.add('selected');
            }
            
            optDiv.style.pointerEvents = 'none'; // Static block
            optDiv.innerHTML = `
                <div class="option-letter">${opt.letter}</div>
                <div class="option-text">${opt.text}</div>
            `;
            optsList.appendChild(optDiv);
        });
        
        // Explanation
        const expDiv = document.createElement('div');
        expDiv.className = 'explanation-panel';
        expDiv.style.marginTop = '16px';
        expDiv.innerHTML = `
            <div class="explanation-header">
                <i class="fa-solid fa-circle-info"></i> Correct Answer: ${q.answer.join(', ')}
            </div>
            <div class="explanation-body" style="font-size: 13.5px; max-height: none;">
                ${q.explanation || 'No discussion or context notes provided.'}
            </div>
        `;
        
        item.appendChild(badge);
        item.appendChild(questionHeader);
        item.appendChild(questionBody);
        item.appendChild(optsList);
        item.appendChild(expDiv);
        
        list.appendChild(item);
    });
}


// ================= MODAL & UTILITIES =================

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function confirmResetProgress() {
    openModal('modal-reset-progress');
}

function resetProgressFinal() {
    closeModal('modal-reset-progress');
    localStorage.removeItem('aws_quiz_bookmarks');
    localStorage.removeItem('aws_quiz_mastered');
    localStorage.removeItem('aws_quiz_best_score');
    
    // Hard refresh to reload clean app state
    window.location.reload();
}
