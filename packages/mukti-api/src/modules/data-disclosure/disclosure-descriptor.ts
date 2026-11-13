/**
 * What a model-calling surface sends, stated next to the code that sends it
 * (data-flow-disclosure, "Disclosure statements come from the running code").
 *
 * @remarks
 * Each surface exports one of these from the same file as its prompt builder
 * or service, reading the same named constants the runtime code uses for its
 * history window, so the disclosure cannot drift from what is sent. The
 * registry collects them, and its spec fails when a model-calling service has
 * no descriptor or a stated window differs from the one in use.
 */

/** Where a Mukti deployment runs its model calls. */
export type DeploymentMode = 'hosted' | 'local';

export interface DisclosureDescriptor {
  /**
   * How many prior messages (or turns) are included, when the surface sends
   * history. Must be the runtime constant itself.
   */
  readonly historyWindow?: number;
  /** Stable id, used by the web and the docs. */
  readonly id: SurfaceId;
  /**
   * Whose key pays in hosted mode: the one resolved for the user (their own
   * OpenRouter key, else Mukti's), or always Mukti's platform key.
   */
  readonly key: 'platform' | 'resolved';
  /** Short name shown in the disclosure. */
  readonly label: string;
  /** The deployment modes in which this call is made at all. */
  readonly runsIn: readonly DeploymentMode[];
  /** What the request includes, one plain sentence each. */
  readonly sends: readonly string[];
  /** The classes that make this call, checked against the code. */
  readonly services: readonly string[];
}

export type SurfaceId =
  | 'branch-suggestion'
  | 'canvas-node'
  | 'chat'
  | 'concept-extraction'
  | 'misconception-detection'
  | 'thought-map-extraction'
  | 'thought-map-node';
