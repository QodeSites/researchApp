import db from "@/lib/db";

export default async function handler(req, res) {
    const { method } = req;

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
        return res.status(200).end();
    }

    if (method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }



    let total_investment_query = `
    SELECT SUM(capital_in_out) AS total_amount_invested 
    FROM pms_clients_tracker.managed_accounts_cash_in_out
    WHERE capital_in_out > 0
    `;

    try {
        let total_investment = await db.query(total_investment_query);

        res.status(200).json({ 
            total_amount_invested: total_investment.rows[0].total_amount_invested
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
