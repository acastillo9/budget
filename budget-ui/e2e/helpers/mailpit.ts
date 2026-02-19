/**
 * Mailpit API client for E2E tests.
 *
 * Provides helpers to retrieve emails captured by a local Mailpit instance
 * (SMTP on port 1025, HTTP API on port 8025 by default).
 *
 * @see https://mailpit.axllent.org/docs/api-v1/
 */

const DEFAULT_MAILPIT_URL = 'http://localhost:8025';

interface Address {
	Name: string;
	Address: string;
}

interface MessageSummary {
	ID: string;
	From: Address;
	To: Address[];
	Subject: string;
	Snippet: string;
	Created: string;
}

interface MessagesSummaryResponse {
	total: number;
	count: number;
	messages: MessageSummary[];
}

interface Message {
	ID: string;
	From: Address;
	To: Address[];
	Subject: string;
	Text: string;
	HTML: string;
	Date: string;
}

export class MailpitClient {
	private readonly baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = (baseUrl ?? DEFAULT_MAILPIT_URL).replace(/\/$/, '');
	}

	// ---------------------------------------------------------------------------
	// Low-level API helpers
	// ---------------------------------------------------------------------------

	/** List messages (newest first). */
	async listMessages(limit = 50): Promise<MessagesSummaryResponse> {
		const res = await fetch(`${this.baseUrl}/api/v1/messages?limit=${limit}`);
		if (!res.ok) throw new Error(`Mailpit listMessages failed: ${res.status}`);
		return res.json();
	}

	/** Search messages using Mailpit query syntax. */
	async searchMessages(query: string, limit = 50): Promise<MessagesSummaryResponse> {
		const url = `${this.baseUrl}/api/v1/search?query=${encodeURIComponent(query)}&limit=${limit}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Mailpit searchMessages failed: ${res.status}`);
		return res.json();
	}

	/** Get full message by ID. Use `'latest'` for the most recent message. */
	async getMessage(id: string): Promise<Message> {
		const res = await fetch(`${this.baseUrl}/api/v1/message/${id}`);
		if (!res.ok) throw new Error(`Mailpit getMessage(${id}) failed: ${res.status}`);
		return res.json();
	}

	/** Delete **all** messages in the mailbox. */
	async deleteAllMessages(): Promise<void> {
		const res = await fetch(`${this.baseUrl}/api/v1/messages`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});
		if (!res.ok) throw new Error(`Mailpit deleteAllMessages failed: ${res.status}`);
	}

	// ---------------------------------------------------------------------------
	// High-level helpers
	// ---------------------------------------------------------------------------

	/**
	 * Poll Mailpit until an email addressed to `toEmail` arrives.
	 *
	 * @returns The full {@link Message} object.
	 */
	async waitForEmail(toEmail: string, timeoutMs = 30_000, pollMs = 1_000): Promise<Message> {
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			try {
				const result = await this.searchMessages(`to:${toEmail}`);
				if (result.messages?.length > 0) {
					return this.getMessage(result.messages[0].ID);
				}
			} catch {
				// Mailpit might not be ready yet — keep retrying.
			}
			await new Promise((r) => setTimeout(r, pollMs));
		}

		throw new Error(`No email received for "${toEmail}" within ${timeoutMs}ms`);
	}

	/**
	 * Wait for the activation-code email and return the 6-digit code.
	 *
	 * The code is extracted from the **plain-text** body of the email by
	 * matching the first standalone 6-digit number.
	 */
	async getActivationCode(toEmail: string, timeoutMs = 30_000): Promise<string> {
		const message = await this.waitForEmail(toEmail, timeoutMs);

		// Try plain-text body first, fall back to HTML.
		const body = message.Text || message.HTML;

		const match = body.match(/\b(\d{6})\b/);
		if (!match) {
			throw new Error(
				`Could not find a 6-digit activation code in the email body.\nSubject: ${message.Subject}\nBody excerpt: ${body.slice(0, 500)}`
			);
		}

		return match[1];
	}

	/**
	 * Count how many emails currently exist for the given recipient.
	 */
	async countEmailsFor(toEmail: string): Promise<number> {
		try {
			const result = await this.searchMessages(`to:${toEmail}`, 1);
			return result.total;
		} catch {
			return 0;
		}
	}

	/**
	 * Poll Mailpit until a **new** email arrives for `toEmail` beyond
	 * `knownCount` previously seen messages.
	 *
	 * @returns The full {@link Message} for the newest email.
	 */
	async waitForNewEmail(
		toEmail: string,
		knownCount: number,
		timeoutMs = 30_000,
		pollMs = 1_000
	): Promise<Message> {
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			try {
				const result = await this.searchMessages(`to:${toEmail}`);
				if (result.total > knownCount && result.messages?.length > 0) {
					// Messages are sorted newest-first, so [0] is the latest.
					return this.getMessage(result.messages[0].ID);
				}
			} catch {
				// keep retrying
			}
			await new Promise((r) => setTimeout(r, pollMs));
		}

		throw new Error(
			`No new email for "${toEmail}" within ${timeoutMs}ms (known count: ${knownCount})`
		);
	}

	/**
	 * Wait for a password-reset email and return the **token** from the link.
	 *
	 * The email may contain a full URL like
	 * `http://some-host/reset-password/TOKEN` — we extract just the token so
	 * the test can navigate via the app's own base URL regardless of what
	 * host the backend embedded in the email.
	 *
	 * @param knownCount Number of emails already present for this recipient
	 *                   (so we wait for a *new* one).
	 */
	async getResetPasswordToken(
		toEmail: string,
		knownCount: number,
		timeoutMs = 30_000
	): Promise<string> {
		const message = await this.waitForNewEmail(toEmail, knownCount, timeoutMs);

		const body = message.HTML || message.Text;

		// Match a URL containing /reset-password/<token>
		const match = body.match(/\/reset-password\/([^\s"'<&]+)/);
		if (!match) {
			throw new Error(
				`Could not find a reset-password link in the email body.\nSubject: ${message.Subject}\nBody excerpt: ${body.slice(0, 500)}`
			);
		}

		return match[1];
	}
}
