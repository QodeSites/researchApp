import db from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT id, email, "createdAt"
      FROM emails
      ORDER BY id DESC;
    `;

    const results = await db.query(query);

    return Response.json(
      {
        success: true,
        data: results.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching newsletter emails:", error);

    return Response.json(
      {
        success: false,
        message: "An error occurred while fetching newsletter emails.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
