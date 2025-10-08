import db from "@/lib/db"

// Coerce + clamp numeric inputs safely
function toSafeInt(
  val,
  { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}
) {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.min(max, Math.max(min, i))
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get("limit") ?? "100"
    const offset = searchParams.get("offset") ?? "0"

    const safeLimit = toSafeInt(limit, { min: 1, max: 1000, fallback: 100 })
    const safeOffset = toSafeInt(offset, {
      min: 0,
      max: 10_000_000,
      fallback: 0,
    })

    // Query rows
    const rowsResult = await db.query(
      `
        SELECT *
        FROM pms_clients_tracker.qode_microsite_inquiries
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [safeLimit, safeOffset]
    )
    const rows = Array.isArray(rowsResult) ? rowsResult : rowsResult.rows

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM pms_clients_tracker.qode_microsite_inquiries`
    )
    const countRow = Array.isArray(countResult)
      ? countResult[0]
      : countResult.rows?.[0]

    const totalCount = Number(countRow?.total ?? 0)

    return Response.json(
      {
        results: rows ?? [],
        count: rows?.length ?? 0,
        total: totalCount,
        limit: safeLimit,
        offset: safeOffset,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("GET /api/ticket error:", {
      message: err?.message,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    })

    return Response.json(
      {
        error: "Failed to fetch website tickets",
        details: process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: 500 }
    )
  }
}
