import { validateAgainstSchema } from '../schema-validator';
import { SESSION_EXPORT_SCHEMA_VERSION } from '../session-export.types';
import { FIXTURE_EXPORT } from './fixture-export';
import { loadPublishedSchema } from './load-published-schema';

describe('published session-export schema', () => {
  const schema = loadPublishedSchema();

  it('accepts a complete v1 export', () => {
    expect(validateAgainstSchema(FIXTURE_EXPORT, schema)).toEqual([]);
  });

  it('pins the same schema version as the code', () => {
    expect(schema.properties!.schemaVersion.const).toBe(
      SESSION_EXPORT_SCHEMA_VERSION,
    );
  });

  it('rejects an export with an unknown field', () => {
    const errors = validateAgainstSchema(
      { ...FIXTURE_EXPORT, userEmail: 'a@b.c' },
      schema,
    );
    expect(errors).toContain('$: unexpected property "userEmail"');
  });

  it('rejects prototype-shaped unexpected keys from parsed JSON', () => {
    const value = JSON.parse(
      JSON.stringify(FIXTURE_EXPORT).replace('{', '{"__proto__":{},'),
    );
    expect(validateAgainstSchema(value, schema)).toContain(
      '$: unexpected property "__proto__"',
    );
  });

  it('rejects an unreported value written as anything but a number or not_reported', () => {
    const reply = { ...FIXTURE_EXPORT.messages[1].reply!, totalTokens: 'n/a' };
    const errors = validateAgainstSchema(
      {
        ...FIXTURE_EXPORT,
        messages: [{ ...FIXTURE_EXPORT.messages[1], reply }],
      },
      schema,
    );
    expect(errors.join('\n')).toMatch(/totalTokens/);
  });

  it('rejects a wrong schema version', () => {
    expect(
      validateAgainstSchema({ ...FIXTURE_EXPORT, schemaVersion: 2 }, schema),
    ).toContain('$.schemaVersion: expected 1');
  });
});
