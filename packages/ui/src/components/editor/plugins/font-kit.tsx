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
  // The app has no font-family picker: a `fontFamily` mark can only enter the
  // document by pasting HTML from outside (Word, Google Docs, the web), where it
  // overrides the app's own typography. Disable the plugin's HTML deserializer
  // so external font families are dropped on paste and the app font wins.
  // In-app copy/paste is unaffected — it round-trips through Slate's fragment
  // data, not HTML deserialization.
  FontFamilyPlugin.configure({
    ...options,
    parsers: { html: { deserializer: { query: () => false } } },
  }),
];
