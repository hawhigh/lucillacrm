import { GoogleGenAI, Type } from "@google/genai";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

// Ensure API key is present
// Ensure API key is present
const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Helper to clean potential markdown formatting
const cleanJson = (text: string): string => {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
};

export const generateInvoiceFromPrompt = async (prompt: string, currentSupplier: any): Promise<Partial<any> | null> => {
  if (!apiKey) return null;

  try {
    const model = "gemini-2.0-flash";
    const systemInstruction = `You are an intelligent invoice assistant. 
    Your goal is to extract invoice details from a natural language prompt and return a structured JSON object matches the Invoice interface structure.
    Use the provided supplier details as the default supplier.
    Generate a realistic invoice number if not provided.
    Calculate due date as 14 days from today if not provided.
    For items, extract the unit (e.g., 'ks', 'h', 'm', 'kg') if available. Default to 'ks' if not specified but quantity implies a count.
    If a discount is mentioned for an item (e.g., "10% off"), extract it as a number (e.g., 10).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: `Current Supplier Context: ${JSON.stringify(currentSupplier)}. User Prompt: ${prompt}` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text));
    }
    return null;
  } catch (error) {
    console.error("Error generating invoice from prompt:", error);
    return null;
  }
};

export const analyzeInvoices = async (invoices: any[]): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot analyze data.";

  try {
    const model = "gemini-2.0-flash";
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: `Here is a list of recent invoices: ${JSON.stringify(invoices)}. Provide a brief, 2-sentence financial insight or observation about revenue trends, outstanding payments, or top clients. Keep it professional and helpful.` }] }],
    });
    return response.text || "No insights available.";
  } catch (error) {
    console.error(error);
    return "Error analyzing data.";
  }
}

const PROXIES = [
  "/finstat-api", // Local proxy via Vite
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://thingproxy.freeboard.io/fetch/",
];

async function fetchWithFallback(targetUrl: string): Promise<string> {
  console.log(`[Finstat] Fetching: ${targetUrl}`);

  // Try local proxy first if it's a Finstat URL
  if (targetUrl.includes("finstat.sk")) {
    try {
      const relativePath = targetUrl.replace("https://www.finstat.sk", "");
      const url = "/finstat-api" + relativePath;
      console.log(`[Finstat] Trying local proxy: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 500) return text;
      }
    } catch (e) {
      console.warn(`[Finstat] Local proxy failed, trying external ones:`, e);
    }
  }

  for (const proxy of PROXIES) {
    if (proxy === "/finstat-api") continue; // Already tried if applicable
    try {
      const url = proxy + encodeURIComponent(targetUrl);
      console.log(`[Finstat] Trying proxy: ${proxy}`);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 500) return text; // Ensure we got real content
      }
      console.warn(`[Finstat] Proxy ${proxy} returned status ${res.status}`);
    } catch (e) {
      console.warn(`[Finstat] Proxy ${proxy} failed:`, e);
    }
  }
  throw new Error("All proxies failed to fetch data.");
}

