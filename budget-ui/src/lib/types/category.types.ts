export type ParentCategory = {
	id: string;
	name: string;
	icon: string;
	categoryType: string;
};

export type Category = {
	id: string;
	name: string;
	icon: string;
	categoryType: string;
	parent?: ParentCategory | null;
	children?: Category[];
};
