import { parentPort } from 'worker_threads';
import { expose } from 'comlink';
import { BarretenbergWasm } from '../index.js';
import { nodeEndpoint } from './node_endpoint.js';
if (!parentPort) {
    throw new Error('No parentPort');
}
expose(new BarretenbergWasm(), nodeEndpoint(parentPort));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2JhcnJldGVuYmVyZ193YXNtL25vZGUvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMvQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFbEQsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7Q0FDbEM7QUFFRCxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDIn0=