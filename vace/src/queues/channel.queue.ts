enum QueueChnannels {
    UsersEmail = 'vace.users:send-email',
    UpdateRevenue = 'vace.wallet:upate-revenue',
    Settlement = 'vace.settlement:upate-data',
    TransactionSettlement = 'vace.settlement:run-transactions',
    LumpSettlement = 'vace.settlement:run-lump',
    OverdueInvoices = 'vace.invoice:upate-overdue',
    ExportTransaction = 'vace.transaction:export',
    GenerateAccount = 'vace.invoice:generate-account',
    AddBeneficiary = 'vace.wallets:add-bene',
    NewAudit = 'vace.audits:add-audit',
    AddListBank = 'vace.wallets:add-bank',
    SendWebhook = 'vace.webhook:send-notification',
    UpdateTransaction = 'terra.transaction:upate',
    StoreIdemptKey = 'vace.idempotent:add-key',
    RunScript = 'terra.script:run-scripts',
    DeleteUser = 'vace:delete-user'
}

export default QueueChnannels;