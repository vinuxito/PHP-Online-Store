# QuantiX shared shopping workspace

Ticket [2026101201](/lamp/www/cfdadmin/docs/tickets/archive/ticket-2026101201-quantix-shared-shopping/BRIEF.md) implements one shopping selection shared by a person and an explicitly delegated shopper agent. The public showroom, product formats and existing checkout continue to use their established contracts.

## Buyer journey

Open **Tu selección**, describe the desired purchase and optionally set a total MXN budget. Save options from the catalogue, advisor, quiz, comparison or product detail. Published facts explain suggestions; absent facts remain unspecified. Choose a format through the existing product detail, then review the current cart conditions. Saved status appears only after server readback with a receipt and version. Unsaved edits, price changes and conflicts have explicit recovery actions.

The workspace stores shopping preferences, published product identifiers, formats and quantities. Delivery/customer/fiscal information belongs in the existing checkout and is not copied into the workspace. Do not include private information in the free-text preference field. Browser cart storage is tenant scoped. Credentials are kept in HttpOnly cookies or displayed transiently only after an explicit sharing action.

**Continuar en otro dispositivo** creates a link valid for at most ten minutes and one successful claim. Its capability is in a URL fragment, stripped before other storefront scripts run. A retry with the same operation in the claiming buyer context can recover a lost response; a different context cannot reuse a consumed link. **Dar acceso a mi agente** creates an explicit read/write grant for at most thirty minutes. The buyer can revoke outstanding access after reload. A shopper grant never confers merchant configuration, payment verification, fiscal issuance, reservation or checkout-submission authority.

## Machine interface

The authoritative runtime contract is `GET api/shopper_workspace.php?action=discover`. It describes request fields, scopes, limits, actions and recovery codes. The endpoint returns JSON and private `no-store` responses.

A person creates or resumes the workspace through the storefront session. An agent receives the explicit sharing payload containing the endpoint URL, tenant, workspace identifier, bearer credential and expiry. Send that credential **only** as `Authorization: Bearer ...`; never put it in query strings, logs, documentation or persistent browser storage. Merchant keys and owner account sessions are unnecessary.

The normal agent loop is:

1. `GET ?action=read&tenant=<tenant>&workspace_id=<id>` reads canonical intention, shortlist/cart, published facts, permitted actions, latest receipt and current quote.
2. `GET ?action=recommend&tenant=<tenant>&workspace_id=<id>` returns up to six candidates ranked over published keywords, with factual reasons. The scan is bounded to 200 candidate rows; the existing catalogue endpoint is also disclosed for broader browsing. Ranking is not a confidence probability.
3. `POST` an allowed patch with the observed revision and a new operation identifier.
4. Read the returned receipt and quote; resolve blockers or report the next permitted action.

Example body, with placeholder values only:

```json
{
  "action": "update",
  "tenant": "<tenant>",
  "workspace_id": "<workspace_id>",
  "expected_revision": 4,
  "operation_id": "unique-operation-0001",
  "state": {
    "shortlist": ["<published_product_id>"],
    "cart": {"items": [{"id": "<published_product_id>", "qty": 1}]}
  }
}
```

For a published decant, use `id: <base_id>__decant` and `isDecant: true`. Unsupported custom finishes, gifts, bundles or subscriptions are preserved as requests requiring store quotation; no price is invented. `priceWithTax`, if supplied, is the amount the buyer previously saw and must be reviewed explicitly when it changes. The server reuses `QuantixPendingOrderContract` to calculate full/decant prices, VAT and IEPS. Repeated full-format quantities are checked against aggregate published stock. Stock is never reserved by a quote.

An agent may tighten the owner's budget. It cannot remove or increase the current budget or exceed the ceiling captured when its grant was issued. A quote over budget is blocked. Unavailable/unpriced lines make the full total `null`, with an explicitly known partial amount; they never become a false zero or complete partial total.

## Recovery and receipts

- An unknown network result must be retried with the **same operation ID and identical body**. A successful replay returns the same immutable receipt and the latest canonical state.
- `REVISION_CONFLICT` (409) requires reading current state and consciously reconciling before a new operation. The human interface retains its draft and offers the saved version or explicit replacement.
- `OPERATION_CONFLICT` (409) means an operation ID already corresponds to different data. Use a new ID after reviewing current state.
- Invalid input (400/422) remains editable. Read-only, expired/revoked, cross-tenant or incompatible authorization fails closed.
- Grant/handoff secrets are returned once and are never stored in replay receipts. A lost issuance response is recovered by reading outstanding grant metadata, revoking that access and issuing a new one.
- The selection and replay receipts expire after seven days according to the declared server policy. A persistent hashed HttpOnly buyer capability restores ownership if PHP loses its session. Cookie loss still requires an existing device's explicit handoff.

Human checkout additionally binds a new pending request to the reviewed workspace revision and exact cart identity. It checks current quote, budget and existing server pricing before recording anything. The established attempt ID preserves one immutable pending-order receipt on retry. If a successful response is lost and the buyer reloads with the old basket, its safe canonical identity is matched to the existing receipt. A different attempt cannot silently register the same selection again: the buyer must explicitly choose “Registrar otra solicitud”, bound to the previous folio and reviewed basket. Reordered basket rows retain the same identity. A monotonic shopper-relation sequence identifies the latest registration even within the same second. The linked shopper receipt omits customer data and describes **the state at registration**: it is not a current bank/PAC lookup. No confirmation of payment, delivery, reserved inventory, notification or CFDI issuance is implied.

## Operations and verification

The PHP workspace store creates only additive `quantix_shopper_*` tables and upgrades its early schema fields safely. It does not change invoice, stock, certificate or payment tables. Owner and agent tokens are hashed in the database. Session mutations require CSRF; create/claim require same origin. Inputs, payload sizes, candidate lists, quantities, active grants, anonymous creation and mutations are bounded. Expired shopper data is pruned in bounded maintenance batches; pending-order financial records are retained.

Both repository checkouts remain on master. Public JS/CSS use filemtime cache keys. No framework bundle, model call per tap or new external service is required. A ten-second visible-dialog refresh pauses during draft edits, pending requests and visible capability secrets.

Focused contracts: `php /lamp/www/cfdadmin/tests/test_quantix_shopper_contract.php` and `php /lamp/www/cfdadmin/tests/test_ticket_2026101201_recommendation_truth.php`. Served reproduction: `node /lamp/www/cfdadmin/tests/e2e/test_ticket_2026101201_shopper_workspace.mjs` from the existing Playwright runtime. The CLI QA helper seeds private, owned disposable tenants/products, checks financial/fiscal absence and removes only its own records. No bank transfer, email or PAC/SAT operation is performed. Detailed raw results and limitations are linked from the ticket diagnosis.
