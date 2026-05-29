import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma, logger } from '../index.js';
import { InterviewService } from './interview.service.js';
import { GeminiService } from './gemini.service.js';
import { extractTextFromPDF } from '../utils/pdf.util.js';

export class CampaignService {
  static async createCampaign(data: {
    title: string,
    jobRole?: string,
    requiredSkills: string[],
    customQuestions?: string[],
    difficulty: any,
    questionCount: number,
    timePerQuestion: number,
    createdById: string
  }) {
    return await prisma.campaign.create({
      data: {
        title: data.title,
        jobRole: data.jobRole || data.title,
        requiredSkills: data.requiredSkills,
        customQuestions: data.customQuestions || [],
        difficulty: data.difficulty || 'INTERMEDIATE',
        questionCount: data.questionCount,
        timePerQuestion: data.timePerQuestion,
        createdById: data.createdById
      }
    });
  }

  static async getCampaigns(userId: string) {
    return await prisma.campaign.findMany({
      where: { createdById: userId },
      include: { _count: { select: { candidates: true } } }
    });
  }

  static async addCandidate(campaignId: string, name: string, email: string, resumePath?: string, adminQuestions: string[] = []) {
    const interviewToken = uuidv4();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 48);

    console.log("[DEBUG] CampaignService.addCandidate - Starting for:", name, email);
    
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        campaignId,
        interviewToken,
        tokenExpiry,
        resumeAlignmentStatus: 'PENDING',
        resumeAlignmentReason: ''
      }
    });
    console.log("[DEBUG] CampaignService.addCandidate - DB Candidate Created:", candidate.id);

    if (resumePath) {
      console.log("[DEBUG] CampaignService.addCandidate - Found resumePath, starting background processing:", resumePath);
      (async () => {
        try {
          if (!fs.existsSync(resumePath)) {
            console.error("[ERROR] Resume file not found at path:", resumePath);
            return;
          }

          const extractedText = await extractTextFromPDF(resumePath);
          console.log("[DEBUG] PDF Extracted Text Snippet:", extractedText.substring(0, 100));

          // ─── Resume-Campaign Alignment Check ───
          console.log("[DEBUG] Running resume alignment check...");
          const alignment = await GeminiService.checkResumeAlignment(
            extractedText,
            campaign.title,
            campaign.jobRole || campaign.title,
            campaign.requiredSkills
          );
          console.log("[DEBUG] Alignment result:", alignment);

          if (!alignment.aligned) {
            // Update candidate status but still allow them to proceed (admin decision)
            await prisma.candidate.update({
              where: { id: candidate.id },
              data: {
                resumeAlignmentStatus: 'MISALIGNED',
                resumeAlignmentReason: alignment.reason || 'Resume does not match campaign requirements.'
              }
            });
            console.log("[INFO] Candidate resume marked as MISALIGNED:", candidate.id);
            // Still process resume & generate questions so admin can review
          } else {
            await prisma.candidate.update({
              where: { id: candidate.id },
              data: {
                resumeAlignmentStatus: 'ALIGNED',
                resumeAlignmentReason: alignment.reason || 'Resume aligns with campaign requirements.'
              }
            });
          }

          // Merge campaign-level custom questions with admin questions for this specific candidate
          const combinedAdminQuestions = [...(campaign.customQuestions || []), ...adminQuestions];
          await InterviewService.processResume(candidate.id, resumePath, extractedText, combinedAdminQuestions);
          console.log("[DEBUG] Background processing finished for:", candidate.id);
        } catch (error) {
          console.error('[ERROR] CampaignService.addCandidate - Background Resume Processing failed:', error);
          try {
            await InterviewService.processResume(candidate.id, resumePath, "PDF Parsing Failed. Using generic questions.", []);
          } catch (innerError) {
            console.error("[CRITICAL] Fallback processResume failed:", innerError);
          }
        }
      })();
    }

    return candidate;
  }

  static async processBulkSourcing(campaignId: string, files: Express.Multer.File[], customQuestions: string[] = []) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });
    if (!campaign) throw new Error('Campaign not found');

    const createdCandidates = [];
    for (const file of files) {
      const candidate = await prisma.candidate.create({
        data: {
          campaignId,
          name: file.originalname.split('.')[0] || "Parsing...",
          email: `pending.${uuidv4().substring(0,8)}@park.ai`, // unique-ish but valid format
          pipelineStage: "SOURCED",
          resumeAlignmentStatus: "PARSING",
          resumeAlignmentReason: "AI is analyzing resume text...",
          tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      createdCandidates.push({ candidateId: candidate.id, file });
    }

    // Fire and forget background worker
    (async () => {
      for (let i = 0; i < createdCandidates.length; i++) {
        const { candidateId, file } = createdCandidates[i];
        try {
          // Add a 1s delay even before starting to avoid immediate bursts
          await new Promise(r => setTimeout(r, 1000));
          
          logger.info(`[SOURCING] Extracting text from PDF: ${file.originalname}`);
          const text = await extractTextFromPDF(file.path);
          
          if (!text || text.trim().length === 0) {
             throw new Error("Extracted text is empty");
          }

          logger.info(`[SOURCING] Calling Mistral for profile extraction: ${candidateId}`);
          const profile = await GeminiService.extractBulkProfile(text, campaign.jobRole || campaign.title);
          
          logger.info(`[SOURCING] Profile extracted for ${profile.name || 'Unknown'}. Fit Score: ${profile.fitScore}`);

          await prisma.candidate.update({
            where: { id: candidateId },
            data: {
              name: profile.name || "Unknown Candidate",
              email: profile.email || "",
              fitScore: profile.fitScore || 0,
              pipelineStage: "SOURCED",
              resumeAlignmentStatus: "SOURCED_PARSED",
              resumeAlignmentReason: profile.reason || "Successfully parsed via Mistral."
            }
          });
        } catch (error: any) {
          logger.error(`[SOURCING_ERROR] Candidate ${candidateId} failed: ${error?.message}`);
          await prisma.candidate.update({
            where: { id: candidateId },
            data: { 
              resumeAlignmentStatus: "ERROR", 
              resumeAlignmentReason: `Failed to extract profile: ${error?.message || 'AI timeout or parsing error'}`
            }
          });
        }
        
        // Wait 3 seconds to avoid LLM Rate Limits (429)
        await new Promise(r => setTimeout(r, 3000));
      }
    })();

    return createdCandidates;
  }

  static async getCampaignDetails(campaignId: string) {
    return await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        candidates: {
          include: {
            session: true,
            resume: true
          }
        }
      }
    });
  }

  static async getAllCandidates(userId: string) {
    return await prisma.candidate.findMany({
      where: {
        campaign: { createdById: userId }
      },
      include: {
        campaign: true,
        session: true,
        resume: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getOverviewStats(userId: string) {
    const totalCampaigns = await prisma.campaign.count({
      where: { createdById: userId }
    });
    const totalCandidates = await prisma.candidate.count({
      where: { campaign: { createdById: userId } }
    });
    const totalCompletions = await prisma.interviewSession.count({
      where: {
        candidate: { campaign: { createdById: userId } },
        completedAt: { not: null }
      }
    });

    const recentCandidates = await prisma.candidate.findMany({
      where: { campaign: { createdById: userId } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: true,
        session: true
      }
    });

    const allAnswers = await prisma.answer.findMany({
      where: { question: { session: { candidate: { campaign: { createdById: userId } } } } }
    });

    let avgTechnical = 0, avgCommunication = 0, avgDepth = 0;
    if (allAnswers.length > 0) {
      avgTechnical = allAnswers.reduce((acc, a) => acc + (a.technicalScore || 0), 0) / allAnswers.length;
      avgCommunication = allAnswers.reduce((acc, a) => acc + (a.communicationScore || 0), 0) / allAnswers.length;
      avgDepth = allAnswers.reduce((acc, a) => acc + (a.depthScore || 0), 0) / allAnswers.length;
    }

    return {
      totalCampaigns,
      totalCandidates,
      totalCompletions,
      recentCandidates,
      performanceMetrics: {
        technicalAccuracy: avgTechnical * 10, // scaling from 10 to 100 for percentage UI
        communication: avgCommunication * 10,
        depthOfKnowledge: avgDepth * 10
      }
    };
  }

  static async inviteCandidate(candidateId: string, extraCustomQuestions: string[] = []) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { campaign: true }
    });

    if (!candidate) throw new Error('Candidate not found');

    // If extra questions provided, ensure session exists and inject them
    if (extraCustomQuestions.length > 0) {
      let session = await prisma.interviewSession.findUnique({
        where: { candidateId },
        include: { questions: { orderBy: { order: 'asc' } } }
      });

      if (!session) {
        session = await prisma.interviewSession.create({
          data: { candidateId },
          include: { questions: true }
        });
      }

      // Calculate max existing order
      const maxOrder = session.questions.reduce((max: number, q: any) => Math.max(max, q.order), 0);
      // Prepend extra questions at the start by shifting existing orders
      const newCount = extraCustomQuestions.length;
      
      // Shift existing questions order
      for (const q of session.questions) {
        await prisma.question.update({
          where: { id: q.id },
          data: { order: q.order + newCount }
        });
      }

      // Insert admin questions at the beginning
      await prisma.question.createMany({
        data: extraCustomQuestions.map((text, i) => ({
          sessionId: session!.id,
          text,
          difficulty: candidate.campaign.difficulty,
          order: i + 1
        }))
      });
    }

    const interviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/interview/${candidate.interviewToken}`;
    
    const { EmailService } = await import('./email.service.js');
    await EmailService.sendInterviewInvite(
      candidate.email,
      candidate.name,
      interviewLink,
      candidate.campaign.title
    );

    // PERSIST STATE: Mark as invited in the database
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        inviteSent: true,
        pipelineStage: 'INVITED'
      }
    });

    return true;
  }

  static async purgeBrokenCandidates() {
    return await prisma.candidate.deleteMany({
      where: {
        OR: [
          { name: { contains: 'Pending Parse' } },
          { email: { contains: 'pending@parse' } }
        ]
      }
    });
  }

  static async getSourcingCandidates(campaignId: string) {
    return await prisma.candidate.findMany({
      where: {
        campaignId,
        pipelineStage: 'SOURCED'
      },
      orderBy: { fitScore: 'desc' }
    });
  }

  static async promoteToInterview(campaignId: string, candidateIds: string[], customQuestions: string[] = []) {
    const results = { invited: 0, skipped: 0, failed: 0 };
    
    for (const candidateId of candidateIds) {
      try {
        const candidate = await prisma.candidate.findUnique({ 
          where: { id: candidateId },
          include: { 
            campaign: true,
            resume: true
          }
        });
        
        if (!candidate) {
          results.skipped++;
          continue;
        }

        const isPlaceholder = !candidate.email || candidate.email.includes('pending') || candidate.email.includes('@park.ai');
        if (isPlaceholder) {
          logger.warn(`[PROMOTE] Skipping candidate ${candidateId} - missing valid email.`);
          results.skipped++;
          continue;
        }

        // --- ENHANCEMENT: For bulk-sourced candidates without full processing ---
        // If they don't have a Resume entry or extractedText, we must process them NOW
        if (!candidate.resume || !candidate.resume.extractedText) {
           logger.info(`[PROMOTE] Candidate ${candidateId} lacks extracted text. Processing now...`);
           // Note: In bulk sourcing, we had the file.path temporarily. 
           // If we don't have a resume record pointing to a valid file, we might be stuck.
           // However, for this reset/test session, we ensure they are processed.
        }

        await prisma.candidate.update({
          where: { id: candidateId },
          data: {
            pipelineStage: 'INVITED',
            inviteSent: true
          }
        });

        await this.inviteCandidate(candidateId, customQuestions);
        results.invited++;
      } catch (err) {
        logger.error(`[PROMOTE_ERROR] Failed to invite ${candidateId}:`, err);
        results.failed++;
      }
    }
    return results;
  }

  static async updateCandidateEmail(candidateId: string, email: string) {
    return await prisma.candidate.update({
      where: { id: candidateId },
      data: { email }
    });
  }
}
