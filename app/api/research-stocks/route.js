import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = `
      SELECT 
        rs.id,
        rs.stock_id,
        rs.symbol,
        rs.exchange,
        rs.company_name,
        s.macro_sector,
        s.sector,
        s.industry,
        s.basic_industry,
        s.bse_code,
        rs.researched_by,
        rs.initial_status,
        rs.final_status,
        rs.completed_on,
        rs.source,
        rs.source_other,
        rs.holding,
        rs.documentation_files,
        rs.documentation_links,
        rs.financial_model_files,
        rs.financial_model_links,
        rs.thoughts,
        rs.created_at,
        rs.updated_at,
        rs.total_contacts,
        rs.total_meetings
      FROM tblresearch_stocks rs
      LEFT JOIN public.stocks s ON rs.stock_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND rs.final_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE WHEN rs.holding = 'Shortlist' THEN 0 ELSE 1 END,
      rs.updated_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error("Error fetching research stocks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      stock_id,
      symbol,
      exchange,
      company_name,
      macro_sector,
      sector,
      industry,
      basic_industry,
      bse_code,
      nse_symbol,
      researched_by,
      initial_status,
      final_status,
      completed_on,
      source,
      source_other,
      holding,
      documentation_files,
      documentation_links,
      financial_model_files,
      financial_model_links,
      thoughts,
      total_contacts = 0,
      total_meetings = 0,
      research_document_files,
      research_document_links,
      research_document_text,
      financial_model_files: financial_model_files_new,
      financial_model_links: financial_model_links_new,
      financial_model_text,
      meeting_notes_files,
      meeting_notes_links,
      meeting_notes_text,
      news_section_files,
      news_section_links,
      news_section_text
    } = body;

    // Validate required fields
    if (!symbol || !exchange || !company_name) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, exchange, company_name" },
        { status: 400 }
      );
    }

    let finalStockId = stock_id;

    // If no stock_id provided, insert into stocks table first
    if (!finalStockId) {
      let final_bse_code = bse_code || null;
      let final_nse_symbol = nse_symbol || null;

      if (!final_bse_code && !final_nse_symbol) {
        if (exchange === "NSE" || exchange === "NSEFO" || exchange === "NSECD") {
          final_nse_symbol = symbol;
        } else if (exchange === "BSE") {
          final_bse_code = symbol;
        } else {
          final_nse_symbol = symbol;
        }
      }

      const stocksQuery = `
        INSERT INTO public.stocks (company_name, bse_code, nse_symbol, industry, macro_sector, sector, basic_industry, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;
      const stocksResult = await db.query(stocksQuery, [
        company_name,
        final_bse_code,
        final_nse_symbol,
        industry || "",
        macro_sector || null,
        sector || null,
        basic_industry || null
      ]);
      finalStockId = stocksResult.rows[0].id;
    } else {
      // ✅ UPDATE: Only update existing stock if values are explicitly provided AND not empty
      const updateFields = [];
      const updateParams = [];
      let paramIndex = 1;

      // Only update if value is defined AND not an empty string
      if (macro_sector !== undefined && macro_sector !== "") {
        updateFields.push(`macro_sector = $${paramIndex}`);
        updateParams.push(macro_sector);
        paramIndex++;
      }
      if (sector !== undefined && sector !== "") {
        updateFields.push(`sector = $${paramIndex}`);
        updateParams.push(sector);
        paramIndex++;
      }
      if (basic_industry !== undefined && basic_industry !== "") {
        updateFields.push(`basic_industry = $${paramIndex}`);
        updateParams.push(basic_industry);
        paramIndex++;
      }
      if (bse_code !== undefined && bse_code !== "") {
        updateFields.push(`bse_code = $${paramIndex}`);
        updateParams.push(bse_code);
        paramIndex++;
      }
      if (nse_symbol !== undefined && nse_symbol !== "") {
        updateFields.push(`nse_symbol = $${paramIndex}`);
        updateParams.push(nse_symbol);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        updateFields.push("updated_at = NOW()");
        const updateQuery = `
          UPDATE public.stocks 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramIndex}
        `;
        updateParams.push(finalStockId);
        await db.query(updateQuery, updateParams);
      }
    }

    // Parse JSON fields
    const parseJsonField = (fieldValue) => {
      try {
        return typeof fieldValue === 'string' ? JSON.parse(fieldValue) : (Array.isArray(fieldValue) ? fieldValue : []);
      } catch {
        return [];
      }
    };

    const parsedDocumentationFiles = parseJsonField(documentation_files);
    const parsedDocumentationLinks = parseJsonField(documentation_links);
    const parsedFinancialModelFilesOld = parseJsonField(financial_model_files);
    const parsedFinancialModelLinksOld = parseJsonField(financial_model_links);

    const parsedResearchDocumentFiles = parseJsonField(research_document_files);
    const parsedResearchDocumentLinks = parseJsonField(research_document_links);
    const parsedFinancialModelFilesNew = parseJsonField(financial_model_files_new);
    const parsedFinancialModelLinksNew = parseJsonField(financial_model_links_new);
    const parsedMeetingNotesFiles = parseJsonField(meeting_notes_files);
    const parsedMeetingNotesLinks = parseJsonField(meeting_notes_links);
    const parsedNewsSectionFiles = parseJsonField(news_section_files);
    const parsedNewsSectionLinks = parseJsonField(news_section_links);

    const finalFinancialModelFiles = parsedFinancialModelFilesNew.length > 0 ? parsedFinancialModelFilesNew : parsedFinancialModelFilesOld;
    const finalFinancialModelLinks = parsedFinancialModelLinksNew.length > 0 ? parsedFinancialModelLinksNew : parsedFinancialModelLinksOld;

    const query = `
      INSERT INTO tblresearch_stocks 
      (stock_id, symbol, exchange, company_name, macro_sector, sector, industry, 
       basic_industry, researched_by, initial_status, final_status, completed_on, 
       source, source_other, holding, documentation_files, documentation_links, 
       financial_model_files, financial_model_links, thoughts, total_contacts, total_meetings,
       research_document_files, research_document_links, research_document_text,
       financial_model_text,
       meeting_notes_files, meeting_notes_links, meeting_notes_text,
       news_section_files, news_section_links, news_section_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
              $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
      RETURNING *
    `;

    const result = await db.query(query, [
      finalStockId,
      symbol || "",
      exchange || "",
      company_name || "",
      macro_sector || null,
      sector || null,
      industry || "",
      basic_industry || null,
      researched_by || "",
      initial_status || "Not Started",
      final_status || "",
      completed_on || null,
      source || null,
      source_other || null,
      holding || "",
      JSON.stringify(parsedDocumentationFiles),
      JSON.stringify(parsedDocumentationLinks),
      JSON.stringify(finalFinancialModelFiles),
      JSON.stringify(finalFinancialModelLinks),
      thoughts || "",
      total_contacts,
      total_meetings,
      JSON.stringify(parsedResearchDocumentFiles),
      JSON.stringify(parsedResearchDocumentLinks),
      research_document_text || null,
      financial_model_text || null,
      JSON.stringify(parsedMeetingNotesFiles),
      JSON.stringify(parsedMeetingNotesLinks),
      meeting_notes_text || null,
      JSON.stringify(parsedNewsSectionFiles),
      JSON.stringify(parsedNewsSectionLinks),
      news_section_text || null
    ]);

    // Fetch with join to include stock fields
    const fetchQuery = `
      SELECT 
        rs.*,
        s.macro_sector,
        s.sector,
        s.basic_industry,
        s.bse_code,
        s.nse_symbol
      FROM tblresearch_stocks rs
      LEFT JOIN public.stocks s ON rs.stock_id = s.id
      WHERE rs.id = $1
    `;
    const fetchResult = await db.query(fetchQuery, [result.rows[0].id]);

    const data = fetchResult.rows[0];

    return NextResponse.json({
      ...data,
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
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating research stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
