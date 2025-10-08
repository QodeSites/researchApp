import { NextResponse } from "next/server";
import db from "@/lib/db";
import dayjs from "dayjs";

// Helper function to parse any date format into YYYY-MM-DD format.
// Returns null if the date cannot be parsed.
function parseToISODate(dateString) {
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split("T")[0];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const indices = searchParams.get("indices");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  console.log("startDate", startDate);
  console.log("endDate", endDate);

  try {
    if (!indices) {
      return NextResponse.json(
        { message: "indices parameter is required" },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Content-Type",
          }
        }
      );
    }

    // Convert the indices from URL to uppercase so they match the DB.
    const indicesList = indices
      .split(",")
      .map((item) => item.trim().toUpperCase());

    // Parse dates if provided; accepts any format that Date() can handle.
    let parsedStartDate = null;
    let parsedEndDate = null;
    
    if (startDate) {
      parsedStartDate = parseToISODate(startDate);
      if (!parsedStartDate) {
        return NextResponse.json(
          { message: "Invalid startDate. Provide a valid date." },
          { 
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET",
              "Access-Control-Allow-Headers": "Content-Type",
            }
          }
        );
      }
    }
    
    if (endDate) {
      parsedEndDate = parseToISODate(endDate);
      if (!parsedEndDate) {
        return NextResponse.json(
          { message: "Invalid endDate. Provide a valid date." },
          { 
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET",
              "Access-Control-Allow-Headers": "Content-Type",
            }
          }
        );
      }
    }

    let dataRows = [];

    if (parsedStartDate) {
      // Get the last available record for each index before the startDate using DISTINCT ON.
      const lastAvailableNavQuery = `
        SELECT DISTINCT ON (indices) indices, nav, date
        FROM tblresearch_new
        WHERE indices = ANY($1)
          AND date < $2::date
        ORDER BY indices, date DESC;
      `;
      console.log(lastAvailableNavQuery);
      const lastNavResult = await db.query(lastAvailableNavQuery, [
        indicesList,
        parsedStartDate,
      ]);

      // Create an interpolation row for each index that has a previous record.
      const interpolatedRows = lastNavResult.rows.map((row) => ({
        indices: row.indices,
        nav: row.nav,
        date: parsedStartDate, // Already in YYYY-MM-DD format.
      }));

      // Get all actual data from startDate onward (with an optional endDate filter)
      let mainQuery = `
        SELECT indices, nav, date
        FROM tblresearch_new
        WHERE indices = ANY($1)
          AND date >= $2::date
      `;
      const queryParams = [indicesList, parsedStartDate];

      // Use the next day for the end condition so that the entire endDate is included.
      if (parsedEndDate) {
        mainQuery += " AND date < ($3::date + INTERVAL '1 day')";
        queryParams.push(parsedEndDate);
      }
      mainQuery += " ORDER BY indices, date ASC;";

      const actualDataResult = await db.query(mainQuery, queryParams);

      // Combine the interpolation rows with the actual data.
      dataRows = [...interpolatedRows, ...actualDataResult.rows];
    } else {
      // If no startDate is provided, fetch all available data for the given indices.
      let mainQuery = `
        SELECT indices, nav, date
        FROM tblresearch_new
        WHERE indices = ANY($1)
      `;
      const queryParams = [indicesList];

      if (parsedEndDate) {
        mainQuery += " AND date < ($2::date + INTERVAL '1 day')";
        queryParams.push(parsedEndDate);
      }
      mainQuery += " ORDER BY indices, date ASC;";

      const result = await db.query(mainQuery, queryParams);
      dataRows = result.rows;
    }

    // Format each row's date as YYYY-MM-DD without additional timezone conversion.
    dataRows = dataRows.map((row) => ({
      ...row,
      date: dayjs(row.date).format("YYYY-MM-DD"),
    }));

    return NextResponse.json(
      { data: dataRows },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching indices:", error);
    return NextResponse.json(
      { message: "Error fetching indices data", error: error.message },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}