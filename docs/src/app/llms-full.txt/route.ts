import { getLLMText, source } from '@/lib/source';
import { readFile } from 'node:fs/promises';

export const revalidate = false;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en';
  const docsIndex = await readFile(new URL(locale === 'zh-CN' ? '../../../index.zh-CN.md' : '../../../index.md', import.meta.url), 'utf8');
  const scan = source.getPages(locale).map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response([docsIndex, ...scanned].join('\n\n'));
}
