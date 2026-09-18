# OutZila project instructions

Read AI_WORKFLOW.txt, PROJECT_CONTEXT.txt, OutZila_Blueprint_v1.8.md and OutZila_Identidade_Autenticacao.md before product or identity work. Read OutZila_Dossier_Produto_Segurador_v0.9.md for insurance and financial assumptions, and DESIGN_RULES.txt for visual changes.

OutZila is the current brand. CleanShare and OutShare filenames are historical and identify the same project. Current strategy is individual premium outdoor/leisure equipment above EUR 500, not the legacy four-category catalog or multi-item sets.

Supabase owns accounts, login and sessions. Signicat is preferred for civil identity verification and electronic signing. Onboarding must support national eID/EUDI Wallet when available and ID document plus selfie/liveness, with NFC where applicable. Do not require eID/EUDI Wallet or CMD as the exclusive launch method. Do not confuse a session, confirmed email or pilot access with verified civil identity.

Store only strictly necessary verified attributes and minimal verification evidence. No default retention of identity documents or biometric data in OutZila, except documented legal necessity with access and retention controls. Contracts must bind both verified identities, bilateral electronic signatures and an exportable audit trail to the rental. Preserve the chain verified identity -> contract -> payment -> documented bilateral handover -> documented bilateral return. Design Europe-first with future EUDI adoption; validate actual regional processing and provider capabilities.

Documented production requirements are not implemented integrations. Never claim active Signicat, legal contracts, payments, blocked deposits, insurance or operational email delivery without evidence. Documentation-only requests do not authorize code, migrations, infrastructure, provider accounts, secrets, DNS, public deployment, commit or push. Preserve user changes and historical versions.
