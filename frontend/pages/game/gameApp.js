const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const questionEl = document.getElementById('question');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const feedbackEl = document.getElementById('feedback');
const loadingEl = document.getElementById('loading');

// Game data - will be loaded from API
let apiQuestions = [];
let apiAnswers = [];
let processedQuestions = [];
let currentExamId = null;
let currentExamName = null;

let gameState = {
    player: { x: 400, y: 550, width: 60, height: 30, speed: 5 },
    bullets: [],
    invaders: [],
    currentQuestion: 0,
    score: 0,
    lives: 3,
    level: 1,
    gameRunning: false,
    keys: {},
    invaderSpeed: 1,
    invaderDirection: 1,
    lastShot: 0
};

// Function to get URL parameters
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to load and process data from API
async function loadGameData() {
    try {
        console.log('Loading questions and answers from API...');

        // Get exam parameters from URL
        currentExamId = getUrlParameter('examenId');
        currentExamName = getUrlParameter('examenNaam');

        if (currentExamName) {
            // Update loading message with exam name
            loadingEl.innerHTML = `
                <h2>Vragen laden voor ${decodeURIComponent(currentExamName)}...</h2>
                <p>Het spel wordt voorbereid...</p>
            `;
        }

        // Controleer of de functies bestaan
        if (typeof window.getvragen !== 'function' || typeof window.getAntwoorden !== 'function') {
            throw new Error('API functies zijn niet beschikbaar. Controleer client.js');
        }

        // Load both questions and answers with exam ID parameter
        let questionsPromise, answersPromise;

        if (currentExamId) {
            questionsPromise = window.getvragen(currentExamId).catch(error => {
                console.error('Fout bij ophalen vragen:', error);
                throw new Error('Kon vragen niet ophalen: ' + error.message);
            });

            answersPromise = window.getAntwoorden(currentExamId).catch(error => {
                console.error('Fout bij ophalen antwoorden:', error);
                throw new Error('Kon antwoorden niet ophalen: ' + error.message);
            });
        } else {
            // Fallback to default if no exam ID
            questionsPromise = window.getvragen().catch(error => {
                console.error('Fout bij ophalen vragen:', error);
                throw new Error('Kon vragen niet ophalen: ' + error.message);
            });

            answersPromise = window.getAntwoorden().catch(error => {
                console.error('Fout bij ophalen antwoorden:', error);
                throw new Error('Kon antwoorden niet ophalen: ' + error.message);
            });
        }

        const [questions, answers] = await Promise.all([questionsPromise, answersPromise]);

        // Controleer of de resultaten geldig zijn
        if (!Array.isArray(questions)) {
            throw new Error('Vragen zijn geen array: ' + typeof questions);
        }

        if (!Array.isArray(answers)) {
            throw new Error('Antwoorden zijn geen array: ' + typeof answers);
        }

        apiQuestions = questions;
        apiAnswers = answers;

        console.log('Loaded questions:', apiQuestions.length);
        console.log('Loaded questions data:', apiQuestions);
        console.log('Loaded answers:', apiAnswers.length);
        console.log('Loaded answers data:', apiAnswers);

        // Process the data into game format
        processedQuestions = processApiData(apiQuestions, apiAnswers);

        console.log('Processed questions:', processedQuestions.length);

        if (processedQuestions.length === 0) {
            throw new Error('Geen bruikbare vragen gevonden voor dit examen');
        }

        // Update question panel with exam info if available
        if (currentExamName) {
            questionEl.textContent = `Welkom bij ${decodeURIComponent(currentExamName)} Space Invaders! Schiet het juiste antwoord!`;
        }

        // Hide loading screen and start game
        loadingEl.style.display = 'none';
        initGame();

    } catch (error) {
        console.error('Error loading game data:', error);
        showError('Kon geen vragen laden: ' + error.message);
    }
}

