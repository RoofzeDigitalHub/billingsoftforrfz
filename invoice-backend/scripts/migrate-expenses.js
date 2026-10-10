// scripts/migrate-expenses.js
//
// Creates the expense tables in MySQL and seeds default types, categories,
// and historical transaction records.
//
// Tables:
//   expense_types      (Debit, Credit)
//   expense_categories (Expense, Salary, Loan, Income, etc., bound to type_id)
//   expenses           (date, type_id, category_id, vendor_person_name, description, amount, invoice_id)

require('dotenv').config();
const pool = require('../config/db');

const RAW_RECORDS = [
  { date: '13 Oct 2026', person: 'Office Light Bill', category: 'Expense', desc: 'Office Light Bill', type: 'Debit', amount: '2190' },
  { date: '10 Oct 2026', person: 'Gst Every 6 Month', category: 'Expense', desc: 'GST charges every 6 Month', type: 'Debit', amount: '120' },
  { date: '09 Oct 2026', person: 'Loan Repayment', category: 'Loan', desc: 'Loan repayment', type: 'Debit', amount: '12000' },
  { date: '08 Oct 2026', person: 'Ankit', category: 'Salary', desc: 'Salary', type: 'Debit', amount: '10000' },
  { date: '06 Oct 2026', person: 'Prasad sable Rent', category: 'Expense', desc: 'office rent of sep', type: 'Debit', amount: '15000' },
  { date: '04 Oct 2026', person: 'Tushar Classes', category: 'Income', desc: 'Classes portal site', type: 'Credit', amount: '25000' },
  { date: '03 Oct 2026', person: 'Aurum Voyages', category: 'Income', desc: 'August marketing pending payment', type: 'Credit', amount: '8000' },
  { date: '18 Sept 2026', person: 'Tulzcart for one month', category: 'Expense', desc: 'Tulzcart', type: 'Debit', amount: '199' },
  { date: '16 Sept 2026', person: 'Ankit', category: 'Salary', desc: 'Salary', type: 'Debit', amount: '10000' },
  { date: '10 Sept 2026', person: 'Union Bank', category: 'Loan', desc: 'Business Loan', type: 'Debit', amount: '12000' },
  { date: '09 Sept 2026', person: 'Server Renewal', category: 'Expense', desc: 'server payment', type: 'Debit', amount: '790' },
  { date: '07 Sept 2026', person: 'Prasad sable', category: 'Expense', desc: 'office rent of aug', type: 'Debit', amount: '15000' },
  { date: '04 Sept 2026', person: 'Office Light Bill', category: 'Expense', desc: 'Office Light Bill', type: 'Debit', amount: '2070' },
  { date: '29 Aug 2026', person: 'R.D. Kundalia & Co.', category: 'Income', desc: 'Website 50% Advance', type: 'Credit', amount: '8850' },
  { date: '28 Aug 2026', person: 'S-five Luxury', category: 'Income', desc: 'Website createion', type: 'Credit', amount: '8850' },
  { date: '19 Aug 2026', person: 'DUOROOTSMANYBRANCH LLP', category: 'Income', desc: 'webiste desgin 50% advance', type: 'Credit', amount: '11800' },
  { date: '15 Aug 2026', person: 'Ankit', category: 'Salary', desc: 'Salary', type: 'Debit', amount: '10000' },
  { date: '13 Aug 2026', person: 'Aurum Voyages', category: 'Income', desc: 'Digital marketing', type: 'Credit', amount: '5000' },
  { date: '11 Aug 2026', person: 'rahul shelke', category: 'Expense', desc: 'office cleaning', type: 'Debit', amount: '600' },
  { date: '10 Aug 2026', person: 'Union Bank', category: 'Loan', desc: 'Business Loan', type: 'Debit', amount: '12000' },
  { date: '10 Aug 2026', person: 'Root and style salon', category: 'Income', desc: 'Digital marketing', type: 'Credit', amount: '7000' },
  { date: '09 Aug 2026', person: 'Server Renewal', category: 'Expense', desc: 'Server Renewal', type: 'Debit', amount: '790' },
  { date: '08 Aug 2026', person: 'Prasad sable', category: 'Expense', desc: 'office rent of july', type: 'Debit', amount: '15000' },
  { date: '06 Aug 2026', person: 'Office Light Bill', category: 'Expense', desc: 'Office Light Bill', type: 'Debit', amount: '2140' },
  { date: '30 Jul 2026', person: 'Aurum website', category: 'Income', desc: 'website creation', type: 'Credit', amount: '5000' },
  { date: '15 Jul 2026', person: 'Aurum Voyages', category: 'Income', desc: 'Monthly Hlaf Marketing', type: 'Credit', amount: '3000' },
  { date: '13 Jul 2026', person: 'Tripod and 1 mic', category: 'Expense', desc: 'Purchase of Tripod and 1 mic for video creation', type: 'Debit', amount: '2303' },
  { date: '05 Jul 2026', person: 'Prasad sable', category: 'Expense', desc: 'office rent', type: 'Debit', amount: '15000' },
  { date: '03 Jul 2026', person: 'Root and style salon', category: 'Income', desc: 'digital marketing', type: 'Credit', amount: '3500' },
  { date: '03 Jul 2026', person: 'rahul shelke', category: 'Salary', desc: 'office cleaning', type: 'Debit', amount: '600' },
  { date: '01 Jul 2026', person: 'ankit yadav', category: 'Salary', desc: 'Intern Salary', type: 'Debit', amount: '5000' },
  { date: '01 Jul 2026', person: 'Prathibh Churasiya', category: 'Salary', desc: 'Intern salary', type: 'Debit', amount: '6000' },
  { date: '20 Jun 2026', person: 'roofze', category: 'Expense', desc: 'office desktop setup', type: 'Debit', amount: '13107' },
  { date: '18 Jun 2026', person: 'Aurum Voyages', category: 'Income', desc: 'Website and marketing', type: 'Credit', amount: '5000' },
  { date: '10 Jun 2026', person: 'The Sweet Nation Final for shopify', category: 'Income', desc: 'complete payment', type: 'Credit', amount: '13500' },
  { date: '10 Jun 2026', person: 'office number recharge', category: 'Expense', desc: 'recharge', type: 'Debit', amount: '548' },
  { date: '09 Jun 2026', person: 'Aurum Voyages', category: 'Income', desc: 'Social Media Advance', type: 'Credit', amount: '5000' },
  { date: '03 Jun 2026', person: 'Aurum Voyages', category: 'Income', desc: 'Website Advance 45%', type: 'Credit', amount: '5000' },
  { date: '01 Jun 2026', person: 'ankit yadav', category: 'Salary', desc: 'developer salary', type: 'Debit', amount: '5000' },
  { date: '01 Jun 2026', person: 'Prasad sable', category: 'Expense', desc: 'office rent', type: 'Debit', amount: '15000' },
  { date: '01 Jun 2026', person: 'Prathibh Churasiya', category: 'Salary', desc: 'developer salary', type: 'Debit', amount: '6000' },
  { date: '01 Jun 2026', person: 'rahul shelke', category: 'Salary', desc: 'office cleaning', type: 'Debit', amount: '1000' },
  { date: '15 May 2026', person: 'MyMahram', category: 'Income', desc: 'digital marketing', type: 'Credit', amount: '7000' },
  { date: '13 May 2026', person: 'vivek', category: 'Expense', desc: 'vivek 25% payment of BMA RTI application', type: 'Debit', amount: '10500' },
  { date: '13 May 2026', person: 'BMA RTI application', category: 'Income', desc: '2nd installation', type: 'Credit', amount: '33040' },
  { date: '07 May 2026', person: 'Office Rent', category: 'Expense', desc: 'Office Rent', type: 'Debit', amount: '15000' },
  { date: '07 May 2026', person: 'Light Bill', category: 'Expense', desc: 'Light Bill', type: 'Debit', amount: '3500' },
  { date: '04 May 2026', person: 'kiran gaikwad', category: 'Expense', desc: 'Roofze.in Domain renewal', type: 'Debit', amount: '950' },
  { date: '01 May 2026', person: 'Prathibh Churasiya', category: 'Salary', desc: 'Jr developer 41-days salary', type: 'Debit', amount: '8200' },
  { date: '01 May 2026', person: 'ankit yadav', category: 'Salary', desc: 'Jr developer', type: 'Debit', amount: '5000' },
  { date: '01 May 2026', person: 'Sarvesh Goyal', category: 'Salary', desc: 'Business Development 13 day salary', type: 'Debit', amount: '4335' },
  { date: '30 Apr 2026', person: 'kiran gaikwad', category: 'Expense', desc: 'roofze.com domain renewal', type: 'Debit', amount: '1550' },
  { date: '07 Apr 2026', person: 'Light Bill', category: 'Expense', desc: 'Light Bill', type: 'Debit', amount: '2600' },
  { date: '07 Apr 2026', person: 'Cleaning', category: 'Expense', desc: 'Cleaning', type: 'Debit', amount: '1000' },
  { date: '07 Apr 2026', person: 'Just Dail', category: 'Expense', desc: 'Just Dail', type: 'Debit', amount: '3304' },
  { date: '07 Apr 2026', person: 'OZA Brokrage 3rd', category: 'Expense', desc: 'OZA Brokrage 3rd', type: 'Debit', amount: '15000' },
  { date: '07 Apr 2026', person: 'Server', category: 'Expense', desc: 'Server', type: 'Debit', amount: '780' },
  { date: '01 Apr 2026', person: 'ankit yadav', category: 'Salary', desc: 'Development Intern Salary', type: 'Debit', amount: '2000' },
  { date: '01 Apr 2026', person: 'Sarvesh Goyal', category: 'Salary', desc: 'Business Development Salary', type: 'Debit', amount: '10000' },
  { date: '01 Apr 2026', person: 'Prasad sable', category: 'Expense', desc: 'roofze office rent', type: 'Debit', amount: '15000' },
  { date: '31 Mar 2026', person: 'vijay', category: 'Expense', desc: 'water bottle', type: 'Debit', amount: '40' },
  { date: '23 Mar 2026', person: 'Vivek - Work', category: 'Expense', desc: 'Advance for BMA RTI application', type: 'Debit', amount: '18000' },
  { date: '22 Mar 2026', person: 'Water Bottle', category: 'Expense', desc: 'water bottle', type: 'Debit', amount: '120' },
  { date: '19 Mar 2026', person: 'AC Installation', category: 'Expense', desc: 'Full setup', type: 'Debit', amount: '4348' },
  { date: '19 Mar 2026', person: 'Stationary', category: 'Expense', desc: 'Office white Board', type: 'Debit', amount: '1200' },
  { date: '19 Mar 2026', person: 'Stair', category: 'Expense', desc: 'per day', type: 'Debit', amount: '100' },
  { date: '19 Mar 2026', person: 'Stationary', category: 'Expense', desc: 'Battery', type: 'Debit', amount: '110' },
  { date: '18 Mar 2026', person: 'Roofze - ads', category: 'Expense', desc: 'Meta ads', type: 'Debit', amount: '4000' },
  { date: '17 Mar 2026', person: 'Shukat - BMA RTI New', category: 'Income', desc: 'React native application 1st installation', type: 'Credit', amount: '56640' },
  { date: '16 Mar 2026', person: 'The Sweet Nation -Website', category: 'Income', desc: 'Shopify Ecom Website 50% - 1st installaiton', type: 'Credit', amount: '13500' },
  { date: '10 Mar 2026', person: 'VI recharge - 3month', category: 'Expense', desc: '3 month of recharge', type: 'Debit', amount: '859' },
  { date: '10 Mar 2026', person: 'OZA -Brokrage', category: 'Expense', desc: 'New office 2nd Brokrage', type: 'Debit', amount: '15000' },
  { date: '10 Mar 2026', person: 'Wiring', category: 'Expense', desc: 'AC & Earthing', type: 'Debit', amount: '500' },
  { date: '09 Mar 2026', person: 'Pooja saman', category: 'Expense', desc: 'All small things for pooja', type: 'Debit', amount: '3000' },
  { date: '07 Mar 2026', person: 'Cleaning', category: 'Expense', desc: 'Cleaning', type: 'Debit', amount: '1000' },
  { date: '01 Mar 2026', person: 'Ankit', category: 'Salary', desc: 'Internship development', type: 'Debit', amount: '2000' },
  { date: '01 Mar 2026', person: 'Sarvesh', category: 'Salary', desc: 'Business Development', type: 'Debit', amount: '10000' },
  { date: '01 Mar 2026', person: 'Prasad - Office Rent', category: 'Expense', desc: 'New office Rent', type: 'Debit', amount: '15000' },
  { date: '22 Feb 2026', person: 'Oza - Brokrage', category: 'Expense', desc: 'New office brokrage', type: 'Debit', amount: '15000' },
  { date: '22 Feb 2026', person: 'Prasad - (Office Deposit)', category: 'Expense', desc: 'New office Deposit', type: 'Debit', amount: '50000' },
  { date: '21 Feb 2026', person: 'Table & chair', category: 'Expense', desc: 'Purchase for office', type: 'Debit', amount: '19000' },
  { date: '18 Feb 2026', person: 'VI Recharge', category: 'Expense', desc: 'Office number recharge', type: 'Debit', amount: '199' },
  { date: '17 Feb 2026', person: 'GNDAMRC - website', category: 'Income', desc: 'Dec Remaning Payment', type: 'Credit', amount: '500' },
  { date: '14 Feb 2026', person: 'Planet G - website', category: 'Income', desc: '1st installtion of Website creation', type: 'Credit', amount: '5000' },
  { date: '11 Feb 2026', person: 'Spark Travels - SSM', category: 'Income', desc: 'Digital Marketing', type: 'Credit', amount: '5000' },
  { date: '10 Feb 2026', person: 'Roofze -ads', category: 'Expense', desc: 'Meta ads For office', type: 'Debit', amount: '4600' },
  { date: '10 Feb 2026', person: 'Bhavin Patel (Housing PLatform)', category: 'Income', desc: '2nd installation of Web application', type: 'Credit', amount: '50000' },
  { date: '10 Feb 2026', person: 'JustDial', category: 'Expense', desc: 'Subscription For Leads', type: 'Debit', amount: '3304' },
  { date: '10 Feb 2026', person: 'Hindustan Containers', category: 'Income', desc: 'Website Remaing payment', type: 'Credit', amount: '2000' },
  { date: '07 Feb 2026', person: 'Bank Verification', category: 'Expense', desc: 'Bank Verification', type: 'Debit', amount: '3000' },
  { date: '07 Feb 2026', person: 'Wifi router', category: 'Expense', desc: 'Wifi router', type: 'Debit', amount: '2800' },
  { date: '07 Feb 2026', person: 'agreement of shop', category: 'Expense', desc: 'agreement of shop', type: 'Debit', amount: '2500' },
  { date: '07 Feb 2026', person: 'Bank loan Document', category: 'Expense', desc: 'Bank loan Document', type: 'Debit', amount: '5000' },
  { date: '07 Feb 2026', person: 'Bank Deposit', category: 'Expense', desc: 'Bank Deposit', type: 'Debit', amount: '50000' },
  { date: '07 Feb 2026', person: 'Wifi Recharge 1 year', category: 'Expense', desc: 'Wifi Recharge 1 year', type: 'Debit', amount: '7200' },
  { date: '05 Feb 2026', person: 'Internet and Light Bill', category: 'Expense', desc: 'Office internet and lightbill', type: 'Debit', amount: '2000' },
  { date: '01 Feb 2026', person: 'Ankit', category: 'Salary', desc: 'Intership in Development', type: 'Debit', amount: '2000' },
  { date: '01 Feb 2026', person: 'Sarvesh', category: 'Salary', desc: 'Business Development', type: 'Debit', amount: '10000' },
  { date: '25 Jan 2026', person: 'Moss & Flame (website)', category: 'Income', desc: 'Shopify website 1st installation', type: 'Credit', amount: '3000' },
  { date: '25 Jan 2026', person: 'Roofze Ads', category: 'Expense', desc: 'Meta Ads for Leads', type: 'Debit', amount: '2038' },
  { date: '19 Jan 2026', person: 'Aakash (Profile Creation)', category: 'Income', desc: 'Broucher Desgining', type: 'Credit', amount: '2360' },
  { date: '13 Jan 2026', person: 'Ashwin (GoKailasha)', category: 'Income', desc: 'Digital Marketing charges', type: 'Credit', amount: '8000' },
  { date: '13 Jan 2026', person: 'VI recharge', category: 'Expense', desc: 'office number recharge', type: 'Debit', amount: '199' },
  { date: '12 Jan 2026', person: 'JustDial', category: 'Expense', desc: 'Subscription for Leads', type: 'Debit', amount: '3304' },
  { date: '12 Jan 2026', person: 'Bhavin Patel (Housing)', category: 'Income', desc: '1 st installation of housing', type: 'Credit', amount: '40000' },
  { date: '12 Jan 2026', person: 'Ashwin (Gokailasha) - ads', category: 'Expense', desc: 'Ads spend', type: 'Debit', amount: '4600' },
  { date: '09 Jan 2026', person: 'GNDAMRC (Hindustan Container)', category: 'Income', desc: 'Hindustan Container website', type: 'Credit', amount: '7000' },
  { date: '09 Jan 2026', person: 'Office Internet & Light Bill', category: 'Expense', desc: 'Light and ellectricity Bill', type: 'Debit', amount: '2000' },
  { date: '05 Jan 2026', person: 'Video Editing', category: 'Expense', desc: 'Gokailasha video creation', type: 'Debit', amount: '500' },
  { date: '05 Jan 2026', person: 'OZA - rent', category: 'Expense', desc: 'Office Rent', type: 'Debit', amount: '8000' },
  { date: '03 Jan 2026', person: 'OZA (rent)', category: 'Expense', desc: 'Office Rent', type: 'Debit', amount: '8000' },
  { date: '01 Jan 2026', person: 'Sarvesh', category: 'Salary', desc: 'Business Development', type: 'Debit', amount: '10000' },
];

