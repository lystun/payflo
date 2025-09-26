import { dateToday, formatISO } from "@btffamily/vacepay"
import Invoice from "../../models/Invoice.model"
import { TransactionStatus } from "../../utils/enums.util"
import { IInvoiceDoc, IJobData } from "../../utils/types.util"
import BullQueue from "../bull.queue"
import QueueChnannels from "../channel.queue"

const updateOverdueInvoice = async (invoice: IInvoiceDoc): Promise<void> => {

    if(invoice.status === TransactionStatus.PENDING){

        const convDate = dateToday(Date.now());
        const today = formatISO(convDate.ISO);
        const dueAt = invoice.dueAt;

        const todayDatetime = convDate.dateTime;
        const dueDatetime = dateToday(dueAt.ISO).dateTime;

        if(today.date >= dueAt.date && today.time >= dueAt.time){

            invoice.status = TransactionStatus.OVERDUE;
            await invoice.save();

            //TODO: send invoice overdue email

        }

    }

}

const updateOverdueList = async (): Promise<void> => {

    const invoices = await Invoice.find({ status: TransactionStatus.PENDING });

    if(invoices.length > 0){

        for(let i = 0; i < invoices.length; i++){

            let invoice = invoices[i];
            await updateOverdueInvoice(invoice);

        }

    }

}

export const processUpdateOverdueJob = async(): Promise<void> => {

    const updateQueue = new BullQueue(QueueChnannels.OverdueInvoices);
    const job: IJobData = {
        data: { status: TransactionStatus.PENDING },
        delay: 100,
        name: 'Update-Invoices'
    }

    updateQueue.addToQueue([job]);
    updateQueue.processJobs(updateOverdueList);

}