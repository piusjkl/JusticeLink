import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../utils/env';

export function signToken(payload: object, expiresIn = '7d') {
  return jwt.sign(payload, env.JWT_SECRET as Secret, { expiresIn } as SignOptions);
}

export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET as Secret) as T;
}
