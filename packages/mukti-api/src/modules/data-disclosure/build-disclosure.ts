/**
 * Composes the "Your data and costs" disclosure for one configuration
 * (data-flow-disclosure).
 *
 * @remarks
 * Pure: every statement comes from the surface descriptors, the provider
 * catalogue and the free-quota constants the running API uses, so the panel,
 * the endpoint and the docs cannot drift from what is actually sent. A
 * configuration only ever receives its own statements: hosted views never
 * mention a CLI, and local views never mention OpenRouter or the free quota.
 */
import type {
  LocalCliProvider,
  OutsideMuktiData,
} from '../ai/local-cli/provider-catalog';
import type { DisclosureDescriptor, SurfaceId } from './disclosure-descriptor';

import { nextFreeQuotaReset } from '../ai/services/free-quota.service';
import { surfacesFor } from './surface-registry';

export interface DataDisclosure {
  readonly configuration: DisclosureConfiguration;
  readonly deletion: { readonly action: string; readonly label: string };
  readonly model: {
    /** The account each Socratic reply is billed to. */
    readonly billedTo: string;
    readonly limits:
      | {
          readonly dailyMessages: number;
          readonly kind: 'free-daily';
          readonly resetsAt: string;
        }
      | { readonly kind: 'own-plan' };
    /** One sentence on paid-plan needs, where Mukti cannot guarantee use. */
    readonly planNote: string;
    /** The service that runs each model call. */
    readonly runner: string;
  };
  /** Surfaces that would call a model elsewhere but are not run here. */
  readonly notRun: readonly {
    readonly id: SurfaceId;
    readonly label: string;
  }[];
  /** What a CLI keeps of Mukti runs outside Mukti. Empty in hosted mode. */
  readonly outside: readonly (OutsideMuktiData & {
    readonly removedByMukti: false;
  })[];
  readonly storage: {
    readonly items: readonly string[];
    readonly location: string;
  };
  readonly surfaces: readonly DisclosureSurface[];
}

export type DisclosureConfiguration =
  | 'hosted-free'
  | 'hosted-own-key'
  | 'local';

export type DisclosureContext =
  | {
      /** Where the local database lives: the data directory it was started with. */
      readonly dataDir: string;
      readonly mode: 'local';
      readonly now: Date;
      readonly provider: LocalCliProvider;
    }
  | {
      readonly freeDailyLimit: number;
      readonly hasOwnOpenRouterKey: boolean;
      readonly mode: 'hosted';
      readonly now: Date;
    };

export interface DisclosureSurface {
  readonly historyWindow?: number;
  readonly id: SurfaceId;
  readonly key: DisclosureDescriptor['key'];
  /** Whose key the call uses, in this configuration's words. */
  readonly keyNote: string;
  readonly label: string;
  readonly sends: readonly string[];
}

const STORED_ITEMS = [
  'Conversations, and their archived older messages',
  'Canvases and their node dialogues',
  'Thought maps, their nodes and any share links you created',
  "Your learner model: the concepts Mukti tracks and how well you've shown each one",
  'Usage events: which model answered, token counts and timing, per reply',
];

const DELETION = {
  action: 'settings#delete-data',
  label: 'Delete all my Mukti data',
};

export function buildDisclosure(context: DisclosureContext): DataDisclosure {
  return context.mode === 'local'
    ? localDisclosure(context)
    : hostedDisclosure(context);
}

function hostedDisclosure(
  context: Extract<DisclosureContext, { mode: 'hosted' }>,
): DataDisclosure {
  const ownKey = context.hasOwnOpenRouterKey;
  const surfaces = surfacesFor('hosted').map((descriptor) =>
    toSurface(descriptor, keyNoteHosted(descriptor, ownKey)),
  );

  return {
    configuration: ownKey ? 'hosted-own-key' : 'hosted-free',
    deletion: DELETION,
    model: ownKey
      ? {
          billedTo:
            'Socratic replies use your own OpenRouter key, billed to your OpenRouter account. Mukti stores the key encrypted and shows only its last four characters.',
          limits: { kind: 'own-plan' },
          planNote:
            'Limits are those of your OpenRouter account and the models you choose.',
          runner:
            "OpenRouter, which routes each request to the model's provider",
        }
      : {
          billedTo: "Mukti's own OpenRouter key: replies cost you nothing.",
          limits: {
            dailyMessages: context.freeDailyLimit,
            kind: 'free-daily',
            resetsAt: nextFreeQuotaReset(context.now).toISOString(),
          },
          planNote: `You get ${context.freeDailyLimit} replies a day on Mukti's key. Adding your own OpenRouter key in Settings removes the limit.`,
          runner:
            "OpenRouter, which routes each request to the model's provider",
        },
    notRun: [],
    outside: [],
    storage: { items: STORED_ITEMS, location: "Mukti's hosted database" },
    surfaces,
  };
}

function keyNoteHosted(
  descriptor: DisclosureDescriptor,
  ownKey: boolean,
): string {
  if (descriptor.key === 'platform') {
    return "Always Mukti's key, never yours.";
  }
  return ownKey ? 'Your key.' : "Mukti's key.";
}

function localDisclosure(
  context: Extract<DisclosureContext, { mode: 'local' }>,
): DataDisclosure {
  const { provider } = context;
  const local = surfacesFor('local');
  const notRun = surfacesFor('hosted')
    .filter((descriptor) => !local.includes(descriptor))
    .map(({ id, label }) => ({ id, label }));

  return {
    configuration: 'local',
    deletion: DELETION,
    model: {
      billedTo: `Your own ${provider.label} subscription: replies count against that plan's limits.`,
      limits: { kind: 'own-plan' },
      planNote: `Mukti cannot guarantee replies beyond what your ${provider.label} plan allows.`,
      runner: `The ${provider.label} on this computer, which sends each request to its vendor's servers`,
    },
    notRun,
    outside: provider.keepsOutsideMukti.map((entry) => ({
      ...entry,
      removedByMukti: false,
    })),
    storage: {
      items: [...STORED_ITEMS, 'Your saved AI CLI and model choice'],
      location: `${context.dataDir} (the local database on this computer)`,
    },
    surfaces: local.map((descriptor) =>
      toSurface(descriptor, `Your ${provider.label} sign-in.`),
    ),
  };
}

function toSurface(
  descriptor: DisclosureDescriptor,
  keyNote: string,
): DisclosureSurface {
  return {
    ...(descriptor.historyWindow === undefined
      ? {}
      : { historyWindow: descriptor.historyWindow }),
    id: descriptor.id,
    key: descriptor.key,
    keyNote,
    label: descriptor.label,
    sends: descriptor.sends,
  };
}
