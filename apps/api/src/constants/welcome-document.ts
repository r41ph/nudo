export const WELCOME_DOCUMENT = {
  title: 'Welcome Document',
  slug: 'welcome-document',
  content: [
    { type: 'h1', children: [{ text: 'Your Story Starts Here' }] },
    {
      type: 'p',
      children: [
        {
          text: 'Every great book begins with a single sentence. This is yours.',
        },
      ],
    },
    {
      type: 'p',
      children: [
        {
          text: "Don't worry about getting it perfect — just start writing. Your words are saved automatically, so you can focus on what matters: telling your story.",
        },
      ],
    },
  ],
  plainText:
    "Your Story Starts Here Every great book begins with a single sentence. This is yours. Don't worry about getting it perfect — just start writing. Your words are saved automatically, so you can focus on what matters: telling your story.",
} as const;

export const WELCOME_WORD_COUNT =
  WELCOME_DOCUMENT.plainText.split(/\s+/).length;
