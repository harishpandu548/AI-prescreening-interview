import { prisma } from '../index.js';
import { GeminiService } from './gemini.service.js';

export class InterviewService {
  static async validateToken(token: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { interviewToken: token },
      include: { 
        campaign: true, 
        session: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }, 
        resume: true 
      }
    });

    if (!candidate) return { error: 'Invalid token' };
    
    // Check for resume eligibility
    if (candidate.resumeAlignmentStatus === 'MISALIGNED') {
      return { error: 'You are not eligible for this interview based on your resume domain mismatch.' };
    }

    // STRICT LOCK: If attempt is marked used, block immediately
    if (candidate.attemptUsed) {
      return { error: 'Interview attempt has already been completed or terminated.' };
    }

    if (new Date() > candidate.tokenExpiry) return { error: 'Interview link expired' };

    return { candidate };
  }

  static async startSession(candidateId: string) {
    const existing = await prisma.interviewSession.findUnique({
      where: { candidateId },
      include: { questions: { orderBy: { order: 'asc' } } }
    });
    if (existing) return existing;
    
    // Create session
    const session = await prisma.interviewSession.create({
      data: {
        candidateId,
        startedAt: new Date()
      },
      include: { questions: { orderBy: { order: 'asc' } } }
    });

    // Update candidate status to IN_PROGRESS
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { pipelineStage: 'IN_PROGRESS' }
    });

    return session;
  }

  static async terminateSession(sessionId: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { candidateId: true, completedAt: true }
    });
    if (!session || session.completedAt) return; // Don't terminate if already completed

    await prisma.candidate.update({
      where: { id: session.candidateId },
      data: { 
        attemptUsed: true,
        pipelineStage: 'TERMINATED'
      }
    });
    console.log(`[INFO] Session terminated and stage set to TERMINATED for candidate: ${session.candidateId}`);
  }

  static async processResume(candidateId: string, fileUrl: string, extractedText: string, adminQuestions: string[] = []) {
    console.log("[DEBUG] InterviewService.processResume - Starting for candidate:", candidateId);
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { campaign: true }
    });

    if (!candidate) throw new Error('Candidate not found');

    console.log("[DEBUG] InterviewService.processResume - Calling Gemini analyzeResume");
    let analysis;
    let alignment: any = { aligned: false, reason: 'Analysis failed.' };
    try {
      // 1. Run Alignment Check
      alignment = await GeminiService.checkResumeAlignment(
        extractedText,
        candidate.campaign.title,
        (candidate.campaign as any).jobRole || candidate.campaign.title,
        candidate.campaign.requiredSkills
      );
      console.log("[DEBUG] Candidate uploaded resume - Alignment:", alignment);

      // 2. Update Candidate Status
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          resumeAlignmentStatus: alignment.aligned ? 'ALIGNED' : 'MISALIGNED',
          resumeAlignmentReason: alignment.reason || (alignment.aligned ? 'Matches campaign requirements.' : 'Mismatch detected.'),
          pipelineStage: alignment.aligned ? candidate.pipelineStage : 'REJECTED'
        }
      });

      if (!alignment.aligned) {
        console.log("[DEBUG] Misalignment detected. Stopping further processing.");
        return { success: false, isMisaligned: true, reason: alignment.reason };
      }
      
      // 3. Extract standard metrics
      analysis = await GeminiService.analyzeResume(extractedText, candidate.campaign.requiredSkills);
      console.log("[DEBUG] Gemini Analysis Result:", analysis);
    } catch (error) {
      console.error("[ERROR] Gemini Analysis/Alignment Failed:", error);
      analysis = {
        skillMatchPercentage: 0,
        summary: "Analysis failed. Manual review required.",
        missingSkills: candidate.campaign.requiredSkills,
        yearsOfExperience: 0
      };
    }
    
    // Delete existing resume if any (re-upload case)
    const existingResume = await prisma.resume.findUnique({ where: { candidateId } });
    if (existingResume) {
      await prisma.resume.delete({ where: { candidateId } });
    }

    await prisma.resume.create({
      data: {
        candidateId,
        fileUrl,
        extractedText,
        skillMatchPercentage: analysis?.skillMatchPercentage || 0
      }
    });

    // Fetch any already injected questions in the session (e.g. from promoteToInterview)
    const existingSession = await prisma.interviewSession.findUnique({
      where: { candidateId },
      include: { questions: { orderBy: { order: 'asc' } } }
    });
    const existingAdminTexts = existingSession?.questions.map(q => q.text) || [];

    // Combine all Admin/Campaign questions (Campaign + Param + Existing)
    const combinedAdmin = [...new Set([
      ...(candidate.campaign.customQuestions as string[]), 
      ...adminQuestions, 
      ...existingAdminTexts
    ])].filter(q => q.trim().length > 0);

    // Generate hybrid questions
    console.log("[DEBUG] Generating AI Resume questions. Count:", candidate.campaign.questionCount);
    let questionsData: any[] = [];
    try {
      // 1. Get Resume-based + Role-Technical questions from AI
      // Category B (Campaign Role-Technical) is now handled inside generateQuestions (always adds 2)
      const aiResumeQuestions = await GeminiService.generateQuestions(
        analysis?.summary || "Candidate with technical experience.",
        candidate.campaign.title,
        (candidate.campaign as any).jobRole || candidate.campaign.title,
        candidate.campaign.requiredSkills,
        candidate.campaign.difficulty,
        candidate.campaign.questionCount,
        [] 
      );

      // 2. Map Admin/Campaign questions
      const adminObjs = combinedAdmin.map((text) => ({
        text,
        difficulty: candidate.campaign.difficulty,
        type: 'ADMIN'
      }));

      // Final questions bundle: Resume (N) + Role-Technical (2) + Admin (M)
      questionsData = [...aiResumeQuestions, ...adminObjs];

      // Shuffle so the candidate doesn't know the categories
      for (let i = questionsData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsData[i], questionsData[j]] = [questionsData[j], questionsData[i]];
      }

    } catch (error) {
      console.error("[ERROR] Question generation failed:", error);
      questionsData = [
        ...allAdminQuestions.map((text, i) => ({ text, difficulty: candidate.campaign.difficulty, type: 'ADMIN' })),
        { text: "Explain a technical decision you made and its long-term outcome.", difficulty: candidate.campaign.difficulty, type: 'CAMPAIGN' }
      ];
    }
    console.log("[DEBUG] Questions Prepared Total Count:", questionsData.length);

    // Ensure session exists
    let session = await prisma.interviewSession.findUnique({ where: { candidateId } });
    if (!session) {
      session = await prisma.interviewSession.create({ data: { candidateId } });
    }

    // Clear old questions and insert new ones
    await prisma.question.deleteMany({ where: { sessionId: session.id } });
    await prisma.question.createMany({
      data: questionsData.map((q: any, i: number) => ({
        sessionId: session!.id,
        text: q.text,
        difficulty: q.difficulty,
        order: i + 1
      }))
    });
    console.log("[DEBUG] Questions persisted to session:", session.id);

    return { success: true };
  }

  static async submitAnswer(sessionId: string, questionId: string, transcript: string, audioUrl?: string) {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    // Check if answer is empty
    const hasTranscript = transcript && transcript.trim().length > 10;
    const hasAudio = !!audioUrl;

    console.log("[DEBUG] submitAnswer - transcript length:", transcript?.length, "hasAudio:", hasAudio);

    let evaluation;
    if (!hasTranscript && !hasAudio) {
      // No response — score 0
      evaluation = {
        technicalScore: 0,
        depthScore: 0,
        communicationScore: 0,
        overallScore: 0,
        strengths: [],
        weaknesses: ["No response was provided for this question."],
        feedback: "The candidate did not provide an answer for this question."
      };
    } else {
      try {
        evaluation = await GeminiService.evaluateAnswer(question.text, transcript, audioUrl);
        console.log("[DEBUG] Evaluation successful");
      } catch (error) {
        console.error("[ERROR] Evaluation failed:", error);
        evaluation = {
          technicalScore: 0,
          depthScore: 0,
          communicationScore: 0,
          overallScore: 0,
          strengths: [],
          weaknesses: ["AI evaluation failed. Manual review required."],
          feedback: "The system could not evaluate this answer automatically. Please review manually."
        };
      }
    }

    const answer = await prisma.answer.create({
      data: {
        questionId,
        audioUrl,
        transcript,
        ...evaluation
      },
      include: {
        question: {
          include: {
            session: {
              select: { candidateId: true }
            }
          }
        }
      }
    });

    // Mark attempt as used as soon as the first answer is recorded
    await prisma.candidate.update({
      where: { id: answer.question.session.candidateId },
      data: { attemptUsed: true }
    });

    return answer;
  }

  static async completeSession(sessionId: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { questions: { include: { answer: true } } }
    });

    if (!session) throw new Error('Session not found');

    const answers = session.questions.map((q: any) => q.answer).filter((a: any) => a !== null);
    const answeredCount = answers.length;
    const overallScore = answeredCount > 0
      ? answers.reduce((acc: number, curr: any) => acc + (curr.overallScore || 0), 0) / answeredCount
      : 0;

    let recommendation: any = 'REJECT';
    if (overallScore >= 8) recommendation = 'STRONG_HIRE';
    else if (overallScore >= 5) recommendation = 'CONSIDER';

    const updatedSession = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        overallScore,
        recommendation
      }
    });

    await prisma.candidate.update({
      where: { id: session.candidateId },
      data: { 
        attemptUsed: true,
        pipelineStage: recommendation === 'REJECT' ? 'REJECTED' : 'COMPLETED'
      }
    });

    return updatedSession;
  }

  static async logAntiCheat(sessionId: string, type: any) {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { antiCheatFlag: true }
    });
    return await prisma.antiCheatLog.create({
      data: { sessionId, type }
    });
  }
}
