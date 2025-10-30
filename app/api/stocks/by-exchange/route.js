import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const exchange = searchParams.get("exchange");
    const search = searchParams.get("search") || "";
    const exclude = searchParams.get("exclude") || ""; // Comma-separated symbols to exclude

    let query = `
      SELECT 
        id, 
        company_name, 
        bse_code, 
        nse_symbol, 
        industry,
        CASE 
          WHEN nse_symbol IS NOT NULL THEN 'NSE'
          WHEN bse_code IS NOT NULL THEN 'BSE'
          ELSE 'Unknown'
        END as primary_exchange,
        COALESCE(nse_symbol, bse_code) as primary_symbol
      FROM stocks
      WHERE 1=1`;

    const params = [];
    let paramIndex = 1;

    // Search filter - use ILIKE for case-insensitive partial matching
    if (search) {
      query += ` AND (
        company_name ILIKE $${paramIndex} OR 
        nse_symbol ILIKE $${paramIndex} OR 
        bse_code ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Exchange filter
    if (exchange) {
      if (exchange.toUpperCase() === 'NSE') {
        query += ` AND nse_symbol IS NOT NULL`;
      } else if (exchange.toUpperCase() === 'BSE') {
        query += ` AND bse_code IS NOT NULL`;
      }
    }

    // Exclude already researched stocks
    if (exclude) {
      const excludeSymbols = exclude.split(',').filter(s => s.trim());
      if (excludeSymbols.length > 0) {
        const placeholders = excludeSymbols.map((_, i) => `$${paramIndex + i}`).join(',');
        query += ` AND COALESCE(nse_symbol, bse_code) NOT IN (${placeholders})`;
        params.push(...excludeSymbols);
        paramIndex += excludeSymbols.length;
      }
    }

    // Order by relevance: exact matches first, then alphabetically
    if (search) {
      query += ` ORDER BY 
        CASE 
          WHEN LOWER(nse_symbol) = LOWER($${paramIndex}) THEN 1
          WHEN LOWER(bse_code) = LOWER($${paramIndex}) THEN 1
          WHEN LOWER(company_name) = LOWER($${paramIndex}) THEN 2
          ELSE 3
        END,
        company_name`;
      params.push(search);
      paramIndex++;
    } else {
      query += ` ORDER BY company_name`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}