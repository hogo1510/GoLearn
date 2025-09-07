// client.js aanpassingen
const API_BASE_URL = 'http://localhost:3333';

async function apiAanroep(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        return data; // Deze return was waarschijnlijk al aanwezig
    } catch (error) {
        console.error('Fout bij API-aanroep:', error);
        throw error;
    }
}

// Deze functie moet de data returnen in plaats van alleen te loggen
async function getvragen() {
    try {
        const data = await apiAanroep('/getVragen');
        return data; // Return de data zodat de quiz deze kan gebruiken
    } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        throw error; // Gooi de error opnieuw zodat de quiz deze kan afhandelen
    }
}

// De andere functies blijven hetzelfde
function getRoot() {
    apiAanroep('/')
        .catch(error => console.error('Fout bij ophalen root:', error));
}

function getExams() {
    apiAanroep('/getExams')
        .catch(error => console.error('Fout bij ophalen examens:', error));
}

function getAntwoorden() {
    apiAanroep('/getAntwoorden')
        .catch(error => console.error('Fout bij ophalen antwoorden:', error));
}

async function getAIHelp(vraag) {
    try {
        const response = await fetch(`${API_BASE_URL}/getAiHelp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vraag: vraag })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        toonAIUitleg(data.uitleg, vraag);
        return data;
    } catch (error) {
        console.error('Fout bij AI-aanroep:', error);
        toonFout('Kon geen AI-uitleg krijgen: ' + error.message);
    }
}

// Zorg ervoor dat de functies beschikbaar zijn in de globale scope
window.getvragen = getvragen;
window.getExams = getExams;
window.getAntwoorden = getAntwoorden;
window.getAIHelp = getAIHelp;