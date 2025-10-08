import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import CoverPage from 'components/Quarterly-Report-Template/CoverPage';
import PortfolioDetails from 'components/Quarterly-Report-Template/PortfolioDetails';
import DrawdownPage from 'components/Quarterly-Report-Template/DrawdownPage';
import AllocationPage from 'components/Quarterly-Report-Template/AllocationPage';
import FundPerformancePage from 'components/Quarterly-Report-Template/FundLevelPerformance';
import DisclaimerPage from 'components/Quarterly-Report-Template/Disclaimer';
import FundManagerPage from 'components/Quarterly-Report-Template/FundManagers';
import PortfolioCoverPage from 'components/Quarterly-Report-Template/CoverPage2';
import { PDFDocument } from 'pdf-lib';
import PortfolioValues from 'components/Quarterly-Report-Template/PortfolioValues';


const API_BASE_URL =  process.env.API_BASE_URL || 'http://localhost:3001';
// const API_BASE_URL = 'http://localhost:3002';

export default async function handler(req, res) {
  const { username, sendEmail = false, format = 'pdf', email = '', password = '' } = req.query;

  function properCase(str) {
    if (!str) return null;
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  const capitalizedUsername = username 
  ? (() => {
      if (username === 'TYC DIGITAL LLP') return 'TYC Digital LLP';
      if (username === 'KRISHNAN MAHADEVAN IYER HUF') return 'Krishnan Mahadevan Iyer HUF';
      if (username.includes('TYC') || username.includes('HUF')) return username;
      return properCase(username);
    })()
  : null;

if (!username) {
  return res.status(400).json({ error: 'Username is required' });
}

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    // const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${API_BASE_URL}/api/quarterly-report?username=${encodeURIComponent(username)}`);
    if (!response.ok) throw new Error('Failed to fetch client data');
    const clientData = await response.json();

    const safeClientData = {
      ...clientData,
      nuvama_codes: Array.isArray(clientData.nuvama_codes) ? clientData.nuvama_codes : [],
      since_inception_date: clientData.inceptionDatesByCode,
      quarterly_report_by_strategy:
        clientData.quarterly_report_by_strategy && typeof clientData.quarterly_report_by_strategy === 'object'
          ? clientData.quarterly_report_by_strategy
          : {},
      daily_nav_by_strategy: clientData.daily_nav_by_strategy || {},
      index_nav_by_strategy: clientData.index_nav_by_strategy || {},
      bse500_since_inception_data: clientData.bse500_since_inception_data || {},
      drawdown_by_strategy: clientData.drawdown_by_strategy || {},
      risk_metrics: clientData.risk_metrics || {},
      cpa_report: clientData.cpa_report || { sector_allocation: [], asset_allocation: [] },
      portfolio_by_strategy: clientData.portfolio_by_strategy || {},
    };


    const isSingleQGFCode = safeClientData.nuvama_codes.length === 1 && safeClientData.nuvama_codes[0].startsWith('000');

    const cssFilePath = path.join(process.cwd(), 'pages', 'index.css');
    const tailwindCSS = fs.readFileSync(cssFilePath, 'utf8');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${tailwindCSS}
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .page { page-break-after: always; width: 210mm; height: 297mm; overflow: hidden; }
          .chart-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            margin-bottom: 20px;
          }
          .chart-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .allocation-section {
            margin-top: 20px;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0/dist/chartjs-plugin-datalabels.min.js"></script>
      </head>
      <body>
        <div class="page">${renderToStaticMarkup(<CoverPage username={capitalizedUsername} nuvama_codes={safeClientData.nuvama_codes} />)}</div>
        <div class="page">${renderToStaticMarkup(<PortfolioCoverPage username={capitalizedUsername} />)}</div>
        <div class="page" id="portfolio-values">${renderToStaticMarkup(<PortfolioValues portfolio_by_strategy={safeClientData.portfolio_by_strategy} username={capitalizedUsername} nuvama_code={safeClientData.nuvama_codes} />)}</div>
        <div class="page" id="portfolio-details">${renderToStaticMarkup(<PortfolioDetails username={capitalizedUsername} quarterly_report_by_strategy={safeClientData.quarterly_report_by_strategy} daily_nav_by_strategy={safeClientData.daily_nav_by_strategy} bse500_since_inception_data={safeClientData.bse500_since_inception_data} since_inception_date={safeClientData.inceptionDatesByCode} />)}</div>
        <div class="page" id="drawdown-page">${renderToStaticMarkup(<DrawdownPage username={capitalizedUsername} risk_metrics={safeClientData.risk_metrics} drawdown_by_strategy={safeClientData.drawdown_by_strategy} nuvama_codes={safeClientData.nuvama_codes} />)}</div>
        <!-- Page 6: Allocation Page (conditional) -->
        ${!isSingleQGFCode ? `<div class="page" data-page="6" id="allocation-page">
          ${renderToStaticMarkup(<AllocationPage username={capitalizedUsername} cpa_report={safeClientData.cpa_report} nuvama_codes={safeClientData.nuvama_codes} pageNumber={6} />)}
        </div>` : ''}
        <!-- Page 6 or 7: Fund Performance Page -->
        <div class="page" data-page="${isSingleQGFCode ? '6' : '7'}" id="fund-performance">
          ${renderToStaticMarkup(<FundPerformancePage username={capitalizedUsername} quarterly_report_by_strategy={safeClientData.quarterly_report_by_strategy} index_nav_by_strategy={safeClientData.index_nav_by_strategy} pageNumber={isSingleQGFCode ? 6 : 7} />)}
        </div>
        <!-- Page 7 or 8: Fund Manager Page -->
        <div class="page" data-page="${isSingleQGFCode ? '7' : '8'}">
          ${renderToStaticMarkup(<FundManagerPage username={capitalizedUsername} pageNumber={isSingleQGFCode ? 7 : 8} />)}
        </div>
        <!-- Page 8 or 9: Disclaimer Page -->
        <div class="page" data-page="${isSingleQGFCode ? '8' : '9'}">
          ${renderToStaticMarkup(<DisclaimerPage username={capitalizedUsername} pageNumber={isSingleQGFCode ? 8 : 9} />)}
        </div>

        <script>
  // Load DM Sans font
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  // Register DM Sans as default font for Chart.js
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size = 12;

  // Portfolio Details Chart (unchanged)
  const dailyNavByStrategy = ${JSON.stringify(safeClientData.daily_nav_by_strategy)};
  const bse500Data = ${JSON.stringify(safeClientData.bse500_since_inception_data)};
  const strategies = Object.keys(dailyNavByStrategy);

  const allDates = new Set();
  strategies.forEach(strategy => {
    dailyNavByStrategy[strategy].forEach(item => allDates.add(item.date));
  });
  if (bse500Data && bse500Data.data && Array.isArray(bse500Data.data)) {
    bse500Data.data.forEach(item => allDates.add(item.date));
  }
  const sortedDates = Array.from(allDates).sort();

  const colors = {
    'Qode Future Horizon': '#925a38',
    'Qode Tactical Fund': '#d1a47b',
    'Qode Growth Fund': '#fee9d6',
    'Qode All Weather': '#808080',
    'Other': '#A0A0A0',
    'BSE 500 TRI': '#404040'
  };

  const portfolioDatasets = strategies.map(strategy => {
    const navByDate = {};
    dailyNavByStrategy[strategy].forEach(item => {
      navByDate[item.date] = (navByDate[item.date] || 0) + parseFloat(item.nav);
    });
    const data = sortedDates.map(date => navByDate[date] || null);
    return {
      label: strategy,
      data: data,
      borderColor: colors[strategy] || '#A0A0A0',
      backgroundColor: (colors[strategy] || '#A0A0A0') + '33',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    };
  });

  if (bse500Data && bse500Data.data && Array.isArray(bse500Data.data) && bse500Data.data.length > 0) {
    const bseNavByDate = {};
    bse500Data.data.forEach(item => {
      if (item.date && item.nav) {
        bseNavByDate[item.date] = parseFloat(item.nav);
      }
    });
    const bseData = sortedDates.map(date => bseNavByDate[date] || null);
    portfolioDatasets.push({
      label: 'BSE 500 TRI',
      data: bseData,
      borderColor: colors['BSE 500 TRI'],
      backgroundColor: colors['BSE 500 TRI'] + '33',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    });
  }

  const portfolioChartData = {
    labels: sortedDates.map(date => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })),
    datasets: portfolioDatasets,
  };

  const portfolioChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + (context.raw ? context.raw.toFixed(2) : '-');
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        grid: { display: false },
        ticks: {
          maxTicksLimit: 5,
          color: '#000',
          rotation: 90,
          align: 'start',
          font: { size: 12 },
          autoSkip: true,
        },
      },
      y: {
        title: { display: true, text: 'NAV' },
        grid: { display: false },
        ticks: { callback: (value) => value.toFixed(2) },
      },
    },
  };

  console.log('Creating Portfolio Details chart');
  const portfolioChartContainer = document.querySelector('#portfolio-details .h-64');
  if (portfolioChartContainer) {
    const portfolioCtx = document.createElement('canvas');
    portfolioCtx.id = 'portfolioChart';
    portfolioCtx.style.height = '256px';
    portfolioCtx.style.width = '100%';
    portfolioChartContainer.innerHTML = '';
    portfolioChartContainer.appendChild(portfolioCtx);
    new Chart(portfolioCtx, {
      type: 'line',
      data: portfolioChartData,
      options: portfolioChartOptions,
    });
  } else {
    console.error('Portfolio chart container not found');
  }

  // Drawdown Chart
  const drawdownByStrategy = ${JSON.stringify(safeClientData.drawdown_by_strategy)};
  const drawdownStrategies = Object.keys(dailyNavByStrategy);

  const drawdownDates = new Set();
  drawdownStrategies.forEach(strategy => {
    if (drawdownByStrategy[strategy]) {
      drawdownByStrategy[strategy].forEach(item => drawdownDates.add(item.date));
    }
  });
  if (bse500Data && bse500Data.data && Array.isArray(bse500Data.data)) {
    bse500Data.data.forEach(item => drawdownDates.add(item.date));
  }
  const sortedDrawdownDates = Array.from(drawdownDates).sort();

  const drawdownColors = {
    'Qode Future Horizon': '#925a38',
    'Qode Tactical Fund': '#d1a47b',
    'Qode Growth Fund': '#fee9d6',
    'Qode All Weather': '#808080',
    'Other': '#A0A0A0',
    'BSE 500 TRI': '#404040'
  };

  const drawdownDatasets = drawdownStrategies.map(strategy => {
    if (drawdownByStrategy[strategy]) {
      const drawdownByDate = {};
      drawdownByStrategy[strategy].forEach(item => {
        drawdownByDate[item.date] = parseFloat(item.drawdown);
      });
      const data = sortedDrawdownDates.map(date => drawdownByDate[date] !== undefined ? drawdownByDate[date] : null);
      return {
        label: strategy,
        data: data,
        borderColor: drawdownColors[strategy] || '#A0A0A0',
        backgroundColor: (drawdownColors[strategy] || '#A0A0A0') + '33',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      };
    }
    return null;
  }).filter(dataset => dataset !== null);

  if (bse500Data && bse500Data.data && Array.isArray(bse500Data.data) && bse500Data.data.length > 0) {
    const bseDrawdownByDate = {};
    if (drawdownByStrategy['BSE 500 TRI']) {
      drawdownByStrategy['BSE 500 TRI'].forEach(item => {
        bseDrawdownByDate[item.date] = parseFloat(item.drawdown);
      });
      const bseData = sortedDrawdownDates.map(date => bseDrawdownByDate[date] !== undefined ? bseDrawdownByDate[date] : null);
      drawdownDatasets.push({
        label: 'BSE 500 TRI',
        data: bseData,
        borderColor: drawdownColors['BSE 500 TRI'],
        backgroundColor: colors['BSE 500 TRI'] + '33',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      });
    }
  }

  const drawdownChartData = {
    labels: sortedDrawdownDates.map(date => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })),
    datasets: drawdownDatasets,
  };

  // Update drawdown chart x-axis ticks
const drawdownChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function(context) {
          return context.dataset.label + ': ' + (context.raw !== null ? context.raw.toFixed(2) + '%' : '-');
        }
      }
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Date' },
      grid: { display: false },
      ticks: {
        maxTicksLimit: 5,
        color: '#000',
        rotation: 90,
        align: 'start',
        font: { size: 12 },
        autoSkip: true,
      },
    },
    y: {
      title: { display: true, text: 'Drawdown (%)' },
      ticks: {
        callback: (value) => value.toFixed(2) + '%',
        stepSize: 5
      },
      grid: { display: false },
      suggestedMin: -20,
      suggestedMax: 5
    },
  },
};

  console.log('Creating Drawdown chart');
  const drawdownChartContainer = document.querySelector('#drawdown-page .h-64');
  if (drawdownChartContainer) {
    const drawdownCtx = document.createElement('canvas');
    drawdownCtx.id = 'drawdownChart';
    drawdownCtx.style.height = '256px';
    drawdownCtx.style.width = '100%';
    drawdownChartContainer.innerHTML = '';
    drawdownChartContainer.appendChild(drawdownCtx);
    new Chart(drawdownCtx, {
      type: 'line',
      data: drawdownChartData,
      options: drawdownChartOptions,
    });
  } else {
    console.error('Drawdown chart container not found');
  }

  // Fund Performance Chart
  const indexNavByStrategy = ${JSON.stringify(safeClientData.index_nav_by_strategy)};
  const fundPerformanceStrategies = [
    'Qode Future Horizon',
    'Qode Tactical Fund',
    'Qode Growth Fund',
    'Qode All Weather',
    'BSE 500 TRI'
  ];

  const fundPerformanceDates = new Set();
  Object.values(indexNavByStrategy).forEach(strategyData => {
    if (Array.isArray(strategyData)) {
      strategyData.forEach(item => {
        if (item.date) fundPerformanceDates.add(item.date);
      });
    }
  });
  
  if (fundPerformanceDates.size === 0) {
    const today = new Date();
    fundPerformanceDates.add(today.toISOString().split('T')[0]);
  }
  const sortedFundPerformanceDates = Array.from(fundPerformanceDates).sort();

  const fundPerformanceColors = {
    'Qode Future Horizon': '#925a38',
    'Qode Tactical Fund': '#d1a47b',
    'Qode Growth Fund': '#fee9d6',
    'Qode All Weather': '#808080',
    'BSE 500 TRI': '#404040'
  };

  const fundPerformanceDatasets = fundPerformanceStrategies.map(strategy => {
    const navByDate = {};
    const strategyData = indexNavByStrategy[strategy] || [];
    strategyData.forEach(item => {
      if (item.date && item.nav) {
        navByDate[item.date] = parseFloat(item.nav);
      }
    });
    const data = sortedFundPerformanceDates.map(date => navByDate[date] !== undefined ? navByDate[date] : null);
    return {
      label: strategy,
      data: data,
      borderColor: fundPerformanceColors[strategy] || '#A0A0A0',
      backgroundColor: (fundPerformanceColors[strategy] || '#A0A0A0') + '33',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    };
  });

  const fundPerformanceChartData = {
    labels: sortedFundPerformanceDates.map(date => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })),
    datasets: fundPerformanceDatasets,
  };

  const fundPerformanceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function(context) {
          return context.dataset.label + ': ' + (context.raw ? context.raw.toFixed(2) : '-');
        }
      }
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Date' },
      grid: { display: false },
      ticks: {
        maxTicksLimit: 5,
        color: '#000',
        rotation: 90,
        align: 'start',
        font: { size: 12 },
        autoSkip: true,
      },
    },
    y: {
      title: { display: true, text: 'NAV' },
      grid: { display: false },
      ticks: { callback: (value) => value.toFixed(2) },
      beginAtZero: true
    },
  },
};

  console.log('Creating Fund Performance chart with data:', fundPerformanceChartData);
  const fundPerformanceChartContainer = document.querySelector('#fund-performance .h-64');
  if (fundPerformanceChartContainer) {
    const fundPerformanceCtx = document.createElement('canvas');
    fundPerformanceCtx.id = 'fundPerformanceChart';
    fundPerformanceCtx.style.height = '256px';
    fundPerformanceCtx.style.width = '100%';
    fundPerformanceChartContainer.innerHTML = '';
    fundPerformanceChartContainer.appendChild(fundPerformanceCtx);
    new Chart(fundPerformanceCtx, {
      type: 'line',
      data: fundPerformanceChartData,
      options: fundPerformanceChartOptions,
    });
  } else {
    console.error('Fund Performance chart container not found');
  }

 const cpaReport = ${JSON.stringify(safeClientData.cpa_report)};
