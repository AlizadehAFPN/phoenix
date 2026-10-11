import { SiteHeader } from "@/components/chrome/SiteHeader";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import { BeatTrack } from "@/components/scroll/BeatTrack";
import { ScrollProvider } from "@/components/scroll/ScrollProvider";
import { DemoSection } from "@/components/sections/DemoSection";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { FolderBlock } from "@/components/stage/blocks/FolderBlock";
import { HandoverBlock } from "@/components/stage/blocks/HandoverBlock";
import { HeroBlock } from "@/components/stage/blocks/HeroBlock";
import { JourneyBlock } from "@/components/stage/blocks/JourneyBlock";
import { OooiBlock } from "@/components/stage/blocks/OooiBlock";
import { ProofBlock } from "@/components/stage/blocks/ProofBlock";
import { RegulatoryBlock } from "@/components/stage/blocks/RegulatoryBlock";
import { RosterBlock } from "@/components/stage/blocks/RosterBlock";
import { SectorBlock } from "@/components/stage/blocks/SectorBlock";
import { SignalBlock } from "@/components/stage/blocks/SignalBlock";
import { Stage } from "@/components/stage/Stage";
import { COPY } from "@/content/copy";
import { TRACK_BEATS } from "@/lib/timeline/beats";

/**
 * The page is the storyboard, beat by beat (STORYBOARD §4): the scene behind
 * everything, the stage with every beat's words and instruments over it, and
 * a scroll track whose only job is to be scrolled through. The demo and the
 * footer are ordinary sections after the track. This file only composes.
 */
export default function Page() {
  return (
    <ScrollProvider>
      <a className="sr-only" href="#content">
        {COPY.chrome.skipToContent}
      </a>
      <SceneCanvas />
      <SiteHeader />
      <Stage>
        <HeroBlock />
        <RosterBlock />
        <FolderBlock />
        <SectorBlock />
        <OooiBlock />
        <JourneyBlock />
        <SignalBlock />
        <HandoverBlock />
        <ProofBlock />
        <RegulatoryBlock />
      </Stage>
      <main>
        {TRACK_BEATS.map((b) => (
          <BeatTrack key={b.id} id={b.id} />
        ))}
        <DemoSection />
      </main>
      <SiteFooter />
    </ScrollProvider>
  );
}
