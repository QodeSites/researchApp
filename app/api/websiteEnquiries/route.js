import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    // Query website enquiries
    const websiteQuery = `
      SELECT 
        id,
        "fullName",
        "contactNumber",
        email,
        location,
        message,
        "submittedAt",
        "emailSent",
        "emailId",
        "zohoLeadId",
        'website' as source
      FROM pms_clients_tracker.website_enquiries
      ORDER BY "submittedAt" DESC
    `;

    // Query client enquiries
    const clientQuery = `
      SELECT 
        id,
        name,
        email,
        phone_number,
        investment_goal,
        investment_experience,
        preferred_strategy,
        initial_investment_size,
        additional_message,
        status,
        "additionalComments",
        location,
        "createdAt",
        "updatedAt",
        'client_enquiry' as source
      FROM public.client_enquiry
      ORDER BY "createdAt" DESC
    `;

    // Execute both queries in parallel
    const [websiteResults, clientResults] = await Promise.all([
      db.query(websiteQuery),
      db.query(clientQuery),
    ]);

    // Combine results from both sources with unique_id to avoid key conflicts
    const combinedData = [
      ...websiteResults.rows.map(row => ({ ...row, unique_id: `website_${row.id}` })),
      ...clientResults.rows.map(row => ({ ...row, unique_id: `client_${row.id}` })),
    ];

    return NextResponse.json({
      success: true,
      data: combinedData,
      count: combinedData.length,
      breakdown: {
        client_enquiry: clientResults.rows.length,
        website: websiteResults.rows.length,
      },
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred while fetching enquiries.",
      },
      { status: 500 }
    );
  }
}