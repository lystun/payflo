import { Types } from 'mongoose';

class MongoUtility {

  constructor(){}

  public stringToMongoId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  };
  
  public mongoIdToString(id: Types.ObjectId): string {
    return id.toString();
  };

}

export default new MongoUtility();


