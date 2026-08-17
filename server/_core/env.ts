export const ENV = {
  // ── Core ──────────────────────────────────────────────────────────────────
  isProduction: process.env.NODE_ENV === "production",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl:  process.env.DATABASE_URL ?? "",
  appUrl:       process.env.APP_URL ?? "",

  // ── Auth: Google OAuth2 ───────────────────────────────────────────────────
  googleClientId:     process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // ── Auth: Admin ───────────────────────────────────────────────────────────
  // Email del usuario que se convertirá en admin automáticamente al registrarse
  ownerEmail: process.env.OWNER_EMAIL ?? "",

  // ── Email: Resend ─────────────────────────────────────────────────────────
  resendApiKey:  process.env.RESEND_API_KEY ?? "",
  resendFrom:    process.env.RESEND_FROM ?? "ISEKAI WORLD <noreply@isekaiworld.co>",

  // ── Storage: Cloudflare R2 ────────────────────────────────────────────────
  r2AccountId:       process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId:     process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName:      process.env.R2_BUCKET_NAME ?? "",
  // URL pública del bucket (ej: https://pub-xxx.r2.dev o dominio propio)
  r2PublicUrl:       process.env.R2_PUBLIC_URL ?? "",

  // ── Leads: Mailchimp ──────────────────────────────────────────────────────
  mailchimpApiKey: process.env.MAILCHIMP_API_KEY ?? "",
  // ID de la audiencia/lista donde se guardan los suscriptores
  mailchimpListId: process.env.MAILCHIMP_LIST_ID ?? "",
  // Data center de tu cuenta (últimas letras del API key, ej: "us21")
  mailchimpDc:     process.env.MAILCHIMP_DC ?? "",

};

// ── Validación en startup ──────────────────────────────────────────────────
export function validateEnv() {
  const required: (keyof typeof ENV)[] = [
    "cookieSecret",
    "databaseUrl",
  ];
  const missing = required.filter((k) => !ENV[k]);
  if (missing.length) {
    console.error(`[ENV] Variables requeridas faltantes: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (ENV.cookieSecret.length < 32) {
    console.error("[ENV] JWT_SECRET debe tener al menos 32 caracteres");
    process.exit(1);
  }

  const optional: { key: keyof typeof ENV; service: string }[] = [
    { key: "googleClientId",     service: "Google OAuth" },
    { key: "googleClientSecret", service: "Google OAuth" },
    { key: "resendApiKey",       service: "Resend (emails)" },
    { key: "r2AccountId",        service: "Cloudflare R2" },
    { key: "r2AccessKeyId",      service: "Cloudflare R2" },
    { key: "r2SecretAccessKey",  service: "Cloudflare R2" },
    { key: "r2BucketName",       service: "Cloudflare R2" },
    { key: "r2PublicUrl",        service: "Cloudflare R2" },
    { key: "mailchimpApiKey",    service: "Mailchimp" },
    { key: "mailchimpListId",    service: "Mailchimp" },
    { key: "mailchimpDc",        service: "Mailchimp" },
  ];

  for (const { key, service } of optional) {
    if (!ENV[key]) {
      console.warn(`[ENV] ${service} no configurado (${key} vacío) — funcionalidad desactivada.`);
    }
  }
}
