/** ChatGPT Developer Mode uses readOnlyHint to classify callable tools on Plus/Pro. */
export const READ_ONLY_TOOL = {
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
} as const;

export const WRITE_TOOL = {
  annotations: {
    readOnlyHint: false,
    openWorldHint: false,
  },
} as const;
