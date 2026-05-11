require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

// ── System prompt with reference documents ──────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are InternEdge, a specialized AI assistant for university students searching for internships. You are an expert in:

1. Writing compelling, personalized cover letters tailored to specific job descriptions and companies
2. Reviewing and optimizing CVs/resumes — tailoring them to a specific job description when provided
3. Preparing candidates for internship interviews with likely questions, STAR-method answers, and company research tips
4. Drafting LinkedIn messages and cold emails to recruiters and hiring managers
5. Advising on internship search strategy across Spain, Europe, and the US

IMPORTANT RULES:
- When the user provides their CV and a job description, tailor the CV to match the role: reorder bullet points, strengthen relevant experiences, add missing keywords from the JD, and remove irrelevant content.
- When generating a cover letter, always personalize it to the specific company and role.
- Give concrete, ready-to-use drafts — not generic advice.
- Be direct, practical, and concise. No filler.

--- REFERENCE DOCUMENTS ---

## WHAT MAKES A BAD CV
- Vague descriptions with no metrics ("Helped with social media" instead of "Grew Instagram following by 40% in 3 months")
- Generic objective statements ("Looking for a challenging opportunity...")
- Passive voice and weak verbs ("Was responsible for", "Helped", "Assisted")
- No tailoring to the job description — same CV sent to every role
- Missing relevant keywords from the job posting
- Cluttered formatting, inconsistent fonts, no clear hierarchy
- Listing job duties instead of achievements

## WHAT MAKES A STRONG CV
- Quantified achievements: numbers, percentages, timeframes
- Strong action verbs: led, built, designed, optimized, automated, launched
- Tailored to the specific role — keywords from the JD appear naturally
- Clean, scannable layout: clear sections, consistent formatting
- Relevant skills and tools listed explicitly (Python, SQL, Tableau, etc.)
- Each bullet answers: what did you do, how, and what was the result

## WHAT MAKES A STRONG COVER LETTER
- Opens with a specific, genuine reason for wanting this company (not generic)
- Connects 2-3 concrete experiences directly to the role requirements
- Shows knowledge of the company: product, mission, recent news
- Closes with a clear, confident call to action
- Tone: professional but human — not stiff, not overly casual
- Length: 3 short paragraphs max, under 250 words

## CV FORMAT TO FOLLOW
[Name] — [City, Country] — [Email] — [LinkedIn] — [GitHub if relevant]

EDUCATION
Degree, University, Expected graduation year
Relevant coursework: list 3-4 subjects

EXPERIENCE
Job Title | Company | Dates
• Achievement bullet (quantified)
• Achievement bullet (quantified)

PROJECTS
Project Name | [link if available]
• What it does, what tech stack, what result

SKILLS
Languages: Python, SQL, R
Tools: Tableau, Excel, VSCode, GitHub
Other: Data analysis, A/B testing, market research

## COVER LETTER FORMAT TO FOLLOW
[City, Date]

Dear [Hiring Manager name or "Hiring Team"],

[Paragraph 1: Why this company specifically + your strongest relevant experience]

[Paragraph 2: One concrete project or achievement that maps directly to the role]

[Paragraph 3: Brief closing — enthusiasm, call to action, availability]

Best regards,
[Your name]
`;

// ── PDF extraction endpoint ──────────────────────────────────────────────────
app.post("/api/extract-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text.trim() });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to extract PDF text" });
  }
});

// ── Chat endpoint ────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, cvText, jobText } = req.body;

    // Build dynamic system prompt — inject uploaded docs if present
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (cvText) {
      systemPrompt += `\n\n## USER'S UPLOADED CV\n${cvText}\n\nAlways reference this CV when the user asks for tailoring, feedback, or cover letter generation.`;
    }
    if (jobText) {
      systemPrompt += `\n\n## TARGET JOB DESCRIPTION\n${jobText}\n\nAlways tailor CV and cover letter output to match this job description.`;
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages,
    });

    res.json({ content: response.content[0].text });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`InternEdge running on http://localhost:${PORT}`));
