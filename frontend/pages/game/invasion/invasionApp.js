// Mock client.js functions for demonstration
window.getvragen = function(examId) {
    return Promise.resolve([
        {
            id: 1,
            vraagtekst: "Een cliënt wordt bedreigd door schulden. Wat is de beste eerste interventie?",
            keuzes: [
                {id: 1, text: "Direct een lening regelen"},
                {id: 2, text: "Schuldhulpverlening en budgettering"},
                {id: 3, text: "Zeggen dat ze meer moeten werken"},
                {id: 4, text: "Familie om geld vragen"}
            ],
            threat: "Schulden"
        },
        {
            id: 2,
            vraagtekst: "Eenzaamheid treft een oudere cliënt. Welke aanpak is het meest effectief?",
            keuzes: [
                {id: 5, text: "Medicatie voorschrijven"},
                {id: 6, text: "Sociale netwerk versterken en activiteiten"},
                {id: 7, text: "Zeggen dat het normaal is op hun leeftijd"},
                {id: 8, text: "Gewoon afwachten"}
            ],
            threat: "Eenzaamheid"
        },
        {
            id: 3,
            vraagtekst: "Verslaving bedreigt het leven van een jongere. Wat is cruciaal?",
            keuzes: [
                {id: 9, text: "Direct afkicken forceren"},
                {id: 10, text: "Motivatiegerichte begeleiding en behandeling"},
                {id: 11, text: "De persoon veroordelen"},
                {id: 12, text: "Negeren tot ze om hulp vragen"}
            ],
            threat: "Verslaving"
        },
        {
            id: 4,
            vraagtekst: "Huiselijk geweld bedreigt de veiligheid. Wat heeft prioriteit?",
            keuzes: [
                {id: 13, text: "Bemiddelen tussen partners"},
                {id: 14, text: "Veiligheid waarborgen en professionele hulp"},
                {id: 15, text: "Zeggen dat het privé is"},
                {id: 16, text: "Wachten op meer bewijs"}
            ],
            threat: "Huiselijk Geweld"
        },
        {
            id: 5,
            vraagtekst: "Werkloosheid veroorzaakt stress en depressie. Beste benadering?",
            keuzes: [
                {id: 17, text: "Zeggen dat ze harder moeten zoeken"},
                {id: 18, text: "Begeleiding bij solliciteren en emotionele steun"},
                {id: 19, text: "Accepteren dat werk schaars is"},
                {id: 20, text: "Focussen op uitkeringen"}
            ],
            threat: "Werkloosheid"
        },
        {
            id: 6,
            vraagtekst: "Psychische problemen ontwrichten het dagelijks leven. Wat is essentieel?",
            keuzes: [
                {id: 21, text: "Zeggen dat het in hun hoofd zit"},
                {id: 22, text: "Professionele hulp en begrip tonen"},
                {id: 23, text: "Medicatie als enige oplossing"},
                {id: 24, text: "Isolatie adviseren"}
            ],
            threat: "Psychische Problemen"
        }
    ]);
};

window.getAntwoorden = function(examId) {
    return Promise.resolve([
        {vraag_id: 1, correct_antwoord_id: 2}, // Schuldhulpverlening en budgettering
        {vraag_id: 2, correct_antwoord_id: 6}, // Sociale netwerk versterken
        {vraag_id: 3, correct_antwoord_id: 10}, // Motivatiegerichte begeleiding
        {vraag_id: 4, correct_antwoord_id: 14}, // Veiligheid waarborgen
        {vraag_id: 5, correct_antwoord_id: 18}, // Begeleiding en emotionele steun
        {vraag_id: 6, correct_antwoord_id: 22}  // Professionele hulp en begrip
    ]);
};

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const questionPanel = document.getElementById('questionPanel');
const questionEl = document.getElementById('question');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const cityHealthEl = document.getElementById('cityHealth');
const missilesEl = document.getElementById('missiles');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const threatsDestroyedEl = document.getElementById('threatsDestroyed');
const finalCityHealthEl = document.getElementById('finalCityHealth');
const feedbackEl = document.getElementById('feedback');
const loadingEl = document.getElementById('loading');
const answersContainerEl = document.getElementById('answersContainer');
const threatInfoEl = document.getElementById('threatInfo');
const threatNameEl = document.getElementById('threatName');
const threatDescriptionEl = document.getElementById('threatDescription');
const timerFillEl = document.getElementById('timerFill');
const crosshairEl = document.getElementById('crosshair');

