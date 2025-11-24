// netlify/functions/sheets-proxy.js

const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzn_KM41zDcCncHX2-ICQ8rxFj-4KwjGzMGPqGuo_wd7JYsqISiveO_O-LIpXe4kq0C_A/exec";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    if (event.httpMethod === "GET") {
      const res = await fetch(SHEETS_WEBAPP_URL, { method: "GET" });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: text
      };
    }

    if (event.httpMethod === "POST") {
      const res = await fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body
      });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: text
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method Not Allowed"
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: String(err) })
    };
  }
};
