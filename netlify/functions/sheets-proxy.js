// netlify/functions/sheets-proxy.js

// Your Google Apps Script Web App URL
const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbwJLkpBFumTFzU_7Jd_o36t34YSE2p7_MHqvYcjSIcAOt9HKv6yy7stE7nLZBNbA_RRHw/exec";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async function (event, context) {
  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    if (event.httpMethod === "GET") {
      // Load from Sheets
      const res = await fetch(SHEETS_WEBAPP_URL, { method: "GET" });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: text,
      };
    }

    if (event.httpMethod === "POST") {
      // Save to Sheets
      const res = await fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
      });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: text,
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method Not Allowed",
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
