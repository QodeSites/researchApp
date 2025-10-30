import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let client;

function getAnalyticsClient() {
  if (!client) {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    try {
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('credentials.json not found in root directory');
      }
      
      const credentialsStr = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsStr);
      
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      client = new BetaAnalyticsDataClient({ credentials });
      
    } catch (error) {
      console.error('Failed to load credentials:', error.message);
      throw error;
    }
  }
  return client;
}

async function runAnalyticsQuery(analyticsClient, request) {
  try {
    console.log('Sending analytics request for metrics:', request.metrics?.map(m => m.name) || []);
    const response = await analyticsClient.runReport(request);
    
    // GA4 API returns response directly, access rows via response[0] or response.rows
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
    
    // Validate property ID format (should be numeric only)
    if (!/^\d+$/.test(propertyId)) {
      return NextResponse.json(
        { error: `Invalid GOOGLE_ANALYTICS_PROPERTY_ID format. Expected numeric ID, got: ${propertyId}` },
        { status: 400 }
      );
    }

    // Extract date range parameters from query string
    const { searchParams } = new URL(request.url);
    const dateRangeParam = searchParams.get('dateRange');
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');

    let dateRanges;

    if (customStartDate && customEndDate) {
      // Use custom date range (format: YYYY-MM-DD)
      dateRanges = [
        {
          startDate: customStartDate,
          endDate: customEndDate,
        },
      ];
      console.log('Using custom date range:', customStartDate, 'to', customEndDate);
    } else {
      // Use predefined date range or default to 30 days
      const selectedRange = dateRangeParam || '30daysAgo';
      dateRanges = [
        {
          startDate: selectedRange,
          endDate: 'today',
        },
      ];
      console.log('Using date range:', selectedRange);
    }

    console.log('Fetching analytics for property:', propertyId);

    // Run all queries in parallel for performance optimization
    const [
      summaryResponse,
      dailyResponse,
      deviceResponse,
      countryResponse,
      topPagesResponse,
      sourceResponse,
      userTypeResponse
    ] = await Promise.all([
      // 1. Overall Summary Metrics
      runAnalyticsQuery(analyticsClient, {
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
        ],
      }),
      // 2. Traffic by Date (Daily breakdown)
      runAnalyticsQuery(analyticsClient, {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'date' }],
        orderBys: [
          {
            dimension: {
              orderType: 'ALPHANUMERIC',
              dimensionName: 'date',
            },
          },
        ],
      }),
      // 3. Traffic by Device
      runAnalyticsQuery(analyticsClient, {
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
        orderBys: [
          {
            metric: {
              sortOrder: 'DESCENDING',
              metricName: 'activeUsers',
            },
          },
        ],
      }),
      // 4. Traffic by Country
      runAnalyticsQuery(analyticsClient, {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'country' }],
        orderBys: [
          {
            metric: {
              sortOrder: 'DESCENDING',
              metricName: 'activeUsers',
            },
          },
        ],
        limit: 15,
      }),
      // 5. Top Pages
      runAnalyticsQuery(analyticsClient, {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        orderBys: [
          {
            metric: {
              sortOrder: 'DESCENDING',
              metricName: 'screenPageViews',
            },
          },
        ],
        limit: 10,
      }),
      // 6. Traffic Sources
      runAnalyticsQuery(analyticsClient, {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
        dimensions: [{ name: 'sessionSource' }],
        orderBys: [
          {
            metric: {
              sortOrder: 'DESCENDING',
              metricName: 'activeUsers',
            },
          },
        ],
        limit: 15,
      }),
      // 7. User Type (New vs Returning)
      runAnalyticsQuery(analyticsClient, {
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
        dimensions: [{ name: 'newVsReturning' }],
      }),
    ]);

    // FIX: Properly extract summary data
    const summaryMetricValues = summaryResponse?.rows?.[0]?.metricValues || [];
    console.log('Summary metric values:', summaryMetricValues.length);

    const summary = {
      activeUsers: summaryMetricValues[0]?.value || '0',
      totalUsers: summaryMetricValues[1]?.value || '0',
      newUsers: summaryMetricValues[2]?.value || '0',
      pageViews: summaryMetricValues[3]?.value || '0',
      sessions: summaryMetricValues[4]?.value || '0',
      bounceRate: summaryMetricValues[5]?.value || '0',
      avgSessionDuration: summaryMetricValues[6]?.value || '0',
      engagementRate: summaryMetricValues[7]?.value || '0',
      sessionsPerUser: summaryMetricValues[8]?.value || '0',
    };

    console.log('Summary data:', summary);

    // Process other responses
    const trafficByDate = (dailyResponse?.rows || []).map(row => ({
      date: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
    }));

    const trafficByDevice = (deviceResponse?.rows || []).map(row => ({
      device: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || 0).toFixed(2),
    }));

    const trafficByCountry = (countryResponse?.rows || []).map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
    }));

    const topPages = (topPagesResponse?.rows || []).map(row => ({
      title: row.dimensionValues?.[0]?.value || 'Unknown',
      path: row.dimensionValues?.[1]?.value || '/',
      pageViews: parseInt(row.metricValues?.[0]?.value || 0, 10),
      users: parseInt(row.metricValues?.[1]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[2]?.value || 0).toFixed(2),
      avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
    }));

    const trafficSources = (sourceResponse?.rows || []).map(row => ({
      source: row.dimensionValues?.[0]?.value || 'Direct',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
    }));

    const userType = (userTypeResponse?.rows || []).map(row => ({
      type: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || 0, 10),
      pageViews: parseInt(row.metricValues?.[1]?.value || 0, 10),
      sessions: parseInt(row.metricValues?.[2]?.value || 0, 10),
      bounceRate: parseFloat(row.metricValues?.[3]?.value || 0).toFixed(2),
    }));

    // Format period label
    const periodLabel = customStartDate && customEndDate 
      ? `${customStartDate} to ${customEndDate}`
      : (dateRangeParam || '30daysAgo');

    // Return comprehensive analytics data
    return NextResponse.json({
      period: periodLabel,
      summary: {
        activeUsers: parseInt(summary.activeUsers, 10),
        totalUsers: parseInt(summary.totalUsers, 10),
        newUsers: parseInt(summary.newUsers, 10),
        pageViews: parseInt(summary.pageViews, 10),
        sessions: parseInt(summary.sessions, 10),
        bounceRate: parseFloat(summary.bounceRate).toFixed(2),
        avgSessionDuration: parseFloat(summary.avgSessionDuration).toFixed(2),
        engagementRate: parseFloat(summary.engagementRate).toFixed(2),
        sessionsPerUser: parseFloat(summary.sessionsPerUser).toFixed(2),
      },
      trafficByDate,
      trafficByDevice,
      trafficByCountry,
      topPages,
      trafficSources,
      userType,
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