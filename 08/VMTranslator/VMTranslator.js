const Parser = require('./Parser');
const CodeWriter = require('./CodeWriter');
const fs = require('fs');
const COMMAND_TYPE = require('./VMConstant').COMMAND_TYPE;
const isDir = process.argv[2].indexOf('.vm') == -1;
const parser = new Parser();
const path = require('path');
let writeContent = '';
const codeWriter = new CodeWriter();
const functMap = {
    [COMMAND_TYPE.C_ARITHMETIC]: codeWriter.writeArithmetic.bind(codeWriter),
    [COMMAND_TYPE.C_POP]: codeWriter.writePop.bind(codeWriter),
    [COMMAND_TYPE.C_PUSH]: codeWriter.writePush.bind(codeWriter),
    [COMMAND_TYPE.C_LABEL]: codeWriter.writeLabel.bind(codeWriter),
    [COMMAND_TYPE.C_IF_GO]: codeWriter.writeIfGo.bind(codeWriter),
    [COMMAND_TYPE.C_GOTO]: codeWriter.writeGoto.bind(codeWriter),
    [COMMAND_TYPE.C_RETURN]: codeWriter.writeReturn.bind(codeWriter),
    [COMMAND_TYPE.C_FUN]: codeWriter.writeFunction.bind(codeWriter),
    [COMMAND_TYPE.C_CALL]: codeWriter.writeCall.bind(codeWriter)
}
function writeOneFile(fileName) {
    const data = fs.readFileSync(fileName, "utf-8");
    const lines = data.split("\r\n");
    var content = '';
    for (let line of lines) {
        const parsedLine = line.replace(/\/\/[\s\S]*/, '').trim();
        const type = parser.commandType(parsedLine);
        const func = functMap[type];
        if (func) {
            let args = parser.args(parsedLine);
            if (type == COMMAND_TYPE.C_POP || type == COMMAND_TYPE.C_PUSH) {
                const splitted = fileName.split(path.sep);
                args = { ...args, fileName: splitted[splitted.length - 1] }
            }
            const result = func(args);
            content += result.replace(/^\ +/gm, "");
        }
    }
    return content;
}
function main() {
    let writeFileName = '';
    if (isDir) {
        const fileNames = fs.readdirSync(process.argv[2]);
        writeContent += codeWriter.writeInit().replace(/^\ +/gm, "");
        try {
            writeContent += writeOneFile(path.join(process.argv[2], 'Sys.vm'));
            for (let fileName of fileNames) {
                if (fileName.indexOf('.vm') > -1 && !fileName.startsWith('Sys')) {
                    writeContent += writeOneFile(path.join(process.argv[2], fileName))
                }
            }
            const splited = process.argv[2].split(path.sep);
            writeFileName = path.join(process.argv[2], splited[splited.length - 1]) + '.asm';
        } catch (error) {
            console.log(error);
        }
    } else {
        writeContent = writeOneFile(process.argv[2]);
        writeFileName = process.argv[2].replace('.vm', '.asm');
    }
    fs.writeFileSync(writeFileName, writeContent.replace(/\s/, ""));
    fs.writeFileSync(writeFileName.replace('.asm', '.list'), writeContent.replace(/\s/, "").replace(/\(.*\n/g, ""));
}
main();