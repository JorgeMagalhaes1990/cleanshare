# Operational email dispatcher

Provider-neutral dispatcher for essential CleanShare rental emails. The
database outbox owns event selection, deduplication and retry state; this
function only resolves the authenticated user's email, renders a short message
and calls the configured provider.

## Required secrets

- `EMAIL_DISPATCH_SECRET`: long random value required in the webhook header.
- `EMAIL_PROVIDER`: `resend` (initial choice) or `aws-ses`.
- `EMAIL_FROM`: verified sender, for example `CleanShare <operacoes@updates.cleanshare.pt>`.
- `EMAIL_REPLY_TO`: optional monitored support address.
- `APP_BASE_URL`: public CleanShare origin, without a trailing path.
- `RESEND_API_KEY`: required when using Resend.
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: required only when using Amazon SES.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Supabase
Edge Function environment. Never expose any of these secrets in browser code.

## Activation order

1. Verify a dedicated sending subdomain with SPF and DKIM; add DMARC.
2. Set the secrets and deploy `send-operational-email` without public JWT verification.
3. Create an INSERT Database Webhook for `private.operational_email_outbox` that calls the function with `x-cleanshare-dispatch-secret`.
4. Add a one-minute scheduled call to the same function without an `outbox_id` so pending retries are drained.
5. Send a controlled test to both pilot accounts and inspect delivery/bounce events.
6. Only then enable queueing:

   ```sql
   update private.operational_email_settings
   set enabled = true, updated_at = now()
   where singleton;
   ```

Do not enable queueing before the provider, domain, function, webhook and retry
schedule have all been validated.

## Pilot checkpoint — 2 September 2026

The production-shaped delivery path is already prepared and has been validated
without enabling general notifications:

- Resend is configured as the initial provider.
- The Edge Function, INSERT webhook and one-minute retry schedule are active.
- The webhook and scheduler authenticate with the same private dispatch secret.
- A controlled message to the Resend account owner was accepted and reported as
  `delivered` by the provider.
- Global queueing remains disabled in `private.operational_email_settings`.
- `CleanShare <onboarding@resend.dev>` is only a temporary sandbox sender and
  must not be used for the two-account pilot or production.

No credential or secret value is stored in this repository.

When the product name and domain are final, resume from this checkpoint:

1. Create a dedicated sending subdomain, such as `updates.example.pt`.
2. Verify SPF and DKIM in Resend and publish a DMARC policy.
3. Replace `EMAIL_FROM` with the verified production sender and configure an
   optional monitored `EMAIL_REPLY_TO`.
4. Send controlled messages to both pilot accounts and confirm delivery.
5. Enable queueing only after the two-recipient test succeeds.
