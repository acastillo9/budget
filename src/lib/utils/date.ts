import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(LocalizedFormat);
dayjs.extend(utc);

export function formatUTCStringDateWithLocal(dateString: string): string {
	const date = dayjs(dateString);
	return date.utc().format('L');
}
