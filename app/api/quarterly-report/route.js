import db from "@/lib/db";

const API_BASE_URL =  process.env.API_BASE_URL || 'http://localhost:3001';
// const API_BASE_URL = 'http://localhost:3002';

const portfolioData = [
  { name: 'KARAN RAMESH SALECHA', nuvama_code: 'QFH0008', portfolio_value: 4137353.851 },
  { name: 'RISHABH RAMESHKUMAR NAHAR', nuvama_code: 'QFH0005', portfolio_value: 6163307.368 },
  { name: 'DIMPLE SUKHRAJ NAHAR', nuvama_code: 'QAW0007', portfolio_value: 10161079.48 },
  { name: 'PRIYANKA SHAILESH MITTLE', nuvama_code: 'QFH0007', portfolio_value: 4147224.721 },
  { name: 'PRITI JITEN GALA', nuvama_code: 'QAW0005', portfolio_value: 46413137.02 },
  { name: 'KAVAN VIVEK SEJPAL', nuvama_code: 'QFH0006', portfolio_value: 10099464.22 },
  { name: 'HARSHALI HIREN GALA', nuvama_code: 'QAW0001', portfolio_value: 5009955.406 },
  { name: 'AAKASH INDRU MIRCHANDANI', nuvama_code: 'QTF0001', portfolio_value: 4906448.847 },
  { name: 'AURUS ALPHA VENTURES LLP', nuvama_code: 'QFH0009', portfolio_value: 4182167.023 },
  { name: 'MAYURI MINISH GANDHI', nuvama_code: 'QFH0001', portfolio_value: 4124466.808 },
  { name: 'NATASHA KARAN SHAH', nuvama_code: 'QAW0002', portfolio_value: 3298948.565 },
  { name: 'JAYDEEP P NAIR', nuvama_code: 'QFH0003', portfolio_value: 3822303.338 },
  { name: 'HIREN ZAVERCHAND GALA', nuvama_code: 'QAW0003', portfolio_value: 25656979.75 },
  { name: 'NATASHA KARAN SHAH', nuvama_code: 'QFH0002', portfolio_value: 1254314.168 },
  { name: 'REKHA RAJESH KOTHARI', nuvama_code: 'QAW0004', portfolio_value: 8289299.252 },
  { name: 'CHETAN DHARNIDHAR DOSHI', nuvama_code: 'QAW0006', portfolio_value: 5028047.929 },
  { name: 'DIPTI VIRAL SHAH', nuvama_code: 'QFH0004', portfolio_value: 3986529.177 },
  { name: 'HIREN ZAVERCHAND GALA HUF', nuvama_code: 'QAW0008', portfolio_value: 10264149.01 },
  { name: 'SHOBHA KAMLESH BHIMANI', nuvama_code: 'QTF0002', portfolio_value: 8801457.119 },
  { name: 'TYC DIGITAL LLP', nuvama_code: 'QTF0003', portfolio_value: 5032077.125,initial_investment: 5000000, },
  { name: 'JITEN ZAVERCHAND GALA', nuvama_code: 'QAW00010', portfolio_value: 10284530.69 },
  { name: 'JITEN ZAVERCHAND GALA HUF', nuvama_code: 'QAW00011', portfolio_value: 5085555.98 },
  { name: 'GALA ZAVERCHAND TEJSHI HUF', nuvama_code: 'QAW00012', portfolio_value: 36119384.74 },
  { name: 'SANGITA YOGESH SHAH', nuvama_code: 'QTF0004', portfolio_value: 5028444.002 },
  { name: 'SANTOSH NARESH BAFNA', nuvama_code: 'QAW00014', portfolio_value: 5187262.98 },
  { name: 'VEDANG GOKUL PATEL', nuvama_code: 'QTF0005', portfolio_value: 10054277.48 },
  { name: 'ARNAV SHARDUL KAPADIA', nuvama_code: 'QTF0006', portfolio_value: 5697552.495 },
  { name: 'MAYURI MINISH GANDHI', nuvama_code: 'QTF0007', portfolio_value: 2027173.667 },
  { name: 'KARAN RAMESH SALECHA', nuvama_code: 'QTF0009', portfolio_value: 2547113.652 },
  { name: 'AURUS ALPHA VENTURES LLP', nuvama_code: 'QTF0008', portfolio_value: 489086.3171 },
  { name: 'RACHITA RISHI DALAL', nuvama_code: 'QTF00010', portfolio_value: 5095184.587 },
  { name: 'VIDHI RAJ JHAVERI', nuvama_code: 'QTF00011', portfolio_value: 5060159.546 },
  { name: 'VIRAL DILIP SHAH', nuvama_code: 'QTF00012', portfolio_value: 5172510.533 },
  { name: 'URVASHI JHA', nuvama_code: 'QFH00015', portfolio_value: 5077364.664 },
  { name: 'URVASHI JHA', nuvama_code: 'QTF00013', portfolio_value: 10184620.86 },
  { name: 'RAJESH PITTY HUF', nuvama_code: 'QFH00016', portfolio_value: 2746992.008 },
  { name: 'RAJESH PITTY HUF', nuvama_code: 'QTF00014', portfolio_value: 2628705.51 },
  { name: 'YOGITA RAKESH AGRAWAL', nuvama_code: 'QGF00014', portfolio_value: 5197419.173 },
  { name: 'RISHI RAJAN DALAL', nuvama_code: 'QTF00016', portfolio_value: 5123690.959 },
  { name: 'ADIT ASIT DHRUVA', nuvama_code: 'QTF00019', portfolio_value: 5788021.913 },
  { name: 'CHINTAN KISHORBHAI THAKKAR', nuvama_code: 'QAW00022', portfolio_value: 5175562.162 },
  { name: 'SUKHRAJ B NAHAR FAMILY TRUST', nuvama_code: 'QAW00030', portfolio_value: 21143962.2494984 },
  { name: 'SUKHRAJ B NAHAR FAMILY TRUST', nuvama_code: 'QFH00027', portfolio_value: 7286283.91125 },
  {
    name: 'VEDANT AJMERA',
    nuvama_code: '00005433',
    portfolio_value: 13063643,
    initial_investment: 6099305,
    since_inception: 13.9
  },
  {
    name: 'SANJEEV AJMERA',
    nuvama_code: '00005789',
    portfolio_value: 23987507,
    initial_investment: 9171096,
    since_inception: 14.51
  },
  {
    name: 'SHAILESH B MITTLE',
    nuvama_code: '00006449',
    portfolio_value: 22969718,
    initial_investment: 3453558,
    since_inception: 15.45
  },
  {
    name: 'AARTI MANISH CHADHA',
    nuvama_code: '00007205A',
    portfolio_value: 23066556,
    initial_investment: 21005524,
    since_inception: 10.33
  },
  {
    name: 'PRIYANKA SHAILESH MITTLE',
    nuvama_code: '00010662',
    portfolio_value: 123805231,
    initial_investment: 68312620,
    since_inception: 14.7
  },
  {
    name: 'TANVI JITEN GALA',
    nuvama_code: '00013809',
    portfolio_value: 7823324,
    initial_investment: 4760038,
    since_inception: 17.95
  },
  {
    name: 'MAYURI MINISH GANDHI',
    nuvama_code: '00014523',
    portfolio_value: 6358970,
    initial_investment: 2173897,
    since_inception: 24.18
  },
  {
    name: 'ARNAV SHARDUL KAPADIA',
    nuvama_code: '00015629',
    portfolio_value: 6139785,
    initial_investment: 2653194,
    since_inception: 27.55
  },
  {
    name: 'SAILESH BHAWARLAL NAHAR',
    nuvama_code: '00016031',
    portfolio_value: 17757276,
    initial_investment: 12273679,
    since_inception: 24.79
  },
  {
    name: 'RAJ ASHIT JHAVERI',
    nuvama_code: '00018244',
    portfolio_value: 8104554,
    initial_investment: 8125812,
    since_inception: 1.96
  },
  {
    name: 'KETAN SHIVAPRASAD DANAK',
    nuvama_code: '00020845',
    portfolio_value: 4338411,
    initial_investment: 4999469,
    since_inception: -13.22
  },
  {
    name: 'VEDIKA AJMERA',
    nuvama_code: '00020918',
    portfolio_value: 4534766,
    initial_investment: 5000000,
    since_inception: -9.3
  },
  {
    name: 'SIDHAANT ANIL MURARKA',
    nuvama_code: '00021523',
    portfolio_value: 9969314,
    initial_investment: 10000000,
    since_inception: -0.31
  }
];

