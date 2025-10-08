import db from "@/lib/db"
import { cookies } from "next/headers"
import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL)

export async function GET() {
  try {
    // 1. Get sessionId from cookie
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("auth")?.value

    if (!sessionId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Load session from Redis
    console.log(sessionId)
    console.log("++++++++++++++++++++++++++++sessionID")
    const sessionData = await redis.get(`session:${sessionId}`)
    if (!sessionData) {
      return Response.json({ error: "Invalid session" }, { status: 401 })
    }

    const session = JSON.parse(sessionData)
    const email = session?.user?.email

    if (!email) {
      return Response.json({ error: "Invalid user data" }, { status: 401 })
    }

    // 3. Ensure user exists in DB
    const userResult = await db.query(
      `
      INSERT INTO pms_clients_tracker.research_users (email)
      VALUES ($1)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING user_id, email
      `,
      [email]
    )
    const user =
      Array.isArray(userResult) && userResult.length > 0
        ? userResult[0]
        : userResult.rows?.[0]

    // 4. Fetch permissions
    const permResult = await db.query(
      `
      SELECT rs.section_id, rs.section_name, rs.url
      FROM pms_clients_tracker.permissions p
      JOIN pms_clients_tracker.research_sections rs
        ON p.section_id = rs.section_id
      WHERE p.user_id = $1
      ORDER BY rs.section_id ASC
      `,
      [user.user_id]
    )

    const permissions = Array.isArray(permResult)
      ? permResult
      : permResult.rows ?? []

    return Response.json(
      { email: user.email, permissions },
      { status: 200 }
    )
  } catch (err) {
    console.error("GET /api/me error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
