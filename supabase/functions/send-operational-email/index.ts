import { createClient } from "npm:@supabase/supabase-js@2";

type OutboxEmail = {
  outbox_id: string;
  event_key: string;
  template_key: string;
  recipient_user_id: string;
  rental_id: string;
  payload: Record<string, unknown>;
  attempt: number;
};

type RenderedEmail = { subject: string; text: string; html: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EMAIL_PROVIDER = (Deno.env.get("EMAIL_PROVIDER") || "resend").toLowerCase();
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "CleanShare <operacoes@cleanshare.pt>";
const EMAIL_REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") || "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://cleanshare-chi.vercel.app";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function operationUrl(rentalId: string): string {
  const url = new URL("/area-utilizador.html", APP_BASE_URL);
  url.searchParams.set("operation", rentalId);
  url.hash = "operacoes-recentes";
  return url.toString();
}

function formatDeadline(value: unknown): string {
  if (!value) return "nas próximas 24 horas";
  const deadline = new Date(String(value));
  if (Number.isNaN(deadline.getTime())) return "nas próximas 24 horas";
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(deadline);
}

function renderEmail(email: OutboxEmail): RenderedEmail {
  const equipment = String(email.payload?.equipment_title || "o equipamento");
  const link = operationUrl(email.rental_id);
  let subject = "Atualização da sua operação CleanShare";
  let message = "Existe uma atualização importante na sua operação.";
  let action = "Ver operação";

  switch (email.template_key) {
    case "new_request":
      subject = `Novo pedido para ${equipment}`;
      message = `Recebeu um novo pedido de aluguer para ${equipment}.`;
      action = "Analisar pedido";
      break;
    case "request_accepted":
      subject = "O seu pedido foi aceite";
      message = `O pedido de aluguer de ${equipment} foi aceite. Consulte os próximos passos para a recolha.`;
      break;
    case "request_rejected":
      subject = "Atualização do seu pedido";
      message = `O pedido de aluguer de ${equipment} não foi aceite.`;
      action = "Consultar pedido";
      break;
    case "request_cancelled":
      subject = "Operação cancelada";
      message = `O pedido relativo a ${equipment} foi cancelado.`;
      break;
    case "handover_confirmation_required":
      subject = `Confirme a recolha de ${equipment}`;
      message = `A outra parte confirmou a recolha de ${equipment}. Confirme o estado inicial para a utilização poder começar.`;
      action = "Confirmar recolha";
      break;
    case "return_confirmation_required": {
      const deadline = formatDeadline(email.payload?.deadline_at);
      subject = `Confirme a devolução até ${deadline}`;
      message = `A outra parte confirmou a devolução de ${equipment}. Confirme o estado final até ${deadline}.`;
      action = "Confirmar devolução";
      break;
    }
    case "operation_completed":
      subject = `Operação concluída: ${equipment}`;
      message = `A operação relativa a ${equipment} ficou concluída. O registo permanece disponível na sua área de utilizador.`;
      action = "Consultar operação";
      break;
  }

  const html = `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#101828">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(message)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #d8e5de;border-radius:16px">
        <tr><td style="padding:26px 28px 8px;color:#087a4d;font-size:20px;font-weight:700">CleanShare</td></tr>
        <tr><td style="padding:12px 28px 4px;font-size:20px;font-weight:700;line-height:1.35">${escapeHtml(subject)}</td></tr>
        <tr><td style="padding:8px 28px;color:#475467;font-size:15px;line-height:1.6">${escapeHtml(message)}</td></tr>
        <tr><td style="padding:18px 28px 28px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#087a4d;color:#fff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(action)}</a></td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eaecf0;color:#667085;font-size:12px;line-height:1.5">Mensagem operacional automática. Não inclui dados pessoais nem fotografias da operação.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    subject,
    text: `${message}\n\n${action}: ${link}\n\nMensagem operacional automática da CleanShare.`,
    html
  };
}

async function sendWithResend(to: string, email: RenderedEmail, eventKey: string): Promise<string> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": eventKey
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`RESEND_${response.status}:${JSON.stringify(result)}`);
  if (!result?.id) throw new Error("RESEND_MESSAGE_ID_MISSING");
  return String(result.id);
}

async function sendWithAwsSes(to: string, email: RenderedEmail, eventKey: string): Promise<string> {
  const region = Deno.env.get("AWS_REGION") || "eu-west-1";
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") || "";
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") || "";
  if (!accessKeyId || !secretAccessKey) throw new Error("AWS_SES_CREDENTIALS_NOT_CONFIGURED");
  const { SESv2Client, SendEmailCommand } = await import("npm:@aws-sdk/client-sesv2@3");
  const client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
  const result = await client.send(new SendEmailCommand({
    FromEmailAddress: EMAIL_FROM,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: EMAIL_REPLY_TO ? [EMAIL_REPLY_TO] : undefined,
    Content: {
      Simple: {
        Subject: { Data: email.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: email.html, Charset: "UTF-8" },
          Text: { Data: email.text, Charset: "UTF-8" }
        }
      }
    },
    EmailTags: [{ Name: "cleanshare_event", Value: eventKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 255) }]
  }));
  if (!result.MessageId) throw new Error("AWS_SES_MESSAGE_ID_MISSING");
  return result.MessageId;
}

async function deliver(email: OutboxEmail): Promise<void> {
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(email.recipient_user_id);
  if (userError) throw userError;
  const recipient = userData.user?.email;
  if (!recipient) throw new Error("RECIPIENT_EMAIL_UNAVAILABLE");
  const rendered = renderEmail(email);
  const providerMessageId = EMAIL_PROVIDER === "aws-ses"
    ? await sendWithAwsSes(recipient, rendered, email.event_key)
    : await sendWithResend(recipient, rendered, email.event_key);
  const { error } = await supabaseAdmin.rpc("complete_operational_email", {
    p_outbox_id: email.outbox_id,
    p_provider_message_id: providerMessageId
  });
  if (error) throw error;
}

async function claim(outboxId: string | null): Promise<OutboxEmail | null> {
  const { data, error } = await supabaseAdmin.rpc("claim_operational_email", { p_outbox_id: outboxId });
  if (error) throw error;
  return (data?.[0] as OutboxEmail | undefined) || null;
}

async function markFailed(outboxId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await supabaseAdmin.rpc("fail_operational_email", {
    p_outbox_id: outboxId,
    p_error: message.slice(0, 1000)
  });
}

Deno.serve(async (request) => {
  const dispatchSecret = Deno.env.get("EMAIL_DISPATCH_SECRET") || "";
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !dispatchSecret) {
    return Response.json({ error: "EMAIL_DISPATCH_NOT_CONFIGURED" }, { status: 503 });
  }
  if (request.headers.get("x-cleanshare-dispatch-secret") !== dispatchSecret) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedId = typeof body?.record?.id === "string"
    ? body.record.id
    : typeof body?.outbox_id === "string" ? body.outbox_id : null;
  const limit = requestedId ? 1 : 10;
  const results: Array<{ id: string; status: string }> = [];

  for (let index = 0; index < limit; index += 1) {
    const email = await claim(index === 0 ? requestedId : null);
    if (!email) break;
    try {
      await deliver(email);
      results.push({ id: email.outbox_id, status: "sent" });
    } catch (error) {
      await markFailed(email.outbox_id, error);
      results.push({ id: email.outbox_id, status: "failed" });
    }
  }

  return Response.json({ processed: results.length, results });
});
