import fs from 'fs';
import path from 'path';

export class EmailService {
  private static logFile = path.join(process.cwd(), 'email_logs.txt');

  static async sendInterviewInvite(email: string, name: string, interviewLink: string, campaignTitle: string) {
    const message = `
==================================================
EMAIL SENT TO: ${email}
SUBJECT: Interview Invitation for ${campaignTitle}
--------------------------------------------------
Dear ${name},

You have been shortlisted for the ${campaignTitle} position. 
Please complete your AI technical pre-screening interview using the link below:

${interviewLink}

This link will expire in 48 hours.

Good luck!
AI Pre-Screening Team
==================================================
`;

    console.log(message);

    // Also write to a file for easy verification by the user/agent
    fs.appendFileSync(this.logFile, message + '\n');
    
    return true;
  }
}
