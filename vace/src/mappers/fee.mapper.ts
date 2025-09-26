import { isDefined } from "@btffamily/vacepay";
import { MapBusinessFeeDTO } from "../dtos/fee.dto";
import Business from "../models/Business.model";
import { BusinessType, FeeCategory, FeeType, ProviderNameType, ValueType } from "../utils/enums.util";
import { IBusinessCharge } from "../utils/types.util";

class FeeMapper {

    constructor() { }

    /**
     * @name mapBusinessFees
     * @param data 
     * @returns 
     */
    public async mapBusinessFees(data: MapBusinessFeeDTO): Promise<IBusinessCharge> {

        let charges: IBusinessCharge = {
            capped: 0, chargeFee: false, markup: 0, type: '',
            value: 0, providerFee: 0, providerMarkup: 0, providerCap: 0,
            stampDuty: 0, vatType: ValueType.PERCENTAGE, vatValue: 0
        };

        const { provider, settings, category, type } = data;
        const business = await Business.findOne({ _id: settings.business });

        if (category === FeeCategory.INFLOW && business) {

            if (type === FeeType.TRANSFER && (provider.name === ProviderNameType.BANI || provider.name === ProviderNameType.NETMFB || provider.name === ProviderNameType.NINEPSB)) {

                if (business.businessType === BusinessType.CORPORATE) {

                    charges = {
                        type: settings.inflowFee.type ? settings.inflowFee.type : provider.vaceInflow.type,
                        chargeFee: settings.inflowFee.chargeFee ? settings.inflowFee.chargeFee : provider.vaceInflow.chargeFee,
                        value: isDefined(settings.inflowFee.value) ? settings.inflowFee.value : provider.vaceInflow.value,
                        providerFee: isDefined(settings.inflowFee.providerFee) ? settings.inflowFee.providerFee : provider.vaceInflow.providerFee,
                        markup: isDefined(settings.inflowFee.markup) ? settings.inflowFee.markup : provider.vaceInflow.markup,
                        providerMarkup: isDefined(settings.inflowFee.providerMarkup) ? settings.inflowFee.providerMarkup : provider.vaceInflow.providerMarkup,
                        capped: isDefined(settings.inflowFee.capped) ? settings.inflowFee.capped : provider.vaceInflow.capped,
                        providerCap: isDefined(settings.inflowFee.providerCap) ? settings.inflowFee.providerCap : provider.vaceInflow.providerCap,
                        stampDuty: settings.inflowFee.stampDuty > 0 ? settings.inflowFee.stampDuty : provider.vaceInflow.stampDuty,
                        vatType: settings.inflowFee.vatType ? settings.inflowFee.vatType : ValueType.PERCENTAGE,
                        vatValue: isDefined(settings.inflowFee.vatValue) ? settings.inflowFee.vatValue : 7.5
                    }

                } else if (business.businessType === BusinessType.ENTREPRENEUR) {

                    charges = {
                        type: provider.vaceInflow.type,
                        chargeFee: provider.vaceInflow.chargeFee,
                        value: provider.vaceInflow.value,
                        providerFee: provider.vaceInflow.providerFee,
                        markup: provider.vaceInflow.markup,
                        providerMarkup: provider.vaceInflow.providerMarkup,
                        capped: provider.vaceInflow.capped,
                        providerCap: provider.vaceInflow.providerCap,
                        stampDuty: provider.vaceInflow.stampDuty,
                        vatType: ValueType.PERCENTAGE,
                        vatValue: 7.5
                    }

                }


            }

        }

        else if (category === FeeCategory.OUTFLOW && business) {

            if (type === FeeType.TRANSFER && (provider.name === ProviderNameType.BANI || provider.name === ProviderNameType.NETMFB || provider.name === ProviderNameType.NINEPSB)) {

                if (business.businessType === BusinessType.CORPORATE) {

                    charges = {
                        type: settings.transferFee.type ? settings.transferFee.type : provider.vaceOutflow.type,
                        chargeFee: settings.transferFee.chargeFee ? settings.transferFee.chargeFee : provider.vaceOutflow.chargeFee,
                        value: isDefined(settings.transferFee.value) ? settings.transferFee.value : provider.vaceOutflow.value,
                        providerFee: isDefined(settings.transferFee.providerFee) ? settings.transferFee.providerFee : provider.vaceOutflow.providerFee,
                        markup: isDefined(settings.transferFee.markup) ? settings.transferFee.markup : provider.vaceOutflow.markup,
                        providerMarkup: isDefined(settings.transferFee.providerMarkup) ? settings.transferFee.providerMarkup : provider.vaceOutflow.providerMarkup,
                        capped: isDefined(settings.transferFee.capped) ? settings.transferFee.capped : provider.vaceOutflow.capped,
                        providerCap: isDefined(settings.transferFee.providerCap) ? settings.transferFee.providerCap : provider.vaceOutflow.providerCap,
                        stampDuty: settings.transferFee.stampDuty > 0 ? settings.transferFee.stampDuty : provider.vaceOutflow.stampDuty,
                        vatType: settings.transferFee.vatType ? settings.transferFee.vatType : ValueType.PERCENTAGE,
                        vatValue: settings.inflowFee.vatValue > 0 ? settings.transferFee.vatValue : 7.5
                    }

                } else if (business.businessType === BusinessType.ENTREPRENEUR) {

                    charges = {
                        type: provider.vaceOutflow.type,
                        chargeFee: provider.vaceOutflow.chargeFee,
                        value: provider.vaceOutflow.value,
                        providerFee: provider.vaceOutflow.providerFee,
                        markup: provider.vaceOutflow.markup,
                        providerMarkup: provider.vaceOutflow.providerMarkup,
                        capped: provider.vaceOutflow.capped,
                        providerCap: provider.vaceOutflow.providerCap,
                        stampDuty: provider.vaceOutflow.stampDuty,
                        vatType: ValueType.PERCENTAGE,
                        vatValue: 7.5
                    }

                }

            }

            else if ((type === FeeType.BILL || type === FeeType.VAS) && (provider.name === ProviderNameType.BANI || provider.name === ProviderNameType.ONAFRIQ)) {

                if (business.businessType === BusinessType.CORPORATE) {

                    charges = {
                        type: settings.billsFee.type ? settings.billsFee.type : provider.vaceOutflow.type,
                        chargeFee: settings.billsFee.chargeFee ? settings.billsFee.chargeFee : provider.vaceOutflow.chargeFee,
                        value: isDefined(settings.billsFee.value) ? settings.billsFee.value : provider.vaceOutflow.value,
                        providerFee: isDefined(settings.billsFee.providerFee) ? settings.billsFee.providerFee : provider.vaceOutflow.providerFee,
                        markup: isDefined(settings.billsFee.markup) ? settings.billsFee.markup : provider.vaceOutflow.markup,
                        providerMarkup: isDefined(settings.billsFee.providerMarkup) ? settings.billsFee.providerMarkup : provider.vaceOutflow.providerMarkup,
                        capped: isDefined(settings.billsFee.capped) ? settings.billsFee.capped : provider.vaceOutflow.capped,
                        providerCap: isDefined(settings.billsFee.providerCap) ? settings.billsFee.providerCap : provider.vaceOutflow.providerCap,
                        stampDuty: settings.billsFee.stampDuty > 0 ? settings.billsFee.stampDuty : 0,
                        vatType: settings.billsFee.vatType ? settings.billsFee.vatType : ValueType.PERCENTAGE,
                        vatValue: settings.inflowFee.vatValue > 0 ? settings.billsFee.vatValue : 0
                    }

                } else if (business.businessType === BusinessType.ENTREPRENEUR) {

                    charges = {
                        type: provider.vaceOutflow.type,
                        chargeFee: provider.vaceOutflow.chargeFee,
                        value: provider.vaceOutflow.value,
                        providerFee: provider.vaceOutflow.providerFee,
                        markup: provider.vaceOutflow.markup,
                        providerMarkup: provider.vaceOutflow.providerMarkup,
                        capped: provider.vaceOutflow.capped,
                        providerCap: provider.vaceOutflow.providerCap,
                        stampDuty: 0,
                        vatType: ValueType.PERCENTAGE,
                        vatValue: 0
                    }

                }
            }

            else if (type === FeeType.CARD && (provider.name === ProviderNameType.BLUSALT || provider.name === ProviderNameType.PAYSTACK)) {

                if (business.businessType === BusinessType.CORPORATE) {

                    charges = {
                        type: settings.cardFee.type ? settings.cardFee.type : provider.vaceOutflow.type,
                        chargeFee: settings.cardFee.chargeFee ? settings.cardFee.chargeFee : provider.vaceOutflow.chargeFee,
                        value: isDefined(settings.cardFee.value) ? settings.cardFee.value : provider.vaceOutflow.value,
                        providerFee: isDefined(settings.cardFee.providerFee) ? settings.cardFee.providerFee : provider.vaceOutflow.providerFee,
                        markup: isDefined(settings.cardFee.markup) ? settings.cardFee.markup : provider.vaceOutflow.markup,
                        providerMarkup: isDefined(settings.cardFee.providerMarkup) ? settings.cardFee.providerMarkup : provider.vaceOutflow.providerMarkup,
                        capped: isDefined(settings.cardFee.capped) ? settings.cardFee.capped : provider.vaceOutflow.capped,
                        providerCap: isDefined(settings.cardFee.providerCap) ? settings.cardFee.providerCap : provider.vaceOutflow.providerCap,
                        stampDuty: settings.cardFee.stampDuty > 0 ? settings.cardFee.stampDuty : 0,
                        vatType: settings.cardFee.vatType ? settings.cardFee.vatType : ValueType.PERCENTAGE,
                        vatValue: settings.inflowFee.vatValue > 0 ? settings.cardFee.vatValue : 7.5
                    }

                } else if (business.businessType === BusinessType.ENTREPRENEUR) {

                    charges = {
                        type: provider.vaceOutflow.type,
                        chargeFee: provider.vaceOutflow.chargeFee,
                        value: provider.vaceOutflow.value,
                        providerFee: provider.vaceOutflow.providerFee,
                        markup: provider.vaceOutflow.markup,
                        providerMarkup: provider.vaceOutflow.providerMarkup,
                        capped: provider.vaceOutflow.capped,
                        providerCap: provider.vaceOutflow.providerCap,
                        stampDuty: 0,
                        vatType: ValueType.PERCENTAGE,
                        vatValue: 7.5
                    }

                }

            }

        }

        return charges;

    }

}

export default new FeeMapper()