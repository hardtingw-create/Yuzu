// Netlify Serverless Function
// This acts as a proxy so the browser NEVER directly calls Google Apps Script.
// It also solves ALL CORS problems and keeps your secret URL hidden.

const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbwJLkpBFumTFzU_7Jd_o36t34YSE2p7_MHqvYcjSIcAOt9HKv6yy7stE7nLZBNbA_RRHw/exec";

export default async function handler(event, context) {
  try {
    if (event.httpMethod === "GET") {
      // Load data
      const response = await fetch(SHEETS_WEBAPP_URL, {
        method: "GET",
      });

      const text = await response.text();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: text,
      };
    }

    if (event.httpMethod === "POST") {
      // Save data
      const response = await fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
      });

      const text = await response.text();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: text,
      };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) }),
    };
  }
}
