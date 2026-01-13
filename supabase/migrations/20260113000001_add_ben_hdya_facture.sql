-- Add BL26-00099 for Ahmed Ben Hdya
DO $$
DECLARE
    exp_id uuid;
BEGIN
    -- Insert the header record for Ahmed Ben Hdya (id 'ahmed')
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES ('ahmed', '10/01/2026', 'BL26-00099', '50 pcs', 36.998, 'paid')
    RETURNING id INTO exp_id;

    -- Insert the line item for Brique de 8
    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES (exp_id, 'BRIQUE8', 'BRIQUE DE 8', 'PCE', 50, 0.720, 35.998);

    -- The difference of 1.000 (36.998 - 35.998) is for the Droit de Timbre, 
    -- following the established pattern for this supplier where the timbre is included in the header price.
END $$;