const betaData = [
  { nuvama_code: '00005433', Beta: 1.56 },
  { nuvama_code: '00005789', Beta: 1.59 },
  { nuvama_code: '00006449', Beta: 1.60 },
  { nuvama_code: '00010662', Beta: 1.64 },
  { nuvama_code: '00013809', Beta: 1.57 },
  { nuvama_code: '00014523', Beta: 1.75 },
  { nuvama_code: '00015629', Beta: 1.53 },
  { nuvama_code: '00016031', Beta: 1.67 },
  { nuvama_code: '00018244', Beta: 1.65 },
  { nuvama_code: '00020845', Beta: 1.21 },
  { nuvama_code: '00020918', Beta: 0.75 },
  { nuvama_code: '00021523', Beta: 0.69 },
  { nuvama_code: '00007205A', Beta: 1.35 },
  { nuvama_code: 'QAW0001', Beta: 0.53 },
  { nuvama_code: 'QAW00010', Beta: 0.46 },
  { nuvama_code: 'QAW00011', Beta: 0.51 },
  { nuvama_code: 'QAW00012', Beta: 0.48 },
  { nuvama_code: 'QAW00014', Beta: 0.59 },
  { nuvama_code: 'QAW0002', Beta: 0.50 },
  { nuvama_code: 'QAW00022', Beta: 0.81 },
  { nuvama_code: 'QAW0003', Beta: 0.50 },
  { nuvama_code: 'QAW0004', Beta: 0.63 },
  { nuvama_code: 'QAW0005', Beta: 0.50 },
  { nuvama_code: 'QAW0006', Beta: 0.59 },
  { nuvama_code: 'QAW0007', Beta: 0.54 },
  { nuvama_code: 'QAW0008', Beta: 0.48 },
  { nuvama_code: 'QFH0001', Beta: 1.70 },
  { nuvama_code: 'QFH00015', Beta: 1.60 },
  { nuvama_code: 'QFH00016', Beta: 1.44 },
  { nuvama_code: 'QFH0002', Beta: 1.85 },
  { nuvama_code: 'QFH0003', Beta: 1.76 },
  { nuvama_code: 'QFH0004', Beta: 1.69 },
  { nuvama_code: 'QFH0005', Beta: 1.62 },
  { nuvama_code: 'QFH0006', Beta: 1.65 },
  { nuvama_code: 'QFH0007', Beta: 1.71 },
  { nuvama_code: 'QFH0008', Beta: 1.66 },
  { nuvama_code: 'QFH0009', Beta: 1.73 },
  { nuvama_code: 'QGF00014', Beta: 1.66 },
  { nuvama_code: 'QTF0001', Beta: 0.72 },
  { nuvama_code: 'QTF00010', Beta: 0.95 },
  { nuvama_code: 'QTF00011', Beta: 0.86 },
  { nuvama_code: 'QTF00012', Beta: 0.87 },
  { nuvama_code: 'QTF00013', Beta: 0.96 },
  { nuvama_code: 'QTF00014', Beta: 0.84 },
  { nuvama_code: 'QTF00016', Beta: 0.92 },
  { nuvama_code: 'QTF00019', Beta: 0.93 },
  { nuvama_code: 'QTF0002', Beta: 0.72 },
  { nuvama_code: 'QTF0003', Beta: 0.84 },
  { nuvama_code: 'QTF0004', Beta: 0.86 },
  { nuvama_code: 'QTF0005', Beta: 0.88 },
  { nuvama_code: 'QTF0006', Beta: 0.79 },
  { nuvama_code: 'QTF0007', Beta: 0.81 },
  { nuvama_code: 'QTF0008', Beta: 0.98 },
  { nuvama_code: 'QTF0009', Beta: 0.98 },
];

