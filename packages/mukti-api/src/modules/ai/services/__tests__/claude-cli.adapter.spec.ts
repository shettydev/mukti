import { mkdtempSync, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';

import { LocalCliError } from '../../types/local-cli-adapter.interface';
import {
  CLAUDE_REQUIRED_FLAGS,
  ClaudeCliAdapter,
} from '../adapters/claude-cli.adapter';

/**
 * claude-code-ai-provider, "Completions via local `claude -p`": every run
 * leaves no session transcript, runs from a folder Mukti owns, and loads no
 * project or user settings or `CLAUDE.md`. `warm()` proves the installed CLI
 * accepts both options without a model run.
 */
const request: AiChatSendRequest = {
  messages: [
    { content: 'You are a Socratic guide.', role: 'system' },
    { content: 'Why does my retry double charge?', role: 'user' },
  ],
  model: 'sonnet',
  responseFormat: undefined,
};

const HELP_WITH_BOTH = `Usage: claude [options] [command] [prompt]
  --no-session-persistence              Disable session persistence
  --setting-sources <sources>           Comma-separated list of setting sources`;

describe('ClaudeCliAdapter', () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = join(mkdtempSync(join(tmpdir(), 'mukti-claude-')), 'ws');
  });

  afterEach(() => {
    rmSync(join(workspaceDir, '..'), { force: true, recursive: true });
  });

  describe('buildArgs', () => {
    it('disables session persistence and every outside setting source', () => {
      const args = new ClaudeCliAdapter({ workspaceDir }).buildArgs(request);

      expect(args).toContain('--no-session-persistence');
      const sources = args.indexOf('--setting-sources');
      expect(sources).toBeGreaterThan(-1);
      expect(args[sources + 1]).toBe('');
    });

    it('lists exactly the flags warm() checks for', () => {
      expect(CLAUDE_REQUIRED_FLAGS).toEqual([
        '--no-session-persistence',
        '--setting-sources',
      ]);
    });
  });

  describe('spawnOptions', () => {
    it('runs from the Mukti-owned folder, creating it on demand', () => {
      const { cwd } = new ClaudeCliAdapter({ workspaceDir }).spawnOptions();

      expect(cwd).toBe(realpathSync(workspaceDir));
      expect(cwd).not.toBe(realpathSync(process.cwd()));
    });

    it('defaults to ~/.mukti/mukti-socratic', () => {
      const adapter = new ClaudeCliAdapter({ runHelp: jest.fn() });

      expect(adapter.workspace).toMatch(/[/\\]\.mukti[/\\]mukti-socratic$/);
    });
  });

  describe('warm', () => {
    it('passes when the installed CLI lists both options, without a model run', async () => {
      const runHelp = jest
        .fn()
        .mockResolvedValue({ exitCode: 0, stderr: '', stdout: HELP_WITH_BOTH });

      await new ClaudeCliAdapter({ runHelp, workspaceDir }).warm();

      expect(runHelp).toHaveBeenCalledTimes(1);
    });

    it('reports not ready, naming the missing option, on an older CLI', async () => {
      const runHelp = jest.fn().mockResolvedValue({
        exitCode: 0,
        stderr: '',
        stdout: '  --setting-sources <sources>   Setting sources',
      });

      const warm = new ClaudeCliAdapter({ runHelp, workspaceDir }).warm();

      await expect(warm).rejects.toBeInstanceOf(LocalCliError);
      await expect(warm).rejects.toThrow(/--no-session-persistence/);
      await expect(warm).rejects.toThrow(/update Claude Code/i);
    });

    it('says the CLI is not installed when it cannot be started', async () => {
      const runHelp = jest.fn().mockResolvedValue({
        exitCode: null,
        spawnErrorCode: 'ENOENT',
        stderr: 'spawn claude ENOENT',
        stdout: '',
      });

      await expect(
        new ClaudeCliAdapter({ runHelp, workspaceDir }).warm(),
      ).rejects.toThrow(/not found on PATH/);
    });
  });
});
