import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss());

    // Add path alias resolution
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ui': resolve(__dirname, '../src'),
      '@web': resolve(__dirname, '../../../apps/web/src'),
    };

    // Stories have no API. A valid but unroutable URL lets the web client build
    // requests that a story can answer by stubbing fetch, and fail otherwise.
    config.define = {
      ...config.define,
      'import.meta.env.VITE_API_URL': JSON.stringify(
        'http://api.storybook.invalid'
      ),
    };

    return config;
  },
};
export default config;