const monthMap = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

function parseDateToIso(str) {
  if (!str) return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const mStr = parts[1].toLowerCase().replace('.', '');
    const month = monthMap[mStr];
    const year = parts[2];
    if (month && year && day) {
      return `${year}-${month}-${day}`;
    }
  }
  return str;
}

async function ensureExpenseTables(options = {}) {
  const log = options.log || console.log;

  // 1. expense_types
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_types (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. expense_categories
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type_id INT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_exp_cat_type FOREIGN KEY (type_id) REFERENCES expense_types(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. expenses table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      expense_date DATE NOT NULL,
      type_id INT UNSIGNED NOT NULL,
      category_id INT UNSIGNED NOT NULL,
      vendor_person_name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      amount DECIMAL(14, 2) NOT NULL,
      invoice_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_expenses_date (expense_date),
      KEY idx_expenses_type (type_id),
      KEY idx_expenses_category (category_id),
      KEY idx_expenses_invoice (invoice_id),
      CONSTRAINT fk_exp_type FOREIGN KEY (type_id) REFERENCES expense_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_exp_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_exp_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default Types: Debit & Credit
  await pool.query(`
    INSERT INTO expense_types (name)
    VALUES ('Debit'), ('Credit')
    ON DUPLICATE KEY UPDATE name = name;
  `);

  const [typeRows] = await pool.query('SELECT id, name FROM expense_types');
  const typeMap = {};
  typeRows.forEach((r) => {
    typeMap[r.name.toLowerCase()] = r.id;
  });

  // Seed default Categories: Expense, Salary, Loan, Income
  const defaultCats = [
    { name: 'Expense', typeId: typeMap['debit'] },
    { name: 'Salary', typeId: typeMap['debit'] },
    { name: 'Loan', typeId: typeMap['debit'] },
    { name: 'Income', typeId: typeMap['credit'] },
  ];

  for (const cat of defaultCats) {
    const [existing] = await pool.query('SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?)', [cat.name]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO expense_categories (name, type_id) VALUES (?, ?)', [cat.name, cat.typeId]);
    } else {
      await pool.query('UPDATE expense_categories SET type_id = ? WHERE id = ?', [cat.typeId, existing[0].id]);
    }
  }

  const [catRows] = await pool.query('SELECT id, name FROM expense_categories');
  const catMap = {};
  catRows.forEach((r) => {
    catMap[r.name.toLowerCase()] = r.id;
  });

  // Check if historical expenses exist, otherwise seed them
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM expenses');
  if (count === 0) {
    log('🌱 Seeding historical expense and income records...');
    for (const rec of RAW_RECORDS) {
      const typeId = typeMap[rec.type.toLowerCase()];
      const catId = catMap[rec.category.toLowerCase()];
      const dateIso = parseDateToIso(rec.date);
      const amountVal = parseFloat(rec.amount);

      if (typeId && catId && dateIso) {
        await pool.query(
          `INSERT INTO expenses (expense_date, type_id, category_id, vendor_person_name, description, amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dateIso, typeId, catId, rec.person, rec.desc === '—' ? null : rec.desc, amountVal]
        );
      }
    }
    log(`✅ Seeded ${RAW_RECORDS.length} historical records into expenses table.`);
  }

  return { success: true };
}

if (require.main === module) {
  ensureExpenseTables({ log: console.log })
    .then(() => {
      console.log('✅ Expense tables migration complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { ensureExpenseTables, parseDateToIso };
