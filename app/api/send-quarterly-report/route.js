import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // 1. Fetch client data from quarterly-report API
    const apiUrl = `http://localhost:3002/api/quarterly-report?username=${encodeURIComponent(username)}`;
    const reportDataResponse = await fetch(apiUrl);

    if (!reportDataResponse.ok) {
      const errorData = await reportDataResponse.json();
      return res.status(reportDataResponse.status).json({ error: errorData.error || 'Failed to fetch client data' });
    }

    const clientData = await reportDataResponse.json();

    // 2. Generate personalized PDF report
    const pdfBytes = await generatePDF(username, clientData);

    // 3. Return PDF directly to the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Qode_Quarterly_Report_Q1_2025_${username.replace(/\s/g, '_')}.pdf`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function generatePDF(username, clientData) {
  const templatePath = path.resolve(process.cwd(), 'public/templates/quarterly_report_template.pdf');
  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page1 = pages[0];
  page1.drawText(`Exclusively for ${username}`, {
    x: 50,
    y: 100,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0)
  });

  const page2 = pages[1];
  const pmsNumbers = clientData.nuvama_codes.join(' & ');
  page2.drawText(`PMS Number: ${pmsNumbers}`, {
    x: 50,
    y: 700,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  });

  const page3 = pages[2];
  
  const { quarterly_report_by_strategy = {}, strategy_metrics = {} } = clientData;
  console.log("Client Data:", clientData);

  let yPosition = 600;

  Object.keys(quarterly_report_by_strategy).forEach(strategy => {
    const strategyData = quarterly_report_by_strategy[strategy][0] || {};
    page3.drawText(strategy, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    });

    page3.drawRectangle({
        x: 50,
        y: 700,
        width: 300,
        height: 30,
        borderColor: rgb(1, 0, 0),
        borderWidth: 1,
      });
      

    page3.drawText(`Q1: ${strategyData.m3 || 'NA'}%, 6M: ${strategyData.m6 || 'NA'}%, 1Y: ${strategyData.y1 || 'NA'}%, 3Y: ${strategyData.y2 || 'NA'}%`, {
      x: 150,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    yPosition -= 20;
  });

  const page4 = pages[3];
  yPosition = 600;

  Object.keys(strategy_metrics).forEach(strategy => {
    const metrics = strategy_metrics[strategy];
    page4.drawText(strategy, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    });
    
    page4.drawText(`StdDev: ${metrics.standard_deviation}, MaxDD: ${metrics.maximum_drawdown}, Sharpe: ${metrics.sharpe_ratio}, Beta: ${metrics.beta}`, {
      x: 150,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0)
    });

    yPosition -= 20;
  });

  return await pdfDoc.save();
}
