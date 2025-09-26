export interface IBufferToGCSDTO {
    type: string,
    eventKey: string,
    filename: string,
    resource: any,
    resourceType: string
}

export interface ICombineToGCSDTO extends IBufferToGCSDTO {
    mimetype: string
}