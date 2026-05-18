import type { EmailMessage, EmailService } from "./EmailService.ts";

export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `[email] to=${message.to} subject="${message.subject}" body="${message.body}"`,
    );
  }
}
