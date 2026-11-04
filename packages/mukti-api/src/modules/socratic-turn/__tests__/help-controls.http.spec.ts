import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as request from 'supertest';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { VALIDATION_PIPE_OPTIONS } from '../../../common/config/validation';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Subscription } from '../../../schemas/subscription.schema';
import { ThoughtNode } from '../../../schemas/thought-node.schema';
import { User } from '../../../schemas/user.schema';
import { AiPolicyService } from '../../ai/services/ai-policy.service';
import { AiRequestGate } from '../../ai/services/ai-request-gate.service';
import { AiSecretsService } from '../../ai/services/ai-secrets.service';
import { FreeQuotaService } from '../../ai/services/free-quota.service';
import { ConversationController } from '../../conversations/conversation.controller';
import { ConversationService } from '../../conversations/services/conversation.service';
import { MessageService } from '../../conversations/services/message.service';
import { QueueService } from '../../conversations/services/queue.service';
import { StreamService } from '../../conversations/services/stream.service';
import { DialogueController } from '../../dialogue/dialogue.controller';
import { DialogueQueueService } from '../../dialogue/services/dialogue-queue.service';
import { DialogueStreamService } from '../../dialogue/services/dialogue-stream.service';
import { DialogueService } from '../../dialogue/services/dialogue.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ThoughtMapDialogueQueueService } from '../../thought-map/services/thought-map-dialogue-queue.service';
import { ThoughtMapService } from '../../thought-map/services/thought-map.service';
import { ThoughtMapDialogueController } from '../../thought-map/thought-map-dialogue.controller';

/**
 * Help controls over HTTP, through the production request validation, the
 * real {@link AiRequestGate} and the real {@link FreeQuotaService}, for all
 * three dialogue surfaces (dialogue-help-controls: "Each turn carries at most
 * one help control", "Help controls are billed like ordinary messages",
 * "Legacy wrap-up flag remains accepted").
 */