let apiQuestions = [];
let apiAnswers = [];
let processedQuestions = [];
let currentExamId = null;
let currentExamName = null;

let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    cityHealth: 100,
    missiles: 10,
    gameRunning: false,
    paused: false,
    threats: [],
    explosions: [],
    buildings: [],
    currentQuestion: null,
    questionTimeout: null,
    timeLeft: 15,
    threatsDestroyed: 0,
    mouse: { x: 0, y: 0 },
    targetThreat: null
};

// Threat class
class Threat {
    constructor(x, y, type, speed = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = speed;
        this.width = 80;
        this.height = 30;
        this.targetX = Math.random() * (canvas.width - 100) + 50;
        this.targetY = canvas.height - 80;
        this.alive = true;
        this.color = this.getThreatColor();
        this.trail = [];
    }

    getThreatColor() {
        const colors = {
            'Schulden': '#e74c3c',
            'Eenzaamheid': '#8e44ad',
            'Verslaving': '#d35400',
            'Huiselijk Geweld': '#c0392b',
            'Werkloosheid': '#f39c12',
            'Psychische Problemen': '#7f8c8d'
        };
        return colors[this.type] || '#e74c3c';
    }

    update() {
        if (!this.alive || gameState.paused) return;

        // Calculate direction to target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 2) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // Add trail effect
        this.trail.push({ x: this.x + this.width/2, y: this.y + this.height/2 });
        if (this.trail.length > 8) {
            this.trail.shift();
        }

        // Check if reached target
        if (distance <= 5) {
            this.explode();
        }
    }

    explode() {
        if (!this.alive) return;

        this.alive = false;
        gameState.cityHealth -= 20;
        gameState.lives--;

        // Create explosion
        gameState.explosions.push(new Explosion(
            this.x + this.width/2,
            this.y + this.height/2,
            60
        ));

        if (gameState.lives <= 0 || gameState.cityHealth <= 0) {
            endGame();
        }
    }

    draw() {
        if (!this.alive) return;

        // Draw trail
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = i / this.trail.length;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw threat body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap
        const words = this.type.split(' ');
        if (words.length > 1) {
            ctx.fillText(words[0], this.x + this.width/2, this.y + this.height/2 - 6);
            ctx.fillText(words.slice(1).join(' '), this.x + this.width/2, this.y + this.height/2 + 6);
        } else {
            ctx.fillText(this.type, this.x + this.width/2, this.y + this.height/2);
        }
    }

    isClicked(mouseX, mouseY) {
        return mouseX >= this.x && mouseX <= this.x + this.width &&
            mouseY >= this.y && mouseY <= this.y + this.height;
    }
}

// Explosion class
class Explosion {
    constructor(x, y, maxRadius = 40) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.life = 20;
        this.maxLife = 20;
    }

    update() {
        if (this.life > 0) {
            this.radius += (this.maxRadius - this.radius) * 0.3;
            this.life--;
        }
    }

    draw() {
        if (this.life <= 0) return;

        const alpha = this.life / this.maxLife;

        // Outer explosion
        ctx.globalAlpha = alpha * 0.6;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.4, '#ff6600');
        gradient.addColorStop(1, '#ff0000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// Building class for the city
class Building {
    constructor(x, width, height, color) {
        this.x = x;
        this.y = canvas.height - height - 20;
        this.width = width;
        this.height = height;
        this.color = color;
        this.health = 100;
        this.windows = [];

        // Generate windows
        for (let i = 0; i < Math.floor(width/15); i++) {
            for (let j = 0; j < Math.floor(height/20); j++) {
                if (Math.random() > 0.3) {
                    this.windows.push({
                        x: this.x + i * 15 + 5,
                        y: this.y + j * 20 + 5,
                        on: Math.random() > 0.6
                    });
                }
            }
        }
    }

    draw() {
        // Building body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Building outline
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Windows
        this.windows.forEach(window => {
            ctx.fillStyle = window.on ? '#ffff99' : '#333';
            ctx.fillRect(window.x, window.y, 8, 12);
        });

        // Health indicator
        if (this.health < 100) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(this.x, this.y, this.width, this.height * (1 - this.health/100));
        }
    }
}

