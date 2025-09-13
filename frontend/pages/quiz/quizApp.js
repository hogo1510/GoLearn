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

// Leaderboard data (simulatie van bot scores)
const botScores = [
    { naam: 'Lisa', score: 9 },
    { naam: 'Thomas', score: 8 },
    { naam: 'Sanne', score: 7 },
    { naam: 'Mike', score: 6 },
    { naam: 'Emma', score: 5 }
];

// Functie om leaderboard te genereren
function generateLeaderboard(playerScore, playerName = 'Jij') {
    // Voeg speler toe aan scores
    const allScores = [...botScores, { naam: playerName, score: playerScore, isPlayer: true }];

    // Sorteer op score (hoogste eerst)
    allScores.sort((a, b) => b.score - a.score);

    // Voeg ranking toe
    let currentRank = 1;
    allScores.forEach((player, index) => {
        if (index > 0 && allScores[index - 1].score > player.score) {
            currentRank = index + 1;
        }
        player.rank = currentRank;
    });

    return allScores;
}

// Functie om leaderboard HTML te genereren
function createLeaderboardHTML(leaderboardData, maxEntries = 10) {
    let html = '';

    leaderboardData.slice(0, maxEntries).forEach(player => {
        const isPlayer = player.isPlayer ? 'current-player' : '';
        const medalClass = player.rank <= 3 ? `medal-${player.rank}` : '';

        html += `
            <li class="leaderboard-item ${isPlayer} ${medalClass}">
                <span class="leaderboard-rank">${player.rank}.</span>
                <span class="leaderboard-name">${player.naam}</span>
                <span class="leaderboard-score">${player.score}/10</span>
            </li>
        `;
    });

    return html;
}

// Functie om een motiverende boodschap te genereren
function getMotivationalMessage(score, totalQuestions, rank) {
    const percentage = (score / totalQuestions) * 100;

    if (percentage >= 90) {
        return "Uitstekend! Je beheerst beroepsethiek echt goed! 🌟";
    } else if (percentage >= 80) {
        return "Zeer goed gedaan! Je hebt een sterke basis in beroepsethiek! 👏";
    } else if (percentage >= 70) {
        return "Goed werk! Er is nog ruimte voor verbetering, maar je bent op de goede weg! 💪";
    } else if (percentage >= 60) {
        return "Niet slecht! Met wat meer studie kun je je score zeker verbeteren! 📚";
    } else if (percentage >= 50) {
        return "Je hebt de basis onder de knie! Blijf oefenen om je kennis te verdiepen! 🎯";
    } else {
        return "Geen zorgen, iedereen begint ergens! Neem de tijd om de stof nog eens door te nemen! 🚀";
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
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3z"/>
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
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3z"/>
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
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 5.5C7 4.672 6.328 4 5.5 4S4 4.672 4 5.5 4.672 7 5.5 7 7 6.328 7 5.5zM5 11h1V8H5v3z"/>
                    </svg>
                    AI Uitleg bij de vraag
                </div>
                <div class="ai-uitleg">
                    ${aiUitleg.uitleg || aiUitleg}
                </div>
            </div>
        `;
    }

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

                // Update score display
                updateVoortgang();
            });
        });

        // Update knoppen
        vorigeKnop.style.display = index === 0 ? 'none' : 'block';
        volgendeKnop.style.display = index === vragen.length - 1 ? 'none' : 'block';
        indienenKnop.style.display = index === vragen.length - 1 ? 'block' : 'none';
    }

    // Update de voortgangsbalk en score
    function updateVoortgang() {
        const beantwoord = Object.values(antwoorden).filter(a => a !== null).length;
        const percentage = (beantwoord / vragen.length) * 100;
        voortgang.style.width = `${percentage}%`;
        scoreElement.textContent = beantwoord;
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

    // Toon de quizresultaten met leaderboard
    function toonResultaten() {
        // Bereken score
        score = 0;
        let samenvattingHTML = '';

        vragen.forEach((vraag, index) => {
            const gegevenAntwoordId = antwoorden[vraag.id];
            // Aanname: eerste keuze is altijd het juiste antwoord (pas dit aan naar jouw logica)
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

        // Genereer leaderboard
        const leaderboardData = generateLeaderboard(score);
        const playerRank = leaderboardData.find(p => p.isPlayer)?.rank || 'N/A';
        const motivationalMessage = getMotivationalMessage(score, vragen.length, playerRank);
        const leaderboardHTML = createLeaderboardHTML(leaderboardData);

        // Verberg quiz elementen
        quizContent.style.display = 'none';
        document.querySelector('.nav-knoppen').style.display = 'none';
        document.querySelector('.progress-container').style.display = 'none';
        aiUitlegContainer.style.display = 'none';
        aiHelpKnop.style.display = 'none';
        document.querySelector('.ai-help-container').style.display = 'none';

        // Toon resultaten met leaderboard
        resultatenContainer.innerHTML = `
            <div class="results-header">
                <h2>🎉 Quiz Voltooid!</h2>
                <div class="eindscore">
                    <div class="score-display">
                        <span class="score-number">${score}</span>
                        <span class="score-divider">/</span>
                        <span class="total-questions">${vragen.length}</span>
                    </div>
                    <div class="score-percentage">${Math.round((score / vragen.length) * 100)}%</div>
                </div>
                <div class="player-rank">Jouw positie: #${playerRank}</div>
                <div class="motivational-message">${motivationalMessage}</div>
            </div>
            
            <div class="leaderboard-container">
                <h3 class="leaderboard-title">🏆 Leaderboard</h3>
                <ul class="leaderboard-list">
                    ${leaderboardHTML}
                </ul>
            </div>

            <div class="samenvatting">
                <h3>📋 Gedetailleerde Resultaten:</h3>
                ${samenvattingHTML}
            </div>

            <div class="action-buttons">
                <button class="opnieuw-knop" onclick="window.location.reload()">
                    🔄 Quiz Opnieuw Spelen
                </button>
                <button class="deel-knop" onclick="deelScore(${score}, ${vragen.length})">
                    📤 Deel je Score
                </button>
            </div>
        `;

        resultatenContainer.style.display = 'block';

        // Animatie voor score revealing
        setTimeout(() => {
            const scoreDisplay = document.querySelector('.score-display');
            if (scoreDisplay) {
                scoreDisplay.style.animation = 'scoreReveal 1s ease-out';
            }
        }, 300);
    }

    // Functie om score te delen (placeholder)
    window.deelScore = function(score, total) {
        const percentage = Math.round((score / total) * 100);
        const text = `Ik heb zojuist ${score}/${total} (${percentage}%) gehaald op de Beroepsethiek Quiz! 🎯`;

        if (navigator.share) {
            navigator.share({
                title: 'Mijn Quiz Resultaat',
                text: text,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback: kopieer naar clipboard
            navigator.clipboard.writeText(text).then(() => {
                alert('Score gekopieerd naar clipboard! 📋');
            }).catch(() => {
                alert(`Jouw score: ${text}`);
            });
        }
    };
});