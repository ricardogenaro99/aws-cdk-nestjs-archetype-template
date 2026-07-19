import { createHash } from 'node:crypto';
import { EncodingType, HashAlgorithm } from '../common/enum';

export class Util {
  private static generateHash(text: string): string {
    const fullHash: string = createHash(HashAlgorithm.SHA256).update(text).digest(EncodingType.HEX);
    return fullHash.slice(0, 10);
  }

  public static generateUniqueIdentifier(uniqueIdentifier: string, stringToHash: string = ''): string {
    return `${uniqueIdentifier}${this.generateHash(stringToHash)}`.replace(/[^a-zA-Z0-9]/g, '');
  }
}