// Function to process API data into game format
function processApiData(questions, answers) {
    const processed = [];

    // Controleer of answers een array is
    if (!Array.isArray(answers)) {
        console.error('Answers is not an array:', answers);
        return processed;
    }

    console.log('Processing data:');
    console.log('Questions structure:', questions.length > 0 ? Object.keys(questions[0]) : 'No questions');
    console.log('Answers structure:', answers.length > 0 ? Object.keys(answers[0]) : 'No answers');

    for (const question of questions) {
        try {
            console.log(`Processing question ${question.id}:`, question);

            // Skip questions that are not multiple choice (like ordering questions)
            if (!question.keuzes || !Array.isArray(question.keuzes) || question.keuzes.length < 2) {
                console.log(`Skipping question ${question.id} - not suitable for game (${question.keuzes ? question.keuzes.length : 0} choices)`);
                continue;
            }

            // Get the question ID
            const questionId = question.id;

            // Find the correct answer from the answers array
            const correctAnswerData = answers.find(a => a.vraag_id === questionId);

            if (!correctAnswerData) {
                console.warn(`No correct answer data found for question ${questionId}`);
                continue;
            }

            console.log(`Found correct answer data:`, correctAnswerData);

            // Get all answer choices from the question's keuzes array
            const answerChoices = question.keuzes.map(keuze => ({
                id: keuze.id,
                text: keuze.text || keuze.label || 'Geen tekst'
            }));

            console.log(`Answer choices for question ${questionId}:`, answerChoices);

            // Find which choice is the correct one by matching the correct_antwoord_id
            const correctIndex = answerChoices.findIndex(choice =>
                choice.id === correctAnswerData.correct_antwoord_id
            );

            if (correctIndex === -1) {
                console.warn(`Could not find correct answer choice for question ${questionId}. Looking for ID: ${correctAnswerData.correct_antwoord_id}`);
                console.log('Available choice IDs:', answerChoices.map(c => c.id));
                continue;
            }

            // Get question text
            const questionText = question.vraagtekst || question.text || 'Geen vraagtekst';

            // Convert to game format
            const processedQuestion = {
                id: questionId,
                question: questionText,
                answers: answerChoices.map(choice => choice.text),
                correct: correctIndex,
                originalQuestion: question,
                correctAnswerData: correctAnswerData
            };

            processed.push(processedQuestion);
            console.log(`Successfully processed question ${questionId}:`, processedQuestion);

        } catch (error) {
            console.error(`Error processing question ${question.id || 'unknown'}:`, error);
        }
    }

    console.log(`Final result: Processed ${processed.length} out of ${questions.length} questions`);

    if (processed.length === 0 && questions.length > 0) {
        console.error('No questions were processed successfully. Data structure mismatch detected.');
        console.log('First question sample:', questions[0]);
        console.log('First answer sample:', answers.length > 0 ? answers[0] : 'No answers');
    }

    return processed;
}

function showError(message) {
    loadingEl.innerHTML = `
        <h2>Fout!</h2>
        <div class="error">${message}</div>
        <button class="restart-btn" onclick="location.reload()">Opnieuw Proberen</button>
        <button class="back-btn" onclick="goBackToExams()">Terug naar Examens</button>
    `;
}

function goBackToExams() {
    // Navigate back to exam selection
    window.location.href = '../chooseExam/chooseExam.html';
}

// Initialize game with processed questions
function initGame() {
    if (processedQuestions.length === 0) {
        showError('Geen vragen beschikbaar');
        return;
    }

    gameState.gameRunning = true;
    gameState.currentQuestion = 0;

    // Shuffle questions for variety
    shuffleArray(processedQuestions);

    createInvaders();
    loadQuestion();
    gameLoop();
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createInvaders() {
    gameState.invaders = [];

    if (gameState.currentQuestion >= processedQuestions.length) {
        // If we've gone through all questions, cycle back to start
        gameState.currentQuestion = 0;
        // Shuffle again for variety
        shuffleArray(processedQuestions);
    }

    const question = processedQuestions[gameState.currentQuestion];
    const startX = 100;
    const startY = 100;
    const maxWidth = canvas.width - 200;
    const spacing = Math.min(150, maxWidth / Math.max(1, question.answers.length - 1));

    for (let i = 0; i < question.answers.length; i++) {
        gameState.invaders.push({
            x: startX + (i * spacing),
            y: startY,
            width: Math.min(120, maxWidth / question.answers.length - 10),
            height: 60,
            text: question.answers[i],
            isCorrect: i === question.correct,
            alive: true
        });
    }
}

function loadQuestion() {
    if (gameState.currentQuestion >= processedQuestions.length) {
        gameState.currentQuestion = 0;
    }

    const question = processedQuestions[gameState.currentQuestion];
    questionEl.textContent = question.question;
}

function handleInput() {
    // Movement
    if (gameState.keys['ArrowLeft'] && gameState.player.x > 0) {
        gameState.player.x -= gameState.player.speed;
    }
    if (gameState.keys['ArrowRight'] && gameState.player.x < canvas.width - gameState.player.width) {
        gameState.player.x += gameState.player.speed;
    }

    // Shooting
    if (gameState.keys[' '] && Date.now() - gameState.lastShot > 200) {
        gameState.bullets.push({
            x: gameState.player.x + gameState.player.width / 2 - 2,
            y: gameState.player.y,
            width: 4,
            height: 10,
            speed: 7
        });
        gameState.lastShot = Date.now();
    }
}

function updateBullets() {
    gameState.bullets = gameState.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        return bullet.y > -bullet.height;
    });
}

