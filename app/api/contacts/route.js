// ===== NEW: app/api/contacts/route.js ===== (for POST new contact and GET all for stock)
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const research_stock_id = searchParams.get('research_stock_id');

    if (!research_stock_id) {
      return NextResponse.json({ error: "research_stock_id is required" }, { status: 400 });
    }

    

    const result = await db.query(
      "SELECT * FROM tblcontact_directory WHERE research_stock_id = $1 AND is_active = true ORDER BY created_at DESC",
      [research_stock_id]
    );

    return NextResponse.json({ contacts: result.rows });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      research_stock_id,
      contact_type,
      first_name,
      last_name,
      title,
      email,
      phone,
      secondary_email,
      secondary_phone,
      department,
      office_address,
      city,
      country,
      timezone,
      preferred_contact_method,
      linkedin_url,
      notes,
      last_contacted_date,
      contact_frequency,
      is_active = true,
      created_by = 'system' // Assume current user or default
    } = body;

    if (!research_stock_id) {
      return NextResponse.json({ error: "research_stock_id is required" }, { status: 400 });
    }

    const query = `
      INSERT INTO tblcontact_directory (
        research_stock_id, contact_type, first_name, last_name, title, email, phone,
        secondary_email, secondary_phone, department, office_address, city, country,
        timezone, preferred_contact_method, linkedin_url, notes, last_contacted_date,
        contact_frequency, is_active, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await db.query(query, [
      research_stock_id,
      contact_type || null,
      first_name || null,
      last_name || null,
      title || null,
      email || null,
      phone || null,
      secondary_email || null,
      secondary_phone || null,
      department || null,
      office_address || null,
      city || null,
      country || null,
      timezone || null,
      preferred_contact_method || null,
      linkedin_url || null,
      notes || null,
      last_contacted_date || null,
      contact_frequency || null,
      is_active,
      created_by
    ]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}