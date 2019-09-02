import { loadTests } from '../../helpers';
import path from 'path';
import util from 'util';

describe('variable declerations', () => {
    loadTests(__dirname).forEach(test => {

        it(`should ${test.filename}`, () => {
            expect(test.compiled.code).toMatchFile(path.join(__dirname, '__fixtures__', `${test.filename}.code.output.js`));
            expect(util.inspect(test.compiled.parse)).toMatchFile(path.join(__dirname, '__fixtures__', `${test.filename}.parse.output.js`));
        })
    });
});
