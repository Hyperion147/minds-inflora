import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { PrivacySection } from "@/components/landing/PrivacySection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
import { ProductSection } from "@/components/landing/ProductSection";
import { TrustBar } from "@/components/landing/TrustBar";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <HeroSection />
        <TrustBar />
        <ProblemSection />
        <ProcessSection />
        <ProductSection />
        <MethodologySection />
        <PrivacySection />
        <CtaSection />
        <Footer />
      </div>
    </main>
  );
}
