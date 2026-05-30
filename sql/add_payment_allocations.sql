CREATE TABLE IF NOT EXISTS Payment_Allocations (
    allocation_id  INT           NOT NULL AUTO_INCREMENT,
    payment_id     INT           NOT NULL,
    expense_id     INT           NOT NULL,
    allocated_amt  DECIMAL(10,2) NOT NULL,
    CONSTRAINT pk_alloc         PRIMARY KEY (allocation_id),
    CONSTRAINT fk_alloc_payment FOREIGN KEY (payment_id)  REFERENCES Payments(payment_id)  ON DELETE CASCADE,
    CONSTRAINT fk_alloc_expense FOREIGN KEY (expense_id)  REFERENCES Expenses(expense_id)  ON DELETE CASCADE,
    CONSTRAINT uq_alloc         UNIQUE (payment_id, expense_id),
    CONSTRAINT chk_alloc_amt    CHECK (allocated_amt > 0)
);