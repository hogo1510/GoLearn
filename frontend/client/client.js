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

async function getvragen(examenId = null) {
    try {
        let endpoint = '/getVragen';
        if (examenId) {
            endpoint += `?examenId=${examenId}`;
        }
        const data = await apiAanroep(endpoint);
        return data;
    } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        throw error;
    }
}

async function getAntwoorden(examenId = null) {
    try {
        let endpoint = '/getAntwoorden';
        if (examenId) {
            endpoint += `?examenId=${examenId}`;
        }
        const data = await apiAanroep(endpoint);
        return data;
    } catch (error) {
        console.error('Fout bij ophalen antwoorden:', error);
        throw error;
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

        // Check if we're in the chooseExam context or quiz context
        if (typeof toonAIUitleg === 'function') {
            toonAIUitleg(data.uitleg, vraag);
        }

        return data;
    } catch (error) {
        console.error('Fout bij AI-aanroep:', error);
        if (typeof toonFout === 'function') {
            toonFout('Kon geen AI-uitleg krijgen: ' + error.message);
        }
        throw error;
    }
}

// Maak functies globaal beschikbaar
window.getvragen = getvragen;
window.getExams = getExams;
window.getAntwoorden = getAntwoorden;
window.getAIHelp = getAIHelp;