const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenerativeAI(apiKey);
}

const PROMPTS = {
 po: `You are an expert document extraction system.

Extract structured data from the uploaded Purchase Order PDF.

You MUST read the actual document and extract the values exactly as
they appear. Do not invent, guess, summarize, or use placeholder values.

Return ONLY valid JSON. Do not return markdown, explanations, or code fences.

Return exactly this structure:

{
  "poNumber": "",
  "poDate": "",
  "vendorName": "",
  "items": [
    {
      "itemCode": "",
      "description": "",
      "quantity": 0
    }
  ]
}

HEADER EXTRACTION:

1. poNumber
Find the value next to the label "PO No", "PO No.", "Purchase Order No",
or "Purchase Order Number".

Copy the value exactly as printed.

IMPORTANT:
Do NOT use an invoice number, GRN number, reference code, GST number,
or any other number as poNumber.

2. poDate
Find the value next to the exact label "PO Date".

IMPORTANT:
"PO Date" and "PO Release Date" are separate fields.
Use ONLY the value next to "PO Date".

Do not use:
- PO Release Date
- Expected Delivery Date
- PO Expiry Date
- Invoice Date
- GRN Date

3. vendorName
Extract the actual supplier/vendor name from the "Vendor Name"
section of the Purchase Order.

Do not return generic values such as:
"Supplier"
"Vendor"
"Unknown"
"N/A"

ITEM TABLE EXTRACTION:

The Purchase Order contains a product table.

This table may span MULTIPLE PAGES.

You MUST inspect EVERY PAGE of the PDF and extract EVERY actual
product line from the Purchase Order.

Do NOT stop after the first page.

Do NOT stop after the first 3 rows.

Do NOT assume there are only 3 items.

For every actual product row, extract:

- itemCode: exact value from the "Item Code" column
- description: complete value from the "Item Desc" column
- quantity: numeric value from the "Qty" column

The table may contain columns such as:

S. No
Item Code
Item Desc
HSN Code
Qty
MRP
Unit Base Cost
Taxable Value
CGST
SGST/UGST
IGST
CESS
Additional CESS
Total

Only extract actual product rows.

DO NOT include:
- table headers
- page headers
- subtotal rows
- tax rows
- grand total rows
- blank rows
- non-product rows

ITEM CODE RULES:

Copy item codes exactly as printed in the document.

NEVER invent item codes.

NEVER convert an item code into:
ITEM1
ITEM2
ITEM3
SKU1
SKU2
SKU3

If an actual item code is numeric, return it as a string.

For example, if the document contains an Item Code of 11423,
return:

"itemCode": "11423"

QUANTITY RULES:

Use the value from the Qty column.

Return quantity as a number only.

For example:

"quantity": 50

not:

"quantity": "50 units"

COMPLETENESS REQUIREMENT:

The items array MUST contain every product row found across ALL
pages of the Purchase Order.

Before returning the response, perform this checklist:

1. Did I inspect every page?
2. Did I extract every product row?
3. Did I accidentally stop after page 1?
4. Did I accidentally stop after 3 items?
5. Did I copy item codes from the Item Code column?
6. Did I use the Qty column for quantity?
7. Did I accidentally include subtotal/tax/total rows?
8. Did I use PO Date instead of PO Release Date?
9. Did I extract the actual vendor name?
10. Did I avoid creating generic item codes?

If any answer is no, correct the JSON before returning it.

Return ONLY the JSON object.`,

  grn: `You are extracting structured data from a Goods Receipt Note (GRN) document.
Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "grnNumber": string,
  "poNumber": string,
  "grnDate": string (ISO 8601 date),
  "items": [
    { "itemCode": string, "description": string, "receivedQuantity": number, "mrp": number }
  ]
}
Rules:
- "receivedQuantity" is the actually received quantity column (often labelled "Recv Qty").
- "mrp" should be the line MRP if visible, otherwise 0.
- Include every line item row, even if some fields are missing.
- If a field is not present, use "" for strings or 0 for numbers - never omit a key.`,

  invoice: `You are extracting structured data from a vendor Tax Invoice document.
Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "invoiceNumber": string,
  "poNumber": string,
  "invoiceDate": string (ISO 8601 date),
  "items": [
    { "itemCode": string, "description": string, "quantity": number, "unitRate": number, "mrp": number }
  ]
}
Rules:
- "poNumber" is usually shown as "Customer Order No." on the invoice.
- "unitRate" is the per-unit rate/price billed (often labelled "Rate").
- "mrp" should be 0 if not visible on the invoice.
- Include every line item row, even if some fields are missing.
- If a field is not present, use "" for strings or 0 for numbers - never omit a key.`
};

const REQUIRED_FIELDS = {
  po: ['poNumber', 'poDate', 'vendorName', 'items'],
  grn: ['grnNumber', 'poNumber', 'grnDate', 'items'],
  invoice: ['invoiceNumber', 'poNumber', 'invoiceDate', 'items']
};

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
}

function validateShape(documentType, parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return 'Response is not a JSON object';
  }

  const required = REQUIRED_FIELDS[documentType];

  for (const field of required) {
    if (!(field in parsed)) {
      return `Missing required field: ${field}`;
    }
  }

  // Required fields must not be empty
  const identifierFields = {
    po: ['poNumber', 'poDate', 'vendorName'],
    grn: ['grnNumber', 'poNumber', 'grnDate'],
    invoice: ['invoiceNumber', 'poNumber', 'invoiceDate']
  };

  for (const field of identifierFields[documentType]) {
    if (
      typeof parsed[field] !== 'string' ||
      !parsed[field].trim()
    ) {
      return `Required field "${field}" is empty`;
    }
  }

  if (!Array.isArray(parsed.items)) {
    return '"items" must be an array';
  }

  if (parsed.items.length === 0) {
    return '"items" must contain at least one item';
  }

  // PO-specific sanity checks
  if (documentType === 'po') {
    if (
      parsed.vendorName.trim().toLowerCase() === 'supplier'
    ) {
      return 'Generic vendor name extracted instead of actual vendor';
    }

    if (
      parsed.items.some(item =>
        /^ITEM\d+$/i.test(
          String(item.itemCode || '').trim()
        )
      )
    ) {
      return 'PO item extraction contains generic item codes';
    }
  }

  return null;
}

function fileToGenerativePart(filePath, mimeType) {
  const data = fs.readFileSync(filePath).toString('base64');
  return { inlineData: { data, mimeType } };
}

/**
 * Calls Gemini once for the given document type + file, retrying once on
 * malformed/invalid JSON. Throws a clear error if both attempts fail.
 */
async function extractDocument(documentType, filePath, mimeType) {
  const prompt = PROMPTS[documentType];
  if (!prompt) throw new Error(`Unsupported documentType: ${documentType}`);

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0
  }
});
  const filePart = fileToGenerativePart(filePath, mimeType);

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await model.generateContent([prompt, filePart]);
      const rawText = result.response.text();
      const cleaned = stripCodeFences(rawText);

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        lastError = `Attempt ${attempt}: Gemini did not return valid JSON (${e.message})`;
        continue;
      }

      const validationError = validateShape(documentType, parsed);
      if (validationError) {
        lastError = `Attempt ${attempt}: ${validationError}`;
        continue;
      }

      return { parsed, raw: rawText };
    } catch (e) {
      lastError = `Attempt ${attempt}: Gemini call failed (${e.message})`;
    }
  }

  throw new Error(`Failed to extract ${documentType} after 2 attempts. Last error: ${lastError}`);
}

module.exports = { extractDocument };
