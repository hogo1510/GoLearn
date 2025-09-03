function toonBericht(bericht) {
    document.getElementById('resultaat').innerHTML = `
                <p class="loading">${bericht}</p>
            `;
}

function toonFout(bericht) {
    document.getElementById('resultaat').innerHTML = `
                <div class="warning">
                    <strong>⚠️ Fout:</strong> ${bericht}
                </div>
                <p class="loading">Controleer of de server op localhost:3333 draait.</p>
            `;
}

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
}

function toonJSON(data, titel) {
    const resultaatDiv = document.getElementById('resultaat');
    const jsonString = JSON.stringify(data, null, 2);

    resultaatDiv.innerHTML = `
                <div class="success">
                    <strong>✅ Succes!</strong> Data succesvol geladen van de API
                </div>
                <h3 class="data-title">${titel}</h3>
                <div class="json-container">
                    <pre>${syntaxHighlight(jsonString)}</pre>
                </div>
                <div style="margin-top: 15px; color: #7f8c8d; font-size: 14px;">
                    📊 Aantal items: ${Array.isArray(data) ? data.length : '1 object'}
                </div>
            `;
}

function toonAIUitleg(uitleg, vraag) {
    const resultaatDiv = document.getElementById('resultaat');
    resultaatDiv.innerHTML = `
                <div class="success">
                    <strong>🤖 AI Uitleg</strong>
                </div>
                <h3 class="data-title">Vraag: ${vraag}</h3>
                <div class="ai-container" style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <p style="font-size: 16px; line-height: 1.6;">${uitleg}</p>
                </div>
            `;
}

// Override console.log om data ook op de pagina te tonen
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
    originalConsoleLog.apply(console, args);


    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        toonJSON(args[0], 'API Response');
    }
};

console.error = function(...args) {
    originalConsoleError.apply(console, args);

    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        toonFout('Error: ' + JSON.stringify(args[0]));
    } else {
        toonFout(args.join(' '));
    }
};


function testRoot() {
    toonBericht('Root endpoint testen...');
    getRoot();
}

function testExams() {
    toonBericht('Examens laden van API...');
    getExams();
}

function testVragen() {
    toonBericht('Vragen laden van API...');
    getvragen();
}

function testAntwoorden() {
    toonBericht('Antwoorden laden van API...');
    getAntwoorden();
}

function toonAILoading(vraag) {
    document.getElementById('resultaat').innerHTML = `
        <div class="loading">
            <p>AI denkt na over je vraag...</p>
            <p><em>"${vraag}"</em></p>
            <div style="margin-top: 15px;">⏳ Even geduld alstublieft...</div>
        </div>
    `;
}
function testAI() {
    const vraag = "Wat is het primaire doel van motiverende gespreksvoering?";
    toonAILoading(vraag);
    getAIHelp(vraag);
}

// Event listener voor keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === '0') testRoot();
    if (e.key === '1') testExams();
    if (e.key === '2') testVragen();
    if (e.key === '3') testAntwoorden();
    if (e.key === '4') testAI(); // Toets 4 voor AI
});

// Info bericht
document.addEventListener('DOMContentLoaded', function() {
    console.log('API Client applicatie geladen! Gebruik knoppen of toetsen 0-4');
});
