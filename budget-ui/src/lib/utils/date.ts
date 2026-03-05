import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(relativeTime);

export function formatUTCStringDateWithLocal(dateString: string): string {
	const date = dayjs(dateString);
	return date.utc().format('L');
}

export function formatDateTimeLocal(dateString: string): string {
	return dayjs(dateString).format('L LT');
}
