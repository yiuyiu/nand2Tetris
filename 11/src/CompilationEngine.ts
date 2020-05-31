import * as path from 'path';
import { JackTokenizer } from './JackTokenizer';
import { SymbolTable } from './SymbolTable';
import { VMWriter } from './VMWriter';
const op = ['+', '-', '*', '/', '|', '&amp;', '&lt;', '&gt;', '='];
const mapVarNameKindToCommand = {
    'STATIC': 'STATIC',
    'VAR': 'LOCAL',
    'FIELD': 'THIS',
    'ARG': 'ARG'
}
const mapOp2ArithmeticCommand: {
    [key in opCommand]?: arithmeticCommand | 'NONE'
} = {
    "+": 'ADD',
    '-': 'SUB',
    '|': 'OR',
    '&amp;': 'AND',
    '&lt;': 'LT',
    '&gt;': 'GT',
    '=': 'EQ',
    "*": 'NONE',
    '/': 'NONE'
}
export class CompilationEngine {
    tokenIns: JackTokenizer;
    indent: number;
    filename: string;
    className: string;
    symbolTable: SymbolTable
    vmWriter: VMWriter
    labelIndex: number
    subroutineObj: {
        [name: string]: {
            isVoid: boolean,
            isMethod: boolean,
            argNum: number
        }
    }
    constructor(filename: string) {
        this.filename = filename;
        this.className = path.basename(filename).replace('.jack', '');
        this.tokenIns = new JackTokenizer(filename);
        this.subroutineObj = {};
        this.symbolTable = new SymbolTable();
        this.vmWriter = new VMWriter(filename.replace('.jack', '.vm'));
        this.labelIndex = 0
        this.compileClass();
    }
    compileClass() {
        const tokenIns = this.tokenIns;
        tokenIns.advance(); // class
        tokenIns.advance(); // className
        tokenIns.advance(); // {
        tokenIns.advance(); // static field constructor function method
        while (['static', 'field'].indexOf(tokenIns.keywordNoMark()) > -1) {
            this.compileClassVarDec();
        }
        while (['constructor', 'function', 'method'].indexOf(tokenIns.keywordNoMark()) > -1) {
            this.compileSubroutine();
        }
        // }
        this.vmWriter.close()
    }
    // 静态生命或字段声明
    compileClassVarDec() {
        const ins = this.tokenIns;
        // static field
        let kind = ins.keywordNoMark() as 'static' | 'field';
        // type
        ins.advance();
        const type = this.compileType()
        // varName
        ins.advance();
        // :TODO
        const kindUpper = kind.toUpperCase() as 'STATIC' | 'FIELD';
        this.symbolTable.Define(ins.identifierNoMark(), type, kindUpper);
        ins.advance();
        while (ins.symbolNoMark() != ';') {
            // ,
            ins.advance() // varName;
            this.symbolTable.Define(ins.identifierNoMark(), type, kindUpper);
            ins.advance();
        }
        ins.advance();
    }
    compileType() {
        const tokenIns = this.tokenIns;
        if (tokenIns.keyword()) {
            return tokenIns.keywordNoMark();
        } else {
            return tokenIns.identifierNoMark();
        }
    }
    // 整个方法、函数或者构造函数
    compileSubroutine() {
        this.symbolTable.startSubroutine();
        const tokenIns = this.tokenIns;
        const functionKind = tokenIns.keywordNoMark() as functionKind;

        tokenIns.advance(); // function type

        tokenIns.advance(); // functionName
        const functionName = tokenIns.identifierNoMark();
        tokenIns.advance();// (
        tokenIns.advance();// parameter or )
        if (tokenIns.symbolNoMark() != ')') {
            this.compileParameterList();
        } else {
            tokenIns.advance();
        }
        // {
        tokenIns.advance();
        while (tokenIns.keywordNoMark() == 'var') {
            this.compileVarDec();
        }
        // 几个local变量
        const localNum = this.symbolTable.VarCount('VAR');
        this.vmWriter.writeFunction(this.getFunctionFullName(functionName), localNum);
        if (functionKind == 'constructor') {
            // 分配空间
            const fieldNum = this.symbolTable.VarCount('FIELD');
            this.vmWriter.writePush({ segment: 'CONST', index: fieldNum })
            this.vmWriter.writeCall('Memory.alloc', 1);
            this.vmWriter.writePop({ segment: 'POINTER', index: 0 })
        }
        if (functionKind == 'method') {
            // push argument 0
            // pop pointer 0
            this.vmWriter.writePush({ segment: 'ARG', index: 0 })
            this.vmWriter.writePop({ segment: 'POINTER', index: 0 })
        }
        // statements
        this.compileStatements();
    }
    getFunctionFullName(subroutineName: string): string {
        return this.className + '.' + subroutineName;
    }
    // 编译参数列表（可能为空），不包括括号“（）”
    compileParameterList() {
        const ins = this.tokenIns;
        let isCurrentType = true;
        let type = '';
        while (ins.symbolNoMark() != ')') {
            if (isCurrentType) {
                isCurrentType = false;
            } else {
                if (ins.symbol()) {
                    isCurrentType = true;
                }
                if (ins.identifier()) {
                    this.symbolTable.Define(ins.identifierNoMark(), type, 'ARG')
                }
            }
            ins.advance();
        }
        // )
        ins.advance();
    }
    // var声明
    compileVarDec() {
        // var 
        this.tokenIns.advance(); // type
        const type = this.compileType();
        this.tokenIns.advance(); // varName
        this.symbolTable.Define(this.tokenIns.identifierNoMark(), type, 'VAR');
        this.tokenIns.advance();
        while (this.tokenIns.symbolNoMark() != ';') {
            // ,
            this.tokenIns.advance(); // varName
            this.symbolTable.Define(this.tokenIns.identifierNoMark(), type, 'VAR');
            this.tokenIns.advance();
        }
        this.tokenIns.advance();
    }
    // 一系列语句，不包含大括号“（）”
    compileStatements() {
        while (!(this.tokenIns.symbolNoMark() == '}')) {
            const nextKeyword = this.tokenIns.keywordNoMark();
            switch (nextKeyword) {
                case 'let':
                    this.compileLet();
                    break;
                case 'if':
                    this.compileIf();
                    break;
                case 'while':
                    this.compileWhile();
                    break;
                case 'do':
                    this.compileDo();
                    break;
                case 'return':
                    this.compileReturn();
                    break;
                default:
                    // 空的情况
                    this.tokenIns.advance();
            }
        }
        // }
        this.tokenIns.advance();
    }
    // do语句
    compileDo() {
        const ins = this.tokenIns;
        ins.advance();
        let identifierName = ins.identifierNoMark();
        let subroutineName = identifierName;
        ins.advance();
        let caller = '';
        let isMethod = true
        if (ins.symbolNoMark() == '.') {
            if (this.symbolTable.KindOf(identifierName) == 'NONE') {
                caller = identifierName
                isMethod = false
            } else {
                caller = this.symbolTable.TypeOf(identifierName);
                const segment = mapVarNameKindToCommand[this.symbolTable.KindOf(identifierName)];
                this.vmWriter.writePush({ segment, index: this.symbolTable.IndexOf(identifierName) })
            }
            ins.advance(); // subroutineName
            subroutineName = ins.identifierNoMark();
            ins.advance();
        } else {
            caller = this.className;
            this.vmWriter.writePush({ segment: 'POINTER', index: 0 })
        }
        // (
        ins.advance();
        const paraNum = this.compileExpressionList();
        this.vmWriter.writeCall(`${caller}.${subroutineName}`, isMethod ? paraNum + 1 : paraNum)
        // void方法清除无用
        this.vmWriter.writePop({ segment: 'TEMP', index: 0 })
        // ;
        ins.advance();
    }
    // let语句
    compileLet() {
        const ins = this.tokenIns;
        // let
        ins.advance(); // varName
        let isArray = false;
        const varName = ins.identifierNoMark();
        const varNameKind = this.symbolTable.KindOf(varName)
        const index = this.symbolTable.IndexOf(varName)
        ins.advance();
        if (ins.symbolNoMark() == '[') {
            // 数组
            ins.advance();
            isArray = true;
            this.vmWriter.writePush({ segment: mapVarNameKindToCommand[this.symbolTable.KindOf(varName)], index })
            this.compileExpression();
            this.vmWriter.writeArithmetic('ADD');
            // ]
            ins.advance();
        }
        // = 
        // expression
        ins.advance();
        this.compileExpression();
        if (isArray) {
            // pop temp 0     
            // pop pointer 1    
            // push temp 0 	   
            // pop that 0 
            this.vmWriter.writePop({ segment: 'TEMP', index: 0 })
            this.vmWriter.writePop({ segment: 'POINTER', index: 1 })
            this.vmWriter.writePush({ segment: 'TEMP', index: 0 })
            this.vmWriter.writePop({ segment: 'THAT', index: 0 })
        } else {
            this.vmWriter.writePop({ segment: mapVarNameKindToCommand[this.symbolTable.KindOf(varName)], index })
        }
        // ;
        ins.advance();
    }
    // while语句
    compileWhile() {
        const label1 = `${this.className}${this.labelIndex++}`
        const label2 = `${this.className}${this.labelIndex++}`
        const ins = this.tokenIns;
        // while
        ins.advance(); //  (
        // expression
        ins.advance();
        this.vmWriter.writeLabel(label1)
        this.compileExpression();
        this.vmWriter.writeArithmetic('NOT')
        this.vmWriter.writeIf(label2)
        // )
        // {
        ins.advance();
        this.compileStatements();
        this.vmWriter.writeGoto(label1)
        this.vmWriter.writeLabel(label2)
    }
    // return语句
    compileReturn() {
        // return 
        this.tokenIns.advance();
        if (this.tokenIns.symbolNoMark() != ';') {
            this.compileExpression();
        } else {
            // void
            this.vmWriter.writePush({ segment: 'CONST', index: 0 })
        }
        this.vmWriter.writeReturn();
        // ;
        this.tokenIns.advance();
    }
    // if语句，包含可选的else从句
    compileIf() {
        const label1 = `${this.className}${this.labelIndex++}`
        const label2 = `${this.className}${this.labelIndex++}`
        const ins = this.tokenIns;
        // if
        ins.advance();  // (
        // expression
        ins.advance();
        this.compileExpression();
        this.vmWriter.writeArithmetic('NOT')
        this.vmWriter.writeIf(label1)
        // )
        ins.advance(); // {
        ins.advance();// statements
        this.compileStatements();
        this.vmWriter.writeGoto(label2)
        // (
        this.vmWriter.writeLabel(label1)
        if (ins.keywordNoMark() == 'else') {
            ins.advance(); // {
            ins.advance();
            this.compileStatements();
        }
        this.vmWriter.writeLabel(label2)
    }
    // 表达式
    compileExpression() {
        const ins = this.tokenIns;
        this.compileTerm();
        const ops = Object.keys(mapOp2ArithmeticCommand)
        if (ops.indexOf(ins.symbolNoMark()) > -1) {
            // op
            const currentOp = ins.symbolNoMark();
            ins.advance();
            this.compileTerm();
            switch (currentOp) {
                case '*':
                    this.vmWriter.writeCall('Math.multiply', 2)
                    break;
                case '/':
                    this.vmWriter.writeCall('Math.divide', 2)
                    break;
                default:
                    this.vmWriter.writeArithmetic(mapOp2ArithmeticCommand[currentOp])
            }
        }
    }
    // term
    compileTerm() {
        const ins = this.tokenIns;
        let identifierName = ''
        // first 
        // keywordConstant this true false null 
        if (ins.keyword()) {
            switch (ins.keywordNoMark()) {
                case 'this':
                    this.vmWriter.writePush({ segment: 'POINTER', index: 0 })
                    break;
                case 'false':
                case 'null':
                    this.vmWriter.writePush({ segment: 'CONST', index: 0 })
                    break;
                case 'true':
                    this.vmWriter.writePush({ segment: 'CONST', index: 1 })
                    this.vmWriter.writeArithmetic('NEG');
                    break;
            }
        }
        // varName
        if (ins.identifier()) {
            identifierName = this.tokenIns.identifierNoMark();
            // 此时无法判断当前的identifier是哪种
        }
        // stringConstant
        if (ins.stringVal()) {
            // 去掉双引号，原先是""Score: 0"" 这种形式
            const str: string = ins.stringValNoMark().replace(/"/g, '');
            this.vmWriter.writePush({ segment: 'CONST', index: str.length })
            this.vmWriter.writeCall('String.new', 1)
            for (let i of str) {
                this.vmWriter.writePush({ segment: 'CONST', index: i.charCodeAt(0) })
                this.vmWriter.writeCall('String.appendChar', 2)
            }
        }
        // intConstant
        if (ins.intVal()) {
            this.vmWriter.writePush({ segment: 'CONST', index: Number(ins.intValNoMark()) })
        }
        // (expression)
        if (ins.symbolNoMark() == '(') {
            ins.advance();
            this.compileExpression();
        }
        // unaryOp
        if (['-', '~'].indexOf(ins.symbolNoMark()) > -1) {
            const unaryOp = ins.symbolNoMark();
            ins.advance();
            this.compileTerm();
            const map = {
                '-': 'NEG',
                '~': 'NOT'
            }
            this.vmWriter.writeArithmetic(map[unaryOp])
        } else {
            ins.advance();
        }
        // 通过判断下一个的字符，来判断之前的标识符是哪种类型的
        switch (ins.symbolNoMark()) {
            case '[':
                // varName[expression] 数组
                ins.advance();
                // push arr base addr
                this.vmWriter.writePush({
                    segment: mapVarNameKindToCommand[this.symbolTable.KindOf(identifierName)],
                    index: this.symbolTable.IndexOf(identifierName)
                })
                this.compileExpression();
                // ]
                this.vmWriter.writeArithmetic('ADD');
                this.vmWriter.writePop({ segment: 'POINTER', index: 1 })
                // push arr value
                this.vmWriter.writePush({ segment: 'THAT', index: 0 })
                ins.advance();
                break;
            case '(':
                // subRouteCall   subroutineName() is method subroutine
                ins.advance();
                this.vmWriter.writePush({ segment: 'POINTER', index: 0 })
                const paraNum = this.compileExpressionList();
                this.vmWriter.writeCall(this.getFunctionFullName(identifierName), paraNum + 1)
                break;
            case '.':
                // className|varName.subroutineName(expressionList)
                let caller = ''
                let isClassCaller = false;
                if (this.symbolTable.KindOf(identifierName) == 'NONE') {
                    caller = identifierName
                    isClassCaller = true;
                } else {
                    // varName
                    caller = this.symbolTable.TypeOf(identifierName);
                    // 将this作为第一个参数 因为是method
                    const segment = mapVarNameKindToCommand[this.symbolTable.KindOf(identifierName)];
                    this.vmWriter.writePush({ segment, index: this.symbolTable.IndexOf(identifierName) })
                }
                ins.advance(); // subroutineName
                const subroutineName = ins.identifierNoMark();
                ins.advance(); // (
                ins.advance();
                const paraNum2 = this.compileExpressionList();
                if (isClassCaller) {
                    this.vmWriter.writeCall(`${caller}.${subroutineName}`, paraNum2)
                } else {
                    this.vmWriter.writeCall(`${caller}.${subroutineName}`, paraNum2 + 1)
                }
                break;
            default:
                if (identifierName) {
                    const segment = mapVarNameKindToCommand[this.symbolTable.KindOf(identifierName)];
                    this.vmWriter.writePush({ segment, index: this.symbolTable.IndexOf(identifierName) })
                }

        }
    }
    /**
     * 由逗号分隔的表达式，返回表达式的数量
     */
    compileExpressionList(): number {
        const ins = this.tokenIns;
        let expressionNum = 0;
        while (!(ins.symbolNoMark() == ')')) {
            if (ins.symbolNoMark() == ',') {
                ins.advance();
            }
            this.compileExpression();
            expressionNum++
        }
        ins.advance();
        return expressionNum;
    }
}