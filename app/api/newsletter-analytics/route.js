import { NextResponse } from 'next/server';

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
const MAX_CONCURRENT_REQUESTS = 12;
const REQUEST_DELAY = 50;

if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX) {
  console.error('Mailchimp credentials not configured');
}

class RequestQueue {
  constructor(maxConcurrent = 12) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => {
        this.queue.push(resolve);
      });
    }

    this.activeRequests++;
    try {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      return await fn();
    } finally {
      this.activeRequests--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

const requestQueue = new RequestQueue(MAX_CONCURRENT_REQUESTS);

async function makeMailchimpRequest(endpoint, options = {}) {
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0${endpoint}`;
  
  const headers = {
    'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };

  return requestQueue.run(async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Mailchimp API Error: ${error.detail || error.title}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mailchimp request failed:', error);
      throw error;
    }
  });
}

// OPTIMIZED: Only fetch sent/completed campaigns
async function getCampaigns(count = 50, offset = 0) {
  try {
    // Filter by status=sent to only get completed campaigns
    const data = await makeMailchimpRequest(
      `/campaigns?count=${count}&offset=${offset}&sort_field=send_time&sort_dir=DESC&status=sent`
    );
    return data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

async function getCampaignDetails(campaignId) {
  try {
    const data = await makeMailchimpRequest(`/campaigns/${campaignId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching campaign ${campaignId}:`, error);
    throw error;
  }
}

async function getCampaignAnalytics(campaignId) {
  try {
    const data = await makeMailchimpRequest(`/reports/${campaignId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching analytics for campaign ${campaignId}:`, error);
    throw error;
  }
}

// FIXED: Better handling of email activity with proper data extraction
async function getAllCampaignEmailActivity(campaignId) {
  try {
    const allEmails = [];
    let offset = 0;
    const pageSize = 1000; // Max allowed by Mailchimp
    let hasMore = true;

    console.log(`Fetching all email activity for campaign ${campaignId}...`);

    while (hasMore) {
      const data = await makeMailchimpRequest(
        `/reports/${campaignId}/email-activity?count=${pageSize}&offset=${offset}`
      );

      if (data.emails && data.emails.length > 0) {
        allEmails.push(...data.emails);
        offset += pageSize;
        
        if (data.emails.length < pageSize) {
          hasMore = false;
        }

        console.log(`Fetched ${allEmails.length} emails so far...`);
      } else {
        hasMore = false;
      }
    }

    console.log(`Total emails fetched: ${allEmails.length}`);
    return allEmails;
  } catch (error) {
    console.error(`Error fetching all email activity for campaign ${campaignId}:`, error);
    throw error;
  }
}

// FIXED: Improved email activity processing with better data mapping
function processEmailActivity(emailActivity, campaignAnalytics) {
  const recipients = {};

  // Initialize from analytics if available
  if (campaignAnalytics?.emails_sent) {
    // Get basic counts from analytics first
    const totalSent = campaignAnalytics.emails_sent || 0;
    const totalOpens = campaignAnalytics.opens?.open_count || 0;
    const totalClicks = campaignAnalytics.clicks?.click_count || 0;
    const totalBounces = (campaignAnalytics.bounces?.permanent_bounce || 0) + 
                         (campaignAnalytics.bounces?.transient_bounce || 0);
  }

  // Process each activity event
  for (const activity of emailActivity) {
    const email = activity.email_address || activity.email;
    
    if (!email) continue;

    if (!recipients[email]) {
      recipients[email] = {
        email: email,
        email_id: activity.email_id || null,
        activities: [],
        opened: false,
        clicked: false,
        bounced: false,
        unsubscribed: false,
        spammed: false,
        opens_count: 0,
        clicks_count: 0,
        first_open: null,
        first_click: null,
        last_open: null,
        last_click: null,
        bounce_type: null,
      };
    }

    recipients[email].activities.push(activity);

    // Map activity actions properly (Mailchimp action types)
    const action = activity.action?.toLowerCase() || '';
    const type = activity.type?.toLowerCase() || '';

    if (action === 'open' || type === 'open') {
      recipients[email].opened = true;
      recipients[email].opens_count += 1;
      if (!recipients[email].first_open) {
        recipients[email].first_open = activity.timestamp;
      }
      recipients[email].last_open = activity.timestamp;
    } 
    else if (action === 'click' || type === 'click') {
      recipients[email].clicked = true;
      recipients[email].clicks_count += 1;
      if (!recipients[email].first_click) {
        recipients[email].first_click = activity.timestamp;
      }
      recipients[email].last_click = activity.timestamp;
    } 
    else if (action.includes('bounce') || type.includes('bounce')) {
      recipients[email].bounced = true;
      recipients[email].bounce_type = type;
    } 
    else if (action === 'unsub' || type === 'unsub') {
      recipients[email].unsubscribed = true;
    } 
    else if (action === 'abuse' || type === 'abuse') {
      recipients[email].spammed = true;
    }
  }

  return Object.values(recipients);
}

// OPTIMIZED: Batch fetch analytics in parallel
async function fetchCampaignsWithAnalytics(campaigns) {
  const results = [];
  
  // Fetch all analytics in parallel (request queue handles concurrency)
  const analyticsPromises = campaigns.map(campaign => 
    getCampaignAnalytics(campaign.id)
      .then(analytics => ({ campaignId: campaign.id, analytics }))
      .catch(error => ({ 
        campaignId: campaign.id, 
        analytics: null, 
        error: error.message 
      }))
  );

  const analyticsResults = await Promise.all(analyticsPromises);
  
  // Map analytics back to campaigns
  const analyticsMap = Object.fromEntries(
    analyticsResults.map(r => [r.campaignId, r.analytics])
  );

  return campaigns.map(campaign => ({
    ...campaign,
    analytics: analyticsMap[campaign.id] || null,
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const detailed = searchParams.get('detailed') === 'true';
    const startTime = Date.now();

    if (campaignId) {
      // Get specific campaign with detailed analytics
      console.log(`[API] Fetching campaign ${campaignId}...`);
      
      const [campaign, analytics] = await Promise.all([
        getCampaignDetails(campaignId),
        getCampaignAnalytics(campaignId),
      ]);

      let emailData = {};
      
      if (detailed) {
        // Fetch ALL email activity with pagination
        console.log('[API] Fetching detailed email activity...');
        const allEmailActivity = await getAllCampaignEmailActivity(campaignId);
        const processedRecipients = processEmailActivity(allEmailActivity, analytics);
        
        emailData = {
          total_recipients: processedRecipients.length,
          opened: processedRecipients.filter(r => r.opened).length,
          unopened: processedRecipients.filter(r => !r.opened && !r.bounced).length,
          bounced: processedRecipients.filter(r => r.bounced).length,
          clicked: processedRecipients.filter(r => r.clicked).length,
          unsubscribed: processedRecipients.filter(r => r.unsubscribed).length,
          spammed: processedRecipients.filter(r => r.spammed).length,
          recipients: processedRecipients,
        };
        
        console.log(`[API] Email Data Summary:`, {
          total: emailData.total_recipients,
          opened: emailData.opened,
          clicked: emailData.clicked,
          bounced: emailData.bounced,
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[API] Campaign detail request completed in ${duration}ms`);

      return NextResponse.json({
        campaign,
        analytics,
        ...emailData,
        requestTime: duration,
      });
    } else {
      // Get all campaigns (filtered to sent only)
      console.log('[API] Fetching all campaigns...');
      const campaignsData = await getCampaigns(50, 0);
      
      // OPTIMIZED: Fetch all analytics in parallel
      console.log(`[API] Fetching analytics for ${campaignsData.campaigns.length} campaigns...`);
      const campaignsWithAnalytics = await fetchCampaignsWithAnalytics(campaignsData.campaigns);

      const duration = Date.now() - startTime;
      console.log(`[API] Full campaigns list completed in ${duration}ms`);

      return NextResponse.json({
        total_items: campaignsData.total_items,
        campaigns: campaignsWithAnalytics,
        fetched_at: new Date().toISOString(),
        requestTime: duration,
        performanceInfo: {
          maxConcurrent: MAX_CONCURRENT_REQUESTS,
          requestDelay: REQUEST_DELAY,
          message: 'Optimized for performance: parallel analytics fetching + status filtering',
        },
      });
    }
  } catch (error) {
    console.error('[API] Mailchimp API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Mailchimp campaigns' },
      { status: 500 }
    );
  }
}