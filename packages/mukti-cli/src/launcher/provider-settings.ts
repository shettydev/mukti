/**
 * The launcher's own settings file, `<mukti home>/config.json`.
 *
 * @remarks
 * It currently holds one thing: the AI CLI the user chose to use by default.
 * The file handling lives in the API's shared `local-cli` folder because the
 * API writes it too, when the user switches provider from Settings and keeps
 * the choice. One reader and one writer for both means the launcher always
 * understands what Settings saved. See `provider-settings-file.ts` there for
 * the rules: every failure reads as "no default saved", with a warning naming
 * the file, and writes are atomic and keep keys they do not know.
 */
export {
  providerSettingsPath,
  readStoredProvider,
  type StoredProvider,
  writeStoredProvider,
} from '../../../mukti-api/src/modules/ai/local-cli/provider-settings-file.ts';