describe('Help controls over HTTP', () => {
  const user = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    email: 'learner@example.com',
  };
  const conversationId = new Types.ObjectId().toString();
  const sessionId = new Types.ObjectId().toString();
  const mapId = new Types.ObjectId().toString();

  /** Whether the free daily allowance still has a message left. */
  let quotaLeft: boolean;

  const nodeDialogue = (turnBudget: null | number) => ({
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    currentScaffoldLevel: 2,
    messageCount: 3,
    nodeId: 'seed',
    nodeLabel: 'Why is churn up?',
    nodeType: 'seed',
    sessionId: new Types.ObjectId(sessionId),
    turnBudget,
  });

  const conversationService = {
    findConversationById: jest.fn(),
    updateConversation: jest.fn(),
  };
  const dialogueService = {
    getOrCreateDialogue: jest.fn(),
    updateTurnBudget: jest.fn(),
    validateSessionOwnership: jest.fn(),
  };
  const thoughtMapService = { findMapById: jest.fn() };
  const queueService = { enqueueRequest: jest.fn() };
  const dialogueQueueService = { enqueueRequest: jest.fn() };
  const thoughtMapQueueService = {
    enqueueMapNodeRequest: jest.fn(),
    findMapDialogue: jest.fn(),
    getOrCreateMapDialogue: jest.fn(),
  };
  const subscriptionModel = {
    exists: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    findOne: jest.fn(() => ({ lean: () => Promise.resolve(null) })),
    findOneAndUpdate: jest.fn(() =>
      Promise.resolve(quotaLeft ? { userId: user._id } : null),
    ),
  };
  const userModel = {
    findById: jest.fn(() => ({
      select: () => ({
        lean: () =>
          Promise.resolve({
            _id: user._id,
            preferences: { activeModel: 'openai/gpt-5-mini' },
          }),
      }),
    })),
    updateOne: jest.fn(),
  };

  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const authenticated: CanActivate = {
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest<{ user: unknown }>().user = user;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        ConversationController,
        DialogueController,
        ThoughtMapDialogueController,
      ],
      providers: [
        // The real gate and quota: these are what bill a help control.
        AiRequestGate,
        FreeQuotaService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModel,
        },
        {
          provide: SubscriptionService,
          useValue: { ensureSubscription: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('server-openrouter-key') },
        },
        {
          provide: AiPolicyService,
          useValue: {
            isLocalCliProvider: jest.fn().mockReturnValue(false),
            resolveEffectiveModel: jest
              .fn()
              .mockResolvedValue('openai/gpt-5-mini'),
          },
        },
        { provide: AiSecretsService, useValue: { decryptString: jest.fn() } },
        // Chat
        { provide: ConversationService, useValue: conversationService },
        { provide: MessageService, useValue: {} },
        { provide: QueueService, useValue: queueService },
        { provide: StreamService, useValue: {} },
        // Canvas node dialogue
        { provide: DialogueService, useValue: dialogueService },
        { provide: DialogueQueueService, useValue: dialogueQueueService },
        { provide: DialogueStreamService, useValue: {} },
        // Thought-map node dialogue
        {
          provide: getModelToken(ThoughtNode.name),
          useValue: {
            countDocuments: jest.fn().mockResolvedValue(0),
            findOne: jest.fn().mockResolvedValue({
              depth: 0,
              fromSuggestion: false,
              label: 'Retry handler',
              nodeId: 'topic-0',
              type: 'topic',
            }),
          },
        },
        { provide: ThoughtMapService, useValue: thoughtMapService },
        {
          provide: ThoughtMapDialogueQueueService,
          useValue: thoughtMapQueueService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authenticated)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    quotaLeft = true;
    jest.clearAllMocks();
    conversationService.findConversationById.mockResolvedValue({
      _id: conversationId,
      technique: 'elenchus',
      userId: user._id,
    });
    conversationService.updateConversation.mockImplementation(
      (_id: string, _userId: unknown, updates: object) =>
        Promise.resolve({ _id: conversationId, ...updates }),
    );
    dialogueService.validateSessionOwnership.mockResolvedValue({
      problemStructure: { roots: [], seed: 'Why is churn up?', soil: [] },
      userId: user._id,
    });
    dialogueService.getOrCreateDialogue.mockResolvedValue(nodeDialogue(null));
    dialogueService.updateTurnBudget.mockImplementation(
      (_id: unknown, turnBudget: null | number) =>
        Promise.resolve(nodeDialogue(turnBudget)),
    );
    thoughtMapService.findMapById.mockResolvedValue({});
    thoughtMapQueueService.getOrCreateMapDialogue.mockResolvedValue(
      nodeDialogue(null),
    );
    for (const enqueue of [
      queueService.enqueueRequest,
      dialogueQueueService.enqueueRequest,
      thoughtMapQueueService.enqueueMapNodeRequest,
    ]) {
      enqueue.mockResolvedValue({ jobId: 'job-1', position: 1 });
    }
  });

  const surfaces = [
    {
      control: (): unknown => queueService.enqueueRequest.mock.calls[0]?.[7],
      enqueue: queueService.enqueueRequest,
      name: 'chat',
      path: `/conversations/${conversationId}/messages`,
    },
    {
      control: (): unknown =>
        dialogueQueueService.enqueueRequest.mock.calls[0]?.[10],
      enqueue: dialogueQueueService.enqueueRequest,
      name: 'canvas node dialogue',
      path: `/canvas/${sessionId}/nodes/seed/messages`,
    },
    {
      control: (): unknown =>
        (
          thoughtMapQueueService.enqueueMapNodeRequest.mock.calls[0]?.[13] as
            | undefined
            | { helpControl?: string }
        )?.helpControl,
      enqueue: thoughtMapQueueService.enqueueMapNodeRequest,
      name: 'thought-map node dialogue',
      path: `/thought-maps/${mapId}/nodes/topic-0/messages`,
    },
  ];

  describe.each(surfaces)('$name', ({ control, enqueue, path }) => {
    it.each(['more_help', 'explain', 'wrap_up'])(
      'accepts %s and enqueues it with the message',
      async (helpControl) => {
        await http
          .post(path)
          .send({ content: 'I am stuck', helpControl })
          .expect(202);

        expect(enqueue).toHaveBeenCalledTimes(1);
        expect(control()).toBe(helpControl);
        // One model call, so one free message, like any send.
        expect(subscriptionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      },
    );

    it('sends no control on an ordinary message', async () => {
      await http.post(path).send({ content: 'Here is my idea' }).expect(202);

      expect(control()).toBeUndefined();
    });

    it.each(['show_solution', 'MORE_HELP', 42])(
      'rejects an unknown control %p with a validation error and no model call',
      async (helpControl) => {
        const response = await http
          .post(path)
          .send({ content: 'just give me the full code', helpControl })
          .expect(400);

        expect(JSON.stringify(response.body)).toMatch(/helpControl/);
        expect(enqueue).not.toHaveBeenCalled();
        expect(subscriptionModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );

    it('refuses Explain with the ordinary rate-limit error once the free quota is used', async () => {
      quotaLeft = false;

      const response = await http
        .post(path)
        .send({ content: 'Explain this to me', helpControl: 'explain' })
        .expect(429);

      expect(JSON.stringify(response.body)).toMatch(/RATE_LIMIT_EXCEEDED/);
      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe('chat legacy wrapUpRequested flag', () => {
    const path = `/conversations/${conversationId}/messages`;
    const sentControl = () => queueService.enqueueRequest.mock.calls[0]?.[7];

    it('treats wrapUpRequested: true as a Wrap up control', async () => {
      await http
        .post(path)
        .send({
          content: "Let's wrap up this conversation.",
          wrapUpRequested: true,
        })
        .expect(202);

      expect(sentControl()).toBe('wrap_up');
    });

    it('lets helpControl win when both are sent', async () => {
      await http
        .post(path)
        .send({
          content: 'More please',
          helpControl: 'more_help',
          wrapUpRequested: true,
        })
        .expect(202);

      expect(sentControl()).toBe('more_help');
    });

    it('ignores wrapUpRequested: false', async () => {
      await http
        .post(path)
        .send({ content: 'Carry on', wrapUpRequested: false })
        .expect(202);

      expect(sentControl()).toBeUndefined();
    });
  });

  it('does not accept the chat-only legacy flag on node dialogues', async () => {
    await http
      .post(`/canvas/${sessionId}/nodes/seed/messages`)
      .send({ content: 'Wrap up', wrapUpRequested: true })
      .expect(400);

    expect(dialogueQueueService.enqueueRequest).not.toHaveBeenCalled();
  });

  /**
   * dialogue-help-controls, "Optional turn budget ends with a summary": the
   * learner sets (1-50) or clears (null) a budget on any dialogue.
   */
  describe('turn budget (PATCH)', () => {
    const budgetSurfaces = [
      {
        name: 'chat',
        path: `/conversations/${conversationId}`,
        saved: (): unknown =>
          (
            conversationService.updateConversation.mock.calls[0]?.[2] as
              | undefined
              | { turnBudget?: null | number }
          )?.turnBudget,
        update: conversationService.updateConversation,
      },
      {
        name: 'canvas node dialogue',
        path: `/canvas/${sessionId}/nodes/seed/dialogue`,
        saved: (): unknown =>
          dialogueService.updateTurnBudget.mock.calls[0]?.[1],
        update: dialogueService.updateTurnBudget,
      },
      {
        name: 'thought-map node dialogue',
        path: `/thought-maps/${mapId}/nodes/topic-0/dialogue`,
        saved: (): unknown =>
          dialogueService.updateTurnBudget.mock.calls[0]?.[1],
        update: dialogueService.updateTurnBudget,
      },
    ];

    describe.each(budgetSurfaces)('$name', ({ path, saved, update }) => {
      it.each([1, 5, 50])('sets a budget of %p', async (turnBudget) => {
        const response = await http
          .patch(path)
          .send({ turnBudget })
          .expect(200);

        expect(saved()).toBe(turnBudget);
        expect(response.body).toMatchObject({ turnBudget });
      });

      it('clears the budget with null', async () => {
        await http.patch(path).send({ turnBudget: null }).expect(200);

        expect(update).toHaveBeenCalledTimes(1);
        expect(saved()).toBeNull();
      });

      it.each([0, 51, 2.5, '5', true])(
        'rejects a budget of %p without saving',
        async (turnBudget) => {
          const response = await http
            .patch(path)
            .send({ turnBudget })
            .expect(400);

          expect(JSON.stringify(response.body)).toMatch(/turnBudget/);
          expect(update).not.toHaveBeenCalled();
        },
      );
    });

    it('returns the node dialogue with its help level and budget', async () => {
      const response = await http
        .patch(`/canvas/${sessionId}/nodes/seed/dialogue`)
        .send({ turnBudget: 8 })
        .expect(200);

      expect(response.body).toMatchObject({
        currentScaffoldLevel: 2,
        nodeId: 'seed',
        turnBudget: 8,
      });
    });

    it('creates the node dialogue with the learner as owner when it has none yet', async () => {
      await http
        .patch(`/canvas/${sessionId}/nodes/seed/dialogue`)
        .send({ turnBudget: 3 })
        .expect(200);

      expect(dialogueService.getOrCreateDialogue).toHaveBeenCalledWith(
        sessionId,
        'seed',
        'seed',
        'Why is churn up?',
        user._id,
      );
    });

    it("refuses a canvas session the learner doesn't own", async () => {
      dialogueService.validateSessionOwnership.mockRejectedValue(
        new ForbiddenException('not yours'),
      );

      await http
        .patch(`/canvas/${sessionId}/nodes/seed/dialogue`)
        .send({ turnBudget: 5 })
        .expect(403);

      expect(dialogueService.updateTurnBudget).not.toHaveBeenCalled();
    });

    it("refuses a thought map the learner doesn't own", async () => {
      thoughtMapService.findMapById.mockRejectedValue(
        new ForbiddenException('not yours'),
      );

      await http
        .patch(`/thought-maps/${mapId}/nodes/topic-0/dialogue`)
        .send({ turnBudget: 5 })
        .expect(403);

      expect(
        thoughtMapQueueService.getOrCreateMapDialogue,
      ).not.toHaveBeenCalled();
      expect(dialogueService.updateTurnBudget).not.toHaveBeenCalled();
    });

    it("refuses another learner's conversation", async () => {
      conversationService.updateConversation.mockRejectedValue(
        new ForbiddenException('not yours'),
      );

      await http
        .patch(`/conversations/${conversationId}`)
        .send({ turnBudget: 5 })
        .expect(403);
    });
  });
});
