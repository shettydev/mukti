import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { DialogueQualityModule } from '../dialogue-quality/dialogue-quality.module';
import { ScaffoldingModule } from '../scaffolding/scaffolding.module';
import { SocraticTurnEngine } from './socratic-turn.engine';

/**
 * The single place a Socratic turn's learner-model steps run. Every surface
 * that holds a questioning dialogue imports this instead of wiring the
 * scaffolding and quality services itself.
 */
@Module({
  exports: [SocraticTurnEngine],
  imports: [AiModule, DialogueQualityModule, ScaffoldingModule],
  providers: [SocraticTurnEngine],
})
export class SocraticTurnModule {}
