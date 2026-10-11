import { SiteHeader } from "@/components/chrome/SiteHeader";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { ScrollProvider } from "@/components/scroll/ScrollProvider";
import { DemoBeat } from "@/components/sections/DemoBeat";
import { FolderBeat } from "@/components/sections/FolderBeat";
import { HandoverBeat } from "@/components/sections/HandoverBeat";
import { HeroBeat } from "@/components/sections/HeroBeat";
import { JourneyBeat } from "@/components/sections/JourneyBeat";
import { OooiBeat } from "@/components/sections/OooiBeat";
import { ProofBeat } from "@/components/sections/ProofBeat";
import { RegulatoryBeat } from "@/components/sections/RegulatoryBeat";
import { RosterBeat } from "@/components/sections/RosterBeat";
import { SectorBeat } from "@/components/sections/SectorBeat";
import { SignalBeat } from "@/components/sections/SignalBeat";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { COPY } from "@/content/copy";

/**
 * The page is the storyboard, beat by beat (STORYBOARD §4). This file only
 * composes; every beat is its own thin section.
 */
export default function Page() {
  return (
    <ScrollProvider>
      <a className="sr-only" href="#hero">
        {COPY.chrome.skipToContent}
      </a>
      <SceneCanvas />
      <SiteHeader />
      <main>
        <HeroBeat />
        <RosterBeat />
        <FolderBeat />
        <SectorBeat />
        <OooiBeat />
        <JourneyBeat />
        <SignalBeat />
        <HandoverBeat />
        <ProofBeat />
        <RegulatoryBeat />
        <DemoBeat />
      </main>
      <SiteFooter />
    </ScrollProvider>
  );
}
