import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '../index.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const MISTRAL_MODEL = "mistral-small-latest";

export class GeminiService {
  // Gemini 2.5 flash models — highest free-tier RPM limits
  private static modelFlash = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-preview-04-17",
    generationConfig: { responseMimeType: "application/json" }
  });

  private static modelLite = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  private static modelPro = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  /**
   * Calls Gemini with 2 automatic retries on rate-limit (429).
   * Switches between Flash, Lite (8B), and Pro before falling back to Mistral.
   */
  private static async callAI(prompt: string): Promise<string> {
    const models = [this.modelFlash, this.modelLite, this.modelPro];
    const modelNames = ['gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    
    for (let m = 0; m < models.length; m++) {
      const model = models[m];
      const modelName = modelNames[m];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          logger.info(`[AI] Trying ${modelName} (attempt ${attempt + 1})...`);
          const result = await model.generateContent(prompt);
          logger.info(`[AI] ${modelName} succeeded.`);
          return result.response.text();
        } catch (err: any) {
          const status = err?.status ?? err?.httpStatus ?? 0;
          const isRateLimit = status === 429 || (err?.message ?? '').includes('429') || (err?.message ?? '').includes('quota');
          
          if (isRateLimit && attempt < 1) {
            logger.warn(`[AI] Rate limit on ${modelName} — waiting 3s before retry...`);
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          logger.warn(`[AI] ${modelName} failed (${err?.message ?? 'unknown'}) — trying next model...`);
          break;
        }
      }
      // Small delay between models to avoid immediate cascading 429s
      if (m < models.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    // ── final fallback to Mistral ──
    logger.warn(`[AI] All Gemini models failed — falling back to Mistral.`);
    return await this.callMistral(prompt);
  }

  /**
   * Direct call to Mistral AI.
   * Used for bulk tasks to save Gemini credits.
   */
  /**
   * Direct call to Mistral AI — expects a JSON object response.
   */
  private static async callMistral(prompt: string): Promise<string> {
    if (!MISTRAL_API_KEY) {
      throw new Error('[AI] Mistral API key is not set.');
    }
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Mistral HTTP ${res.status}: ${body}`);
      }
      const json: any = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? '';
      logger.info('[AI] Mistral responded successfully.');
      return text;
    } catch (mistralErr: any) {
      logger.error('[AI] Mistral call failed:', mistralErr?.message);
      throw mistralErr;
    }
  }

  /**
   * Direct call to Mistral AI — forces a JSON ARRAY response (used for question generation).
   */
  private static async callMistralArray(prompt: string): Promise<string> {
    if (!MISTRAL_API_KEY) {
      throw new Error('[AI] Mistral API key is not set.');
    }
    const mistralPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON array []. No prose, no markdown, no wrapper object.`;
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [{ role: 'user', content: mistralPrompt }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Mistral HTTP ${res.status}: ${body}`);
      }
      const json: any = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? '';
      logger.info('[AI] Mistral (array) responded successfully.');
      return text;
    } catch (mistralErr: any) {
      logger.error('[AI] Mistral array call failed:', mistralErr?.message);
      throw mistralErr;
    }
  }

  private static parseJsonResponse(text: string) {
    if (!text) return null;
    try {
      // 1. Remove markdown code blocks if present (e.g., ```json ... ```)
      let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      
      // 2. If it's still not valid, try to extract anything between { } or [ ]
      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : cleaned;
      
      return JSON.parse(cleanJson);
    } catch (e) {
      logger.error("[GEMINI] JSON Parse Error. Raw text snippet:", text.substring(0, 300));
      return null;
    }
  }

  /** Fisher-Yates shuffle */
  private static shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Reformat admin-typed raw notes/hints into polished, professional interview questions.
   * e.g. "react hooks" → "Can you explain how React Hooks work and give a real-world example?"
   */
  static async formatAdminQuestions(rawQuestions: string[]): Promise<string[]> {
    if (!rawQuestions.length) return [];
    logger.info("[GEMINI] formatAdminQuestions starting...");

    const prompt = `
      You are a senior technical interviewer. The hiring admin has typed some rough question prompts or notes.
      Rewrite EACH ONE into a clear, professional, open-ended interview question exactly as a seasoned interviewer would ask it.

      Raw prompts (one per line):
      ${rawQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

      Rules:
      - Preserve the core intent of each prompt.
      - Each question must be open-ended (not yes/no).
      - Do NOT add, merge, or remove questions — rewrite EXACTLY the same count: ${rawQuestions.length}.
      - Output ONLY a JSON array of strings with no extra text.
      
      Return EXACTLY: ["Rewritten question 1", "Rewritten question 2", ...]
    `;

    try {
      const text = await this.callAI(prompt);
      const formatted = this.parseJsonResponse(text);
      if (Array.isArray(formatted) && formatted.length === rawQuestions.length) {
        logger.info("[AI] Admin questions formatted successfully.");
        return formatted;
      }
      logger.warn("[AI] formatAdminQuestions: count mismatch, using originals.");
      return rawQuestions;
    } catch (error) {
      logger.error("[AI] formatAdminQuestions failed:", error);
      return rawQuestions; // safe fallback
    }
  }

  /**
   * Check if a candidate's resume aligns with the campaign job role.
   */
  static async checkResumeAlignment(resumeText: string, campaignTitle: string, jobRole: string, requiredSkills: string[]) {
    logger.info("[GEMINI] checkResumeAlignment starting...");
    const prompt = `
      You are a strict HR gatekeeper AI. Determine whether a candidate's resume is relevant to the job opening.

      Job Opening: ${campaignTitle} ${jobRole ? `(Role: ${jobRole})` : ''}
      Required Skills: ${requiredSkills.join(', ')}

      Candidate Resume Text:
      ${resumeText.substring(0, 3000)}

      Instructions:
      - We want to block candidates from completely unrelated fields (e.g. Civil Engineering for a Software role, or Sales for a Data Science role).
      - BE LENIENT with overlapping technical domains. If a candidate has a background in AI, ML, Data Engineering, or Software Engineering and is applying for an "AI Engineer" or "Software Engineer" role, return aligned: true.
      - A match in the general technical domain (Information Technology / Engineering) is usually enough unless the role is extremely specific (like Medicine vs Law).
      - Do NOT reject an AI/ML specialist for an AI Engineer role just because they lack specific framework experience; they are in the correct domain.

      Return EXACTLY:
      { "aligned": boolean, "reason": "High-level domain alignment explanation.", "matchScore": number }
    `;

    try {
      const text = await this.callAI(prompt);
      const data = this.parseJsonResponse(text);
      if (!data) return { aligned: true, reason: "Alignment check inconclusive — proceeding.", matchScore: 50 };
      return data;
    } catch (error: any) {
      logger.error("[AI_ERROR] checkResumeAlignment:", error);
      return { aligned: true, reason: "Alignment check failed — proceeding with interview.", matchScore: 50 };
    }
  }

  static async extractBulkProfile(resumeText: string, jobRole: string) {
    logger.info("[GEMINI] extractBulkProfile starting...");
    const prompt = `
      You are an expert HR sourcer analyzing a batch of raw resumes for the role of: "${jobRole}".
      
      Extract the candidate's core identity and assign a robust Fit Score (0 to 100) based on how well their skills listed align with the core requirements typically expected for the targeted Job Role.
      
      Instructions:
      1. Name: Find the candidate's full name. If absent, return "".
      2. Email: Find the primary email. If absent, return "".
      3. Phone: Return phone or "".
      4. Skills: List max 10 key skills found.
      5. fitScore: Integer 0-100 indicating match to "${jobRole}".
      6. reason: One tight sentence explaining the score.

      Raw Resume Text:
      ${resumeText.substring(0, 3000)}

      Return EXACTLY this JSON structure without markdown or code blocks:
      {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-1234",
        "skills": ["React", "Node", "PostgreSQL"],
        "fitScore": 85,
        "reason": "Strong frontend web experience matching expectations."
      }
    `;

    const tryParse = (text: string) => {
      const data = this.parseJsonResponse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      return {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        fitScore: typeof data.fitScore === 'number' ? data.fitScore : 50,
        reason: data.reason || 'Parsed from resume.'
      };
    };

    // 1. Mistral FIRST for bulk ops — preserves Gemini quota for question generation
    try {
      const mistralText = await this.callMistral(prompt);
      const result = tryParse(mistralText);
      if (result) {
        logger.info(`[SOURCING] extractBulkProfile via Mistral. Name: ${result.name || '(no name found)'}`);
        return result;
      }
      logger.warn('[SOURCING] extractBulkProfile: Mistral returned unparsable data, trying Gemini...');
    } catch (mistralErr: any) {
      logger.warn('[SOURCING] extractBulkProfile: Mistral failed, trying Gemini...', mistralErr?.message);
    }

    // 2. Gemini as fallback only (limited quota — use sparingly)
    try {
      const geminiText = await this.callAI(prompt);
      const result = tryParse(geminiText);
      if (result) {
        logger.info(`[SOURCING] extractBulkProfile via Gemini fallback. Name: ${result.name || '(no name found)'}`);
        return result;
      }
    } catch (geminiErr: any) {
      logger.error('[SOURCING] extractBulkProfile: Gemini also failed:', geminiErr?.message);
    }

    // 3. Hard fallback — at least return something usable
    logger.error('[SOURCING] extractBulkProfile: All AI models failed — returning empty profile.');
    return {
      name: '',
      email: '',
      phone: '',
      skills: [],
      fitScore: 0,
      reason: 'Profile extraction failed — manual review needed.'
    };
  }

  static async analyzeResume(extractedText: string, requiredSkills: string[]) {
    logger.info("[GEMINI] analyzeResume starting...");
    const prompt = `
      You are an expert HR Technical Recruiter. Analyze the following resume text.
      Required Skills: ${requiredSkills.join(", ")}
      Resume: ${extractedText.substring(0, 3000)}
      
      Return EXACTLY:
      {
        "skillMatchPercentage": number,
        "summary": "2-3 sentence technical background summary",
        "missingSkills": ["skill1"],
        "yearsOfExperience": number
      }
    `;

    try {
      const text = await this.callAI(prompt);
      return this.parseJsonResponse(text);
    } catch (error: any) {
      logger.error("[AI_ERROR] analyzeResume:", error);
      throw error;
    }
  }

  /**
   * Generate SHUFFLED hybrid questions:
   * - Resume-personalized (60%)
   * - Role-based general (40%)  
   * - Admin custom questions (formatted by AI)
   * All THREE TYPES are shuffled together — candidates cannot predict order.
   */
  static async generateQuestions(
    resumeSummary: string,
    campaignTitle: string,
    jobRole: string,
    campaignSkills: string[],
    difficulty: string,
    count: number,
    adminQuestions: string[] = []
  ) {
    // Note: Standard campaign/role questions and Admin questions are now handled in InterviewService
    // This generator now focuses strictly on the AI-analyzed resume questions.
    const aiCount = count || 5;

    const prompt = `
      You are an elite technical interviewer. Generate a technical evaluation for a ${jobRole || campaignTitle} role.
      
      Job Role: ${campaignTitle} ${jobRole ? `(${jobRole})` : ''}
      Candidate Profile: ${resumeSummary}
      Required Skills: ${campaignSkills.join(", ")}
      Difficulty: ${difficulty}

      You must generate two categories of questions:
      
      Category 1: Resume-Personalized Technical (exactly ${aiCount} questions):
      - Challenge specific projects, tools, or architectural decisions mentioned in their profile.
      - Example: "In your project [X], why did you choose [Y] over [Z] for data persistence?"
      - Type: "RESUME"

      Category 2: Role-Specific Technical (exactly 2 questions):
      - Deep technical questions about ${campaignSkills.join(", ")} and the ${jobRole || campaignTitle} role.
      - These should be hard technical problems or conceptual deep-dives.
      - STRICTLY NO behavioral, soft-skill, or generic "describe a time" questions.
      - Type: "CAMPAIGN"
      
      Rules:
      1. Total questions: ${aiCount + 2}.
      2. Return EXACTLY a JSON array of objects: [{ "text": "...", "difficulty": "${difficulty}", "type": "RESUME" | "CAMPAIGN" }]
    `;

    let aiGenerated: any[] = [];
    let text = "";
    
    try {
      // 1. Try Gemini first (via callAI which already has a 429 fallback to Mistral)
      text = await this.callAI(prompt);
      const questions = this.parseJsonResponse(text);
      
      if (Array.isArray(questions) && questions.length > 0) {
        aiGenerated = questions.slice(0, aiCount + 2);
      } else {
        // If Gemini returned non-JSON or empty, try Mistral directly as a second attempt
        logger.warn("[AI] Gemini returned unparsable questions, retrying with Mistral...");
        text = await this.callMistralArray(prompt);
        const mQuestions = this.parseJsonResponse(text);
        if (Array.isArray(mQuestions) && mQuestions.length > 0) {
          aiGenerated = mQuestions.slice(0, aiCount + 2);
        } else {
          throw new Error("Both AI models failed to generate valid JSON questions.");
        }
      }
    } catch (error) {
      logger.error("[AI] All AI models failed — using skill-based question fallbacks:", error);
      // Fallback questions are derived from actual campaign skills — NO generic behavioral ones
      const skillFallbacks = campaignSkills.length > 0
        ? campaignSkills.flatMap(skill => [
            `Explain how you have used ${skill} in a production environment and what challenges you faced.`,
            `What are the key performance considerations when working with ${skill} at scale?`
          ])
        : [
            `Explain how you would design a scalable system for the ${jobRole || campaignTitle} role.`,
            `What are the most important technical skills for a ${jobRole || campaignTitle} and how do you apply them?`,
            `Walk me through a complex architecture decision you made related to ${jobRole || campaignTitle}.`,
          ];
      aiGenerated = Array.from({ length: aiCount + 2 }).map((_, i) => ({
        text: skillFallbacks[i % skillFallbacks.length],
        difficulty,
        type: i < aiCount ? 'RESUME' : 'CAMPAIGN'
      }));
    }

    return aiGenerated;
  }

  static async evaluateAnswer(question: string, transcript?: string, audioPath?: string) {
    const hasTranscript = transcript && transcript.trim().length > 10;
    
    if (!hasTranscript) {
      logger.info("[GEMINI] evaluateAnswer: Transcript empty or too short — returning 0 score immediately to avoid audio hallucinations");
      return {
        technicalScore: 0, depthScore: 0, communicationScore: 0, overallScore: 0,
        strengths: [],
        weaknesses: ["No response was provided for this question."],
        feedback: "The candidate did not speak any answer for this question."
      };
    }

    let content: any[] = [];
    let evaluationPrompt = `
      You are an expert technical evaluator assessing a candidate's spoken interview response.
      
      Question Asked: ${question}
    `;

    if (hasTranscript) {
      evaluationPrompt += `\nCandidate's Spoken Answer (auto-transcribed from voice): ${transcript}`;
      content.push(evaluationPrompt);
    } else if (audioPath) {
      const fs = await import('fs');
      if (fs.existsSync(audioPath)) {
        const audioData = {
          inlineData: {
            data: fs.readFileSync(audioPath).toString("base64"),
            mimeType: "audio/webm",
          },
        };
        evaluationPrompt += `\nThe candidate's answer is in the provided audio. Evaluate technical accuracy, depth, and communication.`;
        content.push(evaluationPrompt, audioData);
      } else {
        return {
          technicalScore: 0, depthScore: 0, communicationScore: 0, overallScore: 0,
          strengths: [],
          weaknesses: ["No valid response detected."],
          feedback: "No audio recording or transcript was found."
        };
      }
    }

    evaluationPrompt += `

      CRITICAL WARNING: 
      If the audio contains silence, only background noise, or if the candidate failed to actually answer the question (e.g. mumbling, no coherent response), you MUST return a score of 0 for ALL metrics. Do NOT hallucinate an answer. Do NOT give partial credit for simply breathing or pausing.

      Score the answer on:
      - Technical Score (0-10): Correctness and depth of technical content. (Score 0 if no response).
      - Depth Score (0-10): Level of detail, examples, and explanations. (Score 0 if no response).
      - Communication Score (0-10): Clarity, confidence, and articulation. (Score 0 if no response).
      
      Be extremely strict:
      - Silence / No valid speech = 0
      - Vague, off-topic, or minimal answers = 1-3
      - Strong, detailed, accurate = 8-10
      
      Return EXACTLY AND ONLY this JSON format, regardless of the score:
      {
        "technicalScore": number,
        "depthScore": number,
        "communicationScore": number,
        "overallScore": number,
        "strengths": ["strength1"],
        "weaknesses": ["improvement area"],
        "feedback": "Concise, specific actionable feedback"
      }
      DO NOT return any other text outside this JSON object.
    `;
    try {
      // Use the smart callAI helper (Gemini → Mistral fallback)
      const text = await this.callAI(evaluationPrompt);
      const data = this.parseJsonResponse(text);
      if (!data) throw new Error("AI returned empty evaluation");
      return data;
    } catch (error) {
      logger.error("[AI] Evaluation failed:", error);
      throw error;
    }
  }
}