const nuvamaCodes = ${JSON.stringify(safeClientData.nuvama_codes)};

// Utility function to convert string to title case
const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const strategyMapping = {
  'QTF': 'Qode Tactical Fund',
  'QAW': 'Qode All Weather',
  'QGF': 'Qode Growth Fund',
  'QFH': 'Qode Future Horizon'
};

const clientStrategies = Array.isArray(nuvamaCodes)
  ? nuvamaCodes.map(code => {
      const prefix = code.slice(0, 3);
      return {
        code: code,
        strategyName: strategyMapping[prefix] || "Unknown_" + code,
        prefix: prefix
      };
    })
  : [];

const sectorStrategies = clientStrategies.filter(s => ['QGF', 'QFH'].includes(s.prefix));
const assetStrategies = clientStrategies.filter(s => ['QTF', 'QAW'].includes(s.prefix));

// Process sector allocation data
const sectorDataByStrategy = {};
cpaReport.sector_allocation.forEach(item => {
  const strategy = clientStrategies.find(s => s.code === item.CLIENTCODE);
  const strategyName = strategy ? strategy.strategyName : "Unknown_" + item.CLIENTCODE;
  if (['Qode Growth Fund', 'Qode Future Horizon'].includes(strategyName)) {
    if (!sectorDataByStrategy[strategyName]) sectorDataByStrategy[strategyName] = [];
    sectorDataByStrategy[strategyName].push({
      label: item.SECTORNAME,
      value: parseFloat(item.PERCENTASSETS)
    });
  }
});

