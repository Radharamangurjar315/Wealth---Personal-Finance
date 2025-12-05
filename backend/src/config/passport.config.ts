// src/config/passport.config.ts
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import { Env } from "./env.config";
import { findByIdUserService } from "../services/user.service";

interface JwtPayload {
  userId: string;
}

// Use `any` for options to avoid typing/version mismatches between @types/passport-jwt and the runtime.
const options: any = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: Env.JWT_SECRET,
  audience: ["user"],
  algorithms: ["HS256"],
};

passport.use(
  new JwtStrategy(options, async (payload: JwtPayload, done) => {
    try {
      if (!payload.userId) {
        return done(null, false, { message: "Invalid token payload" });
      }

      const user = await findByIdUserService(payload.userId);
      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error as any, false);
    }
  })
);

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
});
export default passport;