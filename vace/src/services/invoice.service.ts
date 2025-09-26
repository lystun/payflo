import { arrayIncludes, dateToday, hasDecimal, hasSAC, isArray, isNeg, isPrecise, isZero, notDefined, Random, UIID } from '@btffamily/vacepay';
import { CalculateSummaryDTO, CalculateVATDTO, CreateInvoiceDTO, CreateInvoiceRequestDTO, FilterInvoiceDTO, InvoiceExistsDTO, InvoiceItemDTO } from '../dtos/invoice.dto';
import Invoice from '../models/Invoice.model';
import SystemService from './system.service';
import { IBusinessDoc, IInvoiceDoc, IInvoiceItem, IInvoiceRecipient, IInvoiceSummary, IInvoiceVAT, IResult, ITransactionDoc, IUserDoc } from '../utils/types.util'
import { FeatureType, PrefixType, UserType } from '../utils/enums.util';
import PaymentLinkService from './payment.link.service';

interface IOverview {
    total: number, 
    active: number, 
    inactive: number, 
    inflow: number, 
    transactions: number, 
    pending: number,
    paid: number,
    overdue: number
}

class InvoiceService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterInvoiceDTO): Array<any>{

        let result: Array<any> = [];

        if(!notDefined(data.isEnabled, true)){
            result.push({ "isEnabled": data.isEnabled })
        }

        if(!notDefined(data.business)){
            result.push({ "business": data.business })
        }

        if(!notDefined(data.status)){
            result.push({ "status": data.status })
        }

