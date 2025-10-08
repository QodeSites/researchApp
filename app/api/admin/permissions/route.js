import db from "@/lib/db"

export async function GET() {
  try {
    const result = await db.query(`
      SELECT u.user_id, u.email, 
             json_agg(
               json_build_object(
                 'section_id', rs.section_id,
                 'section_name', rs.section_name,
                 'url', rs.url
               )
             ) AS permissions
      FROM pms_clients_tracker.research_users u
      LEFT JOIN pms_clients_tracker.permissions p 
        ON u.user_id = p.user_id
      LEFT JOIN pms_clients_tracker.research_sections rs 
        ON p.section_id = rs.section_id
      GROUP BY u.user_id, u.email
      ORDER BY u.email ASC
    `)

    const rows = Array.isArray(result) ? result : result.rows

    return Response.json({ users: rows }, { status: 200 })
  } catch (err) {
    console.error("GET /api/admin/permissions error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, section_id } = body

    if (!email || !section_id) {
      return Response.json({ error: "Missing fields" }, { status: 400 })
    }

    const userRes = await db.query(
      `SELECT user_id FROM pms_clients_tracker.research_users WHERE email = $1`,
      [email]
    )
    const user = userRes.rows?.[0]
    if (!user) return Response.json({ error: "User not found" }, { status: 404 })

    await db.query(
      `
      INSERT INTO pms_clients_tracker.permissions (user_id, section_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, section_id) DO NOTHING
      `,
      [user.user_id, section_id]
    )

    return Response.json({ message: "Permission added" }, { status: 200 })
  } catch (err) {
    console.error("POST /api/admin/permissions error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json()
    const { email, section_id } = body

    if (!email || !section_id) {
      return Response.json({ error: "Missing fields" }, { status: 400 })
    }

    const userRes = await db.query(
      `SELECT user_id FROM pms_clients_tracker.research_users WHERE email = $1`,
      [email]
    )
    const user = userRes.rows?.[0]
    if (!user) return Response.json({ error: "User not found" }, { status: 404 })

    await db.query(
      `
      DELETE FROM pms_clients_tracker.permissions
      WHERE user_id = $1 AND section_id = $2
      `,
      [user.user_id, section_id]
    )

    return Response.json({ message: "Permission removed" }, { status: 200 })
  } catch (err) {
    console.error("DELETE /api/admin/permissions error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
