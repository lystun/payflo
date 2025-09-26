enum QueueChnannels {
    UsersEmail = 'users:send-email',
    Announcement = 'vacepay:announcement:send-bulk',
    Audit = 'vacepay:create-audit',
    UploadQueue = 'vacepay:upload-queue',
    Device = 'vacepay:update-devices',
    LegalPhoto = 'vacepay:upload-legal-photo',
    DeleteUser = 'vacepay:delete-user',
}

export default QueueChnannels;