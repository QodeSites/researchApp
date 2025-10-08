import db from "@/lib/db";
import ZerodhaAPI from "../../lib/zerodha";

export default async function handler(req, res) {

    try {
        const zerodha = new ZerodhaAPI();

        const indices = [
            "NSE:NIFTY 50",
            "NSE:NIFTY NEXT 50",
            "NSE:NIFTY 100",
            "NSE:NIFTY 500",
            "NSE:NIFTY MIDCAP 100",
            "NSE:NIFTY SMLCAP 250",
            "NSE:NIFTY MICROCAP250",
            "NSE:NIFTY BANK",
            "NSE:NIFTY AUTO",
            "NSE:NIFTY FIN SERVICE",
            "NSE:NIFTY FMCG",
            "NSE:NIFTY IT",
            "NSE:NIFTY MEDIA",
            "NSE:NIFTY METAL",
            "NSE:NIFTY PHARMA",
            "NSE:NIFTY PSU BANK",
            "NSE:NIFTY PVT BANK",
            "NSE:NIFTY REALTY",
            "NSE:NIFTY HEALTHCARE",
            "NSE:NIFTY CONSR DURBL",
            "NSE:NIFTY OIL AND GAS",
            "NSE:NIFTY COMMODITIES",
            "NSE:NIFTY CONSUMPTION",
            "NSE:NIFTY CPSE",
            "NSE:NIFTY ENERGY",
            "NSE:NIFTY INFRA",
        ];

        // Fetch quotes for indices
        const quotes = await zerodha.getQuote(indices);
        const fetchedSymbols = Object.keys(quotes);
        const notFetchedIndices = indices.filter(index => !fetchedSymbols.includes(index));

        if (notFetchedIndices.length > 0) {
            console.log("Indices not fetched from Kite API:", notFetchedIndices);
        }

        // Begin transaction
        await db.query('BEGIN');

        const updates = [];
        try {
            for (const symbol in quotes) {
                const quoteData = quotes[symbol];
                const closePrice = quoteData.ohlc.close;
                const openPrice = quoteData.ohlc.open;
                const timestamp = new Date(quoteData.timestamp);
                timestamp.setDate(timestamp.getDate() - 1); // Subtract one day
                const date = timestamp.toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'
                // Determine direction
                let direction = 'NEUTRAL';
                if (closePrice > openPrice) {
                    direction = 'UP';
                } else if (closePrice < openPrice) {
                    direction = 'DOWN';
                }

                // Add to updates array for response
                updates.push({
                    symbol,
                    nav: closePrice,
                    date,
                    direction,
                    netChange: quoteData.net_change
                });

                // Execute the UPDATE query with direction
                const result = await db.query(
                    `INSERT INTO tblresearch_new (indices, nav, date, direction, net_change)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (indices, date)
                     DO UPDATE SET 
                         nav = $2, 
                         direction = $4, 
                         net_change = $5, 
                         updated_at = CURRENT_TIMESTAMP
                     RETURNING *`,
                    [symbol, closePrice, date, direction, quoteData.net_change]
                );

                // Optionally check if any rows were affected
                if (result.rowCount === 0) {
                    console.log(`No existing record found for ${symbol} on ${date}, skipping update.`);
                }
            }

            // Commit the transaction if all updates succeed
            await db.query('COMMIT');
        } catch (error) {
            // Rollback the transaction if any update fails
            await db.query('ROLLBACK');
            throw error;
        }

        return res.status(200).json({
            message: "Indices updated successfully",
            updates,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in updating indices:", error);
        return res.status(500).json({
            error: "Failed to update indices",
            message: error.message
        });
    }
}