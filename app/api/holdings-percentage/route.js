import db from "@/lib/db"; // assuming this exports a configured pg or mysql client

// Function to categorize stocks
const categorizeStock = (stockName) => {
  const name = stockName.toLowerCase();
  if (name.includes('cash') || name.includes('initial margin')) {
    return 'CASH';
  } else if (name.includes('call') || name.includes('put')) {
    return 'OPTIONS';
  } else {
    return 'STOCKS';
  }
};

export default async function handler(req, res) {
  // Method validation
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");


  try {
    // Fetch all stock-wise holdings with a single query
    const query = `
      SELECT 
        symbolname,
        clientcode,
        percentassets,
        strategy,
        total
      FROM pms_clients_tracker.pms_holdings_percentage
      ORDER BY strategy, symbolname, clientcode
    `;

    const result = await db.query(query);

    // More efficient grouping using Map
    const strategyMap = new Map();

    for (const row of result.rows) {
      const strategy = row.strategy || 'Unknown';
      const symbolKey = `${strategy}-${row.symbolname}`;

      if (!strategyMap.has(symbolKey)) {
        // Add category based on stock name
        const category = categorizeStock(row.symbolname);

        strategyMap.set(symbolKey, {
          symbolname: row.symbolname,
          total: row.total,
          strategy: strategy,
          category: category,
          clients: []
        });
      }

      strategyMap.get(symbolKey).clients.push({
        clientcode: row.clientcode,
        percentassets: row.percentassets
      });
    }

    // Convert Map to array for response
    const response = Array.from(strategyMap.values());

    // Add cache control headers to reduce frequent API calls
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).json(response);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}