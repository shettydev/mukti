import { Module } from '@nestjs/common';

import { ProblemCanvasController } from './problem-canvas.controller';
import { ProblemCanvasService } from './problem-canvas.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [ProblemCanvasController],
  providers: [ProblemCanvasService],
  exports: [ProblemCanvasService],
})
export class ProblemCanvasModule {}
