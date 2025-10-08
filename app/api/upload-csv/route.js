import db from '@/lib/db';

export async function POST(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }

    const { year, month, data } = req.body;
    console.log("Received data for upload:", { year, month, rowCount: data.length });

    if (!year || !month || !data || !Array.isArray(data)) {
        console.error("Invalid input:", req.body);
        return res.status(400).json({ message: 'Year, Month, and CSV data are required.' });
    }

    // Define expected columns
    const expectedColumns = [
      "Category",
      "PMS Name",
      "1M",
      "3M",
      "6M",
      "1Y",
      "2Y",
      "3Y",
      "4Y",
      "5Y",
      "Since Inception",
      "year",
      "month"
  ];
    // Validate data structure
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowKeys = Object.keys(row);

        // Check for unexpected or missing columns
        const missingColumns = expectedColumns.filter(col => !rowKeys.includes(col));
        const extraColumns = rowKeys.filter(col => !expectedColumns.includes(col));
        if (missingColumns.length > 0 || extraColumns.length > 0) {
            let errorMsg = `Row ${i + 1}: `;
            if (missingColumns.length > 0) errorMsg += `Missing columns: ${missingColumns.join(', ')}. `;
            if (extraColumns.length > 0) errorMsg += `Unexpected columns: ${extraColumns.join(', ')}. `;
            return res.status(400).json({ message: errorMsg });
        }

        // Check for at least one identifier
        console.log(row["Category"], row["PMS Name"]);
        if (!row["Group/Category"] && !row["PMS Name"]) {
            return res.status(400).json({ message: `Row ${i + 1}: Must provide at least one of 'Category', or 'PMS Name'.` });
        }

        // Validate performance columns
        const perfColumns = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "Since Inception"];
        for (const col of perfColumns) {
            const value = row[col]?.trim();
            if (value && value !== '-' && isNaN(parseFloat(value.replace('%', '')))) {
                return res.status(400).json({ message: `Row ${i + 1}, Column ${col}: Invalid numeric value '${value}'. Must be a number or '-'.` });
            }
        }
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Check for existing data
        const checkQuery = 'SELECT COUNT(*) FROM public.pms_monthly_reports WHERE year = $1 AND month = $2';
        const checkResult = await client.query(checkQuery, [year, month]);
        const count = parseInt(checkResult.rows[0].count, 10);
        if (count > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Data for this month and year already exists.' });
        }

        const insertQuery = `
            INSERT INTO public.pms_monthly_reports
            ("group", pms_name, "1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", since_inception, month, year, "4Y")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;

        for (let row of data) {
            const groupValue = row["Group"] || row["Category"] || null;
            const pmsName = row["PMS Name"] || row["Category"] || null;
            const value1M = row["1M"] && row["1M"] !== '-' ? parseFloat(row["1M"].replace('%', '')) : null;
            const value3M = row["3M"] && row["3M"] !== '-' ? parseFloat(row["3M"].replace('%', '')) : null;
            const value6M = row["6M"] && row["6M"] !== '-' ? parseFloat(row["6M"].replace('%', '')) : null;
            const value1Y = row["1Y"] && row["1Y"] !== '-' ? parseFloat(row["1Y"].replace('%', '')) : null;
            const value2Y = row["2Y"] && row["2Y"] !== '-' ? parseFloat(row["2Y"].replace('%', '')) : null;
            const value3Y = row["3Y"] && row["3Y"] !== '-' ? parseFloat(row["3Y"].replace('%', '')) : null;
            const value5Y = row["5Y"] && row["5Y"] !== '-' ? parseFloat(row["5Y"].replace('%', '')) : null;
            const valueSinceInception = row["Since Inception"] && row["Since Inception"] !== '-' ? parseFloat(row["Since Inception"].replace('%', '')) : null;
            const value4Y = row["4Y"] && row["4Y"] !== '-' ? parseFloat(row["4Y"].replace('%', '')) : null;

            await client.query(insertQuery, [
                groupValue,
                pmsName,
                value1M,
                value3M,
                value6M,
                value1Y,
                value2Y,
                value3Y,
                value5Y,
                valueSinceInception,
                month,
                year,
                value4Y
            ]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'CSV data inserted successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error inserting CSV data: ', error);
        res.status(500).json({ message: 'Internal server error while inserting CSV data.' });
    } finally {
        client.release();
    }
}