import { z } from 'zod';
export const configSchema=z.object({ACCESS_TOKEN:z.string().min(32),DATA_KEY:z.string().regex(/^[a-f0-9]{64}$/),PORT:z.coerce.number().default(4318),DATA_DIR:z.string().default('.tranz-data'),AGORA_APP_ID:z.string().default(''),AGORA_APP_CERTIFICATE:z.string().default(''),AI_BASE_URL:z.string().url().default('https://api.openai.com/v1'),AI_API_KEY:z.string().default(''),AI_MODEL:z.string().default('gpt-4o-mini'),EXTENSION_ID:z.string().regex(/^[a-p]{32}$/).optional()});
export type Config=z.infer<typeof configSchema>;
