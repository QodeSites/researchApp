import db from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, status, additionalComments } = body;

    // Basic validation
    if (!id) {
      return Response.json(
        { success: false, message: "Missing inquiry id." },
        { status: 400 }
      );
    }

    const query = `
      UPDATE public.client_enquiry
      SET status = $1,
          "additionalComments" = $2,
          "updatedAt" = NOW()
      WHERE id = $3;
    `;

    await db.query(query, [status, additionalComments, id]);

    return Response.json(
      {
        success: true,
        message: "Inquiry updated successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating inquiry:", error);
    return Response.json(
      {
        success: false,
        message: "An error occurred while updating the inquiry.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { success: false, message: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