export default async function handler(req, res) {
  const username = req.query.username;
  const lowercaseUsername = username ? username.toLowerCase() : null;
  if (!username) {
    return res.status(400).json({ error: "Missing username parameter" });
  }

  function cleanAndFormatData(data, key = '') {
    if (key === 'nuvama_code' || key === 'clientcode' || key === 'nuvama_codes' || key === 'since_inception') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(item => cleanAndFormatData(item));
    } else if (data !== null && typeof data === "object") {
      const result = {};
      for (const k in data) {
        if (key === 'inceptionDatesByCode' && typeof data[k] === 'string') {
          result[k] = data[k];
        } else {
          result[k] = cleanAndFormatData(data[k], k);
        }
      }
      return result;
    } else {
      if (key === 'since_inception_date' || key === 'formatted_since_inception_date' || key === 'date' || key === 'inception_date') {
        return data;
      }
      if (valueIsInvalid(data)) {
        return "-";
      }
      if (typeof data === "number") {
        return data.toFixed(2);
      }
      if (typeof data === "string" && !isNaN(parseFloat(data)) && key !== 'nuvama_code') {
        return parseFloat(data).toFixed(2);
      }
      return data;
    }
  }

  function valueIsInvalid(value) {
    return (
      value === null ||
      value === undefined ||
      value === "nan" ||
      value === "NaN" ||
      (typeof value === "number" && isNaN(value))
    );
  }

  // Function to backfill missing dates with last available NAV
  function backfillNavData(navData, startDate, endDate) {
    if (!navData || navData.length === 0) return navData;

    const result = [];
    const dateMap = {};
    navData.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      dateMap[dateKey] = { nav: parseFloat(item.nav), isBackfilled: false };
    });

    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate).getTime();
    let lastNav = navData[0]?.nav || 0;
    let backfilledCount = 0;

    while (currentDate.getTime() <= endDateTime) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const isBackfilled = !dateMap[dateKey];
      const nav = isBackfilled ? lastNav : dateMap[dateKey].nav;
      result.push({ date: dateKey, nav, isBackfilled });
      if (isBackfilled) backfilledCount++;
      lastNav = nav;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Backfilled NAV data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}: ${result.length} points, ${backfilledCount} backfilled`);
    return result;
  }

  try {
    // Fetch portfolio_value from the hardcoded array
    const userPortfolioData = portfolioData.filter(
      row => row.name.toLowerCase() === lowercaseUsername
    );

    if (userPortfolioData.length === 0) {
      return res.status(404).json({ error: "No Nuvama Codes found for the given username" });
    }

    const nuvamaCodes = userPortfolioData.map(row => {
      let code = row.nuvama_code.trim();
      if (!code.match(/^(QGF|QFH|QTF|QAW)/) && /^\d+$/.test(code)) {
        code = `0000000${parseInt(code)}`.slice(-8);
      }
      return code;
    });

    // Fetch initial_investment from portfolio_details table
    const getInitialInvestmentQuery = `
      SELECT nuvama_code::text AS nuvama_code, initial_investment 
      FROM pms_clients_tracker.portfolio_details 
      WHERE name = $1
    `;
    const initialInvestmentResult = await db.query(getInitialInvestmentQuery, [username]);

    // Combine portfolio_value from array with initial_investment from database
    // Combine portfolio_value from array with initial_investment from array or database
    const portfolioRows = userPortfolioData.map(arrayRow => {
      const dbRow = initialInvestmentResult.rows.find(
        dbRow => dbRow.nuvama_code.trim() === arrayRow.nuvama_code.trim()
      );
      // Use initial_investment from portfolioData if available, otherwise use database value
      const initialInvestment = arrayRow.initial_investment !== undefined
        ? parseFloat(arrayRow.initial_investment) || 0
        : (dbRow ? parseFloat(dbRow.initial_investment) || 0 : 0);
      return {
        nuvama_code: arrayRow.nuvama_code,
        portfolio_value: arrayRow.portfolio_value,
        initial_investment: initialInvestment,
      };
    });

    // Group portfolio details by strategy
    const portfolioByStrategy = {};
    const getStrategyCode = (nuvamaCode) => {
      if (nuvamaCode.match(/^(QFH|QTF|QAW)/)) {
        return nuvamaCode.substring(0, 3).toUpperCase();
      }
      return 'QGF';
    };
    const strategiesMap = {
      QGF: 'Qode Growth Fund',
      QFH: 'Qode Future Horizon',
      QTF: 'Qode Tactical Fund',
      QAW: 'Qode All Weather',
    };

    portfolioRows.forEach(row => {
      const { portfolio_value, initial_investment, nuvama_code } = row;
      const strategyCode = getStrategyCode(nuvama_code);
      const strategyName = strategiesMap[strategyCode] || 'Qode Growth Fund';

      if (!portfolioByStrategy[strategyName]) {
        portfolioByStrategy[strategyName] = {
          total_portfolio_value: 0,
          total_initial_investment: 0,
          details: [],
        };
      }

      portfolioByStrategy[strategyName].total_portfolio_value += parseFloat(portfolio_value) || 0;
      portfolioByStrategy[strategyName].total_initial_investment += parseFloat(initial_investment) || 0;
      portfolioByStrategy[strategyName].details.push({
        nuvama_code,
        portfolio_value: parseFloat(portfolio_value) || 0,
        initial_investment: parseFloat(initial_investment) || 0,
      });
    });

    const getInceptionDatesQuery = `
      SELECT TRIM(nuvama_code) AS nuvama_code, MIN(date) AS inception_date
      FROM pms_clients_tracker.daily_nav
      WHERE TRIM(nuvama_code) IN (${nuvamaCodes.map((_, i) => `$${i + 1}`).join(', ')})
      GROUP BY TRIM(nuvama_code)
    `;
    const inceptionDatesResult = await db.query(getInceptionDatesQuery, nuvamaCodes);
    const inceptionDatesByCode = {};
    inceptionDatesResult.rows.forEach(row => {
      try {
        const rawDateStr = row.inception_date;
        if (!rawDateStr || typeof rawDateStr !== 'string') {
          console.warn(`Invalid or missing inception_date for ${row.nuvama_code}: ${rawDateStr}`);
          inceptionDatesByCode[row.nuvama_code] = null;
          return;
        }

        let date = new Date(rawDateStr);
        if (isNaN(date.getTime())) {
          const dateParts = rawDateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateParts) {
            date = new Date(parseInt(dateParts[1]), parseInt(dateParts[2]) - 1, parseInt(dateParts[3]));
          }
        }
        if (isNaN(date.getTime())) {
          const altParts = rawDateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
          if (altParts) {
            date = new Date(parseInt(altParts[3]), parseInt(altParts[2]) - 1, parseInt(altParts[1]));
          }
        }

        if (date && !isNaN(date.getTime())) {
          inceptionDatesByCode[row.nuvama_code] = date.toISOString();
        } else {
          console.error(`Could not parse date for ${row.nuvama_code}: ${rawDateStr}`);
          inceptionDatesByCode[row.nuvama_code] = null;
        }
      } catch (error) {
        console.error(`Error processing inception date for code ${row.nuvama_code}:`, error);
        inceptionDatesByCode[row.nuvama_code] = null;
      }
    });

    const targetStartDate = new Date('2024-12-31');
    const targetEndDate = new Date('2025-03-31');
    const formattedEndDate = '2025-03-31';
    const threeMonthsAgo = new Date('2024-12-31');
    const sixMonthsAgo = new Date('2024-09-30');
    const oneYearAgo = new Date('2024-03-31');
    const twoYearsAgo = new Date('2023-03-31');
    const fiveYearsAgo = new Date('2020-03-31');
    const sinceInceptionDate = new Date('2024-01-01');

    const calculateReturn = (navData, startDate, endDate, inceptionDate, isSinceInception = false, hardcodedSinceInception = null) => {
      if (!navData || navData.length === 0) {
        return '-';
      }

      navData.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (isSinceInception) {
        startDate = new Date(inceptionDate);
      } else {
        const inception = new Date(inceptionDate);
        if (startDate < inception) {
          return '-';
        }
      }

      let startNav = null;
      let startRecord = navData
        .filter(item => new Date(item.date) <= startDate)
        .pop();
      if (startRecord && !isNaN(parseFloat(startRecord.nav))) {
        startNav = parseFloat(startRecord.nav);
      }

      let endNav = null;
      let endRecord = navData
        .filter(item => new Date(item.date) <= endDate)
        .pop();
      if (endRecord && !isNaN(parseFloat(endRecord.nav))) {
        endNav = parseFloat(endRecord.nav);
      }

      if (startNav === null || endNav === null || startNav <= 0 || isNaN(endNav)) {
        return '-';
      }

      // If hardcoded since_inception is provided and this is for since_inception
      if (isSinceInception && hardcodedSinceInception !== null && !isNaN(hardcodedSinceInception)) {
        return hardcodedSinceInception.toFixed(2);
      }

      // Calculate the time difference in years
      const timeDiffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const years = timeDiffDays / 365.25;

      // Use CAGR for periods >= 1 year, simple return for shorter periods
      if (years >= 1) {
        const cagr = (Math.pow(endNav / startNav, 1 / years) - 1) * 100;
        return cagr.toFixed(2);
      } else {
        const simpleReturn = ((endNav / startNav - 1) * 100);
        return simpleReturn.toFixed(2);
      }
    };

    let dailyNavData = [];
    const dailyNavByNuvamaCode = {};
    const navStartDates = {};

    const getDailyNavQuery = `
      SELECT date, TRIM(nuvama_code) AS nuvama_code, nav::numeric AS nav
      FROM pms_clients_tracker.daily_nav 
      WHERE TRIM(nuvama_code) IN (${nuvamaCodes.map((_, i) => `$${i + 1}`).join(', ')})
      AND date <= '2025-04-01'
      ORDER BY date ASC
    `;
    const dailyNavResult = await db.query(getDailyNavQuery, nuvamaCodes);
    dailyNavData = dailyNavResult.rows;

    // Deduplicate dailyNavData by nuvama_code and date
    const navDataMap = {};
    dailyNavData.forEach(item => {
      const key = `${item.nuvama_code}-${item.date}`;
      if (!navDataMap[key] || new Date(item.date) > new Date(navDataMap[key].date)) {
        navDataMap[key] = {
          date: item.date,
          nuvama_code: item.nuvama_code,
          nav: parseFloat(item.nav),
        };
      }
    });
    dailyNavData = Object.values(navDataMap);

    console.log(`Total dailyNavData points after deduplication: ${dailyNavData.length}`);

    dailyNavData.forEach(item => {
      if (!dailyNavByNuvamaCode[item.nuvama_code]) {
        dailyNavByNuvamaCode[item.nuvama_code] = [];
      }
      dailyNavByNuvamaCode[item.nuvama_code].push({
        date: item.date,
        nav: parseFloat(item.nav),
      });
      const itemDate = new Date(item.date);
      if (!navStartDates[item.nuvama_code] || itemDate < new Date(navStartDates[item.nuvama_code])) {
        navStartDates[item.nuvama_code] = itemDate.toISOString();
      }
    });

    Object.keys(dailyNavByNuvamaCode).forEach(nuvamaCode => {
      console.log(`NAV points for ${nuvamaCode}: ${dailyNavByNuvamaCode[nuvamaCode].length}`);
      if (getStrategyCode(nuvamaCode) === 'QTF') {
        const navData = dailyNavByNuvamaCode[nuvamaCode];
        navData.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (navData.length > 0) {
          navData[0].nav = 10;
        }
      }
    });

    let indicesData = { data: {} };
    let bse500HistoricalData = null;
    let qfhHistoricalData = null;
    let qtfHistoricalData = null;
    let qawHistoricalData = null;

    try {
      const bse500Response = await fetch(`${API_BASE_URL}/api/getIndices?indices=BSE500&startDate=2024-01-01&endDate=${formattedEndDate}`);
      if (bse500Response.ok) {
        bse500HistoricalData = await bse500Response.json();
        // Backfill BSE 500 TRI data
        if (bse500HistoricalData?.data?.length > 0) {
          bse500HistoricalData.data = backfillNavData(bse500HistoricalData.data, targetStartDate, targetEndDate);
        }
      } else {
        console.error('Failed to fetch BSE 500 historical data:', bse500Response.status, bse500Response.statusText);
      }

      const indicesToFetch = ['QFH', 'QTF', 'QAW'];
      for (const index of indicesToFetch) {
        const response = await fetch(`${API_BASE_URL}/api/getIndices?indices=${index}&startDate=2024-01-01&endDate=${formattedEndDate}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.data?.length > 0) {
            // Backfill fund strategy data
            data.data = backfillNavData(data.data, targetStartDate, targetEndDate);
            switch (index) {
              case 'QFH':
                qfhHistoricalData = data;
                break;
              case 'QTF':
                if (data.data.length > 0) {
                  data.data.sort((a, b) => new Date(a.date) - new Date(b.date));
                  data.data[0].nav = 10;
                }
                qtfHistoricalData = data;
                break;
              case 'QAW':
                qawHistoricalData = data;
                break;
            }
          }
        } else {
          console.error(`Failed to fetch ${index} historical data:`, response.status, response.statusText);
        }
      }

      const indicesResponse = await fetch(`${API_BASE_URL}/api/indices`);
      if (indicesResponse.ok) {
        indicesData = await indicesResponse.json();
      } else {
        console.error('Failed to fetch regular indices data:', indicesResponse.status, indicesResponse.statusText);
      }
    } catch (error) {
      console.error('Error fetching indices data:', error);
    }

    const quarterlyByStrategy = {};
    const quarterlyData = [];

    nuvamaCodes.forEach(code => {
      const strategyCode = getStrategyCode(code);
      const strategyName = strategiesMap[strategyCode] || 'Qode Growth Fund';
      const inceptionDate = new Date(inceptionDatesByCode[code]) || targetStartDate;
      const navData = dailyNavByNuvamaCode[code] || [];

      // Find the hardcoded since_inception value, if available
      const portfolioEntry = portfolioData.find(row => row.nuvama_code === code);
      const hardcodedSinceInception = portfolioEntry?.since_inception !== undefined
        ? parseFloat(portfolioEntry.since_inception)
        : null;

      if (!quarterlyByStrategy[strategyName]) {
        quarterlyByStrategy[strategyName] = [];
      }

      const item = {
        nuvama_code: code,
        m3: calculateReturn(navData, threeMonthsAgo, targetEndDate, inceptionDate),
        m6: calculateReturn(navData, sixMonthsAgo, targetEndDate, inceptionDate),
        y1: calculateReturn(navData, oneYearAgo, targetEndDate, inceptionDate),
        y2: calculateReturn(navData, twoYearsAgo, targetEndDate, inceptionDate),
        y5: calculateReturn(navData, fiveYearsAgo, targetEndDate, inceptionDate),
        since_inception: calculateReturn(navData, inceptionDate, targetEndDate, inceptionDate, true, hardcodedSinceInception),
        inception_date: !isNaN(inceptionDate.getTime()) ? inceptionDate.toISOString() : targetStartDate.toISOString()
      };

      quarterlyByStrategy[strategyName].push(item);
      quarterlyData.push(item);
    });
    const fundStrategies = [
      { name: 'Qode Future Horizon (Fund)', data: qfhHistoricalData?.data, inception: targetStartDate },
      { name: 'Qode Tactical Fund (Fund)', data: qtfHistoricalData?.data, inception: targetStartDate },
      { name: 'Qode All Weather (Fund)', data: qawHistoricalData?.data, inception: targetStartDate },
      { name: 'BSE 500 TRI', data: bse500HistoricalData?.data, inception: sinceInceptionDate },
    ];

    fundStrategies.forEach(strategy => {
      const { name, data, inception } = strategy;
      quarterlyByStrategy[name] = [{
        m3: calculateReturn(data, threeMonthsAgo, targetEndDate, inception),
        m6: calculateReturn(data, sixMonthsAgo, targetEndDate, inception),
        y1: calculateReturn(data, oneYearAgo, targetEndDate, inception),
        y2: calculateReturn(data, twoYearsAgo, targetEndDate, inception),
        y5: calculateReturn(data, fiveYearsAgo, targetEndDate, inception),
        since_inception: calculateReturn(data, inception, targetEndDate, inception, true),
        inception_date: inception.toISOString(),
      }];
    });

    const dailyNavByStrategy = {};
    Object.keys(dailyNavByNuvamaCode).forEach(nuvamaCode => {
      const strategyCode = getStrategyCode(nuvamaCode);
      const strategyName = strategiesMap[strategyCode] || 'Qode Growth Fund';
      const startDate = targetStartDate;

      if (!dailyNavByStrategy[strategyName]) {
        dailyNavByStrategy[strategyName] = [];
      }

      const dateNavMap = {};
      dailyNavByNuvamaCode[nuvamaCode].forEach(item => {
        const itemDate = new Date(item.date);
        const dateKey = itemDate.toISOString().split('T')[0];
        if (itemDate >= startDate && itemDate <= new Date(targetEndDate.getTime() + 86400000)) {
          if (!dateNavMap[dateKey]) {
            dateNavMap[dateKey] = {
              date: dateKey,
              nav: 0,
              count: 0,
            };
          }
          dateNavMap[dateKey].nav += item.nav;
          dateNavMap[dateKey].count += 1;
        }
      });

      const aggregatedData = Object.values(dateNavMap).map(item => ({
        date: item.date,
        nav: item.nav / item.count,
      }));

      dailyNavByStrategy[strategyName] = [
        ...dailyNavByStrategy[strategyName],
        ...aggregatedData,
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    const strategyStartDates = {};
    Object.keys(dailyNavByStrategy).forEach(strategyName => {
      const isQTF = strategyName === 'Qode Tactical Fund';
      const startDate = targetStartDate;
      strategyStartDates[strategyName] = startDate;

      dailyNavByStrategy[strategyName].sort((a, b) => new Date(a.date) - new Date(b.date));
      let filteredData = dailyNavByStrategy[strategyName].filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= new Date(targetEndDate.getTime() + 86400000);
      });

      if (filteredData.length > 0) {
        const lastDataDate = new Date(filteredData[filteredData.length - 1].date);
        const targetEndDateStr = targetEndDate.toISOString().split('T')[0];
        if (lastDataDate.toISOString().split('T')[0] < targetEndDateStr) {
          const lastNav = filteredData[filteredData.length - 1].nav;
          filteredData.push({
            date: targetEndDateStr,
            nav: lastNav,
          });
          console.log(`Extended ${strategyName} NAV to ${targetEndDateStr} with NAV: ${lastNav}`);
        }
      }

      if (filteredData.length > 0) {
        if (!isQTF) {
          const baseValue = filteredData[0].nav;
          if (baseValue > 0) {
            filteredData = filteredData.map(item => ({
              date: item.date,
              nav: (item.nav / baseValue) * 10,
            }));
          }
        }
      }

      const uniqueDates = {};
      dailyNavByStrategy[strategyName] = filteredData.filter(item => {
        if (uniqueDates[item.date]) {
          return false;
        }
        uniqueDates[item.date] = true;
        return true;
      });
      console.log(`NAV points for ${strategyName} after filtering: ${dailyNavByStrategy[strategyName].length}`);
    });

    const indexNavByStrategy = {};

    if (bse500HistoricalData?.data?.length > 0) {
      let filteredData = bse500HistoricalData.data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= targetStartDate && itemDate <= new Date(targetEndDate.getTime() + 86400000);
      });

      if (filteredData.length > 0) {
        filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
        const baseValue = parseFloat(filteredData[0].nav);
        if (baseValue > 0) {
          indexNavByStrategy['BSE 500 TRI'] = filteredData.map(item => ({
            date: new Date(item.date).toISOString().split('T')[0],
            nav: (parseFloat(item.nav) / baseValue) * 10,
          }));
        }
      }
    }

    const historicalDataMap = {
      'Qode Future Horizon': qfhHistoricalData,
      'Qode Future Horizon (Fund)': qfhHistoricalData,
      'Qode Tactical Fund': qtfHistoricalData,
      'Qode Tactical Fund (Fund)': qtfHistoricalData,
      'Qode All Weather': qawHistoricalData,
      'Qode All Weather (Fund)': qawHistoricalData,
    };

    Object.keys(historicalDataMap).forEach(strategyName => {
      const historicalData = historicalDataMap[strategyName];
      const isQTF = strategyName.includes('Qode Tactical Fund');
      const startDate = targetStartDate;

      if (historicalData?.data?.length > 0) {
        let filteredData = historicalData.data.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= new Date(targetEndDate.getTime() + 86400000);
        });

        if (filteredData.length > 0) {
          filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

          if (isQTF) {
            const dateMap = {};
            filteredData.forEach(item => {
              const dateKey = new Date(item.date).toISOString().split('T')[0];
              dateMap[dateKey] = {
                date: dateKey,
                nav: parseFloat(item.nav),
              };
            });
            filteredData = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
          }

          const baseValue = parseFloat(filteredData[0].nav);
          const navScale = isQTF ? 1 : (baseValue > 0 ? 10 / baseValue : 1);
          indexNavByStrategy[strategyName] = filteredData.map(item => ({
            date: new Date(item.date).toISOString().split('T')[0],
            nav: parseFloat(item.nav) * navScale,
          }));
        }
      }
    });

    Object.keys(dailyNavByStrategy).forEach(strategyName => {
      const startDate = targetStartDate;
      if (!indexNavByStrategy[strategyName]) {
        indexNavByStrategy[strategyName] = dailyNavByStrategy[strategyName];
      } else {
        const mergedData = [];
        const dates = new Set([
          ...dailyNavByStrategy[strategyName].map(item => item.date),
          ...indexNavByStrategy[strategyName].map(item => item.date),
        ]);

        Array.from(dates).sort().forEach(date => {
          const dateObj = new Date(date);
          if (dateObj >= startDate && dateObj <= new Date(targetEndDate.getTime() + 86400000)) {
            const dailyNavItem = dailyNavByStrategy[strategyName].find(item => item.date === date);
            const indexNavItem = indexNavByStrategy[strategyName].find(item => item.date === date);
            if (dailyNavItem) {
              mergedData.push({ date, nav: dailyNavItem.nav });
            } else if (indexNavItem) {
              mergedData.push({ date, nav: indexNavItem.nav });
            }
          }
        });

        indexNavByStrategy[strategyName] = mergedData;
      }
    });

    if (indexNavByStrategy['BSE 500 TRI']?.length > 0) {
      dailyNavByStrategy['BSE 500 TRI'] = indexNavByStrategy['BSE 500 TRI'].map(item => ({
        date: item.date,
        nav: item.nav,
      }));
    }

    const drawdownByStrategy = {};

    try {
      Object.keys(indexNavByStrategy).forEach(strategyName => {
        const strategyNavData = indexNavByStrategy[strategyName];
        const isQTF = strategyName.includes('Qode Tactical Fund');

        let strategyStartDate;
        if (strategyName === 'BSE 500 TRI') {
          strategyStartDate = targetStartDate;
        } else {
          const strategyCode = Object.keys(strategiesMap).find(
            key => strategiesMap[key] === strategyName.replace(' (Fund)', '')
          ) || 'QGF';
          const relatedNuvamaCodes = nuvamaCodes.filter(
            code => getStrategyCode(code) === strategyCode
          );
          const inceptionDates = relatedNuvamaCodes
            .map(code => new Date(inceptionDatesByCode[code]))
            .filter(date => !isNaN(date));

          strategyStartDate = inceptionDates.length > 0
            ? new Date(Math.min(...inceptionDates)) < targetStartDate
              ? targetStartDate
              : new Date(Math.min(...inceptionDates))
            : targetStartDate;
        }

        const navDataSource = isQTF
          ? dailyNavByStrategy[strategyName] || []
          : strategyNavData;

        const navByDate = {};
        navDataSource.forEach(item => {
          const itemDate = new Date(item.date);
          if (itemDate >= strategyStartDate && itemDate <= new Date(targetEndDate.getTime() + 86400000) && !isNaN(parseFloat(item.nav))) {
            navByDate[item.date] = parseFloat(item.nav);
          }
        });

        const sortedDates = Object.keys(navByDate).sort((a, b) => new Date(a) - new Date(b));
        const navValues = sortedDates.map(date => navByDate[date]);

        if (navValues.length === 0) {
          drawdownByStrategy[strategyName] = [];
          return;
        }

        const drawdownData = [];
        let peakValue = navValues[0];
        let peakDate = sortedDates[0];

        for (let i = 0; i < navValues.length; i++) {
          const currentNav = navValues[i];
          const currentDate = sortedDates[i];

          if (currentNav > peakValue) {
            peakValue = currentNav;
            peakDate = currentDate;
          }

          const drawdownValue = peakValue > 0 ? ((currentNav - peakValue) / peakValue) * 100 : 0;

          drawdownData.push({
            date: currentDate,
            drawdown: drawdownValue.toFixed(2),
            peak_date: peakDate,
            peak_value: peakValue.toFixed(2),
            current_value: currentNav.toFixed(2),
          });
        }

        drawdownByStrategy[strategyName] = drawdownData;
      });
    } catch (error) {
      console.error(`Error in drawdown calculation:`, error);
      drawdownByStrategy['error'] = 'Failed to calculate drawdowns';
    }

    // Aggregate NAV data by strategy from dailyNavByNuvamaCode for invested strategies
    const aggregatedNavByStrategy = {};
    Object.keys(dailyNavByNuvamaCode).forEach(nuvamaCode => {
      const navArray = dailyNavByNuvamaCode[nuvamaCode];
      console.log('last nav by nuvama code', navArray?.length > 0 ? navArray[navArray.length - 1].date : 'No data');
      const strategyCode = getStrategyCode(nuvamaCode);
      const strategyName = strategiesMap[strategyCode] || 'Qode Growth Fund';

      if (!aggregatedNavByStrategy[strategyName]) {
        aggregatedNavByStrategy[strategyName] = [];
      }
      console.log(`Processing NAV data for ${strategyName} (${nuvamaCode})`);

      const navData = dailyNavByNuvamaCode[nuvamaCode];

      const dateNavMap = {};
      navData.forEach(item => {
        const itemDate = new Date(item.date);
        const dateKey = itemDate.toISOString().split('T')[0];
        if (itemDate >= targetStartDate && itemDate <= new Date(targetEndDate.getTime() + 86400000)) {
          if (!dateNavMap[dateKey]) {
            dateNavMap[dateKey] = {
              date: dateKey,
              nav: 0,
              count: 0,
            };
          }
          dateNavMap[dateKey].nav += parseFloat(item.nav);
          dateNavMap[dateKey].count += 1;
        }
      });

      let aggregatedData = Object.values(dateNavMap).map(item => ({
        date: item.date,
        nav: item.nav / item.count,
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      // Extend to targetEndDate if necessary
      if (aggregatedData.length > 0) {
        const lastDataDate = new Date(aggregatedData[aggregatedData.length - 1].date);
        const targetEndDateStr = targetEndDate.toISOString().split('T')[0];
        if (lastDataDate.toISOString().split('T')[0] < targetEndDateStr) {
          const lastNav = aggregatedData[aggregatedData.length - 1].nav;
          aggregatedData.push({
            date: targetEndDateStr,
            nav: lastNav,
          });
          console.log(`Extended aggregated NAV for ${strategyName} to ${targetEndDateStr} with NAV: ${lastNav}`);
        }
      }

      aggregatedNavByStrategy[strategyName] = aggregatedData;
      console.log(`Aggregated NAV points for ${strategyName}: ${aggregatedNavByStrategy[strategyName].length}`);
    });

    // Map fund strategy data to a consistent format
    const fundStrategyNavData = {
      'Qode Future Horizon (Fund)': qfhHistoricalData?.data?.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        nav: parseFloat(item.nav),
      })) || [],
      'Qode Tactical Fund (Fund)': qtfHistoricalData?.data?.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        nav: parseFloat(item.nav),
      })) || [],
      'Qode All Weather (Fund)': qawHistoricalData?.data?.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        nav: parseFloat(item.nav),
      })) || [],
      'BSE 500 TRI': bse500HistoricalData?.data?.map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        nav: parseFloat(item.nav),
      })) || [],
    };

    // Validate and log fund strategy NAV data
    Object.keys(fundStrategyNavData).forEach(strategyName => {
      const navData = fundStrategyNavData[strategyName];
      if (navData.length > 0) {
        navData.sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstDate = navData[0].date;
        const lastDate = navData[navData.length - 1].date;
        console.log(`${strategyName} NAV Data: ${navData.length} points, First: ${firstDate}, Last: ${lastDate}`);
        if (lastDate !== targetEndDate.toISOString().split('T')[0]) {
          console.warn(`${strategyName} does not include targetEndDate (${targetEndDate.toISOString().split('T')[0]}), last date is ${lastDate}`);
        }
      } else {
        console.warn(`${strategyName} has no NAV data`);
      }
    });

    // Apply QTF initial NAV adjustment
    if (fundStrategyNavData['Qode Tactical Fund (Fund)'].length > 0) {
      fundStrategyNavData['Qode Tactical Fund (Fund)'].sort((a, b) => new Date(a.date) - new Date(b.date));
      fundStrategyNavData['Qode Tactical Fund (Fund)'][0].nav = 10;
    }

    // Strategy metrics calculation
    const strategyMetrics = {};
    const riskFreeRate = 0.065;

    const investedStrategies = new Set(
      nuvamaCodes.map(code => strategiesMap[getStrategyCode(code)] || 'Qode Growth Fund')
    );

    investedStrategies.add('BSE 500 TRI');

    // Calculate BSE 500 daily returns for beta calculation
    let bse500DailyReturns = [];
    let bse500MeanReturn = 0;
    try {
      if (fundStrategyNavData['BSE 500 TRI'].length > 1) {
        let navData = fundStrategyNavData['BSE 500 TRI']
          .filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= targetStartDate && itemDate <= new Date(targetEndDate.getTime() + 86400000);
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (navData.length > 0) {
          const baseValue = Number(navData[0].nav);
          if (baseValue > 0) {
            navData = navData.map(item => ({
              date: item.date,
              nav: (Number(item.nav) / baseValue) * 10,
            }));
          }
        }

        bse500DailyReturns = [];
        for (let i = 1; i < navData.length; i++) {
          const prev = Number(navData[i - 1].nav);
          const curr = Number(navData[i].nav);
          if (isNaN(prev) || isNaN(curr)) continue;
          const dailyReturn = (curr - prev) / prev;
          bse500DailyReturns.push(dailyReturn);
        }

        bse500MeanReturn = bse500DailyReturns.length > 0
          ? bse500DailyReturns.reduce((sum, val) => sum + val, 0) / bse500DailyReturns.length
          : 0;
        console.log(`BSE 500 TRI daily returns: ${bse500DailyReturns.length}`);
      }
    } catch (error) {
      console.error('Error calculating BSE 500 TRI returns:', error);
    }

    // Process metrics for each strategy
    try {
      [...investedStrategies].forEach(strategyName => {
        const isQTF = strategyName.includes('Qode Tactical Fund');
        let navData;

        if (!strategyName.includes('(Fund)') && !strategyName.includes('BSE 500')) {
          navData = aggregatedNavByStrategy[strategyName] || [];
        } else {
          navData = fundStrategyNavData[strategyName] || [];
        }

        // Fetch quarterly return
        let quarterlyReturn;
        if (!strategyName.includes('(Fund)') && !strategyName.includes('BSE 500')) {
          const strategyQuarterlyData = quarterlyByStrategy[strategyName] || [];
          const aggregatedQuarterlyReturn = strategyQuarterlyData.length > 0
            ? strategyQuarterlyData
              .filter(item => item.m3 !== '-')
              .map(item => parseFloat(item.m3) / 100)
              .reduce((sum, val, _, arr) => sum + val / arr.length, 0)
            : 0;
          quarterlyReturn = aggregatedQuarterlyReturn;
        } else {
          const quarterlyData = quarterlyByStrategy[strategyName]?.[0];
          quarterlyReturn = quarterlyData?.m3 !== '-' ? parseFloat(quarterlyData.m3) / 100 : 0;
        }

        // Filter NAV data to the target period
        console.log('targetEndDate:', targetEndDate.toISOString());
        const adjustedEndDate = new Date(targetEndDate.getTime() + 86400000);
        const adjustedEndDateStr = adjustedEndDate.toISOString().split('T')[0];
        console.log('Adjusted End Date:', adjustedEndDateStr);
        navData = navData
          .filter(item => {
            const itemDateStr = item.date;
            const itemDate = new Date(itemDateStr);
            return itemDate >= targetStartDate && itemDate <= adjustedEndDate;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log(`NAV points for ${strategyName} before normalization: ${navData.length}`);
        if (navData.length > 0) {
          console.log('Last NAV Entry:', navData[navData.length - 1]);
        }

        // Normalize NAVs to start at 10 for non-QTF strategies
        if (!isQTF && navData.length > 0) {
          const baseValue = Number(navData[0].nav);
          if (baseValue > 0) {
            navData = navData.map(item => ({
              date: item.date,
              nav: (Number(item.nav) / baseValue) * 10,
            }));
          }
        }

        // Handle QTF uniquely to ensure no duplicate dates
        let cleanedNavData = navData;
        if (isQTF) {
          const dateMap = {};
          navData.forEach(item => {
            const dateKey = item.date;
            dateMap[dateKey] = {
              date: dateKey,
              nav: parseFloat(item.nav),
            };
          });
          cleanedNavData = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        }
        console.log(`Cleaned NAV points for ${strategyName}: ${cleanedNavData.length}`);

        // Log NAV dates for debugging
        if (strategyName === 'Qode Future Horizon' || strategyName === 'BSE 500 TRI') {
          if (cleanedNavData.length > 0) {
            console.log(`${strategyName} NAV Dates: First: ${cleanedNavData[0].date}, Last: ${cleanedNavData[cleanedNavData.length - 1].date}, Total: ${cleanedNavData.length}`);
            console.log(`${strategyName} Full NAV Dates:`, cleanedNavData.map(item => item.date));
          } else {
            console.warn(`${strategyName} has no NAV data after cleaning`);
          }
        }

        // Initialize metrics with defaults if insufficient data
        if (cleanedNavData.length < 2) {
          strategyMetrics[strategyName] = {
            standard_deviation: '-',
            maximum_drawdown: '-',
            sharpe_ratio: '-',
            beta: strategyName === 'BSE 500 TRI' ? '1.00' : '-',
            quarterly_return: (quarterlyReturn * 100).toFixed(2) + '%',
          };
          return;
        }

        // Calculate daily returns
        const dailyReturns = [];
        for (let i = 1; i < cleanedNavData.length; i++) {
          const prevNav = Number(cleanedNavData[i - 1].nav);
          const currNav = Number(cleanedNavData[i].nav);
          if (isNaN(prevNav) || isNaN(currNav) || prevNav <= 0) continue;
          const dailyReturn = (currNav - prevNav) / prevNav;
          dailyReturns.push(dailyReturn);
        }
        console.log(`Daily returns for ${strategyName}: ${dailyReturns.length}`);

        // Calculate standard deviation (quarterly, not annualized)
        const meanDailyReturn = dailyReturns.length > 0
          ? dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length
          : 0;
        const variance = dailyReturns.length > 1
          ? dailyReturns.reduce((sum, val) => sum + Math.pow(val - meanDailyReturn, 2), 0) / (dailyReturns.length - 1)
          : 0;
        const stdDevDaily = Math.sqrt(variance);
        const quarterlyStdDev = stdDevDaily;

        // Calculate Sharpe ratio (quarterly)
        const sharpeRatio = quarterlyStdDev > 0 ? (quarterlyReturn - (riskFreeRate / 4)) / quarterlyStdDev : 0;

        // Calculate beta
        // Use precalculated beta for invested strategies, default to 1.0 for BSE 500 TRI
        let beta = strategyName === 'BSE 500 TRI' ? 1.0 : null;
        if (strategyName !== 'BSE 500 TRI' && !strategyName.includes('(Fund)')) {
          // Find all nuvama_codes for this strategy
          const strategyCode = Object.keys(strategiesMap).find(
            key => strategiesMap[key] === strategyName
          ) || 'QGF';
          const relatedNuvamaCodes = nuvamaCodes.filter(
            code => getStrategyCode(code) === strategyCode
          );

          // Aggregate beta values for the strategy
          const betaValues = relatedNuvamaCodes
            .map(code => {
              const betaEntry = betaData.find(entry => entry.nuvama_code === code);
              return betaEntry ? parseFloat(betaEntry.Beta) : null;
            })
            .filter(val => val !== null && !isNaN(val));

          // Calculate average beta if multiple codes exist
          beta = betaValues.length > 0
            ? betaValues.reduce((sum, val) => sum + val, 0) / betaValues.length
            : null;
        } else if (strategyName.includes('(Fund)')) {
          // For fund-level strategies, use the beta of the corresponding strategy
          const baseStrategyName = strategyName.replace(' (Fund)', '');
          const strategyCode = Object.keys(strategiesMap).find(
            key => strategiesMap[key] === baseStrategyName
          ) || 'QGF';
          const relatedNuvamaCodes = nuvamaCodes.filter(
            code => getStrategyCode(code) === strategyCode
          );

          const betaValues = relatedNuvamaCodes
            .map(code => {
              const betaEntry = betaData.find(entry => entry.nuvama_code === code);
              return betaEntry ? parseFloat(betaEntry.Beta) : null;
            })
            .filter(val => val !== null && !isNaN(val));

          beta = betaValues.length > 0
            ? betaValues.reduce((sum, val) => sum + val, 0) / betaValues.length
            : null;
        }

        // Use drawdown data from drawdownByStrategy
        const drawdowns = drawdownByStrategy[strategyName]?.map(item => parseFloat(item.drawdown)) || [];
        const mdd = drawdowns.length > 0 ? Math.min(...drawdowns).toFixed(2) + '%' : '-';

        strategyMetrics[strategyName] = {
          standard_deviation: quarterlyStdDev > 0 ? (quarterlyStdDev * 100).toFixed(2) + '%' : '-',
          maximum_drawdown: mdd,
          sharpe_ratio: sharpeRatio !== 0 ? sharpeRatio.toFixed(2) : '-',
          beta: beta !== null && !isNaN(beta) ? beta.toFixed(2) : '-',
          quarterly_return: (quarterlyReturn * 100).toFixed(2) + '%',
        };
      });
    } catch (error) {
      console.error('Error calculating strategy metrics:', error);
      strategyMetrics['error'] = 'Failed to calculate metrics';
    }

    const getCpaReportQuery = `
      SELECT 
        client_code AS clientcode,
        sectorname,
        astclsname,
        SUM(asset_percentage) AS percentassets
      FROM pms_clients_tracker.pms_cpa_report
      WHERE client_code IN (${nuvamaCodes.map((_, i) => `$${i + 1}`).join(', ')})
      GROUP BY client_code, sectorname, astclsname
      ORDER BY client_code, sectorname, astclsname
    `;
    let cpaReportData = { sector_allocation: [], asset_allocation: [] };
    try {
      const cpaReportResult = await db.query(getCpaReportQuery, nuvamaCodes);
      const rawCpaReportData = cpaReportResult.rows.map(row => ({
        CLIENTCODE: row.clientcode,
        SECTORNAME: row.sectorname
          ? row.sectorname.replace(/\(including NBFCs\)/i, 'including NBFCs').trim()
          : row.sectorname,
        ASTCLSNAME: row.astclsname,
        PERCENTASSETS: parseFloat(row.percentassets) || 0,
        AssetClass: row.astclsname && (row.astclsname === 'Cash and Equivalent' || row.astclsname === 'Debt') ? 'Cash'
          : row.astclsname && (row.astclsname === 'Futures' || row.astclsname === 'Options') ? 'Derivatives'
            : 'Equity',
      }));

      // Sector Allocation
      // Sector Allocation
      // Sector Allocation
      const sectorGroupByClient = rawCpaReportData.reduce((acc, item) => {
        if (!acc[item.CLIENTCODE]) {
          acc[item.CLIENTCODE] = {};
        }
        if (!acc[item.CLIENTCODE][item.SECTORNAME]) {
          acc[item.CLIENTCODE][item.SECTORNAME] = {
            CLIENTCODE: item.CLIENTCODE,
            SECTORNAME: item.SECTORNAME,
            PERCENTASSETS: 0,
          };
        }
        acc[item.CLIENTCODE][item.SECTORNAME].PERCENTASSETS += item.PERCENTASSETS;
        return acc;
      }, {});

      Object.keys(sectorGroupByClient).forEach(clientCode => {
        const sectors = Object.values(sectorGroupByClient[clientCode]);
        const totalPercentage = sectors.reduce((sum, sector) => sum + sector.PERCENTASSETS, 0);
        const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 1;

        // First, scale all percentages
        sectors.forEach(sector => {
          sector.PERCENTASSETS = Number((sector.PERCENTASSETS * scaleFactor).toFixed(2));
        });

        const sortedSectors = sectors.sort((a, b) => b.PERCENTASSETS - a.PERCENTASSETS);
        const topSectors = sortedSectors.slice(0, 6);

        // Calculate the sum of top sectors
        const topSectorsSum = topSectors.reduce((sum, sector) => sum + sector.PERCENTASSETS, 0);

        // Calculate the remainder accurately
        const otherPercentage = Number((100 - topSectorsSum).toFixed(2));

        // Add "Other" category if there are more than 6 sectors
        if (sortedSectors.length > 6) {
          topSectors.push({
            CLIENTCODE: clientCode,
            SECTORNAME: 'Other',
            PERCENTASSETS: otherPercentage,
          });
        }
        // If there are exactly 6 or fewer sectors, ensure they sum to 100
        else if (Math.abs(topSectorsSum - 100) > 0.01) {
          // Add the rounding difference to the largest sector
          topSectors[0].PERCENTASSETS = Number((topSectors[0].PERCENTASSETS + (100 - topSectorsSum)).toFixed(2));
        }

        cpaReportData.sector_allocation.push(...topSectors);
      });

      // Asset Allocation
      const assetGroupByClient = rawCpaReportData.reduce((acc, item) => {
        if (!acc[item.CLIENTCODE]) {
          acc[item.CLIENTCODE] = {};
        }
        const assetClass =
          item.AssetClass === 'Cash' || item.AssetClass === 'Derivatives'
            ? 'Cash and Derivatives'
            : item.AssetClass;
        if (!acc[item.CLIENTCODE][assetClass]) {
          acc[item.CLIENTCODE][assetClass] = {
            CLIENTCODE: item.CLIENTCODE,
            AssetClass: assetClass,
            PERCENTASSETS: 0,
          };
        }
        acc[item.CLIENTCODE][assetClass].PERCENTASSETS += item.PERCENTASSETS;
        return acc;
      }, {});

      const assetAllocationSet = new Set();
      cpaReportData.asset_allocation = [];
      Object.keys(assetGroupByClient).forEach(clientCode => {
        const assets = Object.values(assetGroupByClient[clientCode]);
        const totalPercentage = assets.reduce((sum, asset) => sum + asset.PERCENTASSETS, 0);
        const scaleFactor = totalPercentage > 0 ? 100 / totalPercentage : 1;

        assets.forEach(asset => {
          asset.PERCENTASSETS = Number((asset.PERCENTASSETS * scaleFactor).toFixed(2));
        });

        const sortedAssets = assets.sort((a, b) => b.PERCENTASSETS - a.PERCENTASSETS);
        const otherPercentage = Number((100 - sortedAssets.reduce((sum, asset) => sum + asset.PERCENTASSETS, 0)).toFixed(2));

        if (sortedAssets.length > 3) {
          sortedAssets.push({
            CLIENTCODE: clientCode,
            AssetClass: 'Other',
            PERCENTASSETS: otherPercentage,
          });
        }

        sortedAssets.forEach(asset => {
          const key = `${asset.CLIENTCODE}-${asset.AssetClass}-${asset.PERCENTASSETS}`;
          if (!assetAllocationSet.has(key)) {
            assetAllocationSet.add(key);
            cpaReportData.asset_allocation.push(asset);
          }
        });
      });
    } catch (error) {
      console.error('Error processing CPA report:', error);
      cpaReportData = { sector_allocation: [], asset_allocation: [], error: 'Failed to process CPA report' };
    }

    const response = {
      nuvama_codes: nuvamaCodes,
      inceptionDatesByCode: inceptionDatesByCode,
      quarterly_report_by_strategy: quarterlyByStrategy,
      quarterly_report: quarterlyData,
      daily_nav_by_strategy: dailyNavByStrategy,
      index_nav_by_strategy: indexNavByStrategy,
      drawdown_by_strategy: drawdownByStrategy,
      risk_metrics: strategyMetrics,
      since_inception_date: Object.values(inceptionDatesByCode).sort()[0] || null,
      formatted_since_inception_date: Object.values(inceptionDatesByCode)
        .sort()[0]
        ?.split('T')[0] || '2025-01-01',
      bse500_since_inception_data: indexNavByStrategy['BSE 500 TRI']
        ? {
          data: indexNavByStrategy['BSE 500 TRI'].map(item => ({
            date: item.date,
            nav: item.nav,
          })),
        }
        : null,
      cpa_report: cpaReportData,
      portfolio_by_strategy: portfolioByStrategy,
    };
    res.status(200).json(cleanAndFormatData(response));
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}