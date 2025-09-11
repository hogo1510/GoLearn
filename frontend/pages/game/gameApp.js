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

// Function to load and process data from API
async function loadGameData() {
    try {
        console.log('Loading questions and answers from API...');

        // Controleer of de functies bestaan
        if (typeof window.getvragen !== 'function' || typeof window.getAntwoorden !== 'function') {
            throw new Error('API functies zijn niet beschikbaar. Controleer client.js');
        }

        // Load both questions and answers met betere error handling
        const questionsPromise = window.getvragen().catch(error => {
            console.error('Fout bij ophalen vragen:', error);
            throw new Error('Kon vragen niet ophalen: ' + error.message);
        });

        const answersPromise = window.getAntwoorden().catch(error => {
            console.error('Fout bij ophalen antwoorden:', error);
            throw new Error('Kon antwoorden niet ophalen: ' + error.message);
        });

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
            throw new Error('Geen bruikbare vragen gevonden');
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

    for (const question of questions) {
        try {
            // Find the corresponding answer
            const answer = answers.find(a => a.vraag_id === question.id);

            if (!answer) {
                console.warn(`No answer found for question ${question.id}`);
                continue;
            }

            // Only process multiple choice questions
            if (!question.keuzes || !Array.isArray(question.keuzes) || question.keuzes.length < 2) {
                console.warn(`Question ${question.id} has insufficient choices`);
                continue;
            }

            // Find correct answer index
            const correctIndex = question.keuzes.findIndex(choice =>
                choice.id === answer.correct_antwoord_id
            );

            if (correctIndex === -1) {
                console.warn(`Correct answer not found for question ${question.id}`);
                continue;
            }

            // Convert to game format
            processed.push({
                id: question.id,
                question: question.vraagtekst || 'Geen vraagtekst',
                answers: question.keuzes.map(choice => choice.text || 'Geen tekst'),
                correct: correctIndex,
                originalQuestion: question,
                originalAnswer: answer
            });

        } catch (error) {
            console.error(`Error processing question ${question.id}:`, error);
        }
    }

    return processed;
}

function showError(message) {
    loadingEl.innerHTML = `
            <h2>Fout!</h2>
            <div class="error">${message}</div>
            <button class="restart-btn" onclick="location.reload()">Opnieuw Proberen</button>
        `;
}

// Initialize game with processed questions
function initGame() {
    if (processedQuestions.length === 0) {
        showError('Geen vragen beschikbaar');
        return;
    }

    gameState.gameRunning = true;
    gameState.currentQuestion = 0;
    createInvaders();
    loadQuestion();
    gameLoop();
}

function createInvaders() {
    gameState.invaders = [];

    if (gameState.currentQuestion >= processedQuestions.length) {
        // If we've gone through all questions, cycle back to start
        gameState.currentQuestion = 0;
    }

    const question = processedQuestions[gameState.currentQuestion];
    const startX = 150;
    const startY = 100;
    const spacing = Math.min(150, (canvas.width - 300) / Math.max(1, question.answers.length - 1));

    for (let i = 0; i < question.answers.length; i++) {
        gameState.invaders.push({
            x: startX + (i * spacing),
            y: startY,
            width: 120,
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

// Start loading data when page loads
window.addEventListener('load', () => {
    loadGameData();
});