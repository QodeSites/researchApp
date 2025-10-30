// ===== FIXED: app/api/research-stocks/[id]/route.js =====
// Properly handles thoughts-only updates without touching stock_id
// UPDATED: Prefills fields from stocks table using COALESCE in SELECT for company_name, symbol, macro_sector, sector, industry, basic_industry
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const query = `
      SELECT 
        rs.*,
        COALESCE(rs.company_name, s.company_name) as company_name,
        COALESCE(rs.symbol, s.nse_symbol) as symbol,
        COALESCE(rs.macro_sector, s.macro_sector) as macro_sector,
        COALESCE(rs.sector, s.sector) as sector,
        COALESCE(rs.industry, s.industry) as industry,
        COALESCE(rs.basic_industry, s.basic_industry) as basic_industry,
        s.bse_code,
        s.nse_symbol
      FROM tblresearch_stocks rs
      LEFT JOIN public.stocks s ON rs.stock_id = s.id
      WHERE rs.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = result.rows[0];
    
    // Parse JSON fields on fetch
    const parseJsonField = (fieldValue) => {
      try {
        return typeof fieldValue === 'string' ? JSON.parse(fieldValue) : (Array.isArray(fieldValue) ? fieldValue : []);
      } catch {
        return [];
      }
    };

    // Parse thoughts with user_id support
    let parsedThoughts = [];
    if (data.thoughts) {
      try {
        parsedThoughts = typeof data.thoughts === 'string' ? JSON.parse(data.thoughts) : data.thoughts;
        if (!Array.isArray(parsedThoughts)) {
          parsedThoughts = [{ text: data.thoughts, user: null, timestamp: data.created_at, user_id: null }];
        }
      } catch {
        parsedThoughts = [{ text: data.thoughts, user: null, timestamp: data.created_at, user_id: null }];
      }
    }

    return NextResponse.json({
      ...data,
      thoughts: parsedThoughts,
      documentation_files: parseJsonField(data.documentation_files),
      documentation_links: parseJsonField(data.documentation_links),
      financial_model_files: parseJsonField(data.financial_model_files),
      financial_model_links: parseJsonField(data.financial_model_links),
      research_document_files: parseJsonField(data.research_document_files),
      research_document_links: parseJsonField(data.research_document_links),
      meeting_notes_files: parseJsonField(data.meeting_notes_files),
      meeting_notes_links: parseJsonField(data.meeting_notes_links),
      news_section_files: parseJsonField(data.news_section_files),
      news_section_links: parseJsonField(data.news_section_links)
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await request.json();
    
    // ===== IMPORTANT FIX: Handle thoughts-only updates separately =====
    const isThoughtsOnlyUpdate = Object.keys(body).length === 1 && body.thoughts;
    
    if (isThoughtsOnlyUpdate) {
      // SPECIAL CASE: Only updating thoughts (comments)
      // This avoids the stock_id NOT NULL constraint issue
      
      const { thoughts } = body;
      
      // Validate and structure thoughts
      let finalThoughts;
      if (Array.isArray(thoughts)) {
        const validatedThoughts = thoughts.map(t => ({
          text: t.text || '',
          user: t.user || null,
          user_id: t.user_id || null,
          timestamp: t.timestamp || new Date().toISOString()
        }));
        finalThoughts = JSON.stringify(validatedThoughts);
      } else if (typeof thoughts === 'string') {
        finalThoughts = thoughts;
      } else {
        finalThoughts = JSON.stringify([]);
      }
      
      // Update ONLY the thoughts column
      const updateQuery = `
        UPDATE tblresearch_stocks
        SET thoughts = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [finalThoughts, id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      
      // Re-fetch with joins and COALESCE to get complete data
      const refreshedQuery = `
        SELECT 
          rs.*,
          COALESCE(rs.company_name, s.company_name) as company_name,
          COALESCE(rs.symbol, s.nse_symbol) as symbol,
          COALESCE(rs.macro_sector, s.macro_sector) as macro_sector,
          COALESCE(rs.sector, s.sector) as sector,
          COALESCE(rs.industry, s.industry) as industry,
          COALESCE(rs.basic_industry, s.basic_industry) as basic_industry,
          s.bse_code,
          s.nse_symbol
        FROM tblresearch_stocks rs
        LEFT JOIN public.stocks s ON rs.stock_id = s.id
        WHERE rs.id = $1
      `;
      const refreshedResult = await db.query(refreshedQuery, [id]);
      const refreshedData = refreshedResult.rows[0];
      
      // Parse response
      let parsedThoughtsForResponse = [];
      if (refreshedData.thoughts) {
        try {
          parsedThoughtsForResponse = typeof refreshedData.thoughts === 'string' 
            ? JSON.parse(refreshedData.thoughts) 
            : refreshedData.thoughts;
          if (!Array.isArray(parsedThoughtsForResponse)) {
            parsedThoughtsForResponse = [{ 
              text: refreshedData.thoughts, 
              user: null, 
              timestamp: refreshedData.updated_at, 
              user_id: null 
            }];
          }
        } catch (e) {
          console.error("Error parsing thoughts:", e);
          parsedThoughtsForResponse = [];
        }
      }
      
      const parseJsonFieldForResponse = (fieldValue) => {
        try {
          if (fieldValue === undefined || fieldValue === null) return [];
          return typeof fieldValue === 'string' 
            ? JSON.parse(fieldValue) 
            : (Array.isArray(fieldValue) ? fieldValue : []);
        } catch {
          return [];
        }
      };
      
      return NextResponse.json({
        ...refreshedData,
        thoughts: parsedThoughtsForResponse,
        documentation_files: parseJsonFieldForResponse(refreshedData.documentation_files),
        documentation_links: parseJsonFieldForResponse(refreshedData.documentation_links),
        financial_model_files: parseJsonFieldForResponse(refreshedData.financial_model_files),
        financial_model_links: parseJsonFieldForResponse(refreshedData.financial_model_links),
        research_document_files: parseJsonFieldForResponse(refreshedData.research_document_files),
        research_document_links: parseJsonFieldForResponse(refreshedData.research_document_links),
        meeting_notes_files: parseJsonFieldForResponse(refreshedData.meeting_notes_files),
        meeting_notes_links: parseJsonFieldForResponse(refreshedData.meeting_notes_links),
        news_section_files: parseJsonFieldForResponse(refreshedData.news_section_files),
        news_section_links: parseJsonFieldForResponse(refreshedData.news_section_links)
      });
    }
    
    // ===== NORMAL CASE: Full update with all fields =====
    
    // Fetch current data for defaults
    const fetchQuery = `SELECT * FROM tblresearch_stocks WHERE id = $1`;
    const fetchResult = await db.query(fetchQuery, [id]);
    if (fetchResult.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const currentData = fetchResult.rows[0];

    const {
      stock_id = currentData.stock_id,
      symbol = currentData.symbol,
      exchange = currentData.exchange,
      company_name = currentData.company_name,
      macro_sector = currentData.macro_sector,
      sector = currentData.sector,
      industry = currentData.industry,
      basic_industry = currentData.basic_industry,
      researched_by = currentData.researched_by,
      initial_status = currentData.initial_status,
      final_status = currentData.final_status,
      completed_on = currentData.completed_on,
      source = currentData.source,
      source_other = currentData.source_other,
      holding = currentData.holding,
      thoughts = currentData.thoughts,
      total_contacts = currentData.total_contacts,
      total_meetings = currentData.total_meetings,
      documentation_files = currentData.documentation_files,
      documentation_links = currentData.documentation_links,
      financial_model_files = currentData.financial_model_files,
      financial_model_links = currentData.financial_model_links,
      research_document_files = currentData.research_document_files,
      research_document_links = currentData.research_document_links,
      research_document_text = currentData.research_document_text,
      financial_model_text = currentData.financial_model_text,
      meeting_notes_files = currentData.meeting_notes_files,
      meeting_notes_links = currentData.meeting_notes_links,
      meeting_notes_text = currentData.meeting_notes_text,
      news_section_files = currentData.news_section_files,
      news_section_links = currentData.news_section_links,
      news_section_text = currentData.news_section_text,
      bse_code,
      nse_symbol
    } = body;

    // Update stocks table if stock_id exists
    if (stock_id) {
      const updateFields = [];
      const updateParams = [];
      let paramIndex = 1;

      if (macro_sector !== undefined) {
        updateFields.push(`macro_sector = $${paramIndex}`);
        updateParams.push(macro_sector || null);
        paramIndex++;
      }
      if (sector !== undefined) {
        updateFields.push(`sector = $${paramIndex}`);
        updateParams.push(sector || null);
        paramIndex++;
      }
      if (basic_industry !== undefined) {
        updateFields.push(`basic_industry = $${paramIndex}`);
        updateParams.push(basic_industry || null);
        paramIndex++;
      }
      if (bse_code !== undefined) {
        updateFields.push(`bse_code = $${paramIndex}`);
        updateParams.push(bse_code || null);
        paramIndex++;
      }
      if (nse_symbol !== undefined) {
        updateFields.push(`nse_symbol = $${paramIndex}`);
        updateParams.push(nse_symbol || null);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateFields.push("updated_at = CURRENT_TIMESTAMP");
        const updateQuery = `
          UPDATE public.stocks 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramIndex}
        `;
        updateParams.push(stock_id);
        await db.query(updateQuery, updateParams);
      }
    }

    // Parse JSON fields with error handling
    const parseJsonField = (fieldValue) => {
      try {
        if (fieldValue === undefined || fieldValue === null) return [];
        return typeof fieldValue === 'string' 
          ? JSON.parse(fieldValue) 
          : (Array.isArray(fieldValue) ? fieldValue : []);
      } catch (parseError) {
        console.error(`Error parsing field:`, parseError);
        return [];
      }
    };

    const parsedDocumentationFiles = parseJsonField(documentation_files);
    const parsedDocumentationLinks = parseJsonField(documentation_links);
    const parsedFinancialModelFiles = parseJsonField(financial_model_files);
    const parsedFinancialModelLinks = parseJsonField(financial_model_links);
    const parsedResearchDocumentFiles = parseJsonField(research_document_files);
    const parsedResearchDocumentLinks = parseJsonField(research_document_links);
    const parsedMeetingNotesFiles = parseJsonField(meeting_notes_files);
    const parsedMeetingNotesLinks = parseJsonField(meeting_notes_links);
    const parsedNewsSectionFiles = parseJsonField(news_section_files);
    const parsedNewsSectionLinks = parseJsonField(news_section_links);

    // Handle thoughts - ensure it's a JSON string of array
    let finalThoughts;
    if (thoughts !== undefined) {
      if (Array.isArray(thoughts)) {
        const validatedThoughts = thoughts.map(t => ({
          text: t.text || '',
          user: t.user || null,
          user_id: t.user_id || null,
          timestamp: t.timestamp || new Date().toISOString()
        }));
        finalThoughts = JSON.stringify(validatedThoughts);
      } else if (typeof thoughts === 'string') {
        finalThoughts = thoughts;
      } else {
        finalThoughts = JSON.stringify([]);
      }
    } else {
      finalThoughts = currentData.thoughts;
    }

    const query = `
      UPDATE tblresearch_stocks
      SET stock_id = $1,
          symbol = $2,
          exchange = $3,
          company_name = $4,
          macro_sector = $5, 
          sector = $6, 
          industry = $7, 
          basic_industry = $8,
          researched_by = $9, 
          initial_status = $10, 
          final_status = $11, 
          completed_on = $12, 
          source = $13, 
          source_other = $14,
          holding = $15,
          thoughts = $16,
          total_contacts = $17,
          total_meetings = $18,
          documentation_files = $19,
          documentation_links = $20,
          financial_model_files = $21,
          financial_model_links = $22,
          research_document_files = $23,
          research_document_links = $24,
          research_document_text = $25,
          financial_model_text = $26,
          meeting_notes_files = $27,
          meeting_notes_links = $28,
          meeting_notes_text = $29,
          news_section_files = $30,
          news_section_links = $31,
          news_section_text = $32,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $33
      RETURNING *
    `;

    const result = await db.query(query, [
      stock_id || null,
      symbol || null,
      exchange || null,
      company_name || null,
      macro_sector || null,
      sector || null,
      industry || null,
      basic_industry || null,
      researched_by || null,
      initial_status || "Not Started",
      final_status || null,
      completed_on || null,
      source || null,
      source_other || null,
      holding || null,
      finalThoughts,
      total_contacts,
      total_meetings,
      JSON.stringify(parsedDocumentationFiles),
      JSON.stringify(parsedDocumentationLinks),
      JSON.stringify(parsedFinancialModelFiles),
      JSON.stringify(parsedFinancialModelLinks),
      JSON.stringify(parsedResearchDocumentFiles),
      JSON.stringify(parsedResearchDocumentLinks),
      research_document_text || null,
      financial_model_text || null,
      JSON.stringify(parsedMeetingNotesFiles),
      JSON.stringify(parsedMeetingNotesLinks),
      meeting_notes_text || null,
      JSON.stringify(parsedNewsSectionFiles),
      JSON.stringify(parsedNewsSectionLinks),
      news_section_text || null,
      id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Re-fetch with join and COALESCE to get updated stock fields
    const refreshedQuery = `
      SELECT 
        rs.*,
        COALESCE(rs.company_name, s.company_name) as company_name,
        COALESCE(rs.symbol, s.nse_symbol) as symbol,
        COALESCE(rs.macro_sector, s.macro_sector) as macro_sector,
        COALESCE(rs.sector, s.sector) as sector,
        COALESCE(rs.industry, s.industry) as industry,
        COALESCE(rs.basic_industry, s.basic_industry) as basic_industry,
        s.bse_code,
        s.nse_symbol
      FROM tblresearch_stocks rs
      LEFT JOIN public.stocks s ON rs.stock_id = s.id
      WHERE rs.id = $1
    `;
    const refreshedResult = await db.query(refreshedQuery, [id]);
    const refreshedData = refreshedResult.rows[0];

    // Parse JSON fields for response
    const parseJsonFieldForResponse = (fieldValue) => {
      try {
        if (fieldValue === undefined || fieldValue === null) return [];
        return typeof fieldValue === 'string' 
          ? JSON.parse(fieldValue) 
          : (Array.isArray(fieldValue) ? fieldValue : []);
      } catch (parseError) {
        console.error(`Error parsing field:`, parseError);
        return [];
      }
    };

    // Parse thoughts for response
    let parsedThoughtsForResponse = [];
    if (refreshedData.thoughts) {
      try {
        parsedThoughtsForResponse = typeof refreshedData.thoughts === 'string' ? JSON.parse(refreshedData.thoughts) : refreshedData.thoughts;
        if (!Array.isArray(parsedThoughtsForResponse)) {
          parsedThoughtsForResponse = [{ text: refreshedData.thoughts, user: null, timestamp: refreshedData.updated_at, user_id: null }];
        }
      } catch {
        parsedThoughtsForResponse = [];
      }
    }

    return NextResponse.json({
      ...refreshedData,
      thoughts: parsedThoughtsForResponse,
      documentation_files: parseJsonFieldForResponse(refreshedData.documentation_files),
      documentation_links: parseJsonFieldForResponse(refreshedData.documentation_links),
      financial_model_files: parseJsonFieldForResponse(refreshedData.financial_model_files),
      financial_model_links: parseJsonFieldForResponse(refreshedData.financial_model_links),
      research_document_files: parseJsonFieldForResponse(refreshedData.research_document_files),
      research_document_links: parseJsonFieldForResponse(refreshedData.research_document_links),
      meeting_notes_files: parseJsonFieldForResponse(refreshedData.meeting_notes_files),
      meeting_notes_links: parseJsonFieldForResponse(refreshedData.meeting_notes_links),
      news_section_files: parseJsonFieldForResponse(refreshedData.news_section_files),
      news_section_links: parseJsonFieldForResponse(refreshedData.news_section_links)
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await db.query(
      "DELETE FROM tblresearch_stocks WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully", id: result.rows[0].id });
  } catch (error) {
    console.error("Error deleting stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}