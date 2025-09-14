document.addEventListener('DOMContentLoaded', async function() {
    // Controleer of client.js correct geladen is
    if (typeof getExams !== 'function') {
        showError('Fout: client.js is niet correct geladen. Controleer het pad naar client.js.');
        document.getElementById('loading').style.display = 'none';
        return;
    }

    try {
        // Haal examens op met de functie uit client.js
        const examens = await getExams();

        // Verberg laadindicator
        document.getElementById('loading').style.display = 'none';

        if (examens && examens.length > 0) {
            // Toon examens
            const examsContainer = document.getElementById('exams-container');
            examsContainer.style.display = 'grid';

            // Render examens
            examens.forEach(examen => {
                const examCard = createExamCard(examen);
                examsContainer.appendChild(examCard);
            });
        } else {
            showError('Geen examens gevonden');
        }
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showError('Fout bij het laden van examens: ' + error.message);
    }
});

// Maak een examencijferkaart aan
function createExamCard(examen) {
    const card = document.createElement('div');

    // Categorie-klassen voor opmaak
    const categorieën = {
        'methodiek': 'methodiek',
        'recht': 'recht',
        'psychologie': 'psychologie',
        'sociologie': 'sociologie',
        'agogiek': 'agogiek',
        'communicatie': 'communicatie',
        'onderzoek': 'onderzoek',
        'beleid': 'beleid',
        'zorg': 'zorg',
        'jeugd': 'jeugd',
        'welzijn': 'welzijn',
        'diversiteit': 'diversiteit'
    };

    const categorieClass = categorieën[examen.categorie] || 'algemeen';
    card.className = `exam-card exam-${categorieClass}`;

    // Maak quiz URL met parameters
    const quizUrl = `../quiz/quiz.html?examenId=${examen.id}&examenNaam=${encodeURIComponent(examen.name)}`;

    card.innerHTML = `
        <div class="exam-header">
            <h3 class="exam-title">${examen.name}</h3>
        </div>
        <div class="exam-body">
            <p class="exam-info">${examen.beschrijving || 'Test je kennis over dit onderwerp'}</p>
            <div class="exam-details">
                <span>${examen.aantalVragen || 'Onbekend aantal'} vragen</span>
                <span>${examen.niveau || 'Alle niveaus'}</span>
            </div>
            <div class="exam-actions">
                <a href="${quizUrl}" class="quiz-button">Start Quiz</a>
                <button class="view-questions-button" data-examen-id="${examen.id}">Bekijk Vragen</button>
            </div>
        </div>
    `;

    // Voeg klikgebeurtenis toe voor het bekijken van vragen
    const viewQuestionsButton = card.querySelector('.view-questions-button');
    viewQuestionsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loadExam(examen);
    });

    // Voeg klikgebeurtenis toe voor de hele kaart (ook start quiz)
    card.addEventListener('click', (e) => {
        // Voorkom dat klik op buttons ook de card trigger
        if (e.target.classList.contains('view-questions-button') ||
            e.target.classList.contains('quiz-button')) {
            return;
        }

        // Redirect naar quiz
        window.location.href = quizUrl;
    });

    return card;
}

// Laad een examen en toon de vragen
async function loadExam(examen) {
    try {
        // Toon laadindicator
        document.getElementById('exams-container').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').textContent = `Vragen laden voor ${examen.name}...`;

        // Haal vragen en antwoorden op met functies uit client.js
        const vragen = await getvragen(examen.id);
        const antwoorden = await getAntwoorden();

        // Verberg laadindicator
        document.getElementById('loading').style.display = 'none';

        // Maak quiz URL met parameters
        const quizUrl = `../quiz/quiz.html?examenId=${examen.id}&examenNaam=${encodeURIComponent(examen.name)}`;

        // Toon terugknop en quiz knop
        const vragenContainer = document.getElementById('vragen-container');
        vragenContainer.innerHTML = `
            <div class="exam-header-section">
                <button class="back-button" onclick="showExams()">← Terug naar examens</button>
                <a href="${quizUrl}" class="quiz-button-large">🎯 Start Quiz: ${examen.name}</a>
            </div>
            <div class="exam-info-section">
                <h2>${examen.name}</h2>
                <p class="exam-description">${examen.beschrijving || 'Bekijk alle vragen voor dit examen'}</p>
                <div class="exam-stats">
                    <span class="stat">📊 ${vragen.length} vragen</span>
                    <span class="stat">⏱️ Geschatte tijd: ${Math.ceil(vragen.length * 1.5)} minuten</span>
                </div>
            </div>
        `;

        // Filter vragen voor dit examen indien nodig
        let examenvragen = vragen;
        if (examen.id && vragen.some(v => v.examenID)) {
            examenvragen = vragen.filter(vraag => vraag.examenID === examen.id);
        }

        if (examenvragen.length === 0) {
            vragenContainer.innerHTML += '<div class="no-questions">Geen vragen gevonden voor dit examen.</div>';
        } else {
            // Toon vragen
            const vragenList = document.createElement('div');
            vragenList.className = 'vragen-list';

            examenvragen.forEach((vraag, index) => {
                const vraagElement = createVraagElement(vraag, index, antwoorden);
                vragenList.appendChild(vraagElement);
            });

            vragenContainer.appendChild(vragenList);
        }

        // Toon vragencontainer
        vragenContainer.style.display = 'block';

    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showError('Fout bij het laden van vragen: ' + error.message);
    }
}

