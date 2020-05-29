import * as fs from 'fs';
const keywordTokens = ['class', 'constructor', 'function', 'method', 'field', 'static', 'var', 'int', 'char',
    'boolean', 'void', 'true', 'false', 'null', 'this', 'let', 'do', 'if', 'else', 'while', 'return'];
const symbolTokens = ['{', '}', '[', ']', '(', ')', '.', ',', ';', '+', '-', '*',
    '/', '&', '|', '<', '>', '=', '~'];
type tokenType = 'KEYWORD' | 'SYMBOL' | 'IDENTIFIER' | 'INT-CONST' | 'STRING_CONST';
type identifierKind = 'subroutine' | 'class' | 'field' | 'static' | 'var' | 'arg';
type symbolKind = 'STATIC' | 'VAR' | 'ARG' | 'FIELD'
export class JackTokenizer {
    data: string[];
    index: number;
    token: string;
    filename: string;
    constructor(filename: string) {
        this.filename = filename;
        const source = fs.readFileSync(filename, 'utf-8');
        const result = source.split('\n').reduce((acc, line) => {
            // 行为空的时候line.length 是1 但是打印出来就是""
            const trimLine = line.trim();
            if (trimLine.startsWith('//') || trimLine.startsWith('/**')
                || trimLine.length == 0 || trimLine.startsWith('*')) {
                return acc;
            } else {
                const chars = line.trim().replace(/\/\/.+/, '').split('');
                const tokens = [];
                let currentToken = '';
                let isCurrentString = false;
                for (let i = 0; i < chars.length; i++) {
                    const ele = chars[i];
                    if (ele == '"') {
                        if (currentToken.length == 0) {
                            isCurrentString = true;
                            currentToken += ele;
                            continue;
                        }
                        if (currentToken.length != 0) {
                            tokens.push(currentToken + ele);
                            currentToken = '';
                            isCurrentString = false;
                            continue;
                        }
                    }
                    if (symbolTokens.indexOf(ele) > -1) {
                        if (currentToken.length > 0) {
                            tokens.push(currentToken);
                        }
                        tokens.push(ele);
                        currentToken = '';
                        continue;
                    }
                    if (ele == ' ' && !isCurrentString) {
                        if (currentToken.length > 0) {
                            tokens.push(currentToken);
                        }
                        currentToken = '';
                    } else {
                        currentToken += ele;
                    }

                }
                return [...acc, ...tokens];
            }
        }, []);
        this.data = result;
        this.index = 0;
    }
    productXML(): void {
        let lines = `<tokens>\n`;
        while (this.hasMoreTokens()) {
            this.advance();
            const tokenType = this.tokenType();
            switch (tokenType) {
                case 'KEYWORD':
                    lines += `${this.keyword()}\n`;
                    break;
                case 'IDENTIFIER':
                    lines += `${this.identifier()}\n`;
                    break;
                case 'INT-CONST':
                    lines += `${this.intVal()}\n`;
                    break;
                case 'STRING_CONST':
                    lines += `${this.stringVal()}\n`;
                    break;
                case 'SYMBOL':
                    lines += `${this.symbol()}\n`;
            }
        }
        lines += '</tokens>';
        fs.writeFileSync(this.filename.replace('.jack', 'Token.xml'), lines);
    }
    hasMoreTokens(): boolean {
        return this.index <= this.data.length - 1
    }
    advance(): void {
        if (this.hasMoreTokens()) {
            // const handleToken = this.data[this.index];
            // for (let i = 1; i < handleToken.length; i++) {
            //     if (symbolTokens.indexOf(handleToken[i]) > -1) {
            //         const symbolIndex = symbolTokens.indexOf(handleToken[i]);
            //         this.token = handleToken.substring(0, i);
            //         this.data = [...this.data.slice(0, this.index), this.data[this.index],
            //             , symbolTokens[symbolIndex], ...this.data.slice(this.index + 1)];
            //         break;
            //     }
            // }
            this.token = this.data[this.index];
            this.index++;
        }
    }
    tokenType(): tokenType {
        const token = this.token;
        if (keywordTokens.indexOf(token) > -1) {
            return 'KEYWORD';
        }
        if (symbolTokens.indexOf(token) > -1) {
            return 'SYMBOL';
        }
        if (/\d+/.test(token)) {
            return 'INT-CONST';
        }
        if (/".*"/.test(token)) {
            return 'STRING_CONST';
        }
        return 'IDENTIFIER';
    }
    keyword() {
        if (this.tokenType() == 'KEYWORD') {
            return `<keyword> ${this.token} </keyword>`;
        }
    }
    keywordNoMark() {
        if (this.tokenType() == 'KEYWORD') {
            return this.token;
        }
    }
    symbol() {
        let token = '';
        if (this.tokenType() == 'SYMBOL') {
            switch (this.token) {
                case '>':
                    token = '&gt;';
                    break;
                case '<':
                    token = '&lt;';
                    break;
                case '&':
                    token = '&amp;';
                    break;
                default:
                    token = this.token;
            }
            return `<symbol> ${token} </symbol>`
        }
    }
    symbolNoMark() {
        let token = '';
        if (this.tokenType() == 'SYMBOL') {
            switch (this.token) {
                case '>':
                    token = '&gt;';
                    break;
                case '<':
                    token = '&lt;';
                    break;
                case '&':
                    token = '&amp;';
                    break;
                default:
                    token = this.token;
            }
            return token;
        }
    }
    identifier() {
        if (this.tokenType() == 'IDENTIFIER') {
            return `<identifier> ${this.token} </identifier>`;
        }
    }
    identifierWithType(type: identifierKind, index?: number) {
        if (this.tokenType() == 'IDENTIFIER') {
            return `<iden-${type}-${index}> ${this.token} </iden-${type}-${index}>`;
        }
    }
    identifierNoMark() {
        if (this.tokenType() == 'IDENTIFIER') {
            return this.token;
        }
    }
    intVal() {
        if (this.tokenType() == 'INT-CONST') {
            return `<integerConstant> ${this.token} </integerConstant>`;
        }
    }
    intValNoMark() {
        if (this.tokenType() == 'INT-CONST') {
            return this.token;
        }
    }
    stringVal() {
        if (this.tokenType() == 'STRING_CONST') {
            return `<stringConstant> ${this.token.replace(/"/g, '')} </stringConstant>`;
        }
    }
    stringValNoMark() {
        if (this.tokenType() == 'STRING_CONST') {
            return this.token.replace;
        }
    }
}