// Function to get URL parameters
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to load and process data from API
async function loadGameData() {
    try {
        console.log('Loading questions and answers from API...');

        currentExamId = getUrlParameter('examenId');
        currentExamName = getUrlParameter('examenNaam');

        if (currentExamName) {
            loadingEl.innerHTML = `
                        <h2>Defensie Systeem voor ${decodeURIComponent(currentExamName)}...</h2>
                        <p>Bedreigingen worden geïdentificeerd...</p>
                    `;
        }

        if (typeof window.getvragen !== 'function' || typeof window.getAntwoorden !== 'function') {
            throw new Error('API functies zijn niet beschikbaar. Controleer client.js');
        }

        let questionsPromise, answersPromise;

        if (currentExamId) {
            questionsPromise = window.getvragen(currentExamId);
            answersPromise = window.getAntwoorden(currentExamId);
        } else {
            questionsPromise = window.getvragen();
            answersPromise = window.getAntwoorden();
        }

        const [questions, answers] = await Promise.all([questionsPromise, answersPromise]);

        if (!Array.isArray(questions) || !Array.isArray(answers)) {
            throw new Error('Ongeldige data ontvangen van API');
        }

        apiQuestions = questions;
        apiAnswers = answers;

        processedQuestions = processApiData(apiQuestions, apiAnswers);

        if (processedQuestions.length === 0) {
            throw new Error('Geen bruikbare vragen gevonden voor dit examen');
        }

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

    for (const question of questions) {
        try {
            if (!question.keuzes || !Array.isArray(question.keuzes) || question.keuzes.length < 2) {
                continue;
            }

            const questionId = question.id;
            const correctAnswerData = answers.find(a => a.vraag_id === questionId);

            if (!correctAnswerData) {
                continue;
            }

            const answerChoices = question.keuzes.map(keuze => ({
                id: keuze.id,
                text: keuze.text || keuze.label || 'Geen tekst'
            }));

            const correctIndex = answerChoices.findIndex(choice =>
                choice.id === correctAnswerData.correct_antwoord_id
            );

            if (correctIndex === -1) {
                continue;
            }

            const questionText = question.vraagtekst || question.text || 'Geen vraagtekst';
            const threatType = question.threat || extractThreatFromQuestion(questionText);

            const processedQuestion = {
                id: questionId,
                question: questionText,
                answers: answerChoices.map(choice => choice.text),
                correct: correctIndex,
                threat: threatType
            };

            processed.push(processedQuestion);

        } catch (error) {
            console.error(`Error processing question ${question.id || 'unknown'}:`, error);
        }
    }

    return processed;
}

function extractThreatFromQuestion(questionText) {
    const threats = {
        'schuld': 'Schulden',
        'eenzaam': 'Eenzaamheid',
        'verslaving': 'Verslaving',
        'geweld': 'Huiselijk Geweld',
        'werkloos': 'Werkloosheid',
        'psychisch': 'Psychische Problemen',
        'depressie': 'Psychische Problemen',
        'angst': 'Psychische Problemen'
    };

    const lowerText = questionText.toLowerCase();
    for (const [keyword, threat] of Object.entries(threats)) {
        if (lowerText.includes(keyword)) {
            return threat;
        }
    }
    return 'Onbekende Bedreiging';
}

function showError(message) {
    loadingEl.innerHTML = `
                <h2>Systeem Fout!</h2>
                <div class="error">${message}</div>
                <button class="btn restart-btn" onclick="location.reload()">Systeem Herstarten</button>
                <button class="btn" onclick="goBackToExams()">Terug naar Basis</button>
            `;
}

function goBackToExams() {
    window.location.href = '../chooseExam/chooseExam.html';
}

// Initialize game
function initGame() {
    if (processedQuestions.length === 0) {
        showError('Geen bedreigingen gedetecteerd');
        return;
    }

    gameState.gameRunning = true;
    gameState.threats = [];
    gameState.explosions = [];

    // Shuffle questions for variety
    shuffleArray(processedQuestions);

    // Create city buildings
    createCity();

    // Start spawning threats
    spawnThreat();

    // Start game loop
    gameLoop();
}

function createCity() {
    gameState.buildings = [];
    const buildingCount = 8;
    const buildingWidth = canvas.width / buildingCount;

    for (let i = 0; i < buildingCount; i++) {
        const height = 60 + Math.random() * 80;
        const colors = ['#34495e', '#2c3e50', '#7f8c8d', '#95a5a6'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        gameState.buildings.push(new Building(
            i * buildingWidth,
            buildingWidth - 5,
            height,
            color
        ));
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function spawnThreat() {
    if (!gameState.gameRunning || gameState.paused) return;

    const question = processedQuestions[Math.floor(Math.random() * processedQuestions.length)];
    const threat = new Threat(
        Math.random() * (canvas.width - 100),
        -50,
        question.threat,
        0.5 + (gameState.level * 0.2)
    );

    threat.question = question;
    gameState.threats.push(threat);

    // Schedule next threat spawn
    const spawnDelay = Math.max(3000 - (gameState.level * 200), 1500);
    setTimeout(() => {
        if (gameState.gameRunning && !gameState.paused) {
            spawnThreat();
        }
    }, spawnDelay);
}

function handleCanvasClick(event) {
    if (!gameState.gameRunning || gameState.currentQuestion || gameState.paused) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Check if clicked on a threat
    for (let threat of gameState.threats) {
        if (threat.alive && threat.isClicked(mouseX, mouseY)) {
            if (gameState.missiles > 0) {
                gameState.missiles--;
                gameState.targetThreat = threat;
                showQuestion(threat.question);
            }
            break;
        }
    }
}

function showQuestion(question) {
    gameState.currentQuestion = question;
    gameState.paused = true; // Pause the game
    gameState.timeLeft = 15;

    // Update threat info
    threatNameEl.textContent = question.threat;
    threatDescriptionEl.textContent = getThreatDescription(question.threat);

    // Show question
    questionEl.textContent = question.question;

    // Create answer buttons
    createAnswerButtons(question);

    // Show panel
    questionPanel.style.display = 'block';

    // Start countdown
    startQuestionTimer();
}

function getThreatDescription(threatType) {
    const descriptions = {
        'Schulden': 'Financiële problemen bedreigen de stabiliteit van gezinnen',
        'Eenzaamheid': 'Sociale isolatie veroorzaakt mentale gezondheidsproblemen',
        'Verslaving': 'Afhankelijkheid vernietigt levens en relaties',
        'Huiselijk Geweld': 'Geweld in de thuissituatie bedreigt de veiligheid',
        'Werkloosheid': 'Gebrek aan werk leidt tot financiële en emotionele stress',
        'Psychische Problemen': 'Mentale gezondheidsissues beïnvloeden het dagelijks leven'
    };
    return descriptions[threatType] || 'Een onbekende bedreiging nadert de stad';
}

function createAnswerButtons(question) {
    answersContainerEl.innerHTML = '';

    question.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.textContent = `${String.fromCharCode(65 + index)}. ${answer}`;
        button.onclick = () => selectAnswer(index, question);
        answersContainerEl.appendChild(button);
    });
}

function startQuestionTimer() {
    const startTime = Date.now();
    const duration = gameState.timeLeft * 1000;

    function updateTimer() {
        if (!gameState.currentQuestion) return;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const percentage = remaining / duration * 100;

        timerFillEl.style.width = percentage + '%';
        gameState.timeLeft = Math.ceil(remaining / 1000);

        if (remaining <= 0) {
            // Time's up - wrong answer
            selectAnswer(-1, gameState.currentQuestion);
        } else {
            requestAnimationFrame(updateTimer);
        }
    }

    updateTimer();
}

function selectAnswer(selectedIndex, question) {
    if (!gameState.currentQuestion) return;

    const isCorrect = selectedIndex === question.correct;

    // Update button styles
    const buttons = answersContainerEl.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
        if (index === question.correct) {
            btn.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });

    // Handle result
    setTimeout(() => {
        if (isCorrect) {
            handleCorrectAnswer();
        } else {
            handleIncorrectAnswer();
        }

        // Close question panel
        questionPanel.style.display = 'none';
        gameState.currentQuestion = null;
        gameState.paused = false; // Resume the game
        gameState.targetThreat = null;

    }, 1500);
}

function handleCorrectAnswer() {
    gameState.score += 150 * gameState.level;
    gameState.threatsDestroyed++;

    // Destroy the target threat
    if (gameState.targetThreat && gameState.targetThreat.alive) {
        gameState.targetThreat.alive = false;

        // Create explosion at threat location
        gameState.explosions.push(new Explosion(
            gameState.targetThreat.x + gameState.targetThreat.width/2,
            gameState.targetThreat.y + gameState.targetThreat.height/2,
            60
        ));
    }

    // Bonus missile
    gameState.missiles = Math.min(gameState.missiles + 2, 15);

    showFeedback(`🎯 Bedreiging Geneutraliseerd! +${150 * gameState.level} punten`, true);

    // Level up check
    if (gameState.threatsDestroyed > 0 && gameState.threatsDestroyed % 5 === 0) {
        gameState.level++;
        gameState.missiles += 5;
        showFeedback(`⭐ Level ${gameState.level}! Nieuwe wapens beschikbaar!`, true);
    }
}

function handleIncorrectAnswer() {
    showFeedback("❌ Ineffectieve Interceptie! Bedreiging blijft actief!", false);
    gameState.targetThreat = null;

    // No missile refund for wrong answers
}

function showFeedback(message, isCorrect) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${isCorrect ? 'correct' : 'incorrect'} show`;

    setTimeout(() => {
        feedbackEl.classList.remove('show');
    }, 2500);
}

function endGame() {
    gameState.gameRunning = false;
    finalScoreEl.textContent = gameState.score;
    threatsDestroyedEl.textContent = gameState.threatsDestroyed;
    finalCityHealthEl.textContent = Math.max(0, Math.round(gameState.cityHealth));

    // Update game over title based on performance
    const gameOverTitle = gameOverEl.querySelector('h2');
    if (gameState.cityHealth > 60) {
        gameOverTitle.textContent = '🏆 Stad Verdedigd!';
        gameOverTitle.style.color = '#27ae60';
    } else if (gameState.cityHealth > 20) {
        gameOverTitle.textContent = '⚠️ Gedeeltelijk Succes';
        gameOverTitle.style.color = '#f39c12';
    } else {
        gameOverTitle.textContent = '💥 Stad Verwoest!';
        gameOverTitle.style.color = '#e74c3c';
    }

    gameOverEl.style.display = 'flex';
}

function draw() {
    // Clear canvas with night sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0c1445');
    gradient.addColorStop(0.7, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
        const x = (i * 47) % canvas.width;
        const y = (i * 31) % (canvas.height * 0.6);
        const brightness = Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5;
        ctx.globalAlpha = brightness * 0.8;
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Draw ground
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Draw city buildings
    gameState.buildings.forEach(building => building.draw());

    // Draw radar sweep effect
    const time = Date.now() * 0.002;
    const sweepAngle = time % (Math.PI * 2);
    ctx.save();
    ctx.translate(50, canvas.height - 50);

    // Radar base
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Radar sweep
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweepAngle) * 80, Math.sin(sweepAngle) * 80);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;

    // Draw threats
    gameState.threats.forEach(threat => {
        if (threat.alive) {
            threat.draw();
        }
    });

    // Draw explosions
    gameState.explosions.forEach(explosion => explosion.draw());

    // Draw crosshair target if aiming at threat
    if (gameState.targetThreat && gameState.targetThreat.alive) {
        const threat = gameState.targetThreat;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            threat.x - 5,
            threat.y - 5,
            threat.width + 10,
            threat.height + 10
        );
        ctx.setLineDash([]);
    }

    // Draw pause indicator when game is paused
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸️ GEPAUZEERD', canvas.width/2, 50);
        ctx.fillText('Beantwoord de vraag om verder te gaan', canvas.width/2, 80);
    }

    // Draw missiles indicator
    for (let i = 0; i < gameState.missiles; i++) {
        const x = canvas.width - 30;
        const y = 30 + (i * 15);

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(x, y, 20, 4);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 16, y - 1, 4, 6);
    }
}

function update() {
    if (!gameState.gameRunning) return;

    // Only update threats and explosions if not paused
    if (!gameState.paused) {
        // Update threats
        gameState.threats.forEach(threat => threat.update());
    }

    // Always update explosions (they should continue even when paused)
    gameState.explosions = gameState.explosions.filter(explosion => {
        explosion.update();
        return explosion.life > 0;
    });

    // Clean up dead threats (only when not paused)
    if (!gameState.paused) {
        gameState.threats = gameState.threats.filter(threat => threat.alive || threat.y < canvas.height + 100);
    }

    // Check for game over conditions (only when not paused)
    if (!gameState.paused && gameState.missiles <= 0 && gameState.threats.filter(t => t.alive).length === 0) {
        // Out of missiles and no more threats - wait a bit then end
        setTimeout(() => {
            if (gameState.threats.filter(t => t.alive).length === 0) {
                endGame();
            }
        }, 2000);
    }

    updateUI();
}

function updateUI() {
    scoreEl.textContent = gameState.score;
    livesEl.textContent = gameState.lives;
    levelEl.textContent = gameState.level;
    cityHealthEl.textContent = `${Math.max(0, Math.round(gameState.cityHealth))}%`;
    missilesEl.textContent = gameState.missiles;
}

function gameLoop() {
    if (!gameState.gameRunning) return;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

// Mouse tracking for crosshair
function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = event.clientX - rect.left;
    gameState.mouse.y = event.clientY - rect.top;

    // Update crosshair position
    crosshairEl.style.left = (event.clientX - 15) + 'px';
    crosshairEl.style.top = (event.clientY - 15) + 'px';
}

function restartGame() {
    gameState = {
        score: 0,
        lives: 3,
        level: 1,
        cityHealth: 100,
        missiles: 10,
        gameRunning: false,
        paused: false,
        threats: [],
        explosions: [],
        buildings: [],
        currentQuestion: null,
        questionTimeout: null,
        timeLeft: 15,
        threatsDestroyed: 0,
        mouse: { x: 0, y: 0 },
        targetThreat: null
    };

    gameOverEl.style.display = 'none';
    questionPanel.style.display = 'none';
    feedbackEl.classList.remove('show');

    initGame();
}

// Event listeners
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', updateMousePosition);

// Show crosshair only when hovering over canvas
canvas.addEventListener('mouseenter', () => {
    crosshairEl.style.display = 'block';
});

canvas.addEventListener('mouseleave', () => {
    crosshairEl.style.display = 'none';
});

// Make functions globally available
window.restartGame = restartGame;
window.goBackToExams = goBackToExams;

// Start loading data when page loads
window.addEventListener('load', () => {
    loadGameData();
});