// Process asset allocation data
const assetDataByStrategy = {};
cpaReport.asset_allocation.forEach(item => {
  const strategy = clientStrategies.find(s => s.code === item.CLIENTCODE);
  const strategyName = strategy ? strategy.strategyName : "Unknown_" + item.CLIENTCODE;
  if (['Qode Tactical Fund', 'Qode All Weather'].includes(strategyName)) {
    if (!assetDataByStrategy[strategyName]) assetDataByStrategy[strategyName] = [];
    assetDataByStrategy[strategyName].push({
      label: item.AssetClass,
      value: parseFloat(item.PERCENTASSETS)
    });
  }
});

// Ensure each strategy's allocation sums to exactly 100%
Object.keys(sectorDataByStrategy).forEach(strategy => {
  const data = sectorDataByStrategy[strategy];
  const sum = data.reduce((total, item) => total + item.value, 0);
  
  if (Math.abs(sum - 100) > 0.01) {
    // Add rounding difference to the largest allocation
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const difference = 100 - sum;
    sortedData[0].value = Number((sortedData[0].value + difference).toFixed(2));
  }
});

Object.keys(assetDataByStrategy).forEach(strategy => {
  const data = assetDataByStrategy[strategy];
  const sum = data.reduce((total, item) => total + item.value, 0);
  
  if (Math.abs(sum - 100) > 0.01) {
    // Add rounding difference to the largest allocation
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const difference = 100 - sum;
    sortedData[0].value = Number((sortedData[0].value + difference).toFixed(2));
  }
});

