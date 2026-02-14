const MAILPIT_API_URL = process.env.MAILPIT_API_URL || 'http://localhost:8025';

interface MailpitAddress {
  Address: string;
  Name: string;
}

interface MailpitMessage {
  ID: string;
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  Created: string;
  Size: number;
}

interface MailpitMessageDetail extends MailpitMessage {
  HTML: string;
  Text: string;
}

interface MailpitSearchResponse {
  total: number;
  messages: MailpitMessage[];
}

export class MailpitHelper {
  private baseUrl: string;

  constructor(baseUrl: string = MAILPIT_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Delete all messages in Mailpit.
   */
  async deleteAllMessages(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, { method: 'DELETE' });
  }

  /**
   * Poll Mailpit for the latest message sent to a specific email address.
   * Retries until a message is found or the timeout expires.
   */
  async getLatestMessage(
    toEmail: string,
    options: { timeout?: number; interval?: number } = {},
  ): Promise<MailpitMessageDetail> {
    const timeout = options.timeout ?? 10000;
    const interval = options.interval ?? 500;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const query = encodeURIComponent(`to:${toEmail}`);
      const searchRes = await fetch(
        `${this.baseUrl}/api/v1/search?query=${query}`,
      );
      const searchData: MailpitSearchResponse = await searchRes.json();

      if (searchData.total > 0) {
        const messageId = searchData.messages[0].ID;
        const messageRes = await fetch(
          `${this.baseUrl}/api/v1/message/${messageId}`,
        );
        return messageRes.json();
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`No email found for ${toEmail} within ${timeout}ms`);
  }

  /**
   * Extract the 6-digit activation code from the emailConfirmation template HTML.
   * The code is rendered inside a div with `letter-spacing:3px`.
   */
  extractActivationCode(html: string): string {
    const match = html.match(
      /letter-spacing:\s*3px[^>]*>\s*(\d{6})\s*<\/div>/s,
    );
    if (!match) {
      throw new Error('Activation code not found in email HTML');
    }
    return match[1];
  }

  /**
   * Extract the reset password link from the resetPassword template HTML.
   * The link is inside an `<a href="...">` tag pointing to the reset-password URL.
   */
  extractResetPasswordLink(html: string): string {
    const match = html.match(/href="([^"]*\/reset-password\/[^"]*)"/);
    if (!match) {
      throw new Error('Reset password link not found in email HTML');
    }
    return match[1];
  }

  /**
   * Extract the set-password JWT token from a reset password URL.
   */
  extractSetPasswordToken(resetLink: string): string {
    const parts = resetLink.split('/');
    return parts[parts.length - 1];
  }
}
