import db from "@/lib/db";

export async function GET(req) {
  try {
    // Parse JSON body
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return Response.json(
        { error: "Year and month are required" },
        { status: 400 }
      );
    }

    const numYear = parseInt(year);
    const numMonth = parseInt(month);

    // ---------------------------
    // Last day of previous month
    // ---------------------------
    const prevMonth = numMonth === 1 ? 12 : numMonth - 1;
    const prevMonthYear = numMonth === 1 ? numYear - 1 : numYear;
    const lastDayPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonth, 0))
      .toISOString()
      .split("T")[0];

    // ---------------------------
    // Last day of current month
    // ---------------------------
    let lastDayCurrMonth;
    const latestDateQuery = `
      SELECT MAX(date) as latest_date
      FROM tblresearch_new_1
      WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
    `;
    const latestDateResult = await db.query(latestDateQuery, [
      numYear,
      numMonth,
    ]);
    const latestDate = latestDateResult.rows[0]?.latest_date;

    if (!latestDate) {
      return Response.json(
        { error: `No data available for year ${numYear}, month ${numMonth}` },
        { status: 404 }
      );
    }

    const lastDayOfMonth = new Date(Date.UTC(numYear, numMonth, 0))
      .toISOString()
      .split("T")[0];
    lastDayCurrMonth =
      new Date(latestDate) <= new Date(lastDayOfMonth)
        ? new Date(latestDate).toISOString().split("T")[0]
        : lastDayOfMonth;

    // ---------------------------
    // 1. CSV Data from pms_monthly_reports
    // ---------------------------
    let csvDataResults = {};
    const csvDataQuery = `
      SELECT *
      FROM public.pms_monthly_reports
      WHERE year = $1 AND month = $2
    `;
    const csvResult = await db.query(csvDataQuery, [year, month]);

    if (csvResult.rows.length > 0) {
      csvResult.rows.forEach((row) => {
        const indexName = row.pms_name || row["group"] || "Unknown";
        csvDataResults[indexName] = {
          group: row["group"] || row["Group"] || "Unknown",
          "1M": { value: row["1M"] ?? "-", date: "" },
          "3M": { value: row["3M"] ?? "-", date: "" },
          "6M": { value: row["6M"] ?? "-", date: "" },
          "1Y": { value: row["1Y"] ?? "-", date: "" },
          "2Y": { value: row["2Y"] ?? "-", date: "" },
          "3Y": { value: row["3Y"] ?? "-", date: "" },
          "4Y": { value: row["4Y"] ?? "-", date: "" },
          "5Y": { value: row["5Y"] ?? "-", date: "" },
          "Since Inception": { value: row["Since Inception"] ?? "-", date: "" },
          Drawdown: "-",
          MDD: "-",
        };
      });
    }

    // ---------------------------
    // 2. Calculate Returns
    // ---------------------------
    const indicesResult = await db.query(
      `SELECT DISTINCT indices FROM tblresearch_new_1`
    );
    const indices = indicesResult.rows.map((row) => row.indices);

    const periods = [
      { name: "1M", months: 1, years: 1 / 12 },
      { name: "3M", months: 3, years: 3 / 12 },
      { name: "6M", months: 6, years: 6 / 12 },
      { name: "1Y", months: 12, years: 1 },
      { name: "2Y", months: 24, years: 2 },
      { name: "3Y", months: 36, years: 3 },
      { name: "4Y", months: 48, years: 4 },
      { name: "5Y", months: 60, years: 5 },
    ];

    const results = {};

    for (const index of indices) {
      results[index] = {
        period: { startDate: lastDayPrevMonth, endDate: lastDayCurrMonth },
        returns: {},
      };

      for (const period of periods) {
        const startYear =
          numMonth <= period.months
            ? numYear - Math.floor((period.months - numMonth + 12) / 12)
            : numYear;
        const startMonth =
          numMonth <= period.months
            ? ((numMonth - period.months + 12) % 12) || 12
            : numMonth - period.months;
        const startDate = new Date(Date.UTC(startYear, startMonth, 0))
          .toISOString()
          .split("T")[0];

        const startQuery = `
          SELECT nav, date
          FROM tblresearch_new_1
          WHERE indices = $1 AND date <= $2
          ORDER BY date DESC
          LIMIT 1
        `;
        const startResults = await db.query(startQuery, [index, startDate]);

        const endQuery = `
          SELECT nav, date
          FROM tblresearch_new_1
          WHERE indices = $1 AND date <= $2
          ORDER BY date DESC
          LIMIT 1
        `;
        const endResults = await db.query(endQuery, [index, lastDayCurrMonth]);

        if (startResults.rows.length === 0 || endResults.rows.length === 0) {
          results[index].returns[period.name] = { value: "-", date: null };
          continue;
        }

        const startValue = startResults.rows[0].nav;
        const endValue = endResults.rows[0].nav;

        let returnValue;
        if (period.years < 1) {
          returnValue = (((endValue - startValue) / startValue) * 100).toFixed(
            2
          );
        } else {
          returnValue = (
            (Math.pow(endValue / startValue, 1 / period.years) - 1) *
            100
          ).toFixed(2);
        }

        results[index].returns[period.name] = {
          value: returnValue + "",
          startDate: startResults.rows[0].date,
          endDate: endResults.rows[0].date,
        };
      }

      // Since Inception
      const inceptionQuery = `
        SELECT nav, date
        FROM tblresearch_new_1
        WHERE indices = $1
        ORDER BY date ASC
        LIMIT 1
      `;
      const inceptionResults = await db.query(inceptionQuery, [index]);

      const endResults = await db.query(
        `
        SELECT nav, date
        FROM tblresearch_new_1
        WHERE indices = $1 AND date <= $2
        ORDER BY date DESC
        LIMIT 1
      `,
        [index, lastDayCurrMonth]
      );

      if (inceptionResults.rows.length && endResults.rows.length) {
        const startValue = inceptionResults.rows[0].nav;
        const endValue = endResults.rows[0].nav;
        const startDate = new Date(inceptionResults.rows[0].date);
        const endDate = new Date(endResults.rows[0].date);
        const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);

        let returnValue;
        if (years < 1) {
          returnValue = (((endValue - startValue) / startValue) * 100).toFixed(
            2
          );
        } else {
          returnValue = (
            (Math.pow(endValue / startValue, 1 / years) - 1) *
            100
          ).toFixed(2);
        }

        results[index].returns["Since Inception"] = {
          value: returnValue + "",
          startDate: inceptionResults.rows[0].date,
          endDate: endResults.rows[0].date,
        };
      } else {
        results[index].returns["Since Inception"] = { value: "-", date: null };
      }
    }

    // ✅ Always return JSON
    return Response.json(
      {
        calculationDates: { start: lastDayPrevMonth, end: lastDayCurrMonth },
        indices: results,
        csvData: csvDataResults,
        dataAsOf: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST handler:", error);
    return Response.json(
      { error: "Failed to calculate returns", details: error.message },
      { status: 500 }
    );
  }
}
