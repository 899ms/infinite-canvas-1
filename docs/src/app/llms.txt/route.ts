import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { readFile } from 'node:fs/promises';

export const revalidate = false;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') ?? 'en';
  const docsIndex = await readFile(new URL(locale === 'zh-CN' ? '../../../index.zh-CN.md' : '../../../index.md', import.meta.url), 'utf8');
  return new Response([docsIndex, llms(source).index(locale)].join('\n\n'));
}
