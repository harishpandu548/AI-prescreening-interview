import { CampaignService } from '../services/campaign.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../index.js';
import fs from 'fs';
import path from 'path';

export class CampaignController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const campaign = await CampaignService.createCampaign({
        ...req.body,
        createdById: req.user.id
      });
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const campaigns = await CampaignService.getCampaigns(req.user.id);
      res.status(200).json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async addCandidate(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { name, email, adminQuestions: rawAdminQ } = req.body;
      const resumePath = req.file?.path;

      // Parse adminQuestions from JSON string (sent via FormData)
      let adminQuestions: string[] = [];
      if (rawAdminQ) {
        try { adminQuestions = JSON.parse(rawAdminQ); } catch { adminQuestions = []; }
      }

      const candidate = await CampaignService.addCandidate(campaignId as string, name, email, resumePath, adminQuestions);
      console.log("[DEBUG] CampaignController.addCandidate - Candidate Created:", candidate.id);
      res.status(201).json(candidate);
    } catch (error: any) {
      console.error("[ERROR] CampaignController.addCandidate:", error);
      res.status(500).json({ message: error.message });
    }
  }


  static async getDetails(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const details = await CampaignService.getCampaignDetails(campaignId as string);
      if (!details) return res.status(404).json({ message: 'Campaign not found' });
      res.status(200).json(details);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getCandidateDetail(req: Request, res: Response) {
    try {
      const { candidateId } = req.params;
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId as string },
        include: {
          campaign: true,
          resume: true,
          session: {
            include: {
              questions: {
                include: { answer: true }
              },
              antiCheatLogs: true
            }
          }
        }
      });
      if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
      res.status(200).json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async listAllCandidates(req: AuthRequest, res: Response) {
    try {
      const candidates = await CampaignService.getAllCandidates(req.user.id);
      res.status(200).json(candidates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getStats(req: AuthRequest, res: Response) {
    try {
      const stats = await CampaignService.getOverviewStats(req.user.id);
      res.status(200).json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async invite(req: Request, res: Response) {
    try {
      const { candidateId } = req.params;
      const extraCustomQuestions: string[] = req.body?.customQuestions || [];
      await CampaignService.inviteCandidate(candidateId as string, extraCustomQuestions);
      res.status(200).json({ message: 'Invitation sent' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async bulkUpload(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No resumes provided.' });
      }

      const customQuestions: string[] = req.body.customQuestions ? (typeof req.body.customQuestions === 'string' ? JSON.parse(req.body.customQuestions) : req.body.customQuestions) : [];
      await CampaignService.processBulkSourcing(campaignId as string, files, customQuestions);
      res.status(202).json({ message: `Accepted ${files.length} resumes for parsing.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getSourcingCandidates(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      if (!campaignId || campaignId.length < 32) {
        return res.status(400).json({ message: 'Invalid campaign ID format' });
      }
      const candidates = await CampaignService.getSourcingCandidates(campaignId as string);
      res.status(200).json(candidates);
    } catch (error: any) {
      console.error("[ERROR] CampaignController.getSourcingCandidates:", error);
      res.status(500).json({ message: error.message });
    }
  }

  static async promoteToInterview(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { candidateIds, customQuestions } = req.body;
      if (!candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ message: 'candidateIds array is required' });
      }
      
      const questions = Array.isArray(customQuestions) ? customQuestions : [];
      const results = await CampaignService.promoteToInterview(campaignId as string, candidateIds, questions);
      
      res.status(200).json({ 
        message: 'Bulk processing complete',
        data: results 
      });
    } catch (error: any) {
      console.error("[ERROR] CampaignController.promoteToInterview:", error);
      res.status(500).json({ message: error.message });
    }
  }

  static async updateCandidateEmail(req: Request, res: Response) {
    try {
      const { candidateId } = req.params;
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });
      
      const candidate = await CampaignService.updateCandidateEmail(candidateId as string, email);
      res.status(200).json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async purgeBroken(req: Request, res: Response) {
    try {
      const result = await CampaignService.purgeBrokenCandidates();
      res.status(200).json({ message: `Successfully deleted ${result.count} entries.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async purgeAll(req: AuthRequest, res: Response) {
    try {
      console.log('--- SYSTEM RESET CALLED ---');
      await prisma.antiCheatLog.deleteMany({});
      await prisma.answer.deleteMany({});
      await prisma.question.deleteMany({});
      await prisma.interviewSession.deleteMany({});
      await prisma.resume.deleteMany({});
      await prisma.candidate.deleteMany({});
      await prisma.campaign.deleteMany({});

      const uploadsDir = 'uploads';
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          if (fs.lstatSync(filePath).isFile()) fs.unlinkSync(filePath);
        }
      }
      res.status(200).json({ message: 'System reset complete. Data purged.' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
