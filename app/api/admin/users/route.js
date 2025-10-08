import db from "@/lib/db"

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        u.user_id,
        u.email,
        u.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'section_id', rs.section_id,
              'section_name', rs.section_name,
              'url', rs.url
            )
          ) FILTER (WHERE rs.section_id IS NOT NULL),
          '[]'
        ) AS permissions
      FROM pms_clients_tracker.research_users u
      LEFT JOIN pms_clients_tracker.permissions p 
        ON u.user_id = p.user_id
      LEFT JOIN pms_clients_tracker.research_sections rs 
        ON p.section_id = rs.section_id
      GROUP BY u.user_id, u.email, u.created_at
      ORDER BY u.created_at DESC
    `)

    const rows = Array.isArray(result) ? result : result.rows

    return Response.json({ users: rows }, { status: 200 })
  } catch (err) {
    console.error("GET /api/admin/users error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
