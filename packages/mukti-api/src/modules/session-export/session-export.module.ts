import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { DialogueModule } from '../dialogue/dialogue.module';
import { ThoughtMapModule } from '../thought-map/thought-map.module';
import { SessionExportController } from './session-export.controller';
import { SessionExportService } from './session-export.service';

/**
 * Session export (session-export spec): downloads one dialogue as Markdown
 * or versioned JSON. Reads every surface through its owning module.
 */
@Module({
  controllers: [SessionExportController],
  imports: [ConversationsModule, DialogueModule, ThoughtMapModule],
  providers: [SessionExportService],
})
export class SessionExportModule {}
