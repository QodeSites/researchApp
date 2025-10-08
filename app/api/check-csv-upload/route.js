// pages/api/check-csv-upload.js

import db from "@/lib/db";

export async function POST(req) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return Response.json(
      { message: `Method ${req.method} not allowed` },
      { status: 405 }
    );
  }

  const { year, month } = req.body;
  if (!year || !month) {
    return Response.json(
      { message: "Year and Month are required." },
      { status: 405 }
    );
  }

  try {
    const queryText =
      'SELECT COUNT(*) FROM pms_monthly_reports WHERE "year" = $1 AND "month" = $2';
    const values = [year, month];
    const result = await db.query(queryText, values);
    const count = parseInt(result.rows[0].count, 10);
    return Response.json({ exists: count > 0 }, { status: 200 });
  } catch (error) {
    console.error("Error checking CSV upload: ", error);
    return Response.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
