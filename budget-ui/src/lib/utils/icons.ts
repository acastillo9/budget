import {
	// Food & Dining
	ShoppingCart,
	UtensilsCrossed,
	Coffee,
	Pizza,
	Beef,
	Apple,
	Wine,
	IceCreamCone,
	Salad,
	Sandwich,
	Egg,
	CookingPot,

	// Transportation
	Car,
	Bus,
	Plane,
	Fuel,
	Bike,
	Train,
	Ship,
	Rocket,
	Truck,
	CarTaxiFront,

	// Shopping
	ShoppingBag,
	Shirt,
	Store,
	Tag,
	Gem,
	Watch,
	Glasses,

	// Entertainment
	Film,
	Music,
	Gamepad2,
	Camera,
	Headphones,
	Tv,
	Clapperboard,
	Popcorn,
	Ticket,
	Theater,

	// Utilities & Bills
	Zap,
	Wifi,
	Phone,
	Smartphone,
	Monitor,
	Lightbulb,
	Droplets,
	Flame,
	Receipt,

	// Health & Fitness
	Heart,
	Pill,
	Stethoscope,
	Dumbbell,
	Activity,
	Brain,
	Syringe,
	Baby,

	// Work & Income
	Briefcase,
	Laptop,
	DollarSign,
	PiggyBank,
	Banknote,
	CreditCard,
	TrendingUp,
	TrendingDown,
	Building2,
	Wallet,
	Calculator,
	Coins,

	// Home & Personal
	Home,
	Book,
	Scissors,
	Wrench,
	Gift,
	MapPin,
	Bed,
	Sofa,
	Bath,
	Key,
	Paintbrush,
	Flower2,

	// Education
	GraduationCap,
	BookOpen,
	Pencil,
	School,
	Languages,

	// Pets
	Cat,
	Dog,
	PawPrint,
	Fish,
	Bird,

	// Subscriptions
	Repeat,
	Cloud,
	Globe,
	Newspaper,
	Radio,

	// Insurance & Legal
	Shield,
	FileText,
	Scale,
	Umbrella,
	Lock,

	// Children & Family
	Users,
	Blocks,
	Puzzle
} from '@lucide/svelte';

export const iconCategories = {
	foodDining: {
		ShoppingCart,
		UtensilsCrossed,
		Coffee,
		Pizza,
		Beef,
		Apple,
		Wine,
		IceCreamCone,
		Salad,
		Sandwich,
		Egg,
		CookingPot
	},
	transportation: {
		Car,
		Bus,
		Plane,
		Fuel,
		Bike,
		Train,
		Ship,
		Rocket,
		Truck,
		CarTaxiFront
	},
	shopping: {
		ShoppingBag,
		Shirt,
		Store,
		Tag,
		Gem,
		Watch,
		Glasses
	},
	entertainment: {
		Film,
		Music,
		Gamepad2,
		Camera,
		Headphones,
		Tv,
		Clapperboard,
		Popcorn,
		Ticket,
		Theater
	},
	utilitiesBills: {
		Zap,
		Wifi,
		Phone,
		Smartphone,
		Monitor,
		Lightbulb,
		Droplets,
		Flame,
		Receipt
	},
	healthFitness: {
		Heart,
		Pill,
		Stethoscope,
		Dumbbell,
		Activity,
		Brain,
		Syringe,
		Baby
	},
	workIncome: {
		Briefcase,
		Laptop,
		DollarSign,
		PiggyBank,
		Banknote,
		CreditCard,
		TrendingUp,
		TrendingDown,
		Building2,
		Wallet,
		Calculator,
		Coins
	},
	homePersonal: {
		Home,
		Book,
		Scissors,
		Wrench,
		Gift,
		MapPin,
		Bed,
		Sofa,
		Bath,
		Key,
		Paintbrush,
		Flower2
	},
	education: {
		GraduationCap,
		BookOpen,
		Pencil,
		School,
		Languages
	},
	pets: {
		Cat,
		Dog,
		PawPrint,
		Fish,
		Bird
	},
	subscriptions: {
		Repeat,
		Cloud,
		Globe,
		Newspaper,
		Radio
	},
	insuranceLegal: {
		Shield,
		FileText,
		Scale,
		Umbrella,
		Lock
	},
	childrenFamily: {
		Baby,
		Users,
		Blocks,
		Puzzle
	}
};

export const iconMap: Record<string, typeof ShoppingCart> = Object.assign(
	{},
	...Object.values(iconCategories)
);
