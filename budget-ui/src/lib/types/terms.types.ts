export interface TermsVersion {
	id: string;
	type: 'TOS' | 'PRIVACY_POLICY';
	version: string;
	title: string;
	content: string;
	locale: 'en' | 'es';
	publishedAt: string;
	isActive: boolean;
}

export interface UserConsent {
	id: string;
	termsVersion: TermsVersion;
	acceptedAt: string;
	ipAddress?: string;
	userAgent?: string;
}

export interface ConsentStatus {
	allAccepted: boolean;
	pending: TermsVersion[];
	accepted: TermsVersion[];
}
