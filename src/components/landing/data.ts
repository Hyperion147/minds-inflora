import {
  BadgeCheck,
  Banknote,
  BarChart3,
  ChartNoAxesColumnIncreasing,
  DatabaseZap,
  FileText,
  KeyRound,
  Landmark,
  Sparkles,
  WalletCards,
} from "lucide-react";

export const navItems = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Methodology", href: "#methodology" },
  { label: "Privacy", href: "#privacy" },
];

export const trustItems = [
  ["01", "Account Aggregator"],
  ["02", "Transaction Intelligence"],
  ["03", "Personalized CPI"],
  ["04", "Privacy First"],
] as const;

export const processSteps = [
  {
    number: "01",
    title: "Connect",
    copy: "Securely connect financial accounts through India's Account Aggregator ecosystem.",
    icon: Landmark,
  },
  {
    number: "02",
    title: "Understand",
    copy: "INFLORA reads transaction data and identifies spending patterns.",
    icon: DatabaseZap,
  },
  {
    number: "03",
    title: "Categorize",
    copy: "Transactions are mapped into meaningful consumption categories.",
    icon: WalletCards,
  },
  {
    number: "04",
    title: "Calculate",
    copy: "Your spending weights are combined with CPI data to estimate personal inflation.",
    icon: BarChart3,
  },
] as const;

export const dashboardMetrics = [
  ["Personal Inflation", "6.82%"],
  ["Headline CPI", "4.45%"],
  ["Difference", "+2.37 pp ABOVE"],
  ["Eligible Spend", "INR 1,27,294"],
] as const;

export const drivers = [
  ["Food & Dining", "+8.4%", 92],
  ["Transport", "+6.1%", 70],
  ["Healthcare", "+5.2%", 58],
  ["Shopping", "+3.7%", 42],
] as const;

export const transactions = [
  ["12 Jul", "Swiggy", "Food", "-INR 684"],
  ["11 Jul", "Uber India", "Transport", "-INR 320"],
  ["09 Jul", "Apollo Pharmacy", "Healthcare", "-INR 780"],
  ["08 Jul", "Amazon", "Shopping", "-INR 2,199"],
] as const;

export const methodologyCards = [
  ["Your Spending", "What you actually consume.", WalletCards],
  [
    "Category Weights",
    "How important each category is in your basket.",
    ChartNoAxesColumnIncreasing,
  ],
  ["CPI Movement", "How prices are changing.", Banknote],
] as const;

export const privacyPoints = [
  "Consent-driven",
  "Read-only financial data",
  "No password sharing",
  "No storage of banking credentials",
] as const;

export const privacyNodes = [
  ["User", Sparkles],
  ["Consent", KeyRound],
  ["Account Aggregator", BadgeCheck],
  ["Financial Information Provider", Landmark],
  ["INFLORA", FileText],
] as const;
