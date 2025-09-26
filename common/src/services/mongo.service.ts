import { Types, ObjectId } from 'mongoose';

class Mongo {

  constructor(){}

  public stringToMongoId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  };
  
  public mongoIdToString(id: any): string {
    return id.toString();
  };

}

export default new Mongo();

