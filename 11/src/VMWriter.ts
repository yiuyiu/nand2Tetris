const segmentMap: {
    [key in segment]: string
} = {
    "CONST": 'constant',
    "ARG": 'argument',
    "LOCAL": 'local',
    "STATIC": 'static',
    "THIS": 'this',
    "THAT": 'that',
    "POINTER": 'pointer',
    "TEMP": 'temp'
}
import * as fs from 'fs';
export class VMWriter {
    private stream: fs.WriteStream;
    constructor(filename) {
        this.stream = fs.createWriteStream(filename);
    }
    writePush({ segment, index }: { segment: segment, index: number }) {
        this.stream.write(`push ${segmentMap[segment]} ${index}\n`);
    }
    writePop({ segment, index }: { segment: segment, index: number }) {
        this.stream.write(`pop ${segmentMap[segment]} ${index}\n`)
    }
    writeArithmetic(command: arithmeticCommand) {
        this.stream.write(command.toLowerCase() + '\n')
    }
    writeLabel(label: string) {
        this.stream.write(`label ${label}\n`)
    }
    writeGoto(label) {
        this.stream.write(`goto ${label}\n`)
    }
    writeIf(label) {
        this.stream.write(`if-goto ${label}\n`)
    }
    writeCall(name: string, nArgs: number) {
        this.stream.write(`call ${name} ${nArgs}\n`)
    }

    /**
     * @param  {string} name
     * @param  {number} nArgs local 数量
     */
    writeFunction(name: string, nArgs: number) {
        this.stream.write(`function ${name} ${nArgs}\n`)
    }
    writeReturn() {
        this.stream.write(`return\n`);
    }
    close() {
        this.stream.end();
    }
}