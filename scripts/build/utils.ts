import parse from '../../src/compiler/neo.parse';
import tokenize from '../../src/compiler/neo.tokenize';
import util from 'util';
import fg from 'fast-glob';

export function read_cy_files_sync(base_directory: string) {
    return fg.sync([`${base_directory}/**/*.cy`], { stats: true });
}

export function parse_code(content, filename) {
    const tokenized = tokenize(content);
    const parsed = parse(tokenized, filename);

    if (parsed.id === '(error)') {
        console.error(util.inspect(parsed, true, 10000));
    }
    return parsed;
}
