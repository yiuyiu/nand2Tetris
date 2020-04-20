const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');
const SYMBOL_TABLE = {
    R0: 0,
    R1: 1,
    R2: 2,
    R3: 3,
    R4: 4,
    R5: 5,
    R6: 6,
    R7: 7,
    R8: 8,
    R9: 9,
    R10: 10,
    R11: 11,
    R12: 12,
    R13: 13,
    R14: 14,
    R15: 15,
    SP: 0,
    LCL: 1,
    ARG: 2,
    THIS: 3,
    THAT: 4,
    SCREEN: 16384,
    KBD: 24576
}
const ALU_TABLE = {
    '0': '0101010',
    '1': '0111111',
    '-1': '0111010',
    'D': '0001100',
    'A': '0110000',
    '!D': '0001101',
    '!A': '0110001',
    '-D': '0001111',
    '-A': '0110011',
    'D+1': '0011111',
    'A+1': '0110111',
    'D-1': '0001110',
    'A-1': '0110010',
    'D+A': '0000010',
    'D-A': '0010011',
    'A-D': '0000111',
    'D&A': '0000000',
    'D|A': '0010101',
    'M': '1110000',
    '!M': '1110001',
    '-M': '1110011',
    'M+1': '1110111',
    'M-1': '1110010',
    'D+M': '1000010',
    'D-M': '1010011',
    'M-D': '1000111',
    'D&M': '1000000',
    'D|M': '1010101'
}
const JUMP_TABLE = {
    JGT: '001',
    JEQ: '010',
    JGE: '011',
    JLT: '100',
    JNE: '101',
    JLE: '110',
    JMP: '111'
}
const sourceName = path.join(__dirname,process.argv.splice(2)[0]);
const sourceStream = fs.createReadStream(sourceName);
const destName = sourceName.replace('.asm', '.hack');
const destStream = fs.createWriteStream(destName);
let lineNumber = 0;
let memory = 15;
const rl = readline.createInterface({
    input: sourceStream,
    crlfDelay: Infinity
})
const lines = [];
async function process1() {
    // first loop
    for await (const line of rl) {
        let a = line;
        if(!a.trim()||(a.startsWith('//'))){
            // ignore
        }else{
            if(a.startsWith('(')){
                const anotherIndex = a.indexOf(')');
                const varName = a.substring(1,anotherIndex);
                SYMBOL_TABLE[varName] = lineNumber;
            }else{
                lineNumber++;
                lines.push(a.trim());
            }
            
        }
        // var b = destStream.write(a+os.EOL);

        // new Promise((resovle,reject)=>{
        //     destStream.write(a+os.EOL,(err)=>{
        //         if(!err) {
        //             resovle();
        //         }
        //     })
        // })
    }
    process2();
}
process1();
// process2();
function process2(){
    for(let line of lines){
        // a instruction
        if(line.startsWith('@')){
            let value = line.slice(1);
            let parsedNum;
            // not symbol
            if(/^\d+/.test(value)){
                parsedNum = transformNumTo15Bin(value);
            }else{
                if(SYMBOL_TABLE.hasOwnProperty(value)){
                    parsedNum = transformNumTo15Bin(SYMBOL_TABLE[value]);
                }else{
                    // variable symbol
                    SYMBOL_TABLE[value] = ++memory;
                    parsedNum = transformNumTo15Bin(memory)
                }
            }
            const instruction = '0' + parsedNum;
            writeInstruction(instruction);
        }else{
            let equalIndex = 0;
            let semiIndex = 0;
            let endIndex = line.length;
            let destPart = '';
            let aluPart = '';
            let jumpPart = '';
            equalIndex = line.indexOf('=');
            semiIndex = line.indexOf(';');
            endIndex = line.indexOf(' ') > -1 ? line.indexOf(' ') : line.length;
            // c instruction
            if(equalIndex > -1){
                destPart = computeDest(line.substring(0,equalIndex));
            }else{
                destPart = '000';
            }
            if(semiIndex > -1){
                parsedAlu = line.substring(0,semiIndex);
            }else{
                parsedAlu = line.substring(equalIndex + 1, endIndex);
            }
            aluPart = ALU_TABLE[parsedAlu];
            if(semiIndex> -1){
                jumpPart = JUMP_TABLE[line.substring(semiIndex+1,endIndex)];
            }else{
                jumpPart = '000';
            }
            const instruction = '111' + aluPart + destPart + jumpPart;
            writeInstruction(instruction);
        }
    }
}
function writeInstruction(instruction){
    destStream.write(instruction + os.EOL);
}
function transformNumTo15Bin(num){
    let n = +num;
    let result = '';
    if(n == 0) result = '0';
    let res = '';  
    while(n != 0) {
        res = n % 2 + res
        n = parseInt(n / 2)
     }  
    result = res;
    while (result.length < 15){
        result = '0' + result;
    }
    return result;
}
function computeDest(str){
    const arr = [0,0,0];
    if(str.indexOf('M') > -1){
        arr[2] = 1;
    }
    if(str.indexOf('D') > -1){
        arr[1] = 1;
    }
    if(str.indexOf('A') > -1){
        arr[0] = 1;
    }
    return arr.join('');
}