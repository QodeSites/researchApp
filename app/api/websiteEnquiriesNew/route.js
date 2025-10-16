import { query } from '@/lib/db'; // Your PostgreSQL connection

export default async function handler(req, res) {
  try {
    const sqlQuery = `
      SELECT 
        id,
        "fullName" as name,
        "contactNumber" as phone_number,
        email,
        location,
        message as additional_message,
        "submittedAt" as "createdAt",
        "submittedAt" as "updatedAt",
        "emailSent",
        "emailId",
        "zohoLeadId",
        'website' as source
      FROM pms_clients_tracker.website_enquiries
      ORDER BY "submittedAt" DESC
    `;

    const results = await query(sqlQuery);

    res.status(200).json({
      success: true,
      data: results.rows,
    });
  } catch (error) {
    console.error("Error fetching website enquiries:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching website enquiries.",
    });
  }
}