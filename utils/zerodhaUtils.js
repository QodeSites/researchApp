import fs from 'fs';
import path from 'path';
import https from 'https';
import csv from 'csv-parser';

// Function to download the instruments CSV
export async function downloadInstrumentsCSV(apiKey, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.kite.trade',
            path: '/instruments',
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${apiKey}:${accessToken}`
            }
        };

        const filePath = path.join(__dirname, 'instruments.csv');
        const file = fs.createWriteStream(filePath);

        https.get(options, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(filePath));
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err));
        });
    });
}

// Function to parse the instruments CSV and get instrument tokens for indices
export async function getInstrumentTokens(indices, csvFilePath) {
    return new Promise((resolve, reject) => {
        const instrumentTokens = {};
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                const tradingsymbol = row.tradingsymbol;
                const exchange = row.exchange;
                const segment = row.segment;

                // Check if the row matches any of the indices
                if (indices.includes(`${exchange}:${tradingsymbol}`)) {
                    instrumentTokens[`${exchange}:${tradingsymbol}`] = row.instrument_token;
                }
            })
            .on('end', () => {
                resolve(instrumentTokens);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}


