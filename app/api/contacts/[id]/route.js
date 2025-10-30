// ===== NEW: app/api/contacts/[id]/route.js ===== (for PUT update and DELETE)
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

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
      updated_by = 'system'
    } = body;

    const query = `
      UPDATE tblcontact_directory
      SET research_stock_id = $1,
          contact_type = $2,
          first_name = $3,
          last_name = $4,
          title = $5,
          email = $6,
          phone = $7,
          secondary_email = $8,
          secondary_phone = $9,
          department = $10,
          office_address = $11,
          city = $12,
          country = $13,
          timezone = $14,
          preferred_contact_method = $15,
          linkedin_url = $16,
          notes = $17,
          last_contacted_date = $18,
          contact_frequency = $19,
          is_active = $20,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *
    `;

    const result = await db.query(query, [
      research_stock_id || null,
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
      id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await db.query(
      "UPDATE tblcontact_directory SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Contact marked as inactive", id: result.rows[0].id });
  } catch (error) {
    console.error("Error deactivating contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}