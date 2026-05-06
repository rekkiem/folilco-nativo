// tests/setup.ts — Se ejecuta antes de cada suite de tests

process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token-12345";
process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret-32-chars-long!!";
process.env.TWILIO_ACCOUNT_SID = "ACtest123456789012345678901234567890";
process.env.TWILIO_AUTH_TOKEN = "test-auth-token-32-chars-long!!!";
process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@test-project.iam.gserviceaccount.com";
process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIItest\n-----END PRIVATE KEY-----\n";
process.env.GOOGLE_SPREADSHEET_ID = "1BxiMVs0XRA5test";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "test-password-strong";
process.env.JWT_SECRET = "test-jwt-secret-minimum-32-chars!!";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3003";
process.env.CRON_SECRET = "test-cron-secret";
