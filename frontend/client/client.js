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
        return data;
    } catch (error) {
        console.error('Fout bij API-aanroep:', error);
        throw error;
    }
}

async function getvragen() {
    try {
        const data = await apiAanroep('/getVragen');
        return data;
    } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        throw error;
    }
}
async function getAntwoorden() {
    try {
        const data = await apiAanroep('/getAntwoorden');
        return data; // RETURN de data
    } catch (error) {
        console.error('Fout bij ophalen antwoorden:', error);
        throw error; // Gooi de error opnieuw
    }
}

function getRoot() {
    return apiAanroep('/')
        .catch(error => console.error('Fout bij ophalen root:', error));
}

function getExams() {
    return apiAanroep('/getExams')
        .catch(error => console.error('Fout bij ophalen examens:', error));
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
        throw error;
    }
}

window.getvragen = getvragen;
window.getExams = getExams;
window.getAntwoorden = getAntwoorden;
window.getAIHelp = getAIHelp;