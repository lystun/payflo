import { Random } from '@btffamily/vacepay'
import { sendGrid } from '../../utils/email.util'
import { IJobData, IKYBDoc, IKycDoc } from '../../utils/types.util'
import BullQueue from '../bull.queue'
import QueueChnannels from '../channel.queue'
import Kyc from '../../models/Kyc.model'
import StorageService from '../../services/storage.service'
import { UploadIDDTO } from '../../dtos/compliance.dto'
import User from '../../models/User.model'
import Kyb from '../../models/Kyb.model'

export const uploadUtilityDocJob = (kyc: IKycDoc, doc: string) => {

    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: { kycId: kyc._id, doc: doc },
        delay: 100,
        name: 'upload-utility-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kycId, doc } = data;

        const kyc = await Kyc.findOne({ _id: kycId });

        if (kyc) {

            const filename = `utilitydoc-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(doc, filename, 'base64');

            if (!upload.error) {

                kyc.utilityDoc = upload.data.publicUrl;
                await kyc.save();

            }

        }

    })

}

export const uploadIDImageJob = (data: UploadIDDTO) => {

    const { front, kyc, type, user, back } = data;
    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: {
            kycId: kyc._id,
            userId: user._id,
            front: front,
            back: back,
            type: type
        },
        delay: 100,
        name: 'upload-id-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kycId, front, back, userId, type } = data;

        const kyc = await Kyc.findOne({ _id: kycId });
        const user = await User.findOne({ _id: userId });

        if (kyc && user) {

            const filename = `${type}-front-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(front, filename, 'base64');

            if (!upload.error) {
                kyc.idType = type;
                kyc.idData.front = upload.data.publicUrl;
                await kyc.save();
            }

            if (back) {

                const filename = `${type}-back-${Random.randomCode(6, false)}`;
                const upload = await StorageService.uploadGcpFile(back, filename, 'base64');

                if (!upload.error) {
                    kyc.idType = type;
                    kyc.idData.back = upload.data.publicUrl;
                    await kyc.save();
                }

            }

        }

    })

}

export const uploadFaceIDJob = (kyc: IKycDoc, image: string) => {

    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: { kycId: kyc._id, image: image },
        delay: 100,
        name: 'upload-face-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kycId, image } = data;

        const kyc = await Kyc.findOne({ _id: kycId });

        if (kyc) {

            const filename = `faceid-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(image, filename, 'base64');

            if (!upload.error) {

                kyc.faceId = upload.data.publicUrl;
                await kyc.save();

            }

        }

    })

}

export const uploadCertificateJob = (kyb: IKYBDoc, doc: string) => {

    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: { kybId: kyb._id, doc: doc },
        delay: 100,
        name: 'upload-cert-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kybId, doc } = data;

        const kyb = await Kyb.findOne({ _id: kybId });

        if (kyb) {

            const filename = `certificate-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(doc, filename, 'base64');

            if (!upload.error) {

                kyb.certificate = upload.data.publicUrl;
                await kyb.save();

            }

        }

    })

}

export const uploadKYBIDJob = (kyb: IKYBDoc, idcard: string) => {

    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: { kybId: kyb._id, idcard: idcard },
        delay: 100,
        name: 'upload-idcard-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kybId, idcard } = data;

        const kyb = await Kyb.findOne({ _id: kybId });

        if (kyb) {

            const filename = `idcard-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(idcard, filename, 'base64');

            if (!upload.error) {

                kyb.owner.idCard = upload.data.publicUrl;
                await kyb.save();

            }

        }

    })

}

export const uploadKYBUtitlityJob = (kyb: IKYBDoc, doc: string) => {

    const uploadQueue = new BullQueue(`${QueueChnannels.UploadQueue}${Random.randomAlpha(4)}`);

    const job: IJobData = {
        data: { kybId: kyb._id, doc: doc },
        delay: 100,
        name: 'upload-uitlity-job'
    }

    uploadQueue.addToQueue([job]);

    uploadQueue.processJobs(async (data) => {

        const { kybId, doc } = data;

        const kyb = await Kyb.findOne({ _id: kybId });

        if (kyb) {

            const filename = `uitlity-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(doc, filename, 'base64');

            if (!upload.error) {

                kyb.owner.utilityDoc = upload.data.publicUrl;
                await kyb.save();

            }

        }

    })

}

export const uploadKYCNINPhotoJob = async (kyc: IKycDoc, photo: string) => {

    // create queue
    const uploadQueue = new BullQueue(QueueChnannels.LegalPhoto);

    // add job to queue
    uploadQueue.addToQueue([{
        data: { kycId: kyc._id, photo: photo },
        delay: 100,
        name: 'upload-ninphoto-job'
    }]);

    // process queue
    uploadQueue.processJobs(async (data) => {

        const { kycId, photo } = data;

        const kyc = await Kyc.findOne({ _id: kycId });

        if (kyc) {

            const filename = `nin-photo-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(photo, filename, 'base64');

            if (upload.error) {
                //TODO: Logo Audit here
            }

            if (!upload.error && upload.data) {
                kyc.ninData.photo = upload.data.publicUrl;
                await kyc.save();
            }


        }


    })

}

export const uploadKYBNINPhotoJob = async (kyb: IKYBDoc, photo: string) => {

    // create queue
    const uploadQueue = new BullQueue(QueueChnannels.LegalPhoto);

    // add job to queue
    uploadQueue.addToQueue([{
        data: { kybId: kyb._id, photo: photo },
        delay: 100,
        name: 'upload-ninphoto-job'
    }]);

    // process queue
    uploadQueue.processJobs(async (data) => {

        const { kybId, photo } = data;

        const kyb = await Kyb.findOne({ _id: kybId });

        if (kyb) {

            const filename = `nin-photo-${Random.randomCode(6, false)}`;
            const upload = await StorageService.uploadGcpFile(photo, filename, 'base64');

            if (upload.error) {
                //TODO: Logo Audit here
            }

            if (!upload.error && upload.data) {
                kyb.ninData.photo = upload.data.publicUrl;
                await kyb.save();
            }


        }


    })

}


