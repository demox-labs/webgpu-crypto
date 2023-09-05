import { generateRustCode } from './rust.js';
import { generateTypeScriptCode } from './typescript.js';
const [, , exports = '../exports.json', lang = 'ts'] = process.argv;
function generateCode(exports, lang) {
    switch (lang) {
        case 'ts':
            return generateTypeScriptCode(exports);
        case 'rust':
            return generateRustCode(exports);
        default:
            throw new Error(`Unknown lang: ${lang}`);
    }
}
console.log(generateCode(exports, lang));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYmluZGdlbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFekQsTUFBTSxDQUFDLEVBQUUsQUFBRCxFQUFHLE9BQU8sR0FBRyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUVwRSxTQUFTLFlBQVksQ0FBQyxPQUFlLEVBQUUsSUFBWTtJQUNqRCxRQUFRLElBQUksRUFBRTtRQUNaLEtBQUssSUFBSTtZQUNQLE9BQU8sc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekMsS0FBSyxNQUFNO1lBQ1QsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQztZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7S0FDNUM7QUFDSCxDQUFDO0FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMifQ==