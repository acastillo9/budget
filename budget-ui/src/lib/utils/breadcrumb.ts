export function getBreadcrumbs(path: string): { name: string; path: string }[] {
	const parts = path.split('/').filter((part) => part);
	const breadcrumbs: { name: string; path: string }[] = [];
	let currentPath = '';
	for (const part of parts) {
		if (part !== '(app)') {
			currentPath += `/${part}`;
			breadcrumbs.push({ name: part, path: currentPath });
		}
	}
	return breadcrumbs.length > 0 ? breadcrumbs : [{ name: 'dashboard', path: '/' }];
}
