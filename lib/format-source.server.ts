import { format } from 'prettier';

/** Format the displayed/copyable source without changing distribution files. */
export async function formatSource(code: string, filename: string): Promise<string> {
  const parser = /\.svg$/i.test(filename) ? 'html'
    : /\.tsx?$/i.test(filename) ? 'typescript' : undefined;
  if (!parser) return code;
  try {
    return await format(code, {
      parser, printWidth: 88, tabWidth: 2, singleQuote: true,
      endOfLine: 'lf', embeddedLanguageFormatting: 'off',
      htmlWhitespaceSensitivity: 'strict',
    });
  } catch {
    // An unsupported syntax must never prevent someone from reading the source.
    return code;
  }
}
