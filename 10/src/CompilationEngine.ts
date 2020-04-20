import * as fs from 'fs';
import { JackTokenizer } from './JackTokenizer';
const op = ['+', '-', '*', '/', '|', '&amp;', '&lt;', '&gt;', '='];
export class CompilationEngine {
    tokenIns: JackTokenizer;
    output: string;
    indent: number;
    filename: string;
    constructor(filename: string) {
        this.filename = filename;
        this.tokenIns = new JackTokenizer(filename);
        this.output = ``;
        this.indent = 1;
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
        this.output += `${this.space()}${tokenIns.identifier()}`;
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
        // type
        ins.advance();
        if (ins.keyword()) {
            this.output += `${this.space()}${ins.keyword()}`;
        }
        if (ins.identifier()) {
            this.output += `${this.space()}${ins.identifier()}`;
        }
        // varName
        ins.advance();
        this.output += `${this.space()}${ins.identifier()}`;
        ins.advance();
        while (ins.symbolNoMark() != ';') {
            // ,
            this.output += `${this.space()}${ins.symbol()}`;
            // varName
            ins.advance();
            this.output += `${this.space()}${ins.identifier()}`;
            ins.advance();
        }
        this.output += `${this.space()}${ins.symbol()}`;
        this.indent--;
        this.output += `${this.space()}</classVarDec>`;
        ins.advance();
    }
    // 整个方法、函数或者构造函数
    compileSubroutine() {
        this.output += `${this.space()}<subroutineDec>`;
        const tokenIns = this.tokenIns;
        this.indent++;
        this.output += `${this.space()}${tokenIns.keyword()}`;
        tokenIns.advance();
        if (tokenIns.keyword()) {
            this.output += `${this.space()}${tokenIns.keyword()}`;
        } else {
            this.output += `${this.space()}${tokenIns.identifier()}`;
        }
        // functionName
        tokenIns.advance();
        this.output += `${this.space()}${tokenIns.identifier()}`;
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
    }
    // 编译参数列表（可能为空），不包括括号“（）”
    compileParameterList() {
        const ins = this.tokenIns;
        this.output += `${this.space()}<parameterList>`;
        this.indent++;
        this.output += `${this.space()}${ins.keyword()}`;
        ins.advance();
        while (ins.symbolNoMark() != ')') {
            if (ins.keyword()) {
                this.output += `${this.space()}${ins.keyword()}`;
            }
            if (ins.symbol()) {
                this.output += `${this.space()}${ins.symbol()}`;
            }
            if (ins.identifier()) {
                this.output += `${this.space()}${ins.identifier()}`;
            }
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
        if (this.tokenIns.keyword()) {
            this.output += `${this.space()}${this.tokenIns.keyword()}`;
        }
        if (this.tokenIns.identifier()) {
            this.output += `${this.space()}${this.tokenIns.identifier()}`;
        }
        this.tokenIns.advance();
        this.output += `${this.space()}${this.tokenIns.identifier()}`;
        this.tokenIns.advance();
        while (this.tokenIns.symbolNoMark() != ';') {
            this.output += `${this.space()}${this.tokenIns.symbol()}`;
            this.tokenIns.advance();
            this.output += `${this.space()}${this.tokenIns.identifier()}`;
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
        this.output += `${this.space()}${ins.identifier()}`;
        ins.advance();
        if (ins.symbolNoMark() == '.') {
            this.output += `${this.space()}${ins.symbol()}`;
            ins.advance();
            this.output += `${this.space()}${ins.identifier()}`;
            ins.advance();
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
    // let语句
    compileLet() {
        this.output += `${this.space()}<letStatement>`;
        this.indent += 2;
        const ins = this.tokenIns;
        // let
        this.output += `${this.space()}${ins.keyword()}`;
        // varName
        ins.advance();
        this.output += `${this.space()}${ins.identifier()}`;

        // TODO: expression
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
        // first 
        // keywordConstant this
        if (ins.keyword()) {
            this.output += `${this.space()}${this.tokenIns.keyword()}`;
        }
        // varName
        if (ins.identifier()) {
            this.output += `${this.space()}${this.tokenIns.identifier()}`;
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

        // varName[expression]
        if (ins.symbolNoMark() == '[') {
            this.output += `${this.space()}${this.tokenIns.symbol()}`;
            ins.advance();
            this.compileExpression();
            // ]
            this.output += `${this.space()}${this.tokenIns.symbol()}`;
            ins.advance();
        }
        // subRouteCall
        if (ins.symbolNoMark() == '(') {
            this.output += `${this.space()}${this.tokenIns.symbol()}`;
            ins.advance();
            this.compileExpressionList();
        }
        if (ins.symbolNoMark() == '.') {
            // className|varName.subroutineName(expressionList)
            this.writeSymbol();
            ins.advance();
            this.writeIdentifier();
            ins.advance();
            this.writeSymbol();
            ins.advance();
            this.compileExpressionList();
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