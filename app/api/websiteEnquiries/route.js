import db from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT *, location
      FROM client_enquiry
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
    console.error("Error fetching client enquiries:", error);

    return Response.json(
      {
        success: false,
        message:
          "An error occurred while fetching client enquiries.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
