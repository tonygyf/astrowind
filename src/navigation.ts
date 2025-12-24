import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: '首页',
      href: getPermalink('/'),
    },
    {
      text: '博客',
      href: getBlogPermalink(),
    },
    {
      text: '关于',
      href: getPermalink('/about'),
    },
  ],
  actions: [{ text: 'GitHub', href: 'https://github.com/tonygyf', target: '_blank', icon: 'tabler:brand-github' }],
};

export const footerData = {
  links: [],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/tonygyf' },
  ],
  footNote: `
    Copyright &copy; 2025 <a class="text-blue-600 underline dark:text-muted" href="https://github.com/tonygyf">Tonygyf</a> · All rights reserved.
  `,
};
