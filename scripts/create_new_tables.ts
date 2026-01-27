import ExcelJS from 'exceljs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

async function createTable(filename: string, sheetName: string, headers: string[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  
  sheet.addRow(headers);
  
  const filePath = path.join(dataDir, filename);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Created ${filename}`);
}

async function createNewTables() {
  console.log('Creating new database tables...\n');
  
  // Notifications table
  await createTable('notifications.xlsx', 'Notifications', [
    'id', 'type', 'title', 'message', 'assetId', 'createdBy', 'createdAt', 
    'targetRole', 'targetBranch', 'isRead'
  ]);
  
  // Disposals table
  await createTable('disposals.xlsx', 'Disposals', [
    'id', 'assetId', 'initiatedBy', 'initiatedAt', 'reason', 'status', 
    'approvedBy', 'approvedAt'
  ]);
  
  // Payables table
  await createTable('payables.xlsx', 'Payables', [
    'id', 'type', 'vendorName', 'branchCode', 'agreementDate', 'renewalDate', 
    'billDate', 'amount', 'description', 'status', 'createdBy', 'createdAt'
  ]);
  
  console.log('\n✅ All tables created successfully!');
}

createNewTables().catch(console.error);
