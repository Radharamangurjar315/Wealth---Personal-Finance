// src/types/express/index.d.ts
import { UserDocument } from "../../models/user.model";

declare global {
  namespace Express {
    interface User extends UserDocument {
      _id: any; // or mongoose.Types.ObjectId if you prefer
      name?: string;
      email?: string;
    }
    interface Request {
      user?: User;
    }
  }
}
export {};