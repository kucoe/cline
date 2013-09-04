/**
 * Cline
 *
 * Copyright 2013, Wolfgang Bas
 * Released under the MIT License
 */
var EventEmitter = require('events').EventEmitter;


var Commands = function () {
    this.map = function (fn) {
        var res = [];
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                if (prop === '*' || prop == 'map') {
                    continue;
                }
                var r = fn(prop, this[prop]);
                res.push(r);
                if (r === false) {
                    break;
                }
            }
        }
        return res;
    };
};

var commands = new Commands();

var command = function (cmd, desc, args, fn) {
    this.cmd = cmd;
    if (typeof desc == 'function') {
        fn = desc;
        desc = '';
        args = {};
    }
    this.desc = desc;
    this.args = args;
    this.listener = fn;
};

var defaultFn = function (val, fn) {
    if ('\\q' === val || 'exit' === val) {
        delete this._nextTick;
        this.stream.close();
    } else if ('\\?' === val || 'help' === val) {
        this.usage();
    } else if ('\\c' === val || 'clear' === val) {
        this.stream.write(null, {ctrl: true, name: 'l'});
    }
    fn ? fn(val) : this.parse(val);
};

var nextTick = function (cli, str, mask, fn) {
    var next = cli._nextTick;
    var cb = function () {
        cli.ask(str, mask, function (line) {
            fn(line);
            if (next) {
                cli._nextTick = next;
                next();
            }
        });
    };
    next ? cli._nextTick = cb : cb();
};

var completer = function (line) {
    var completions = commands.map(function (prop, val) {
        return val.cmd;
    });
    completions.unshift('help', '\\?', 'clear', '\\c', 'exit', '\\q');
    var hits = completions.filter(function (c) {
        return c.indexOf(line) == 0
    });
    return [hits.length ? hits : completions, line]
};

var convert = function (string, context) {
    var res = string;
    var reviver = function (k, v) {
        if (typeof v == 'string' && v[0] == '#') {
            return context[v.substring(1)];
        }
        return v;
    };
    if ('true' === string) {
        res = true
    } else if ('false' === string) {
        res = false
    } else if (/^\d*$/.test(string)) {
        if (string.indexOf('.') != -1) {
            res = parseFloat(string);
        } else {
            res = parseInt(string, 10);
        }
    } else if (string[0] == '[' && string[string.length - 1] == "]") {
        string = string.replace(/'/g, '"');
        res = JSON.parse(string, reviver);
    } else if (string[0] == '{' && string[string.length - 1] == "}") {
        string = string.replace(/'/g, '"');
        res = JSON.parse(string, reviver);
    } else if (string[0] == '"' || string[0] == "'") {
        res = string.substring(1, string.length - 1);
    }
    return res;
};

var defaultStream = function () {
    var stream = require('readline').createInterface(process.stdin, process.stdout, completer, true);
    stream.print = function (msg) {
        console.log(msg);
    };
    var self = this;
    var oldInsertString = stream._insertString;
    stream._insertString = function (c) {
        if (self.mask != undefined) {
            self._buf += c;
            oldInsertString.call(stream, self.mask);
        } else {
            oldInsertString.call(stream, c);
        }
    };
    return stream;
};

var Cli = function (stream) {
    this.init(stream);
    EventEmitter.call(this);
};

require('util').inherits(Cli, EventEmitter);

Cli.prototype.init = function (stream) {
    if (this.stream) {
        this.stream.removeAllListeners('close');
        this.stream.removeAllListeners('line');
    }
    if (!stream) {
        stream = defaultStream.call(this);
    }
    this.stream = stream;
    var self = this;
    stream.once('close', function () {
        self.emit('close');
    });
    stream.on('line', function (line) {
        self.emit('history', line);
        if (self.fn) {
            self.fn(line);
        }
    });
};

Cli.prototype.usage = function () {
    var res = 'usage:';
    commands.map(function (prop, val) {
        res += '\n';
        res += val.cmd;
        res += val.desc ? ' - ' + val.desc : ' ';
    });
    res += '\nexit, \\q - close shell and exit';
    res += '\nhelp, \\? - print this usage';
    res += '\nclear, \\c - clear the terminal screen';
    this.stream.print(res);
    this.emit('usage');
    return res;
};

Cli.prototype.interact = function (promptStr) {
    var self = this;
    self._prompt = promptStr;
    if (self._nextTick) {
        return;
    }
    self._nextTick = function () {
        self.ask(self._prompt, function (val) {
            self.parse(val);
            if (typeof self._nextTick == 'function') {
                self._nextTick();
            }
        });
    };
    self._nextTick();
};

Cli.prototype.ask = function (str, mask, fn) {
    var stream = this.stream;
    var self = this;
    // default mask
    if (typeof mask == 'function') {
        fn = mask;
        mask = null;
    }
    stream.setPrompt(str);
    self.mask = mask;
    if (self.mask != undefined) {
        self._buf = '';
    }
    this.fn = function (line) {
        if (self._buf) {
            line = self._buf;
            self._buf = '';
        }
        var val = line.trim();
        if (!val.length) {
            self.ask(str, mask, fn);
        } else {
            defaultFn.call(self, val, fn);
        }
    };
    stream.prompt();
};

Cli.prototype.prompt = function (str, fn) {
    var self = this;
    nextTick(this, str, null, function (line) {
        fn ? fn(line) : self.parse(line);
    });
};

Cli.prototype.password = function (str, mask, fn) {
    if (typeof mask == 'function') {
        fn = mask;
        mask = '';
    }
    var self = this;
    nextTick(this, str, mask, function (line) {
        fn ? fn(line) : self.parse(line);
    });
};

Cli.prototype.confirm = function (str, fn) {
    var self = this;
    nextTick(this, str, null, function (line) {
        fn ? fn(/^y|yes|ok|true$/i.test(line)) : self.parse(line);
    });
};

Cli.prototype.command = function (cmd, desc, args, fn) {
    if (typeof args == 'function') {
        fn = args;
        args = {};
    }
    var p = cmd;
    for (var prop in args) {
        if (args.hasOwnProperty(prop)) {
            var regex = new RegExp('{' + prop + '}', 'g');
            if (regex.test(p)) {
                p = p.replace(regex, '(' + args[prop] + ')');
            }
        }
    }
    commands[p] = new command(cmd, desc, args, fn);
};

Cli.prototype.parse = function (str) {
    var resp = null;
    var self = this;
    commands.map(function (prop, val) {
        var regex = new RegExp('^' + prop + '$');
        if (str.match(regex)) {
            var matches = regex.exec(str);
            var main = matches.shift();
            var args = {};
            for (var p in val.args) {
                if (val.args.hasOwnProperty(p)) {
                    var s = matches.shift();
                    s = convert(s);
                    args[p] = s;
                }
            }
            var fn = val.listener;
            resp = (fn ? fn(main, args) : true) || true;
            self.emit('command', main, val.cmd);
            return false;
        }
        return true;
    });
    if (!resp && commands['*']) {
        resp = commands['*'].listener(str);
    }
    return resp;
};

Cli.prototype.history = function (items) {
    if (items != undefined) {
        this.stream.history = items.reverse();
        this.stream.historyIndex = -1;

    }
    return this.stream.history;
};

module.exports = function (stream, tests) {
    var cli = new Cli(stream);
    if (tests) {
        cli.commands = commands;
        cli.clean = function () {
            commands = new Commands();
        };
    }
    return cli;
};