function updateInvaders() {
    let moveDown = false;

    // Check if any invader hits the edge
    for (let invader of gameState.invaders) {
        if (!invader.alive) continue;
        if ((invader.x <= 0 && gameState.invaderDirection === -1) ||
            (invader.x + invader.width >= canvas.width && gameState.invaderDirection === 1)) {
            moveDown = true;
            break;
        }
    }

    // Move invaders
    for (let invader of gameState.invaders) {
        if (!invader.alive) continue;

        if (moveDown) {
            invader.y += 40;
        } else {
            invader.x += gameState.invaderSpeed * gameState.invaderDirection;
        }
    }

    if (moveDown) {
        gameState.invaderDirection *= -1;
    }
}

function checkCollisions() {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let bullet = gameState.bullets[i];

        for (let j = 0; j < gameState.invaders.length; j++) {
            let invader = gameState.invaders[j];

            if (!invader.alive) continue;

            if (bullet.x < invader.x + invader.width &&
                bullet.x + bullet.width > invader.x &&
                bullet.y < invader.y + invader.height &&
                bullet.y + bullet.height > invader.y) {

                // Hit!
                gameState.bullets.splice(i, 1);
                invader.alive = false;

                if (invader.isCorrect) {
                    // Correct answer
                    gameState.score += 100 * gameState.level;
                    showFeedback("Correct! +100", true);
                    nextQuestion();
                } else {
                    // Wrong answer
                    gameState.lives--;
                    showFeedback("Verkeerd antwoord! -1 leven", false);

                    if (gameState.lives <= 0) {
                        endGame();
                    } else {
                        // Reset question with remaining answers
                        setTimeout(() => {
                            createInvaders();
                        }, 1500);
                    }
                }
                break;
            }
        }
    }
}

function showFeedback(message, isCorrect) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${isCorrect ? 'correct' : 'incorrect'} show`;

    setTimeout(() => {
        feedbackEl.classList.remove('show');
    }, 1500);
}

function nextQuestion() {
    gameState.currentQuestion++;

    if (gameState.currentQuestion >= processedQuestions.length) {
        // Level up - cycle through questions again
        gameState.level++;
        gameState.invaderSpeed += 0.5;
        gameState.currentQuestion = 0;

        // Bonus for completing level
        gameState.score += 500 * gameState.level;
        showFeedback(`Level ${gameState.level}! Bonus: ${500 * gameState.level}`, true);
    }

    setTimeout(() => {
        createInvaders();
        loadQuestion();
    }, 1500);
}

function endGame() {
    gameState.gameRunning = false;
    finalScoreEl.textContent = gameState.score;
    gameOverEl.style.display = 'block';
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 43) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }

    // Draw player
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);

    // Draw player cannon
    ctx.fillRect(gameState.player.x + gameState.player.width/2 - 3, gameState.player.y - 10, 6, 10);

    // Draw bullets
    ctx.fillStyle = '#ffff00';
    for (let bullet of gameState.bullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    // Draw invaders
    for (let invader of gameState.invaders) {
        if (!invader.alive) continue;

        // Invader body
        ctx.fillStyle = invader.isCorrect ? '#00ff00' : '#ff6666';
        ctx.fillRect(invader.x, invader.y, invader.width, invader.height);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(invader.x, invader.y, invader.width, invader.height);

        // Text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap for long text
        const words = invader.text.split(' ');
        let line = '';
        let lines = [];

        for (let word of words) {
            let testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > invader.width - 10) {
                if (line) lines.push(line.trim());
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line.trim());

        const lineHeight = 14;
        const startY = invader.y + invader.height/2 - (lines.length - 1) * lineHeight/2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], invader.x + invader.width/2, startY + i * lineHeight);
        }
    }
}

function updateUI() {
    scoreEl.textContent = gameState.score;
    livesEl.textContent = gameState.lives;
    levelEl.textContent = gameState.level;
}

function gameLoop() {
    if (!gameState.gameRunning) return;

    handleInput();
    updateBullets();
    updateInvaders();
    checkCollisions();
    draw();
    updateUI();

    requestAnimationFrame(gameLoop);
}

function restartGame() {
    gameState = {
        player: { x: 400, y: 550, width: 60, height: 30, speed: 5 },
        bullets: [],
        invaders: [],
        currentQuestion: 0,
        score: 0,
        lives: 3,
        level: 1,
        gameRunning: true,
        keys: {},
        invaderSpeed: 1,
        invaderDirection: 1,
        lastShot: 0
    };

    gameOverEl.style.display = 'none';
    feedbackEl.classList.remove('show');
    initGame();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    if (e.key === ' ') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// Make functions globally available
window.restartGame = restartGame;
window.goBackToExams = goBackToExams;

// Start loading data when page loads
window.addEventListener('load', () => {
    loadGameData();
});