// Maak een vraag element aan
function createVraagElement(vraag, index, antwoorden) {
    const vraagDiv = document.createElement('div');
    vraagDiv.className = 'vraag-card';

    // Escape speciale tekens in de vraagtekst voor gebruik in een string
    const escapedVraagText = vraag.text ? vraag.text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ') : '';

    vraagDiv.innerHTML = `
        <div class="vraag-header">
            <div class="vraag-nummer">Vraag ${index + 1}</div>
            <button class="ai-help-button" onclick="getAIHelpForQuestion('${escapedVraagText}', ${vraag.id || index})">
                🤖 AI Uitleg
            </button>
        </div>
        <div class="vraag-text">${vraag.text || 'Geen vraagtekst'}</div>
        <div class="ai-uitleg" id="ai-uitleg-${vraag.id || index}" style="display: none;"></div>
    `;

    // Voeg antwoorden toe
    const vraagAntwoorden = antwoorden.filter(antwoord => antwoord.vraagID === vraag.id);
    if (vraagAntwoorden.length > 0) {
        const antwoordenDiv = document.createElement('div');
        antwoordenDiv.className = 'antwoorden-lijst';

        vraagAntwoorden.forEach(antwoord => {
            const antwoordDiv = document.createElement('div');
            antwoordDiv.className = `antwoord-item ${antwoord.isCorrect ? 'antwoord-correct' : ''}`;
            antwoordDiv.innerHTML = `
                <span class="antwoord-label">${antwoord.letter || '•'}:</span> 
                <span class="antwoord-text">${antwoord.text || ''}</span>
                ${antwoord.isCorrect ? '<span class="correct-indicator">✓</span>' : ''}
            `;
            antwoordenDiv.appendChild(antwoordDiv);
        });

        vraagDiv.appendChild(antwoordenDiv);
    }

    return vraagDiv;
}

// Aangepaste functie voor AI help in question preview
async function getAIHelpForQuestion(vraagText, vraagId) {
    const button = event.target;
    const uitlegDiv = document.getElementById(`ai-uitleg-${vraagId}`);

    // Toggle als al zichtbaar
    if (uitlegDiv.style.display === 'block') {
        uitlegDiv.style.display = 'none';
        button.textContent = '🤖 AI Uitleg';
        return;
    }

    // Toon loading
    button.textContent = '⏳ Laden...';
    button.disabled = true;

    try {
        const response = await getAIHelp(vraagText);
        uitlegDiv.innerHTML = `
            <div class="ai-uitleg-content">
                <strong>AI Uitleg:</strong><br>
                ${response.uitleg || response}
            </div>
        `;
        uitlegDiv.style.display = 'block';
        button.textContent = '❌ Verberg Uitleg';
    } catch (error) {
        console.error('Fout bij AI hulp:', error);
        uitlegDiv.innerHTML = `<div class="error-message">Kon geen AI-uitleg ophalen: ${error.message}</div>`;
        uitlegDiv.style.display = 'block';
        button.textContent = '🤖 AI Uitleg';
    } finally {
        button.disabled = false;
    }
}

// Toon AI uitleg (gebruikt de functie uit client.js)
function toonAIUitleg(uitleg, vraag) {
    // Dit wordt nu afgehandeld door getAIHelpForQuestion
    console.log('AI Uitleg ontvangen:', uitleg);
}

// Toon foutmelding (gebruikt de functie uit client.js)
function toonFout(bericht) {
    showError(bericht);
}

// Toon examens opnieuw
function showExams() {
    document.getElementById('vragen-container').style.display = 'none';
    document.getElementById('exams-container').style.display = 'grid';

    // Reset header
    document.querySelector('header h1').textContent = 'Oefen Examen selectie';
    document.querySelector('header p').textContent = 'Kies een examen om te oefenen';
}

// Toon foutmelding
function showError(bericht) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = bericht;
    errorDiv.style.display = 'block';

    // Verberg de foutmelding na 8 seconden
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 8000);
}

// Maak functies globaal beschikbaar
window.showExams = showExams;
window.toonAIUitleg = toonAIUitleg;
window.toonFout = toonFout;
window.getAIHelpForQuestion = getAIHelpForQuestion;