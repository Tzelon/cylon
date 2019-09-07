import Pool from 'worker-threads-pool';
import { read_cy_files_sync } from './utils';
let hrstart = process.hrtime();

const pool = new Pool({ max: 10 });
const files = read_cy_files_sync('./experiments/cy-example');

function parse_files(callback) {
    const parsed_files = [];

    files.forEach(({ name, path }) => {
        pool.acquire('./bin/scripts/build/praser-worker.js', { workerData: { name, path } }, (err, worker) => {
            worker.on('message', (data) => {
                parsed_files.push(data.ast);
                if (parsed_files.length === files.length) {
                    callback(parsed_files);
                }
            });
            worker.on('error', (error) => {
                console.error(error);
            });
        });
    });
}

parse_files((programs) => {
    let hrend = process.hrtime(hrstart);
    console.info('[Parse All Files] Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
    resolveModules(programs);
});

function resolveModules(programs) {
    let modules = programs.flatMap((program) => program.zeroth);

    // Make sure all modules have parents.

    return modules;
}
