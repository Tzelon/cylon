import { toMatchFile } from 'jest-file-snapshot';
export {};

declare global {
    namespace jest {
        interface Matchers<R> {
            myMatcher: typeof toMatchFile;
        }
    }
}
