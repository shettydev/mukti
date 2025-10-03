#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { select, confirm, input } from '@inquirer/prompts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config
const configPath = join(__dirname, '..', '.ai-commit.config.js');
let config;
try {
  const configModule = await import(configPath);
  config = configModule.default;
} catch (error) {
  console.error('❌ Failed to load .ai-commit.config.js');
  process.exit(1);
}

// Check for API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable is not set');
  console.error('   Set it in your shell or .env file:');
  console.error('   export OPENROUTER_API_KEY=your_key_here');
  process.exit(1);
}

// Get git diff
function getGitDiff() {
  try {
    // Try to get staged changes first
    let diff = execSync('git diff --cached', { encoding: 'utf-8' });

    if (!diff.trim()) {
      // If no staged changes, get all changes
      diff = execSync('git diff', { encoding: 'utf-8' });
    }

    if (!diff.trim()) {
      console.error('❌ No changes detected. Stage your changes with: git add .');
      process.exit(1);
    }

    return diff;
  } catch (error) {
    console.error('❌ Failed to get git diff:', error.message);
    process.exit(1);
  }
}

// Call OpenRouter API
async function callOpenRouter(diff, count = 3) {
  const userPrompt = config.userPromptTemplate
    .replace('{diff}', diff)
    .replace('{count}', count);

  const response = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/yourusername/mukti', // Optional
      'X-Title': 'Mukti AI Commit', // Optional
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Parse AI response to extract commit messages
function parseCommitMessages(aiResponse) {
  try {
    // Clean up response - remove markdown code blocks
    let cleaned = aiResponse.trim();

    // Remove ```json and ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');

    // Try to extract JSON array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Try to parse as JSON
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed.map(msg => ({
        type: msg.type,
        scope: msg.scope || '',
        subject: msg.subject,
        body: msg.body || '',
        full: `${msg.type}${msg.scope ? `(${msg.scope})` : ''}: ${msg.subject}`
      }));
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error.message);
  }

  // Fallback: parse text format
  try {
    const lines = aiResponse.split('\n').filter(l => l.trim());
    const commitLines = lines.filter(line => {
      // Look for lines that start with type (feat, fix, etc.)
      return /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.*?\))?:/i.test(line);
    });

    if (commitLines.length > 0) {
      return commitLines.slice(0, 3).map(line => ({
        full: line.replace(/^\d+\.\s*/, '').trim(),
        body: ''
      }));
    }

    // Last resort: just take first 3 non-empty lines
    return lines.slice(0, 3).map(line => ({
      full: line.replace(/^\d+\.\s*/, '').trim(),
      body: ''
    }));
  } catch {
    return [];
  }
}

// Main function
async function main() {
  console.log('🤖 AI-Powered Commit Message Generator\n');
  console.log(`Using: ${config.model}\n`);

  // Get diff
  console.log('📊 Analyzing your changes...\n');
  const diff = getGitDiff();

  // Limit diff size (OpenRouter has token limits)
  const maxDiffLength = 4000;
  const truncatedDiff = diff.length > maxDiffLength
    ? diff.substring(0, maxDiffLength) + '\n... (diff truncated)'
    : diff;

  // Generate commit messages
  console.log('🧠 Generating commit messages...\n');
  let aiResponse;
  try {
    aiResponse = await callOpenRouter(truncatedDiff, config.generate);
  } catch (error) {
    console.error('❌ Failed to generate commit messages:', error.message);
    process.exit(1);
  }

  // Parse messages
  const messages = parseCommitMessages(aiResponse);

  if (messages.length === 0) {
    console.error('❌ Failed to parse AI response');
    process.exit(1);
  }

  // Let user select a message
  const selected = await select({
    message: 'Select a commit message:',
    choices: [
      ...messages.map((msg, i) => ({
        name: msg.full,
        value: msg,
        description: msg.body ? `Details: ${msg.body}` : undefined
      })),
      {
        name: '✏️  Write custom message',
        value: 'custom'
      },
      {
        name: '🔄 Regenerate messages',
        value: 'regenerate'
      },
      {
        name: '❌ Cancel',
        value: 'cancel'
      }
    ]
  });

  if (selected === 'cancel') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  if (selected === 'regenerate') {
    // Recursive call to regenerate
    return main();
  }

  let commitMessage;
  let commitBody = '';

  if (selected === 'custom') {
    commitMessage = await input({
      message: 'Enter commit message:',
      validate: (value) => value.length > 0 || 'Message cannot be empty'
    });
  } else {
    commitMessage = selected.full;
    commitBody = selected.body;
  }

  // Ask for additional body if not provided
  if (!commitBody) {
    const addBody = await confirm({
      message: 'Add detailed description (body)?',
      default: false
    });

    if (addBody) {
      commitBody = await input({
        message: 'Enter commit body (optional):'
      });
    }
  }

  // Confirm commit
  console.log('\n📝 Commit message:');
  console.log('─'.repeat(50));
  console.log(commitMessage);
  if (commitBody) {
    console.log();
    console.log(commitBody);
  }
  console.log('─'.repeat(50));

  const shouldCommit = await confirm({
    message: 'Create commit?',
    default: true
  });

  if (!shouldCommit) {
    console.log('❌ Commit cancelled');
    process.exit(0);
  }

  // Create commit
  try {
    const fullMessage = commitBody
      ? `${commitMessage}\n\n${commitBody}`
      : commitMessage;

    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Commit created successfully!');
  } catch (error) {
    console.error('❌ Failed to create commit:', error.message);
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
