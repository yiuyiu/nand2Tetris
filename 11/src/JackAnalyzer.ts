// import { JackTokenizer } from './JackTokenizer';
import { CompilationEngine } from './CompilationEngine';
import * as fs from 'fs';
import * as path from 'path';
class JackAnalyzer {
    constructor() {
        const arg2 = process.argv[2];
        // const ja = new JackTokenizer(arg2);
        // ja.productXML();
        const isDir = process.argv[2].indexOf('.jack') == -1;
        let files = [];
        if (isDir) {
            files = fs.readdirSync(process.argv[2]).filter(file => {
                return file.indexOf('.jack') > -1
            }).map(item => path.join(process.argv[2], item));

        } else {
            files.push(process.argv[2])
        }
        files.forEach(item => {
            new CompilationEngine(item);
        })
        // const ce = new CompilationEngine(arg2);
        // ce.print();
    }
}
new JackAnalyzer();