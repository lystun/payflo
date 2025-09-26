export interface ICardType {
    name: string,
    brand: string,
    root: {
        number: string,
        expiry: string,
        cvv: string,
    }
    pattern: {
        regex: Array<{ label: string, pattern: RegExp }>,
        numbers: Array<string>
    }
}

export enum CardSchemes {
    VISA = 'visa',
    MASTERCARD = 'mastercard',
    VERVE = 'verve',
    AMERICAN_EXPRESS = 'american-express',
    DINERS_CLUB = 'diners-club',
    MAESTRO = 'maestro',
    DISCOVER = 'discover',
    LASER = 'laser',
    HIPERCARD = 'hipercard',
    JCB = 'jcb'
}

const formatSchemeName = (name: string): string => {

    let split: Array<string> = [];
    let result: string = '';

    if (name.includes('-')) {
        split = name.split('-');
        result = split.join(' ')
    } else if (name.includes('_')) {
        split = name.split('_');
        result = split.join(' ')
    } else {
        result = name
    }

    return result;

}

export const testCardPattern = (number: string): ICardType => {

    let cardType: ICardType = {
        brand: '',
        name: '',
        pattern: {
            numbers: [],
            regex: []
        },
        root: { cvv: '', expiry: '', number: '' }
    }

    let visa = /^4[0-9]{12}(?:[0-9]{3,4})?$/
    let visa_local = /^4[19658][7684][0785][04278][128579](?:[0-9]{10})$/
    let mastercard = /^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/
    let mastercard_local = /^(?:5[13]99|55[35][19]|514[36])(?:11|4[10]|23|83|88)(?:[0-9]{10})$/
    let verve = /^(?:50[067][180]|6500)(?:[0-9]{15})$/
    let american_exp = /^3[47](?:[0-9]{13})$/
    let diners_club = /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
    let maestro = /^(5899|5018|5020|5038|6304|6703|6708|6759|676[1-3])[06][19](?:[0-9]{10})$/
    let discover = /^6(?:011|4[4-9]3|222|5[0-9]{2})[0-9]{12}$/
    let laser = /^(6706|6771|6709)[0-9]{11,15}$/
    let hipercard = /^(384100|384140|384160|606282|637095|637568|60(?!11))/
    let jcb = /^(?:2131|1800|35\d{3})\d{11}$/

    if (visa.test(number) || visa_local.test(number)) {

        cardType = {
            name: CardSchemes.VISA,
            brand: formatSchemeName(CardSchemes.VISA),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'visa', pattern: visa },
                    { label: 'visa_local', pattern: visa_local }
                ]
            }
        }

    }

    else if (mastercard.test(number) || mastercard_local.test(number)) {

        cardType = {
            name: CardSchemes.MASTERCARD,
            brand: formatSchemeName(CardSchemes.MASTERCARD),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'mastercard', pattern: mastercard },
                    { label: 'mastercard_local', pattern: mastercard_local }
                ]
            }
        }

    }

    else if (verve.test(number)) {

        cardType = {
            name: CardSchemes.VERVE,
            brand: formatSchemeName(CardSchemes.VERVE),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: verve }
                ]
            }
        }
    }

    else if (american_exp.test(number)) {

        cardType = {
            name: CardSchemes.AMERICAN_EXPRESS,
            brand: formatSchemeName(CardSchemes.AMERICAN_EXPRESS),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: american_exp }
                ]
            }
        }

    }

    else if (diners_club.test(number)) {

        cardType = {
            name: CardSchemes.DINERS_CLUB,
            brand: formatSchemeName(CardSchemes.DINERS_CLUB),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: diners_club }
                ]
            }
        }

    }

    else if (maestro.test(number)) {

        cardType = {
            name: CardSchemes.MAESTRO,
            brand: formatSchemeName(CardSchemes.MAESTRO),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: maestro }
                ]
            }
        }
    }

    else if (discover.test(number)) {

        cardType = {
            name: CardSchemes.DISCOVER,
            brand: formatSchemeName(CardSchemes.DISCOVER),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: discover }
                ]
            }
        }

    }

    else if (laser.test(number)) {

        cardType = {
            name: CardSchemes.LASER,
            brand: formatSchemeName(CardSchemes.LASER),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: laser }
                ]
            }
        }

    }

    else if (hipercard.test(number)) {

        cardType = {
            name: CardSchemes.HIPERCARD,
            brand: formatSchemeName(CardSchemes.HIPERCARD),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'verve', pattern: hipercard }
                ]
            }
        }

    }

    else if (jcb.test(number)) {

        cardType = {
            name: CardSchemes.JCB,
            brand: formatSchemeName(CardSchemes.JCB),
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: [
                    { label: 'jcb', pattern: jcb }
                ]
            }
        }

    }

    else {
        cardType = {
            name: 'no-brand',
            brand: 'no-brand',
            root: {
                cvv: '', expiry: '', number: number
            },
            pattern: {
                numbers: [number],
                regex: []
            }
        }
    }

    return cardType;

}