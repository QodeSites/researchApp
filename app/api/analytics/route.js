import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

let client;
let cachedCredentials;

function getCredentials() {
  if (!cachedCredentials) {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    try {
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('credentials.json not found in root directory');
      }
      
      const credentialsStr = fs.readFileSync(credentialsPath, 'utf8');
      cachedCredentials = JSON.parse(credentialsStr);
      
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !cachedCredentials[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Failed to load credentials:', error.message);
      throw error;
    }
  }
  return cachedCredentials;
}

function getAnalyticsClient() {
  if (!client) {
    const credentials = getCredentials();
    client = new BetaAnalyticsDataClient({ credentials });
  }
  return client;
}

async function runAnalyticsQuery(analyticsClient, request) {
  try {
    console.log('Sending analytics request for metrics:', request.metrics?.map(m => m.name) || []);
    const response = await analyticsClient.runReport(request);
    const reportData = Array.isArray(response) ? response[0] : response;
    console.log('Response rows count:', reportData?.rows?.length || 0);
    return reportData;
  } catch (error) {
    console.error('Analytics query error:', {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    throw error;
  }
}

export async function GET(request) {
  try {
    if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_ANALYTICS_PROPERTY_ID environment variable not set' },
        { status: 500 }
      );
    }

    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    const analyticsClient = getAnalyticsClient();
    
    if (!/^\d+$/.test(propertyId)) {
      return NextResponse.json(
        { error: `Invalid GOOGLE_ANALYTICS_PROPERTY_ID format. Expected numeric ID, got: ${propertyId}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateRangeParam = searchParams.get('dateRange');
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');

    let dateRanges;

    if (customStartDate && customEndDate) {
      dateRanges = [{ startDate: customStartDate, endDate: customEndDate }];
      console.log('Using custom date range:', customStartDate, 'to', customEndDate);
    } else {
      const selectedRange = dateRangeParam || '30daysAgo';
      dateRanges = [{ startDate: selectedRange, endDate: 'today' }];
      console.log('Using date range:', selectedRange);
    }

    console.log('Fetching analytics for property:', propertyId);

    // Define all requests
    const requests = [
      // 1. Overall Summary Metrics
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'sessionsPerUser' },
          { name: 'eventCount' },
        ],
      },
      // 2. Traffic by Date (Daily breakdown)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' } }],
      },
      // 3. Traffic by Device
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'deviceCategory' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'activeUsers' } }],
      },
      // 4. Traffic by Country (INCREASED: Top 250 for comprehensive coverage)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'country' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 250,
      },
      // 5. Traffic by City (INCREASED: Top 200)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'city' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 200,
      },
      // 6. Traffic by Region (INCREASED: Top 150)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'region' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 150,
      },
      // 7. Top Pages with Views Per Page (INCREASED: Top 100)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 100,
      },
      // 8. Traffic Sources (INCREASED: Top 50)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'sessionSource' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 50,
      },
      // 9. User Type (New vs Returning)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'newVsReturning' }],
      },
      // 10. Browser Distribution
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'browser' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'activeUsers' } }],
        limit: 10,
      },
      // 11. Operating System Distribution
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'operatingSystem' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'activeUsers' } }],
        limit: 10,
      },
      // 12. Landing Pages Performance (INCREASED: Top 100)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'landingPage' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 100,
      },
      // 13. Traffic by Referrer (INCREASED: Top 100)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'pageReferrer' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 100,
      },
      // 14. Device Model Distribution
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'deviceModel' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'activeUsers' } }],
        limit: 10,
      },
      // 15. Language Distribution (INCREASED: Top 100)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'language' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'screenPageViews' } }],
        limit: 100,
      },
      // 16. Hourly Breakdown (to identify peak hours)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'hour' }],
        orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'hour' } }],
      },
      // 17. Day of Week Breakdown
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'dayOfWeekName' }],
      },
      // 18. Page Performance (Pages with engagement metrics)
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'eventCount' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'engagementRate' } }],
        limit: 15,
      },
      // 19. User Engagement Metrics by Channel Group
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'eventCount' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'engagementRate' } }],
      },
      // 20. Traffic by Continent
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'continent' }],
        orderBys: [{ metric: { sortOrder: 'DESCENDING', metricName: 'activeUsers' } }],
      },
      // 21. Organic Google Search Queries
      {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'organicGoogleSearchClicks' },
          { name: 'organicGoogleSearchImpressions' },
          { name: 'organicGoogleSearchClickThroughRate' },
          { name: 'organicGoogleSearchAveragePosition' },
        ],
      },
    ];

    // Run all queries in parallel using Promise.allSettled to handle individual failures gracefully
    const promises = requests.map(req => runAnalyticsQuery(analyticsClient, req));
    const results = await Promise.allSettled(promises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Analytics query ${index + 1} failed:`, result.reason.message);
      }
    });

    // Extract responses, defaulting to null on failure
    const [
      summaryResponse,
      dailyResponse,
      deviceResponse,
      countryResponse,
      cityResponse,
      regionResponse,
      topPagesResponse,
      sourceResponse,
      userTypeResponse,
      browserResponse,
      osResponse,
      landingPagesResponse,
      referrerResponse,
      deviceModelResponse,
      languageResponse,
      hourlyResponse,
      dayOfWeekResponse,
      pagePerformanceResponse,
      engagementResponse,
      continentResponse,
      organicSearchResponse
    ] = results.map(r => 
      r.status === 'fulfilled' 
        ? (Array.isArray(r.value) ? r.value[0] : r.value) 
        : null
    );

    // Compute actual dates for Search Console (which requires YYYY-MM-DD)
    const { scStartDate, scEndDate } = (() => {
      let start, end;
      if (customStartDate && customEndDate) {
        start = customStartDate;
        end = customEndDate;
      } else {
        const range = dateRangeParam || '30daysAgo';
        const today = new Date();
        end = today.toISOString().split('T')[0];
        if (range === '30daysAgo') {
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          start = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (range === '7daysAgo') {
          const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          start = sevenDaysAgo.toISOString().split('T')[0];
        } else {
          // Default to 30 days
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          start = thirtyDaysAgo.toISOString().split('T')[0];
        }
      }
      return { scStartDate: start, scEndDate: end };
    })();

    // Fetch top organic search queries from Search Console
    let topOrganicQueries = [];
    if (process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL) {
      try {
        const credentials = getCredentials();
        const scAuth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });
        const searchconsole = google.searchconsole({ version: 'v1', auth: scAuth });
        let siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

        // Try different site URL formats
        const siteUrlFormats = [
          siteUrl, // Use as-is first
          `sc-domain:${siteUrl.replace(/^(https?:\/\/)|(\/)?$/g, '')}`, // Convert to sc-domain format
        ];

        console.log('Attempting Search Console query with formats:', siteUrlFormats);

        for (const attemptUrl of siteUrlFormats) {
          try {
            console.log('Trying Search Console with siteUrl:', attemptUrl);
            
            const scResponse = await searchconsole.searchanalytics.query({
              siteUrl: attemptUrl,
              requestBody: {
                startDate: scStartDate,
                endDate: scEndDate,
                dimensions: ['query'],
                rowLimit: 73,
                sort: [{ column: 'clicks', order: 'DESCENDING' }],
              },
            });

            console.log('Search Console response keys:', Object.keys(scResponse.data || {}));
            
            if (scResponse.data?.rows && scResponse.data.rows.length > 0) {
              topOrganicQueries = scResponse.data.rows;
              console.log('✓ Search Console queries fetched successfully:', topOrganicQueries.length, 'queries');
              break; // Success, exit the loop
            } else {
              console.warn('No rows returned from Search Console for', attemptUrl);
            }
          } catch (formatError) {
            console.warn('Search Console failed with format:', attemptUrl, formatError.message);
            continue; // Try next format
          }
        }

        if (topOrganicQueries.length === 0) {
          console.warn('⚠ No Search Console data found. This is normal if:', {
            reason1: 'Search Console is not linked to Analytics',
            reason2: 'No organic search traffic in the date range',
            reason3: 'Site URL format is incorrect',
            hint: 'Try these formats in env: "https://yourdomain.com/" or "sc-domain:yourdomain.com"'
          });
        }
      } catch (scError) {
        console.error('Search Console API error:', {
          message: scError.message,
          code: scError.code,
          status: scError.status,
        });
        // Continue without throwing - organic search metrics from Analytics will still work
      }
    } else {
      console.log('ℹ GOOGLE_SEARCH_CONSOLE_SITE_URL not set - using Google Analytics organic search metrics only');
    }

    // Process Summary Data
    const summaryMetricValues = summaryResponse?.rows?.[0]?.metricValues || [];
    const summary = {
      activeUsers: parseInt(summaryMetricValues[0]?.value || 0, 10),
      totalUsers: parseInt(summaryMetricValues[1]?.value || 0, 10),
      newUsers: parseInt(summaryMetricValues[2]?.value || 0, 10),
      pageViews: parseInt(summaryMetricValues[3]?.value || 0, 10),
      sessions: parseInt(summaryMetricValues[4]?.value || 0, 10),
      bounceRate: parseFloat(summaryMetricValues[5]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(summaryMetricValues[6]?.value || 0).toFixed(2),
      engagementRate: parseFloat(summaryMetricValues[7]?.value || 0).toFixed(2),
      sessionsPerUser: parseFloat(summaryMetricValues[8]?.value || 0).toFixed(2),
      totalEvents: parseInt(summaryMetricValues[9]?.value || 0, 10),
    };

    // Process all dimension data
    const trafficByDate = (dailyResponse?.rows || []).map(row => ({
      date: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
    }));

    const trafficByDevice = (deviceResponse?.rows || []).map(row => ({
      device: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
    }));

    const trafficByCountry = (countryResponse?.rows || [])
      .filter(row => {
        // Filter out rows with zero or null metrics
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    // CITY TRAFFIC - IMPORTANT FOR MANAGER
    const trafficByCity = (cityResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        city: row.dimensionValues?.[0]?.value || 'Unknown',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
        avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    const trafficByRegion = (regionResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        region: row.dimensionValues?.[0]?.value || 'Unknown',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    const topPages = (topPagesResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[0]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        title: row.dimensionValues?.[0]?.value || 'Unknown',
        path: row.dimensionValues?.[1]?.value || '/',
        pageViews: parseInt(row.metricValues?.[0]?.value || 0, 10),
        users: parseInt(row.metricValues?.[1]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[2]?.value || 0).toFixed(2),
        avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
        engagementRate: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
        sessions: parseInt(row.metricValues?.[5]?.value || 0, 10),
      }));

    const trafficSources = (sourceResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        source: row.dimensionValues?.[0]?.value || 'Direct',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
        avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
      }));

    const userType = (userTypeResponse?.rows || []).map(row => ({
      type: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
    })).sort((a, b) => b.users - a.users);

    const browserDistribution = (browserResponse?.rows || []).map(row => ({
      browser: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
    }));

    const osDistribution = (osResponse?.rows || []).map(row => ({
      os: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
    }));

    const landingPages = (landingPagesResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[0]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        landingPage: row.dimensionValues?.[0]?.value || '/',
        pageViews: parseInt(row.metricValues?.[0]?.value || 0, 10),
        users: parseInt(row.metricValues?.[1]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[2]?.value || 0).toFixed(2),
        avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
        sessions: parseInt(row.metricValues?.[4]?.value || 0, 10),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    const referrers = (referrerResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        referrer: row.dimensionValues?.[0]?.value || 'Direct',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    const deviceModels = (deviceModelResponse?.rows || []).map(row => ({
      model: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
    }));

    const languages = (languageResponse?.rows || [])
      .filter(row => {
        const pageViews = parseInt(row.metricValues?.[1]?.value || 0, 10);
        return pageViews > 0;
      })
      .map(row => ({
        language: row.dimensionValues?.[0]?.value || 'Unknown',
        users: parseInt(row.metricValues?.[0]?.value || 0, 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
        sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      }))
      .sort((a, b) => b.pageViews - a.pageViews);

    const hourlyTraffic = (hourlyResponse?.rows || []).map(row => ({
      hour: row.dimensionValues?.[0]?.value || '00',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const dayOfWeekTraffic = (dayOfWeekResponse?.rows || []).map(row => ({
      day: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
    })).sort((a, b) => {
      const dayOrder = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      return (dayOrder[a.day] || 7) - (dayOrder[b.day] || 7);
    });

    const pagePerformance = (pagePerformanceResponse?.rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '/',
      title: row.dimensionValues?.[1]?.value || 'Unknown',
      pageViews: parseInt(row.metricValues?.[0]?.value || 0, 10),
      users: parseInt(row.metricValues?.[1]?.value || 0, 10),
      engagementRate: parseFloat(row.metricValues?.[2]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      bounceRate: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
      events: parseInt(row.metricValues?.[5]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[6]?.value || 0, 10),
    }));

    const channelGroupEngagement = (engagementResponse?.rows || []).map(row => ({
      channelGroup: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      engagementRate: parseFloat(row.metricValues?.[1]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[2]?.value || 0).toFixed(2),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      events: parseInt(row.metricValues?.[4]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[5]?.value || 0, 10),
    }));

    const trafficByContinent = (continentResponse?.rows || []).map(row => ({
      continent: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
    }));

    // Process Organic Search Data from Google Analytics
    const organicSearchMetrics = organicSearchResponse?.rows?.[0]?.metricValues || [];
    const organicSearchSummary = {
      clicks: parseInt(organicSearchMetrics[0]?.value || 0, 10),
      impressions: parseInt(organicSearchMetrics[1]?.value || 0, 10),
      clickThroughRate: parseFloat((organicSearchMetrics[2]?.value || 0) * 100).toFixed(2),
      averagePosition: parseFloat(organicSearchMetrics[3]?.value || 0).toFixed(2),
    };

    // Debug: Log if we're getting zeros
    if (organicSearchSummary.clicks === 0 && organicSearchSummary.impressions === 0) {
      console.warn('⚠️ Organic search metrics are 0. Possible reasons:', {
        reason1: 'Search Console is NOT linked to this GA4 property',
        reason2: 'No organic search traffic in the selected date range',
        reason3: 'The property/stream is configured incorrectly',
        fixSteps: [
          '1. Go to Admin > Data Sources > Search Console',
          '2. Click "Link" and authorize your Search Console property',
          '3. Select the correct Search Console property to link',
          '4. Wait 24-48 hours for data to populate',
          '5. Re-test this API'
        ]
      });
      console.log('Full organic search response for debugging:', JSON.stringify(organicSearchResponse, null, 2));
    } else {
      console.log('✓ Organic Search Summary:', organicSearchSummary);
    }

    // Process Search Console data
    const processedOrganicQueries = topOrganicQueries.map(row => {
      // Handle different possible response structures
      const query = row.keys?.[0] || row.query || 'Unknown';
      
      return {
        query,
        clicks: parseInt(row.clicks || 0),
        impressions: parseInt(row.impressions || 0),
        ctr: parseFloat((row.ctr || 0) * 100).toFixed(2), // Convert to percentage if needed
        position: parseFloat(row.position || 0).toFixed(2),
      };
    });

    // Format period label
    const periodLabel = customStartDate && customEndDate 
      ? `${customStartDate} to ${customEndDate}`
      : (dateRangeParam || '30daysAgo');

    // Return comprehensive analytics data
    return NextResponse.json({
      period: periodLabel,
      summary,
      // Geographic Data
      geography: {
        trafficByCountry,
        trafficByCity,
        trafficByRegion,
        trafficByContinent,
      },
      // Traffic Analysis
      traffic: {
        trafficByDate,
        trafficByDevice,
        trafficSources,
        trafficByHour: hourlyTraffic,
        trafficByDayOfWeek: dayOfWeekTraffic,
      },
      // Page Performance
      pages: {
        topPages,
        pagePerformance,
        landingPages,
      },
      // User Analysis
      users: {
        userType,
        newVsReturning: userType,
      },
      // Device & Browser
      deviceAnalytics: {
        byDeviceType: trafficByDevice,
        byDeviceModel: deviceModels,
        byBrowser: browserDistribution,
        byOperatingSystem: osDistribution,
        byLanguage: languages,
      },
      // Referral Analysis
      referrals: {
        byReferrer: referrers,
        byChannelGroup: channelGroupEngagement,
      },
      // Engagement
      engagement: {
        channelGroupEngagement,
        pageEngagement: pagePerformance,
      },
      // SEO: Organic Search Queries from Search Console (with Google Analytics fallback)
      seo: {
        organicSearch: organicSearchSummary,
        topOrganicQueries: processedOrganicQueries,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}