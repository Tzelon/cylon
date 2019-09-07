let hrstart = process.hrtime();
import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { parse_code } from './utils';

const { path, name } = workerData;

const file_content = fs.readFileSync(path, 'utf-8');
const ast = parse_code(file_content, name);

parentPort.postMessage({ name, path, ast });

let hrend = process.hrtime(hrstart);
console.info('[Praser-Worker] Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
