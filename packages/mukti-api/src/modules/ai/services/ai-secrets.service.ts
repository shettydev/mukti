import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class AiSecretsService {
  private readonly key?: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyBase64 =
      this.configService.get<string>('AI_SECRETS_ENCRYPTION_KEY') ?? '';

    if (!keyBase64) {
      return;
    }

    const decoded = Buffer.from(keyBase64, 'base64');

    if (decoded.length !== 32) {
      throw new Error('AI_SECRETS_ENCRYPTION_KEY must be 32 bytes base64');
    }

    this.key = decoded;
  }

  decryptString(payload: string): string {
    const key = this.getKey();
    const [version, ivB64, ciphertextB64, tagB64] = payload.split(':');

    if (version !== 'v1' || !ivB64 || !ciphertextB64 || !tagB64) {
      throw new Error('Invalid encrypted payload');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }

  encryptString(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf8')),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64'),
      ciphertext.toString('base64'),
      tag.toString('base64'),
    ].join(':');
  }

  private getKey(): Buffer {
    if (!this.key) {
      throw new Error('AI_SECRETS_ENCRYPTION_KEY is not configured');
    }

    return this.key;
  }
}
