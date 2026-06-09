-- Add payment tracking fields to sales
ALTER TABLE sales ADD COLUMN paid_amount DECIMAL(14,4) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN payment_status VARCHAR(10) NOT NULL DEFAULT 'paid';
ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check CHECK (payment_status IN ('paid','partial','pending'));

-- Backfill: all existing sales were paid at moment of emission (cash)
UPDATE sales SET paid_amount = total WHERE paid_amount = 0;

-- Add isCredit flag to payment_methods (immutable after creation)
ALTER TABLE payment_methods ADD COLUMN is_credit BOOLEAN NOT NULL DEFAULT false;

-- Create customer_payments table
CREATE TABLE customer_payments (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  sale_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  branch_id TEXT NOT NULL,
  payment_method_id TEXT NOT NULL,
  folio_id TEXT NOT NULL,
  folio_number INTEGER NOT NULL,
  folio_code TEXT NOT NULL,
  amount DECIMAL(14,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP NULL,
  cancellation_reason TEXT NULL,

  CONSTRAINT customer_payments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_payments_amount_check CHECK (amount > 0),
  CONSTRAINT customer_payments_status_check CHECK (status IN ('completed','cancelled')),
  CONSTRAINT customer_payments_sale_fk FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
  CONSTRAINT customer_payments_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT customer_payments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT customer_payments_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT customer_payments_payment_method_fk FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT customer_payments_folio_fk FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE RESTRICT
);

-- Unique constraint on (folio_id, folio_number)
CREATE UNIQUE INDEX customer_payments_folio_uq ON customer_payments(folio_id, folio_number);

-- Additional indexes
CREATE INDEX customer_payments_sale_status_idx ON customer_payments(sale_id, status);
CREATE INDEX customer_payments_customer_status_idx ON customer_payments(customer_id, status);
CREATE INDEX customer_payments_user_created_idx ON customer_payments(user_id, created_at);
CREATE INDEX customer_payments_branch_created_idx ON customer_payments(branch_id, created_at);
