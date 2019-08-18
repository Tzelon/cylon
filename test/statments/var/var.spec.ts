import { loadTests } from '../../helpers';

describe('variable declerations', () => {
    loadTests(__dirname).forEach(test => {

        it(`should ${test.filename}`, () => {
            expect(test.compiled.code).toMatchSnapshot();
            expect(test.compiled.parse).toMatchSnapshot();
        })
    });
});
