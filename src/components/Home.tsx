import { HeroSection } from "@/components/sections/hero"
import { FeaturesSection } from "@/components/sections/features"
import { HowItWorksSection } from "@/components/sections/how-it-works"
import { RolesSection } from "@/components/sections/roles"
import { TrustSection } from "@/components/sections/trust"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <TrustSection />
    </>
  )
}
