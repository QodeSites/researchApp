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
    try {
        // SQL Query to fetch transactions with formatted dates
        const query = `select * from pms_clients_tracker.pms_cash_in_out where cash_in_out != 0 order by date desc;`;
        // Execute the query
        const results = await db.query(query);
        // Respond with the results
        res.status(200).json({
            success: true,
            data: results.rows,
        });
    }
    catch (error) {
        // Handle errors
        console.error("Error fetching transactions:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching transactions.",
        });
    }
}