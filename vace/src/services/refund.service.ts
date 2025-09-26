import { UIID, arrayIncludes, dateToday, hasDecimal, isPos, isPrecise, isZero, notDefined } from '@btffamily/vacepay';
import { CreateRefundDTO, FilterRefundDTO, InitiateRefundDTO, PayoutRefundDTO, RedirectRefundDTO } from '../dtos/refund.dto';
import Refund from '../models/Refund.model';
import { PrefixType, ProviderNameType, TransactionStatus, UserType } from '../utils/enums.util';
import { IAccountDoc, IRefundDoc, IResult, ISettingDoc, ITransactionDoc, IUserDoc } from '../utils/types.util'
import BaniService from './providers/bani.service';
import TransactionService from './transaction.service';
import SystemService from './system.service';
import BankService from './bank.service';
import NinepsbService from './providers/ninepsb.service';
import { ResolvedBankDTO } from '../dtos/provider.dto';
import { PSBApiResponseDTO } from '../dtos/providers/ninepsb.dto';
import WalletService from './wallet.service';
import AccountService from './account.service';
import BusinessService from './business.service';
import { refreshSettlementReportJob } from '../queues/jobs/settlement.job';

interface IOverview {
    total: number,
    completed: number,
    pending: number,
    successful: number,
    failed: number,
    value: number
}

