import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Categories for prompt grounding
const CATEGORY_NAMES = [
  "Rent / housing installment (کرێی خانوو یان قیست)",
  "Electricity & generator (کارەبا و مۆلیدە)",
  "Water (ئاو)",
  "Gas & heating fuel (گاز و نەوت)",
  "Internet (ئینتەرنێت)",
  "Mobile & credit (مۆبایل و کارت)",
  "Groceries (خواردن و بازاڕ)",
  "Bread & bakery (نان و نانەوایی)",
  "Meat & poultry (گۆشت و مریشک)",
  "Fruit & vegetables (میوە و سەوزە)",
  "Restaurants & cafes (ڕێستۆران و کافێ)",
  "Car fuel (بەنزین)",
  "Transport & taxi (گواستنەوە و تاکسی)",
  "Car maintenance (چاککردنەوەی ئوتومبێل)",
  "Car installment (قیستی ئوتومبێل)",
  "Medicine & doctor (دەرمان و دکتۆر)",
  "Clothing (جلوبەرگ)",
  "Household supplies (پێداویستی ماڵ)",
  "Furniture & appliances (کەلوپەل و کارەبایی)",
  "Home repairs (چاککردنەوەی ماڵ)",
  "School & tuition (قوتابخانە و خوێندن)",
  "Children (منداڵان)",
  "Gifts & occasions (هەدیە و بۆنەکان)",
  "Family support (یارمەتی کەسوکار)",
  "Charity & zakat (زەکات و خێر)",
  "Travel & picnics (گەشت و سەیران)",
  "Entertainment (خۆشی و یاری)",
  "Personal care & barber (جوانکاری و سەرتاشین)",
  "Insurance (بیمە)",
  "Debt repayment (قەرزدانەوە)",
  "Rotating savings circle (کۆمەڵە / جەمعیە)",
  "Other (خەرجی تر)"
];

// Endpoint: Receipt Scanner
app.post('/api/scan-receipt', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { image, mimeType = 'image/jpeg' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data.' });
    }

    // Clean base64 data
    const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;

    const prompt = `You are an expert OCR and financial document parser specializing in receipts and invoices from Iraq and the Kurdistan Region.
The text on the receipt may be written in Kurdish (Sorani/Badini), Arabic, or English.
Numbers might be Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) or standard European digits (0-9). Convert all numbers to regular integers or decimals.
Examine the receipt image and extract:
1. "total": The final total amount paid (numeric value only, e.g. 25000 or 15.5).
2. "currency": Either "IQD" or "USD". Default to "IQD" unless "$" or "USD" is clearly indicated.
3. "date": Date in "YYYY-MM-DD" format if visible, otherwise null.
4. "merchant": The store, market, restaurant, or vendor name (short string).
5. "category": An integer index (0 to 31) that best matches the items bought, chosen strictly from:
${CATEGORY_NAMES.map((c, i) => `${i}: ${c}`).join('\n')}
6. "note": A concise summary of items purchased or merchant name (under 70 characters).

Return ONLY a valid JSON object matching this schema:
{
  "total": number,
  "currency": "IQD" | "USD",
  "date": string | null,
  "merchant": string,
  "category": number,
  "note": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error scanning receipt:', err);
    return res.status(500).json({ error: err.message || 'Failed to scan receipt' });
  }
});

// Endpoint: Quick Text Entry Parser
app.post('/api/parse-quick-entry', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text content.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Today's date is ${today}.
Parse this natural language household expense entry note into a structured expense.
The input can be in Kurdish Sorani, Kurdish Badini, Arabic, Persian, Turkish, or English.
Handle common local phrasing:
- "هەزار", "k", "ألف", "هه‌زار", "thousand" means multiplied by 1,000 (e.g., "٤٥ هەزار" or "45 hezar" = 45000).
- "دۆلار", "$", "USD", "ورق" means USD.
- Digits can be Arabic-Indic (٠-٩) or 0-9.
Category must be an integer index (0 to 31) strictly from:
${CATEGORY_NAMES.map((c, i) => `${i}: ${c}`).join('\n')}

Input text: "${text}"

Respond with ONLY valid JSON:
{
  "total": number,
  "currency": "IQD" | "USD",
  "date": string | null,
  "category": number,
  "note": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error parsing quick entry:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse expense note' });
  }
});

// Endpoint: AI Budget & Spending Advisor
app.post('/api/month-analysis', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { data, language = 'Kurdish Sorani' } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing budget data.' });
    }

    const prompt = `You are a supportive, insightful personal finance and household budgeting coach.
Language to respond in: ${language}.
Here is the household financial data for the month:
${JSON.stringify(data, null, 2)}

Provide:
1. Three concise, encouraging observations comparing spending vs previous month and budget limits.
2. Three practical, realistic money-saving tips tailored to these specific categories.
Keep the tone respectful, clear, and direct. Keep it under 200 words. Format with clean bullet points.
Do not output robotic disclaimers; this is a helpful household budget breakdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return res.json({ analysis: response.text || '' });
  } catch (err: any) {
    console.error('Error in month analysis:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate month analysis' });
  }
});

