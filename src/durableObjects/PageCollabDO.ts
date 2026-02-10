import { YjsCollabActor } from "./YjsCollabActor";

/**
 * PageCollabDO - Yjs collaboration for page editor with multiple fragments.
 *
 * Supports multiple named Y.XmlFragment fields per document:
 * - `title` - page title
 * - `block:{blockId}:question` - each block's question
 * - `block:{blockId}:answer` - each block's answer
 *
 * Uses the same sync/awareness protocol as SimpleCollabDO via YjsCollabActor.
 */
export class PageCollabDO extends YjsCollabActor {
  protected override async handleHttp(request: Request): Promise<Response> {
    if (request.method === "DELETE") {
      await this.resetState();
      return new Response("ok", { status: 200 });
    }
    return super.handleHttp(request);
  }
}
