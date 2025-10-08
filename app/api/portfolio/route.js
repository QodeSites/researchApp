import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: "qode_portfolios",
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
});

export async function GET() {
  try {
    const query = `
      SELECT 
        qcode AS code,
        id AS account,
        portfolio_value,
        capital_in_out AS cash,
        nav,
        prev_nav,
        pnl,
        daily_p_l,
        exposure_value,
        prev_portfolio_value,
        prev_exposure_value,
        prev_pnl,
        drawdown,
        system_tag,
        created_at
      FROM public.master_sheet
      ORDER BY created_at DESC
      LIMIT 100;
    `;

    const { rows } = await pool.query(query);

    const data = rows.map(row => ({
      name: row.system_tag || 'N/A',
      nuvama_code: row.code,
      account: row.account,
      portfolio_value : row.portfolio_value,
      Cash: row.cash,
      cash_percentage: row.cash / row.portfolio_value * 100,
      derivatives_percentage : row.exposure_value / row.portfolio_value * 100
    }));

    return Response.json({
      success: true,
      data,
    }, { status: 200 });

  } catch (err) {
    console.error("Error fetching portfolio data:", err);

    return Response.json({
      success: false,
      message: "An error occurred while fetching portfolio data.",
      error: err.message,
    }, { status: 500 });
  }
}
