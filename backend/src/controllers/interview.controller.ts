import { Request, Response } from 'express';
import { InterviewService } from '../services/interview.service.js';
import { extractTextFromPDF } from '../utils/pdf.util.js';

export class InterviewController {
  static async validateToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const result = await InterviewService.validateToken(token as string);
      if (result.error) return res.status(400).json({ message: result.error });
      res.status(200).json(result.candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async submitResume(req: Request, res: Response) {
    try {
      const { candidateId } = req.body;
      const file = req.file;
      if (!file) return res.status(400).json({ message: 'No file uploaded' });

      const extractedText = await extractTextFromPDF(file.path);
      
      const result = await InterviewService.processResume(candidateId as string, file.path, extractedText);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("[SUBMIT_RESUME_ERROR]:", error);
      res.status(500).json({ message: error.message });
    }
  }

  static async startSession(req: Request, res: Response) {
    try {
      const { candidateId } = req.body;
      const session = await InterviewService.startSession(candidateId);
      res.status(201).json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async submitAnswer(req: Request, res: Response) {
    try {
      const { sessionId, questionId, transcript } = req.body;
      const audioUrl = req.file?.path;
      const answer = await InterviewService.submitAnswer(sessionId, questionId, transcript, audioUrl);
      res.status(201).json(answer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async completeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const session = await InterviewService.completeSession(sessionId as string);
      res.status(200).json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async antiCheatLog(req: Request, res: Response) {
    try {
      const { sessionId, type } = req.body;
      const log = await InterviewService.logAntiCheat(sessionId, type);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      await InterviewService.terminateSession(sessionId as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