// Endpoint: AI Financial Health Analysis & 3 Actionable Money-Saving Tips
app.post('/api/financial-health-analysis', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { data, language = 'Kurdish Sorani' } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing financial health data.' });
    }

    const prompt = `You are an expert, supportive personal finance and budgeting coach analyzing a household's monthly finances.
Respond strictly in this language: ${language}.
Financial Data for the month:
- Month: ${data.month || 'Current'}
- Total Income: ${data.totalIncomeIQD ? `${data.totalIncomeIQD} IQD` : 'Not disclosed / locked'}
- Total Expenses: ${data.totalExpensesIQD} IQD
- Net Savings: ${data.savingsIQD} IQD
- Savings Rate: ${data.savingsRatePct}%
- Needs vs Wants vs Savings (50/30/20): Needs ${data.needsPct}%, Wants ${data.wantsPct}%, Savings ${data.savingsPct}%
- Top Spending Categories:
${(data.topCategories || []).map((c: any) => `  * ${c.category}: Spent ${c.spentIQD} IQD (Budget: ${c.budgetIQD || 0} IQD)`).join('\n')}
- Comparison with Previous Month: ${data.previousMonthExpensesIQD ? `Previous month was ${data.previousMonthExpensesIQD} IQD (Change: ${data.monthChangePct}%)` : 'No previous month data'}
- Active Debts: ${data.activeDebtsTotal ? `${data.activeDebtsTotal} IQD` : 'None'}
- Top Individual Purchases: ${(data.topPurchases || []).join(', ') || 'None specified'}

Your task:
1. Provide a brief 2-3 sentence analysis of the month's spending patterns and habits (highlighting what drove expenses, budget adherence, or notable trends).
2. Provide EXACTLY 3 brief, actionable, realistic money-saving tips directly tailored to this user's data and top spending categories (e.g. food/groceries, fuel, dining, utilities, subscriptions). Each tip must have an action and an estimated realistic saving or impact.

Format your response as valid JSON with this exact schema:
{
  "spendingPatternAnalysis": "2-3 concise sentences analyzing the month's spending patterns and trends in ${language}",
  "tips": [
    {
      "title": "Short catchy title in ${language} (3-5 words)",
      "action": "Brief, actionable tip in ${language} (1-2 sentences)",
      "category": "Category name or general theme",
      "impact": "Estimated saving or financial benefit in ${language}"
    },
    {
      "title": "Short catchy title in ${language} (3-5 words)",
      "action": "Brief, actionable tip in ${language} (1-2 sentences)",
      "category": "Category name or general theme",
      "impact": "Estimated saving or financial benefit in ${language}"
    },
    {
      "title": "Short catchy title in ${language} (3-5 words)",
      "action": "Brief, actionable tip in ${language} (1-2 sentences)",
      "category": "Category name or general theme",
      "impact": "Estimated saving or financial benefit in ${language}"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in financial health analysis:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze financial health' });
  }
});

// Endpoint: AI Budget Suggestion based on last 3 months category spending
app.post('/api/ai-suggest-budget', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const { data, language = 'Kurdish Sorani' } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing budget history data.' });
    }

    const {
      currentMonth,
      monthlyIncomeIQD,
      months,
      categoryNames,
      currentBudgets
    } = data;

    const monthList = (months || []).map((m: any) => m.month).join(', ');

    // Build category summary
    const categorySummary = (categoryNames || []).map((name: string, i: number) => {
      const m1 = months?.[0]?.spendingPerCategory?.[i] || 0;
      const m2 = months?.[1]?.spendingPerCategory?.[i] || 0;
      const m3 = months?.[2]?.spendingPerCategory?.[i] || 0;
      const avg = Math.round((m1 + m2 + m3) / 3);
      const curBud = currentBudgets?.[i] || 0;
      return `${i}: ${name} -> [${months?.[0]?.month || 'M-1'}: ${m1} IQD, ${months?.[1]?.month || 'M-2'}: ${m2} IQD, ${months?.[2]?.month || 'M-3'}: ${m3} IQD] (3-mo avg: ${avg} IQD, current budget: ${curBud} IQD)`;
    }).join('\n');

    const prompt = `You are a certified, practical household budgeting coach and financial advisor.
