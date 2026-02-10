import { YjsCollabActor } from "./YjsCollabActor";

/**
 * SimpleCollabDO - minimal Yjs collaboration for a single text field.
 */
export class SimpleCollabDO extends YjsCollabActor {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.doc.getText("content");
  }
}
