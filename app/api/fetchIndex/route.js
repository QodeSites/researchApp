import db from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT ON (indices)
        indices,
        nav,
        date AT TIME ZONE 'Asia/Kolkata' AS date,
        MAX(nav) OVER (PARTITION BY indices) AS peak,
        ROUND(((nav - MAX(nav) OVER (PARTITION BY indices)) / MAX(nav) OVER (PARTITION BY indices)) * 100, 2) AS currentdd,
        ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.9, 2) AS dd10_value,
        ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.85, 2) AS dd15_value,
        ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.8, 2) AS dd20_value,
        CASE WHEN nav <= ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.9, 2) THEN true ELSE false END AS dd10,
        CASE WHEN nav <= ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.85, 2) THEN true ELSE false END AS dd15,
        CASE WHEN nav <= ROUND(MAX(nav) OVER (PARTITION BY indices) * 0.8, 2) THEN true ELSE false END AS dd20
      FROM tblresearch_new_1
      ORDER BY indices, date DESC;
    `;

    const { rows } = await db.query(query);

    // Sanitize + map
    const results = rows.map((row) => {
      const parsedDD = parseFloat(row.currentdd);
      return {
        indices: row.indices,
        nav: row.nav !== null ? parseFloat(row.nav) : null,
        date: row.date,
        peak: row.peak !== null ? parseFloat(row.peak) : null,
        currentDD: isNaN(parsedDD) ? null : parsedDD,
        dd10: Boolean(row.dd10),
        dd15: Boolean(row.dd15),
        dd20: Boolean(row.dd20),
        dd10_value:
          row.dd10_value !== null ? parseFloat(row.dd10_value) : null,
        dd15_value:
          row.dd15_value !== null ? parseFloat(row.dd15_value) : null,
        dd20_value:
          row.dd20_value !== null ? parseFloat(row.dd20_value) : null,
      };
    });

    return Response.json(
      { data: results, dataAsOf: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching indices:", error);
    return Response.json(
      { message: "Error fetching indices", error: error.message },
      { status: 500 }
    );
  }
}
