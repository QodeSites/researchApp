import { NextResponse } from 'next/server';
import db from "@/lib/db";
import { load } from 'cheerio';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bse_code = searchParams.get('bse_code');
  const symbol = searchParams.get('symbol');

  if (!bse_code && !symbol) {
    return NextResponse.json({ error: 'bse_code or symbol is required' }, { status: 400 });
  }

  let browser = null;

  try {
    console.log(`Fetching announcements for ${bse_code ? 'BSE code' : 'symbol'}: ${bse_code || symbol}`);

    // Determine query based on provided param
    let stockQuery, params;
    if (bse_code) {
      stockQuery = `
        SELECT company_name, nse_symbol, bse_code
        FROM stocks
        WHERE bse_code = $1
      `;
      params = [bse_code];
    } else {
      stockQuery = `
        SELECT company_name, nse_symbol, bse_code
        FROM stocks
        WHERE UPPER(nse_symbol) = UPPER($1)
      `;
      params = [symbol];
    }

    const stockResult = await db.query(stockQuery, params);
    console.log(`Stock query returned ${stockResult.rows.length} rows`);

    if (stockResult.rows.length === 0) {
      return NextResponse.json({ error: 'Stock not found for given BSE code or symbol' }, { status: 404 });
    }

    const stock = stockResult.rows[0];
    console.log(`Stock data:`, JSON.stringify(stock));
    
    if (!stock.bse_code) {
      console.log('ERROR: BSE code is missing/null');
      return NextResponse.json({ error: 'BSE code not found for this stock', stock }, { status: 400 });
    }

    const companySlug = stock.company_name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .split(/\s+/)
      .join('-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const urlSymbol = (stock.nse_symbol || '').toUpperCase();
    console.log(`URL Symbol check: nse_symbol="${stock.nse_symbol}", urlSymbol="${urlSymbol}"`);
    
    if (!urlSymbol) {
      console.log('ERROR: NSE symbol is missing/empty');
      return NextResponse.json({ error: 'NSE symbol not found for this stock', stock }, { status: 400 });
    }
    console.log(`Derived company slug: ${companySlug}, URL symbol: ${urlSymbol}`);
    
    const url = `https://www.bseindia.com/stock-share-price/${companySlug}/${urlSymbol}/${stock.bse_code}/corp-announcements/`;
    console.log(`Scraping URL: ${url}`);

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the div to load
    try {
      await page.waitForSelector('div.whitebox.marketstartarea', { timeout: 5000 });
      console.log('Market start area div found');
    } catch (err) {
      console.log('Market start area div not found within timeout');
      return NextResponse.json({ error: 'Market start area div not found on page' }, { status: 400 });
    }

    // Wait for Angular to render the data (wait for table with actual content)
    try {
      await page.waitForSelector('div.whitebox.marketstartarea table tbody tr', { timeout: 10000 });
      console.log('Announcements table found after Angular rendering');
    } catch (err) {
      console.log('Announcements table not found - may be empty');
    }

    // Add small delay to ensure Angular finishes rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the rendered HTML
    const html = await page.content();
    const $ = load(html);

    // Verify div exists
    const divFound = $('div.whitebox.marketstartarea').length > 0;
    if (!divFound) {
      return NextResponse.json({ error: 'Market start area div not found in rendered content' }, { status: 400 });
    }

    // Extract announcements from the nested table structure
    const announcements = [];
    
    // Updated selectors based on actual BSE HTML structure
    const possibleSelectors = [
      'div.whitebox.marketstartarea table tbody tr',
      'td#lblann table tbody tr',
      'div[ng-if*="loaded"] table tbody tr',
      'div.container-fluid table tbody tr'
    ];

    let tableFound = false;

    for (const selector of possibleSelectors) {
      const rows = $(selector);
      console.log(`Trying selector: ${selector}, found ${rows.length} rows`);

      rows.each((i, elem) => {
        const tds = $(elem).find('td');
        
        // Skip header rows or rows with too few columns
        if (tds.length < 2) return;

        const cells = tds.map((idx, cell) => $(cell).text().trim()).get();
        
        // Filter out empty rows
        if (cells.some(c => c.length > 0)) {
          tableFound = true;
          
          // Typical structure: date, subject, attachment
          const date = cells[0] || '';
          const subject = cells[1] || '';
          let attachment = null;

          // Look for attachment link in the row
          const attachLink = $(elem).find('a[href]').first();
          if (attachLink.length) {
            let href = attachLink.attr('href');
            if (href) {
              if (!href.startsWith('http')) {
                href = `https://www.bseindia.com${href.startsWith('/') ? '' : '/'}${href}`;
              }
              attachment = href;
            }
          }

          // Only push if we have at least date and subject
          if (date.length > 0 && subject.length > 0) {
            announcements.push({
              date,
              subject,
              attachment
            });
            console.log(`Found announcement: ${date} - ${subject}`);
          }
        }
      });

      if (tableFound && announcements.length > 0) {
        console.log(`Successfully extracted ${announcements.length} announcements with selector: ${selector}`);
        break;
      }
    }

    if (!tableFound) {
      console.log('No announcements table found in rendered HTML.');
      console.log('HTML snippet:', html.substring(0, 3000));
    }

    // Remove duplicates and filter valid entries
    const uniqueAnnouncements = announcements
      .filter((ann, index, self) =>
        index === self.findIndex(a => a.subject === ann.subject && a.date === ann.date)
      )
      .sort((a, b) => {
        // Try to parse dates, fallback to string comparison
        try {
          return new Date(b.date) - new Date(a.date);
        } catch {
          return 0;
        }
      })
      .slice(2, 52); // Skip first 2 announcements, then limit to 50

    console.log(`Returning ${uniqueAnnouncements.length} unique announcements (skipped first 2)`);

    // Export to JSON file
    const exportDir = path.join(process.cwd(), 'data', 'announcements');
    await fs.mkdir(exportDir, { recursive: true });
    const fileName = path.join(exportDir, `${companySlug}_${urlSymbol}_announcements.json`);
    await fs.writeFile(fileName, JSON.stringify(uniqueAnnouncements, null, 2));
    console.log(`Announcements exported to: ${fileName}`);

    return NextResponse.json({
      announcements: uniqueAnnouncements,
      exportedFile: fileName
    });
  } catch (error) {
    console.error('Error scraping announcements:', error);
    return NextResponse.json({ error: 'Failed to scrape announcements', details: error.message }, { status: 500 });
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
    }
  }
}