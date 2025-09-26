import { ICampaignDoc, ICampaignSection, IUserDoc } from "../utils/types.util";

export interface NewCampaignDTO{
    title: string,
    headline: string, 
    description?: string, 
    callback: string,
    sections?: Array<ICampaignSection>,
    user?: IUserDoc
}

export interface CampaignSectionDTO extends ICampaignSection{}
export interface CampaignBlastDTO{
    type: 'send-campaign' | 'test-campaign',
    campaign: ICampaignDoc,
    guests?: Array<string>
}