import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import {
  Subscription,
  SubscriptionDocument,
} from '../../../schemas/subscription.schema';
import {
  Technique,
  TechniqueDocument,
} from '../../../schemas/technique.schema';
import { User, UserDocument } from '../../../schemas/user.schema';

/**
 * Service responsible for seeding the database with initial data.
 * Handles seeding of built-in Socratic techniques and test users.
 *
 * @remarks
 * All seeding operations are idempotent - running them multiple times
 * will not create duplicate data.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Technique.name)
    private techniqueModel: Model<TechniqueDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  /**
   * Seeds all initial data (techniques and test user).
   * This is the main entry point for database seeding.
   *
   * @returns Promise that resolves when all seeding is complete
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      await this.seedTechniques();
      await this.seedTestUser();
      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Database seeding failed: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Seeds all built-in Socratic techniques into the database.
   * Creates six techniques: elenchus, dialectic, maieutics, definitional,
   * analogical, and counterfactual.
   *
   * @returns Promise that resolves when seeding is complete
   *
   * @remarks
   * This method is idempotent - existing techniques are skipped.
   * All seeded techniques have isBuiltIn: true and status: 'approved'.
   */
  async seedTechniques(): Promise<void> {
    this.logger.log('Starting technique seeding...');

    const systemUser = await this.ensureSystemUser();

    const techniques = [
      {
        description:
          'Socratic refutation method that challenges assumptions by asking probing questions to reveal contradictions.',
        difficulty: 'intermediate',
        isBuiltIn: true,
        name: 'elenchus',
        status: 'approved',
        tags: ['critical-thinking', 'logic', 'refutation'],
        template: {
          exampleQuestions: [
            'What do you mean by that exactly?',
            'How does that align with what you said earlier?',
            'Can you think of a situation where that might not be true?',
            'What assumptions are you making here?',
          ],
          followUpStrategy:
            'Identify contradictions and ask for clarification. When you spot an inconsistency, ask questions that help the user see it themselves.',
          questioningStyle: 'Challenging and probing',
          systemPrompt:
            'You are a Socratic questioner using the elenchus method. Challenge assumptions by asking probing questions that reveal contradictions. Never provide direct answers. Guide the user to discover inconsistencies in their reasoning through careful questioning.',
        },
      },
      {
        description:
          'Thesis-antithesis-synthesis method that explores opposing viewpoints to reach deeper understanding.',
        difficulty: 'advanced',
        isBuiltIn: true,
        name: 'dialectic',
        status: 'approved',
        tags: ['synthesis', 'debate', 'philosophy'],
        template: {
          exampleQuestions: [
            'What would someone who disagrees with you say?',
            'How might these opposing views both contain truth?',
            'What emerges when we combine these perspectives?',
            'Can you see validity in the counterargument?',
          ],
          followUpStrategy:
            'Present counterarguments and seek synthesis. After exploring one perspective, introduce the opposing view and ask how they might be reconciled.',
          questioningStyle: 'Balanced and exploratory',
          systemPrompt:
            'Guide the user through dialectical reasoning. Present opposing viewpoints and help synthesize understanding through questioning. Explore both sides of arguments to reach a higher level of understanding.',
        },
      },
      {
        description:
          'Midwifery of ideas - helping users give birth to their own insights through gentle questioning.',
        difficulty: 'beginner',
        isBuiltIn: true,
        name: 'maieutics',
        status: 'approved',
        tags: ['discovery', 'insight', 'gentle'],
        template: {
          exampleQuestions: [
            'What does your intuition tell you?',
            'You seem to be onto something - can you explore that further?',
            'What connections are you noticing?',
            'How does this relate to what you already know?',
          ],
          followUpStrategy:
            'Build on partial insights with supportive questions. When the user shows a glimmer of understanding, ask questions that help them develop it further.',
          questioningStyle: 'Gentle and encouraging',
          systemPrompt:
            'Help the user give birth to their own ideas through gentle questioning. Draw out latent knowledge rather than imposing external answers. Be supportive and encouraging as they discover insights.',
        },
      },
      {
        description:
          'Concept clarification method focusing on precise definitions and boundaries of terms.',
        difficulty: 'beginner',
        isBuiltIn: true,
        name: 'definitional',
        status: 'approved',
        tags: ['clarity', 'precision', 'definitions'],
        template: {
          exampleQuestions: [
            'How would you define that term?',
            'What are the essential characteristics?',
            'Would this example fit your definition?',
            'Where do you draw the line?',
          ],
          followUpStrategy:
            'Test definitions with edge cases and examples. Once a definition is proposed, explore its boundaries by asking about borderline cases.',
          questioningStyle: 'Precise and analytical',
          systemPrompt:
            'Focus on defining key terms and concepts precisely. Ask questions that clarify meaning and boundaries. Help the user develop clear, rigorous definitions.',
        },
      },
      {
        description:
          'Reasoning by analogy - using comparisons to familiar domains to illuminate concepts.',
        difficulty: 'intermediate',
        isBuiltIn: true,
        name: 'analogical',
        status: 'approved',
        tags: ['analogy', 'comparison', 'creativity'],
        template: {
          exampleQuestions: [
            'What is this similar to?',
            'How is this like [familiar concept]?',
            'Where does this analogy break down?',
            'What can we learn from this comparison?',
          ],
          followUpStrategy:
            'Explore where analogies hold and where they break down. After establishing an analogy, probe its limits to deepen understanding.',
          questioningStyle: 'Creative and comparative',
          systemPrompt:
            'Use analogies and comparisons to illuminate concepts. Ask questions that draw parallels to familiar domains. Help the user understand through creative comparison.',
        },
      },
      {
        description:
          'What-if reasoning that explores alternative scenarios to test assumptions and reasoning.',
        difficulty: 'advanced',
        isBuiltIn: true,
        name: 'counterfactual',
        status: 'approved',
        tags: ['hypothetical', 'scenarios', 'testing'],
        template: {
          exampleQuestions: [
            'What if that assumption were false?',
            'How would things change if [condition] were different?',
            'What would have to be true for that to work?',
            'Can you imagine a scenario where the opposite is true?',
          ],
          followUpStrategy:
            'Vary conditions and examine consequences. Systematically change assumptions and explore how conclusions would differ.',
          questioningStyle: 'Speculative and exploratory',
          systemPrompt:
            'Explore alternative scenarios through counterfactual questions. Ask "what if" to test reasoning and assumptions. Help the user examine consequences of different conditions.',
        },
      },
    ].map((technique) => ({
      ...technique,
      userId: systemUser._id,
    }));

    let seededCount = 0;
    let skippedCount = 0;

    for (const techniqueData of techniques) {
      try {
        // Check if technique already exists (idempotency)
        const existing = await this.techniqueModel
          .findOne({ name: techniqueData.name })
          .exec();

        if (existing) {
          this.logger.debug(
            `Technique '${techniqueData.name}' already exists, skipping`,
          );
          skippedCount++;
          continue;
        }

        // Create the technique
        await this.techniqueModel.create(techniqueData);
        this.logger.log(`Seeded technique: ${techniqueData.name}`);
        seededCount++;
      } catch (error) {
        const { message, stack } = this.getErrorDetails(error);
        this.logger.error(
          `Failed to seed technique '${techniqueData.name}': ${message}`,
          stack,
        );
      }
    }

    this.logger.log(
      `Technique seeding complete. Seeded: ${seededCount}, Skipped: ${skippedCount}`,
    );
  }

  /**
   * Seeds a test user with associated subscription for development and testing.
   * Creates user with email test@mukti.app and password 'testpassword123'.
   *
   * @returns Promise that resolves when seeding is complete
   *
   * @remarks
   * This method is idempotent - if the user already exists, it is skipped.
   * The test user is created with a free tier subscription.
   */
  async seedTestUser(): Promise<void> {
    this.logger.log('Starting test user seeding...');

    const testEmail = 'test@mukti.app';
    const testPassword = 'testpassword123';

    try {
      // Check if test user already exists (idempotency)
      const existingUser = await this.userModel.findOne({ email: testEmail });

      if (existingUser) {
        this.logger.debug('Test user already exists, skipping');
        return;
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(testPassword, saltRounds);

      // Create user
      const user = await this.userModel.create({
        email: testEmail,
        emailVerifiedAt: new Date(),
        isActive: true,
        name: 'Test User',
        passwordHash,
        preferences: {
          emailNotifications: true,
          language: 'en',
          theme: 'light',
        },
        role: 'user',
      });

      this.logger.log(`Created test user: ${testEmail}`);

      // Create associated subscription with free tier limits
      const subscription = await this.subscriptionModel.create({
        isActive: true,
        limits: {
          canUseAdvancedModels: false,
          conversationsPerDay: 10,
          maxConversationLength: 50,
          maxSharedLinks: 5,
          maxStorageGB: 1,
          questionsPerDay: 50,
          questionsPerHour: 10,
        },
        startDate: new Date(),
        tier: 'free',
        usage: {
          conversationsToday: 0,
          lastHourResetAt: new Date(),
          lastResetAt: new Date(),
          questionsThisHour: 0,
          questionsToday: 0,
          storageUsedGB: 0,
        },
        userId: user._id,
      });

      // Link subscription to user
      user.subscriptionId = subscription._id;
      await user.save();

      this.logger.log(
        `Created subscription for test user with tier: ${subscription.tier}`,
      );
      this.logger.log('Test user seeding complete');
    } catch (error) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Failed to seed test user: ${message}`, stack);
      throw error;
    }
  }

  private async ensureSystemUser(): Promise<UserDocument> {
    const systemEmail = 'system@mukti.app';

    const existingSystemUser = await this.userModel.findOne({
      email: systemEmail,
    });

    if (existingSystemUser) {
      return existingSystemUser;
    }

    const passwordHash = await bcrypt.hash('system-user-internal-password', 10);

    const systemUser = await this.userModel.create({
      email: systemEmail,
      emailVerifiedAt: new Date(),
      isActive: true,
      name: 'Mukti System',
      passwordHash,
      preferences: {
        emailNotifications: false,
        language: 'en',
        theme: 'light',
      },
      role: 'admin',
    });

    this.logger.log('Created system user for built-in techniques');
    return systemUser;
  }

  private getErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }

    return { message: String(error) };
  }
}