const chartColors = ['#925a38', '#d1a47b', '#e9c9ad', '#f5dbc3', '#808080'];

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  radius: '80%',
  plugins: {
    legend: { display: false },
    datalabels: {
      color: '#000',
      font: { weight: 'bold', size: 10 },
      formatter: function(value, context) {
        const label = context.chart.data.labels[context.dataIndex];
        const percentage = value.toFixed(2);
        return \`\${label}: \${percentage}%\`;
      },
      anchor: 'end',
      align: 'end',
      offset: 10,
      clamp: true
    },
    tooltip: { enabled: false }
  }
};

const donutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '50%',
  radius: '80%',
  plugins: {
    legend: { display: false },
    datalabels: {
      color: '#000',
      font: { weight: 'bold', size: 12 },
      formatter: function(value, context) {
        const label = context.chart.data.labels[context.dataIndex];
        const percentage = value.toFixed(2);
        return \`\${label}: \${percentage}%\`;
      },
      anchor: 'end',
      align: 'end',
      offset: 10,
      clamp: true
    },
    tooltip: { enabled: false }
  }
};

console.log('Creating Sector Allocation pie charts');
const sectorContainers = document.querySelectorAll('#allocation-page .sector-chart-container .h-72');
console.log('Found ' + sectorContainers.length + ' sector containers');
sectorContainers.forEach((container, index) => {
  const clientCode = container.getAttribute('data-strategy');
  console.log('Processing sector container ' + index + ' with clientCode: ' + clientCode);
  const strategy = clientStrategies.find(s => s.code === clientCode);
  if (!strategy) {
    console.error('No strategy found for client code: ' + clientCode);
    return;
  }
  const sectorData = sectorDataByStrategy[strategy.strategyName] || [];
  console.log('Sector data for ' + strategy.strategyName + ':', sectorData);
  if (sectorData.length > 0) {
    const ctx = document.createElement('canvas');
    ctx.id = 'sectorChart-' + index;
    ctx.style.height = '288px';
    ctx.style.width = '100%';
    container.parentElement.className = 'chart-container';
    container.innerHTML = '';
    container.appendChild(ctx);
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: sectorData.map(d => d.label),
        datasets: [{
          data: sectorData.map(d => d.value),
          backgroundColor: chartColors.slice(0, sectorData.length),
          borderWidth: 0.5
        }]
      },
      options: pieChartOptions,
      plugins: [ChartDataLabels]
    });
    console.log('Sector pie chart created for ' + strategy.strategyName);
  } else {
    console.error('No sector data for ' + strategy.strategyName);
  }
});

console.log('Creating Asset Allocation donut charts');
const assetContainers = document.querySelectorAll('#allocation-page .asset-chart-container .h-72');
console.log('Found ' + assetContainers.length + ' asset containers');
assetContainers.forEach((container, index) => {
  const clientCode = container.getAttribute('data-strategy');
  console.log('Processing asset container ' + index + ' with clientCode: ' + clientCode);
  const strategy = clientStrategies.find(s => s.code === clientCode);
  if (!strategy) {
    console.error('No strategy found for client code: ' + clientCode);
    return;
  }
  const assetData = assetDataByStrategy[strategy.strategyName] || [];
  console.log('Asset data for ' + strategy.strategyName + ':', assetData);
  if (assetData.length > 0) {
    const ctx = document.createElement('canvas');
    ctx.id = 'assetChart-' + index;
    ctx.style.height = '288px';
    ctx.style.width = '100%';
    container.parentElement.className = 'chart-container';
    container.innerHTML = '';
    container.appendChild(ctx);
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: assetData.map(d => d.label),
        datasets: [{
          data: assetData.map(d => d.value),
          backgroundColor: chartColors.slice(0, assetData.length),
          borderWidth: 0.5
        }]
      },
      options: donutChartOptions,
      plugins: [ChartDataLabels]
    });
    console.log('Asset donut chart created for ' + strategy.strategyName);
  } else {
    console.error('No asset data for ' + strategy.strategyName);
  }
});
</script>
      </body>
      </html>
    `;

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.setContent(html, { waitUntil: 'networkidle0' });

    if (Object.keys(safeClientData.daily_nav_by_strategy).length > 0 ||
      (safeClientData.bse500_since_inception_data && safeClientData.bse500_since_inception_data.data) ||
      Object.keys(safeClientData.drawdown_by_strategy).length > 0 ||
      Object.keys(safeClientData.index_nav_by_strategy).length > 0 ||
      (safeClientData.cpa_report.sector_allocation.length > 0 || safeClientData.cpa_report.asset_allocation.length > 0)) {
      try {
        await page.waitForFunction(() => {
          const charts = [
            document.querySelector('#portfolioChart'),
            document.querySelector('#drawdownChart'),
            document.querySelector('#fundPerformanceChart')
          ];
          const sectorCharts = [];
          const assetCharts = [];
          document.querySelectorAll('#allocation-page .sector-chart-container .h-64 canvas').forEach((canvas, i) => {
            sectorCharts.push(document.querySelector(`#sectorChart-${i}`));
          });
          document.querySelectorAll('#allocation-page .asset-chart-container .h-64 canvas').forEach((canvas, i) => {
            assetCharts.push(document.querySelector(`#assetChart-${i}`));
          });
          return charts.every(chart => chart !== null) &&
            sectorCharts.every(chart => chart !== null) &&
            assetCharts.every(chart => chart !== null);
        }, { timeout: 10000 });
      } catch (err) {
        console.error('Error waiting for charts:', err);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await browser.close();

    // Encrypt the PDF with a password using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    // Make sure we're using a strong encryption
    const encryptedPdfBuffer = await pdfDoc.save({
      useObjectStreams: false,
      encryption: {
        userPassword: password || 'Qode2025',
        ownerPassword: password || 'Qode2025',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: false,
          documentAssembly: false,
        },
        encryptionAlgorithm: 'aes256', // Ensure we're using strong encryption
      },
    });

    // Verify the encryption worked by trying to load without password (should fail)
    try {
      await PDFDocument.load(encryptedPdfBuffer, { ignoreEncryption: false });
      console.warn("Warning: PDF encryption verification failed - file may not be properly secured");
    } catch (e) {
      console.log("PDF encryption verified successfully");
    }

    // Save PDF locally and check file size
    const safeUsername = username.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `Qode_Quarterly_Report_Q1_2025_${safeUsername}.pdf`;
    const filePath = path.join(process.cwd(), 'tmp', fileName);

    // Ensure tmp directory exists
    const dirPath = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, encryptedPdfBuffer);

    // Get and log file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    console.log(`PDF File Size: ${fileSizeInBytes} bytes (${fileSizeInMB.toFixed(2)} MB)`);

    // Log file path for easy access
    console.log(`PDF saved to: ${filePath}`);

    // Continue with email sending if requested (with size check)
    // if (sendEmail && email) {
    //   // Check if file size is too large for email (e.g., > 10MB)
    //   const MAX_EMAIL_SIZE = 10 * 1024 * 1024; // 10MB in bytes

    //   if (fileSizeInBytes > MAX_EMAIL_SIZE) {
    //     console.log(`File size (${fileSizeInMB.toFixed(2)} MB) exceeds email attachment limit (10 MB).`);
    //     console.log(`Consider uploading to storage and sending a link instead.`);

    //     // Here you would add code to upload to storage and send link
    //     // For now, just return without sending email

    //     res.setHeader('Content-Type', 'application/json');
    //     return res.status(200).json({ 
    //       status: 'warning',
    //       message: 'PDF generated but not emailed due to size constraints',
    //       filePath: filePath,
    //       fileSize: `${fileSizeInMB.toFixed(2)} MB` 
    //     });
    //   } else {
    //     // File size is acceptable, proceed with email
    //     const pdfBase64 = encryptedPdfBuffer.toString('base64');
    //     const emailPayload = [
    //       { key: 'fromName', value: 'Qode Investor Relations', type: 'text', enabled: true },
    //       { key: 'fromEmail', value: 'investor.relations@qodeinvest.com', type: 'text', enabled: true },
    //       { key: 'to', value: email, type: 'text', enabled: true },
    //       { key: 'toName', value: capitalizedUsername, type: 'text', enabled: true },
    //       { key: 'subject', value: `Q1 2025 Quarterly Report for ${capitalizedUsername}`, type: 'text', enabled: true },
    //       { key: 'body', value: `<p>Dear ${capitalizedUsername},</p><p>Please find attached your Q1 2025 Quarterly Report. The PDF is password-protected; use the password provided separately or contact us if needed.</p><p>Best regards,<br>Qode Investor Relations</p>`, type: 'text', enabled: true },
    //       { key: 'attachments', value: [{ filename: fileName, content: pdfBase64, encoding: 'base64' }], type: 'file', enabled: true }
    //     ];

    //     const emailResponse = await fetch('https://api.qodeinvestments.com/api/emails/sendEmail', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify(emailPayload),
    //     });

    //     if (!emailResponse.ok) {
    //       const errorText = await emailResponse.text();
    //       throw new Error(`Failed to send email: ${errorText}`);
    //     }
    //     console.log(`Email sent to ${email} for ${username}`);
    //   }
    // }

    // Instead of base64 encoding the file
    // Instead of using fs.createReadStream which is causing the error
    if (sendEmail && email) {
      try {
        // Read the file into a buffer first
        const fileBuffer = fs.readFileSync(filePath);

        // Create a Blob from the buffer
        const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('fromName', 'Qode Investor Relations');
        formData.append('fromEmail', 'investor.relations@qodeinvest.com');
        formData.append('to', email);
        formData.append('toName', capitalizedUsername);
        formData.append('subject', 'Quarterly Investment Report Q1 2025');
        formData.append('body', `
          <p>Hello ${capitalizedUsername},</p>
          <p>The first quarter of 2025 brought a mix of market irregularities and emerging opportunities. Despite macroeconomic uncertainties, our quant-driven strategies enabled us to maintain a resilient performance, delivering consistent risk-adjusted returns.</p>
          <p>Please find attached your detailed quarterly report, providing insights into key performance metrics, progress updates, and future projections.</p>
          <p>Please feel free to get in touch for any queries! Happy to assist.</p>
          <p>Regards,<br>Team Qode</p>
        `);



        // Attach the file as a Blob
        formData.append('attachments', fileBlob, fileName);

        const emailResponse = await fetch('https://api.qodeinvestments.com/api/emails/sendEmail', {
          method: 'POST',
          body: formData,
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Failed to send email: ${errorText}`);
        }
        console.log(`Email sent to ${email} for ${username}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue serving the PDF even if email fails
      }
    }

    // For API response, serve the PDF
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
      return res.end(encryptedPdfBuffer, 'binary');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}