import db from "@/lib/db";

export async function GET() {
  try {
    const portfolio_details_query = `
      SELECT * 
      FROM pms_clients_tracker.portfolio_details 
      ORDER BY cash_percentage DESC
    `;

    const trailing_returns_query = `
      SELECT * 
      FROM pms_clients_tracker.trailing_returns
    `;

    const portfolio_tracker = await db.query(portfolio_details_query);
    const trailing_returns = await db.query(trailing_returns_query);

    return Response.json(
      {
        success: true,
        portfolio_tracker: portfolio_tracker.rows ?? [],
        trailing_returns: trailing_returns.rows ?? [],
        dataAsOf: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching client tracker data:", err);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch client tracker data",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
