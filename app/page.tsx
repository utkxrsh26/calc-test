import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import WhatIsCoditySection from '@/components/WhatIsCoditySection';
import WhyCoditySection from '@/components/WhyCoditySection';
import CyclesTriageSection from '@/components/CyclesTriageSection';
import AIFeaturesSection from '@/components/AIFeaturesSection';
import FeaturesDetailedSection from '@/components/FeaturesDetailedSection';
import ContactFooterSection from '@/components/ContactFooterSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <WhatIsCoditySection />
      <WhyCoditySection />
      <CyclesTriageSection />
      <AIFeaturesSection />
      <FeaturesDetailedSection />
      <ContactFooterSection />
    </>
  );
}