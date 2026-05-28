-- Drop unused invoice_records table.
-- Invoices are tracked via employee_documents (status workflow) and the PDF
-- itself. No code path ever inserted into invoice_records; the only reference
-- was a dead UPDATE in src/app/dashboard/rh/rh-workspace.tsx (removed alongside
-- this migration).

DROP TABLE IF EXISTS public.invoice_records;
