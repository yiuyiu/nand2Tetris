const MAP = {
    LCL: 1,
    ARG: 2,
    TEMP: 5,
    THIS: 3,
    THAT: 4,
    STATIC: 16
}
const MAP_SEGEMENT_TO_REGISTER = {
    argument: 'ARG',
    local: 'LCL',
    this: 'THIS',
    that: 'THAT',
    static: 'STATIC',
    temp: 'TEMP'
}
const PointerMAP = {
    0: 'THIS',
    1: 'THAT'
}
const ARITH_TYPE = {
    SUB: 'sub',
    ADD: 'add',
    OR: 'or',
    AND: 'and',
    EQ: 'eq',
    GT: 'gt',
    LT: 'lt',
    NEG: 'neg',
    NOT: 'not'
}
const ARITH_TYPE_CODE = {
    sub: '-',
    add: '+',
    or: '|',
    and: '&',
    neg: '-',
    not: '!'
}
const compareIndex = {
    eq: 0,
    gt: 0,
    lt: 0
}
const functionIndex = {

}
const COMPARE_CODE = {
    eq: 'JEQ',
    gt: 'JGT',
    lt: 'JLT'
}
module.exports = class CodeWriter {
    writeArithmetic(command) {
        let asm = ''
        switch (command) {
            // 两个数的操作
            case ARITH_TYPE.SUB:
            case ARITH_TYPE.ADD:
            case ARITH_TYPE.OR:
            case ARITH_TYPE.AND:
                asm = `
                    @SP
                    M=M-1
                    A=M
                    D=M
                    A=A-1
                    M=M${ARITH_TYPE_CODE[command]}D`;
                break;
            // 单个数的操作
            case ARITH_TYPE.NOT:
            case ARITH_TYPE.NEG:
                asm = `
                    @SP
                    A=M-1
                    M=${ARITH_TYPE_CODE[command]}M`;
                break;
            case ARITH_TYPE.GT:
            case ARITH_TYPE.LT:
            case ARITH_TYPE.EQ:
                const index = compareIndex[command];
                asm = `
                    @SP
                    M=M-1
                    A=M
                    D=M
                    A=A-1
                    D=M-D    
                    @${command}${index}
                    D;${COMPARE_CODE[command]}
                    @SP
                    A=M-1
                    M=0
                    @${command}end${index}
                    0;JMP
                    (${command}${index})
                    @SP
                    A=M-1                    
                    M=-1
                    (${command}end${index})`;
                compareIndex[command]++;
        }
        return asm;
    }
    writePush({ segement, index, fileName }) {
        let asm = '';
        switch (segement) {
            case 'constant':
                asm = `
                        @${index}
                        D=A
                        @SP
                        A=M
                        M=D
                        @SP
                        M=M+1`;
                break;
            case 'argument':
            case 'this':
            case 'that':
            case 'local':
                asm = `
                        @${MAP[MAP_SEGEMENT_TO_REGISTER[segement]]}
                        D=M
                        @${index}
                        A=A+D
                        D=M
                        @SP
                        A=M
                        M=D
                        @SP
                        M=M+1`;
                break;
            case 'static':
                asm = `
                    @${fileName}Static${index}
                    D=M
                    @SP
                    A=M
                    M=D
                    @SP
                    M=M+1`;
                break;
            case 'temp':
                asm = `
                    @${MAP[MAP_SEGEMENT_TO_REGISTER[segement]] + Number(index)}
                    D=M
                    @SP
                    A=M
                    M=D
                    @SP
                    M=M+1`;
                break;
            case 'pointer':
                asm = `
                        @${MAP[PointerMAP[index]]}
                        D=M
                        @SP
                        A=M
                        M=D
                        @SP
                        M=M+1`;
        }
        return asm
    }
    writePop({ segement, index, fileName }) {
        let asm = '';
        switch (segement) {
            case 'temp':
                asm = `
                @SP
                M=M-1
                A=M
                D=M
                @${MAP[MAP_SEGEMENT_TO_REGISTER[segement]] + Number(index)}
                M=D`;
                break;
            case 'static':
                asm = `
                    @SP
                    M=M-1
                    A=M
                    D=M
                    @${fileName}Static${index}
                    M=D`;
                break;
            case 'this':
            case 'that':
            case 'local':
            case 'argument':
                let loop = '';
                for (let i = 0; i < index; i++) {
                    loop += 'A=A+1\n';
                }
                asm = `
                    @SP
                    M=M-1
                    A=M
                    D=M
                    @${MAP[MAP_SEGEMENT_TO_REGISTER[segement]]}
                    A=M
                    ${loop}M=D`;
                break;
            case 'pointer':
                asm = `
                        @SP
                        M=M-1
                        A=M
                        D=M
                        @${MAP[PointerMAP[index]]}
                        M=D`
        }
        return asm;
    }
    writeLabel(command) {
        const asm = `
        (${command})`;
        return asm;
    }
    writeIfGo(command) {
        const asm = `
        @SP
        M=M-1
        A=M
        D=M
        @${command}
        D;JGT`;
        return asm;
    }
    writeGoto(command) {
        const asm = `
        @${command}
        0;JMP  // go to ${command}`;
        return asm;
    }
    writeReturn() {
        const asm = `// before return
        @LCL
        A=M-1
        A=A-1
        A=A-1
        A=A-1
        A=A-1
        D=M  
        @R13
        M=D  // reserve return address
        @SP
        A=M-1
        D=M  
        @ARG
        A=M
        M=D  // pop to argument
        @ARG
        D=M+1  
        @SP
        M=D  // reset sp to *argument+1
        @LCL
        A=M-1
        D=M
        @THAT
        M=D  // reset that
        @LCL
        A=M-1
        A=A-1
        D=M
        @THIS
        M=D  // reset this
        @LCL
        A=M-1
        A=A-1
        A=A-1
        D=M
        @ARG
        M=D  // reset arg
        @LCL
        A=M-1
        A=A-1
        A=A-1
        A=A-1
        D=M
        @LCL
        M=D  // reset lcl
        @R13
        A=M
        0;JMP  // jump to last function`;
        return asm;
    }
    writeFunction({ functionName, localNum }) {
        var asm = `
        (${functionName})  //  after ${functionName} prologue`;
        for (let i = 0; i < localNum; i++) {
            asm += this.writePush({ segement: 'constant', index: 0 })
            asm += this.writePop({ segement: 'local', index: i })
        }
        var asm2 = `
        @SP`;
        for (let i = 0; i < localNum; i++) {
            asm2 = asm2 + `
            M=M+1`
        }
        asm2 += `  // enter ${functionName}`
        return asm + asm2;
    }
    writeCall({ functionName, argNum }) {
        if (functionIndex[functionName] == undefined) {
            functionIndex[functionName] = 0
        }
        var asm = `
        @${functionName}return${functionIndex[functionName]}
        D=A
        @SP
        A=M
        M=D  
        @SP
        M=M+1  // push ${functionName} return address
        @LCL
        D=M 
        @SP
        A=M
        M=D
        @SP
        M=M+1   // push LCL 
        @ARG
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1  // push ARG
        @THIS
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1  // push THIS
        @THAT
        D=M
        @SP
        A=M
        M=D
        @SP
        M=M+1  // push THAT`;
        var asm2 = `
        @SP
        D=M`;
        for (let i = 0; i < 5 + Number(argNum); i++) {
            asm2 += `
            D=D-1`
        }
        asm2 += `
        @ARG
        M=D   // reset ARG
        @SP
        D=M
        @LCL
        M=D   // reset LCL to *SP
        @${functionName}
        0;JMP // entry to ${functionName}
        (${functionName}return${functionIndex[functionName]})`;
        // increase 
        functionIndex[functionName]++;
        return asm + asm2;
    }
    writeInit() {
        var asm = `
        @256
        D=A
        @SP
        M=D`;
        asm += this.writeCall({ functionName: 'Sys.init', argNum: 0 });
        return asm;
    }
}