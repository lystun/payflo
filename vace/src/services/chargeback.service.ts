import { UIID, arrayIncludes, checkDateFormat, checkTimeFormat, dateToday, isBase64, isString, notDefined } from '@btffamily/vacepay';
import { CreateChargebackDTO, DeclineChargebackDTO, FilterChargebackDTO, LogChargebackDTO, PayoutChargebackTO } from '../dtos/chargeback.dto';
import Chargeback from '../models/Chargeback.model';
import { IChargebackDoc, IResult, ISettingDoc, ITransactionDoc, IUserDoc } from '../utils/types.util'
import { PrefixType, ProviderNameType, TransactionStatus, UserType } from '../utils/enums.util';
import SystemService from './system.service';
import BaniService from './providers/bani.service';
import TransactionService from './transaction.service';
import EmailService from './email.service';
import BankService from './bank.service';
import NinepsbService from './providers/ninepsb.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import WalletService from './wallet.service';
import AccountService from './account.service';
import ChargebackRepository from '../repositories/chargeback.repository';

interface IOverview {
    total: number,
    completed: number,
    pending: number,
    preArbitration: number,
    arbitration: number
    value: number,
    graph: {
        latest: Array<any>
    }
}

class ChargebackService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateCreateChargeback
     * @param data 
     * @returns 
     */
    public async validateCreateChargeback(data: CreateChargebackDTO): Promise<IResult> {

        const allowed = ['level1', 'level2', 'pre-arbitration', 'arbitration'];

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { dueDate, level, message, timeline, bank, reference } = data;

        if (!reference) {
            result.error = true;
            result.message = `transaction refenence is required`;
        } else if (!level) {
            result.error = true;
            result.message = `chargeback level is required`;
        } else if (!arrayIncludes(allowed, level)) {
            result.error = true;
            result.message = `invalid level value. choose from ${allowed.join(', ')}`;
        } else if (!message) {
            result.error = true;
            result.message = `chargeback message to customer is required`;
        } else if (!dueDate) {
            result.error = true;
            result.message = `chargeback due date is required`;
        } else if (!timeline) {
            result.error = true;
            result.message = `chargeback timeline is required`;
        } else {

            const dueSplit = dueDate.split(' ');
            const lineSplit = timeline.split(' ');

            if (dueSplit.length <= 1) {
                result.error = true;
                result.message = `invalid due date value`;
            } else if (lineSplit.length <= 1) {
                result.error = true;
                result.message = `invalid timeline value`;
            } else if (!checkDateFormat(dueSplit[0])) {
                result.error = true;
                result.message = `due date should be in format YYYY/MM/DD or YYYY-MM-DD`;
            } else if (!checkTimeFormat(dueSplit[1])) {
                result.error = true;
                result.message = `due time should be in format HH:mm:ss`;
            } else if (!checkDateFormat(lineSplit[0])) {
                result.error = true;
                result.message = `timeline date should be in format YYYY/MM/DD or YYYY-MM-DD`;
            } else if (!checkTimeFormat(lineSplit[1])) {
                result.error = true;
                result.message = `timeline time should be in format HH:mm:ss`;
            } else if (notDefined(bank)) {
                result.error = true;
                result.message = `account details is required`;
            } else if (bank && !bank.accountNo) {
                result.error = true;
                result.message = `account number is required`;
            } else if (bank && !bank.bankCode) {
                result.error = true;
                result.message = `bank code is required`;
            } else {
                result.error = false;
                result.message = ``;
            }

        }

        return result;

    }

    /**
     * @name validateDeclineChargeback
     * @param data 
     * @returns 
     */
    public async validateDeclineChargeback(data: DeclineChargebackDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { reason, evidence } = data;

        if (!reason) {
            result.error = true;
            result.message = `decline reason is required`;
        } else if (!evidence) {
            result.error = true;
            result.message = `evidence for declining is required`;
        } else if (!isString(evidence)) {
            result.error = true;
            result.message = `evidence is required to be a string`;
        } else if (!isBase64(evidence)) {
            result.error = true;
            result.message = `evidence is required to be a base64 string`;
        } else {

            result.error = false;
            result.message = ``;

        }

        return result;

    }

    /**
     * @name createChargeback
     * @param data 
     * @returns 
     */
    public async createChargeback(data: LogChargebackDTO): Promise<IResult> {

        let result: IResult = { error: false, message: '', code: 200, data: null }
        const { dueDate, level, transaction, message, timeline, user, bizUser, bank, business } = data;

        const exist = await Chargeback.findOne({ transaction: transaction._id });

        if (exist) {

            result.error = true;
            result.message = `a chargeback already exist for transaction ${transaction.reference}`;

        } else {

            const today = dateToday(Date.now());
            let formatted = SystemService.formatISO(today.ISO);

            let code = UIID(1);
            const chargeback = await Chargeback.create({
                code: `${PrefixType.CHARGEBACK}-${code}`,
                amount: transaction.amount,
                dueDate: dateToday(dueDate).ISO,
                timeline: dateToday(timeline).ISO,
                message: message,
                level: level,
                initiated: {
                    date: formatted.date,
                    time: formatted.time,
                    ISO: today.ISO
                },
                response: {
                    message: '',
                    evidence: ''
                },
                bank: {
                    accountName: bank.accountName,
                    accountNo: bank.accountNo,
                    name: bank.name,
                    legalName: bank.legalName,
                    bankCode: bank.bankCode,
                    platformCode: bank.platformCode
                },
                paidAt: {
                    date: '',
                    time: '',
                    ISO: ''
                },
                business: transaction.business,
                transaction: transaction._id,
                user: user._id,
                provider: transaction.provider._id,
                reference: transaction.reference,
                providerRef: transaction.reference
            });

            transaction.chargeback = chargeback._id;
            await transaction.save();

            // create notification
            let notification = `Your Vacepay account got a new chargeback on transaction ${transaction.reference} and you are required to review and respond to chargeback on or before due date.`;
            let title = 'New Chargeback';
            let smsMessage = `Review the new chargeback on your account. Reference: ${chargeback.reference}`;
            await SystemService.syncNatsData({ message: notification, title, smsMessage, email: bizUser ? bizUser.email : '' }, 'notification.created', 'type.notification');

            // send email to notify business
            await EmailService.sendNewChargebackEmail({
                driver: 'zepto',
                business: business,
                template: 'chargeback',
                transaction: transaction,
                options: {
                    subject: 'New chargeback on account',
                    salute: `${business.name}`,
                    bodyOne: `Yo have a new chargeback on your account. Please find the details of the chargeback below`,
                    buttonText: 'View Details',
                    buttonUrl: 'view'
                }
            });

            result.error = false;
            result.data = chargeback;

        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterChargebackDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.status)) {
            result.push({ "status": data.status })
        }

        if (!notDefined(data.level)) {
            result.push({ "level": data.level })
        }

        if (!notDefined(data.date)) {
            result.push({ "date": data.date })
        }

        if (!notDefined(data.business)) {
            result.push({ "business": data.business })
        }

        if (!notDefined(data.transaction)) {
            result.push({ "transaction": data.transaction })
        }

        return result;

    }

    /**
     * @name payoutChargeback
     * @param data 
     * @returns 
     */
    public async payoutChargeback(data: PayoutChargebackTO): Promise<IResult> {

        const { chargeback, wallet, business, provider, account } = data;
        const settings: ISettingDoc = business.settings;
        let result: IResult = { error: false, message: '', code: 200, data: null };

        let amount = chargeback.amount;

        // check wallet balance ( add transaction fee )
        const hasBalance = await WalletService.checkBalance({ amount, provider, settings, wallet, type: 'transfer', category: 'outflow' });

        if (hasBalance === false) {

            result.error = true;
            result.code = 403;
            result.message = `insufficient balance on wallet`;

        } else {

            const txnref = TransactionService.generateRef(); // Vacepay reference

            if (provider.name === ProviderNameType.BANI) {

                // create transaction
                const transaction = await TransactionService.createChargebackTransaction({
                    type: 'debit',
                    business,
                    wallet,
                    provider,
                    isWebhook: false,
                    reference: txnref,
                    chargeback: chargeback,
                    amount: amount,
                    bank: {
                        accountName: chargeback.bank.accountName,
                        accountNo: chargeback.bank.accountNo,
                        bankCode: chargeback.bank.bankCode,
                        name: chargeback.bank.legalName,
                        platformCode: chargeback.bank.platformCode
                    }
                });

                /**
                 * debit wallet immediately.
                 * practice this to avaoid double spending or unintended overdraft
                 */
                const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
                await AccountService.updateAccountOutflow(account, transaction);

                result = await BaniService.payoutToBankNGN({
                    amount,
                    receiverType: 'personal',
                    accountName: chargeback.bank.accountName,
                    accountNo: chargeback.bank.accountNo,
                    bankCode: chargeback.bank.bankCode,
                    currency: wallet.currency,
                    reference: txnref,
                    narration: `Chargeback bank transfer from ${business.name} to ${chargeback.bank.accountName} | ${chargeback.bank.accountNo}`
                });

                if (result.error) {

                    // update transaction
                    transaction.status = TransactionStatus.FAILED;
                    await transaction.save();

                    await WalletService.reverseMoneyToWallet({
                        account,
                        isWebhook: false,
                        provider,
                        transaction,
                        wallet,
                        business,
                        addFee: true
                    });

                }

                if (!result.error) {

                    // update chargeback
                    const today = dateToday(Date.now());
                    const format = SystemService.formatISO(today.ISO);
                    chargeback.paidAt = {
                        date: format.date,
                        time: format.time,
                        ISO: today.ISO
                    }
                    await chargeback.save();

                    await WalletService.sendDebitTransferEmail({
                        account,
                        business,
                        transaction,
                        wallet: userWallet
                    })

                }

            }

            if (provider.name === ProviderNameType.NINEPSB) {

                // verify PSB9 collection bank account
                result = await BankService.resolveBankAccount({
                    accountNo: NinepsbService.bankAccount,
                    bankCode: NinepsbService.bankCode,
                    name: provider.name
                })

                if (!result.error) {

                    const bankSender: ResolvedBankDTO = result.data;

                    // create transaction
                    const transaction = await TransactionService.createChargebackTransaction({
                        type: 'debit',
                        business,
                        wallet,
                        provider,
                        isWebhook: false,
                        reference: txnref,
                        chargeback: chargeback,
                        amount: amount,
                        bank: {
                            accountName: chargeback.bank.accountName,
                            accountNo: chargeback.bank.accountNo,
                            bankCode: chargeback.bank.bankCode,
                            name: chargeback.bank.legalName,
                            platformCode: chargeback.bank.platformCode
                        }
                    });

                    /**
                     * debit wallet immediately.
                     * practice this to avaoid double spending or unintended overdraft
                     */
                    const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
                    await AccountService.updateAccountOutflow(account, transaction);

                    // move cash from 9PSB wallet to destination
                    result = await NinepsbService.fundBankAccount({
                        type: "fund-normal",
                        reference: txnref,
                        amount,
                        recipient: {
                            accountNo: chargeback.bank.accountNo,
                            bankCode: chargeback.bank.bankCode,
                            accountName: chargeback.bank.accountName,
                        },
                        sender: {
                            accountName: bankSender.accountName,
                            accountNo: bankSender.accountNo
                        },
                        description: `Chargeback bank transfer from ${business.name} to ${bankSender.accountName} | ${bankSender.accountNo}`
                    });

                    const _response: PSBApiResponseDTO = result.data;

                    if (result.error) {

                        // update transaction
                        transaction.status = TransactionStatus.FAILED;
                        await transaction.save();

                        await WalletService.reverseMoneyToWallet({
                            account,
                            isWebhook: false,
                            provider,
                            transaction,
                            wallet,
                            business,
                            addFee: true
                        })

                    }

                    // update payout transaction
                    if (!result.error) {

                        // update chargeback
                        const today = dateToday(Date.now());
                        const format = SystemService.formatISO(today.ISO);
                        chargeback.paidAt = {
                            date: format.date,
                            time: format.time,
                            ISO: today.ISO
                        }

                        await chargeback.save();

                        await TransactionService.updatePayoutTransaction({
                            business,
                            event: null,
                            isWebhook: false,
                            payload: _response,
                            provider,
                            transaction
                        });

                        await WalletService.sendDebitTransferEmail({
                            account,
                            business,
                            transaction,
                            wallet: userWallet
                        })

                    }

                }

            }

        }

        return result;

    }

    /**
     * @name getOverview
     * @param user 
     * @returns 
     */
    public async getOverview(user: IUserDoc): Promise<IOverview> {

        let total: number = 0,
            completed: number = 0,
            pending: number = 0,
            preArbitration: number = 0,
            arbitration: number = 0,
            value: number = 0, graph: any = {};

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            total = await Chargeback.countDocuments();
            completed = await Chargeback.countDocuments({ status: TransactionStatus.COMPLETED })
            pending = await Chargeback.countDocuments({ status: TransactionStatus.PENDING })
            preArbitration = await Chargeback.countDocuments({ level: 'pre-arbitration' })
            arbitration = await Chargeback.countDocuments({ level: 'arbitration' })

            const aggTotal = await ChargebackRepository.aggregateTotal(user);
            const aggLatest = await ChargebackRepository.aggregateLatestData(user);

            value = aggTotal.amount;
            graph.latest = aggLatest;

        } else if (user.userType === UserType.BUSINESS){

            total = await Chargeback.countDocuments({ business: user._id });
            completed = await Chargeback.countDocuments({ business: user._id, status: TransactionStatus.COMPLETED })
            pending = await Chargeback.countDocuments({ business: user._id, status: TransactionStatus.PENDING })
            preArbitration = await Chargeback.countDocuments({ business: user._id, level: 'pre-arbitration' })
            arbitration = await Chargeback.countDocuments({ business: user._id, level: 'arbitration' })

            const aggTotal = await ChargebackRepository.aggregateTotal(user);
            const aggLatest = await ChargebackRepository.aggregateLatestData(user);

            value = aggTotal.amount;
            graph.latest = aggLatest;

        }

        return {
            total,
            completed,
            pending,
            arbitration,
            preArbitration,
            value,
            graph
        }

    }

}

export default new ChargebackService();