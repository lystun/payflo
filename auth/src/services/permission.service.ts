import { arrayIncludes, enumToArray } from '@btffamily/vacepay';
import { ModelType, PermissionType, UserType } from '../utils/enums.util';
import { ExtractActionItem, IResult, IUserDoc, IUserPermission } from '../utils/types.util'
import { UpdatePermActionsDTO, UpdatePermissionsDTO } from '../dtos/user.dto';
import { PI } from 'aws-sdk';

class PermissionService {

    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null }
    }

    /**
     * @name describePermission
     * @param label 
     * @returns 
     */
    public describePermission(label: string): string {

        let result: string = '';

        if (label === PermissionType.CAN_CREATE) {
            result = 'can create or add'
        } else if (label === PermissionType.CAN_READ) {
            result = 'can read or view'
        } else if (label === PermissionType.CAN_UPATE) {
            result = 'can update or modify'
        } else if (label === PermissionType.CAN_DELETE) {
            result = 'can delete or remove'
        } else if (label === PermissionType.CAN_DISABLE) {
            result = 'can disable or lock'
        } else if (label === PermissionType.CAN_ENABLE) {
            result = 'can enable or unlock'
        } else if (label === PermissionType.CAN_MODIFY) {
            result = 'can modify or make changes to'
        }

        return result;

    }

    /**
     * @name extractActions
     * @param entity 
     * @param actions 
     * @returns 
     */
    public extractActions(actions: Array<ExtractActionItem>): Array<string> {

        let result: Array<string> = [];

        for (let i = 0; i < actions.length; i++) {

            let action = actions[i];

            if (action === 'create') {
                result.push(PermissionType.CAN_CREATE)
            } else if (action === 'read') {
                result.push(PermissionType.CAN_READ)
            } else if (action === 'update') {
                result.push(PermissionType.CAN_UPATE)
            } else if (action === 'delete') {
                result.push(PermissionType.CAN_DELETE)
            } else if (action === 'modify') {
                result.push(PermissionType.CAN_MODIFY)
            } else if (action === 'disable') {
                result.push(PermissionType.CAN_DISABLE)
            } else if (action === 'enable') {
                result.push(PermissionType.CAN_ENABLE)
            }

        }

        return result;

    }

    /**
     * @name createPermissionData
     * @param user 
     */
    public async createPermissionData(user: IUserDoc): Promise<IUserDoc> {

        if (user.userType === UserType.ADMIN) {

            let permissions = await this.getDefaultPermissions(user.userType)
            user.permissions = permissions;

            await user.save();

        } else if (user.userType === UserType.BUSINESS) {

            let permissions = await this.getDefaultPermissions(user.userType)
            user.permissions = permissions;

            await user.save();

        } else if (user.userType === UserType.WRITER) {

        }

        return user;

    }

    /**
     * @name updatePermissions
     * @param data 
     */
    public async updatePermissions(data: UpdatePermissionsDTO): Promise<IUserDoc> {

        const { permissions, user } = data;
        let currentList: Array<IUserPermission> = user.permissions;

        for(let i = 0; i < permissions.length; i++){

            let actions: Array<string> = []
            let pItem = permissions[i];

            let uPerm = currentList.find((x) => x.entity === pItem.entity);
            let uPermIndex = currentList.findIndex((x) => x.entity === pItem.entity);

            if(uPerm && uPermIndex >= 0){

                if(pItem.type === 'update' || 'add'){

                    actions = await this.updateActions({ 
                        currActions: uPerm.actions, 
                        actions: pItem.actions
                    });

                    uPerm.actions = actions;
                    currentList.splice(uPermIndex, 1, uPerm)
                }

                if(pItem.type === 'remove'){
                    let filtered = currentList.filter((x) => x.entity !== pItem.entity)
                    currentList = filtered;
                }

            }else{

                if(pItem.type === 'add'){

                    actions = await this.updateActions({ 
                        currActions: [], 
                        actions: pItem.actions
                    });

                    currentList.push({
                        entity: pItem.entity,
                        actions: actions
                    })

                }

            }


        }

        // save data to DB
        user.permissions = currentList;
        await user.save();

        return user;

    }

    /**
     * @name updateActions
     * @param data 
     */
    private async updateActions(data: UpdatePermActionsDTO): Promise<Array<string>>{

        let { actions, currActions } = data;

        for(let i = 0; i < actions.length; i++){

            let action = actions[i];
            let found = currActions.find((x) => x === action.label);
            let foundI = currActions.findIndex((x) => x === action.label);

            if(found && foundI >= 0){

                if(action.type === 'remove'){
                    let filtered = currActions.filter((m) => m !== action.label);
                    currActions = filtered;
                }

                if(action.type === 'update' || action.type === 'add'){
                    found = action.label;
                    currActions.splice(foundI, 1, found)
                }

            }

            if(!found){

                if(action.type === 'add'){
                    currActions.push(action.label);
                }

            }

        }

        return currActions;

    }

    /**
     * @name getDefaultPermissions
     * @param userType 
     * @returns 
     */
    public async getDefaultPermissions(userType: string): Promise<Array<IUserPermission>> {

        const entities = enumToArray(ModelType, 'values-only');
        let permissions: Array<IUserPermission> = [];

        if (userType === UserType.ADMIN) {

            for (let i = 0; i < entities.length; i++) {

                let actions: Array<string> = [];
                let entity = entities[i];

                if (entity === ModelType.ROLE) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.USER) {
                    actions = this.extractActions(['create', 'read', 'update', 'disable', 'enable'])
                } else if (entity === ModelType.KYB) {
                    actions = this.extractActions(['create', 'read', 'update', 'disable', 'enable'])
                } else if (entity === ModelType.KYC) {
                    actions = this.extractActions(['create', 'read', 'update', 'disable', 'enable'])
                } else if (entity === ModelType.NOTIFICATION) {
                    actions = this.extractActions(['create', 'read', 'update', 'delete'])
                } else if (entity === ModelType.SYSTEM) {
                    actions = this.extractActions(['create', 'read', 'update', 'disable', 'enable'])
                } else if (entity === ModelType.VERIFICATION) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.AUDIT) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.ACCOUNT) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.BENEFICIARY) {
                    actions = this.extractActions(['create', 'read', 'update', 'delete'])
                } else if (entity === ModelType.BUSINESS) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.CHARGEBACK) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.REFUND) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.INVOICE) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.PAYMENTLINK) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.PRODUCT) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.SETTLEMENT) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.SUBACCOUNT) {
                    actions = this.extractActions(['read', 'delete', 'disable', 'enable'])
                } else if (entity === ModelType.TRANSACTION) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.WALLET) {
                    actions = this.extractActions(['read'])
                }

                permissions.push({ entity, actions })
            }

        } else if (userType === UserType.BUSINESS) {

            let permissions: Array<IUserPermission> = [];

            for (let i = 0; i < entities.length; i++) {

                let actions: Array<string> = [];
                let entity = entities[i];

                if (entity === ModelType.ROLE) {
                    actions = this.extractActions([])
                } else if (entity === ModelType.USER) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.KYB) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.KYC) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.NOTIFICATION) {
                    actions = this.extractActions([])
                } else if (entity === ModelType.SYSTEM) {
                    actions = this.extractActions([])
                } else if (entity === ModelType.VERIFICATION) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.AUDIT) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.ACCOUNT) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.BENEFICIARY) {
                    actions = this.extractActions(['create', 'read', 'update', 'delete'])
                } else if (entity === ModelType.BUSINESS) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.CHARGEBACK) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.REFUND) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.INVOICE) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.PAYMENTLINK) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.PRODUCT) {
                    actions = this.extractActions(['create', 'read', 'update'])
                } else if (entity === ModelType.SETTLEMENT) {
                    actions = this.extractActions(['read'])
                } else if (entity === ModelType.SUBACCOUNT) {
                    actions = this.extractActions(['create', 'read', 'update', 'delete'])
                } else if (entity === ModelType.TRANSACTION) {
                    actions = this.extractActions(['read', 'update'])
                } else if (entity === ModelType.WALLET) {
                    actions = this.extractActions(['read', 'update'])
                }

                permissions.push({ entity, actions })
            }

        } else if (userType === UserType.WRITER) {
            
        }

        return permissions;

    }

}

export default new PermissionService();