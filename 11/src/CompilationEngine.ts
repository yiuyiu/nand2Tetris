import * as fs from 'fs';
import { JackTokenizer } from './JackTokenizer';
import { SymbolTable } from './SymbolTable';
const op = ['+', '-', '*', '/', '|', '&amp;', '&lt;', '&gt;', '='];
export class CompilationEngine {
    tokenIns: JackTokenizer;
    output: string;
    indent: number;
    filename: string;
    symbolTable: SymbolTable
    constructor(filename: string) {
        this.filename = filename;
        this.tokenIns = new JackTokenizer(filename);
        this.output = ``;
        this.indent = 1;
        this.symbolTable = new SymbolTable();
        this.compileClass();
    }
    print() {
        fs.writeFileSync(this.filename.replace('.jack', 'Tree.xml'), this.output);
    }
    compileClass() {
        const tokenIns = this.tokenIns;
        this.output += '<class>';
        tokenIns.advance();
        this.output += `${this.space()}${tokenIns.keyword()}`;
        tokenIns.advance();
        this.output += `${this.space()}${tokenIns.identifierWithType('class')}`;
        tokenIns.advance();
        this.output += `${this.space()}${tokenIns.symbol()}`;
        tokenIns.advance();
        while (['static', 'field'].indexOf(tokenIns.keywordNoMark()) > -1) {
            this.compileClassVarDec();
        }
        while (['constructor', 'function', 'method'].indexOf(tokenIns.keywordNoMark()) > -1) {
            this.compileSubroutine();
        }
        this.output += `${this.space()}${tokenIns.symbol()}`;
        this.output += '\n</class>';
    }
    // 静态生命或字段声明
    compileClassVarDec() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<classVarDec>`;
        this.indent++;
        // static field
        this.output += `${this.space()}${ins.keyword()}`;
        let kind = ins.keywordNoMark() as 'static' | 'field';
        // type
        ins.advance();
        let type;
        if (ins.keyword()) {
            this.output += `${this.space()}${ins.keyword()}`;
            type = ins.keywordNoMark();
        }
        if (ins.identifier()) {
            this.output += `${this.space()}${ins.identifierWithType('class')}`;
            type = ins.identifierNoMark();
        }
        // varName
        ins.advance();
        // :TODO
        const kindUpper = kind.toUpperCase() as 'STATIC' | 'FIELD';
        this.symbolTable.Define(ins.identifierNoMark(), type, kindUpper);
        this.output += `${this.space()}${ins.identifierWithType(kind, this.symbolTable.IndexOf(ins.identifierNoMark()))}`;
        ins.advance();
        while (ins.symbolNoMark() != ';') {
            // ,
            this.output += `${this.space()}${ins.symbol()}`;
            // varName
            ins.advance();
            // this.output += `${this.space()}${ins.identifier()}`;
            this.symbolTable.Define(ins.identifierNoMark(), type, kindUpper);
            this.output += `${this.space()}${ins.identifierWithType(kind, this.symbolTable.IndexOf(ins.identifierNoMark()))}`;
            ins.advance();
        }
        this.output += `${this.space()}${ins.symbol()}`;
        this.indent--;
        this.output += `${this.space()}</classVarDec>`;
        ins.advance();
    }
    compileType() {
        const tokenIns = this.tokenIns;
        if (tokenIns.keyword()) {
            this.output += `${this.space()}${tokenIns.keyword()}`;
            return tokenIns.keywordNoMark();
        } else {
            this.output += `${this.space()}${tokenIns.identifierWithType('class')}`;
            return tokenIns.identifierNoMark();
            // this.output += `${this.space()}${tokenIns.identifier()}`;
        }
    }
    // 整个方法、函数或者构造函数
    compileSubroutine() {
        this.symbolTable.startSubroutine();
        this.output += `${this.space()}<subroutineDec>`;
        const tokenIns = this.tokenIns;
        this.indent++;
        this.output += `${this.space()}${tokenIns.keyword()}`;
        tokenIns.advance();
        this.compileType();
        // functionName
        tokenIns.advance();
        // this.output += `${this.space()}${tokenIns.identifier()}`;
        this.output += `${this.space()}${tokenIns.identifierWithType('subroutine')}`;
        // (
        tokenIns.advance();
        this.output += `${this.space()}${tokenIns.symbol()}`;
        // parameter or )
        tokenIns.advance();
        if (tokenIns.symbolNoMark() != ')') {
            this.compileParameterList();
        } else {
            this.output += `${this.space()}<parameterList>`;
            this.output += `${this.space()}</parameterList>`;
            this.output += `${this.space()}${tokenIns.symbol()}`;
            tokenIns.advance();
        }
        // body
        this.output += `${this.space()}<subroutineBody>`;
        this.indent += 2;
        this.output += `${this.space()}${tokenIns.symbol()}`;
        tokenIns.advance();
        while (tokenIns.keywordNoMark() == 'var') {
            this.compileVarDec();
        }
        // statments
        this.compileStatements();
        this.indent -= 2;
        this.output += `${this.space()}</subroutineBody>`;


        this.indent--;
        this.output += `${this.space()}</subroutineDec>`;
        // tokenIns.advance();
        this.symbolTable.print();
    }
    // 编译参数列表（可能为空），不包括括号“（）”
    compileParameterList() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<parameterList>`;
        this.indent++;
        // this.output += `${this.space()}${ins.keyword()}`;
        // ins.advance();
        let isCurrentType = true;
        let type = '';
        while (ins.symbolNoMark() != ')') {
            if (isCurrentType) {
                type = this.compileType();
                isCurrentType = false;
            } else {
                if (ins.symbol()) {
                    this.output += `${this.space()}${ins.symbol()}`;
                    isCurrentType = true;
                }
                if (ins.identifier()) {
                    this.symbolTable.Define(ins.identifierNoMark(), type, 'ARG')
                    this.output += `${this.space()}${ins.identifierWithType('arg', this.symbolTable.IndexOf(ins.identifierNoMark()))}`;
                }
            }
            // if (ins.keyword()) {
            //     this.output += `${this.space()}${ins.keyword()}`;
            // }
            // if (ins.symbol()) {
            //     this.output += `${this.space()}${ins.symbol()}`;
            // }
            // if (ins.identifier()) {
            //     this.output += `${this.space()}${ins.identifier()}`;
            // }
            ins.advance();
        }
        this.indent--;
        this.output += `${this.space()}</parameterList>`;
        // )
        this.output += `${this.space()}${ins.symbol()}`;
        ins.advance();
    }
    // var声明
    compileVarDec() {
        this.output += `${this.space()}<varDec>`;
        this.indent++;
        this.output += `${this.space()}${this.tokenIns.keyword()}`
        this.tokenIns.advance();
        const type = this.compileType();
        this.tokenIns.advance();
        this.symbolTable.Define(this.tokenIns.identifierNoMark(), type, 'VAR');
        this.output += `${this.space()}${this.tokenIns.identifierWithType('var', this.symbolTable.IndexOf(this.tokenIns.identifierNoMark()))}`;
        this.tokenIns.advance();
        while (this.tokenIns.symbolNoMark() != ';') {
            this.output += `${this.space()}${this.tokenIns.symbol()}`;
            this.tokenIns.advance();
            this.symbolTable.Define(this.tokenIns.identifierNoMark(), type, 'VAR');
            this.output += `${this.space()}${this.tokenIns.identifierWithType('var', this.symbolTable.IndexOf(this.tokenIns.identifierNoMark()))}`;
            this.tokenIns.advance();
        }
        this.output += `${this.space()}${this.tokenIns.symbol()}`;
        this.indent--;
        this.output += `${this.space()}</varDec>`;
        this.tokenIns.advance();
    }
    // 一系列语句，不包含大括号“（）”
    compileStatements() {
        this.output += `${this.space()}<statements>`;
        this.indent += 2;
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
        this.indent -= 2;
        this.output += `${this.space()}</statements>`;
        // }
        this.output += `${this.space()}${this.tokenIns.symbol()}`;
        this.tokenIns.advance();
    }
    // do语句
    compileDo() {
        this.output += `${this.space()}<doStatement>`;
        this.indent += 2;
        const ins = this.tokenIns;
        this.output += `${this.space()}${ins.keyword()}`;
        ins.advance();
        let identifierName = ins.identifierNoMark();
        // this.output += `${this.space()}${ins.identifier()}`;
        ins.advance();
        if (ins.symbolNoMark() == '.') {
            if (this.symbolTable.KindOf(identifierName) == 'NONE') {
                this.output += `${this.space()}<iden-class> ${identifierName} </iden-class>`
            } else {
                this.compileVarName(identifierName);
                // this.output += `${this.space()}<iden-var-${this.symbolTable.IndexOf(identifierName)}> ${identifierName} </iden-var-${this.symbolTable.IndexOf(identifierName)}>`
            }
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
            this.output += `${this.space()}${ins.identifierWithType('subroutine')}`;
            ins.advance();
        } else {
            this.output += `${this.space()}<iden-subroutine> ${identifierName} </iden-subroutine>`
        }
        // (
        this.output += `${this.space()}${ins.symbol()}`;
        ins.advance();
        this.compileExpressionList();
        // ;
        this.writeSymbol();
        ins.advance();
        this.indent -= 2;
        this.output += `${this.space()}</doStatement>`;
    }
    compileVarName(identifierName) {
        const kind = this.symbolTable.KindOf(identifierName);
        const lowerCaseKind = kind.toLowerCase();
        this.output += `${this.space()}<iden-${lowerCaseKind}-${this.symbolTable.IndexOf(identifierName)}> ${identifierName} </iden-${lowerCaseKind}-${this.symbolTable.IndexOf(identifierName)}>`
    }
    // let语句
    compileLet() {
        this.output += `${this.space()}<letStatement>`;
        this.indent += 2;
        const ins = this.tokenIns;
        // let
        this.output += `${this.space()}${ins.keyword()}`;
        // varName
        ins.advance();

        this.compileVarName(ins.identifierNoMark());

        ins.advance();
        if (ins.symbolNoMark() == '[') {
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
            this.compileExpression();
            // ]
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
        }
        // = 
        this.output += `${this.space()}${ins.symbol()}`;
        // expression
        ins.advance();
        this.compileExpression();
        // ;
        this.output += `${this.space()}${ins.symbol()}`;
        this.indent -= 2;
        this.output += `${this.space()}</letStatement>`;
        ins.advance();
    }
    // while语句
    compileWhile() {
        this.output += `${this.space()}<whileStatement>`;
        this.indent += 2;
        const ins = this.tokenIns;
        // while
        this.output += `${this.space()}${ins.keyword()}`;
        //  (
        ins.advance();
        this.output += `${this.space()}${ins.symbol()}`;
        // expression
        ins.advance();
        this.compileExpression();
        // )
        this.output += `${this.space()}${ins.symbol()}`;

        // {
        ins.advance();
        this.output += `${this.space()}${ins.symbol()}`;
        this.compileStatements();
        // // }
        // this.output += `${this.space()}${ins.symbol()}`;
        // ins.advance();
        this.indent -= 2;
        this.output += `${this.space()}</whileStatement>`;
    }
    // return语句
    compileReturn() {
        this.output += `${this.space()}<returnStatement>`;
        this.indent += 2;
        // return 
        this.output += `${this.space()}${this.tokenIns.keyword()}`;
        this.tokenIns.advance();
        if (this.tokenIns.symbolNoMark() != ';') {
            this.compileExpression();
        }
        // ;
        this.output += `${this.space()}${this.tokenIns.symbol()}`;
        this.tokenIns.advance();
        this.indent -= 2;
        this.output += `${this.space()}</returnStatement>`;
    }
    // if语句，包含可选的else从句
    compileIf() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<ifStatement>`;
        this.indent += 2;
        // if
        this.output += `${this.space()}${ins.keyword()}`;
        // (
        ins.advance();
        this.output += `${this.space()}${ins.symbol()}`;
        // expression
        ins.advance();
        this.compileExpression();
        // )
        this.output += `${this.space()}${ins.symbol()}`;
        // {
        ins.advance();
        this.output += `${this.space()}${ins.symbol()}`;
        // statements
        ins.advance();
        this.compileStatements();
        // (
        if (ins.keywordNoMark() == 'else') {
            this.output += `${this.space()}${ins.keyword()}`;
            // {
            ins.advance();
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
            this.compileStatements();

        }
        this.indent -= 2;
        this.output += `${this.space()}</ifStatement>`;
    }
    // 表达式
    compileExpression() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<expression>`;
        this.indent += 2;
        this.compileTerm();
        if (op.indexOf(ins.symbolNoMark()) > -1) {
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
            this.compileTerm();
        }
        this.indent -= 2;
        this.output += `${this.space()}</expression>`;
    }
    // term
    compileTerm() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<term>`;
        this.indent += 2;
        let identifierName = ''
        // first 
        // keywordConstant this
        if (ins.keyword()) {
            this.output += `${this.space()}${this.tokenIns.keyword()}`;
        }
        // varName
        if (ins.identifier()) {
            identifierName = this.tokenIns.identifierNoMark();
            // 此时无法判断当前的identifier是哪种
            // this.output += `${this.space()}${this.tokenIns.identifier()}`;
        }
        // stringConstant
        if (ins.stringVal()) {
            this.output += `${this.space()}${this.tokenIns.stringVal()}`;
        }
        // intConstant
        if (ins.intVal()) {
            this.output += `${this.space()}${this.tokenIns.intVal()}`;
        }
        // (expression)
        if (ins.symbolNoMark() == '(') {
            this.writeSymbol();
            ins.advance();
            this.compileExpression();
            this.writeSymbol();
        }
        // unaryOp
        if (['-', '~'].indexOf(ins.symbolNoMark()) > -1) {
            this.writeSymbol();
            ins.advance();
            this.compileTerm();
        } else {
            ins.advance();
        }
        // 通过判断下一个的字符，来判断之前的标识符是哪种类型的
        switch (ins.symbolNoMark()) {
            case '[':
                // varName[expression]
                this.output += `${this.space()}<iden-var-${this.symbolTable.IndexOf(identifierName)}> ${identifierName} </iden-var-${this.symbolTable.IndexOf(identifierName)}>`
                this.output += `${this.space()}${this.tokenIns.symbol()}`;
                ins.advance();
                this.compileExpression();
                // ]
                this.output += `${this.space()}${this.tokenIns.symbol()}`;
                ins.advance();
                break;
            case '(':
                // subRouteCall
                this.output += `${this.space()}<iden-subroutine> ${identifierName} </iden-subroutine>`
                this.output += `${this.space()}${this.tokenIns.symbol()}`;
                ins.advance();
                this.compileExpressionList();
                break;
            case '.':
                // className|varName.subroutineName(expressionList)
                if (this.symbolTable.KindOf(identifierName) == 'NONE') {
                    this.output += `${this.space()}<iden-class> ${identifierName} </iden-class>`
                } else {
                    this.output += `${this.space()}<iden-var-${this.symbolTable.IndexOf(identifierName)}> ${identifierName} </iden-var-${this.symbolTable.IndexOf(identifierName)}>`
                }
                this.writeSymbol();
                ins.advance();
                // this.writeIdentifier();
                this.output += `${this.space()}${ins.identifierWithType('subroutine')}`
                ins.advance();
                this.writeSymbol();
                ins.advance();
                this.compileExpressionList();
                break;
            default:
                if (identifierName) {
                    this.compileVarName(identifierName);
                }

        }

        this.indent -= 2;
        this.output += `${this.space()}</term>`;
    }
    // 由逗号分隔的表达式列表
    compileExpressionList() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<expressionList>`;
        this.indent += 2;
        while (!(ins.symbolNoMark() == ')')) {
            // this.compileExpression();
            if (ins.symbolNoMark() == ',') {
                this.output += `${this.space()}${this.tokenIns.symbol()}`;
                ins.advance();
                // this.compileExpression();
            }
            this.compileExpression();

        }

        this.indent -= 2;
        this.output += `${this.space()}</expressionList>`;
        this.output += `${this.space()}${ins.symbol()}`;
        ins.advance();
        // this.output += `${this.space()}${ins.symbol()}`;
        // ins.advance();
    }
    space() {
        return '\n' + Array(this.indent).fill(' ').join('');
    }
    writeIdentifier() {
        this.output += `${this.space()}${this.tokenIns.identifier()}`;
    }
    writeSymbol() {
        this.output += `${this.space()}${this.tokenIns.symbol()}`;
    }
    writeKeyword() {
        this.output += `${this.space()}${this.tokenIns.keyword()}`;
    }
    writeInt() {
        this.output += `${this.space()}${this.tokenIns.intVal()}`;
    }
    writeString() {
        this.output += `${this.space()}${this.tokenIns.stringVal()}`;
    }
}