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

    //Categorie-klassen voor opmaak
    // TODO: SW Specifiek
    const categorieën = {
        'wiskunde': 'wiskunde',
        'nederlands': 'talen',
        'engels': 'talen',
        'natuurkunde': 'natuur',
        'scheikunde': 'natuur',
        'biologie': 'natuur',
        'geschiedenis': 'maatschappij',
        'aardrijkskunde': 'maatschappij'
    };

    const categorieClass = categorieën[examen.categorie] || 'algemeen';
    card.className = `exam-card exam-${categorieClass}`;

    //TODO: fix quiz path
    card.innerHTML = `
                <div class="exam-header">
                    <h3 class="exam-title">${examen.naam}</h3>
                </div>
                <div class="exam-body">
                    <p class="exam-info">${examen.beschrijving || 'Onkbekende beschrijving'}</p>
                    <div class="exam-details">
                        <span>${examen.aantalVragen || 'Onbekend hoeveel'} vragen</span>
                        <span>${examen.niveau || 'Onbekend'}</span>
                    </div>
                    <div class="exam-actions">
                        <a href="../quiz/quiz.html" class="quiz-button">Start Quiz</a>
                        <button class="view-questions-button" data-examen-id="${examen.id}">Bekijk vragen</button>
                    </div>
                </div>
            `;

    // Voeg klikgebeurtenis toe voor het bekijken van vragen
    const viewQuestionsButton = card.querySelector('.view-questions-button');
    viewQuestionsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Voorkom dat de examenkart ook wordt geactiveerd
        loadExam(examen);
    });

    // Voeg klikgebeurtenis toe voor de hele kaart
    card.addEventListener('click', () => {
        loadExam(examen);
    });

    return card;
}

// Laad een examen en toon de vragen
async function loadExam(examen) {
    try {
        // Toon laadindicator
        document.getElementById('exams-container').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').textContent = `Vragen laden voor ${examen.naam}...`;

        // Haal vragen en antwoorden op met functies uit client.js
        const vragen = await getvragen();
        const antwoorden = await getAntwoorden();

        // Verberg laadindicator
        document.getElementById('loading').style.display = 'none';

        // Toon terugknop en quiz knop
        const vragenContainer = document.getElementById('vragen-container');
        vragenContainer.innerHTML = `
                    <button class="back-button" onclick="showExams()">← Terug naar examens</button>
                    <a href="../../quiz/quiz.html?examenId=${examen.id}" class="quiz-button" style="display: inline-block; margin-bottom: 20px;">Start Quiz voor ${examen.naam}</a>
                    <h2>${examen.naam}</h2>
                    <p>${examen.beschrijving || ''}</p>
                `;

        // Filter vragen voor dit examen (als er een examenID veld is)
        let examenvragen = vragen;
        if (examen.id) {
            examenvragen = vragen.filter(vraag => vraag.examenID === examen.id);
        }

        if (examenvragen.length === 0) {
            vragenContainer.innerHTML += '<p>Geen vragen gevonden voor dit examen.</p>';
        } else {
            // Toon vragen
            examenvragen.forEach((vraag, index) => {
                const vraagElement = createVraagElement(vraag, index, antwoorden);
                vragenContainer.appendChild(vraagElement);
            });
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
    const escapedVraagText = vraag.text ? vraag.text.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';

    vraagDiv.innerHTML = `
                <div class="vraag-nummer">Vraag ${index + 1}</div>
                <div class="vraag-text">${vraag.text || 'Geen vraagtekst'}</div>
                <button class="ai-help-button" onclick="getAIHelp('${escapedVraagText}')">AI Uitleg vragen</button>
                <div class="ai-uitleg" id="ai-uitleg-${vraag.id || index}"></div>
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
                        <span class="antwoord-label">${antwoord.letter || ''}:</span> ${antwoord.text || ''}
                    `;
            antwoordenDiv.appendChild(antwoordDiv);
        });

        vraagDiv.appendChild(antwoordenDiv);
    }

    return vraagDiv;
}

// Toon AI uitleg (gebruikt de functie uit client.js)
function toonAIUitleg(uitleg, vraag) {
    // Maak een tijdelijke ID voor de vraag
    const vraagId = vraag.replace(/\s+/g, '-').toLowerCase();

    // Zoek of er al een uitleg element bestaat voor deze vraag
    let uitlegDiv = document.getElementById(`ai-uitleg-${vraagId}`);

    // Als het niet bestaat, maak een nieuwe
    if (!uitlegDiv) {
        uitlegDiv = document.createElement('div');
        uitlegDiv.className = 'ai-uitleg';
        uitlegDiv.id = `ai-uitleg-${vraagId}`;

        // Voeg de uitleg toe aan de pagina
        document.getElementById('vragen-container').appendChild(uitlegDiv);
    }

    uitlegDiv.innerHTML = `<strong>AI Uitleg voor: "${vraag}"</strong><br>${uitleg}`;
    uitlegDiv.style.display = 'block';

    // Scroll naar de uitleg
    uitlegDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Toon foutmelding (gebruikt de functie uit client.js)
function toonFout(bericht) {
    showError(bericht);
}

// Toon examens opnieuw
function showExams() {
    document.getElementById('vragen-container').style.display = 'none';
    document.getElementById('exams-container').style.display = 'grid';
}

// Toon foutmelding
function showError(bericht) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = bericht;
    errorDiv.style.display = 'block';

    // Verberg de foutmelding na 5 seconden
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Maak functies globaal beschikbaar
window.showExams = showExams;
window.toonAIUitleg = toonAIUitleg;
window.toonFout = toonFout;