const https = require('https');

const API_KEY = 'AIzaSyDJxZdd1F-YkylUv3CemPQTzSUikk8Q8-U';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error);
            } else {
                console.log('Available Models:');
                if (json.models) {
                    json.models.forEach(m => {
                        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                            console.log(`- ${m.name} (${m.displayName})`);
                        }
                    });
                } else {
                    console.log('No models found or structure is different:', json);
                }
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
            console.log('Raw Data:', data);
        }
    });

}).on('error', (err) => {
    console.error('Network Error:', err.message);
});
