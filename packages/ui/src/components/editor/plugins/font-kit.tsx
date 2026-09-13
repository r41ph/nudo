'use client';

import type { PlatePluginConfig } from 'platejs/react';

import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
} from '@platejs/basic-styles/react';
import { KEYS } from 'platejs';

const options = {
  inject: { targetPlugins: [KEYS.p] },
} satisfies PlatePluginConfig;

export const FontKit = [
  FontColorPlugin.configure({
    inject: {
      ...options.inject,
      nodeProps: {
        defaultNodeValue: 'black',
      },
    },
  }),
  FontBackgroundColorPlugin.configure(options),
  FontSizePlugin.configure(options),
  // There is no font picker, so a `fontFamily` mark can only arrive by pasting
  // external HTML, where it would override the app typography. In-app paste is
  // unaffected: it round-trips through Slate fragments, not HTML.
  FontFamilyPlugin.configure({
    ...options,
    parsers: { html: { deserializer: { query: () => false } } },
  }),
];