export const scrapeFinstat = async (query: string): Promise<any | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const model = "gemini-2.0-flash";

    // 0. Check if query is an ICO (8 digits)
    const trimmedQuery = query.trim();
    const isIco = /^\d{8}$/.test(trimmedQuery);
    let path = "";
    let searchHtml = "";
    let detailHtml = "";

    if (isIco) {
      console.log(`[Finstat] Query looks like an ICO, trying direct lookup...`);
      path = "/" + trimmedQuery;
    } else {
      // 1. Search Finstat using Cloud Function to avoid CORS/Proxy issues
      console.log(`[Finstat] Searching for: ${query} via Cloud Function`);
      try {
        const functions = getFunctions(app);
        const lookupFunc = httpsCallable(functions, 'lookupCompany');
        const searchUrl = `https://www.finstat.sk/vyhladavanie?query=${encodeURIComponent(query)}`;
        const result = await lookupFunc({ url: searchUrl });
        searchHtml = (result.data as any).html || "";
      } catch (err) {
        console.warn("[Finstat] Cloud Function lookup failed, falling back to legacy proxies...", err);
        const searchUrl = `https://www.finstat.sk/vyhladavanie?query=${encodeURIComponent(query)}`;
        searchHtml = await fetchWithFallback(searchUrl);
      }

      // 2. REGEX: Find the correct link instead of using AI
      console.log(`[Finstat] Parsing search results with robust regex...`);

      // Log snippet for debugging proxy response
      console.log(`[Finstat] Search HTML snippet (first 1000 chars): ${searchHtml.substring(0, 1000).replace(/\n/g, ' ')}`);

      // More flexible pattern: find first href that looks like /12345678 (optionally followed by company-name)
      const linkMatch = searchHtml.match(/href=["']?(\/\d{8}[^"'>\s]*)["']?/i);

      if (linkMatch && linkMatch[1]) {
        path = linkMatch[1];
        console.log(`[Finstat] Regex match success: ${path}`);
      }
    }

    if (!path || path.length < 2) {
      if (isIco) return null;
      console.warn("No company link found with regex, falling back to basic AI search...");
      try {
        const linkResult = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: `Search Query: "${query}" HTML Source snippet: ${searchHtml.substring(0, 5000)} ... Identify the relative path to the company detail (e.g. "/12345678"). Return ONLY path or "null".` }] }],
        });
        path = linkResult.text?.trim().replace(/`/g, "") || "";
      } catch (aiErr: any) {
        if (aiErr.message?.includes("429")) throw new Error("GEMINI_QUOTA_EXCEEDED");
        throw aiErr;
      }
    }

    if (!path || path.includes("null") || path.length < 2) {
      console.warn("No company found in search results.");
      return null;
    }

    if (!path.startsWith("/")) path = "/" + path;

    // 3. Fetch Detail Page via Cloud Function
    console.log(`[Finstat] Fetching details from: ${path}`);
    try {
      const functions = getFunctions(app);
      const lookupFunc = httpsCallable(functions, 'lookupCompany');
      const detailResult = await lookupFunc({ query: path });
      detailHtml = (detailResult.data as any).html || "";
    } catch (err) {
      console.warn("[Finstat] Detail Cloud Function failed, falling back to proxies...", err);
      const detailUrl = `https://www.finstat.sk${path}`;
      detailHtml = await fetchWithFallback(detailUrl);
    }

    try {
      const systemInstruction = `You are a data extractor.
      Your goal is to extract company details from the provided Finstat.sk HTML page.
      Return a strict JSON object matching this structure:
      {
        "name": "Full Company Name inc. s.r.o.",
        "addressLine1": "Street Name 123",
        "city": "City Name",
        "zip": "123 45",
        "country": "Slovakia",
        "ico": "12345678",
        "dic": "2021...",
        "icDph": "SK2021..." (if available, else empty string)
      }
      If a field is missing in the HTML, try to infer it safely or leave as empty string.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: `HTML Content: ${detailHtml.substring(0, 45000)}` }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        console.log("Finstat extraction success");
        return JSON.parse(cleanJson(response.text));
      }
    } catch (aiErr: any) {
      if (aiErr.message?.includes("429")) throw new Error("GEMINI_QUOTA_EXCEEDED");
      throw aiErr;
    }

    return null;

  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED") {
      console.error("Gemini API Quota Exceeded during Finstat extraction");
      return { error: "QUOTA_EXCEEDED" };
    }
    console.error("Error scraping finstat:", error);
    return null;
  }
};

export const extractCustomerFromImage = async (base64Image: string): Promise<any | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const systemInstruction = `You are an intelligent data extraction assistant.
    Your task is to analyze the provided image or PDF (which is likely an invoice or business card).
    Extract the details of the COMPANY listed on the document.
    - If it's an invoice, extract the VENDOR/SUPPLIER details (the one issuing the invoice).
    - If it's a business card, extract the company details.
    
    Return a strict JSON object matching this structure:
    {
      "name": "Full Company Name",
      "addressLine1": "Street Address",
      "city": "City",
      "zip": "ZIP Code",
      "country": "Country",
      "ico": "Registration Number (ICO)",
      "dic": "Tax ID (DIC)",
      "icDph": "VAT ID (IC DPH)",
      "email": "Email Address"
    }
    If a field is not visible, use empty string.
    `;

    // Detect mime type
    let mimeType = "image/jpeg";
    const headerMatch = base64Image.match(/^data:(.+?);base64,/);
    if (headerMatch) mimeType = headerMatch[1];
    else if (base64Image.startsWith("JVBERi0")) mimeType = "application/pdf";

    console.log(`[Gemini] Detected MIME Type (Customer): ${mimeType}`);
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Extract the company details from this document." },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text));
    }
    return null;
  } catch (error) {
    console.error("Error extracting customer from image:", error);
    return null;
  }
};

export const extractInvoiceFromImage = async (base64Image: string): Promise<any | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const systemInstruction = `You are an expert invoice data extractor.
      Analyze the provided invoice image or PDF.
      Extract ALL relevant data to populate an invoice form.
      
      Return a STRICT JSON object with this exact structure:
      {
        "supplier": {
           "name": "Supplier Name",
           "addressLine1": "Address",
           "city": "City",
           "zip": "ZIP",
           "country": "Country",
           "ico": "ICO",
           "dic": "DIC",
           "icDph": "IC DPH",
           "iban": "IBAN",
           "swift": "SWIFT",
           "bankName": "Bank Name"
        },
        "customer": {
           "name": "Customer Name",
           "addressLine1": "Address",
           "city": "City",
           "zip": "ZIP",
           "country": "Country",
           "ico": "ICO",
           "dic": "DIC",
           "icDph": "IC DPH"
        },
        "number": "Invoice Number",
        "issueDate": "YYYY-MM-DD",
        "dueDate": "YYYY-MM-DD",
        "deliveryDate": "YYYY-MM-DD",
        "variableSymbol": "VS",
        "constantSymbol": "KS",
        "specificSymbol": "SS",
        "paymentMethod": "Payment Method (e.g. Bank Transfer)",
        "currency": "EUR",
        "items": [
          {
            "description": "Item Description",
            "quantity": 1, 
            "unit": "ks",
            "unitPrice": 100.00,
            "vatRate": 20
          }
        ]
      }
      - For Dates: Convert to YYYY-MM-DD format.
      - For Numbers: Ensure standard formatting (no spaces in money, dots for decimals).
      - If a field is missing, use empty string or 0 for numbers.
      - Extract ALL line items found in the table.
      `;

    // Detect mime type
    let mimeType = "image/jpeg";
    const headerMatch = base64Image.match(/^data:(.+?);base64,/);
    if (headerMatch) mimeType = headerMatch[1];
    else if (base64Image.startsWith("JVBERi0")) mimeType = "application/pdf";

    console.log(`[Gemini] Detected MIME Type: ${mimeType}`);
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Extract full invoice data from this document." },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const cleaned = cleanJson(response.text);
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse invoice JSON:", response.text);
        return null;
      }
    }
    return null;

  } catch (error) {
    console.error("Error extracting invoice from image:", error);
    return null;
  }
};

export const extractExpenseFromImage = async (base64Image: string): Promise<any | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const systemInstruction = `You are an expert expense tracker assistant.
    Analyze the provided receipt or invoice image.
    Extract key details to populate an expense record.
    
    Classify the expense into one of these EXACT category IDs based on the vendor and items:
    - 'cat_office' (Office Supplies, Rent, Internet)
    - 'cat_travel' (Hotels, Flights, Uber, Fuel)
    - 'cat_software' (SaaS, Hosting, Adobe, Google)
    - 'cat_marketing' (Ads, Prints, Promo)
    - 'cat_rent' (Office Rent)
    - 'cat_utilities' (Electricity, Water)
    - 'cat_hardware' (Computers, Phones)
    - 'cat_meals' (Restaurants, Catering)
    - 'cat_professional' (Legal, Accounting, Consulting)
    - 'cat_other' (Anything else)

    Return a STRICT JSON object:
    {
      "vendor": "Vendor Name",
      "amount": 0.00,
      "date": "YYYY-MM-DD",
      "category": "cat_..." (one of the IDs above),
      "description": "Brief description of purchase (e.g. 'Office Supplies from Tesco')",
      "vatRate": 20 (infer from tax amount if visible, else default to 20 or 0 based on context),
      "taxDeductible": true (usually true for business expenses)
    }
    `;

    // Detect mime type
    let mimeType = "image/jpeg";
    const headerMatch = base64Image.match(/^data:(.+?);base64,/);
    if (headerMatch) mimeType = headerMatch[1];
    else if (base64Image.startsWith("JVBERi0")) mimeType = "application/pdf";

    console.log(`[Gemini] Detected MIME Type: ${mimeType}`);
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Extract expense details." },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      try {
        return JSON.parse(cleanJson(response.text));
      } catch (e) {
        console.error("Failed to parse expense JSON");
        return null;
      }
    }
    return null;

  } catch (error: any) {
    console.error("Error extracting expense:", error);
    if (error.message?.includes("400") || error.message?.includes("404")) {
      return { error: "Review API Key or Model." };
    }
    return null;
  }
};

export const extractCustomerFromText = async (text: string): Promise<any | null> => {
  if (!apiKey) return null;

  try {
    const systemInstruction = `You are an intelligent data extraction assistant.
    Analyze the provided text (email, signature, or note).
    Extract the details of the COMPANY mentioned.
    
    Return a strict JSON object:
    {
      "name": "Full Company Name",
      "addressLine1": "Street Address",
      "city": "City",
      "zip": "ZIP Code",
      "country": "Country",
      "ico": "ICO",
      "dic": "DIC",
      "icDph": "IC DPH",
      "email": "Email"
    }
    If a field is not present, use empty string.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Text to analyze: ${text}` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      return JSON.parse(cleanJson(response.text));
    }
    return null;
  } catch (error) {
    console.error("Error extracting customer from text:", error);
    return null;
  }
};