Respond strictly in this language: ${language}.
Task: Propose a realistic, balanced, and sustainable monthly budget allocation for the upcoming month (${currentMonth}) by analyzing the last 3 months of category-wise spending.

Past 3 months analyzed: ${monthList || 'Past 3 consecutive months'}
Household Monthly Income: ${monthlyIncomeIQD ? `${monthlyIncomeIQD} IQD` : 'Not disclosed / private'}

Category Spending History (32 standard categories):
${categorySummary}

Guidelines for proposing realistic monthly budget allocations:
1. Examine spending patterns and volatility:
   - For recurring essentials (Rent, Internet, Generator, Water, Fuel), propose a realistic allocation covering actual bills plus a safe 5-10% buffer if fluctuating.
   - For variable necessities (Groceries, Meat, Fruit/Veggies, Bread), use the 3-month average plus a reasonable 5-10% seasonal/market buffer.
   - For discretionary categories (Dining/Restaurants, Clothes, Entertainment, Barber), propose a disciplined, realistic cap that controls leaks without being unfeasibly harsh.
   - If a category had 0 spending across all 3 months, you can set budget to 0 or a modest baseline if commonly needed.
   - Round every proposed budget amount in IQD to clean numbers (multiples of 5,000 or 10,000 IQD).
   - If monthly income is provided, ensure the total proposed budget leaves a healthy margin for savings (aiming for 15-20% savings rate if possible).
2. Write a clear, encouraging 2-3 sentence overview explanation in ${language}.
3. Provide 3 specific bullet point highlights or recommendations in ${language}.
4. Provide the exact array of 32 proposed budget amounts in IQD (integers) in category index order 0 to 31.

Format your response as strictly valid JSON with this exact schema:
{
  "explanation": "2-3 sentences explaining the strategy and rationale for this proposed allocation in ${language}",
  "highlights": [
    "Key observation or adjustment 1 in ${language}",
    "Key observation or adjustment 2 in ${language}",
    "Key observation or adjustment 3 in ${language}"
  ],
  "proposedBudgets": [
    { "index": 0, "amount": number, "reason": "Brief rationale in ${language}" }
  ],
  "totalProposedBudget": number
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in AI budget suggestion:', err);
    return res.status(500).json({ error: err.message || 'Failed to suggest budget' });
  }
});

// 6. AI Financial Advisor Chat
app.post('/api/ai-chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }
    const { question, summaryData, language = 'Kurdish (Sorani)' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const prompt = `You are a compassionate, expert personal & family financial advisor speaking in ${language}.
Here is the user's current financial snapshot (all amounts in IQD unless noted):
${JSON.stringify(summaryData, null, 2)}

User's Question: "${question}"

Instructions:
- Answer directly, warmly, and concisely in ${language} (3-5 sentences max).
- Use the exact numbers from their financial snapshot when relevant.
- Give 1 practical, encouraging next step.
- Do not use robotic disclaimers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ answer: response.text || '' });
  } catch (err: any) {
    console.error('Error in AI chat:', err);
    return res.status(500).json({ error: err.message || 'Failed to answer question' });
  }
});

// 7. AI Spending Leaks, Debt Payoff Optimizer & Smart Shopping Insights
app.post('/api/ai-insights', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }
    const { summaryData, language = 'Kurdish (Sorani)' } = req.body;

    const prompt = `You are an expert financial analyst. Analyze this household's financial data (in IQD):
${JSON.stringify(summaryData, null, 2)}

Respond ONLY with a valid JSON object in ${language} with this exact structure:
{
  "leaks": [
    { "title": "Short title of spending leak or anomaly", "detail": "1-2 sentences explaining the leak and how much can be saved" }
  ],
  "debtPlan": "2-3 sentences recommending the smartest, lowest-stress way to pay off their debts (or congratulating them if they have no debts)",
  "shoppingTip": "1-2 sentences with a smart shopping & budget tip for this month"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in AI insights:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate AI insights' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