class RefundService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name validateCreateRefund
     * @param data 
     * @returns 
     */
    public async validateCreateRefund(data: CreateRefundDTO): Promise<IResult> {

        const allowedOptions = ['instant', 'request'];
        const allowedTypes = ['partial', 'full'];

        let result: IResult = { error: false, message: '', code: 200, data: null };
        const { option, reason, type, amount, bank, reference, pin } = data;

        if (!reference) {
            result.error = true;
            result.message = `transaction reference is required`;
        } else if (!option) {
            result.error = true;
            result.message = `refund option is required`;
        } else if (!arrayIncludes(allowedOptions, option)) {
            result.error = true;
            result.message = `invalid option value. choose from ${allowedOptions.join(', ')}`;
        } else if (!type) {
            result.error = true;
            result.message = `refund type is required`;
        } else if (!arrayIncludes(allowedTypes, type)) {
            result.error = true;
            result.message = `invalid type value. choose from ${allowedTypes.join(', ')}`;
        } else if (type === 'partial' && (notDefined(amount) || isZero(amount))) {
            result.error = true;
            result.message = `refund amount is required`;
        } else if (type === 'partial' && amount && !isPos(amount)) {
            result.error = true;
            result.message = `refund amount cannot be negative`;
        } else if (type === 'partial' && amount && hasDecimal(amount) && !isPrecise({ value: amount, length: 2 })) {
            result.error = true;
            result.message = `refund amount cannot be negative`;
        } else if (!reason) {
            result.error = true;
            result.message = `refund reason is required`;
        } else if (!pin) {
            result.error = true;
            result.message = `transaction pin is required`;
        } else {

            if (option === 'instant') {

                if (notDefined(bank)) {
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

            } else {
                result.error = false;
                result.message = ``;
            }

        }

        return result;

    }

    /**
     * @name createRefundData
     * @param data 
     * @returns 
     */
    public async createRefundData(data: InitiateRefundDTO): Promise<IResult> {

        const { business, transaction, option, type, reason, amount, bank } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null };

        let totalAmount = amount ? amount : transaction.amount;
        const lastFailed = await this.lastRefundFailed(transaction);

        if (!lastFailed.flag) {

            result.error = true;
            result.message = `cannot create refund. last refund initiated is ${lastFailed.status}`;

        } else {

            let code = UIID(1);
            const refund = await Refund.create({
                code: `${PrefixType.REFUND}-${code}`,
                type: type,
                reason: reason,
                option: option,
                amount: totalAmount,
                transaction: transaction._id,
                business: business._id,
                provider: transaction.provider._id,
                reference: transaction.reference,
                providerRef: transaction.providerRef
            });

            if (bank) {

                refund.bank = {
                    accountName: bank.accountName,
                    accountNo: bank.accountNo,
                    name: bank.name,
                    bankCode: bank.bankCode,
                    legalName: bank.legalName,
                    platformCode: bank.platformCode
                }

                await refund.save();

            }

            transaction.refundData = {
                refundType: refund.type,
                amount: totalAmount
            }
            transaction.refunds.push(refund._id);
            await transaction.save();

            business.refunds.push(refund._id);
            await business.save();

            result.error = false;
            result.data = refund;

        }

        return result;

    }

    /**
     * @name lastRefundFailed
     * @param transaction 
     * @returns 
     */
    public async lastRefundFailed(transaction: ITransactionDoc): Promise<{ flag: boolean, status: string }> {

        let result: { flag: boolean, status: string } = { flag: false, status: '' };

        if (transaction.refunds.length > 0) {

            const length = transaction.refunds.length;
            const lastIndex = length - 1;

            const refund = await Refund.findOne({ _id: transaction.refunds[lastIndex] });

            if (refund && (refund.status === TransactionStatus.FAILED)) {
                result.flag = true;
                result.status = refund.status;
            } else {
                result.flag = false;
                result.status = refund ? refund.status : 'dormant';
            }

        } else if (transaction.refunds.length <= 0) {
            result.flag = true;
            result.status = 'dormant'
        }

        return result;

    }

    /**
     * @name payoutRefund
     * @param data 
     * @returns 
     */
    public async payoutRefund(data: PayoutRefundDTO): Promise<IResult> {

        const { refund, wallet, business, provider, account, transaction } = data;
        const settings: ISettingDoc = business.settings;
        let result: IResult = { error: false, message: '', code: 200, data: null };

        if (refund.option !== 'instant') {

            result.error = true;
            result.code = 403;
            result.message = `cannot process a ${refund.option} refund`;

        } else {

            // check wallet balance ( add transaction fee )
            const hasBalance = await WalletService.checkBalance({ amount: refund.amount, provider, settings, wallet, type: 'transfer', category: 'outflow' });

            if (hasBalance === false) {

                result.error = true;
                result.code = 403;
                result.message = `insufficient balance on wallet`;

            } else {

                const txnref = TransactionService.generateRef(); // Vacepay reference

                if (provider.name === ProviderNameType.BANI) {

                    // create transaction
                    const transaction = await TransactionService.createRefundTransaction({
                        type: 'debit',
                        refundType: 'instant',
                        business,
                        wallet,
                        provider,
                        isWebhook: false,
                        reference: txnref,
                        refund: refund,
                        amount: refund.amount,
                        bank: {
                            accountName: refund.bank.accountName,
                            accountNo: refund.bank.accountNo,
                            bankCode: refund.bank.bankCode,
                            name: refund.bank.legalName,
                            platformCode: refund.bank.platformCode
                        }
                    });

                    /**
                     * debit wallet immediately.
                     * practice this to avaoid double spending or unintended overdraft
                     */
                    const userWallet = await WalletService.updateWalletOutflow(wallet, transaction);
                    await AccountService.updateAccountOutflow(account, transaction);

                    result = await BaniService.payoutToBankNGN({
                        amount: refund.amount,
                        receiverType: 'personal',
                        accountName: refund.bank.accountName,
                        accountNo: refund.bank.accountNo,
                        bankCode: refund.bank.bankCode,
                        currency: wallet.currency,
                        reference: txnref,
                        narration: `Refund bank transfer from ${business.name} to ${refund.bank.accountName} | ${refund.bank.accountNo}`
                    });

                    if (result.error) {

                        // update transaction
                        transaction.status = TransactionStatus.FAILED;
                        await transaction.save()

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

                    if (!result.error) {

                        // update refund data
                        const today = dateToday(Date.now());
                        const format = SystemService.formatISO(today.ISO);
                        refund.refundedTxn = transaction._id;
                        refund.paidAt = {
                            day: format.date,
                            time: format.time,
                            ISO: today.ISO
                        }
                        await refund.save();

                        await WalletService.sendDebitTransferEmail({
                            account,
                            business,
                            transaction,
                            wallet: userWallet
                        })

                        // refresh settlement report
                        refreshSettlementReportJob(transaction.settlement._id);

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
                        const transaction = await TransactionService.createRefundTransaction({
                            type: 'debit',
                            refundType: 'instant',
                            refund: refund,
                            business,
                            wallet,
                            provider,
                            isWebhook: false,
                            reference: txnref,
                            amount: refund.amount,
                            bank: {
                                accountName: refund.bank.accountName,
                                accountNo: refund.bank.accountNo,
                                bankCode: refund.bank.bankCode,
                                name: refund.bank.legalName,
                                platformCode: refund.bank.platformCode
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
                            amount: refund.amount,
                            recipient: {
                                accountNo: refund.bank.accountNo,
                                bankCode: refund.bank.bankCode,
                                accountName: refund.bank.accountName,
                            },
                            sender: {
                                accountName: bankSender.accountName,
                                accountNo: bankSender.accountNo
                            },
                            description: `Refund bank transfer from ${business.name} to ${bankSender.accountName} | ${bankSender.accountNo}`
                        });

                        const _response: PSBApiResponseDTO = result.data;

                        if (result.error) {

                            // update transaction
                            transaction.status = TransactionStatus.FAILED;
                            await transaction.save()

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

                            // update refund data
                            const today = dateToday(Date.now());
                            const format = SystemService.formatISO(today.ISO);
                            refund.refundedTxn = transaction._id;
                            refund.paidAt = {
                                day: format.date,
                                time: format.time,
                                ISO: today.ISO
                            }
                            await refund.save();

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

                // set the response data
                result.data = refund;

            }


        }

        return result;

    }

    /**
     * @name defineFilterQuery
     * @param data 
     * @returns 
     */
    public defineFilterQuery(data: FilterRefundDTO): Array<any> {

        let result: Array<any> = [];

        if (!notDefined(data.status)) {
            result.push({ "status": data.status })
        }

        if (!notDefined(data.type)) {
            result.push({ "type": data.type })
        }

        if (!notDefined(data.option)) {
            result.push({ "option": data.option })
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
     * @name redirectRefundToAPI
     * @param data 
     * @returns 
     */
    public async redirectRefundToAPI(data: RedirectRefundDTO): Promise<IResult> {

        const { refund, transaction, business, provider, wallet } = data;
        let result: IResult = { error: false, message: '', code: 200, data: null };

        let amount = refund.type === 'partial' ? refund.amount : transaction.amount;

        if (refund.option !== 'request') {

            result.error = true;
            result.code = 422;
            result.message = `cannot process a ${refund.option} refund`;

        } else {

            

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
            successful: number = 0,
            failed: number = 0,
            value: number = 0;

        if (user.userType === UserType.ADMIN || user.userType === UserType.SUPER) {

            total = await Refund.countDocuments();
            completed = await Refund.countDocuments({ status: TransactionStatus.COMPLETED })
            successful = await Refund.countDocuments({ status: TransactionStatus.SUCCESSFUL })
            failed = await Refund.countDocuments({ status: TransactionStatus.FAILED })
            pending = await Refund.countDocuments({ status: TransactionStatus.PENDING })

            const links = await Refund.find({});

            links.forEach((x: any) => {
                value = value + x.amount;
            });

        }

        return {
            total,
            completed,
            pending,
            value,
            successful,
            failed
        }

    }

}

export default new RefundService();