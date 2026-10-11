import { StageBlock } from "@/components/stage/Stage";
import { Words } from "@/components/stage/Words";
import { COPY } from "@/content/copy";

import hud from "../Hud.module.css";

/** Beat 08: the five shipped proof points, as one strip of readouts. */
export function ProofBlock() {
  return (
    <StageBlock id="proof" wide>
      <Words
        id="proof"
        eyebrow={COPY.proof.eyebrow}
        headline={COPY.proof.headline}
      />
      <ul className={hud.strip}>
        {COPY.proof.items.map((item) => (
          <li key={item.title} className={hud.cell}>
            <h3 className={hud.cellTitle}>{item.title}</h3>
            <p className={hud.cellBody}>{item.body}</p>
          </li>
        ))}
      </ul>
    </StageBlock>
  );
}
