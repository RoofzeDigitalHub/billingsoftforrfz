const pool = require('../config/db');

function makeClientCode(name) {
  const letters = (name || 'CLT').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'C');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${letters}${rand}`;
}

async function seed() {
  console.log('--- Starting Seed for Invoices 2 to 6 & Clients ---');
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const clientsData = [
      {
        business_name: 'JASANI INDIA PVT LTD',
        contact_person: 'Jasani India',
        phone: '9167700605',
        email: 'info@jasaniindia.com',
        billing_address: '2A, 2nd Floor, Navneet Education Ltd., MIDC, Road No. 8, Marol Andheri East, Mumbai - 400093. State Code: 27, State Maharashtra India',
        city: 'Mumbai',
        state_id: 27,
        state_name: 'Maharashtra',
        state_code: '27',
        pincode: '400093',
        country: 'India',
        pan: 'AAACU0081C',
        gstin: '27AAACU0081C1ZT',
        client_type: 'Business',
        is_active: 1,
      },
      {
        business_name: 'CFF FLUID CONTROL LIMITED',
        contact_person: 'CFF Fluid Control',
        phone: '9167700605',
        email: 'info@cfffluidcontrol.com',
        billing_address: 'Plot No. PAP-B-116/1, Chakan MIDC Phase II, Bhamholi Tal. Khed, Dist. Pune - 410501',
        city: 'Pune',
        state_id: 27,
        state_name: 'Maharashtra',
        state_code: '27',
        pincode: '410501',
        country: 'India',
        pan: 'AAFCC3630A',
        gstin: '27AAFCC3630A1Z9',
        client_type: 'Business',
        is_active: 1,
      },
      {
        business_name: 'S-five Luxury',
        contact_person: 'SWAPNIL SITARAM UFALE',
        phone: '7208465016',
        email: 'swapnilufale@gmail.com',
        billing_address: 'Mumbai, Maharashtra',
        city: 'Mumbai',
        state_id: 27,
        state_name: 'Maharashtra',
        state_code: '27',
        pincode: '400001',
        country: 'India',
        pan: 'AEZPU8067N',
        gstin: '27AEZPU8067N1Z0',
        client_type: 'Business',
        is_active: 1,
      },
      {
        business_name: 'DUOROOTSMANYBRANCH LLP',
        contact_person: 'Saurabh',
        phone: '9167700605',
        email: 'duoroots@gmail.com',
        billing_address: 'Mumbai, Maharashtra',
        city: 'Mumbai',
        state_id: 27,
        state_name: 'Maharashtra',
        state_code: '27',
        pincode: '400001',
        country: 'India',
        pan: 'AAZFD6972H',
        gstin: '27AAZFD6972H1ZL',
        client_type: 'Business',
        is_active: 1,
      },
      {
        business_name: 'R.D. Kundalia & Co.',
        contact_person: 'Rashmikant D. Kundalia',
        phone: '9323588800',
        email: 'rdkundalia@gmail.com',
        billing_address: 'Mumbai, Maharashtra',
        city: 'Mumbai',
        state_id: 27,
        state_name: 'Maharashtra',
        state_code: '27',
        pincode: '400001',
        country: 'India',
        pan: 'AACPK8992R',
        gstin: '27AACPK8992R1ZN',
        client_type: 'Business',
        is_active: 1,
      },
    ];

    const clientMap = {};

    for (const c of clientsData) {
      const [existing] = await conn.query('SELECT id FROM clients WHERE gstin = ? OR business_name = ?', [c.gstin, c.business_name]);
      if (existing.length > 0) {
        clientMap[c.business_name] = existing[0].id;
        console.log(`Client already exists: ${c.business_name} (ID: ${existing[0].id})`);
      } else {
        const code = makeClientCode(c.business_name);
        const [res] = await conn.query(
          `INSERT INTO clients
            (client_code, business_name, contact_person, phone, email, billing_address, city, state_id, state_name, state_code, pincode, country, pan, gstin, client_type, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            code, c.business_name, c.contact_person, c.phone, c.email, c.billing_address, c.city,
            c.state_id, c.state_name, c.state_code, c.pincode, c.country, c.pan, c.gstin, c.client_type, c.is_active
          ]
        );
        clientMap[c.business_name] = res.insertId;
        console.log(`Created client: ${c.business_name} (ID: ${res.insertId}, Code: ${code})`);
      }
    }

    const invoicesData = [
      {
        invoice_number: 'RFZ/2627/0002',
        sequence_number: 2,
        financial_year: '2627',
        invoice_date: '2026-06-12',
        invoice_type: 'DIRECT',
        client_name: 'JASANI INDIA PVT LTD',
        client_contact: 'Jasani India',
        client_address: '2A, 2nd Floor, Navneet Education Ltd., MIDC, Road No. 8, Marol Andheri East, Mumbai - 400093. State Code: 27, State Maharashtra India',
        client_state: 'Maharashtra',
        client_pan: 'AAACU0081C',
        client_gst_number: '27AAACU0081C1ZT',
        gross_amount: 54576.00,
        subtotal_amount: 54576.00,
        gst_percentage: 18,
        gst_amount: 9824.00,
        total_amount: 64400.00,
        payment_status: 'PAID',
        payment_mode: 'Bank Transfer',
        payment_reference: 'Bank Transfer - Jasani India',
        payment_date: '2026-06-12',
        amount_paid: 64400.00,
        terms: 'Thank you. Your payment has been received.',
        items: [
          {
            line_no: 1,
            service_description: 'Final Pending Amount (Software Working)',
            qty: 1,
            total_price: 54576.00,
            price_percentage: 100,
            tax_rate: 18,
            taxable_amount: 54576.00,
            tax_amount: 9824.00,
            line_total: 64400.00,
            milestones: []
          }
        ]
      },
      {
        invoice_number: 'RFZ/2627/0003',
        sequence_number: 3,
        financial_year: '2627',
        invoice_date: '2026-08-13',
        invoice_type: 'DIRECT',
        client_name: 'CFF FLUID CONTROL LIMITED',
        client_contact: 'CFF Fluid Control',
        client_address: 'Plot No. PAP-B-116/1, Chakan MIDC Phase II, Bhamholi Tal. Khed, Dist. Pune - 410501',
        client_state: 'Maharashtra',
        client_pan: 'AAFCC3630A',
        client_gst_number: '27AAFCC3630A1Z9',
        gross_amount: 975390.00,
        subtotal_amount: 975390.00,
        gst_percentage: 18,
        gst_amount: 175570.20,
        total_amount: 1150960.00,
        payment_status: 'PAID',
        payment_mode: 'Bank Transfer',
        payment_reference: 'N/AXSK262250016825/UTIB0000246/CFF FLUID CONTROL L.',
        payment_date: '2026-08-13',
        amount_paid: 1150960.00,
        terms: 'Thank you. Your payment has been received by bank transfer.',
        items: [
          {
            line_no: 1,
            service_description: 'IT Consulting & IT Support Services',
            qty: 1,
            total_price: 975390.00,
            price_percentage: 100,
            tax_rate: 18,
            taxable_amount: 975390.00,
            tax_amount: 175570.20,
            line_total: 1150960.00,
            milestones: []
          }
        ]
      },
      {
        invoice_number: 'RFZ/2627/0004',
        sequence_number: 4,
        financial_year: '2627',
        invoice_date: '2026-08-12',
        invoice_type: 'MILESTONE',
        client_name: 'S-five Luxury',
        client_contact: 'SWAPNIL SITARAM UFALE : 7208465016',
        client_address: 'Mumbai, Maharashtra',
        client_state: 'Maharashtra',
        client_pan: 'AEZPU8067N',
        client_gst_number: '27AEZPU8067N1Z0',
        gross_amount: 15000.00,
        subtotal_amount: 7500.00,
        gst_percentage: 18,
        gst_amount: 1350.00,
        total_amount: 8850.00,
        payment_status: 'PAID',
        payment_mode: 'Google Pay',
        payment_reference: 'Google Pay - Swapnil Ufale',
        payment_date: '2026-08-12',
        amount_paid: 8850.00,
        terms: 'Thank you. Your payment has been received by Google Pay.',
        items: [
          {
            line_no: 1,
            service_description: 'Advance Payment (50%) for Website Design & Development – Wix',
            qty: 1,
            total_price: 15000.00,
            price_percentage: 50,
            tax_rate: 18,
            taxable_amount: 7500.00,
            tax_amount: 1350.00,
            line_total: 8850.00,
            milestones: [
              { milestone_no: 1, label: 'Milestone 1', percent: 50, amount: 7500.00, is_billed: 1, already_billed: 0 },
              { milestone_no: 2, label: 'Milestone 2', percent: 50, amount: 7500.00, is_billed: 0, already_billed: 0 }
            ]
          }
        ]
      },
      {
        invoice_number: 'RFZ/2627/0005',
        sequence_number: 5,
        financial_year: '2627',
        invoice_date: '2026-08-14',
        invoice_type: 'MILESTONE',
        client_name: 'DUOROOTSMANYBRANCH LLP',
        client_contact: 'Saurabh',
        client_address: 'Mumbai, Maharashtra',
        client_state: 'Maharashtra',
        client_pan: 'AAZFD6972H',
        client_gst_number: '27AAZFD6972H1ZL',
        gross_amount: 20000.00,
        subtotal_amount: 10000.00,
        gst_percentage: 18,
        gst_amount: 1800.00,
        total_amount: 11800.00,
        payment_status: 'PAID',
        payment_mode: 'Google Pay',
        payment_reference: '659706726127',
        payment_date: '2026-08-14',
        amount_paid: 11800.00,
        terms: 'Thank you. Your payment has been received by Google Pay.',
        items: [
          {
            line_no: 1,
            service_description: 'Advance Payment (50%) for Website Design & Development',
            qty: 1,
            total_price: 20000.00,
            price_percentage: 50,
            tax_rate: 18,
            taxable_amount: 10000.00,
            tax_amount: 1800.00,
            line_total: 11800.00,
            milestones: [
              { milestone_no: 1, label: 'Milestone 1', percent: 50, amount: 10000.00, is_billed: 1, already_billed: 0 },
              { milestone_no: 2, label: 'Milestone 2', percent: 50, amount: 10000.00, is_billed: 0, already_billed: 0 }
            ]
          }
        ]
      },
      {
        invoice_number: 'RFZ/2627/0006',
        sequence_number: 6,
        financial_year: '2627',
        invoice_date: '2026-08-16',
        invoice_type: 'MILESTONE',
        client_name: 'R.D. Kundalia & Co.',
        client_contact: 'Rashmikant D. Kundalia : 9323588800',
        client_address: 'Mumbai, Maharashtra',
        client_state: 'Maharashtra',
        client_pan: 'AACPK8992R',
        client_gst_number: '27AACPK8992R1ZN',
        gross_amount: 15000.00,
        subtotal_amount: 7500.00,
        gst_percentage: 18,
        gst_amount: 1350.00,
        total_amount: 8850.00,
        payment_status: 'PAID',
        payment_mode: 'Google Pay',
        payment_reference: '623712418929',
        payment_date: '2026-08-16',
        amount_paid: 8850.00,
        terms: 'Thank you. Your payment has been received by Google Pay.',
        items: [
          {
            line_no: 1,
            service_description: 'Advance Payment (50%) for Website Design & Development',
            qty: 1,
            total_price: 15000.00,
            price_percentage: 50,
            tax_rate: 18,
            taxable_amount: 7500.00,
            tax_amount: 1350.00,
            line_total: 8850.00,
            milestones: [
              { milestone_no: 1, label: 'Milestone 1', percent: 50, amount: 7500.00, is_billed: 1, already_billed: 0 },
              { milestone_no: 2, label: 'Milestone 2', percent: 50, amount: 7500.00, is_billed: 0, already_billed: 0 }
            ]
          }
        ]
      }
    ];

    for (const inv of invoicesData) {
      // Check if invoice already exists
      const [ex] = await conn.query('SELECT id FROM invoices WHERE invoice_number = ?', [inv.invoice_number]);
      if (ex.length > 0) {
        console.log(`Invoice ${inv.invoice_number} already exists with ID ${ex[0].id}`);
        continue;
      }

      const clientId = clientMap[inv.client_name] || null;

      const [invRes] = await conn.query(
        `INSERT INTO invoices
          (invoice_number, billing_location_id, financial_year, sequence_number, invoice_date, invoice_type,
           client_id, client_name, client_contact, client_address, client_state, client_pan, client_gst_number,
           gross_amount, subtotal_amount, gst_percentage, gst_amount, total_amount,
           payment_status, paid_at, payment_mode, payment_reference, payment_date, amount_paid,
           terms, show_bank_details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.invoice_number, 1, inv.financial_year, inv.sequence_number, inv.invoice_date, inv.invoice_type,
          clientId, inv.client_name, inv.client_contact, inv.client_address, inv.client_state, inv.client_pan, inv.client_gst_number,
          inv.gross_amount, inv.subtotal_amount, inv.gst_percentage, inv.gst_amount, inv.total_amount,
          inv.payment_status, new Date(inv.payment_date), inv.payment_mode, inv.payment_reference, inv.payment_date, inv.amount_paid,
          inv.terms, 1
        ]
      );

      const invoiceId = invRes.insertId;
      console.log(`Inserted invoice ${inv.invoice_number} (ID: ${invoiceId})`);

      for (const item of inv.items) {
        const [itemRes] = await conn.query(
          `INSERT INTO invoice_items
            (invoice_id, line_no, service_description, qty, total_price, price_percentage,
             tax_rate, taxable_amount, tax_amount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId, item.line_no, item.service_description, item.qty, item.total_price, item.price_percentage,
            item.tax_rate, item.taxable_amount, item.tax_amount, item.line_total
          ]
        );

        const itemId = itemRes.insertId;

        for (const m of item.milestones) {
          await conn.query(
            `INSERT INTO invoice_item_milestones
              (invoice_item_id, milestone_no, label, percent, amount, is_billed, already_billed)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId, m.milestone_no, m.label, m.percent, m.amount, m.is_billed, m.already_billed
            ]
          );
        }
      }
    }

    // Update sequence counter in invoice_sequences for location 1 and FY 2627
    await conn.query(
      `INSERT INTO invoice_sequences (billing_location_id, financial_year, last_sequence)
       VALUES (1, '2627', 6)
       ON DUPLICATE KEY UPDATE last_sequence = GREATEST(last_sequence, 6)`
    );
    console.log('Updated invoice_sequences to last_sequence: 6');

    await conn.commit();
    console.log('--- Successfully seeded Invoices 2 to 6 & Clients ---');
    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error('Seed Error:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

seed();
