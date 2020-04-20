const COMMAND_TYPE = require('./VMConstant').COMMAND_TYPE;

module.exports = class Parser {
    commandType(command) {
        if (!command) {
            return;
        }
        if (command.startsWith('pop')) {
            return COMMAND_TYPE.C_POP;
        }
        if (command.startsWith('push')) {
            return COMMAND_TYPE.C_PUSH;
        }
        if (['add', 'sub', 'and', 'or', 'not', 'neg', 'eq', 'gt', 'lt'].indexOf(command) > -1) {
            return COMMAND_TYPE.C_ARITHMETIC;
        }
        if (command.startsWith('label')) {
            return COMMAND_TYPE.C_LABEL
        }
        if (command.startsWith('if-goto')) {
            return COMMAND_TYPE.C_IF_GO
        }
        if (command.startsWith('goto')) {
            return COMMAND_TYPE.C_GOTO
        }
        if (command.startsWith('function')) {
            return COMMAND_TYPE.C_FUN
        }
        if(command.startsWith('return')){
            return COMMAND_TYPE.C_RETURN
        }
        if(command.startsWith('call')){
            return COMMAND_TYPE.C_CALL
        }
        console.error('not find type', command);
    }
    args(command) {
        const type = this.commandType(command);
        switch (type) {
            case COMMAND_TYPE.C_ARITHMETIC:
            case COMMAND_TYPE.C_RETURN:
                return command;
            case COMMAND_TYPE.C_POP:
            case COMMAND_TYPE.C_PUSH:
                var splited = command.split(' ');
                return {
                    segement: splited[1],
                    index: splited[2]
                }
            case COMMAND_TYPE.C_LABEL:
            case COMMAND_TYPE.C_IF_GO:
            case COMMAND_TYPE.C_GOTO:
                return command.split(' ')[1];
            case COMMAND_TYPE.C_FUN:
                var splited = command.split(' ');
                return {
                    functionName: splited[1],
                    localNum: splited[2]
                }
            case COMMAND_TYPE.C_CALL:
                var splited = command.split(' ');
                return {
                    functionName: splited[1],
                    argNum: splited[2]
                }
        }
        console.error('args error');
    }
}