        return result;

    }

     /**
     * @name validateCreateInvoice
     * @param data 
     * @returns 
     */
     public async validateCreateInvoice(data: CreateInvoiceRequestDTO): Promise<IResult>{

        const allowedTypes = ['percentage', 'flat']
        let result: IResult = { error: false, message: '', data: null };

        const { name, items, vat, dueAt, recipient, description, number } = data; 

        if(!name){
            result.error = true;
            result.message = 'invoice name is required'
        }else if(!items){
            result.error = true;
            result.message = 'invoice items is required';
        }else if(!isArray(items)){
            result.error = true;
            result.message = 'invoice items is required to be an array';
        }else if(items.length === 0){
            result.error = true;
            result.message = 'invoice must contain at least one item';
        }else if(!description){
            result.error = true;
            result.message = `invoice description is required`;
        }else if(!dueAt){
            result.error = true;
            result.message = 'invoice due date is required';
        }else if(!recipient){
            result.error = true;
            result.message = 'invoice recipient is required';
        }else if(vat && vat.title && !vat.type){
            result.error = true;
            result.message = 'vat (tax) type is required';
        }else if(vat && vat.title && vat.type && !arrayIncludes(allowedTypes, vat.type)){
            result.error = true;
            result.message = `invalid vat (tax) type. choose from ${allowedTypes.join(', ')}`;
        }else if(vat && vat.title && (isZero(vat.value) || isNeg(vat.value))){
            result.error = true;
            result.message = 'vat (tax) value is required and cannot be zero or negative';
        }else if(vat && vat.title && vat.value && hasDecimal(vat.value) && !isPrecise({ value: vat.value, length: 2 })){
            result.error = true;
            result.message = 'vat (tax) value is required to have 2 decimals';
        }else{

            result = await this.validateRecipient(recipient);

            if(result.error){
                result = result;
            }else{
                result = await this.validateItems(items);
            }
        }

        return result;

    }

    /**
     * @name validateRecipient
     * @param data 
     * @returns 
     */
    public async validateRecipient(data: IInvoiceRecipient): Promise<IResult> {

        const allowed = ['business', 'individual']
        let result: IResult = { error: false, message: '', data: null };

        const { type, firstName, lastName, address, businessName, city, email, phoneCode, phoneNumber, state } = data; 

        if(!type){
            result.error = true;
            result.message = 'recipient type is required'
        }else if(!arrayIncludes(allowed, type)){
            result.error = true;
            result.message = `invalid recipient type. choose from ${allowed.join(', ')}`;
        }else if(!firstName){
            result.error = true;
            result.message = 'recipient first name is required'
        }else if(!lastName){
            result.error = true;
            result.message = 'recipient last name is required'
        }else if(!address){
            result.error = true;
            result.message = 'recipient address is required'
        }else if(!city){
            result.error = true;
            result.message = 'recipient city is required'
        }else if(!state){
            result.error = true;
            result.message = 'recipient state is required'
        }else if(!email){
            result.error = true;
            result.message = 'recipient email is required'
        }else if(!phoneNumber){
            result.error = true;
            result.message = 'recipient phone number is required'
        }else if(type === 'business' && !businessName){
            result.error = true;
            result.message = 'recipient business name is required'
        }else {
            result.error = false;
            result.message = ''
        }

        return result;

    }

    /**
     * @name validateRecipient
     * @param data 
     * @returns 
     */
    public async validateItems(data: Array<InvoiceItemDTO>): Promise<IResult> {

        let result: IResult = { error: false, message: '', data: null };

        for(let i = 0; i < data.length; i++){

            let item: InvoiceItemDTO = data[i];

            if(!item.name){
                result.error = true;
                result.message = `item ${i+1} name is required`;
                break;
            }else if(notDefined(item.price) || isZero(item.price)){
                result.error = true;
                result.message = `${item.name} price is required and cannot be zero`;
                break;
            }else if(notDefined(item.quantity) || isZero(item.quantity)){
                result.error = true;
                result.message = `${item.name} quantity is required and cannot be zero`;
                break;
            }else {
                result.error = false;
                result.message = ''
                continue;
            }

        }

        return result;

    }

    /**
     * @name updateInvoiceLinkUrl
     * @param invoice 
     * @param code 
     * @returns 
     */
    public async updateInvoiceLinkUrl(invoice: IInvoiceDoc, code: string): Promise<IInvoiceDoc>{

        invoice.link = `${process.env.CHECKOUT_APP_URL}/invoice/${code}`;
        await invoice.save();

        return invoice;
    }

     /**
     * @name createInvoice
     * @param data 
     * @returns 
     */
     public async createInvoice(data: CreateInvoiceDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { name, items, vat, dueAt, number, recipient, business, description, partial, isLink } = data;  

        const exist = await this.invoiceExists({ business, check: 'number', number });
        
        if(number && exist.error){

            result = exist;

        }else{

            let invoiceNo = number ? number : Random.randomNum(10)

            let invoice = await Invoice.create({
                code: `${PrefixType.INVOICE}${UIID(1).toUpperCase()}`,
                number: invoiceNo,
                name: name,
                status: 'pending',
                business: business._id,
                isEnabled: true,
                description,
                recipient:{
                    firstName: recipient.firstName,
                    lastName: recipient.lastName,
                    type: recipient.type,
                    email: recipient.email,
                    phoneNumber: recipient.phoneNumber,
                    businessName: recipient.businessName,
                    address: recipient.address,
                    city: recipient.city,
                    state: recipient.state,
                    phoneCode: recipient.phoneCode,
                    countryCode: recipient.countryCode
                },
                VAT:{
                    type: vat ? vat.type : '',
                    value: vat ? vat.value : '',
                    title: vat ? vat.title : ''
                },
                inflow: {
                    count: 0,
                    value: 0,
                }
      
            });
    
            invoice = await this.updateInvoiceItems(invoice, items);
            let summary = await this.calculateSummary({ items: invoice.items, VAT: vat, partial });

            let dueFormat = SystemService.formatISO(dateToday(dueAt).ISO);
            let today = dateToday(Date.now());
            let issuedFormat = SystemService.formatISO(today.ISO);

            invoice.dueAt = {
                date: dueFormat.date,
                time: dueFormat.time,
                ISO: dateToday(dueAt).ISO
            }

            invoice.issuedAt = {
                date: issuedFormat.date,
                time: issuedFormat.time,
                ISO: today.ISO
            }

            invoice.summary = {
                subtotal: summary.subtotal,
                totalAmount: summary.totalAmount,
                partialAmount: summary.partialAmount,
                amountPaid: 0,
                paidAt: null
            }

            await invoice.save(); // save invoice
    
            // attach invoice to business
            business.invoices.push(invoice._id);
            await business.save();
    
            // update invoice link
            let updatedInvoice = await this.updateInvoiceLinkUrl(invoice, invoice.code);

            // create payment link if specified
            if(isLink){

                const create = await PaymentLinkService.createPaymentLink({
                    business,
                    feature: FeatureType.INVOICE,
                    name: invoice.name,
                    type: 'fixed',
                    amount: invoice.summary.totalAmount,
                    description: invoice.description,
                    invoiceId: invoice._id,
                    message: 'Thank you for your payment',
                    redirectUrl: '',
                    slug: invoice.code,
                    splits: []
                })

                if(!create.error){

                    invoice.payment = create.data._id;
                    await invoice.save();

                    invoice.payment = create.data; // set this to return created payment link data

                }

            }
    
            result.data = updatedInvoice;

        }
    

        return result;

    }

    /**
     * @name updateInvoiceItems
     * @param data 
     * @returns 
     */
    public async updateInvoiceItems(invoice: IInvoiceDoc, data: Array<InvoiceItemDTO>): Promise<IInvoiceDoc> {

        let currentList: Array<IInvoiceItem> = invoice.items;

        for(let i = 0; i < data.length; i++){

            let itemDto = data[i];

            let exist = currentList.find((x) => x.label === itemDto.label);
            let existIndex = currentList.findIndex((x) => x.label === itemDto.label);

            if(exist && existIndex >= 0){

                exist.name = itemDto.name ? itemDto.name : exist.name
                exist.price = itemDto.price ? itemDto.price : exist.price;
                exist.quantity = itemDto.quantity ? itemDto.quantity : exist.quantity;
                exist.total = (exist.price * exist.quantity);

                currentList.splice(existIndex, 1, exist);

            }else{

                let item: IInvoiceItem = {
                    label: `${PrefixType.INVOICE_ITEM}${Random.randomAlpha(6).toUpperCase()}`,
                    name: itemDto.name,
                    price: itemDto.price,
                    quantity: itemDto.quantity,
                    total: (itemDto.price * itemDto.quantity),
                    variant: '',
                    reduce: null
                }
    
                currentList.push(item);

            }

            

        }

        invoice.items = currentList;
        await invoice.save();

        return invoice;

    }

    /**
     * @name calculateSummary
     * @param data 
     * @returns {IInvoiceSummary}
     */
    public async calculateSummary(data: CalculateSummaryDTO): Promise<IInvoiceSummary> {

        let result: IInvoiceSummary = { subtotal: 0, partialAmount: 0, totalAmount: 0, amountPaid: 0, paidAt: null };
        const { items, VAT, partial } = data;

        // calculate subtotal
        for(let i = 0; i < items.length; i++){

            let item = items[i];
            let total = ( item.price * item.quantity );
            result.subtotal = result.subtotal + total;

        }

        // apply VAT
        result.subtotal = parseFloat(result.subtotal.toFixed(2));
        let newTotal = await this.calculateVAT({ subtotal: result.subtotal, VAT });
        
        result.totalAmount = parseFloat((newTotal - partial).toFixed(2));
        result.partialAmount = parseFloat((partial).toFixed(2));
        

        return result;

    }

    /**
     * @name calculateVAT
     * @param data 
     * @returns 
     */
    public async calculateVAT(data: CalculateVATDTO): Promise<number>{

        const { VAT, subtotal } = data;
        let result: number = 0;

        if(VAT.type === 'percentage'){

            const percent = VAT.value > 0 ? (VAT.value / 100) * subtotal : 0;
            result = subtotal + percent;

        }else if(VAT.type === 'flat'){

            result = subtotal + VAT.value;

        }else{
            result = subtotal;
        }

        return result;

    }

    /**
     * @name attachTransaction
     * @param invoice 
     * @param transaction 
     */
    public async attachTransaction(invoice: IInvoiceDoc, transaction: ITransactionDoc): Promise<IInvoiceDoc>{

        if(!arrayIncludes(invoice.transactions, transaction._id.toString())){
            invoice.transactions.push(transaction._id);
            await invoice.save();

            transaction.invoice = invoice._id;
            await transaction.save()
        }

        return invoice;

    }

    /**
     * @name updateInflow
     * @param invoice 
     * @param transaction 
     */
    public async updateInflow(invoice: IInvoiceDoc, transaction: ITransactionDoc): Promise<IInvoiceDoc>{

        invoice.inflow.value = invoice.inflow.value + transaction.amount;
        invoice.inflow.count += 1;
        await invoice.save();

        invoice = await this.attachTransaction(invoice, transaction);

        return invoice;

    }

    /**
     * @name numberExists
     * @param business 
     * @param number 
     * @returns 
     */
    public async invoiceExists(data: InvoiceExistsDTO): Promise<IResult>{

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { business, name, number, check } = data;

        if(check === 'number'){

            const exist = await Invoice.findOne({ business: business._id, number: number });
    
            if(exist){
                result.error = true;
                result.data = exist;
                result.code = 403;
                result.message = `invoice with name: ${exist.name} and number: ${number} already exists`;
            }

        }

        if(check === 'name'){

            const exist = await Invoice.findOne({ business: business._id, name: name });
    
            if(exist){
                result.error = true;
                result.data = exist;
                result.code = 403;
                result.message = `invoice with name: ${name} and number: ${exist.number} already exists`;
            }

        }

        return result;

    }

    public async getOverview(user: IUserDoc): Promise<IOverview>{

        let 
        total: number = 0, 
        active: number = 0, 
        inactive: number = 0, 
        inflow: number = 0, 
        transactions: number = 0, 
        pending: number = 0,
        paid: number = 0,
        overdue: number = 0;

        if(user.userType === UserType.ADMIN || user.userType === UserType.SUPER){

            total = await Invoice.countDocuments();
            active = await Invoice.countDocuments({ isEnabled: true })
            inactive = await Invoice.countDocuments({ isEnabled: false })
            pending = await Invoice.countDocuments({ status: 'pending' })
            paid = await Invoice.countDocuments({ status: 'paid' })
            overdue = await Invoice.countDocuments({ status: 'overdue' })

            const invoices = await Invoice.find({}).populate([
                { path: 'payment' }
            ]);

            if(invoices.length > 0){

                for(let i = 0; i < invoices.length; i++){

                    let invoice = invoices[0];

                    inflow = inflow + invoice.inflow.value;
                    transactions = transactions + invoice.transactions.length;
    
                }

            }

        }else if(user.userType === UserType.BUSINESS){

            total = await Invoice.countDocuments({ business: user.business });
            active = await Invoice.countDocuments({ isEnabled: true, business: user.business })
            inactive = await Invoice.countDocuments({ isEnabled: false, business: user.business })
            pending = await Invoice.countDocuments({ status: 'pending', business: user.business })
            paid = await Invoice.countDocuments({ status: 'paid', business: user.business })
            overdue = await Invoice.countDocuments({ status: 'overdue', business: user.business })

            const invoices = await Invoice.find({ business: user.business }).populate([
                { path: 'payment' }
            ]);

            if(invoices.length > 0){

                for(let i = 0; i < invoices.length; i++){

                    let invoice = invoices[0];

                    inflow = inflow + invoice.inflow.value;
                    transactions = transactions + invoice.transactions.length;
    
                }

            }

        }

        return {
            total,
            active,
            inactive,
            inflow,
            transactions,
            pending,
            paid,
            overdue
        }

    }

}

export default new InvoiceService();