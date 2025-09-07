// API functie die gebruik maakt van de bestaande getvragen() functie
async function getVragen() {
    try {
        // Roep de bestaande getvragen() functie aan vanuit client.js
        const response = await window.getvragen();
        return response;
    } catch (error) {
        console.error('Fout bij het ophalen van vragen:', error);
        throw new Error('Kon vragen niet ophalen');
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const quizContent = document.getElementById('quiz-content');
    const vorigeKnop = document.getElementById('vorige-knop');
    const volgendeKnop = document.getElementById('volgende-knop');
    const indienenKnop = document.getElementById('indienen-knop');
    const scoreElement = document.getElementById('score');
    const voortgang = document.getElementById('voortgang');
    const resultatenContainer = document.getElementById('resultaten');
    const aiHelpKnop = document.getElementById('ai-help-knop');
    const aiUitlegContainer = document.getElementById('ai-uitleg');

    let vragen = [];
    let huidigeVraagIndex = 0;
    let antwoorden = {};
    let score = 0;
    let aiHelpBeschikbaar = false;

    // Toon laadstatus
    quizContent.innerHTML = '<div class="loading">Vragen laden...</div>';

    try {
        // Vragen ophalen van de API
        vragen = await getVragen();

        // Verwijder lege antwoordopties
        vragen.forEach(vraag => {
            vraag.keuzes = vraag.keuzes.filter(keuze => keuze.text.trim() !== '');
        });

        // Initialiseer antwoorden object
        vragen.forEach(vraag => {
            antwoorden[vraag.id] = null;
        });

        // Toon de eerste vraag
        toonVraag(huidigeVraagIndex);

        // Update voortgangsbalk
        updateVoortgang();

        // AI hulp beschikbaar maken
        aiHelpKnop.disabled = false;
        aiHelpBeschikbaar = true;
    } catch (error) {
        console.error('Fout bij het ophalen van vragen:', error);
        quizContent.innerHTML = '<div class="foutmelding">Er is een fout opgetreden bij het laden van de vragen. Probeer het later opnieuw.</div>';
    }

    // Event listener voor AI hulp knop
    aiHelpKnop.addEventListener('click', function() {
        if (!aiHelpBeschikbaar) return;

        const huidigeVraag = vragen[huidigeVraagIndex];
        vraagAIOmHulp(huidigeVraag.vraagtekst);
    });

    // Functie om AI hulp aan te vragen
    async function vraagAIOmHulp(vraagtekst) {
        aiHelpKnop.disabled = true;
        aiHelpKnop.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="spinner">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3zm4.5-1.5c.653 0 1.272-.139 1.833-.389l.238.389H13V8.5h-1v.722l-.45-.166c-.326-.12-.674-.166-1.05-.166C9.672 8.89 9 9.562 9 10.5c0 .688.525 1.219 1.25 1.219.443 0 .834-.172 1.166-.453.12.327.334.583.584.833.5.5 1.166.75 2 .75h1v-1h-1c-.446 0-.833-.167-1.167-.5-.333-.333-.5-.72-.5-1.167 0-.448.167-.834.5-1.167.334-.333.721-.5 1.167-.5.446 0 .833.167 1.167.5.333.333.5.72.5 1.167h1c0-.833-.292-1.542-.875-2.125-.583-.583-1.292-.875-2.125-.875-.833 0-1.542.292-2.125.875-.583.583-.875 1.292-.875 2.125 0 .833.292 1.542.875 2.125.583.583 1.292.875 2.125.875h1v1h-1c-1.1 0-2.042-.392-2.825-1.175C8.392 12.042 8 11.1 8 10.5c0-1.1.392-2.042 1.175-2.825C9.958 6.892 10.9 6.5 12 6.5v1c-.75 0-1.396.26-1.938.781-.542.522-.812 1.167-.812 1.938 0 .77.27 1.416.812 1.938.542.521 1.188.781 1.938.781h1v1h-1c-1.25 0-2.313-.438-3.188-1.313C8.438 12.813 8 11.75 8 10.5c0-1.25.438-2.313 1.313-3.188C10.188 6.438 11.25 6 12.5 6v1c-1 0-1.854.354-2.562 1.063C9.229 8.77 8.875 9.624 8.875 10.625h1.25c0-.5.177-.927.531-1.281.354-.354.781-.531 1.281-.531.5 0 .927.177 1.281.531.354.354.531.781.531 1.281 0 .5-.177.927-.531 1.281-.354.354-.781.531-1.281.531h-1v1h1c.75 0 1.385-.26 1.906-.781.521-.522.781-1.156.781-1.906 0-.75-.26-1.385-.781-1.906-.521-.521-1.156-.781-1.906-.781-1.4 0-2.6.5-3.6 1.5-.5.5-.9 1.1-1.2 1.8-.1.3-.2.6-.2.9 0 .3.1.6.2.9.3.7.7 1.3 1.2 1.8.5.5 1.1.9 1.8 1.2.3.1.6.2.9.2h1v1h-1c-1.1 0-2.1-.4-2.9-1.1-.8-.7-1.3-1.6-1.6-2.6-.1-.4-.2-.8-.2-1.3 0-.5.1-.9.2-1.3.3-1 .8-1.9 1.6-2.6.8-.7 1.7-1.1 2.9-1.1 1.2 0 2.2.4 3 1.2.8.8 1.2 1.8 1.2 3 0 .4-.1.8-.2 1.2-.1.4-.3.8-.5 1.1-.2.3-.5.6-.8.8-.3.2-.7.4-1.1.5-.4.1-.8.2-1.2.2-.4 0-.8-.1-1.2-.2-.4-.1-.8-.3-1.1-.5-.3-.2-.6-.5-.8-.8-.2-.3-.4-.7-.5-1.1-.1-.4-.2-.8-.2-1.2h1c0 .3.1.6.2.9.1.3.3.6.5.8.2.2.5.4.8.5.3.1.6.2.9.2.3 0 .6-.1.9-.2.3-.1.6-.3.8-.5.2-.2.4-.5.5-.8.1-.3.2-.6.2-.9 0-.3-.1-.6-.2-.9-.1-.3-.3-.6-.5-.8-.2-.2-.5-.4-.8-.5-.3-.1-.6-.2-.9-.2-.3 0-.6.1-.9.2-.3.1-.6.3-.8.5-.2.2-.4.5-.5.8-.1.3-.2.6-.2.9z"/>
                    </svg>
                    Bezig...
                `;

        try {
            // Roep de AI help functie aan
            const aiUitleg = await window.getAIHelp(vraagtekst);

            // Toon de AI uitleg
            toonAIUitleg(aiUitleg, vraagtekst);
        } catch (error) {
            console.error('Fout bij AI hulp:', error);
            aiUitlegContainer.innerHTML = `
                        <div class="foutmelding">
                            Er is een fout opgetreden bij het ophalen van AI hulp: ${error.message}
                        </div>
                    `;
        } finally {
            aiHelpKnop.disabled = false;
            aiHelpKnop.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3zm4.5-1.5c.653 0 1.272-.139 1.833-.389l.238.389H13V8.5h-1v.722l-.45-.166c-.326-.12-.674-.166-1.05-.166C9.672 8.89 9 9.562 9 10.5c0 .688.525 1.219 1.25 1.219.443 0 .834-.172 1.166-.453.12.327.334.583.584.833.5.5 1.166.75 2 .75h1v-1h-1c-.446 0-.833-.167-1.167-.5-.333-.333-.5-.72-.5-1.167 0-.448.167-.834.5-1.167.334-.333.721-.5 1.167-.5.446 0 .833.167 1.167.5.333.333.5.72.5 1.167h1c0-.833-.292-1.542-.875-2.125-.583-.583-1.292-.875-2.125-.875-.833 0-1.542.292-2.125.875-.583.583-.875 1.292-.875 2.125 0 .833.292 1.542.875 2.125.583.583 1.292.875 2.125.875h1v1h-1c-1.1 0-2.042-.392-2.825-1.175C8.392 12.042 8 11.1 8 10.5c0-1.1.392-2.042 1.175-2.825C9.958 6.892 10.9 6.5 12 6.5v1c-.75 0-1.396.26-1.938.781-.542.522-.812 1.167-.812 1.938 0 .77.27 1.416.812 1.938.542.521 1.188.781 1.938.781h1v1h-1c-1.25 0-2.313-.438-3.188-1.313C8.438 12.813 8 11.75 8 10.5c0-1.25.438-2.313 1.313-3.188C10.188 6.438 11.25 6 12.5 6v1c-1 0-1.854.354-2.562 1.063C9.229 8.77 8.875 9.624 8.875 10.625h1.25c0-.5.177-.927.531-1.281.354-.354.781-.531 1.281-.531.5 0 .927.177 1.281.531.354.354.531.781.531 1.281 0 .5-.177.927-.531 1.281-.354.354-.781.531-1.281.531h-1v1h1c.75 0 1.385-.26 1.906-.781.521-.522.781-1.156.781-1.906 0-.75-.26-1.385-.781-1.906-.521-.521-1.156-.781-1.906-.781-1.4 0-2.6.5-3.6 1.5-.5.5-.9 1.1-1.2 1.8-.1.3-.2.6-.2.9 0 .3.1.6.2.9.3.7.7 1.3 1.2 1.8.5.5 1.1.9 1.8 1.2.3.1.6.2.9.2h1v1h-1c-1.1 0-2.1-.4-2.9-1.1-.8-.7-1.3-1.6-1.6-2.6-.1-.4-.2-.8-.2-1.3 0-.5.1-.9.2-1.3.3-1 .8-1.9 1.6-2.6.8-.7 1.7-1.1 2.9-1.1 1.2 0 2.2.4 3 1.2.8.8 1.2 1.8 1.2 3 0 .4-.1.8-.2 1.2-.1.4-.3.8-.5 1.1-.2.3-.5.6-.8.8-.3.2-.7.4-1.1.5-.4.1-.8.2-1.2.2-.4 0-.8-.1-1.2-.2-.4-.1-.8-.3-1.1-.5-.3-.2-.6-.5-.8-.8-.2-.3-.4-.7-.5-1.1-.1-.4-.2-.8-.2-1.2h1c0 .3.1.6.2.9.1.3.3.6.5.8.2.2.5.4.8.5.3.1.6.2.9.2.3 0 .6-.1.9-.2.3-.1.6-.3.8-.5.2-.2.4-.5.5-.8.1-.3.2-.6.2-.9 0-.3-.1-.6-.2-.9-.1-.3-.3-.6-.5-.8-.2-.2-.5-.4-.8-.5-.3-.1-.6-.2-.9-.2-.3 0-.6.1-.9.2-.3.1-.6.3-.8.5-.2.2-.4.5-.5.8-.1.3-.2.6-.2.9z"/>
                        </svg>
                        AI Hulp
                    `;
        }
    }

    // Functie om AI uitleg weer te geven
    function toonAIUitleg(aiUitleg, vraagtekst) {
        aiUitlegContainer.innerHTML = `
                    <div class="ai-uitleg-container">
                        <div class="ai-uitleg-titel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3zm4.5-1.5c.653 0 1.272-.139 1.833-.389l.238.389H13V8.5h-1v.722l-.45-.166c-.326-.12-.674-.166-1.05-.166C9.672 8.89 9 9.562 9 10.5c0 .688.525 1.219 1.25 1.219.443 0 .834-.172 1.166-.453.12.327.334.583.584.833.5.5 1.166.75 2 .75h1v-1h-1c-.446 0-.833-.167-1.167-.5-.333-.333-.5-.72-.5-1.167 0-.448.167-.834.5-1.167.334-.333.721-.5 1.167-.5.446 0 .833.167 1.167.5.333.333.5.72.5 1.167h1c0-.833-.292-1.542-.875-2.125-.583-.583-1.292-.875-2.125-.875-.833 0-1.542.292-2.125.875-.583.583-.875 1.292-.875 2.125 0 .833.292 1.542.875 2.125.583.583 1.292.875 2.125.875h1v1h-1c-1.1 0-2.042-.392-2.825-1.175C8.392 12.042 8 11.1 8 10.5c0-1.1.392-2.042 1.175-2.825C9.958 6.892 10.9 6.5 12 6.5v1c-.75 0-1.396.26-1.938.781-.542.522-.812 1.167-.812 1.938 0 .77.27 1.416.812 1.938.542.521 1.188.781 1.938.781h1v1h-1c-1.25 0-2.313-.438-3.188-1.313C8.438 12.813 8 11.75 8 10.5c0-1.25.438-2.313 1.313-3.188C10.188 6.438 11.25 6 12.5 6v1c-1 0-1.854.354-2.562 1.063C9.229 8.77 8.875 9.624 8.875 10.625h1.25c0-.5.177-.927.531-1.281.354-.354.781-.531 1.281-.531.5 0 .927.177 1.281.531.354.354.531.781.531 1.281 0 .5-.177.927-.531 1.281-.354.354-.781.531-1.281.531h-1v1h1c.75 0 1.385-.26 1.906-.781.521-.522.781-1.156.781-1.906 0-.75-.26-1.385-.781-1.906-.521-.521-1.156-.781-1.906-.781-1.4 0-2.6.5-3.6 1.5-.5.5-.9 1.1-1.2 1.8-.1.3-.2.6-.2.9 0 .3.1.6.2.9.3.7.7 1.3 1.2 1.8.5.5 1.1.9 1.8 1.2.3.1.6.2.9.2h1v1h-1c-1.1 0-2.1-.4-2.9-1.1-.8-.7-1.3-1.6-1.6-2.6-.1-.4-.2-.8-.2-1.3 0-.5.1-.9.2-1.3.3-1 .8-1.9 1.6-2.6.8-.7 1.7-1.1 2.9-1.1 1.2 0 2.2.4 3 1.2.8.8 1.2 1.8 1.2 3 0 .4-.1.8-.2 1.2-.1.4-.3.8-.5 1.1-.2.3-.5.6-.8.8-.3.2-.7.4-1.1.5-.4.1-.8.2-1.2.2-.4 0-.8-.1-1.2-.2-.4-.1-.8-.3-1.1-.5-.3-.2-.6-.5-.8-.8-.2-.3-.4-.7-.5-1.1-.1-.4-.2-.8-.2-1.2h1c0 .3.1.6.2.9.1.3.3.6.5.8.2.2.极速5.4.8.5.3.1.6.2.9.2.3 0 .6-.1.9-.2.3-.1.6-.3.8-.5.2-.2.4-.5.极速5-.8.1-.3.2-.6.2-.9 0-.3-.1-.6-.2-.9-.1-.3-.3-.6-.5-.8-.2-.2-.5-.4-.8-.5-.3-.1-.6-.2-.9-.2-.3 0-.6.1-.9.2-.3.1-.6.3-.8.5-.2.2-.4.5-.5.8-.1.3-.2.6-.2.9z"/>
                            </svg>
                            AI Uitleg bij de vraag
                        </div>
                        <div class="ai-uitleg">
                            ${aiUitleg.uitleg || aiUitleg}
                        </div>
                    </div>
                `;
    }

    // [De rest van de functies blijft hetzelfde]
    // Toon de huidige vraag
    function toonVraag(index) {
        const vraag = vragen[index];

        let keuzesHTML = '';
        vraag.keuzes.forEach(keuze => {
            const isGeselecteerd = antwoorden[vraag.id] === keuze.id ? 'geselecteerd' : '';
            keuzesHTML += `
                        <div class="keuze ${isGeselecteerd}" data-keuze-id="${keuze.id}">
                            ${keuze.text}
                        </div>
                    `;
        });

        quizContent.innerHTML = `
                    <div class="vraag-container">
                        <div class="vraag-nummer">Vraag ${index + 1} van ${vragen.length}</div>
                        <div class="vraagtekst">${vraag.vraagtekst}</div>
                        <div class="keuzes-container">
                            ${keuzesHTML}
                        </div>
                    </div>
                `;

        // Wis AI uitleg wanneer naar een nieuwe vraag gaat
        aiUitlegContainer.innerHTML = '';

        // Voeg event listeners toe aan keuzes
        document.querySelectorAll('.keuze').forEach(keuzeElement => {
            keuzeElement.addEventListener('click', function() {
                const keuzeId = this.getAttribute('data-keuze-id');
                antwoorden[vraag.id] = keuzeId;

                // Update weergave van geselecteerde keuze
                document.querySelectorAll('.keuze').forEach(k => {
                    k.classList.remove('geselecteerd');
                });
                this.classList.add('geselecteerd');
            });
        });

        // Update knoppen
        vorigeKnop.style.display = index === 0 ? 'none' : 'block';
        volgendeKnop.style.display = index === vragen.length - 1 ? 'none' : 'block';
        indienenKnop.style.display = index === vragen.length - 1 ? 'block' : 'none';
    }

    // Update de voortgangsbalk
    function updateVoortgang() {
        const beantwoord = Object.values(antwoorden).filter(a => a !== null).length;
        const percentage = (beantwoord / vragen.length) * 100;
        voortgang.style.width = `${percentage}%`;
    }

    // Event listeners voor navigatieknoppen
    vorigeKnop.addEventListener('click', function() {
        if (huidigeVraagIndex > 0) {
            huidigeVraagIndex--;
            toonVraag(huidigeVraagIndex);
        }
    });

    volgendeKnop.addEventListener('click', function() {
        if (antwoorden[vragen[huidigeVraagIndex].id] === null) {
            alert('Selecteer een antwoord voordat je doorgaat.');
            return;
        }

        if (huidigeVraagIndex < vragen.length - 1) {
            huidigeVraagIndex++;
            toonVraag(huidigeVraagIndex);
        }
    });

    indienenKnop.addEventListener('click', function() {
        if (antwoorden[vragen[huidigeVraagIndex].id] === null) {
            alert('Selecteer een antwoord voordat je de quiz indient.');
            return;
        }

        // Bereken score en toon resultaten
        toonResultaten();
    });

    // Toon de quizresultaten
    function toonResultaten() {
        // Hier zou je de juiste antwoorden moeten controleren
        // Voor dit voorbeeld gaan we ervan uit dat het eerste antwoord altijd correct is
        score = 0;
        let samenvattingHTML = '';

        vragen.forEach((vraag, index) => {
            const gegevenAntwoordId = antwoorden[vraag.id];
            // Aanname: eerste keuze is altijd het juiste antwoord
            const juisteAntwoordId = vraag.keuzes[0].id;
            const isCorrect = gegevenAntwoordId === juisteAntwoordId;

            if (isCorrect) score++;

            const gegevenAntwoord = vraag.keuzes.find(k => k.id === gegevenAntwoordId)?.text || 'Niet beantwoord';
            const juisteAntwoord = vraag.keuzes[0].text;

            samenvattingHTML += `
                        <div class="samenvatting-item">
                            <div class="samenvatting-vraag">Vraag ${index + 1}: ${vraag.vraagtekst}</div>
                            <div class="${isCorrect ? 'juist' : 'onjuist'}">
                                Jouw antwoord: ${gegevenAntwoord} ${isCorrect ? '✓' : '✗'}
                            </div>
                            ${!isCorrect ? `<div class="juist">Juiste antwoord: ${juisteAntwoord}</div>` : ''}
                        </div>
                    `;
        });

        // Toon resultaten
        quizContent.style.display = 'none';
        document.querySelector('.nav-knoppen').style.display = 'none';
        document.querySelector('.progress-container').style.display = 'none';
        aiUitlegContainer.style.display = 'none';
        aiHelpKnop.style.display = 'none';

        resultatenContainer.innerHTML = `
                    <h2>Quiz Voltooid!</h2>
                    <div class="eindscore">Jouw score: ${score} / ${vragen.length}</div>
                    <div class="samenvatting">
                        <h3>Samenvatting:</h3>
                        ${samenvattingHTML}
                    </div>
                    <button class="opnieuw-knop" onclick="window.location.reload()">Quiz Opnieuw Spelen</button>
                `;
        resultatenContainer.style.display = 'block';
    }
});