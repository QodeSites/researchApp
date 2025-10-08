import db from "@/lib/db"

export async function GET() {
  try {
    const result = await db.query(`
      SELECT section_id, section_name, url, created_at
      FROM pms_clients_tracker.research_sections
      ORDER BY section_id ASC
    `)

    const rows = Array.isArray(result) ? result : result.rows

    return Response.json({ sections: rows }, { status: 200 })
  } catch (err) {
    console.error("GET /api/admin/sections error:", err)
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
