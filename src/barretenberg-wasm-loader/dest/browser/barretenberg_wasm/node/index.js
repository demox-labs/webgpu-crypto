import { Worker } from 'worker_threads';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import os from 'os';
import { wrap } from 'comlink';
import { nodeEndpoint } from './node_endpoint.js';
import { writeSync } from 'fs';
export async function fetchCode(multithreading) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return await readFile(__dirname + `/../../${multithreading ? 'barretenberg-threads.wasm' : 'barretenberg.wasm'}`);
}
export function createWorker() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return new Worker(__dirname + `/worker.js`);
}
export function getRemoteBarretenbergWasm(worker) {
    return wrap(nodeEndpoint(worker));
}
export function getNumCpu() {
    return os.cpus().length;
}
/**
 * In node, the message passing is different to the browser. When using 'debug' in the browser, we seemingly always
 * get our logs, but in node it looks like it's dependent on the chain of workers from child to main thread be
 * unblocked. If one of our threads aborts, we can't see it as the parent is blocked waiting on threads to join.
 * To work around this in node, threads will by default write directly to stdout.
 */
export function threadLogger() {
    return (msg) => {
        writeSync(1, msg + '\n');
    };
}
export function killSelf() {
    // Extordinarily hard process termination. Due to how parent threads block on child threads etc, even process.exit
    // doesn't seem to be able to abort the process. The following does.
    process.kill(process.pid);
    throw new Error();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYmFycmV0ZW5iZXJnX3dhc20vbm9kZS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMvQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkMsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXBCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDL0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFL0IsTUFBTSxDQUFDLEtBQUssVUFBVSxTQUFTLENBQUMsY0FBdUI7SUFDckQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUQsT0FBTyxNQUFNLFFBQVEsQ0FBQyxTQUFTLEdBQUcsVUFBVSxjQUFjLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7QUFDcEgsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZO0lBQzFCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFELE9BQU8sSUFBSSxNQUFNLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsTUFBYztJQUN0RCxPQUFPLElBQUksQ0FBbUIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUEyQixDQUFDO0FBQ2hGLENBQUM7QUFFRCxNQUFNLFVBQVUsU0FBUztJQUN2QixPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7QUFDMUIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLFlBQVk7SUFDMUIsT0FBTyxDQUFDLEdBQVcsRUFBRSxFQUFFO1FBQ3JCLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUTtJQUN0QixrSEFBa0g7SUFDbEgsb0VBQW9FO0lBQ3BFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztBQUNwQixDQUFDIn0=