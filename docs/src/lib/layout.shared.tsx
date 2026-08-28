import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appNames, gitConfig } from './shared';
import { ArrowUpRight } from 'lucide-react';
import { i18n, localizePath } from './i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
const qqUrl = 'https://qm.qq.com/q/DFnKzZ807u';

export const translations = i18n.translations().extend(uiTranslations()).add('ui', {
  en: {
    displayName: 'English',
  },
  'zh-CN': {
    displayName: '简体中文',
    'Choose a language(language switcher)': '选择语言',
    'Choose a language(language switcher)(aria-label)': '选择语言',
    'Search(search trigger)': '搜索文档',
    'Open Search(search trigger)(aria-label)': '打开搜索',
    'Search(search dialog)': '搜索文档',
    'Close Search(search dialog)(aria-label)': '关闭搜索',
    'No results found(search dialog)': '没有找到结果',
    'Toggle Menu(mobile menu)(aria-label)': '切换菜单',
    'On this page(table of contents)': '本页目录',
    'No Headings(table of contents)': '本页没有标题',
  },
});

export function baseOptions(locale: string): BaseLayoutProps {
  const chinese = locale === 'zh-CN';
  const appName = appNames[locale as keyof typeof appNames];

  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <img src="/logo.svg" alt={appName} className="h-6 w-6" />
          <span>{appName}</span>
        </span>
      ),
    },
    links: [
      {
        text: chinese ? '文档导航' : 'Documentation',
        url: localizePath(locale, '/docs/overview/quick-start'),
        on: 'nav',
      },
      {
        text: (
          <span className="inline-flex items-center gap-1.5">
            <span>{chinese ? '在线体验' : 'Live Demo'}</span>
            <ArrowUpRight className="size-4" />
          </span>
        ),
        url: 'https://canvas.best/',
        external: true,
        on: 'nav',
      },
      {
        type: 'icon',
        text: 'GitHub',
        label: 'GitHub',
        url: githubUrl,
        external: true,
        on: 'menu',
        icon: <img src="/github.svg" alt="" className="size-4" />,
      },
      {
        type: 'icon',
        text: 'QQ',
        label: 'QQ',
        url: qqUrl,
        external: true,
        on: 'menu',
        icon: <img src="/qq.svg" alt="" className="size-4" />,
      },
    ],
  };
}
