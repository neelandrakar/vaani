import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:4200/vaanidb',
  jwtSecret: process.env.JWT_SECRET || 'vaani_dev_jwt_secret_change_in_production_min32chars',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiMode: (process.env.AI_MODE || 'mock').toLowerCase(),
  asrModelId: process.env.ASR_MODEL_ID || 'ai4bharat/indic-conformer-600m-multilingual',
  llmModelId: process.env.LLM_MODEL_ID || 'Qwen/Qwen3-8B',
  ttsModelId: process.env.TTS_MODEL_ID || 'ai4bharat/indic-parler-tts',
  telephonyProvider: process.env.TELEPHONY_PROVIDER || 'simulator',
  enableCallRecording: process.env.ENABLE_CALL_RECORDING === 'true',
  recordingRetentionDays: parseInt(process.env.CALL_RECORDING_RETENTION_DAYS || '30', 10),
};
