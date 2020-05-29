type kind = 'STATIC' | 'FIELD' | 'ARG' | 'VAR';
type typename = 'int' | 'char' | 'boolean' | string;
type obj = {
    [name: string]: {
        type: string,
        kind: kind,
        index: number
    }
}
export class SymbolTable {
    private classObj: obj; // 类
    private subObj: obj; // 子程序
    constructor() {
        this.classObj = {};
        this.subObj = {};
    }
    startSubroutine() {
        this.subObj = {};
    }
    Define(name: string, type: typename, kind: kind): void {
        if (kind == 'FIELD' || kind == 'STATIC') {
            this.classObj[name] = {
                type,
                kind,
                index: this.VarCount(kind)
            }
        } else {
            this.subObj[name] = {
                type,
                kind,
                index: this.VarCount(kind)
            }
        }
    }
    VarCount(kind: kind): number {
        let obj;
        if (kind == 'FIELD' || kind == 'STATIC') {
            obj = this.classObj
        } else {
            obj = this.subObj
        }
        // Object.values(obj).reduce((acc,value)=>{
        //     if(value.kind==kind){
        //         return ++acc;
        //     }else{
        //         return acc;
        //     }
        // },0)
        let number = 0;
        for (let key in obj) {
            if (obj[key].kind == kind) {
                number++;
            }
        }
        return number;
    }
    KindOf(name: string): kind | 'NONE' {
        let kind = '';
        if (this.classObj[name] != undefined) {
            return this.classObj[name].kind
        }
        if (this.subObj[name] != undefined) {
            return this.subObj[name].kind
        }
        return 'NONE'
    }
    TypeOf(name: string): string {
        if (this.classObj[name] != undefined) {
            return this.classObj[name].type;
        }
        if (this.subObj[name] != undefined) {
            return this.subObj[name].type
        }
    }
    IndexOf(name: string): number {
        if (this.classObj[name] != undefined) {
            return this.classObj[name].index;
        }
        if (this.subObj[name] != undefined) {
            return this.subObj[name].index
        }
    }
    print() {
        console.log('-----symboltable start---');
        console.log(this.classObj);
        console.log(this.subObj);
        console.log('-----symboltable end---')
    }
}