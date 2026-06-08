-- Allow restricting which document types an RH can manage for each assigned employee.
-- Semantics: allowed_document_type_ids NULL or empty array = no restriction (all types allowed).
--            A non-empty array limits the RH to those document types for that employee,
--            both for visibility and for actions (upload / request).

ALTER TABLE public.rh_employee_assignments
  ADD COLUMN IF NOT EXISTS allowed_document_type_ids uuid[];
