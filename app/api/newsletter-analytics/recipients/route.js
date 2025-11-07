// app/api/newsletter-analytics/recipients/route.js
// Recipients API endpoint for Mailchimp campaign analytics

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('id');
  const offset = parseInt(searchParams.get('offset') || '0');
  const count = Math.min(parseInt(searchParams.get('count') || '50'), 1000); // Cap at Mailchimp max
  const full = searchParams.get('full') === 'true';
  const filterType = searchParams.get('filter'); // e.g., 'clicked', 'opened', 'bounced', 'not_opened'

  if (!campaignId) {
    return NextResponse.json(
      { error: 'Campaign ID is required' },
      { status: 400 }
    );
  }

  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., "us7"

  if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX) {
    return NextResponse.json(
      { error: 'Mailchimp API credentials not configured' },
      { status: 500 }
    );
  }

  const getRecipientStatus = (recipient) => {
    const statusStr = (recipient.status || '').toLowerCase().replace(/-/g, '').replace(/_/g, '');
    const bounceStatuses = ['bounced', 'dropped', 'cleaned', 'hardbounce', 'softbounce', 'bounce'];
    
    if (bounceStatuses.some(bs => statusStr.includes(bs))) {
      return "bounced";
    }
    
    if (recipient.activity?.length > 0) {
      const hasClick = recipient.activity.some(a => a.action === "click");
      const hasOpen = recipient.activity.some(a => a.action === "open");
      
      if (hasClick) return "clicked";
      if (hasOpen) return "opened";
    }
    
    return "not_opened";
  };

  try {
    const baseUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/reports/${campaignId}/email-activity`;
    const headers = {
      Authorization: `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json',
    };

    let recipients;
    let total;

    if (full) {
      // Fetch all emails with pagination loop
      let allEmails = [];
      let apiOffset = 0;
      const apiCount = 1000;
      let totalItems = 0;

      do {
        const params = new URLSearchParams({
          count: apiCount.toString(),
          offset: apiOffset.toString(),
        });
        const activityUrl = `${baseUrl}?${params}`;
        
        const activityResponse = await fetch(activityUrl, { headers });

        if (!activityResponse.ok) {
          const errorText = await activityResponse.text();
          console.error('Mailchimp API error:', errorText);
          throw new Error(`Mailchimp API error: ${activityResponse.status}`);
        }

        const activityData = await activityResponse.json();

        if (apiOffset === 0) {
          totalItems = activityData.total_items || 0;
        }

        allEmails = allEmails.concat(activityData.emails || []);
        apiOffset += apiCount;
      } while (apiOffset < totalItems && allEmails.length < totalItems);

      // Transform all
      let allRecipients = allEmails.map((email) => ({
        email_address: email.email_address,
        email_id: email.email_id,
        status: email.status, // e.g., Sent, Delivered, Bounced, etc.
        activity: email.activity || [],
      }));

      // Filter if filterType specified
      if (filterType) {
        allRecipients = allRecipients.filter(recipient => getRecipientStatus(recipient) === filterType);
      }

      recipients = allRecipients;
      total = recipients.length;
    } else {
      // Paginated fetch
      const params = new URLSearchParams({
        count: count.toString(),
        offset: offset.toString(),
      });
      const activityUrl = `${baseUrl}?${params}`;
      
      const activityResponse = await fetch(activityUrl, { headers });

      if (!activityResponse.ok) {
        const errorText = await activityResponse.text();
        console.error('Mailchimp API error:', errorText);
        throw new Error(`Mailchimp API error: ${activityResponse.status}`);
      }

      const activityData = await activityResponse.json();

      recipients = activityData.emails?.map((email) => ({
        email_address: email.email_address,
        email_id: email.email_id,
        status: email.status,
        activity: email.activity || [],
      })) || [];
      total = activityData.total_items || 0;
    }

    return NextResponse.json({
      recipients,
      total,
      requestTime: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching recipient data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch recipient data',
        message: error.message 
      },
      { status: 500 }
    );
  }
}